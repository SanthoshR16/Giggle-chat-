import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { ArrowLeft, Camera, Loader2, Bot, Palette, Check, AlertTriangle, Shield, Unlock, RefreshCw } from 'lucide-react';
import { THEMES } from '../theme';

interface SettingsProps {
  currentUser: User;
  onBack: () => void;
  onUpdateUser: (updates: Partial<User>) => void;
}

const SettingsScreen: React.FC<SettingsProps> = ({ currentUser, onBack, onUpdateUser }) => {
  const [name, setName] = useState(currentUser.name);
  const [botName, setBotName] = useState(currentUser.customBotName || 'Giggle AI');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [selectedTheme, setSelectedTheme] = useState(currentUser.theme || 'midnight');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch blocked users
    SupabaseService.getBlockedUsers(currentUser.id).then(setBlockedUsers);
  }, [currentUser.id]);

  const handleUnblockUser = async (blockedId: string) => {
    await SupabaseService.unblockUser(currentUser.id, blockedId);
    setBlockedUsers(prev => prev.filter(u => u.id !== blockedId));
  };
  
  const handleUnblockAll = async () => {
      if (window.confirm("Unblock all users?")) {
        await SupabaseService.unblockAll(currentUser.id);
        setBlockedUsers([]);
      }
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 96; 

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }
          
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image too large (Max 5MB)");
        return;
      }
      try {
        const resizedUrl = await resizeImage(file);
        setAvatarUrl(resizedUrl);
      } catch (error) {
        console.error("Image error:", error);
      }
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMsg(null);

    try {
      const updates: Partial<User> = { 
        name, 
        customBotName: botName,
        theme: selectedTheme
      };
      
      // Only include avatarUrl if it has changed to avoid sending large base64 strings unnecessarily
      if (avatarUrl !== currentUser.avatarUrl) {
          updates.avatarUrl = avatarUrl;
      }
      
      const { error } = await SupabaseService.updateProfile(currentUser.id, updates);
      
      if (error) {
          throw new Error(error);
      }
      
      onUpdateUser({ ...updates, avatarUrl }); // Update local state
      setSaveSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(false);
        onBack(); 
      }, 1000); 

    } catch (error: any) {
      console.error("Save failed:", error);
      const msg = error.message || String(error);
      if (msg.includes("policy") || msg.includes("permission")) {
          setErrorMsg("Permission Denied: DB Policy error.");
      } else {
          setErrorMsg(`Error: ${msg}`);
      }
      setIsSaving(false);
    }
  };

  const currentTheme = THEMES[selectedTheme];

  return (
    <div className={`h-screen ${currentTheme.bgPage} flex flex-col max-w-2xl mx-auto border-x ${currentTheme.border} overflow-y-auto ${currentTheme.textMain}`}>
      <div className={`p-4 border-b ${currentTheme.border} flex items-center gap-4 sticky top-0 ${currentTheme.bgPage} z-10`}>
        <button onClick={onBack} className={`p-2 hover:bg-black/10 rounded-full ${currentTheme.textMuted} hover:${currentTheme.textMain} transition`}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="p-6 space-y-8">
        {errorMsg && (
            <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 flex gap-3 text-red-200">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <div className="text-xs font-mono break-all">{errorMsg}</div>
            </div>
        )}

        <section>
          <h2 className={`text-sm font-bold ${currentTheme.textMuted} uppercase tracking-wider mb-4`}>Your Profile</h2>
          <div className={`${currentTheme.bgPanel} rounded-2xl p-6 border ${currentTheme.border} flex flex-col items-center gap-6`}>
            
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img src={avatarUrl} alt="Profile" className={`w-28 h-28 rounded-full border-4 ${currentTheme.border} object-cover group-hover:border-current transition-colors shadow-lg`} />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            <p className="text-xs text-slate-500 font-medium">Tap photo to change</p>

            <div className="w-full space-y-4">
              <div>
                <label className={`block text-xs ${currentTheme.textMuted} mb-1 ml-1 font-bold`}>USERNAME</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full ${currentTheme.inputBg} border ${currentTheme.border} rounded-xl px-4 py-3 ${currentTheme.textMain} focus:outline-none focus:ring-1 focus:ring-current transition-all`}
                />
              </div>

              <div>
                <label className={`block text-xs ${currentTheme.textMuted} mb-1 ml-1 flex items-center gap-1 font-bold`}><Bot className="w-3 h-3"/> AI BOT NAME</label>
                <input 
                  type="text" 
                  value={botName} 
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="Name your AI..."
                  className={`w-full ${currentTheme.inputBg} border ${currentTheme.border} rounded-xl px-4 py-3 ${currentTheme.textMain} focus:outline-none focus:ring-1 focus:ring-current transition-all`}
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className={`text-sm font-bold ${currentTheme.textMuted} uppercase tracking-wider mb-4`}>Appearance</h2>
          <div className={`${currentTheme.bgPanel} rounded-2xl p-6 border ${currentTheme.border}`}>
             <h3 className={`font-bold mb-4 flex items-center gap-2 ${currentTheme.textMain}`}>
               <Palette className="w-4 h-4" /> Color Theme
             </h3>
             <div className="grid grid-cols-2 gap-3">
                {Object.entries(THEMES).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTheme(key)}
                    className={`relative p-3 rounded-xl border-2 transition-all flex items-center gap-3 overflow-hidden
                      ${selectedTheme === key ? `border-current ${theme.bgPanel}` : `border-transparent bg-black/10`}
                    `}
                  >
                    <div className={`w-8 h-8 rounded-full ${theme.primary} shadow-sm border border-white/10 shrink-0`}></div>
                    <span className={`text-sm font-medium ${selectedTheme === key ? theme.textMain : currentTheme.textMuted}`}>{theme.name}</span>
                    {selectedTheme === key && <Check className="absolute right-3 top-3 w-4 h-4" />}
                  </button>
                ))}
             </div>
          </div>
        </section>

        <section>
           <h2 className={`text-sm font-bold ${currentTheme.textMuted} uppercase tracking-wider mb-4`}>Safety & Privacy</h2>
           <div className={`${currentTheme.bgPanel} rounded-2xl p-6 border ${currentTheme.border}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-bold flex items-center gap-2 ${currentTheme.textMain}`}>
                        <Shield className="w-4 h-4" /> Blocked Users
                    </h3>
                    {blockedUsers.length > 0 && (
                        <button onClick={handleUnblockAll} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" /> Unblock All
                        </button>
                    )}
                </div>
                {blockedUsers.length === 0 ? (
                    <div className={`text-center py-4 text-sm ${currentTheme.textMuted}`}>You haven't blocked anyone.</div>
                ) : (
                    <div className="space-y-3">
                        {blockedUsers.map(user => (
                            <div key={user.id} className={`flex items-center justify-between p-3 bg-black/20 rounded-xl border ${currentTheme.border}`}>
                                <div className="flex items-center gap-3">
                                    <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                                    <span className="text-sm font-bold">{user.name}</span>
                                </div>
                                <button 
                                    onClick={() => handleUnblockUser(user.id)}
                                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition flex items-center gap-1"
                                >
                                    <Unlock className="w-3 h-3" /> Unblock
                                </button>
                            </div>
                        ))}
                    </div>
                )}
           </div>
        </section>

        <div className="pt-4 pb-8">
             <button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className={`w-full ${saveSuccess ? 'bg-emerald-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg`}
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : saveSuccess ? "Saved!" : "Save Changes"}
              </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;