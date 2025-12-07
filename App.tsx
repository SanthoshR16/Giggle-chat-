import React, { useState, useEffect, useRef } from 'react';
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
  
  // Use a ref to prevent state updates on unmount
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    // 1. Hard Failsafe: No matter what, stop loading after 3 seconds
    const safetyTimer = setTimeout(() => {
      if (isMounted.current && isLoading) {
        console.warn("Loading timed out. Forcing UI render.");
        setIsLoading(false);
      }
    }, 3000);

    const init = async () => {
      try {
        // Instant offline check
        if (!navigator.onLine) {
           throw new Error("Offline");
        }

        // Fetch user with a strict 2s timeout logic inline
        const userPromise = SupabaseService.getCurrentUser();
        const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 2000));
        
        const currentUser = await Promise.race([userPromise, timeoutPromise]);

        if (isMounted.current) {
          if (currentUser) {
            setUser(currentUser);
            setView(AppView.CHAT);
            // Background refresh
            SupabaseService.refreshProfile(currentUser.id).catch(() => {});
          } else {
            setView(AppView.LOGIN);
          }
        }
      } catch (e) {
        console.error("Init failed:", e);
        if (isMounted.current) setView(AppView.LOGIN);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    init();

    // Auth Subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted.current) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setView(AppView.LOGIN);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Only refresh if we don't have a user or IDs mismatch
        if (!user || user.id !== session.user.id) {
           const u = await SupabaseService.getCurrentUser();
           if (isMounted.current && u) {
             setUser(u);
             setView(AppView.CHAT);
           }
        }
      }
    });

    return () => {
      isMounted.current = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setIsLoading(true);
    await SupabaseService.logout();
    if (isMounted.current) {
        setUser(null);
        setView(AppView.LOGIN);
        setIsLoading(false);
    }
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
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-950 text-slate-100 font-sans relative">
      {view === AppView.LOGIN && (
        <LoginScreen 
          onLogin={(u) => {
            setUser(u);
            setView(AppView.CHAT);
          }} 
        />
      )} 
      
      {view === AppView.CHAT && (
        user ? (
          <ChatLayout 
            currentUser={user} 
            onLogout={handleLogout}
            onOpenSettings={() => setView(AppView.SETTINGS)}
          />
        ) : (
          // Fallback if view is CHAT but user is null (rare race condition)
          <LoginScreen 
            onLogin={(u) => {
              setUser(u);
              setView(AppView.CHAT);
            }} 
          />
        )
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