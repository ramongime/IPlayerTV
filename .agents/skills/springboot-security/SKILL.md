---
name: springboot-security
description: Boas práticas de Spring Security para authn/authz, validação, CSRF, segredos, headers, rate limiting e segurança de dependências em serviços Java Spring Boot.
metadata:
  origin: ECC
---

# Revisão de Segurança do Spring Boot

Use ao adicionar autenticação (auth), tratar inputs, criar endpoints, ou lidar com segredos.

## Quando Ativar

- Adicionando autenticação (JWT, OAuth2, baseada em sessão)
- Implementando autorização (@PreAuthorize, acesso baseado em regras)
- Validando entrada de usuários (Bean Validation, validadores personalizados)
- Configurando CORS, CSRF, ou cabeçalhos de segurança
- Gerenciando segredos (Vault, variáveis de ambiente)
- Adicionando rate limiting ou proteção contra força bruta
- Verificando dependências em busca de CVEs

## Autenticação

- Prefira JWTs stateless ou tokens opacos (opaque tokens) com lista de revogação
- Use cookies `httpOnly`, `Secure`, `SameSite=Strict` para sessões
- Valide tokens com `OncePerRequestFilter` ou servidor de recursos (resource server)

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
  private final JwtService jwtService;

  public JwtAuthFilter(JwtService jwtService) {
    this.jwtService = jwtService;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (header != null && header.startsWith("Bearer ")) {
      String token = header.substring(7);
      Authentication auth = jwtService.authenticate(token);
      SecurityContextHolder.getContext().setAuthentication(auth);
    }
    chain.doFilter(request, response);
  }
}
```

## Autorização

- Habilite a segurança de método: `@EnableMethodSecurity`
- Use `@PreAuthorize("hasRole('ADMIN')")` ou `@PreAuthorize("@authz.canEdit(#id)")`
- Negue por padrão (Deny by default); exponha apenas os escopos requeridos

```java
@RestController
@RequestMapping("/api/admin")
public class AdminController {

  @PreAuthorize("hasRole('ADMIN')")
  @GetMapping("/users")
  public List<UserDto> listUsers() {
    return userService.findAll();
  }

  @PreAuthorize("@authz.isOwner(#id, authentication)")
  @DeleteMapping("/users/{id}")
  public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
    userService.delete(id);
    return ResponseEntity.noContent().build();
  }
}
```

## Validação de Entradas

- Use Bean Validation com `@Valid` nos controllers
- Aplique restrições (constraints) nos DTOs: `@NotBlank`, `@Email`, `@Size`, validadores personalizados
- Limpe (sanitize) qualquer HTML com uma whitelist antes de renderizar

```java
// RUIM: Sem validação
@PostMapping("/users")
public User createUser(@RequestBody UserDto dto) {
  return userService.create(dto);
}

// BOM: DTO Validado
public record CreateUserDto(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email String email,
    @NotNull @Min(0) @Max(150) Integer age
) {}

@PostMapping("/users")
public ResponseEntity<UserDto> createUser(@Valid @RequestBody CreateUserDto dto) {
  return ResponseEntity.status(HttpStatus.CREATED)
      .body(userService.create(dto));
}
```

## Prevenção contra Injeção de SQL (SQL Injection)

- Use os repositories Spring Data ou queries parametrizadas
- Para queries nativas, use amarrações (bindings) de `:param`; nunca concatene strings

```java
// RUIM: Concatenação de String em query nativa
@Query(value = "SELECT * FROM users WHERE name = '" + name + "'", nativeQuery = true)

// BOM: Query nativa parametrizada
@Query(value = "SELECT * FROM users WHERE name = :name", nativeQuery = true)
List<User> findByName(@Param("name") String name);

// BOM: Query derivada do Spring Data (parametrizada automaticamente)
List<User> findByEmailAndActiveTrue(String email);
```

## Codificação de Senha (Password Encoding)

- Sempre faça o hash das senhas com BCrypt ou Argon2 — nunca armazene em texto claro (plaintext)
- Use o bean `PasswordEncoder`, sem hash manual

```java
@Bean
public PasswordEncoder passwordEncoder() {
  return new BCryptPasswordEncoder(12); // cost factor 12
}

// No service
public User register(CreateUserDto dto) {
  String hashedPassword = passwordEncoder.encode(dto.password());
  return userRepository.save(new User(dto.email(), hashedPassword));
}
```

## Proteção CSRF

- Para aplicativos de sessão em navegadores, mantenha CSRF ativado; inclua o token nos forms/headers
- Para APIs puras com tokens Bearer, desabilite o CSRF e conte com autenticação stateless

```java
http
  .csrf(csrf -> csrf.disable())
  .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
```

## Gerenciamento de Segredos

- Nenhum segredo no código-fonte; carregue do env ou vault
- Mantenha `application.yml` livre de credenciais; use placeholders
- Rotacione tokens e credenciais de banco de dados regularmente

```yaml
# RUIM: Hardcoded no application.yml
spring:
  datasource:
    password: mySecretPassword123

# BOM: Placeholder para variável de ambiente
spring:
  datasource:
    password: ${DB_PASSWORD}

# BOM: Integração com Spring Cloud Vault
spring:
  cloud:
    vault:
      uri: https://vault.example.com
      token: ${VAULT_TOKEN}
```

## Cabeçalhos de Segurança (Security Headers)

```java
http
  .headers(headers -> headers
    .contentSecurityPolicy(csp -> csp
      .policyDirectives("default-src 'self'"))
    .frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin)
    .xssProtection(Customizer.withDefaults())
    .referrerPolicy(rp -> rp.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)));
```

## Configuração de CORS

- Configure CORS no nível de filtro de segurança (security filter), não por controller
- Restrinja as origens (origins) permitidas — nunca use `*` em produção

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
  CorsConfiguration config = new CorsConfiguration();
  config.setAllowedOrigins(List.of("https://app.example.com"));
  config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
  config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
  config.setAllowCredentials(true);
  config.setMaxAge(3600L);

  UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
  source.registerCorsConfiguration("/api/**", config);
  return source;
}

// No SecurityFilterChain:
http.cors(cors -> cors.configurationSource(corsConfigurationSource()));
```

## Limitação de Taxa (Rate Limiting)

- Aplique Bucket4j ou limites a nível de gateway nos endpoints custosos
- Registre (log) e crie alertas para picos (bursts); retorne 429 com dicas de tentativa (retry hints)

```java
// Usando Bucket4j para rate limiting por endpoint
@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  private Bucket createBucket() {
    return Bucket.builder()
        .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1))))
        .build();
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    String clientIp = request.getRemoteAddr();
    Bucket bucket = buckets.computeIfAbsent(clientIp, k -> createBucket());

    if (bucket.tryConsume(1)) {
      chain.doFilter(request, response);
    } else {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
      response.getWriter().write("{\"error\": \"Limite de requisições excedido\"}");
    }
  }
}
```

## Segurança de Dependências

- Rode o OWASP Dependency Check / Snyk no CI
- Mantenha Spring Boot e Spring Security em versões suportadas
- Faça as compilações (builds) falharem caso haja CVEs conhecidos

## Logging e PII (Informação Pessoalmente Identificável)

- Nunca registre em logs senhas, segredos, tokens ou dados completos de cartão de crédito (PAN data)
- Edite os campos confidenciais (redact); use log estruturado em JSON

## Uploads de Arquivo

- Valide o tamanho, o tipo de conteúdo (content type) e a extensão
- Armazene fora do diretório raiz da web; faça escaneamento de vírus caso requerido

## Checklist Antes de Lançamentos

- [ ] Autenticações (tokens) validadas e expiradas corretamente
- [ ] Bloqueios (guards) de autorização em todo path sensível
- [ ] Todas as entradas de dados (inputs) validadas e higienizadas
- [ ] Nenhuma query SQL com strings concatenadas
- [ ] Postura CSRF correta dependendo do tipo da aplicação
- [ ] Segredos externos (no ambiente); nenhum comitado (committed)
- [ ] Cabeçalhos de segurança configurados
- [ ] Rate limiting em APIs
- [ ] Dependências verificadas em busca de falhas e atualizadas
- [ ] Logs livres de dados sensíveis

**Lembre-se**: Negue por padrão (deny by default), valide os dados de entrada, princípio do menor privilégio e segurança por configuração (secure-by-configuration) em primeiro lugar.
