import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Category } from '../types';
import { getLocalizedText, cn } from '../lib/utils';

interface CategoryNavProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
}

export const CategoryNav = memo(function CategoryNav({ 
  categories, 
  selectedId, 
  onSelect 
}: CategoryNavProps) {
  const { i18n, t } = useTranslation();
  
  // Only show root categories
  const rootCategories = categories.filter(c => !c.parent_id);
  
  return (
    <div className="overflow-x-auto no-scrollbar -mx-5 px-5">
      <div className="flex gap-2 pb-1">
        {/* All Products Button */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
            selectedId === null
              ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
              : "bg-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          )}
        >
          {t('catalog.all')}
        </button>
        
        {/* Category Buttons */}
        {rootCategories.map((category) => {
          const name = getLocalizedText(category.name, category.name_en, i18n.language);
          const isSelected = selectedId === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => onSelect(category.id)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                isSelected
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                  : "bg-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
});
