import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  ShieldAlert,
  Skull,
} from 'lucide-react';
import type { AqiIconKind } from '../../utils/aqi';

interface AqiStatusIconProps {
  kind: AqiIconKind;
  className?: string;
}

export const AqiStatusIcon: React.FC<AqiStatusIconProps> = ({ kind, className = 'w-4 h-4' }) => {
  switch (kind) {
    case 'good':
      return <CheckCircle2 className={className} aria-hidden="true" />;
    case 'moderate':
      return <Info className={className} aria-hidden="true" />;
    case 'sensitive':
      return <AlertTriangle className={className} aria-hidden="true" />;
    case 'unhealthy':
      return <ShieldAlert className={className} aria-hidden="true" />;
    case 'very_unhealthy':
      return <AlertOctagon className={className} aria-hidden="true" />;
    case 'hazardous':
      return <Skull className={className} aria-hidden="true" />;
    default:
      return <HelpCircle className={className} aria-hidden="true" />;
  }
};
