'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Loader2 } from 'lucide-react';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (props: { index: number; style: React.CSSProperties; item: T }) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  loading = false,
  emptyMessage = 'No items found',
  onLoadMore,
  hasNextPage = false,
  className = '',
}: VirtualizedListProps<T>) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const listRef = useRef<List>(null);

  const handleScroll = useCallback(
    ({ scrollTop, scrollHeight, clientHeight }: { scrollTop: number; scrollHeight: number; clientHeight: number }) => {
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      
      if (isNearBottom && hasNextPage && !isLoadingMore && onLoadMore) {
        setIsLoadingMore(true);
        onLoadMore();
      }
    },
    [hasNextPage, isLoadingMore, onLoadMore]
  );

  useEffect(() => {
    if (isLoadingMore && !loading) {
      setIsLoadingMore(false);
    }
  }, [loading, isLoadingMore]);

  const itemData = useMemo(() => ({
    items,
    renderItem,
  }), [items, renderItem]);

  const Item = useCallback(({ index, style, data }: { index: number; style: React.CSSProperties; data: { items: T[]; renderItem: (props: { index: number; style: React.CSSProperties; item: T }) => React.ReactNode } }) => {
    const item = data.items[index];
    return data.renderItem({ index, style, item });
  }, []);

  if (items.length === 0 && !loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="text-ios-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
            </svg>
          </div>
          <p className="text-ios-gray-600">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <List
        ref={listRef}
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        itemData={itemData}
        onScroll={handleScroll}
        className="scrollbar-thin scrollbar-thumb-ios-gray-300 scrollbar-track-ios-gray-100"
      >
        {Item}
      </List>
      
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-ios-blue mr-2" />
          <span className="text-ios-gray-600">Loading...</span>
        </div>
      )}
      
      {isLoadingMore && (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-ios-blue mr-2" />
          <span className="text-sm text-ios-gray-600">Loading more...</span>
        </div>
      )}
    </div>
  );
}

// Hook for infinite scrolling with virtualization
export const useInfiniteScroll = <T>(
  fetchMore: () => Promise<T[]>,
  initialItems: T[] = []
) => {
  const [items, setItems] = useState<T[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasNextPage) return;

    setLoading(true);
    setError(null);

    try {
      const newItems = await fetchMore();
      setItems(prev => [...prev, ...newItems]);
      setHasNextPage(newItems.length > 0);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [fetchMore, loading, hasNextPage]);

  const reset = useCallback(() => {
    setItems(initialItems);
    setHasNextPage(true);
    setError(null);
  }, [initialItems]);

  return {
    items,
    loading,
    hasNextPage,
    error,
    loadMore,
    reset,
  };
};

// Optimized list item component
export const OptimizedListItem = React.memo<{
  index: number;
  style: React.CSSProperties;
  item: any;
  renderItem: (props: { index: number; style: React.CSSProperties; item: any }) => React.ReactNode;
}>(({ index, style, item, renderItem }) => {
  return renderItem({ index, style, item });
});

OptimizedListItem.displayName = 'OptimizedListItem';

export default VirtualizedList;
