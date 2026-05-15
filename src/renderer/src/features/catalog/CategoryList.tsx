import { useState } from 'react';
import type { Category } from '@shared/domain';

interface CategoryListProps {
  categories: Category[];
  activeCategoryId: string;
  onSelect: (categoryId: string) => void;
  enableSearchAll?: boolean;
  hiddenCategories?: Set<string>;
  onToggleHidden?: (categoryId: string) => void;
}

export function CategoryList({ categories, activeCategoryId, onSelect, enableSearchAll, hiddenCategories, onToggleHidden }: CategoryListProps) {
  const [showManager, setShowManager] = useState(false);

  const visibleCategories = hiddenCategories
    ? categories.filter(c => !hiddenCategories.has(c.category_id))
    : categories;

  return (
    <div className="category-list" style={{ marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
      <select
        className="search-input"
        value={activeCategoryId}
        onChange={(e) => onSelect(e.target.value)}
        style={{ cursor: 'pointer', flex: 1 }}
      >
        {enableSearchAll && <option value="all">TODOS</option>}
        {visibleCategories.map((category) => (
          <option key={category.category_id} value={category.category_id}>
            {category.category_name}
          </option>
        ))}
      </select>

      {onToggleHidden && (
        <div style={{ position: 'relative' }}>
          <button
            className="ghost-button"
            title="Gerenciar categorias"
            onClick={() => setShowManager(!showManager)}
            style={{ fontSize: '1.1rem', padding: '6px 10px' }}
          >
            {showManager ? '✕' : '👁'}
          </button>
          {showManager && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              zIndex: 50,
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px',
              maxHeight: '300px',
              overflowY: 'auto',
              width: '260px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
            }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 8px 0' }}>
                Clique para ocultar/exibir categorias
              </p>
              {categories.map((cat) => {
                const isHidden = hiddenCategories?.has(cat.category_id);
                return (
                  <div
                    key={cat.category_id}
                    onClick={() => onToggleHidden(cat.category_id)}
                    style={{
                      padding: '6px 10px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.85rem',
                      color: isHidden ? '#64748b' : '#e2e8f0',
                      textDecoration: isHidden ? 'line-through' : 'none',
                      background: isHidden ? 'rgba(100,116,139,0.1)' : 'transparent'
                    }}
                  >
                    <span>{isHidden ? '🚫' : '👁'}</span>
                    <span>{cat.category_name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
