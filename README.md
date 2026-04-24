# IPlayerTV

Starter desktop para IPTV/Xtream em **Electron + React + TypeScript + SQLite**.

## O que já vem nessa versão

- Cadastro e validação de contas Xtream
- Biblioteca de **Live / Movies / Series**
- **Favoritos** e **Histórico**
- **EPG curto** para canais ao vivo
- **Carregamento de episódios** para séries
- **Fallback de URL** para stream antes de abrir no player
- Integração com **VLC**, **mpv** ou browser
- Persistência local com SQLite
- Script base de empacotamento com **electron-builder**

## Rodando em desenvolvimento

```bash
npm install
npm run dev
```

## Gerando build desktop

```bash
npm install
npm run dist
```

## Configurações importantes

Abra as **Configurações** no app e informe o caminho do executável do player.

Exemplos comuns:

### Windows
- VLC: `C:\Program Files\VideoLAN\VLC\vlc.exe`
- mpv: `C:\mpv\mpv.exe`

### macOS
- VLC: `/Applications/VLC.app/Contents/MacOS/VLC`
- mpv: `/opt/homebrew/bin/mpv`

## Próximos upgrades recomendados

- Criptografia da senha salva
- Pôsteres/metadata externos (TMDB)
- Player embutido em vez de externo
- Download / gravação / catch-up
- EPG XMLTV mais completo
- Login M3U além de Xtream
