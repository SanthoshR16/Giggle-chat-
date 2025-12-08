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
  
  // Real-time presence state
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});
  
  // Use a ref to prevent state updates on unmount
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    // 1. Hard Failsafe: Stop loading after 5 seconds to prevent infinite loops on slow networks
    const safetyTimer = setTimeout(() => {
      if (isMounted.current && isLoading) {
        console.warn("Loading timed out. Forcing UI render.");
        setIsLoading(false);
      }
    }, 5000);

    const init = async () => {
      try {
        // Instant offline check
        if (!navigator.onLine) {
           console.warn("App is offline");
        }

        // Direct fetch without complex races
        const currentUser = await SupabaseService.getCurrentUser();

        if (isMounted.current) {
          if (currentUser) {
            setUser(currentUser);
            setView(AppView.CHAT);
            // Attempt to ensure profile exists in background
            SupabaseService.ensureProfileExists(currentUser).catch(() => {});
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
        setOnlineUsers({});
      } else if (event === 'SIGNED_IN' && session?.user) {
         // If we are currently at LOGIN or loading, update to CHAT
         if (!user || user.id !== session.user.id) {
           // Small delay to ensure session is propogated
           await new Promise(r => setTimeout(r, 100));
           const u = await SupabaseService.getCurrentUser();
           if (isMounted.current && u) {
             setUser(u);
             setView(AppView.CHAT);
             setIsLoading(false);
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

  // Presence Subscription Effect
  useEffect(() => {
      let cleanup: (() => void) | undefined;
      
      if (user && view === AppView.CHAT) {
          cleanup = SupabaseService.initializePresence(user.id, (statuses) => {
              if (isMounted.current) {
                  setOnlineUsers(statuses);
              }
          });
      }
      
      return () => {
          if (cleanup) cleanup();
      };
  }, [user?.id, view]);

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
            onlineUsers={onlineUsers}
            onLogout={handleLogout}
            onOpenSettings={() => setView(AppView.SETTINGS)}
          />
        ) : (
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