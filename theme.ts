export type ThemeId = 'midnight' | 'giggle' | 'ocean' | 'forest';

export interface ThemeColors {
  name: string;
  bgPage: string;    // Main background
  bgPanel: string;   // Sidebar/Panels (Glass effect base)
  textMain: string;
  textMuted: string;
  border: string;
  primary: string;   // Button bg solid
  gradient: string;  // Main Gradient
  glow: string;      // Box shadow color
  bubbleMe: string;  // My message bubble gradient
  bubbleOther: string; // Friend message bubble
  inputBg: string;
  accentText: string;
}

export const THEMES: Record<string, ThemeColors> = {
  midnight: {
    name: 'Midnight',
    bgPage: 'bg-slate-950',
    bgPanel: 'bg-slate-900/80',
    textMain: 'text-slate-100',
    textMuted: 'text-slate-400',
    border: 'border-slate-800',
    primary: 'bg-blue-600',
    gradient: 'bg-gradient-to-r from-blue-600 to-indigo-600',
    glow: 'shadow-blue-500/20',
    bubbleMe: 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white',
    bubbleOther: 'bg-slate-800/80 text-slate-200',
    inputBg: 'bg-slate-900/90',
    accentText: 'text-blue-400'
  },
  giggle: {
    name: 'Giggle',
    bgPage: 'bg-[#1a0b14]', // Very dark pink/black
    bgPanel: 'bg-[#2d1222]/80',
    textMain: 'text-pink-50',
    textMuted: 'text-pink-300/60',
    border: 'border-pink-500/20',
    primary: 'bg-rose-500',
    gradient: 'bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500',
    glow: 'shadow-rose-500/30',
    bubbleMe: 'bg-gradient-to-br from-pink-500 to-rose-600 text-white',
    bubbleOther: 'bg-pink-900/40 text-pink-100',
    inputBg: 'bg-[#2d1222]/90',
    accentText: 'text-rose-400'
  },
  ocean: {
    name: 'Ocean',
    bgPage: 'bg-[#081820]',
    bgPanel: 'bg-[#0f2530]/80',
    textMain: 'text-cyan-50',
    textMuted: 'text-cyan-300/60',
    border: 'border-cyan-500/20',
    primary: 'bg-cyan-600',
    gradient: 'bg-gradient-to-r from-cyan-500 to-blue-600',
    glow: 'shadow-cyan-500/30',
    bubbleMe: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white',
    bubbleOther: 'bg-cyan-900/40 text-cyan-100',
    inputBg: 'bg-[#0f2530]/90',
    accentText: 'text-cyan-400'
  },
  forest: {
    name: 'Forest',
    bgPage: 'bg-[#05150a]',
    bgPanel: 'bg-[#0b2413]/80',
    textMain: 'text-emerald-50',
    textMuted: 'text-emerald-300/60',
    border: 'border-emerald-500/20',
    primary: 'bg-green-600',
    gradient: 'bg-gradient-to-r from-emerald-500 to-green-600',
    glow: 'shadow-emerald-500/30',
    bubbleMe: 'bg-gradient-to-br from-emerald-500 to-green-600 text-white',
    bubbleOther: 'bg-emerald-900/40 text-emerald-100',
    inputBg: 'bg-[#0b2413]/90',
    accentText: 'text-green-400'
  }
};