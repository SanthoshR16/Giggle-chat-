import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { Backend } from '../services/mockBackend';
import { ArrowLeft, UserX, Unlock, Camera, Save, Loader2, Bot, Palette, Check } from 'lucide-react';
import { THEMES } from '../theme';

interface SettingsProps {
  currentUser: User;
  onBack: () => void;
  onUpdateUser: (updates: Partial<User>) => void;
}

const SettingsScreen: React.FC<SettingsProps> = ({ currentUser, onBack, onUpdateUser }) => {
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [name, setName] = useState(currentUser.name);
  const [botName, setBotName] = useState(currentUser.customBotName || 'Giggle AI');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [selectedTheme, setSelectedTheme] = useState(currentUser.theme || 'midnight');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBlockedUsers(Backend.getBlockedUsers(currentUser.id));
  }, [currentUser.id]);

  const handleUnblock = async (blockedId: string) => {
    await Backend.unblockUser(currentUser.id, blockedId);
    setBlockedUsers(prev => prev.filter(u => u.id !== blockedId));
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
          
          const MAX_SIZE = 100; // Small size for performance

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
        img.onerror = (err) => reject(err);
        img.src = event.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedUrl = await resizeImage(file);
        setAvatarUrl(resizedUrl);
      } catch (error) {
        console.error("Error processing image:", error);
        alert("Could not process this image. Please try a different one.");
      }
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updates = { 
        name, 
        avatarUrl,
        customBotName: botName,
        theme: selectedTheme
      };
      
      await Backend.updateProfile(currentUser.id, updates);
      
      // Optimistically update parent to reflect changes immediately without reload
      onUpdateUser(updates);
      
      setIsSaving(false);
      onBack(); // Go back to chat
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save profile. Please try again.");
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
        
        {/* Profile Section */}
        <section>
          <h2 className={`text-sm font-bold ${currentTheme.textMuted} uppercase tracking-wider mb-4`}>Your Profile</h2>
          <div className={`${currentTheme.bgPanel} rounded-2xl p-6 border ${currentTheme.border} flex flex-col items-center gap-6`}>
            
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img src={avatarUrl} alt="Profile" className={`w-24 h-24 rounded-full border-4 ${currentTheme.border} object-cover group-hover:border-current transition-colors`} />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>

            <div className="w-full space-y-4">
              <div>
                <label className={`block text-xs ${currentTheme.textMuted} mb-1 ml-1`}>Username</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full ${currentTheme.inputBg} border ${currentTheme.border} rounded-xl px-4 py-3 ${currentTheme.textMain} focus:outline-none focus:ring-1 focus:ring-current`}
                />
              </div>

              <div>
                <label className={`block text-xs ${currentTheme.textMuted} mb-1 ml-1 flex items-center gap-1`}><Bot className="w-3 h-3"/> AI Bot Name</label>
                <input 
                  type="text" 
                  value={botName} 
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="Name your AI..."
                  className={`w-full ${currentTheme.inputBg} border ${currentTheme.border} rounded-xl px-4 py-3 ${currentTheme.textMain} focus:outline-none focus:ring-1 focus:ring-current`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Theme Section */}
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

        {/* Blocked Users Section */}
        <section>
          <h2 className={`text-sm font-bold ${currentTheme.textMuted} uppercase tracking-wider mb-4`}>Privacy & Security</h2>
          <div className={`${currentTheme.bgPanel} rounded-2xl p-6 border ${currentTheme.border}`}>
            <h3 className="font-bold mb-2 flex items-center gap-2">
               <UserX className="w-4 h-4 text-red-400" /> Blocked List
            </h3>
            <p className={`text-sm ${currentTheme.textMuted} mb-4`}>
              Only you can unblock users you have blocked or who were auto-blocked by the system.
            </p>

            <div className="space-y-3">
              {blockedUsers.length === 0 ? (
                <div className={`text-center py-6 ${currentTheme.textMuted} text-sm italic border-2 border-dashed ${currentTheme.border} rounded-xl`}>
                  No blocked users.
                </div>
              ) : (
                blockedUsers.map(user => (
                  <div key={user.id} className={`flex items-center justify-between p-3 ${currentTheme.bgPage} rounded-xl border ${currentTheme.border}`}>
                    <div className="flex items-center gap-3">
                      <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full opacity-50 grayscale" />
                      <div>
                        <div className={`text-sm font-bold ${currentTheme.textMain}`}>{user.name}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblock(user.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 bg-black/20 hover:bg-black/40 ${currentTheme.textMain} rounded-lg text-xs border ${currentTheme.border} transition`}
                    >
                      <Unlock className="w-3 h-3" /> Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <div className="pt-4">
             <button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className={`w-full ${currentTheme.primary} ${currentTheme.primaryHover} text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg transform active:scale-[0.98]`}
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4" />}
                Save All Changes
              </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsScreen;