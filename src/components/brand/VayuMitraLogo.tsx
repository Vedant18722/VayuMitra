import React, { useId } from 'react';

export interface VayuMitraLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  showSanskrit?: boolean;
  animated?: boolean;
  introAnimate?: boolean;
  loading?: boolean;
  className?: string;
}

const ICON_SIZES: Record<NonNullable<VayuMitraLogoProps['size']>, string> = {
  xs: 'w-7 h-7',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const WORDMARK_SIZES: Record<NonNullable<VayuMitraLogoProps['size']>, string> = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
};

export const VayuMitraLogo: React.FC<VayuMitraLogoProps> = ({
  size = 'sm',
  showWordmark = true,
  showSanskrit = false,
  animated = true,
  introAnimate = false,
  loading = false,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const bgGradId = `vm-bg-${uid}`;
  const leafGradId = `vm-leaf-${uid}`;
  const windGradId = `vm-wind-${uid}`;
  const ringGradId = `vm-ring-${uid}`;

  const wrapperAnimClass = [
    'vayumitra-logo-root inline-flex items-center gap-2.5 select-none group',
    introAnimate ? 'vayumitra-logo-intro' : '',
    loading ? 'vayumitra-logo-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={wrapperAnimClass}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${ICON_SIZES[size]} shrink-0 vayumitra-logo-mark`}
        role="img"
        aria-label={showWordmark ? undefined : 'VayuMitra (वायुमित्र) logo'}
        aria-hidden={showWordmark ? 'true' : undefined}
      >
        <defs>
          <linearGradient id={bgGradId} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#132A1F" />
            <stop offset="55%" stopColor="#1B4332" />
            <stop offset="100%" stopColor="#2D6A4F" />
          </linearGradient>
          <linearGradient id={leafGradId} x1="20" y1="46" x2="47" y2="15" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#52B788" />
            <stop offset="55%" stopColor="#95D5B2" />
            <stop offset="100%" stopColor="#D8F3DC" />
          </linearGradient>
          <linearGradient id={windGradId} x1="10" y1="32" x2="54" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#2DD4BF" />
            <stop offset="100%" stopColor="#B7E4C7" />
          </linearGradient>
          <linearGradient id={ringGradId} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#95D5B2" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Architectural Emblem Frame */}
        <rect x="2" y="2" width="60" height="60" rx="15" fill={`url(#${bgGradId})`} />
        <rect
          x="2.75"
          y="2.75"
          width="58.5"
          height="58.5"
          rx="14.25"
          stroke={`url(#${ringGradId})`}
          strokeWidth="1.25"
        />

        {/* Subtle Clean-Air Atmospheric Monitoring Arc */}
        <path
          d="M15 24A19 19 0 0 1 43 13.8"
          stroke="#52B788"
          strokeOpacity="0.4"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* Sculpted Organic Leaf with Central Vein */}
        <g className={animated || loading ? 'vayumitra-logo-leaf' : undefined}>
          <path
            d="M21 44.5C21 29.5 31.2 18.2 46.5 16.5C45.6 31.8 36.2 43.2 21 44.5Z"
            fill={`url(#${leafGradId})`}
          />
          <path
            d="M19.5 46.5C25.5 39.8 33.4 31.2 42.4 21.8"
            stroke="#132A1F"
            strokeOpacity="0.65"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M28.5 36.2L34.5 34.4M33.2 31.1L38.2 29.4"
            stroke="#132A1F"
            strokeOpacity="0.4"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
        </g>

        {/* Flowing Clean-Air Wind Curves */}
        <path
          d="M11 33.5C17.2 28.4 25.4 29 31.4 33.2C37.2 37.2 45.2 36.4 51.5 30.8"
          stroke={`url(#${windGradId})`}
          strokeWidth="2.4"
          strokeLinecap="round"
          className={animated || loading ? 'vayumitra-logo-wind-primary' : undefined}
        />
        <path
          d="M14.5 41.8C22 39.2 29.5 41.8 36.4 44.6C42.2 46.9 47.8 45.4 52.5 41.5"
          stroke="#D8F3DC"
          strokeOpacity="0.88"
          strokeWidth="1.9"
          strokeLinecap="round"
          className={animated || loading ? 'vayumitra-logo-wind-secondary' : undefined}
        />

        {/* Environmental Intelligence Signal Node */}
        <circle cx="49.5" cy="21" r="2.2" fill="#2DD4BF" />
        <circle cx="49.5" cy="21" r="4.5" stroke="#2DD4BF" strokeOpacity="0.35" strokeWidth="1" />
      </svg>

      {showWordmark && (
        <span className="flex flex-col leading-none min-w-0">
          <span className="inline-flex items-baseline gap-1.5">
            <span
              className={`font-display font-bold tracking-tight text-[#16211D] dark:text-[#EDF3F0] whitespace-nowrap ${WORDMARK_SIZES[size]}`}
            >
              Vayu<span className="text-[#1B4332] dark:text-[#2DD4BF]">Mitra</span>
            </span>
            {showSanskrit && (
              <span className="text-[11px] font-medium text-[#52796F] dark:text-[#8FB9AC] whitespace-nowrap">
                वायुमित्र
              </span>
            )}
          </span>
        </span>
      )}
    </span>
  );
};
