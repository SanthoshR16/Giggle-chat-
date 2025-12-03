import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { Backend } from '../services/mockBackend';
import { analyzeToxicity, getAIChatResponse } from '../services/geminiService';
import { Send, AlertTriangle, Shield, EyeOff, Loader2, Bot, Video, Phone, ExternalLink } from 'lucide-react';
import { THEMES } from '../theme';

interface ChatWindowProps {
  currentUser: User;
  friendId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, friendId }) => {
  const [friend, setFriend] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [systemAlert, setSystemAlert] = useState<{title: string, msg: string, type: 'warn'|'block'} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const theme = THEMES[currentUser.theme || 'midnight'];

  useEffect(() => {
    const users = Backend.getAllUsers();
    setFriend(users.find(u => u.id === friendId) || null);
    
    // Load messages
    const updateMessages = () => {
      setMessages(Backend.getMessages(currentUser.id, friendId));
    };
    
    updateMessages();
    const interval = setInterval(updateMessages, 2000); 
    return () => clearInterval(interval);
  }, [currentUser.id, friendId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleCall = (type: 'video' | 'audio') => {
    const meetLink = `https://meet.google.com/new`;
    const callMsg: Message = {
      id: `msg_${Date.now()}`,
      conversationId: [currentUser.id, friendId].sort().join('_'),
      senderId: currentUser.id,
      receiverId: friendId,
      text: type === 'video' ? `Started a video call` : `Started a voice call`,
      type: 'call_link',
      timestamp: Date.now(),
      status: 'sent',
    };
    Backend.sendMessage(callMsg);
    setMessages(prev => [...prev, callMsg]);
    window.open(meetLink, '_blank');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText;
    setInputText(''); 
    
    const isBotChat = friend?.isBot;
    const conversationId = [currentUser.id, friendId].sort().join('_');

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      senderId: currentUser.id,
      receiverId: friendId,
      text: textToSend,
      timestamp: Date.now(),
      status: 'pending', 
    };

    setMessages(prev => [...prev, optimisticMessage]);

    setTimeout(async () => {
        let finalStatus: Message['status'] = 'sent';
        let toxicityResult;

        if (!isBotChat) {
            toxicityResult = await analyzeToxicity(textToSend);
            optimisticMessage.toxicity = toxicityResult;
            
            if (toxicityResult.flagged) {
                const result = await Backend.sendMessage({ ...optimisticMessage, toxicity: toxicityResult });
                
                if (result.blocked) {
                    setSystemAlert({
                        title: "You have been blocked",
                        msg: "Multiple toxic messages detected. You can no longer message this user.",
                        type: 'block'
                    });
                    finalStatus = 'quarantined';
                } else if (result.warning) {
                    setSystemAlert({
                        title: "Warning: Toxic Content",
                        msg: "This message was withheld. One more toxic message and you will be blocked.",
                        type: 'warn'
                    });
                    finalStatus = 'quarantined';
                }
            } else {
                await Backend.sendMessage(optimisticMessage);
            }
        } else {
            await Backend.sendMessage(optimisticMessage);
        }

        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: finalStatus, toxicity: toxicityResult } : m));

        if (isBotChat && finalStatus !== 'quarantined') {
            setIsTyping(true);
            const aiResponseText = await getAIChatResponse(textToSend, currentUser.customBotName || "Nexus AI");
            
            const botMessage: Message = {
                id: `msg_${Date.now()}_bot`,
                conversationId,
                senderId: friendId,
                receiverId: currentUser.id,
                text: aiResponseText,
                timestamp: Date.now(),
                status: 'delivered'
            };
            
            await Backend.sendMessage(botMessage);
            setMessages(prev => [...prev, botMessage]);
            setIsTyping(false);
        }
    }, 10);
  };

  if (!friend) return <div className={`flex-1 ${theme.bgPage} flex items-center justify-center ${theme.textMuted}`}>Loading...</div>;

  const botDisplayName = friend.isBot ? (currentUser.customBotName || friend.name) : friend.name;

  return (
    <div className={`flex flex-col h-full ${theme.bgPage} relative`}>
      
      {/* System Alert Overlay */}
      {systemAlert && (
        <div className="absolute top-20 left-4 right-4 z-50 animate-in fade-in slide-in-from-top-4">
            <div className={`p-4 rounded-xl border shadow-2xl flex items-start gap-3 ${systemAlert.type === 'block' ? 'bg-red-900/95 border-red-500 text-white' : 'bg-orange-900/95 border-orange-500 text-orange-100'}`}>
                {systemAlert.type === 'block' ? <Shield className="w-6 h-6 shrink-0" /> : <AlertTriangle className="w-6 h-6 shrink-0" />}
                <div className="flex-1">
                    <h3 className="font-bold">{systemAlert.title}</h3>
                    <p className="text-sm opacity-90">{systemAlert.msg}</p>
                </div>
                <button onClick={() => setSystemAlert(null)} className="text-xs uppercase font-bold px-2 py-1 bg-black/20 rounded hover:bg-black/40">Dismiss</button>
            </div>
        </div>
      )}

      {/* Header */}
      <div className={`px-6 py-3 ${theme.bgPanel} border-b ${theme.border} flex items-center justify-between z-10 shadow-sm`}>
        <div className="flex items-center gap-4">
            <div className="relative">
            <img src={friend.avatarUrl} alt={friend.name} className={`w-10 h-10 rounded-full object-cover ${friend.isBot ? 'p-1 bg-blue-500/20' : ''}`} />
            {friend.isBot && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5"><Bot size={10} /></div>}
            </div>
            <div>
            <h2 className={`${theme.textMain} font-bold text-lg flex items-center gap-2`}>
                {botDisplayName}
                {friend.isBot && <span className="bg-blue-500/20 text-blue-300 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Bot</span>}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
                {friend.isBot ? (
                    <span className="text-blue-400 font-medium">Always active</span>
                ) : (
                    <>
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        <span className={`${theme.textMuted}`}>Secure</span>
                    </>
                )}
            </div>
            </div>
        </div>
        
        {/* Call Buttons */}
        {!friend.isBot && (
            <div className="flex gap-2">
                <button onClick={() => handleCall('audio')} className={`p-2.5 bg-black/20 hover:${theme.primary} ${theme.textMuted} hover:text-white rounded-full transition-all`} title="Audio Call">
                    <Phone className="w-5 h-5" />
                </button>
                <button onClick={() => handleCall('video')} className={`p-2.5 bg-black/20 hover:bg-emerald-600 ${theme.textMuted} hover:text-white rounded-full transition-all`} title="Video Call">
                    <Video className="w-5 h-5" />
                </button>
            </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const isQuarantined = msg.status === 'quarantined';
          const isPending = msg.status === 'pending';
          const isCall = msg.type === 'call_link';

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                
                {/* Bubble */}
                <div 
                  className={`
                    p-3.5 rounded-2xl text-sm leading-relaxed relative shadow-sm font-medium
                    ${isCall 
                        ? 'bg-slate-700 border border-slate-600 w-64 text-slate-100' 
                        : isMe 
                            ? `${theme.bubbleMe} rounded-tr-none` 
                            : `${theme.bubbleOther} rounded-tl-none`}
                    ${isQuarantined ? 'bg-red-900/50 border border-red-700 text-red-200' : ''}
                    ${isPending ? 'opacity-80' : ''}
                  `}
                >
                  {isQuarantined ? (
                    <div className="flex items-center gap-2 italic">
                      <EyeOff className="w-4 h-4" />
                      <span>Message blocked (Toxic)</span>
                    </div>
                  ) : isCall ? (
                     <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-semibold text-slate-200">
                             <Video className="w-4 h-4 text-emerald-400" /> 
                             {msg.text}
                        </div>
                        <a 
                            href="https://meet.google.com/new" 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-center py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition"
                        >
                            Join Google Meet <ExternalLink className="w-3 h-3"/>
                        </a>
                     </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.text}</span>
                  )}
                </div>

                {/* Metadata / Warnings */}
                <div className="flex flex-col mt-1 space-y-1">
                  {isQuarantined && isMe && (
                    <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full w-fit">
                      <Shield className="w-3 h-3" />
                      <span>Strike applied</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
            <div className="flex justify-start">
                <div className={`${theme.bubbleOther} p-3 rounded-2xl rounded-tl-none flex gap-1`}>
                    <span className="w-2 h-2 bg-current opacity-60 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-current opacity-60 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-current opacity-60 rounded-full animate-bounce delay-150"></span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`p-4 ${theme.bgPanel} border-t ${theme.border}`}>
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={friend.isBot ? `Message ${botDisplayName}...` : "Type a message..."}
            className={`flex-1 ${theme.inputBg} border ${theme.border} rounded-xl px-4 py-3 ${theme.textMain} placeholder-opacity-50 focus:outline-none focus:ring-1 focus:ring-current transition-all`}
            disabled={systemAlert?.type === 'block' && !friend.isBot}
          />
          <button 
            type="submit" 
            disabled={!inputText.trim()}
            className={`p-3 ${theme.primary} ${theme.primaryHover} disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg transform active:scale-95`}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        {!friend.isBot && (
            <div className="text-center mt-2">
            <span className={`text-[10px] ${theme.textMuted} flex items-center justify-center gap-1`}>
                <Shield className="w-3 h-3" /> Safety: 1 Warning → Block
            </span>
            </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;