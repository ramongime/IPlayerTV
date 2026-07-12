# IPlayerTV

Player IPTV/Xtream Codes para **desktop (Electron)** e **mobile (Expo/React Native)**, organizado como monorepo npm workspaces com um pacote core compartilhado.

## Estrutura do monorepo

```
IPlayerTV/
├── packages/
│   └── core/        # @iplayertv/core — domínio, XtreamProvider, TmdbClient,
│                    #   interfaces (repos/serviços), contrato XtremeApi, i18n
└── apps/
    ├── desktop/     # Electron + React + Vite + better-sqlite3
    └── mobile/      # Expo (expo-router, expo-sqlite, expo-video)
```

Regra de ouro: os apps importam do core **pelo nome do pacote** (`@iplayertv/core`), nunca por caminho relativo.

## Comandos (sempre na raiz)

```bash
npm install          # instala tudo (workspaces, lock único)
npm run dev          # builda o core e roda o desktop (Vite + Electron)
npm run mobile       # builda o core e sobe o Expo (QR code p/ Expo Go)
npm run dev:core     # tsc --watch do core (2º terminal, ao editar o core)
npm run build        # build completo (core + desktop)
npm run dist         # build + electron-builder (dmg/nsis/AppImage/deb)
```

## Desktop — o que já vem

- Cadastro e validação de contas Xtream (credenciais testadas no servidor antes de salvar)
- **Login via URL M3U**, além do cadastro Xtream tradicional
- Biblioteca de **Live / Movies / Series**, **Favoritos** e **Histórico**
- **EPG curto** para canais ao vivo, episódios de séries
- **Fallback de URL** para stream antes de abrir no player
- Integração com **VLC**, **mpv**, browser ou player interno (hls.js)
- **Controle parental** por PIN para categorias
- Persistência local com SQLite (better-sqlite3)

## Mobile — o que já vem (v1)

- Login Xtream (com colar link M3U) validado no servidor
- Abas **Canais / Filmes / Séries / Favoritos / Ajustes**
- EPG "agora" na lista de canais ao vivo
- Player nativo (**expo-video**: ExoPlayer/AVPlayer) com fallback de URL do core
- Favoritos e histórico locais (expo-sqlite, mesmo schema do desktop)
- Dados sensíveis (PIN parental, chave TMDB) no **armazenamento seguro do SO** (Keychain/Keystore via expo-secure-store)
- Teste via **Expo Go**: `npm run mobile` e escaneie o QR code

## Build Android local (sem EAS)

Pré-requisitos: Node 20+, JDK 17 e Android Studio (com Android SDK e a variável `ANDROID_HOME` configurada).

```bash
# instala só o necessário para o mobile (evita o toolchain do Electron,
# que no Windows exige Python + Visual Studio Build Tools)
npm install -w packages/core -w apps/mobile

npm run android       # builda e instala direto no celular plugado via USB (depuração USB ativa)
npm run android:apk   # só gera o arquivo APK (android/app/build/outputs/apk/release/app-release.apk)
```

Se for trabalhar também no desktop, use `npm install` completo (no Windows, instale antes o Python e o Visual Studio Build Tools, exigidos pelo better-sqlite3).

O APK sai assinado com a chave de debug — perfeito para instalar manualmente (sideload), não serve para a Play Store.

## Configurações importantes (desktop)

Abra as **Configurações** no app e informe o caminho do executável do player.

### Windows
- VLC: `C:\Program Files\VideoLAN\VLC\vlc.exe`
- mpv: `C:\mpv\mpv.exe`

### macOS
- VLC: `/Applications/VLC.app/Contents/MacOS/VLC`
- mpv: `/opt/homebrew/bin/mpv`

## TMDB (capas/backdrops)

O app usa a API do TMDB para capas e sinopses. Há uma chave pública de fallback embutida; para usar a sua própria, informe-a nas **Configurações** do app ou defina `EXPO_PUBLIC_TMDB_API_KEY` no build do mobile.

## Próximos upgrades recomendados

- Build standalone do mobile (EAS + TestFlight)
- Criptografia da senha Xtream salva no SQLite (PIN e chave TMDB do mobile já ficam no armazenamento seguro do SO)
- Download / gravação / catch-up
- EPG XMLTV mais completo
