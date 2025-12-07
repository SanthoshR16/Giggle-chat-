import React, { useState, useEffect } from 'react';
import { SupabaseService, supabase } from './services/supabaseService';
import { User, AppView } from './types';
import LoginScreen from './components/LoginScreen';
import ChatLayout from './components/ChatLayout';
import SettingsScreen from './components/SettingsScreen';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        // 1. Fast Load: Get User from Session + LocalStorage (Non-blocking)
        const cachedUser = await SupabaseService.getCurrentUser();
        
        if (isMounted && cachedUser) {
          setUser(cachedUser);
          setView(AppView.CHAT);

          // 2. Background Refresh: Update profile from DB without blocking UI
          SupabaseService.refreshProfile(cachedUser.id).then((updatedUser) => {
            if (isMounted && updatedUser) {
               setUser(prev => prev ? { ...prev, ...updatedUser } : updatedUser);
            }
          });
        }
      } catch (e) {
        console.warn("Init failed:", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeApp();

    // 3. Hard Safety Timeout: Force UI to render after 1.5s no matter what
    const safetyTimeout = setTimeout(() => {
      if (isMounted && isLoading) {
         console.warn("Forcing UI load due to timeout");
         setIsLoading(false);
      }
    }, 1500);

    // 4. Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
         // If we are already logged in, this might just be a token refresh
         if (!user) {
            setIsLoading(true);
            const u = await SupabaseService.getCurrentUser();
            if (isMounted) {
                setUser(u);
                setView(AppView.CHAT);
                setIsLoading(false);
            }
         }
      } else if (event === 'SIGNED_OUT') {
         setUser(null);
         setView(AppView.LOGIN);
         setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      authListener.subscription.unsubscribe();
    };
  }, []); // Run once on mount

  const handleLogout = async () => {
    setIsLoading(true);
    await SupabaseService.logout();
    setView(AppView.LOGIN);
    setIsLoading(false);
  };
  
  const handleUpdateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-slate-200 z-[9999]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-sm font-medium animate-pulse text-slate-400">Loading Giggle Chat...</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-950">
      {view === AppView.LOGIN && <LoginScreen onLogin={(u) => { setUser(u); setView(AppView.CHAT); }} />} 
      
      {view === AppView.CHAT && user && (
        <ChatLayout 
          currentUser={user} 
          onLogout={handleLogout}
          onOpenSettings={() => setView(AppView.SETTINGS)}
        />
      )}

      {view === AppView.SETTINGS && user && (
        <SettingsScreen 
          currentUser={user} 
          onBack={() => setView(AppView.CHAT)} 
          onUpdateUser={handleUpdateUser}
        />
      )}
    </div>
  );
}