import { useEffect, useMemo, useState } from 'react';
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
import { HeroBanner } from '@/features/catalog/HeroBanner';
import type { Account, ShelfView, StreamItem } from '@iplayertv/core';
import { useAppStore } from '@/store/useAppStore';
import { useLibrary } from '@/features/catalog/hooks/useLibrary';
import { usePlayer } from '@/features/player/hooks/usePlayer';
import { useMultiView } from '@/features/player/hooks/useMultiView';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTranslation } from 'react-i18next';

export function DashboardPage() {
  const { t } = useTranslation();
  
  // Zustand Store
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

  // Local UI State
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [selectedStream, setSelectedStream] = useState<StreamItem>();
  const [shelfView, setShelfView] = useState<ShelfView>('catalog');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingAccount, setEditingAccount] = useState<Account>();
  const [parentalPin, setParentalPin] = useState<string>();
  const [viewMode, setViewMode] = useState<'cards' | 'epg'>('cards');

  // Hooks
  const {
    categories, favorites, watched, streams, nowPlaying,
    categoryToLoad, isLoading: loading, error, invalidateLibrary
  } = useLibrary({
    accountId: activeAccountId,
    activeTab,
    activeCategoryId,
    enableSearchAll,
    search,
    shelfView
  });

  const {
    playItem, playEpisode, playCatchup,
    lastPlayMessage, setLastPlayMessage,
    internalPlayerUrl, setInternalPlayerUrl
  } = usePlayer({
    accounts,
    activeAccountId,
    activeTab,
    invalidateLibrary,
    onShowInspectModal: setShowInspectModal,
    onSetSidebarOpen: setIsSidebarOpen
  });

  const {
    multiViewStreams, multiViewMinimized, setMultiViewMinimized,
    addMultiView, removeStream, closeMultiView
  } = useMultiView(activeAccountId);

  useEffect(() => {
    if (categoryToLoad !== activeCategoryId) {
      setActiveCategoryId(categoryToLoad);
    }
  }, [categoryToLoad, activeCategoryId]);

  const loadAccounts = async () => {
    const result = await window.xtremeApi.accounts.list();
    setAccounts(result);
    if (result.length > 0) setIsSidebarOpen(false);
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
    shelfView, setShelfView, setActiveTab,
    closeModals: () => {
      setShowAccountModal(false);
      setShowSettingsModal(false);
      setShowInspectModal(false);
      setEditingAccount(undefined);
      setInternalPlayerUrl(undefined);
    }
  });

  const featuredStream = useMemo(() => {
    if (streams.length > 0 && shelfView === 'catalog' && (activeTab === 'movie' || activeTab === 'series') && !search) {
      return streams.find(s => s.cover || s.stream_icon) || streams[0];
    }
    return null;
  }, [streams, shelfView, activeTab, search]);

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
                <HeroBanner 
                  stream={featuredStream}
                  activeTab={activeTab}
                  onPlay={playItem}
                  onMoreInfo={(s) => { setSelectedStream(s); setShowInspectModal(true); }}
                />
              )}

              {shelfView === 'catalog' && (
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
                    <div className="view-toggle-group">
                      <button 
                        className={`ghost-button view-toggle-button ${viewMode === 'cards' ? 'view-toggle-button--active' : ''}`}
                        onClick={() => setViewMode('cards')}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7"></rect>
                          <rect x="14" y="3" width="7" height="7"></rect>
                          <rect x="14" y="14" width="7" height="7"></rect>
                          <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        {t('epg.cardView')}
                      </button>
                      <button 
                        className={`ghost-button view-toggle-button ${viewMode === 'epg' ? 'view-toggle-button--active' : ''}`}
                        onClick={() => setViewMode('epg')}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="3" y1="12" x2="21" y2="12"></line>
                          <line x1="3" y1="6" x2="21" y2="6"></line>
                          <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                        {t('epg.gridView')}
                      </button>
                    </div>
                  )}
                </div>
              )}
              
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
                  streams={streams} 
                  onPlayLive={(streamId) => {
                    const stream = streams.find(s => s.stream_id === streamId);
                    if (stream) playItem(stream);
                  }}
                  onPlayArchive={async (streamId, title, startRaw, durationMinutes) => {
                    try {
                      await window.xtremeApi.player.openCatchup({ accountId: activeAccountId, streamId, name: title, startRaw, durationMinutes, extension: 'm3u8' });
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
                  streams={featuredStream ? streams.filter(s => s !== featuredStream) : streams}
                  favorites={favorites}
                  watched={watched}
                  nowPlaying={activeTab === 'live' ? nowPlaying : undefined}
                  onToggleFavorite={async (stream) => {
                    await window.xtremeApi.favorites.toggle({
                      accountId: activeAccountId, contentType: activeTab,
                      streamId: stream.stream_id ?? stream.series_id ?? 0,
                      name: stream.name, icon: stream.stream_icon || stream.cover
                    });
                    invalidateLibrary();
                  }}
                  onToggleWatched={async (stream) => {
                    await window.xtremeApi.watched.toggle(activeAccountId, activeTab, stream.stream_id ?? stream.series_id ?? 0);
                    invalidateLibrary();
                  }}
                  onInspect={(stream) => { setSelectedStream(stream); setShowInspectModal(true); }}
                  onAddMultiView={activeTab === 'live' ? addMultiView : undefined}
                  onPlay={async (stream) => {
                    if (activeTab === 'series') { setSelectedStream(stream); setShowInspectModal(true); return; }
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
        onSave={async (payload) => { await window.xtremeApi.accounts.create(payload); await loadAccounts(); setLastPlayMessage(undefined); }}
        onUpdate={async (id, payload) => { await window.xtremeApi.accounts.update(id, payload); await loadAccounts(); setLastPlayMessage(undefined); }}
      />
      <SettingsModal open={showSettingsModal} onClose={() => { setShowSettingsModal(false); loadSettings().catch(() => {}); }} />
      <InspectModal
        open={showInspectModal}
        accountId={activeAccountId}
        contentType={activeTab}
        stream={selectedStream}
        onClose={() => setShowInspectModal(false)}
        onPlayEpisode={(ep) => playEpisode(selectedStream, ep)}
        onPlayCatchup={(epg) => playCatchup(selectedStream, epg)}
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
          onClose={closeMultiView}
          onRemoveStream={removeStream}
        />
      )}
    </div>
  );
}
