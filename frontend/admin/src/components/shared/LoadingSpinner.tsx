'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  text?: string;
}

export default function LoadingSpinner({ size = 'md', fullPage = false, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-2',
    lg: 'h-16 w-16 border-3'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-ios-blue border-t-transparent`} />
      {text && <p className="text-ios-gray-600 text-sm">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export function LoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-ios-gray-200 rounded-ios ${className}`} />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <LoadingSkeleton className="h-12 w-12" />
          <LoadingSkeleton className="h-12 flex-1" />
          <LoadingSkeleton className="h-12 w-24" />
          <LoadingSkeleton className="h-12 w-32" />
        </div>
      ))}
    </div>
  );
}


