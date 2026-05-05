import { useEffect, useMemo, useState, ReactNode } from 'react';
import { AccountModal } from '@/features/auth/AccountModal';
import { CategoryList } from '@/features/catalog/CategoryList';
import { InspectModal } from '@/features/player/InspectModal';
import { InternalPlayer } from '@/features/player/InternalPlayer';
import { MultiViewPlayer } from '@/features/player/MultiViewPlayer';
import { SettingsModal } from '@/features/player/SettingsModal';
import { Sidebar } from '@/features/auth/Sidebar';
import { StreamGrid } from '@/features/catalog/StreamGrid';
import { TopBar } from '@/features/catalog/TopBar';
import type { Account, Category, Episode, Favorite, HistoryItem, ShelfView, StreamItem, ContentType, EpgProgramme } from '@shared/domain';
import { useAppStore } from '@/store/useAppStore';

export function DashboardPage() {
  const {
    accounts,
    activeAccountId,
    activeTab,
    search,
    loading,
    error,
    setAccounts,
    setActiveAccountId,
    setActiveTab,
    setSearch,
    setLoading,
    setError,
    enableSearchAll,
    setEnableSearchAll
  } = useAppStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [selectedStream, setSelectedStream] = useState<StreamItem>();
  const [shelfView, setShelfView] = useState<ShelfView>('catalog');
  const [lastPlayMessage, setLastPlayMessage] = useState<ReactNode>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [nowPlaying, setNowPlaying] = useState<Record<number, string>>({});
  const [editingAccount, setEditingAccount] = useState<Account>();
  const [internalPlayerUrl, setInternalPlayerUrl] = useState<{ url: string; title: string; contentType: ContentType }>();
  const [multiViewStreams, setMultiViewStreams] = useState<Array<{ url: string; title: string; id: string }>>([]);
  const [multiViewMinimized, setMultiViewMinimized] = useState(false);

  const loadAccounts = async () => {
    const result = await window.xtremeApi.accounts.list();
    setAccounts(result);
  };

  const loadLibrary = async () => {
    if (!activeAccountId) return;

    setLoading(true);
    setError(undefined);

    try {
      const [nextCategories, nextFavorites, nextHistory] = await Promise.all([
        window.xtremeApi.xtream.categories(activeAccountId, activeTab),
        window.xtremeApi.favorites.list(activeAccountId),
        window.xtremeApi.history.list(activeAccountId)
      ]);
      setCategories(nextCategories);
      setFavorites(nextFavorites);
      setHistory(nextHistory);

      let categoryToLoad = activeCategoryId;
      if (categoryToLoad === 'all' && !enableSearchAll && nextCategories.length > 0) {
        categoryToLoad = nextCategories[0].category_id;
        setActiveCategoryId(categoryToLoad);
      }

      if (categoryToLoad !== 'all' || enableSearchAll) {
        const nextStreams = await window.xtremeApi.xtream.streams(activeAccountId, activeTab, categoryToLoad === 'all' ? undefined : categoryToLoad);
        setStreams(nextStreams);

        // Fetch now playing info for live channels in the background
        if (activeTab === 'live' && nextStreams.length > 0) {
          const streamIds = nextStreams
            .filter((s: StreamItem) => s.stream_id)
            .slice(0, 50) // limit to first 50 to avoid overloading
            .map((s: StreamItem) => s.stream_id as number);
          if (streamIds.length > 0) {
            window.xtremeApi.xtream.nowPlaying(activeAccountId, streamIds)
              .then((data) => setNowPlaying(data))
              .catch(() => {}); // silently ignore errors
          }
        } else {
          setNowPlaying({});
        }
      } else {
        setStreams([]);
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts().catch((err) => setError(String(err)));
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [activeAccountId, activeTab, activeCategoryId, enableSearchAll]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.key === '/' || (e.metaKey && e.key === 'k') || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.search-input')?.focus();
      }
      if (e.key === '1') setActiveTab('live');
      if (e.key === '2') setActiveTab('movie');
      if (e.key === '3') setActiveTab('series');
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) setShelfView(shelfView === 'favorites' ? 'catalog' : 'favorites');
      if (e.key === 'h' && !e.metaKey && !e.ctrlKey) setShelfView(shelfView === 'history' ? 'catalog' : 'history');
      if (e.key === 'Escape') {
        setShowAccountModal(false);
        setShowSettingsModal(false);
        setShowInspectModal(false);
        setEditingAccount(undefined);
        setInternalPlayerUrl(undefined);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shelfView]);

  const filteredStreams = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const base = shelfView === 'catalog'
      ? streams
      : shelfView === 'favorites'
        ? streams.filter((stream) => favorites.some((fav) => fav.contentType === activeTab && fav.streamId === (stream.stream_id ?? stream.series_id ?? 0)))
        : streams.filter((stream) => history.some((item) => item.contentType === activeTab && item.streamId === (stream.stream_id ?? stream.series_id ?? 0)));

    if (!normalized) return base;
    return base.filter((item) => item.name.toLowerCase().includes(normalized));
  }, [streams, search, favorites, history, shelfView, activeTab]);

  const playItem = async (stream: StreamItem, override?: { contentType?: 'series' | 'movie' | 'live'; streamId?: number; extension?: string; name?: string }) => {
    if (!activeAccountId) return;
    const account = accounts.find(a => a.id === activeAccountId);
    if (!account) return;

    const streamId = override?.streamId ?? stream.stream_id ?? stream.series_id ?? 0;
    const contentType = override?.contentType ?? activeTab;
    const streamName = override?.name ?? stream.name;

    if (account.player === 'internal') {
      const result = await window.xtremeApi.player.resolveUrl({
        accountId: activeAccountId,
        contentType,
        streamId,
        extension: override?.extension ?? stream.container_extension
      });
      setInternalPlayerUrl({ url: result.url, title: streamName, contentType });
      setLastPlayMessage(undefined);
      
      const nextHistory = await window.xtremeApi.history.list(activeAccountId);
      setHistory(nextHistory);
      return;
    }

    const result = await window.xtremeApi.player.open({
      accountId: activeAccountId,
      contentType,
      streamId,
      name: streamName,
      extension: override?.extension ?? stream.container_extension
    });

    if (account.player === 'browser') {
      setLastPlayMessage(
        <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          O vídeo foi aberto no seu navegador. 
          <button 
            onClick={() => window.xtremeApi.shell.openExternal(result.url)} 
            style={{ background: 'none', border: 'none', color: '#4cc9f0', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
          >
            Clique aqui se não abriu
          </button>
        </span>
      );
    } else {
      setLastPlayMessage(`Reproduzindo via ${result.method.toUpperCase()}`);
    }

    const nextHistory = await window.xtremeApi.history.list(activeAccountId);
    setHistory(nextHistory);
  };

  const playEpisode = async (episode: Episode) => {
    if (!selectedStream) return;
    await playItem(selectedStream, {
      contentType: 'series',
      streamId: episode.id as number,
      extension: episode.container_extension,
      name: `${selectedStream.name} - S${(episode.season ?? 0).toString().padStart(2, '0')}E${(episode.episode_num ?? 0).toString().padStart(2, '0')}`
    });
  };

  const playCatchup = async (epg: EpgProgramme) => {
    if (!selectedStream || !activeAccountId || !epg.start_raw || !epg.end_raw) return;
    const account = accounts.find(a => a.id === activeAccountId);
    if (!account) return;

    // Calculate duration in minutes
    const startObj = new Date(epg.start_raw.replace(' ', 'T'));
    const endObj = new Date(epg.end_raw.replace(' ', 'T'));
    let durationMinutes = Math.floor((endObj.getTime() - startObj.getTime()) / 60000);
    if (isNaN(durationMinutes) || durationMinutes <= 0) durationMinutes = 60; // fallback to 1h

    const streamId = selectedStream.stream_id ?? selectedStream.series_id ?? 0;
    const name = `${selectedStream.name} (Gravação: ${epg.title})`;

    if (account.player === 'internal') {
      const result = await window.xtremeApi.player.resolveCatchupUrl({
        accountId: activeAccountId,
        streamId,
        startRaw: epg.start_raw,
        durationMinutes,
        extension: 'm3u8'
      });
      setInternalPlayerUrl({ url: result.url, title: name, contentType: 'live' });
      setLastPlayMessage(undefined);
      setShowInspectModal(false);
      return;
    }

    const result = await window.xtremeApi.player.openCatchup({
      accountId: activeAccountId,
      streamId,
      name,
      startRaw: epg.start_raw,
      durationMinutes,
      extension: 'm3u8'
    });

    if (account.player === 'browser') {
      setLastPlayMessage(
        <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          A gravação foi aberta no navegador. 
          <button 
            onClick={() => window.xtremeApi.shell.openExternal(result.url)} 
            style={{ background: 'none', border: 'none', color: '#4cc9f0', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
          >
            Clique aqui se não abriu
          </button>
        </span>
      );
    } else {
      setLastPlayMessage(`Reproduzindo gravação via ${result.method.toUpperCase()}`);
    }
    setShowInspectModal(false);
  };

  const addMultiView = async (stream: StreamItem) => {
    if (!activeAccountId) return;
    if (multiViewStreams.length >= 4) {
      alert('Limite de 4 canais simultâneos atingido.');
      return;
    }
    const streamId = stream.stream_id ?? 0;
    if (multiViewStreams.find(s => s.id === String(streamId))) {
      return;
    }
    const result = await window.xtremeApi.player.resolveUrl({
      accountId: activeAccountId,
      contentType: 'live',
      streamId,
      extension: stream.container_extension
    });
    setMultiViewStreams(prev => [...prev, { url: result.url, title: stream.name || 'Ao Vivo', id: String(streamId) }]);
    setMultiViewMinimized(false);
    setLastPlayMessage(undefined);
  };

  return (
    <div className={`app-shell ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
      {isSidebarOpen && (
        <Sidebar
          accounts={accounts}
          activeAccountId={activeAccountId}
          onAccountChange={setActiveAccountId}
          onCreateAccount={() => { setEditingAccount(undefined); setShowAccountModal(true); }}
          onEditAccount={(account) => { setEditingAccount(account); setShowAccountModal(true); }}
          onRemoveAccount={async (id) => {
            await window.xtremeApi.accounts.remove(id);
            await loadAccounts();
          }}
        />
      )}

      <main className="content">
        <TopBar
          search={search}
          shelfView={shelfView}
          activeTab={activeTab}
          onSearchChange={setSearch}
          onShelfChange={setShelfView}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setActiveCategoryId('all');
            setShelfView('catalog');
          }}
          onOpenSettings={() => setShowSettingsModal(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {lastPlayMessage ? <div className="alert">{lastPlayMessage}</div> : null}

        {!activeAccountId ? (
          <section className="empty-state">
            <h1>Cadastre sua primeira conta</h1>
            <p>Adicione um servidor Xtream Codes para começar.</p>
            <button className="primary-button" onClick={() => setShowAccountModal(true)}>Adicionar conta</button>
          </section>
        ) : (
          <>
            {shelfView === 'catalog' ? <CategoryList categories={categories} activeCategoryId={activeCategoryId} onSelect={setActiveCategoryId} enableSearchAll={enableSearchAll} /> : null}
            {error ? <div className="alert error">{error}</div> : null}
            {loading ? <div className="alert">Carregando dados do servidor...</div> : null}
            
            <StreamGrid
                contentType={activeTab}
                streams={filteredStreams}
                favorites={favorites}
                nowPlaying={activeTab === 'live' ? nowPlaying : undefined}
                onToggleFavorite={async (stream) => {
                  const streamId = stream.stream_id ?? stream.series_id ?? 0;
                  await window.xtremeApi.favorites.toggle({
                    accountId: activeAccountId,
                    contentType: activeTab,
                    streamId,
                    name: stream.name,
                    icon: stream.stream_icon || stream.cover
                  });
                  const nextFavorites = await window.xtremeApi.favorites.list(activeAccountId);
                  setFavorites(nextFavorites);
                }}
                onInspect={(stream) => {
                  setSelectedStream(stream);
                  setShowInspectModal(true);
                }}
                onAddMultiView={activeTab === 'live' ? addMultiView : undefined}
                onPlay={async (stream) => {
                  if (activeTab === 'series') {
                    setSelectedStream(stream);
                    setShowInspectModal(true);
                    return;
                  }
                  await playItem(stream);
                }}
              />
          </>
        )}
      </main>

      <AccountModal
        open={showAccountModal}
        editAccount={editingAccount}
        onClose={() => { setShowAccountModal(false); setEditingAccount(undefined); }}
        onSave={async (payload) => {
          await window.xtremeApi.accounts.create(payload);
          await loadAccounts();
          setLastPlayMessage(undefined);
        }}
        onUpdate={async (id, payload) => {
          await window.xtremeApi.accounts.update(id, payload);
          await loadAccounts();
          setLastPlayMessage(undefined);
        }}
      />

      <SettingsModal open={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
      <InspectModal
        open={showInspectModal}
        accountId={activeAccountId}
        contentType={activeTab}
        stream={selectedStream}
        onClose={() => setShowInspectModal(false)}
        onPlayEpisode={playEpisode}
        onPlayCatchup={playCatchup}
      />
      {internalPlayerUrl && (
        <InternalPlayer 
          streamUrl={internalPlayerUrl.url} 
          title={internalPlayerUrl.title} 
          contentType={internalPlayerUrl.contentType}
          onClose={() => setInternalPlayerUrl(undefined)} 
        />
      )}
      {multiViewStreams.length > 0 && (
        <MultiViewPlayer 
          streams={multiViewStreams}
          minimized={multiViewMinimized}
          onMinimize={() => setMultiViewMinimized(!multiViewMinimized)}
          onClose={() => { setMultiViewStreams([]); setMultiViewMinimized(false); }} 
          onRemoveStream={(id) => setMultiViewStreams(prev => prev.filter(s => s.id !== id))} 
        />
      )}
    </div>
  );
}
