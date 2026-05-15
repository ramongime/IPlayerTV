import { useEffect, useMemo, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    hiddenCategories,
    toggleHiddenCategory,
    loadHiddenCategories
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
  const [internalPlayerUrl, setInternalPlayerUrl] = useState<{ url: string; title: string; contentType: ContentType; streamId?: number; accountId?: string; startProgress?: number }>();
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
              .catch(() => { }); // silently ignore errors
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
    if (activeAccountId) {
      loadHiddenCategories(activeAccountId, activeTab);
    }
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

  const featuredStream = useMemo(() => {
    if (filteredStreams.length > 0 && shelfView === 'catalog' && (activeTab === 'movie' || activeTab === 'series') && !search) {
      // Pega o primeiro item que tenha capa para destacar
      return filteredStreams.find(s => s.cover || s.stream_icon) || filteredStreams[0];
    }
    return null;
  }, [filteredStreams, shelfView, activeTab, search]);

  const playItem = async (stream: StreamItem, options?: { contentType?: 'series' | 'movie' | 'live'; streamId?: number; extension?: string; name?: string }) => {
    if (!activeAccountId) return;
    const account = accounts.find(a => a.id === activeAccountId);
    if (!account) return;

    const streamId = options?.streamId ?? stream.stream_id ?? stream.series_id ?? 0;
    const contentType = options?.contentType ?? activeTab;
    const streamName = options?.name ?? stream.name;

    if (account.player === 'internal') {
      let forcedExtension = options?.extension || stream.container_extension;
      if (contentType === 'live') {
        forcedExtension = 'm3u8';
      } else if (!forcedExtension || forcedExtension === 'mkv' || forcedExtension === 'ts') {
        forcedExtension = 'mp4';
      }

      const result = await window.xtremeApi.player.resolveUrl({
        accountId: activeAccountId,
        contentType: contentType,
        streamId,
        extension: forcedExtension
      });

      // Check if we have history for this stream to resume
      const histories = await window.xtremeApi.history.list(activeAccountId);
      const historyItem = histories.find(h => h.streamId === streamId);

      let startProgress = 0;
      if (historyItem?.progress && historyItem.duration && historyItem.progress < historyItem.duration - 60) {
        if (confirm(`Deseja retomar do minuto ${Math.floor(historyItem.progress / 60)}?`)) {
          startProgress = historyItem.progress;
        }
      }

      setInternalPlayerUrl({
        url: result.url,
        title: options?.name || stream.name,
        contentType: options?.contentType || activeTab,
        streamId,
        accountId: activeAccountId,
        startProgress
      });
      setIsSidebarOpen(false); // Colapsa a sidebar para melhor experiência
      setLastPlayMessage(undefined);
      return;
    }

    const result = await window.xtremeApi.player.open({
      accountId: activeAccountId,
      contentType,
      streamId,
      name: streamName,
      extension: options?.extension ?? stream.container_extension
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
      extension: 'm3u8'
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
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${shelfView}-${activeCategoryId}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '18px' }}
            >
              {featuredStream && (
                <div className="hero-banner" style={{
                  position: 'relative',
                  height: '350px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '40px',
                  backgroundImage: `linear-gradient(to top, rgba(7, 17, 31, 1) 0%, rgba(7, 17, 31, 0) 100%), url(${featuredStream.cover || featuredStream.stream_icon})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}>
                  <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
                    <h1 style={{ fontSize: '42px', margin: '0 0 12px 0', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{featuredStream.name}</h1>
                    <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#cbd5e1', textShadow: '0 1px 4px rgba(0,0,0,0.8)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {featuredStream.plot || 'Sem descrição disponível.'}
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="primary-button" onClick={() => {
                        if (activeTab === 'series') {
                          setSelectedStream(featuredStream);
                          setShowInspectModal(true);
                        } else {
                          playItem(featuredStream);
                        }
                      }}>Assistir Agora</button>
                      <button className="ghost-button" onClick={() => {
                        setSelectedStream(featuredStream);
                        setShowInspectModal(true);
                      }}>Mais Informações</button>
                    </div>
                  </div>
                </div>
              )}

              {shelfView === 'catalog' ? <CategoryList categories={categories} activeCategoryId={activeCategoryId} onSelect={setActiveCategoryId} enableSearchAll={enableSearchAll} hiddenCategories={hiddenCategories} onToggleHidden={toggleHiddenCategory} /> : null}
              {error ? <div className="alert error">{error}</div> : null}
              {loading ? (
                <div className="stream-grid" style={{ opacity: 0.5 }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <article className="stream-card skeleton" key={i} style={{ animation: 'pulse 1.5s infinite ease-in-out', background: 'rgba(255,255,255,0.05)', height: '300px', borderRadius: '12px' }}></article>
                  ))}
                </div>
              ) : null}

              {!loading && (
                <StreamGrid
                  contentType={activeTab}
                  streams={featuredStream ? filteredStreams.filter(s => s !== featuredStream) : filteredStreams}
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
              )}
            </motion.div>
          </AnimatePresence>
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
          streamId={internalPlayerUrl.streamId}
          accountId={internalPlayerUrl.accountId}
          startProgress={internalPlayerUrl.startProgress}
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
