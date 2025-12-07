import React, { useState, useEffect, useCallback } from 'react';
import { User, FriendRequest } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { Search, UserPlus, LogOut, Settings, Users, Bell, Check, X, Circle } from 'lucide-react';
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

  const refreshData = useCallback(async () => {
    try {
        const myContacts = await SupabaseService.getContacts(currentUser.id);
        setContacts(myContacts);
        
        const myRequests = await SupabaseService.getIncomingRequests(currentUser.id);
        setRequests(myRequests);
    } catch(e) {
        console.error("Failed to refresh sidebar", e);
    }
  }, [currentUser.id]);

  useEffect(() => {
    refreshData();
    // Use Realtime subscription instead of polling for battery efficiency
    const unsubscribe = SupabaseService.subscribeToRequests(currentUser.id, () => {
        refreshData();
    });
    
    return () => { unsubscribe(); };
  }, [refreshData, currentUser.id]);

  useEffect(() => {
    const doSearch = async () => {
        if (activeTab === 'search' && searchQuery.trim()) {
            const results = await SupabaseService.searchUsers(searchQuery, currentUser.id);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };
    const timer = setTimeout(doSearch, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, currentUser.id]);

  const handleSendRequest = async (userId: string) => {
    const res = await SupabaseService.sendFriendRequest(currentUser.id, userId);
    setNotificationMsg({ type: res.success ? 'success' : 'error', text: res.message });
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleRespond = async (reqId: string, action: 'accept' | 'deny') => {
    await SupabaseService.respondToRequest(reqId, action);
    refreshData();
    if (action === 'deny') {
      setNotificationMsg({ type: 'success', text: "User denied." });
      setTimeout(() => setNotificationMsg(null), 3000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
      case 'busy': return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
      case 'offline': return 'bg-slate-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className={`flex flex-col h-full ${theme.bgPanel} backdrop-blur-md border-r ${theme.border}`}>
      
      {/* Current User Card */}
      <div className={`p-5 mb-2 relative z-10`}>
        <div className={`relative overflow-hidden rounded-2xl p-4 border ${theme.border} bg-white/5 shadow-lg group`}>
            {/* Subtle gradient background inside card */}
            <div className={`absolute inset-0 opacity-10 ${theme.gradient}`}></div>
            
            <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img src={currentUser.avatarUrl} alt="Profile" className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shadow-md" />
                        <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${getStatusColor(currentUser.status)} border-2 border-slate-900 rounded-full`}></span>
                    </div>
                    <div>
                        <h3 className={`font-bold ${theme.textMain} text-sm leading-tight`}>{currentUser.name}</h3>
                        <p className={`text-[11px] ${theme.textMuted} uppercase tracking-wider font-medium mt-0.5 opacity-80`}>{currentUser.status}</p>
                    </div>
                </div>
                
                <div className="flex flex-col gap-1">
                    <button onClick={onOpenSettings} className={`p-2 text-slate-400 hover:text-white bg-black/20 hover:bg-black/40 rounded-lg transition-all`}>
                        <Settings className="w-4 h-4" />
                    </button>
                    <button onClick={onLogout} className={`p-2 text-slate-400 hover:text-red-400 bg-black/20 hover:bg-black/40 rounded-lg transition-all`}>
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-5 mb-4">
        <div className="flex p-1 gap-1 bg-black/30 rounded-xl border border-white/5">
            <button 
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'friends' ? `${theme.primary} text-white shadow-lg` : `${theme.textMuted} hover:bg-white/5 hover:text-white`}`}
            >
            <Users className="w-3.5 h-3.5" /> Friends
            </button>
            <button 
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'search' ? `${theme.primary} text-white shadow-lg` : `${theme.textMuted} hover:bg-white/5 hover:text-white`}`}
            >
            <UserPlus className="w-3.5 h-3.5" /> Add
            </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div className={`mx-5 mb-4 px-3 py-2 rounded-lg text-xs font-bold text-center animate-in fade-in slide-in-from-top-2 border ${notificationMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
          {notificationMsg.text}
        </div>
      )}

      {/* Main List Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {activeTab === 'friends' && (
          <>
            {/* Pending Requests */}
            {requests.length > 0 && (
              <div className="mb-4 mx-2">
                <h4 className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest mb-3 flex items-center gap-2 px-1`}>
                  <Bell className="w-3 h-3" /> Incoming ({requests.length})
                </h4>
                <div className="space-y-2">
                  {requests.map(req => (
                    <div key={req.id} className={`bg-slate-900/40 p-3 rounded-xl border ${theme.border} hover:border-white/20 transition-colors`}>
                      <div className="flex items-center gap-3 mb-3">
                        <img src={req.sender.avatarUrl} className="w-8 h-8 rounded-full" />
                        <span className={`text-sm font-bold ${theme.textMain} truncate`}>{req.sender.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleRespond(req.id, 'accept')}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-[10px] uppercase font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition"
                        >
                          <Check className="w-3 h-3" /> Accept
                        </button>
                        <button 
                          onClick={() => handleRespond(req.id, 'deny')}
                          className="flex-1 bg-white/5 hover:bg-red-500/20 hover:text-red-300 text-slate-400 text-[10px] uppercase font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition"
                        >
                          <X className="w-3 h-3" /> Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friend List */}
            {contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                     <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                        <Users className={`w-6 h-6 ${theme.textMuted} opacity-40`} />
                     </div>
                     <p className={`${theme.textMuted} text-xs`}>No friends yet. <br/> Switch tabs to find people!</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {contacts.map(friend => (
                        <button
                            key={friend.id}
                            onClick={() => onSelectFriend(friend.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${selectedFriendId === friend.id ? 'bg-white/10 shadow-md' : 'hover:bg-white/5'}`}
                        >
                            {/* Selected Indicator Bar */}
                            {selectedFriendId === friend.id && (
                                <div className={`absolute left-0 top-3 bottom-3 w-1 ${theme.primary} rounded-r-full shadow-[0_0_10px_currentColor]`}></div>
                            )}

                            <div className="relative shrink-0">
                                <img src={friend.avatarUrl} className={`w-10 h-10 rounded-full object-cover border-2 ${selectedFriendId === friend.id ? 'border-white/40' : 'border-transparent group-hover:border-white/20'} transition-all`} />
                                <span className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(friend.status)} border-2 border-slate-900 rounded-full`}></span>
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <h4 className={`text-sm font-bold truncate ${selectedFriendId === friend.id ? 'text-white' : theme.textMain} group-hover:text-white transition-colors`}>{friend.name}</h4>
                                <p className={`text-[11px] truncate ${theme.textMuted} group-hover:text-slate-300 transition-colors`}>
                                    {friend.isBot ? "AI Assistant" : friend.status}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
          </>
        )}

        {activeTab === 'search' && (
          <div className="px-2 pt-2">
            <div className="relative mb-4 group">
              <div className={`absolute -inset-0.5 ${theme.gradient} rounded-xl blur opacity-20 group-focus-within:opacity-50 transition duration-500`}></div>
              <div className="relative">
                <Search className={`absolute left-3 top-2.5 w-4 h-4 ${theme.textMuted}`} />
                <input 
                    type="text" 
                    placeholder="Search username or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl pl-10 pr-4 py-2.5 text-sm ${theme.textMain} focus:outline-none placeholder-slate-500 transition-all`}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              {searchResults.length === 0 && searchQuery && (
                <div className={`text-center ${theme.textMuted} text-xs py-8`}>No users found.</div>
              )}
              {searchResults.map(user => (
                <div key={user.id} className={`flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={user.avatarUrl} className="w-9 h-9 rounded-full bg-slate-800" />
                    <div className="min-w-0">
                      <div className={`text-sm font-bold ${theme.textMain} truncate`}>{user.name}</div>
                      <div className={`text-[10px] ${theme.textMuted} truncate`}>{user.email}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSendRequest(user.id)}
                    className={`p-2 ${theme.primary} hover:brightness-110 text-white rounded-lg transition shadow-lg active:scale-95`}
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