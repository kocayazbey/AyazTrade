'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface ImageOptimizerProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  className?: string;
  fallback?: string;
  lazy?: boolean;
  priority?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export const ImageOptimizer: React.FC<ImageOptimizerProps> = ({
  src,
  alt,
  width,
  height,
  quality = 80,
  format = 'webp',
  placeholder = 'empty',
  blurDataURL,
  className = '',
  fallback,
  lazy = true,
  priority = false,
  onLoad,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(!lazy || priority);
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate optimized image URL
  const getOptimizedUrl = useCallback((originalSrc: string) => {
    if (originalSrc.startsWith('data:') || originalSrc.startsWith('blob:')) {
      return originalSrc;
    }

    // If using a CDN or image optimization service
    const params = new URLSearchParams({
      url: originalSrc,
      w: width?.toString() || '',
      h: height?.toString() || '',
      q: quality.toString(),
      f: format,
    });

    return `/api/image-optimize?${params.toString()}`;
  }, [width, height, quality, format]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
      observerRef.current = observer;
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazy, priority, inView]);

  // Handle image load
  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
    
    if (fallback && currentSrc !== fallback) {
      setCurrentSrc(fallback);
      setLoading(true);
      setError(false);
    } else {
      const error = new Error(`Failed to load image: ${src}`);
      onError?.(error);
    }
  }, [src, fallback, currentSrc, onError]);

  // Retry loading
  const retry = useCallback(() => {
    setError(false);
    setLoading(true);
    setCurrentSrc(src);
  }, [src]);

  // Generate blur placeholder
  const getBlurPlaceholder = useCallback(() => {
    if (blurDataURL) return blurDataURL;
    
    // Generate a simple blur placeholder
    const canvas = document.createElement('canvas');
    canvas.width = width || 100;
    canvas.height = height || 100;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    return canvas.toDataURL();
  }, [blurDataURL, width, height]);

  const optimizedSrc = inView ? getOptimizedUrl(currentSrc) : '';

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Loading placeholder */}
      {loading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-ios-gray-100"
          style={{ width, height }}
        >
          <Loader2 className="w-6 h-6 animate-spin text-ios-blue" />
        </div>
      )}

      {/* Blur placeholder */}
      {placeholder === 'blur' && loading && inView && (
        <img
          src={getBlurPlaceholder()}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm"
          style={{ width, height }}
        />
      )}

      {/* Main image */}
      {inView && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          className={`transition-opacity duration-300 ${
            loading ? 'opacity-0' : 'opacity-100'
          } ${error ? 'hidden' : 'block'}`}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy && !priority ? 'lazy' : 'eager'}
          decoding="async"
        />
      )}

      {/* Error state */}
      {error && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-ios-gray-100 text-ios-gray-500"
          style={{ width, height }}
        >
          <AlertCircle className="w-8 h-8 mb-2" />
          <span className="text-sm">Failed to load</span>
          <button
            onClick={retry}
            className="mt-2 text-xs text-ios-blue hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Fallback for no image */}
      {!src && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-ios-gray-100 text-ios-gray-400"
          style={{ width, height }}
        >
          <ImageIcon className="w-8 h-8" />
        </div>
      )}
    </div>
  );
};

// Hook for image preloading
export const useImagePreload = (srcs: string[]) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const preloadImage = useCallback((src: string) => {
    if (loadedImages.has(src) || loadingImages.has(src)) return;

    setLoadingImages(prev => new Set(prev).add(src));

    const img = new Image();
    img.onload = () => {
      setLoadedImages(prev => new Set(prev).add(src));
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(src);
        return newSet;
      });
    };
    img.onerror = () => {
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(src);
        return newSet;
      });
    };
    img.src = src;
  }, [loadedImages, loadingImages]);

  const preloadAll = useCallback(() => {
    srcs.forEach(preloadImage);
  }, [srcs, preloadImage]);

  return {
    preloadImage,
    preloadAll,
    loadedImages: Array.from(loadedImages),
    loadingImages: Array.from(loadingImages),
    isLoaded: (src: string) => loadedImages.has(src),
    isLoading: (src: string) => loadingImages.has(src),
  };
};

export default ImageOptimizer;
