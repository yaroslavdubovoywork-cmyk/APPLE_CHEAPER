import { memo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const SearchInput = memo(function SearchInput({ 
  value, 
  onChange, 
  className,
  placeholder 
}: SearchInputProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);
  
  return (
    <div className={cn("relative search-premium flex items-center", className)}>
      {/* Search Icon */}
      <div className="absolute left-4 text-[var(--tg-theme-hint-color)]">
        <svg 
          className="w-5 h-5" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" 
          />
        </svg>
      </div>
      
      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('search.placeholder')}
        className="w-full py-3.5 pl-12 pr-10 bg-transparent text-[var(--tg-theme-text-color)] placeholder:text-[var(--tg-theme-hint-color)] focus:outline-none text-[15px]"
      />
      
      {/* Clear Button */}
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 w-6 h-6 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--tg-theme-hint-color)] hover:text-[var(--tg-theme-text-color)] transition-colors"
          aria-label="Clear search"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
});
