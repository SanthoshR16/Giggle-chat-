import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const Loader: React.FC = () => {
  const [longLoad, setLongLoad] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLongLoad(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-full animate-pulse"></div>
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin relative z-10" />
      </div>
      
      <h2 className="mt-6 text-slate-200 font-bold text-lg animate-pulse tracking-wide">
        Giggle Chat
      </h2>
      
      {longLoad && (
        <p className="mt-2 text-slate-500 text-xs font-medium animate-in fade-in duration-500">
          Connecting to secure server...
        </p>
      )}
    </div>
  );
};

export default Loader;