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
    <div className={`flex h-screen ${theme.bgPage} overflow-hidden transition-colors duration-500`}>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-80 ${theme.bgPanel} ${theme.border} border-r transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <Sidebar 
          currentUser={currentUser} 
          onSelectFriend={handleSelectFriend}
          selectedFriendId={selectedFriendId}
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${theme.bgPage}`}>
        <div className={`md:hidden h-14 border-b ${theme.border} flex items-center px-4 ${theme.bgPanel}`}>
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

        {selectedFriendId ? (
          <ChatWindow 
            currentUser={currentUser}
            friendId={selectedFriendId}
          />
        ) : (
          <div className={`flex-1 flex flex-col items-center justify-center ${theme.textMuted} p-8 text-center`}>
            <div className={`w-64 h-64 ${theme.bgPanel} rounded-full flex items-center justify-center mb-6 opacity-50`}>
              <Laugh className="w-32 h-32 opacity-20" />
            </div>
            <h2 className={`text-3xl font-bold ${theme.textMain} mb-2`}>Welcome back, {currentUser.name}!</h2>
            <p className="max-w-md">
              Select a friend to start giggling. 
              <br/>All chats are safe & secure.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatLayout;