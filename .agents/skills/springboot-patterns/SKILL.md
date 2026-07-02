---
name: springboot-patterns
description: Padrões de arquitetura Spring Boot, design de API REST, serviços em camadas, acesso a dados, cache, processamento assíncrono e logging. Use para trabalho de backend Java Spring Boot.
metadata:
  origin: ECC
---

# Padrões de Desenvolvimento Spring Boot

Arquitetura Spring Boot e padrões de API para serviços escaláveis de nível de produção.

## Quando Ativar

- Construindo APIs REST com Spring MVC ou WebFlux
- Estruturando camadas de controller → service → repository
- Configurando Spring Data JPA, cache ou processamento assíncrono
- Adicionando validação, tratamento de exceções ou paginação
- Configurando perfis para ambientes de dev/staging/produção
- Implementando padrões orientados a eventos com Spring Events ou Kafka

## Estrutura da API REST

```java
@RestController
@RequestMapping("/api/markets")
@Validated
class MarketController {
  private final MarketService marketService;

  MarketController(MarketService marketService) {
    this.marketService = marketService;
  }

  @GetMapping
  ResponseEntity<Page<MarketResponse>> list(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    Page<Market> markets = marketService.list(PageRequest.of(page, size));
    return ResponseEntity.ok(markets.map(MarketResponse::from));
  }

  @PostMapping
  ResponseEntity<MarketResponse> create(@Valid @RequestBody CreateMarketRequest request) {
    Market market = marketService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(MarketResponse.from(market));
  }
}
```

## Padrão Repository (Spring Data JPA)

```java
public interface MarketRepository extends JpaRepository<MarketEntity, Long> {
  @Query("select m from MarketEntity m where m.status = :status order by m.volume desc")
  List<MarketEntity> findActive(@Param("status") MarketStatus status, Pageable pageable);
}
```

## Camada de Serviço com Transações

```java
@Service
public class MarketService {
  private final MarketRepository repo;

  public MarketService(MarketRepository repo) {
    this.repo = repo;
  }

  @Transactional
  public Market create(CreateMarketRequest request) {
    MarketEntity entity = MarketEntity.from(request);
    MarketEntity saved = repo.save(entity);
    return Market.from(saved);
  }
}
```

## DTOs e Validação

```java
public record CreateMarketRequest(
    @NotBlank @Size(max = 200) String name,
    @NotBlank @Size(max = 2000) String description,
    @NotNull @FutureOrPresent Instant endDate,
    @NotEmpty List<@NotBlank String> categories) {}

public record MarketResponse(Long id, String name, MarketStatus status) {
  static MarketResponse from(Market market) {
    return new MarketResponse(market.id(), market.name(), market.status());
  }
}
```

## Tratamento de Exceções

```java
@ControllerAdvice
class GlobalExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
    String message = ex.getBindingResult().getFieldErrors().stream()
        .map(e -> e.getField() + ": " + e.getDefaultMessage())
        .collect(Collectors.joining(", "));
    return ResponseEntity.badRequest().body(ApiError.validation(message));
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ApiError> handleAccessDenied() {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiError.of("Forbidden"));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> handleGeneric(Exception ex) {
    // Registre (log) erros inesperados com stack traces
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiError.of("Erro interno do servidor"));
  }
}
```

## Cache

Requer `@EnableCaching` em uma classe de configuração.

```java
@Service
public class MarketCacheService {
  private final MarketRepository repo;

  public MarketCacheService(MarketRepository repo) {
    this.repo = repo;
  }

  @Cacheable(value = "market", key = "#id")
  public Market getById(Long id) {
    return repo.findById(id)
        .map(Market::from)
        .orElseThrow(() -> new EntityNotFoundException("Mercado não encontrado"));
  }

  @CacheEvict(value = "market", key = "#id")
  public void evict(Long id) {}
}
```

## Processamento Assíncrono

Requer `@EnableAsync` em uma classe de configuração.

```java
@Service
public class NotificationService {
  @Async
  public CompletableFuture<Void> sendAsync(Notification notification) {
    // enviar email/SMS
    return CompletableFuture.completedFuture(null);
  }
}
```

## Logging (SLF4J)

```java
@Service
public class ReportService {
  private static final Logger log = LoggerFactory.getLogger(ReportService.class);

  public Report generate(Long marketId) {
    log.info("generate_report marketId={}", marketId);
    try {
      // lógica
    } catch (Exception ex) {
      log.error("generate_report_failed marketId={}", marketId, ex);
      throw ex;
    }
    return new Report();
  }
}
```

## Middleware / Filtros

