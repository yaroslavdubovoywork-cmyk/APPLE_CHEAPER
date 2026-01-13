import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Basic colors palette (like Paint)
const BASIC_COLORS = [
  // Row 1 - Primary colors
  ['#000000', '#7F7F7F', '#880015', '#ED1C24', '#FF7F27', '#FFF200', '#22B14C', '#00A2E8', '#3F48CC', '#A349A4'],
  // Row 2 - Light variants
  ['#FFFFFF', '#C3C3C3', '#B97A57', '#FFAEC9', '#FFC90E', '#EFE4B0', '#B5E61D', '#99D9EA', '#7092BE', '#C8BFE7'],
];

// Extended colors for more options
const EXTENDED_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722',
  '#795548', '#9E9E9E', '#607D8B', '#263238', '#1A237E', '#0D47A1', '#01579B', '#006064',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const advancedInputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleColorSelect = (color: string) => {
    onChange(color);
    setIsOpen(false);
  };

  const handleAdvancedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Color Preview Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col items-center gap-1"
      >
        <div 
          className="w-12 h-12 rounded-full border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-105"
          style={{ backgroundColor: value }}
        />
        <span className="text-xs text-muted-foreground">Выбрать</span>
      </button>

      {/* Color Picker Popup - Opens UPWARD */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 z-50 min-w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Выбор цвета
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Basic Colors Grid (Paint-style) */}
          <div className="mb-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Основные цвета</p>
            <div className="space-y-1">
              {BASIC_COLORS.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1">
                  {row.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorSelect(color)}
                      className={cn(
                        "w-6 h-6 rounded border transition-all hover:scale-110",
                        value.toUpperCase() === color.toUpperCase()
                          ? "ring-2 ring-blue-500 ring-offset-1"
                          : "border-zinc-300 dark:border-zinc-600"
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Extended Colors */}
          <div className="mb-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Дополнительные</p>
            <div className="flex flex-wrap gap-1">
              {EXTENDED_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  className={cn(
                    "w-5 h-5 rounded transition-all hover:scale-110",
                    value.toUpperCase() === color.toUpperCase()
                      ? "ring-2 ring-blue-500 ring-offset-1"
                      : ""
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Current Color Preview */}
          <div className="flex items-center gap-3 p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg mb-3">
            <div 
              className="w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-700"
              style={{ backgroundColor: value }}
            />
            <div className="flex-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Текущий цвет</p>
              <p className="font-mono text-sm">{value.toUpperCase()}</p>
            </div>
          </div>

          {/* Advanced Color Picker Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1"
          >
            {showAdvanced ? 'Скрыть' : 'Детальная настройка'}
            <svg 
              className={cn("w-4 h-4 transition-transform", showAdvanced && "rotate-180")} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Advanced Color Input */}
          {showAdvanced && (
            <div className="mt-3 space-y-3">
              {/* Native Color Picker */}
              <div className="flex items-center gap-3">
                <input
                  ref={advancedInputRef}
                  type="color"
                  value={value}
                  onChange={handleAdvancedChange}
                  className="w-12 h-10 rounded cursor-pointer border-0 p-0"
                />
                <div className="flex-1">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Градиент выбора</p>
                  <p className="text-xs text-zinc-400">Кликните для полной палитры</p>
                </div>
              </div>

              {/* Manual HEX Input */}
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">HEX код</p>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      onChange(val);
                    }
                  }}
                  placeholder="#000000"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono"
                />
              </div>

              {/* RGB Sliders */}
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">RGB</p>
                {['R', 'G', 'B'].map((channel, i) => {
                  const hex = value.replace('#', '');
                  const rgb = [
                    parseInt(hex.slice(0, 2) || '0', 16),
                    parseInt(hex.slice(2, 4) || '0', 16),
                    parseInt(hex.slice(4, 6) || '0', 16)
                  ];
                  
                  return (
                    <div key={channel} className="flex items-center gap-2">
                      <span className="text-xs w-4 text-zinc-500">{channel}</span>
                      <input
                        type="range"
                        min="0"
                        max="255"
                        value={rgb[i]}
                        onChange={(e) => {
                          const newRgb = [...rgb];
                          newRgb[i] = parseInt(e.target.value);
                          const newHex = '#' + newRgb.map(v => v.toString(16).padStart(2, '0')).join('');
                          onChange(newHex);
                        }}
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, 
                            ${i === 0 ? `rgb(0,${rgb[1]},${rgb[2]}), rgb(255,${rgb[1]},${rgb[2]})` : ''}
                            ${i === 1 ? `rgb(${rgb[0]},0,${rgb[2]}), rgb(${rgb[0]},255,${rgb[2]})` : ''}
                            ${i === 2 ? `rgb(${rgb[0]},${rgb[1]},0), rgb(${rgb[0]},${rgb[1]},255)` : ''}
                          )`
                        }}
                      />
                      <span className="text-xs w-8 text-right font-mono text-zinc-500">{rgb[i]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
