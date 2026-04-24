import { useEffect, useMemo, useState } from 'react';
import { AccountModal } from '@/components/AccountModal';
import { CategoryList } from '@/components/CategoryList';
import { InspectModal } from '@/components/InspectModal';
import { SettingsModal } from '@/components/SettingsModal';
import { Sidebar } from '@/components/Sidebar';
import { StreamGrid } from '@/components/StreamGrid';
import { TopBar } from '@/components/TopBar';
import type { Category, Episode, Favorite, HistoryItem, ShelfView, StreamItem } from '@/lib/types';
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
    setError
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
  const [lastPlayMessage, setLastPlayMessage] = useState<string>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
      if (categoryToLoad === 'all' && nextCategories.length > 0) {
        categoryToLoad = nextCategories[0].category_id;
        setActiveCategoryId(categoryToLoad);
      }

      if (categoryToLoad !== 'all') {
        const nextStreams = await window.xtremeApi.xtream.streams(activeAccountId, activeTab, categoryToLoad);
        setStreams(nextStreams);
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
  }, [activeAccountId, activeTab, activeCategoryId]);

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
    const streamId = override?.streamId ?? stream.stream_id ?? stream.series_id ?? 0;
    const contentType = override?.contentType ?? activeTab;
    const result = await window.xtremeApi.player.open({
      accountId: activeAccountId,
      contentType,
      streamId,
      name: override?.name ?? stream.name,
      extension: override?.extension ?? stream.container_extension
    });
    setLastPlayMessage(`Reproduzindo via ${result.method.toUpperCase()}: ${result.url}`);
    const nextHistory = await window.xtremeApi.history.list(activeAccountId);
    setHistory(nextHistory);
  };

  const playEpisode = async (episode: Episode) => {
    if (!selectedStream) return;
    await playItem(selectedStream, {
      contentType: 'series',
      streamId: episode.id,
      extension: episode.container_extension,
      name: `${selectedStream.name} - ${episode.title}`
    });
  };

  return (
    <div className={`app-shell ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
      {isSidebarOpen && (
        <Sidebar
          accounts={accounts}
          activeAccountId={activeAccountId}
          onAccountChange={setActiveAccountId}
          onCreateAccount={() => setShowAccountModal(true)}
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
            {shelfView === 'catalog' ? <CategoryList categories={categories} activeCategoryId={activeCategoryId} onSelect={setActiveCategoryId} /> : null}
            {error ? <div className="alert error">{error}</div> : null}
            {loading ? <div className="alert">Carregando dados do servidor...</div> : null}
            <StreamGrid
              contentType={activeTab}
              streams={filteredStreams}
              favorites={favorites}
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
        onClose={() => setShowAccountModal(false)}
        onSave={async (payload) => {
          await window.xtremeApi.accounts.create(payload);
          await loadAccounts();
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
      />
    </div>
  );
}