```java
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {
  private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    long start = System.currentTimeMillis();
    try {
      filterChain.doFilter(request, response);
    } finally {
      long duration = System.currentTimeMillis() - start;
      log.info("req method={} uri={} status={} durationMs={}",
          request.getMethod(), request.getRequestURI(), response.getStatus(), duration);
    }
  }
}
```

## Paginação e Ordenação

```java
PageRequest page = PageRequest.of(pageNumber, pageSize, Sort.by("createdAt").descending());
Page<Market> results = marketService.list(page);
```

## Chamadas Externas Resilientes a Erros

```java
public <T> T withRetry(Supplier<T> supplier, int maxRetries) {
  int attempts = 0;
  while (true) {
    try {
      return supplier.get();
    } catch (Exception ex) {
      attempts++;
      if (attempts >= maxRetries) {
        throw ex;
      }
      try {
        Thread.sleep((long) Math.pow(2, attempts) * 100L);
      } catch (InterruptedException ie) {
        Thread.currentThread().interrupt();
        throw ex;
      }
    }
  }
}
```

## Limite de Taxa / Rate Limiting (Filtro + Bucket4j)

**Nota de Segurança**: O cabeçalho `X-Forwarded-For` não é confiável por padrão porque os clientes podem forjá-lo (spoof).
Só use forwarded headers quando:
1. Seu app estiver atrás de um proxy reverso confiável (nginx, AWS ALB, etc.)
2. Você registrou `ForwardedHeaderFilter` como um bean
3. Você configurou `server.forward-headers-strategy=NATIVE` ou `FRAMEWORK` nas propriedades da aplicação
4. Seu proxy está configurado para sobrescrever (não anexar a) o cabeçalho `X-Forwarded-For`

Quando o `ForwardedHeaderFilter` é configurado corretamente, `request.getRemoteAddr()` retornará automaticamente o IP de cliente correto dos forwarded headers. Sem essa configuração, use `request.getRemoteAddr()` diretamente — ele retorna o IP da conexão imediata, que é o único valor confiável.

```java
@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  /*
   * SEGURANÇA: Este filtro usa request.getRemoteAddr() para identificar clientes para rate limiting.
   *
   * Se sua aplicação estiver atrás de um proxy reverso (nginx, AWS ALB, etc.), você DEVE configurar
   * o Spring para lidar com forwarded headers adequadamente para a detecção exata do IP do cliente:
   *
   * 1. Defina server.forward-headers-strategy=NATIVE (para plataformas em nuvem) ou FRAMEWORK em
   *    application.properties/yaml
   * 2. Se usar a estratégia FRAMEWORK, registre ForwardedHeaderFilter:
   *
   *    @Bean
   *    ForwardedHeaderFilter forwardedHeaderFilter() {
   *        return new ForwardedHeaderFilter();
   *    }
   *
   * 3. Garanta que seu proxy sobrescreva (não anexe) o cabeçalho X-Forwarded-For para evitar spoofing
   * 4. Configure server.tomcat.remoteip.trusted-proxies ou equivalente para seu container
   *
   * Sem essa configuração, request.getRemoteAddr() retorna o IP do proxy, não o IP do cliente.
   * NÃO leia X-Forwarded-For diretamente — é facilmente falsificável sem o tratamento por proxy confiável.
   */
  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    // Use getRemoteAddr() que retorna o IP do cliente correto quando o ForwardedHeaderFilter
    // estiver configurado, ou o IP de conexão direta caso contrário. Nunca confie em cabeçalhos
    // X-Forwarded-For diretamente sem a configuração apropriada do proxy.
    String clientIp = request.getRemoteAddr();

    Bucket bucket = buckets.computeIfAbsent(clientIp,
        k -> Bucket.builder()
            .addLimit(Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1))))
            .build());

    if (bucket.tryConsume(1)) {
      filterChain.doFilter(request, response);
    } else {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
    }
  }
}
```

## Jobs em Segundo Plano

Use o `@Scheduled` do Spring ou integre com filas (ex: Kafka, SQS, RabbitMQ). Mantenha os handlers idempotentes e observáveis.

## Observabilidade

- Logging estruturado (JSON) via encoder Logback
- Métricas: Micrometer + Prometheus/OTel
- Tracing: Micrometer Tracing com backend OpenTelemetry ou Brave

## Padrões de Produção

- Prefira injeção por construtor, evite injeção em campos (field injection)
- Habilite `spring.mvc.problemdetails.enabled=true` para erros RFC 7807 (Spring Boot 3+)
- Configure o tamanho das pools HikariCP para a carga de trabalho, defina timeouts
- Use `@Transactional(readOnly = true)` para consultas
- Force a segurança de nulos via `@NonNull` e `Optional` onde apropriado

**Lembre-se**: Mantenha os controllers finos, os services focados, os repositories simples, e os erros tratados centralmente. Otimize para manutenibilidade e testabilidade.
