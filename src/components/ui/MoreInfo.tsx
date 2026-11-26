import React, { useId, useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';

interface MoreInfoProps {
  label?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const MoreInfo: React.FC<MoreInfoProps> = ({
  label = 'More Info',
  defaultOpen = false,
  children,
  className = '',
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={`border-t border-[#DCE5E0] dark:border-[#20302A] pt-3 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1B4332] dark:text-[#2DD4BF] hover:underline focus-visible:rounded active:scale-[0.98] transition-transform duration-100 whitespace-nowrap"
      >
        <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{open ? `Hide ${label}` : label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <div
        id={panelId}
        aria-hidden={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          open ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          {open && (
            <div className="text-xs text-[#4E5E58] dark:text-[#9BB0A7] leading-relaxed space-y-2 pb-0.5">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
