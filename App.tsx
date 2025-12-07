import React, { useState, useEffect } from 'react';
import { SupabaseService, supabase } from './services/supabaseService';
import { User, AppView } from './types';
import LoginScreen from './components/LoginScreen';
import ChatLayout from './components/ChatLayout';
import SettingsScreen from './components/SettingsScreen';
import Loader from './components/Loader';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Attempt to restore session
        const currentUser = await SupabaseService.getCurrentUser();
        
        if (isMounted) {
          if (currentUser) {
            setUser(currentUser);
            setView(AppView.CHAT);
            
            // Background profile refresh (non-blocking)
            SupabaseService.refreshProfile(currentUser.id).then((updated) => {
              if (isMounted && updated) {
                setUser((prev) => (prev ? { ...prev, ...updated } : updated));
              }
            });
          } else {
            setView(AppView.LOGIN);
          }
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        if (isMounted) setView(AppView.LOGIN);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    // Set up real-time auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setView(AppView.LOGIN);
        setIsLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Only fetch if we don't already have the user to avoid redundant calls
        if (!user) {
          setIsLoading(true);
          const u = await SupabaseService.getCurrentUser();
          if (isMounted && u) {
            setUser(u);
            setView(AppView.CHAT);
          }
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Run once on mount

  const handleLogout = async () => {
    setIsLoading(true);
    await SupabaseService.logout();
    setUser(null);
    setView(AppView.LOGIN);
    setIsLoading(false);
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {view === AppView.LOGIN && (
        <LoginScreen 
          onLogin={(u) => {
            setUser(u);
            setView(AppView.CHAT);
          }} 
        />
      )} 
      
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