---
name: security-reactnative
description: Master security patterns in React Native. Prevent vulnerabilities like reverse engineering, insecure storage, unpinned connections, and exposed secrets. Use this when implementing auth flows or handling sensitive data.
---

# React Native Security Skill

## 1. Gerenciamento de Segredos e Chaves
- **NUNCA** faça hardcode de senhas, chaves de API secretas ou tokens JWT no código fonte (`.js` ou `.ts`).
- **NUNCA** coloque secrets confidenciais no `.env` do App React Native. Tudo o que vai pro front-end pode ser submetido a engenharia reversa. Variáveis como `EXPO_PUBLIC_API_URL` estão ok porque são públicas.
- Mantenha lógicas pesadas e autenticações com chaves mestras no lado do **Backend**.

## 2. Armazenamento Seguro (Secure Storage)
- **Não use** `AsyncStorage` para dados sensíveis (tokens, senhas, PII). O AsyncStorage salva os dados em texto claro (plain text) no disco.
- **Solução**: Use bibliotecas nativas de armazenamento criptografado. No ecossistema Expo, use **obrigatoriamente** `expo-secure-store`. Isso salva no Keychain (iOS) e Keystore (Android).

## 3. Comunicação Segura de Rede
- Faça todas as requisições utilizando `https://` (TLS 1.2+).
- Para extrema segurança em transações financeiras, implemente **SSL Pinning** (fixação de certificado) para garantir que o App só converse com seu servidor autêntico e previna ataques Man-in-the-Middle (MitM).

## 4. Proteção contra Engenharia Reversa e Ataques
- **Obfuscação de Código**: Garanta que o bundle JavaScript esteja ofuscado usando Hermes em produção (por padrão no Expo).
- Cuidado intenso com injeção de código: nunca confie no conteúdo da rede a ponto de passá-lo para funções como `eval()` ou deixá-lo renderizar links não sanitizados.

## 5. Manuseio de Autenticação (Auth) e Biometria
- Em apps que lidam com dinheiro ou dados de saúde, exija a re-autenticação do usuário usando biometria local (FaceID/TouchID via `expo-local-authentication`) ao invés de manter uma sessão sensível eternamente aberta.
- Implemente uma lógica para "deslogar" automaticamente e limpar os tokens no armazenamento seguro assim que receber um `401 Unauthorized`.
