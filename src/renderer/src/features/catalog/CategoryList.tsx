import type { Category } from '@shared/domain';

interface CategoryListProps {
  categories: Category[];
  activeCategoryId: string;
  onSelect: (categoryId: string) => void;
  enableSearchAll?: boolean;
}

export function CategoryList({ categories, activeCategoryId, onSelect, enableSearchAll }: CategoryListProps) {
  return (
    <div className="category-list" style={{ marginBottom: '10px' }}>
      <select
        className="search-input"
        value={activeCategoryId}
        onChange={(e) => onSelect(e.target.value)}
        style={{ cursor: 'pointer' }}
      >
        {enableSearchAll && <option value="all">TODOS</option>}
        {categories.map((category) => (
          <option key={category.category_id} value={category.category_id}>
            {category.category_name}
          </option>
        ))}
      </select>
    </div>
  );
}
