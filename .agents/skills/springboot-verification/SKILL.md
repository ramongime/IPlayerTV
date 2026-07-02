---
name: springboot-verification
description: "Verification loop for Spring Boot projects: build, static analysis, tests with coverage, security scans, and diff review before release or PR."
origin: ECC
---

# Ciclo de Verificação Spring Boot

Execute antes de PRs, após grandes mudanças e antes de deployments.

## Quando Ativar

- Antes de abrir pull request para serviço Spring Boot
- Após grandes refactorings ou atualizações de dependências
- Verificação pré-deployment para staging ou produção
- Execução completa do pipeline build → lint → test → varredura de segurança
- Verificação de que a cobertura de testes atende aos limites mínimos

## Fase 1: Build

```bash
mvn -T 4 clean verify -DskipTests
# ou
./gradlew clean assemble -x test
```

Se o build falhar, pare e corrija.

## Fase 2: Análise Estática

Maven (plugins comuns):
```bash
mvn -T 4 spotbugs:check pmd:check checkstyle:check
```

Gradle (se configurado):
```bash
./gradlew checkstyleMain pmdMain spotbugsMain
```

## Fase 3: Testes + Cobertura

```bash
mvn -T 4 test
mvn jacoco:report   # verifique 80%+ de cobertura
# ou
./gradlew test jacocoTestReport
```

Relatório:
- Total de testes, aprovados/reprovados
- % de cobertura (linhas/branches)

### Testes Unitários

Teste a lógica do serviço isoladamente com dependências mockadas:

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

  @Mock private UserRepository userRepository;
  @InjectMocks private UserService userService;

  @Test
  void createUser_validInput_returnsUser() {
    var dto = new CreateUserDto("Alice", "alice@example.com");
    var expected = new User(1L, "Alice", "alice@example.com");
    when(userRepository.save(any(User.class))).thenReturn(expected);

    var result = userService.create(dto);

    assertThat(result.name()).isEqualTo("Alice");
    verify(userRepository).save(any(User.class));
  }

  @Test
  void createUser_duplicateEmail_throwsException() {
    var dto = new CreateUserDto("Alice", "existing@example.com");
    when(userRepository.existsByEmail(dto.email())).thenReturn(true);

    assertThatThrownBy(() -> userService.create(dto))
        .isInstanceOf(DuplicateEmailException.class);
  }
}
```

### Testes de Integração com Testcontainers

Teste contra um banco de dados real em vez de H2:

```java
@SpringBootTest
@Testcontainers
class UserRepositoryIntegrationTest {

  @Container
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
      .withDatabaseName("testdb");

  @DynamicPropertySource
  static void configureProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
  }

  @Autowired private UserRepository userRepository;

  @Test
  void findByEmail_existingUser_returnsUser() {
    userRepository.save(new User("Alice", "alice@example.com"));

    var found = userRepository.findByEmail("alice@example.com");

    assertThat(found).isPresent();
    assertThat(found.get().getName()).isEqualTo("Alice");
  }
}
```

### Testes de API com MockMvc

Teste a camada de controller com o contexto completo do Spring:

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

  @Autowired private MockMvc mockMvc;
  @MockBean private UserService userService;

  @Test
  void createUser_validInput_returns201() throws Exception {
    var user = new UserDto(1L, "Alice", "alice@example.com");
    when(userService.create(any())).thenReturn(user);

    mockMvc.perform(post("/api/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name": "Alice", "email": "alice@example.com"}
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.name").value("Alice"));
  }

  @Test
  void createUser_invalidEmail_returns400() throws Exception {
    mockMvc.perform(post("/api/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name": "Alice", "email": "not-an-email"}
                """))
        .andExpect(status().isBadRequest());
  }
}
```

## Fase 4: Varredura de Segurança

```bash
# CVEs de dependências
mvn org.owasp:dependency-check-maven:check
# ou
./gradlew dependencyCheckAnalyze

# Segredos no código fonte
grep -rn "password\s*=\s*\"" src/ --include="*.java" --include="*.yml" --include="*.properties"
grep -rn "sk-\|api_key\|secret" src/ --include="*.java" --include="*.yml"

# Segredos (histórico do git)
git secrets --scan  # se configurado
```

### Achados de Segurança Comuns

```
# Verificação de System.out.println (use logger ao invés)
grep -rn "System\.out\.print" src/main/ --include="*.java"

# Verificação de mensagens de exception brutas nas respostas
grep -rn "e\.getMessage()" src/main/ --include="*.java"

# Verificação de CORS wildcard
grep -rn "allowedOrigins.*\*" src/main/ --include="*.java"
```

## Fase 5: Lint/Format (gate opcional)

```bash
mvn spotless:apply   # se usar o plugin Spotless
./gradlew spotlessApply
```

## Fase 6: Revisão do Diff

```bash
git diff --stat
git diff
```

Checklist:
- Sem logs de debug restantes (`System.out`, `log.debug` sem proteção)
- Erros significativos e status HTTP corretos
- Transactions e validações presentes onde necessário
- Mudanças de configuração documentadas

## Template de Saída

```
RELATÓRIO DE VERIFICAÇÃO
=========================
Build:      [PASSOU/FALHOU]
Estática:   [PASSOU/FALHOU] (spotbugs/pmd/checkstyle)
Testes:     [PASSOU/FALHOU] (X/Y passaram, Z% cobertura)
Segurança:  [PASSOU/FALHOU] (achados CVE: N)
Diff:       [X arquivos alterados]

Geral:      [PRONTO / NÃO PRONTO]

Problemas a Corrigir:
1. ...
2. ...
```

## Modo Contínuo

- Re-execute as fases a cada 30-60 minutos em mudanças significativas ou sessões longas
- Mantenha o ciclo curto: `mvn -T 4 test` + spotbugs para feedback rápido

**Lembre-se**: Feedback rápido vence surpresas tardias. Mantenha o gate apertado — em sistemas de produção, trate avisos como defeitos.
