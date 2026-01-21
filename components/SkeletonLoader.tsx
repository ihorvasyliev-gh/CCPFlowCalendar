import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`animate-pulse bg-gray-200 rounded ${className}`}
          aria-label="Loading..."
        />
      ))}
    </>
  );
};

export const EventCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <SkeletonLoader className="h-4 w-3/4 mb-2" />
      <SkeletonLoader className="h-3 w-1/2 mb-2" />
      <SkeletonLoader className="h-3 w-2/3" />
    </div>
  );
};

export const CalendarDaySkeleton: React.FC = () => {
  return (
    <div className="min-h-[6rem] sm:min-h-[8rem] border rounded-lg p-2 bg-gray-50">
      <SkeletonLoader className="h-4 w-8 mb-2 ml-auto" />
      <SkeletonLoader className="h-6 w-full mb-1" />
      <SkeletonLoader className="h-6 w-full" />
    </div>
  );
};

export default SkeletonLoader;
