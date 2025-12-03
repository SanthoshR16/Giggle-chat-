export type ThemeId = 'midnight' | 'giggle' | 'ocean' | 'forest';

export interface ThemeColors {
  name: string;
  bgPage: string;    // Main background
  bgPanel: string;   // Sidebar/Panels
  textMain: string;
  textMuted: string;
  border: string;
  primary: string;   // Button bg
  primaryHover: string;
  bubbleMe: string;  // My message bubble
  bubbleOther: string; // Friend message bubble
  inputBg: string;
  accentText: string;
}

export const THEMES: Record<string, ThemeColors> = {
  midnight: {
    name: 'Midnight',
    bgPage: 'bg-slate-900',
    bgPanel: 'bg-slate-800',
    textMain: 'text-slate-100',
    textMuted: 'text-slate-400',
    border: 'border-slate-700',
    primary: 'bg-blue-600',
    primaryHover: 'hover:bg-blue-500',
    bubbleMe: 'bg-blue-600 text-white',
    bubbleOther: 'bg-slate-700 text-slate-200',
    inputBg: 'bg-slate-900',
    accentText: 'text-blue-400'
  },
  giggle: {
    name: 'Giggle',
    bgPage: 'bg-pink-950',
    bgPanel: 'bg-pink-900',
    textMain: 'text-pink-50',
    textMuted: 'text-pink-300',
    border: 'border-pink-800',
    primary: 'bg-rose-500',
    primaryHover: 'hover:bg-rose-400',
    bubbleMe: 'bg-rose-500 text-white',
    bubbleOther: 'bg-pink-800 text-pink-100',
    inputBg: 'bg-pink-950',
    accentText: 'text-rose-400'
  },
  ocean: {
    name: 'Ocean',
    bgPage: 'bg-cyan-950',
    bgPanel: 'bg-cyan-900',
    textMain: 'text-cyan-50',
    textMuted: 'text-cyan-300',
    border: 'border-cyan-800',
    primary: 'bg-cyan-600',
    primaryHover: 'hover:bg-cyan-500',
    bubbleMe: 'bg-cyan-600 text-white',
    bubbleOther: 'bg-cyan-800 text-cyan-100',
    inputBg: 'bg-cyan-950',
    accentText: 'text-cyan-400'
  },
  forest: {
    name: 'Forest',
    bgPage: 'bg-emerald-950',
    bgPanel: 'bg-emerald-900',
    textMain: 'text-emerald-50',
    textMuted: 'text-emerald-300',
    border: 'border-emerald-800',
    primary: 'bg-green-600',
    primaryHover: 'hover:bg-green-500',
    bubbleMe: 'bg-green-600 text-white',
    bubbleOther: 'bg-emerald-800 text-emerald-100',
    inputBg: 'bg-emerald-950',
    accentText: 'text-green-400'
  }
};