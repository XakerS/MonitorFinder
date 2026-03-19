export type Rating = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface Monitor {
  name: string;
  resolution: string;
  resolutionCategory: string;
  diagonal: string;
  panel: string;
  matrixType: string;
  refreshRate: string;
  contrast: string;
  gtg80: string;
  gtg100: string;
  overdrive: string;
  srgb: string;
  adobe: string;
  dciP3: string;
  minBrightness: string;
  maxBrightness: string;
  comment: string;
  rating: Rating;
  rowIndex: number;
}

export interface ParseResult {
  monitors: Monitor[];
  errors: string[];
  lastMonitor: string;
  timestamp: Date;
  totalRows: number;
}

export const RATING_CONFIG: Record<Rating, {
  label: string;
  color: string;
  bg: string;
  border: string;
  emoji: string;
  cardBg: string;
  cardBorder: string;
}> = {
  S: {
    label: 'S-Tier',
    color: 'text-amber-300',
    bg: 'bg-amber-950/60',
    border: 'border-amber-500/50',
    emoji: '👑',
    cardBg: 'bg-amber-950/30',
    cardBorder: 'border-amber-500/40',
  },
  A: {
    label: 'Лучший выбор',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-500/50',
    emoji: '✅',
    cardBg: 'bg-emerald-950/20',
    cardBorder: 'border-emerald-500/40',
  },
  B: {
    label: 'Хороший вариант',
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/60',
    border: 'border-cyan-500/50',
    emoji: '👍',
    cardBg: 'bg-cyan-950/20',
    cardBorder: 'border-cyan-500/40',
  },
  C: {
    label: 'Нормально',
    color: 'text-gray-400',
    bg: 'bg-gray-800/60',
    border: 'border-gray-600/50',
    emoji: '➖',
    cardBg: 'bg-gray-900/40',
    cardBorder: 'border-gray-700/40',
  },
  D: {
    label: 'Лучше избегать',
    color: 'text-yellow-400',
    bg: 'bg-yellow-950/60',
    border: 'border-yellow-600/50',
    emoji: '⚠️',
    cardBg: 'bg-yellow-950/20',
    cardBorder: 'border-yellow-600/30',
  },
  E: {
    label: 'Нет информации',
    color: 'text-gray-500',
    bg: 'bg-gray-800/40',
    border: 'border-gray-700/50',
    emoji: '❓',
    cardBg: 'bg-gray-900/30',
    cardBorder: 'border-gray-700/30',
  },
  F: {
    label: 'Не рекомендуется',
    color: 'text-red-400',
    bg: 'bg-red-950/60',
    border: 'border-red-600/50',
    emoji: '🚫',
    cardBg: 'bg-red-950/20',
    cardBorder: 'border-red-600/30',
  },
};
