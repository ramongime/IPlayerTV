import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';
import type { Category } from '@iplayertv/core';

interface CategoryListProps {
  categories: Category[];
  activeCategoryId: string;
  onSelect: (categoryId: string) => void;
  enableSearchAll?: boolean;
  hiddenCategories?: Set<string>;
  onToggleHidden?: (categoryId: string) => void;
  parentalPin?: string;
}

export function CategoryList({ categories, activeCategoryId, onSelect, enableSearchAll, hiddenCategories }: CategoryListProps) {
  const { t } = useTranslation();

  const visibleCategories = hiddenCategories
    ? categories.filter(c => !hiddenCategories.has(c.category_id))
    : categories;

  const listItems = enableSearchAll
    ? [{ category_id: 'all', category_name: t('common.all').toUpperCase() } as Category, ...visibleCategories]
    : visibleCategories;

  return (
    <div className="category-list" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <Virtuoso
        style={{ height: '100%', width: '100%' }}
        data={listItems}
        itemContent={(_, category) => (
          <div style={{ paddingBottom: '4px', paddingRight: '8px' }}>
            <button
              onClick={() => onSelect(category.category_id)}
              className={`ghost-button ${activeCategoryId === category.category_id ? 'active' : ''}`}
              style={{ 
                textAlign: 'left', padding: '8px 12px', 
                background: activeCategoryId === category.category_id ? 'rgba(76, 201, 240, 0.2)' : 'transparent', 
                color: activeCategoryId === category.category_id ? '#4cc9f0' : 'inherit',
                width: '100%',
                display: 'block'
              }}
            >
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px', lineHeight: '1.4' }}>
                {category.category_name}
              </div>
            </button>
          </div>
        )}
      />
    </div>
  );
}
