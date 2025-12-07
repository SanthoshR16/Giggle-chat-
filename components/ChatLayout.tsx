import React, { useState } from 'react';
import { User } from '../types';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import { Menu, Laugh } from 'lucide-react';
import { THEMES } from '../theme';

interface ChatLayoutProps {
  currentUser: User;
  onLogout: () => void;
  onOpenSettings: () => void;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ currentUser, onLogout, onOpenSettings }) => {
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelectFriend = (friendId: string) => {
    setSelectedFriendId(friendId);
    setMobileMenuOpen(false);
  };
  
  const theme = THEMES[currentUser.theme || 'midnight'];

  return (
    <div className={`flex flex-row h-[100dvh] w-full ${theme.bgPage} overflow-hidden`}>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Flexible Width Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 h-full ${theme.bgPanel} ${theme.border} border-r transition-transform duration-300 ease-in-out shadow-2xl
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:shadow-none md:flex-shrink-0
      `}>
        <Sidebar 
          currentUser={currentUser} 
          onSelectFriend={handleSelectFriend}
          selectedFriendId={selectedFriendId}
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
        />
      </div>

      {/* Main Chat Content */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Mobile Header */}
        <div className={`md:hidden h-14 shrink-0 border-b ${theme.border} flex items-center px-4 ${theme.bgPanel} z-30`}>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className={`p-2 -ml-2 ${theme.textMuted} hover:${theme.textMain}`}
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className={`ml-2 font-bold ${theme.textMain} flex items-center gap-2`}>
            <Laugh className="w-5 h-5 text-rose-500" /> Giggle Chat
          </span>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {selectedFriendId ? (
            <ChatWindow 
              currentUser={currentUser}
              friendId={selectedFriendId}
              onBack={() => setSelectedFriendId(null)}
            />
          ) : (
            <div className={`absolute inset-0 flex flex-col items-center justify-center ${theme.textMuted} p-8 text-center`}>
              <div className={`w-40 h-40 md:w-64 md:h-64 ${theme.bgPanel} rounded-full flex items-center justify-center mb-6 opacity-50 animate-in zoom-in duration-500`}>
                <Laugh className="w-20 h-20 md:w-32 md:h-32 opacity-20" />
              </div>
              <h2 className={`text-2xl md:text-3xl font-bold ${theme.textMain} mb-2`}>Welcome back, {currentUser.name}!</h2>
              <p className="max-w-md text-sm md:text-base">
                Select a friend to start giggling. 
                <br/>All chats are safe & secure.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatLayout;