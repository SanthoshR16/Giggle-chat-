import React from 'react';
import { Loader2 } from 'lucide-react';

const Loader: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[9999]">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
      <p className="text-slate-400 text-sm font-medium animate-pulse">Loading Giggle Chat...</p>
    </div>
  );
};

export default Loader;