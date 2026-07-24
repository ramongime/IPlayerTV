import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { StreamItem, ContentType } from '@iplayertv/core';
import { useAppStore, type SearchDomainFilter } from '@/store/useAppStore';
import { searchQueries } from '@/queries/search.queries';

interface GlobalSearchModalProps {
  onPlayStream: (stream: StreamItem, type: ContentType) => void;
  onInspectStream?: (stream: StreamItem, type: ContentType) => void;
}

export function GlobalSearchModal({ onPlayStream, onInspectStream }: GlobalSearchModalProps) {
  const { t } = useTranslation();

  const isOpen = useAppStore(state => state.isSearchModalOpen);
  const setIsOpen = useAppStore(state => state.setSearchModalOpen);
  const activeAccountId = useAppStore(state => state.activeAccountId);
  const domainFilter = useAppStore(state => state.searchDomainFilter);
  const setDomainFilter = useAppStore(state => state.setSearchDomainFilter);
  const recentSearches = useAppStore(state => state.recentSearches);
  const addRecentSearch = useAppStore(state => state.addRecentSearch);
  const clearRecentSearches = useAppStore(state => state.clearRecentSearches);

  const [inputQuery, setInputQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query input (200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputQuery);
      if (inputQuery.trim().length >= 2) {
        addRecentSearch(inputQuery);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [inputQuery, addRecentSearch]);

  // Execute global search via queryOptions
  const searchResultQuery = useQuery(searchQueries.global(activeAccountId, debouncedQuery));
  const results = searchResultQuery.data || { live: [], movie: [], series: [], total: 0 };
  const isLoading = searchResultQuery.isLoading && debouncedQuery.length >= 2;

  // Reset input state on open/close
  useEffect(() => {
    if (!isOpen) {
      setInputQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  // Filtered result subsets
  const filteredResults = useMemo(() => {
    if (domainFilter === 'live') return { live: results.live, movie: [], series: [], total: results.live.length };
    if (domainFilter === 'movie') return { live: [], movie: results.movie, series: [], total: results.movie.length };
    if (domainFilter === 'series') return { live: [], movie: [], series: results.series, total: results.series.length };
    return results;
  }, [results, domainFilter]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="modal-overlay"
        onClick={() => setIsOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '80px',
        }}
      >
        <motion.div
          className="search-modal-content"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: 'spring' as const, damping: 25, stiffness: 320 }}
          style={{
            width: '90%',
            maxWidth: '850px',
            maxHeight: '80vh',
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header & Input Field */}
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '12px 16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <span style={{ fontSize: '18px', color: '#94a3b8' }}>🔍</span>
              <input
                autoFocus
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={t('search.placeholder', 'Pesquisar canais ao vivo, filmes, séries (Cmd+K)...')}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 500,
                }}
              />
              {inputQuery && (
                <button
                  onClick={() => setInputQuery('')}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
                >
                  ✕
                </button>
              )}
              <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#94a3b8' }}>ESC</kbd>
            </div>

            {/* Domain Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {(['all', 'live', 'movie', 'series'] as SearchDomainFilter[]).map((filter) => {
                const isActive = domainFilter === filter;
                const labelMap: Record<SearchDomainFilter, string> = {
                  all: `Todos (${results.total})`,
                  live: `Ao Vivo (${results.live.length})`,
                  movie: `Filmes (${results.movie.length})`,
                  series: `Séries (${results.series.length})`,
                };

                return (
                  <button
                    key={filter}
                    onClick={() => setDomainFilter(filter)}
                    style={{
                      position: 'relative',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: 'none',
                      background: 'transparent',
                      color: isActive ? '#fff' : '#94a3b8',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      zIndex: 1,
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="searchDomainPill"
                        transition={{ type: 'spring' as const, stiffness: 500, damping: 35 }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: '#4cc9f0',
                          borderRadius: '20px',
                          zIndex: -1,
                          opacity: 0.25,
                        }}
                      />
                    )}
                    {labelMap[filter]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#94a3b8' }}>
                <span>Buscando resultados...</span>
              </div>
            )}

            {!inputQuery.trim() && recentSearches.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Busca Recente
                  </span>
                  <button onClick={clearRecentSearches} style={{ background: 'transparent', border: 'none', color: '#4cc9f0', fontSize: '12px', cursor: 'pointer' }}>
                    Limpar
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {recentSearches.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputQuery(item)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#e2e8f0',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {inputQuery.trim().length >= 2 && !isLoading && filteredResults.total === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                <p style={{ fontSize: '16px', fontWeight: 600 }}>Nenhum resultado encontrado para "{inputQuery}"</p>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>Tente buscar com palavras-chave diferentes.</p>
              </div>
            )}

            {/* Results Grid by Domain */}
            {filteredResults.live.length > 0 && (
              <SearchResultSection
                title="Canais Ao Vivo"
                items={filteredResults.live}
                contentType="live"
                onPlay={(s) => { addRecentSearch(inputQuery); onPlayStream(s, 'live'); setIsOpen(false); }}
                onInspect={(s) => { onInspectStream?.(s, 'live'); setIsOpen(false); }}
              />
            )}

            {filteredResults.movie.length > 0 && (
              <SearchResultSection
                title="Filmes"
                items={filteredResults.movie}
                contentType="movie"
                onPlay={(s) => { addRecentSearch(inputQuery); onPlayStream(s, 'movie'); setIsOpen(false); }}
                onInspect={(s) => { onInspectStream?.(s, 'movie'); setIsOpen(false); }}
              />
            )}

            {filteredResults.series.length > 0 && (
              <SearchResultSection
                title="Séries"
                items={filteredResults.series}
                contentType="series"
                onPlay={(s) => { addRecentSearch(inputQuery); onPlayStream(s, 'series'); setIsOpen(false); }}
                onInspect={(s) => { onInspectStream?.(s, 'series'); setIsOpen(false); }}
              />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function SearchResultSection({
  title,
  items,
  contentType,
  onPlay,
  onInspect,
}: {
  title: string;
  items: StreamItem[];
  contentType: ContentType;
  onPlay: (item: StreamItem) => void;
  onInspect: (item: StreamItem) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title} ({items.length})
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            onClick={() => onPlay(item)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(76, 201, 240, 0.15)';
              e.currentTarget.style.borderColor = '#4cc9f0';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            {item.stream_icon || item.cover ? (
              <img
                src={item.stream_icon || item.cover}
                alt={item.name}
                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <div style={{ width: '40px', height: '40px', background: '#334155', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                {item.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.name}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                {contentType === 'live' ? 'Canal TV' : contentType === 'movie' ? 'Filme VOD' : 'Série'}
              </div>
            </div>
            {onInspect && contentType !== 'live' && (
              <button
                onClick={(e) => { e.stopPropagation(); onInspect(item); }}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', padding: '4px' }}
              >
                ℹ️
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
