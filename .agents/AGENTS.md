# IPlayerTV Rules

As regras listadas aqui são específicas do projeto IPlayerTV e devem ser sempre consultadas para manter a estabilidade, padronização do desenvolvimento e entendimento da arquitetura do projeto.

## 1. Arquitetura do Projeto (Vite + Electron + React)
- **Estrutura de Pastas**: O projeto segue o padrão Vite-Electron com a seguinte divisão rígida na pasta `src/`:
  - `src/main/`: Processo Principal do Electron (Backend).
  - `src/renderer/`: Processo do Renderizador do Electron (Frontend React).
  - `src/shared/`: Tipos e modelos de domínio compartilhados entre Main e Renderer.
- **Aliases de Importação**: 
  - `@/` aponta para `src/renderer/src/` (usado estritamente no frontend).
  - `@shared/` aponta para `src/shared/` (usado em ambos os contextos).

## 2. Padrão Arquitetural do Processo Main (Backend)
- O processo do Electron é desenhado usando **Clean Architecture/DDD**:
  - `src/main/core/`: Regras de negócio, interfaces de repositórios e serviços.
  - `src/main/infrastructure/`: Implementação concreta do banco de dados (SQLite), provedores (Store) e fetchers.
  - `src/main/presentation/`: Controladores responsáveis por expor e registrar os canais IPC (`ipcMain.handle`).
- **Comunicação com o Frontend**: O Frontend não tem acesso direto a bibliotecas do Node (`fs`, `path`). Toda comunicação flui obrigatoriamente pelas APIs injetadas pelo arquivo `preload.ts`, acessadas globalmente no objeto `window.xtremeApi` (contendo namespaces como `accounts`, `xtream`, `favorites`, `player`, `tmdb`, etc).

## 3. Banco de Dados Local
- Utiliza **`better-sqlite3`**.
- Fica localizado em `src/main/infrastructure/database` (ex: `HistoryRepository`, `FavoriteRepository`, `AccountRepository`).
- A aplicação usa *raw SQL queries* (instruções diretas via a classe de conexão) encapsuladas nesses repositórios, então nunca sugira ou instale novos ORMs pesados (como TypeORM ou Prisma).

## 4. Arquitetura do Frontend (Renderer)
- **Design de Componentes**: Estruturado sob o conceito de "Feature-sliced" na pasta `src/renderer/src/features/` (abrigando módulos separados como `auth`, `catalog`, `player`).
- **Gerenciamento de Estado UI/Sincrono**: Controlado pelo **Zustand** (o `useAppStore` dita as contas ativas, abas abertas e filtros de pesquisa).
- **Dados Assíncronos / Server State**: Gerenciado pelo **TanStack React Query**. Não use `useEffect` manuais com `useState` para obter dados. As chamadas como `window.xtremeApi.xtream.categories` devem ser sempre embrulhadas em hooks `useQuery` ou `useMutation`.
- **Performance de UI**:
  - Animações e micro-interações usam a biblioteca **`framer-motion`**.
  - O projeto lida com categorias e EPGs extensos de IPTV. Para que a renderização não trave a interface, é obrigatório utilizar **`react-virtuoso`** nas grandes listas.
- **Múltiplos Idiomas**: O frontend lida com i18n (`react-i18next`). Evite incluir textos "hardcoded" para elementos centrais; utilize o hook `useTranslation()`.

## 5. Streaming e Integrações (Xtream/IPTV)
- O projeto processa APIs no padrão **Xtream Codes**.
- A reprodução HLS é feita com a biblioteca **`hls.js`**. O app intencionalmente desativa a segurança Web nativa no `BrowserWindow` (`webSecurity: false`) para burlar CORS em servidores Xtream/M3U alheios. Não modifique isso.
