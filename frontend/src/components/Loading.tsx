import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

export const Loading = memo(function Loading({ 
  size = 'md', 
  className,
  fullScreen = false 
}: LoadingProps) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  const spinner = (
    <motion.div
      className={cn(
        "rounded-full border-2 border-[var(--tg-theme-hint-color)]/20",
        "border-t-[var(--tg-theme-button-color)]",
        sizeClasses[size],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
  
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--tg-theme-bg-color)]">
        {spinner}
      </div>
    );
  }
  
  return spinner;
});

// Skeleton loader for product cards
export const ProductCardSkeleton = memo(function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] mb-3" />
      <div className="space-y-2">
        <div className="h-4 bg-[var(--tg-theme-secondary-bg-color)] rounded w-3/4" />
        <div className="h-4 bg-[var(--tg-theme-secondary-bg-color)] rounded w-1/2" />
        <div className="flex justify-between items-center">
          <div className="h-5 bg-[var(--tg-theme-secondary-bg-color)] rounded w-20" />
          <div className="w-9 h-9 rounded-full bg-[var(--tg-theme-secondary-bg-color)]" />
        </div>
      </div>
    </div>
  );
});

// Skeleton loader for cart items
export const CartItemSkeleton = memo(function CartItemSkeleton() {
  return (
    <div className="flex gap-4 py-4 animate-pulse">
      <div className="w-20 h-20 rounded-xl bg-[var(--tg-theme-secondary-bg-color)]" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-[var(--tg-theme-secondary-bg-color)] rounded w-3/4" />
        <div className="h-3 bg-[var(--tg-theme-secondary-bg-color)] rounded w-1/4" />
        <div className="flex justify-between items-center mt-2">
          <div className="flex gap-1">
            <div className="w-8 h-8 rounded-full bg-[var(--tg-theme-secondary-bg-color)]" />
            <div className="w-10 h-8 bg-[var(--tg-theme-secondary-bg-color)] rounded" />
            <div className="w-8 h-8 rounded-full bg-[var(--tg-theme-secondary-bg-color)]" />
          </div>
          <div className="h-5 bg-[var(--tg-theme-secondary-bg-color)] rounded w-16" />
        </div>
      </div>
    </div>
  );
});
