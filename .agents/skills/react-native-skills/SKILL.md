---
name: react-native-skills
description: "Use quando estiver trabalhando com tarefas ou fluxos de trabalho de react-native-skills"
risk: safe
source: "https://github.com/vercel-labs/agent-skills"
date_added: "2026-06-02"
---

# Habilidades de React Native

Boas práticas abrangentes para aplicações React Native e Expo. Contém
regras em várias categorias abrangendo performance, animações, padrões de UI,
e otimizações específicas de plataforma.

## Quando Usar
Consulte estas diretrizes quando:

- Construir apps React Native ou Expo
- Otimizar listas e performance de rolagem (scroll)
- Implementar animações com Reanimated
- Trabalhar com imagens e mídia
- Configurar módulos nativos ou fontes
- Estruturar projetos monorepo com dependências nativas

## Categorias de Regras por Prioridade

| Prioridade | Categoria         | Impacto  | Prefixo              |
| ---------- | ----------------- | -------- | -------------------- |
| 1          | Performance Lista | CRÍTICO  | `list-performance-`  |
| 2          | Animação          | ALTO     | `animation-`         |
| 3          | Navegação         | ALTO     | `navigation-`        |
| 4          | Padrões UI        | ALTO     | `ui-`                |
| 5          | Gestão de Estado  | MÉDIO    | `react-state-`       |
| 6          | Renderização      | MÉDIO    | `rendering-`         |
| 7          | Monorepo          | MÉDIO    | `monorepo-`          |
| 8          | Configuração      | BAIXO    | `fonts-`, `imports-` |

## Referência Rápida

### 1. Performance de Lista (CRÍTICO)

- `list-performance-virtualize` - Use FlashList para listas grandes
- `list-performance-item-memo` - Memorize componentes de itens de lista
- `list-performance-callbacks` - Estabilize referências de callbacks
- `list-performance-inline-objects` - Evite objetos de estilo inline
- `list-performance-function-references` - Extraia funções para fora do render
- `list-performance-images` - Otimize imagens em listas
- `list-performance-item-expensive` - Mova trabalhos caros para fora dos itens
- `list-performance-item-types` - Use tipos de itens para listas heterogêneas

### 2. Animação (ALTO)

- `animation-gpu-properties` - Anime apenas transform e opacity
- `animation-derived-value` - Use useDerivedValue para animações computadas
- `animation-gesture-detector-press` - Use Gesture.Tap em vez de Pressable

### 3. Navegação (ALTO)

- `navigation-native-navigators` - Use stack nativa e tabs nativas em vez de navegadores JS

### 4. Padrões de UI (ALTO)

- `ui-expo-image` - Use expo-image para todas as imagens
- `ui-image-gallery` - Use Galeria para lightboxes de imagens
- `ui-pressable` - Use Pressable em vez de TouchableOpacity
- `ui-safe-area-scroll` - Lide com áreas seguras (safe areas) em ScrollViews
- `ui-scrollview-content-inset` - Use contentInset para cabeçalhos
- `ui-menus` - Use menus de contexto nativos
- `ui-native-modals` - Use modais nativos quando possível
- `ui-measure-views` - Use onLayout, não measure()
- `ui-styling` - Use StyleSheet.create ou Nativewind

### 5. Gerenciamento de Estado (MÉDIO)

- `react-state-minimize` - Minimize inscrições (subscriptions) de estado
- `react-state-dispatcher` - Use o padrão dispatcher para callbacks
- `react-state-fallback` - Mostre fallback no primeiro render
- `react-compiler-destructure-functions` - Desestruture para o React Compiler
- `react-compiler-reanimated-shared-values` - Lide com valores compartilhados com o compiler

### 6. Renderização (MÉDIO)

- `rendering-text-in-text-component` - Envolva texto em componentes Text
- `rendering-no-falsy-and` - Evite && falsy para renderização condicional

### 7. Monorepo (MÉDIO)

- `monorepo-native-deps-in-app` - Mantenha dependências nativas no pacote do app
- `monorepo-single-dependency-versions` - Use versões únicas através dos pacotes

### 8. Configuração (BAIXO)

- `fonts-config-plugin` - Use plugins de config para fontes personalizadas
- `imports-design-system-folder` - Organize as importações do design system
- `js-hoist-intl` - Eleve (hoist) a criação de objetos Intl

## Como Usar

Leia arquivos de regras individuais para explicações detalhadas e exemplos de código:

```
rules/list-performance-virtualize.md
rules/animation-gpu-properties.md
```

Cada arquivo de regra contém:

- Breve explicação de por que importa
- Exemplo de código incorreto com explicação
- Exemplo de código correto com explicação
- Contexto adicional e referências

## Documento Completo Compilado

Para o guia completo com todas as regras expandidas: `AGENTS.md`

## Limitações
- Use esta skill apenas quando a tarefa corresponder claramente ao escopo descrito acima.
- Não trate a saída como um substituto para validação específica do ambiente, testes ou revisão especializada.
- Pare e peça esclarecimentos se faltarem inputs necessários, permissões, limites de segurança ou critérios de sucesso.
