import React, { useEffect, useState } from 'react';
import { Leaf } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  fallbackTitle,
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-[#E6EFEA] dark:bg-[#192823] text-[#1B4332] dark:text-[#9BB0A7] p-6 ${className}`}
      >
        <Leaf className="w-6 h-6 mb-2 opacity-70" aria-hidden="true" />
        <span className="text-xs font-medium text-center">{fallbackTitle}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
