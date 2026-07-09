import { useEffect, useMemo, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccountModal } from '@/features/auth/AccountModal';
import { CategoryList } from '@/features/catalog/CategoryList';
import { EpgGrid } from '@/features/catalog/EpgGrid';
import { InspectModal } from '@/features/player/InspectModal';
import { InternalPlayer } from '@/features/player/InternalPlayer';
import { MultiViewPlayer } from '@/features/player/MultiViewPlayer';
import { SettingsModal } from '@/features/player/SettingsModal';
import { Sidebar } from '@/features/auth/Sidebar';
import { StreamGrid } from '@/features/catalog/StreamGrid';
import { TopBar } from '@/features/catalog/TopBar';
import type { Account, Episode, ShelfView, StreamItem, ContentType, EpgProgramme } from '@shared/domain';
import { useAppStore } from '@/store/useAppStore';
import { useLibrary } from '@/features/catalog/hooks/useLibrary';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTranslation } from 'react-i18next';

export function DashboardPage() {
  const { t } = useTranslation();
  const accounts = useAppStore(state => state.accounts);
  const activeAccountId = useAppStore(state => state.activeAccountId);
  const activeTab = useAppStore(state => state.activeTab);
  const search = useAppStore(state => state.search);
  const setAccounts = useAppStore(state => state.setAccounts);
  const setActiveAccountId = useAppStore(state => state.setActiveAccountId);
  const setActiveTab = useAppStore(state => state.setActiveTab);
  const setSearch = useAppStore(state => state.setSearch);
  const setError = useAppStore(state => state.setError);
  const enableSearchAll = useAppStore(state => state.enableSearchAll);
  const hiddenCategories = useAppStore(state => state.hiddenCategories);
  const toggleHiddenCategory = useAppStore(state => state.toggleHiddenCategory);
  const loadHiddenCategories = useAppStore(state => state.loadHiddenCategories);

  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [selectedStream, setSelectedStream] = useState<StreamItem>();
  const [shelfView, setShelfView] = useState<ShelfView>('catalog');
  const [lastPlayMessage, setLastPlayMessage] = useState<ReactNode>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingAccount, setEditingAccount] = useState<Account>();
  const [internalPlayerUrl, setInternalPlayerUrl] = useState<{ url: string; title: string; contentType: ContentType; streamId?: number; accountId?: string }>();
  const [multiViewStreams, setMultiViewStreams] = useState<Array<{ url: string; title: string; id: string }>>([]);
  const [multiViewMinimized, setMultiViewMinimized] = useState(false);
  const [parentalPin, setParentalPin] = useState<string>();
  const [viewMode, setViewMode] = useState<'cards' | 'epg'>('cards');

  const {
    categories,
    favorites,
    watched,
    streams,
    nowPlaying,
    categoryToLoad,
    isLoading: loading,
    error,
    invalidateLibrary
  } = useLibrary({
    accountId: activeAccountId,
    activeTab,
    activeCategoryId,
    enableSearchAll
  });

  useEffect(() => {
    if (categoryToLoad !== activeCategoryId) {
      setActiveCategoryId(categoryToLoad);
    }
  }, [categoryToLoad, activeCategoryId]);

  const loadAccounts = async () => {
    const result = await window.xtremeApi.accounts.list();
    setAccounts(result);
    // Se já tem conta cadastrada, fecha a sidebar automaticamente
    if (result.length > 0) {
      setIsSidebarOpen(false);
    }
  };

  const loadSettings = async () => {
    const data = await window.xtremeApi.settings.get();
    setParentalPin(data?.parentalPin);
  };

  useEffect(() => {
    loadAccounts().catch((err) => setError(String(err)));
    loadSettings().catch(() => {});
  }, []);

  useEffect(() => {
    if (activeAccountId) {
      loadHiddenCategories(activeAccountId, activeTab);
    }
  }, [activeAccountId, activeTab]);

  useKeyboardShortcuts({
    shelfView,
    setShelfView,
    setActiveTab,
    closeModals: () => {
      setShowAccountModal(false);
      setShowSettingsModal(false);
      setShowInspectModal(false);
      setEditingAccount(undefined);
      setInternalPlayerUrl(undefined);
    }
  });

  const filteredStreams = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const base = shelfView === 'catalog'
      ? streams
      : streams.filter((stream) => favorites.some((fav) => fav.contentType === activeTab && fav.streamId === (stream.stream_id ?? stream.series_id ?? 0)));

    if (!normalized) return base;
    return base.filter((item) => item.name.toLowerCase().includes(normalized));
  }, [streams, search, favorites, shelfView, activeTab]);

  const featuredStream = useMemo(() => {
    if (filteredStreams.length > 0 && shelfView === 'catalog' && (activeTab === 'movie' || activeTab === 'series') && !search) {
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

      setInternalPlayerUrl({
        url: result.url,
        title: options?.name || stream.name,
        contentType: options?.contentType || activeTab,
        streamId,
        accountId: activeAccountId
      });
      setIsSidebarOpen(false);
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
          {t('player.browserOpened')}
          <button
            onClick={() => window.xtremeApi.shell.openExternal(result.url)}
            style={{ background: 'none', border: 'none', color: '#4cc9f0', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
          >
            {t('player.clickIfNotOpened')}
          </button>
        </span>
      );
    } else {
      setLastPlayMessage(t('player.playingVia', { method: result.method.toUpperCase() }));
    }

    invalidateLibrary();
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

    const startObj = new Date(epg.start_raw.replace(' ', 'T'));
    const endObj = new Date(epg.end_raw.replace(' ', 'T'));
    let durationMinutes = Math.floor((endObj.getTime() - startObj.getTime()) / 60000);
    if (isNaN(durationMinutes) || durationMinutes <= 0) durationMinutes = 60;

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
          {t('player.recordingBrowserOpened')}
          <button
            onClick={() => window.xtremeApi.shell.openExternal(result.url)}
            style={{ background: 'none', border: 'none', color: '#4cc9f0', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
          >
            {t('player.clickIfNotOpened')}
          </button>
        </span>
      );
    } else {
      setLastPlayMessage(t('player.playingRecordingVia', { method: result.method.toUpperCase() }));
    }
    setShowInspectModal(false);
  };

  const addMultiView = async (stream: StreamItem) => {
    if (!activeAccountId) return;
    if (multiViewStreams.length >= 4) {
      alert(t('player.limitReached'));
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
            <h1>{t('emptyState.title')}</h1>
            <p>{t('emptyState.subtitle')}</p>
            <button className="primary-button" onClick={() => setShowAccountModal(true)}>{t('common.addAccount')}</button>
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
                      {featuredStream.plot || t('common.noDescription')}
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="primary-button" onClick={() => {
                        if (activeTab === 'series') {
                          setSelectedStream(featuredStream);
                          setShowInspectModal(true);
                        } else {
                          playItem(featuredStream);
                        }
                      }}>{t('common.playNow')}</button>
                      <button className="ghost-button" onClick={() => {
                        setSelectedStream(featuredStream);
                        setShowInspectModal(true);
                      }}>{t('common.moreInfo')}</button>
                    </div>
                  </div>
                </div>
              )}

              {shelfView === 'catalog' ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                  <CategoryList 
                    categories={categories} 
                    activeCategoryId={activeCategoryId} 
                    onSelect={setActiveCategoryId} 
                    enableSearchAll={enableSearchAll} 
                    hiddenCategories={hiddenCategories} 
                    onToggleHidden={toggleHiddenCategory} 
                    parentalPin={parentalPin} 
                  />
                  {activeTab === 'live' && (
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px', gap: '4px', marginLeft: 'auto' }}>
                      <button 
                        className="ghost-button"
                        style={{ 
                          background: viewMode === 'cards' ? 'rgba(255,255,255,0.15)' : 'transparent', 
                          padding: '6px 12px', 
                          fontSize: '0.85rem', 
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onClick={() => setViewMode('cards')}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                          <rect x="3" y="3" width="7" height="7"></rect>
                          <rect x="14" y="3" width="7" height="7"></rect>
                          <rect x="14" y="14" width="7" height="7"></rect>
                          <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        {t('epg.cardView')}
                      </button>
                      <button 
                        className="ghost-button"
                        style={{ 
                          background: viewMode === 'epg' ? 'rgba(255,255,255,0.15)' : 'transparent', 
                          padding: '6px 12px', 
                          fontSize: '0.85rem', 
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onClick={() => setViewMode('epg')}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                          <line x1="3" y1="12" x2="21" y2="12"></line>
                          <line x1="3" y1="6" x2="21" y2="6"></line>
                          <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                        {t('epg.gridView')}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
              {error ? <div className="alert error">{error}</div> : null}
              {loading ? (
                <div className="stream-grid" style={{ opacity: 0.5 }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <article className="stream-card skeleton" key={i} style={{ animation: 'pulse 1.5s infinite ease-in-out', background: 'rgba(255,255,255,0.05)', height: '300px', borderRadius: '12px' }}></article>
                  ))}
                </div>
              ) : null}

              {!loading && viewMode === 'epg' && activeTab === 'live' && (
                <EpgGrid 
                  accountId={activeAccountId} 
                  streams={filteredStreams} 
                  onPlayLive={(streamId, title) => {
                    const stream = filteredStreams.find(s => s.stream_id === streamId);
                    if (stream) playItem(stream);
                  }}
                  onPlayArchive={async (streamId, title, startRaw, durationMinutes) => {
                    try {
                      await window.xtremeApi.player.openCatchup({
                        accountId: activeAccountId,
                        streamId,
                        name: title,
                        startRaw,
                        durationMinutes,
                        extension: 'm3u8'
                      });
                      setLastPlayMessage(t('player.playingRecordingVia', { method: t('common.settings') }));
                      setTimeout(() => setLastPlayMessage(undefined), 5000);
                    } catch (e: any) {
                      setLastPlayMessage(<span style={{ color: '#ff8585' }}>Error: {e.message}</span>);
                      setTimeout(() => setLastPlayMessage(undefined), 5000);
                    }
                  }}
                />
              )}

              {!loading && (viewMode === 'cards' || activeTab !== 'live') && (
                <StreamGrid
                  contentType={activeTab}
                  streams={featuredStream ? filteredStreams.filter(s => s !== featuredStream) : filteredStreams}
                  favorites={favorites}
                  watched={watched}
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
                    invalidateLibrary();
                  }}
                  onToggleWatched={async (stream) => {
                    const streamId = stream.stream_id ?? stream.series_id ?? 0;
                    await window.xtremeApi.watched.toggle(activeAccountId, activeTab, streamId);
                    invalidateLibrary();
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

      <SettingsModal 
        open={showSettingsModal} 
        onClose={() => {
          setShowSettingsModal(false);
          loadSettings().catch(() => {});
        }} 
      />
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
