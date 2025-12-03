import React, { useState, useEffect, useCallback } from 'react';
import { User, FriendRequest } from '../types';
import { Backend } from '../services/mockBackend';
import { Search, UserPlus, LogOut, Settings, Users, Bell, Check, X } from 'lucide-react';
import { THEMES } from '../theme';

interface SidebarProps {
  currentUser: User;
  onSelectFriend: (id: string) => void;
  selectedFriendId: string | null;
  onLogout: () => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentUser, onSelectFriend, selectedFriendId, onLogout, onOpenSettings }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'search'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [requests, setRequests] = useState<(FriendRequest & { sender: User })[]>([]);
  const [notificationMsg, setNotificationMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const theme = THEMES[currentUser.theme || 'midnight'];

  const refreshData = useCallback(() => {
    setContacts(Backend.getContacts(currentUser.id));
    setRequests(Backend.getIncomingRequests(currentUser.id));
  }, [currentUser.id]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000); 
    return () => clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    if (activeTab === 'search' && searchQuery.trim()) {
      const all = Backend.getAllUsers();
      const filtered = all.filter(u => 
        u.id !== currentUser.id && 
        (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.includes(searchQuery.toLowerCase()))
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, activeTab, currentUser.id]);

  const handleSendRequest = async (userId: string) => {
    const res = await Backend.sendFriendRequest(currentUser.id, userId);
    setNotificationMsg({ type: res.success ? 'success' : 'error', text: res.message });
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleRespond = async (reqId: string, action: 'accept' | 'deny') => {
    await Backend.respondToRequest(reqId, action);
    refreshData();
    if (action === 'deny') {
      setNotificationMsg({ type: 'success', text: "User denied and blocked." });
      setTimeout(() => setNotificationMsg(null), 3000);
    }
  };

  return (
    <div className={`flex flex-col h-full ${theme.bgPanel} ${theme.textMain}`}>
      {/* Header */}
      <div className={`p-4 ${theme.bgPanel} border-b ${theme.border} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <img src={currentUser.avatarUrl} alt="Profile" className={`w-10 h-10 rounded-full border ${theme.border}`} />
          <div>
            <h3 className={`font-bold ${theme.textMain} text-sm`}>{currentUser.name}</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className={`text-xs ${theme.textMuted}`}>Online</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onOpenSettings} className={`p-2 ${theme.textMuted} hover:${theme.textMain} rounded-full hover:bg-black/10 transition`}>
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={onLogout} className={`p-2 ${theme.textMuted} hover:text-red-400 rounded-full hover:bg-black/10 transition`}>
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex p-2 gap-2 bg-black/10`}>
        <button 
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition ${activeTab === 'friends' ? `${theme.primary} text-white shadow-md` : `${theme.textMuted} hover:bg-black/10`}`}
        >
          <Users className="w-4 h-4" /> Friends
        </button>
        <button 
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition ${activeTab === 'search' ? `${theme.primary} text-white shadow-md` : `${theme.textMuted} hover:bg-black/10`}`}
        >
          <UserPlus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Toast Notification */}
      {notificationMsg && (
        <div className={`mx-4 mt-2 p-2 rounded text-xs font-bold text-center ${notificationMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {notificationMsg.text}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'friends' && (
          <>
            {/* Friend Requests */}
            {requests.length > 0 && (
              <div className={`p-4 border-b ${theme.border}`}>
                <h4 className={`text-xs font-bold ${theme.textMuted} uppercase mb-3 flex items-center gap-2`}>
                  <Bell className="w-3 h-3" /> Requests ({requests.length})
                </h4>
                <div className="space-y-3">
                  {requests.map(req => (
                    <div key={req.id} className={`bg-black/20 p-3 rounded-lg border ${theme.border}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <img src={req.sender.avatarUrl} className="w-8 h-8 rounded-full" />
                        <span className={`text-sm font-bold ${theme.textMain} truncate`}>{req.sender.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleRespond(req.id, 'accept')}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-1.5 rounded flex items-center justify-center gap-1 transition font-medium"
                        >
                          <Check className="w-3 h-3" /> Accept
                        </button>
                        <button 
                          onClick={() => handleRespond(req.id, 'deny')}
                          className="flex-1 bg-slate-700 hover:bg-red-600 hover:text-white text-slate-300 text-xs py-1.5 rounded flex items-center justify-center gap-1 transition group font-medium"
                        >
                          <X className="w-3 h-3" /> Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contacts List */}
            <div className="p-2 space-y-1">
              {contacts.length === 0 ? (
                <div className={`text-center ${theme.textMuted} text-sm py-8`}>No friends yet.</div>
              ) : (
                contacts.map(friend => (
                  <button
                    key={friend.id}
                    onClick={() => onSelectFriend(friend.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedFriendId === friend.id ? 'bg-black/20 shadow-inner' : 'hover:bg-black/10'}`}
                  >
                    <div className="relative">
                      <img src={friend.avatarUrl} className={`w-12 h-12 rounded-full border-2 ${selectedFriendId === friend.id ? theme.border : 'border-transparent'}`} />
                      {friend.status === 'online' && <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 ${theme.bgPanel} rounded-full`}></span>}
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className={`text-sm font-bold ${selectedFriendId === friend.id ? theme.textMain : theme.textMain}`}>{friend.name}</h4>
                      <p className={`text-xs ${theme.textMuted} truncate`}>Click to giggle</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'search' && (
          <div className="p-4">
            <div className="relative mb-4">
              <Search className={`absolute left-3 top-2.5 w-4 h-4 ${theme.textMuted}`} />
              <input 
                type="text" 
                placeholder="Find users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${theme.inputBg} border ${theme.border} rounded-lg pl-9 pr-4 py-2 text-sm ${theme.textMain} focus:outline-none focus:ring-1 focus:ring-opacity-50 transition-all placeholder-opacity-50`}
              />
            </div>
            
            <div className="space-y-2">
              {searchResults.length === 0 && searchQuery && (
                <div className={`text-center ${theme.textMuted} text-xs`}>No users found.</div>
              )}
              {searchResults.map(user => (
                <div key={user.id} className={`flex items-center justify-between p-3 bg-black/20 rounded-lg border ${theme.border}`}>
                  <div className="flex items-center gap-3">
                    <img src={user.avatarUrl} className="w-8 h-8 rounded-full" />
                    <div>
                      <div className={`text-sm font-bold ${theme.textMain}`}>{user.name}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSendRequest(user.id)}
                    className={`p-2 ${theme.primary} ${theme.primaryHover} text-white rounded-lg transition shadow-md`}
                    title="Send Friend Request"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;