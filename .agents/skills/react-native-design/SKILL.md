---
name: react-native-design
description: Master React Native styling, navigation, and Reanimated animations for cross-platform mobile development. Use when building React Native apps, implementing UI, or debugging styling issues.
---

# React Native Design Skill

## 1. Princípios Fundamentais (iOS e Android)
- **Design Nativo**: Entenda as diferenças entre as plataformas. No iOS, priorize transições suaves, sombras sutis (shadows) e blur effects. No Android, adote elevações (elevation) e o Material Design.
- **Responsividade**: Nunca utilize tamanhos fixos "mágicos". Use `flexbox`, porcentagens ou pegue as dimensões reais da tela com `useWindowDimensions()`.
- **SafeArea**: Sempre envolva as telas principais com `SafeAreaView` para garantir que a UI não seja cortada por entalhes (notches) ou bordas arredondadas, especialmente no iOS.

## 2. Animações e Performance (Reanimated)
- **Prioridade 1**: Para qualquer animação complexa (como drag-and-drop, scroll animations ou transições de layout fluidas), use obrigatoriamente a biblioteca `react-native-reanimated`.
- **UI Thread**: Certifique-se de usar worklets (como `useSharedValue`, `useAnimatedStyle`) para que as animações rodem a 60fps+ direto na UI thread, evitando travamentos na thread principal do JavaScript.
- **Layout Animations**: Use `LinearTransition` ou `FadeIn/FadeOut` da API do Reanimated V3 para animar montagem e desmontagem de componentes.

## 3. Navegação (Expo Router)
- **Estrutura de Rotas**: Siga o padrão de arquivos do Expo Router (`app/`).
- **Transições**: Para navegação stack fluida, customize as opções da tela usando `<Stack.Screen options={{ animation: 'slide_from_right' }} />` para seguir o feeling nativo.

## 4. Estilização (Styling)
- **Abordagem**: Crie os estilos usando `StyleSheet.create` para manter alta performance (são cacheados internamente).
- **Tipografia**: Se as fontes do sistema não forem suficientes, carregue as fontes usando `expo-font` no início do app. Ajuste `lineHeight` para melhorar a legibilidade.
- **Dark Mode**: Construa o design pensando desde o início no suporte a modos Claro e Escuro. Use os Hooks `useColorScheme()` nativos.

## 5. Boas Práticas e UX
- **Feedback Tátil**: Adicione *Haptics* (usando `expo-haptics`) nos botões e interações importantes.
- **Loading e Estados Vazios**: Sempre lide visualmente com estados de carregamento (Skeleton loaders em vez de Spinners são preferíveis) e adicione Empty States esteticamente agradáveis quando não houver dados.
