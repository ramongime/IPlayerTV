---
name: react-native-best-practices
description: "Boas práticas da Software Mansion para apps em produção com React Native e Expo na Nova Arquitetura. Use para: 'React Native', 'Expo', 'New Architecture', 'Reanimated', 'Gesture Handler', 'react-native-svg', 'ExecuTorch', 'react-native-audio-api', 'react-native-enriched', 'Worklet', 'Fabric', 'TurboModule', 'WebGPU', 'react-native-wgpu', 'TypeGPU', 'GPU shader', 'WGSL', 'svg', 'animation', 'gesture', 'audio', 'rich text', 'AI model', 'multithreading', 'chart', 'vector', 'image filter', 'shared value', 'useSharedValue', 'runOnJS', 'scheduleOnRN', 'thread', 'worklet', ou qualquer questão envolvendo UI, gráficos, módulos nativos ou o comportamento das threads e de animações no React Native. Use também caso uma sub-skill mais específica seja identificada."
license: MIT
---

# Boas Práticas de React Native

Padrões de produção da Software Mansion para apps React Native na Nova Arquitetura.

Leia a sub-skill relevante para o tópico em questão. Todas as sub-skills estão em `references/`.

## Sub-skills

| Sub-skill | Quando usar |
|-----------|------------|
| `references/animations/SKILL.md` | Transições CSS, animações CSS, animações de valores compartilhados (shared value), animações de GPU shader (WebGPU, TypeGPU), animações de layout (entradas/saídas, transições, keyframes), animações baseadas em scroll, funções de animação (withSpring, withTiming, withDecay), hooks principais (useSharedValue, useAnimatedStyle), interpolação, sistemas de partículas, ruído procedural (noise), renderização SDF, performance de animação, 120fps, acessibilidade, Reanimated 4 |
| `references/gestures/SKILL.md` | Toque (tap), arrasto (pan), pinça (pinch), rotação, deslize (swipe), toque longo (long press), fling, hover, drag, Pressable, RectButton, Swipeable, DrawerLayout, VirtualGestureDetector, composição de gestos, teste de gestos -- qualquer interação de toque com Gesture Handler |
| `references/svg/SKILL.md` | Gráficos vetoriais, ícones, gráficos (charts), ilustrações usando React Native SVG |
| `references/on-device-ai/SKILL.md` | IA no dispositivo: LLMs (chat, chamada de ferramentas, saída estruturada, modelos de visão-linguagem), visão computacional (classificação, detecção de objetos, OCR, segmentação semântica/instância, transferência de estilo, embeddings, texto-para-imagem), processamento de fala (STT com timestamps, TTS com fonemas, VAD), processamento de quadros em tempo real do VisionCamera, carregamento de modelos, gerenciamento de recursos, modelos personalizados com ExecuTorch |
| `references/rich-text/SKILL.md` | Editor de texto rico (rich text), entrada de texto formatado, WYSIWYG, menções, renderizador Markdown, react-native-enriched, react-native-enriched-markdown |
| `references/multithreading/SKILL.md` | Multithreading, react-native-worklets, processamento em background, Worker Runtimes, thread de UI, scheduleOnUI, scheduleOnRN, Serializable, Synchronizable, descarregamento de computação da thread JS |
| `references/audio/SKILL.md` | Reprodução de áudio (buffer sources, osciladores, streaming, reprodução em fila), gravação (arquivo, callback de dados, processamento de grafo), efeitos de áudio (ganho, filtros, delay, convolver, panner, waveshaper), análise e visualização em tempo real, worklets de áudio (processamento personalizado, síntese), integração com sistema (sessões, interrupções, notificações, permissões), testes com mocks -- qualquer funcionalidade de áudio com react-native-audio-api |
