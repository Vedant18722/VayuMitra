import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Wind } from 'lucide-react';
import { ambientWindEngine, type AmbientSoundSnapshot } from '../../utils/soundEngine';

interface AmbientSoundControlProps {
  compact?: boolean;
  className?: string;
}

export const AmbientSoundControl: React.FC<AmbientSoundControlProps> = ({
  compact = false,
  className = '',
}) => {
  const [snap, setSnap] = useState<AmbientSoundSnapshot>(() => ambientWindEngine.getSnapshot());

  useEffect(() => {
    setSnap(ambientWindEngine.getSnapshot());
    return ambientWindEngine.subscribe(setSnap);
  }, []);

  const handleTogglePlay = async () => {
    await ambientWindEngine.toggle();
  };

  const handleToggleMute = () => {
    ambientWindEngine.toggleMute();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    ambientWindEngine.setVolume(Number(e.target.value) / 100);
  };

  const volumePct = Math.round(snap.volume * 100);

  return (
    <div
      role="group"
      aria-label="Ambient wind sound controls"
      className={`inline-flex flex-wrap items-center gap-2 rounded-md border border-[#DCE5E0] dark:border-[#243630] bg-white/90 dark:bg-[#131E1A]/90 px-2.5 py-1.5 text-xs transition-colors duration-200 ${className}`}
    >
      <button
        type="button"
        onClick={() => void handleTogglePlay()}
        disabled={!snap.supported}
        aria-pressed={snap.isPlaying}
        aria-label={snap.isPlaying ? 'Stop ambient wind sound' : 'Play gentle ambient wind sound'}
        title={
          !snap.supported
            ? 'Ambient wind audio is unavailable in this browser'
            : snap.isPlaying
              ? 'Turn off ambient wind sound'
              : 'Play soft natural wind ambience'
        }
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all duration-150 active:scale-[0.98] whitespace-nowrap min-h-[32px] disabled:opacity-50 ${
          snap.isPlaying
            ? 'bg-[#1B4332] dark:bg-[#2D6A4F] text-white'
            : 'text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27]'
        }`}
      >
        <Wind
          className={`w-3.5 h-3.5 shrink-0 ${snap.isPlaying && !snap.isMuted ? 'vayumitra-wind-icon-active' : ''}`}
          aria-hidden="true"
        />
        <span>{compact ? (snap.isPlaying ? 'Wind On' : 'Wind') : snap.isPlaying ? 'Wind Ambience On' : 'Wind Ambience'}</span>
      </button>

      {snap.isPlaying && (
        <>
          <button
            type="button"
            onClick={handleToggleMute}
            aria-pressed={snap.isMuted}
            aria-label={snap.isMuted ? 'Unmute ambient wind sound' : 'Mute ambient wind sound'}
            title={snap.isMuted ? 'Unmute' : 'Mute'}
            className="inline-flex items-center justify-center p-1.5 rounded text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#1B4332] dark:hover:text-[#2DD4BF] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] transition-colors min-h-[32px] min-w-[32px]"
          >
            {snap.isMuted || volumePct === 0 ? (
              <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>

          <div className="inline-flex items-center gap-1.5 pr-1">
            <label htmlFor={`wind-vol-${compact ? 'c' : 'f'}`} className="sr-only">
              Ambient wind volume
            </label>
            <input
              id={`wind-vol-${compact ? 'c' : 'f'}`}
              type="range"
              min={0}
              max={100}
              step={5}
              value={snap.isMuted ? 0 : volumePct}
              onChange={handleVolumeChange}
              aria-label="Ambient wind volume"
              className="w-16 sm:w-20 accent-[#1B4332] dark:accent-[#2DD4BF] cursor-pointer"
            />
            <span className="font-mono tabular-nums text-[11px] text-[#4E5E58] dark:text-[#9BB0A7] w-7 text-right">
              {snap.isMuted ? '0%' : `${volumePct}%`}
            </span>
          </div>
        </>
      )}

      {snap.error && (
        <span role="status" className="text-[11px] text-amber-800 dark:text-amber-300">
          Audio unavailable
        </span>
      )}
    </div>
  );
};
