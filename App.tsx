import React, { useState, useEffect } from 'react';
import { Backend } from './services/mockBackend';
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
    const storedId = localStorage.getItem('nexus_auth_uid');
    if (storedId) {
      const existingUser = Backend.getAllUsers().find(u => u.id === storedId);
      if (existingUser) {
        setUser(existingUser);
        setView(AppView.CHAT);
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('nexus_auth_uid', loggedInUser.id);
    setView(AppView.CHAT);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nexus_auth_uid');
    setView(AppView.LOGIN);
  };
  
  const handleUpdateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-200">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans antialiased overflow-hidden">
      {view === AppView.LOGIN && <LoginScreen onLogin={handleLogin} />}
      
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