import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { User, Message } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { analyzeToxicity, getAIChatResponse } from '../services/geminiService';
import { Send, AlertTriangle, Shield, EyeOff, Loader2, Bot, Video, Phone, ExternalLink, ArrowLeft, Check, CheckCheck, Image as ImageIcon, X, ArrowDown, ImagePlus } from 'lucide-react';
import { THEMES } from '../theme';

interface ChatWindowProps {
  currentUser: User;
  friendId: string;
  onBack?: () => void;
}

type UploadStatus = 'idle' | 'compressing' | 'sending';

const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, friendId, onBack }) => {
  const [friend, setFriend] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [systemAlert, setSystemAlert] = useState<{title: string, msg: string, type: 'warn'|'block'} | null>(null);
  const [amIBlocked, setAmIBlocked] = useState(false);
  
  // Enhanced Upload State
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  
  // UI States
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);
  const isUserAtBottom = useRef(true); // Track if user is at bottom to decide auto-scroll

  const theme = THEMES[currentUser.theme || 'midnight'];

  // --- Scroll Logic ---

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    // Reset state after forced scroll
    setShowScrollButton(false);
    isUserAtBottom.current = true;
  }, []);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // We consider "at bottom" if within 100px of the end
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom < 100;
    
    isUserAtBottom.current = isAtBottom;
    setShowScrollButton(!isAtBottom);
  };

  // Optimized Image Compression
  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          setTimeout(() => {
              try {
                  const canvas = document.createElement('canvas');
                  const MAX_WIDTH = 800; 
                  const MAX_HEIGHT = 800;
                  let width = img.width;
                  let height = img.height;

                  if (width > height) {
                    if (width > MAX_WIDTH) {
                      height *= MAX_WIDTH / width;
                      width = MAX_WIDTH;
                    }
                  } else {
                    if (height > MAX_HEIGHT) {
                      width *= MAX_HEIGHT / height;
                      height = MAX_HEIGHT;
                    }
                  }

                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                     ctx.drawImage(img, 0, 0, width, height);
                     const dataUrl = canvas.toDataURL('image/jpeg', 0.5); 
                     resolve(dataUrl);
                  } else {
                     reject(new Error("Canvas context failed"));
                  }
              } catch (e) {
                  reject(e);
              }
          }, 0);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  // 1. Initial Data Fetch & Realtime
  useEffect(() => {
    isInitialLoad.current = true;
    isUserAtBottom.current = true;
    setMessages([]); 
    
    SupabaseService.getContacts(currentUser.id).then(contacts => {
        const f = contacts.find(c => c.id === friendId);
        if (f) {
            setFriend(f);
        } else {
            if (friendId === 'nexus-ai') {
                setFriend({ id: 'nexus-ai', name: 'Giggle AI', email: 'ai@giggle.bot', avatarUrl: 'https://cdn-icons-png.flaticon.com/512/4712/4712027.png', status: 'online', isBot: true });
            } else {
                SupabaseService.searchUsers('', currentUser.id).then(() => {
                    setFriend({ id: friendId, name: 'User', email: '', avatarUrl: 'https://via.placeholder.com/50', status: 'offline' });
                });
            }
        }
    });

    SupabaseService.getMessages(currentUser.id, friendId).then(msgs => {
        setMessages(msgs);
    });

    const checkBlocks = () => {
        SupabaseService.isBlocked(friendId, currentUser.id).then(setAmIBlocked);
    };
    checkBlocks();

    if (friendId !== 'nexus-ai') {
        const unsubMsg = SupabaseService.subscribeToMessages(currentUser.id, friendId, (newMsg) => {
            setMessages(prev => {
                const exists = prev.findIndex(m => m.id === newMsg.id);
                // Update existing (e.g., status change)
                if (exists !== -1) return prev.map((m, i) => i === exists ? newMsg : m);
                // Append new
                return [...prev, newMsg];
            });
            if (newMsg.receiverId === currentUser.id && newMsg.status !== 'read') {
                 SupabaseService.markMessageAsRead(newMsg.id);
            }
        });

        const unsubBlocks = SupabaseService.subscribeToBlocks(currentUser.id, friendId, checkBlocks);
        const unsubTyping = SupabaseService.subscribeToTyping(currentUser.id, friendId, setIsFriendTyping);

        return () => { unsubMsg(); unsubBlocks(); unsubTyping(); };
    }
  }, [currentUser.id, friendId]);

  // 2. Smart Auto-Scroll Effect
  useLayoutEffect(() => {
    if (messages.length > 0) {
       const lastMsg = messages[messages.length - 1];
       const isMe = lastMsg.senderId === currentUser.id;

       if (isInitialLoad.current) {
         // Initial Load: Instant jump
         scrollToBottom('auto');
         setTimeout(() => {
             scrollToBottom('auto'); 
             isInitialLoad.current = false;
         }, 50);
       } else if (isMe || isUserAtBottom.current) {
         // New message from Me OR User was already at bottom -> Smooth scroll
         scrollToBottom('smooth');
       }
       // If user is scrolled up and receives a message, we do NOTHING (let them read).
       // The scroll button handles the "Back to bottom" action.
    }
  }, [messages, friendId, scrollToBottom]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputText(e.target.value);
      if (!isTyping && friendId !== 'nexus-ai') {
          setIsTyping(true);
          SupabaseService.sendTyping(currentUser.id, friendId, true);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          if (friendId !== 'nexus-ai') SupabaseService.sendTyping(currentUser.id, friendId, false);
      }, 2000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (fileInputRef.current) fileInputRef.current.value = '';

      setUploadStatus('compressing');
      
      try {
          const compressedBase64 = await compressImage(file);
          setUploadStatus('sending');
          await processAndSendMessage(compressedBase64, 'image');
      } catch (err) {
          console.error("Image upload failed", err);
          alert("Failed to upload image. Please try a smaller file.");
      } finally {
          setUploadStatus('idle');
      }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend) return;
    
    // 1. Clear input IMMEDIATELY
    setInputText(''); 
    
    // 2. Reset typing status immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    if (friendId !== 'nexus-ai') SupabaseService.sendTyping(currentUser.id, friendId, false);

    // 3. Process
    await processAndSendMessage(textToSend, 'text');
  };

  const processAndSendMessage = async (content: string, type: 'text' | 'image') => {
    if (!friend) return;
    const isBotChat = friend.isBot;
    const conversationId = [currentUser.id, friendId].sort().join('_');
    const tempId = `temp_${Date.now()}`;

    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      senderId: currentUser.id,
      receiverId: friendId,
      text: type === 'text' ? content : 'Sent an image',
      imageUrl: type === 'image' ? content : undefined,
      type: type,
      timestamp: Date.now(),
      status: 'pending', 
    };

    // Update UI immediately
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Force scroll because I sent it
    isUserAtBottom.current = true;
    requestAnimationFrame(() => scrollToBottom('smooth'));

    try {
        let msgToSend = { ...optimisticMessage };
        let toxicityResult;

        // Perform Toxicity Check for Text
        if (!isBotChat && type === 'text') {
            try {
              toxicityResult = await analyzeToxicity(content);
              msgToSend.toxicity = toxicityResult;
            } catch (toxError) {
              console.warn("Toxicity check skipped due to error, proceeding safely.");
            }

            if (toxicityResult && toxicityResult.flagged) {
                msgToSend.status = 'quarantined';
                setSystemAlert({ title: "Message Hidden", msg: "Message flagged as toxic.", type: 'warn' });
            } else {
                msgToSend.status = 'sent';
            }
        } else {
            msgToSend.status = 'sent';
        }

        // Send to DB
        const { data: sentMsg, error } = await SupabaseService.sendMessage(msgToSend);
        
        if (error) throw new Error(error);

        // Replace optimistic with real
        if (sentMsg) {
             setMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m));
        }

        // Bot Response
        if (isBotChat && msgToSend.status !== 'quarantined' && type === 'text') {
            const aiResponseText = await getAIChatResponse(content, currentUser.customBotName || "Nexus AI");
            const botMessage: Message = {
                id: `msg_${Date.now()}_bot`,
                conversationId,
                senderId: friendId,
                receiverId: currentUser.id,
                text: aiResponseText,
                timestamp: Date.now(),
                status: 'delivered'
            };
            await SupabaseService.sendMessage(botMessage);
            setMessages(prev => [...prev, botMessage]);
        }
    } catch (error: any) {
        console.error("Message send failed:", error);
        setMessages(prev => prev.filter(m => m.id !== tempId)); // Remove if failed
        setSystemAlert({ 
            title: "Failed to Send", 
            msg: "Could not send message. Check connection.", 
            type: 'warn' 
        });
    }
  };

  const handleReaction = (msgId: string, emoji: string) => {
     setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
            const newReactions: Record<string, string> = { ...(m.reactions || {}) };
            if (newReactions[currentUser.id] === emoji) {
                delete newReactions[currentUser.id];
            } else {
                newReactions[currentUser.id] = emoji;
            }
            return { ...m, reactions: newReactions };
        }
        return m;
     }));
     setHoveredMessageId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]';
      case 'busy': return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]';
      case 'offline': return 'bg-slate-500';
      default: return 'bg-slate-400';
    }
  };

  if (!friend) return <div className={`flex-1 ${theme.bgPage} flex items-center justify-center ${theme.textMuted}`}><Loader2 className="animate-spin"/></div>;
  const botDisplayName = friend.isBot ? (currentUser.customBotName || friend.name) : friend.name;
  const isBusy = uploadStatus !== 'idle';
  
  return (
    <div className={`flex flex-col h-full ${theme.bgPage} relative overflow-hidden`}>
      
      {/* Lightbox Overlay */}
      {enlargedImage && (
        <div 
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setEnlargedImage(null)}
        >
            <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20">
                <X className="w-6 h-6" />
            </button>
            <img 
                src={enlargedImage} 
                className="max-w-full max-h-full rounded-lg shadow-2xl scale-100 object-contain"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
      )}

      {/* Alert Overlay */}
      {systemAlert && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 max-w-sm w-full px-4">
            <div className={`p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-start gap-3 ${systemAlert.type === 'block' ? 'bg-red-900/80 border-red-500 text-white' : 'bg-orange-900/80 border-orange-500 text-orange-100'}`}>
                {systemAlert.type === 'block' ? <Shield className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                <div className="flex-1">
                    <h3 className="font-bold text-sm">{systemAlert.title}</h3>
                    <p className="text-xs opacity-90">{systemAlert.msg}</p>
                </div>
                <button onClick={() => setSystemAlert(null)} className="text-xs font-bold hover:underline">Dismiss</button>
            </div>
        </div>
      )}

      {/* Header */}
      <div className={`px-4 py-3 ${theme.bgPanel} border-b ${theme.border} backdrop-blur-md flex items-center justify-between z-10 shadow-sm shrink-0`}>
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative group cursor-pointer">
                <img src={friend.avatarUrl} className={`w-10 h-10 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-white/30 transition-all`} />
                {friend.isBot && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 shadow-sm"><Bot size={10} /></div>}
            </div>
            <div>
                <h2 className={`${theme.textMain} font-bold text-lg flex items-center gap-2 leading-none`}>
                    {botDisplayName}
                    {friend.isBot && <span className="bg-blue-500/20 text-blue-300 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Bot</span>}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    {isFriendTyping ? (
                        <span className="text-emerald-400 font-medium animate-pulse flex items-center gap-1">Typing<span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span></span>
                    ) : (
                        <>
                            <span className={`w-2 h-2 ${getStatusColor(friend.status)} rounded-full`}></span>
                            <span className={`${theme.textMuted} capitalize font-medium opacity-80`}>{friend.isBot ? 'Always Active' : friend.status}</span>
                        </>
                    )}
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            {!friend.isBot && (
                <>
                    <button className={`p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-blue-400 transition-all`}><Phone className="w-4 h-4" /></button>
                    <button className={`p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-emerald-400 transition-all mr-1`}><Video className="w-4 h-4" /></button>
                </>
            )}
        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-6 relative z-10 scroll-smooth" 
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser.id;
          const isQuarantined = msg.status === 'quarantined';
          const isCall = msg.type === 'call_link';
          const isImage = msg.type === 'image';
          
          const reactionCounts: Record<string, number> = {};
          let myReaction: string | null = null;
          if (msg.reactions) {
              Object.entries(msg.reactions as Record<string, string>).forEach(([uid, emoji]) => {
                  reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
                  if (uid === currentUser.id) myReaction = emoji;
              });
          }
          const sortedReactions = Object.entries(reactionCounts).sort((a, b) => b[1] - a[1]);

          return (
            <div 
                key={msg.id} 
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative mb-2`}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
            >
              {/* Reaction Toolbar */}
              {hoveredMessageId === msg.id && !isQuarantined && (
                  <div className={`absolute -top-10 ${isMe ? 'right-0' : 'left-0'} bg-slate-800/90 backdrop-blur-md rounded-full shadow-lg border border-white/10 flex gap-2 p-1.5 animate-in fade-in zoom-in-90 z-20`}>
                      {['❤️', '😂', '👍', '🔥', '😮', '😢'].map(emoji => (
                          <button 
                            key={emoji} 
                            onClick={() => handleReaction(msg.id, emoji)} 
                            className={`hover:bg-white/20 w-7 h-7 flex items-center justify-center rounded-full text-lg transition-all active:scale-90 ${myReaction === emoji ? 'bg-white/20' : ''}`}
                          >
                              {emoji}
                          </button>
                      ))}
                  </div>
              )}

              <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'} relative`}>
                <div className={`
                    relative text-sm leading-relaxed shadow-lg
                    ${isCall ? 'p-4 bg-slate-800/80 border border-slate-700 w-64 text-slate-100 rounded-2xl' : ''}
                    ${isImage ? 'rounded-2xl overflow-hidden border border-white/10 bg-black/20' : ''}
                    ${!isCall && !isImage ? `p-3.5 px-5 rounded-2xl ${isMe ? `${theme.bubbleMe} rounded-br-sm` : `${theme.bubbleOther} rounded-bl-sm`}` : ''}
                    ${isQuarantined ? 'bg-red-900/40 border border-red-500/30 text-red-200 p-3 rounded-xl' : ''}
                  `}>
                  
                  {isQuarantined ? (
                    <div className="flex items-center gap-2 italic text-xs"><EyeOff className="w-4 h-4" /> Message hidden (Toxic)</div>
                  ) : isCall ? (
                     <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 font-bold text-slate-200">
                             {msg.text.includes('video') ? <Video className="w-5 h-5 text-emerald-400" /> : <Phone className="w-5 h-5 text-blue-400" />} {msg.text}
                        </div>
                        <a href="https://meet.google.com/new" target="_blank" className="bg-emerald-600 hover:bg-emerald-500 text-white text-center py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg">Join Call <ExternalLink className="w-3 h-3"/></a>
                     </div>
                  ) : isImage ? (
                      <div className="relative group cursor-pointer" onClick={() => setEnlargedImage(msg.imageUrl || null)}>
                          <img 
                            src={msg.imageUrl} 
                            className="max-w-full h-auto max-h-72 object-cover transition-transform duration-300 group-hover:scale-105" 
                            onLoad={() => {
                                // Smart scroll for images
                                if (isUserAtBottom.current) {
                                    scrollToBottom('smooth');
                                }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                      </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.text}</span>
                  )}
                </div>

                {/* Reaction Display Pills */}
                {sortedReactions.length > 0 && (
                     <div className={`absolute -bottom-5 ${isMe ? 'left-0' : 'right-0'} flex gap-1 z-10 translate-y-2`}>
                        {sortedReactions.map(([emoji, count]) => {
                           const isMyReaction = myReaction === emoji;
                           return (
                               <button 
                                 key={emoji}
                                 onClick={() => handleReaction(msg.id, emoji)}
                                 className={`
                                   flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs shadow-sm border transition-all active:scale-95
                                   ${isMyReaction 
                                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-100 ring-1 ring-blue-500/30' 
                                      : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700'
                                   }
                                 `}
                               >
                                   <span>{emoji}</span>
                                   {count > 1 && <span className="text-[10px] font-bold opacity-80">{count}</span>}
                               </button>
                           );
                        })}
                     </div>
                )}

                {/* Metadata Row */}
                <div className={`flex items-center gap-1 mt-1 text-[10px] ${theme.textMuted} opacity-60 px-1 ${sortedReactions.length > 0 ? 'mt-3' : ''}`}>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    {isMe && !isQuarantined && (
                        msg.status === 'read' ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3" />
                    )}
                </div>
              </div>
            </div>
          );
        })}
        
        {isFriendTyping && (
             <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                 <div className={`${theme.bubbleOther} p-4 rounded-2xl rounded-bl-sm flex gap-1.5 items-center shadow-lg w-16 justify-center`}>
                    <span className="w-1.5 h-1.5 bg-current opacity-60 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-current opacity-60 rounded-full animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 bg-current opacity-60 rounded-full animate-bounce delay-150"></span>
                </div>
            </div>
        )}

        {/* Invisible Element to Scroll To */}
        <div ref={messagesEndRef} className="h-px w-full" />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollButton && (
        <button 
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-24 right-6 z-30 p-3 bg-slate-800/90 backdrop-blur border border-white/10 rounded-full shadow-xl text-white hover:bg-slate-700 transition-all animate-in fade-in zoom-in duration-200 hover:scale-110"
        >
          <ArrowDown className="w-5 h-5" />
          {/* Unread badge could go here */}
        </button>
      )}

      {/* Footer */}
      <div className={`p-4 ${theme.bgPanel} border-t ${theme.border} backdrop-blur-xl z-20`}>
        {amIBlocked && (
             <div className="mb-3 p-3 bg-red-900/30 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 animate-in slide-in-from-bottom-2">
                <Shield className="w-4 h-4 text-red-500" />
                <span className="text-red-300 font-bold text-xs">Blocking is active.</span>
             </div>
        )}
        
        <form onSubmit={handleSendMessage} className="relative flex items-end gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            
            <button 
                type="button" 
                onClick={() => !isBusy && fileInputRef.current?.click()} 
                disabled={isBusy}
                className={`p-3.5 bg-white/5 border border-white/5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Send Image"
            >
                {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            </button>
            
            <div className={`flex-1 relative transition-all group focus-within:ring-2 focus-within:ring-rose-500/50 rounded-2xl ${theme.inputBg}`}>
                <input
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder={uploadStatus === 'idle' ? `Message ${botDisplayName}...` : ''}
                    className={`w-full bg-transparent border border-white/5 rounded-2xl px-5 py-3.5 ${theme.textMain} placeholder-slate-500/50 focus:outline-none transition-all`}
                    disabled={(systemAlert?.type === 'block' && !friend.isBot) || isBusy}
                />
                
                {/* Upload Status Overlay inside Input */}
                {uploadStatus !== 'idle' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl backdrop-blur-sm animate-in fade-in">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {uploadStatus === 'compressing' ? 'Compressing Image...' : 'Sending...'}
                        </div>
                    </div>
                )}
            </div>
            
            <button 
                type="submit" 
                disabled={!inputText.trim() || isBusy} 
                className={`p-3.5 ${theme.primary} hover:brightness-110 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-white rounded-2xl transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.39)] transform active:scale-95 flex items-center justify-center group`}
            >
                <Send className="w-5 h-5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;