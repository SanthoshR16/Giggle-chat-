import { createClient } from '@supabase/supabase-js';
import { User, Message } from '../types';

// ==========================================
// CONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://jptfpbtstsqyokenukvv.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwdGZwYnRzdHNxeW9rZW51a3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDY4NTUsImV4cCI6MjA4MDE4Mjg1NX0.V-KbcpaOSzMnUt3CQj0Mxs3mpZ-q2F2PjbqMOl4jUmY';

const isValidUrl = (url: string) => url && url.startsWith('http');

// Initialize with explicit persistence settings
export const supabase = createClient(
    isValidUrl(SUPABASE_URL) ? SUPABASE_URL : 'https://placeholder.supabase.co', 
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'giggle_auth_token'
      }
    }
);

const NEXUS_BOT_ID = 'nexus-ai';

// ==========================================
// HELPERS
// ==========================================

const mapProfileToUser = (profile: any): User => ({
  id: profile.id,
  name: profile.full_name || profile.name || 'Anonymous', 
  email: profile.email || '',
  avatarUrl: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=random`,
  status: (profile.status as any) || 'online',
  theme: profile.theme || 'midnight',
  isBot: profile.is_bot || false,
  customBotName: profile.custom_bot_name
});

const getBotUser = (): User => ({ 
  id: 'nexus-ai', 
  name: 'Giggle AI', 
  email: 'ai@giggle.bot', 
  avatarUrl: 'https://cdn-icons-png.flaticon.com/512/4712/4712027.png', 
  status: 'online', 
  isBot: true, 
  theme: 'midnight' 
});

// ==========================================
// SERVICE
// ==========================================

export const SupabaseService = {
  // --- AUTH & PROFILE ---

  login: async (email: string, password: string) => {
    if (!isValidUrl(SUPABASE_URL)) return { error: "Supabase URL missing." };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    // Optimistic return
    return { user: { id: data.user?.id, email, name: 'User' } };
  },

  register: async (name: string, email: string, password: string) => {
    if (!isValidUrl(SUPABASE_URL)) return { error: "Supabase URL missing." };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });
    if (error) return { error: error.message };
    
    // Create profile in background
    if (data.user) {
        SupabaseService.createProfileRow(data.user, name);
    }
    
    return { 
        user: { id: data.user?.id, name, email } as User,
        requiresConfirmation: data.user && !data.session
    }; 
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.clear();
  },

  // OPTIMIZED: Returns immediately from LocalStorage/Session
  getCurrentUser: async (): Promise<User | null> => {
    try {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) return null;
        
        const u = data.session.user;
        
        // Construct User from session metadata immediately
        const basicUser: User = {
            id: u.id,
            name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
            email: u.email || '',
            avatarUrl: u.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=User`,
            status: 'online',
            theme: 'midnight'
        };

        // Try to enrich with cached local preferences if available
        try {
            const prefs = JSON.parse(localStorage.getItem(`prefs_${u.id}`) || '{}');
            if (prefs.theme) basicUser.theme = prefs.theme;
            if (prefs.customBotName) basicUser.customBotName = prefs.customBotName;
        } catch {}

        return basicUser;
    } catch (error) {
        console.error("getCurrentUser failed", error);
        return null;
    }
  },

  refreshProfile: async (userId: string): Promise<User | null> => {
     try {
         const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
         if (profile) return mapProfileToUser(profile);
         return null;
     } catch { return null; }
  },

  ensureProfileExists: async (authUser: any): Promise<User> => {
      return { 
          id: authUser.id, 
          name: authUser.user_metadata?.full_name || 'User', 
          email: authUser.email || '',
          avatarUrl: '',
          status: 'online'
      };
  },

  createProfileRow: async (authUser: any, name: string) => {
    const newProfile = {
        id: authUser.id,
        email: authUser.email,
        full_name: name, 
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
    };
    const { data, error } = await supabase.from('profiles').upsert(newProfile).select().single();
    if (error) return null;
    return data;
  },

  // --- SEARCH & FRIENDS ---

  searchUsers: async (query: string, currentUserId: string): Promise<User[]> => {
    if (!query) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId)
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20);
    if (error) return [];
    return (data || []).map(mapProfileToUser);
  },

  updateProfile: async (userId: string, updates: Partial<User>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.full_name = updates.name;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;

    const extraUpdates: any = {};
    if (updates.theme !== undefined) extraUpdates.theme = updates.theme;
    if (updates.status !== undefined) extraUpdates.status = updates.status;
    if (updates.customBotName !== undefined) extraUpdates.custom_bot_name = updates.customBotName;

    // Save to local cache immediately for speed
    try {
        const existing = JSON.parse(localStorage.getItem(`prefs_${userId}`) || '{}');
        localStorage.setItem(`prefs_${userId}`, JSON.stringify({ ...existing, ...extraUpdates }));
    } catch(e) {}

    if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('profiles').update(dbUpdates).eq('id', userId);
    }
    if (Object.keys(extraUpdates).length > 0) {
        await supabase.from('profiles').update(extraUpdates).eq('id', userId);
    }
    return { error: null };
  },

  getContacts: async (userId: string): Promise<User[]> => {
    try {
        const { data: requests } = await supabase
          .from('friend_requests')
          .select('sender_id, receiver_id')
          .eq('status', 'accepted')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
        if (!requests) return [getBotUser()];
        const friendIds = requests.map(r => r.sender_id === userId ? r.receiver_id : r.sender_id);
        if (friendIds.length === 0) return [getBotUser()];
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', friendIds);
        const users = (profiles || []).map(mapProfileToUser);
        const bot = getBotUser();
        const currentUser = await SupabaseService.getCurrentUser();
        if (currentUser?.customBotName) bot.name = currentUser.customBotName;
        return [bot, ...users];
    } catch (e) { return [getBotUser()]; }
  },

  sendFriendRequest: async (senderId: string, receiverId: string) => {
    try {
        const { data: existing } = await supabase.from('friend_requests')
        .select('*')
        .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`);

        if (existing && existing.length > 0) {
            const status = existing[0].status;
            if (status === 'accepted') return { success: false, message: "Already friends." };
            if (status === 'pending') return { success: false, message: "Request already pending." };
            if (status === 'denied') return { success: false, message: "Request was denied." };
        }
        const { error } = await supabase.from('friend_requests').insert({ sender_id: senderId, receiver_id: receiverId });
        if (error) return { success: false, message: error.message };
        return { success: true, message: "Request sent!" };
    } catch (err: any) { return { success: false, message: "Error sending request" }; }
  },

  getIncomingRequests: async (userId: string) => {
    const { data } = await supabase
      .from('friend_requests')
      .select(`*, sender:profiles!sender_id(*)`)
      .eq('receiver_id', userId).eq('status', 'pending');
    return (data || []).map((r: any) => ({
      id: r.id, senderId: r.sender_id, receiverId: r.receiver_id, status: r.status,
      timestamp: new Date(r.created_at).getTime(), sender: mapProfileToUser(r.sender)
    }));
  },

  subscribeToRequests: (userId: string, onUpdate: () => void) => {
    const channel = supabase.channel(`requests:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${userId}` }, onUpdate)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  respondToRequest: async (requestId: string, action: 'accept' | 'deny') => {
    if (action === 'accept') {
      await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
    } else {
      const { data: req } = await supabase.from('friend_requests').select('*').eq('id', requestId).single();
      if (req) {
         await supabase.from('friend_requests').update({ status: 'denied' }).eq('id', requestId);
      }
    }
  },

  // --- MESSAGING & REALTIME ---

  getMessages: async (u1: string, u2: string): Promise<Message[]> => {
    if (u2 === NEXUS_BOT_ID || u1 === NEXUS_BOT_ID) {
        const key = `bot_msgs_${u1 === NEXUS_BOT_ID ? u2 : u1}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
    }
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${u1},receiver_id.eq.${u2}),and(sender_id.eq.${u2},receiver_id.eq.${u1})`)
      .order('created_at', { ascending: false }) 
      .limit(50); 

    const sortedData = (data || []).reverse();

    if (sortedData && sortedData.length > 0) {
       const unreadIds = sortedData.filter((m: any) => m.receiver_id === u1 && m.status !== 'read').map((m: any) => m.id);
       if (unreadIds.length > 0) {
          supabase.from('messages').update({ status: 'read' }).in('id', unreadIds).then();
       }
    }

    return sortedData.map((m: any) => ({
      id: m.id, conversationId: m.conversation_id, senderId: m.sender_id, receiverId: m.receiver_id,
      text: m.text, imageUrl: m.image_url, timestamp: new Date(m.created_at).getTime(), 
      status: m.status, type: m.type, toxicity: m.toxicity_data, reactions: m.reactions || {}
    }));
  },

  markMessageAsRead: async (messageId: string) => {
    await supabase.from('messages').update({ status: 'read' }).eq('id', messageId);
  },

  subscribeToMessages: (userId: string, friendId: string, onMessage: (msg: Message) => void) => {
    const conversationId = [userId, friendId].sort().join('_');
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
            const m = payload.new;
            onMessage({
                id: m.id, conversationId: m.conversation_id, senderId: m.sender_id, receiverId: m.receiver_id,
                text: m.text, imageUrl: m.image_url, timestamp: new Date(m.created_at).getTime(),
                status: m.status, type: m.type, toxicity: m.toxicity_data, reactions: m.reactions || {}
            });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  subscribeToTyping: (userId: string, friendId: string, onTyping: (isTyping: boolean) => void) => {
      const conversationId = [userId, friendId].sort().join('_');
      const channel = supabase.channel(`typing:${conversationId}`);
      
      channel.on('broadcast', { event: 'typing' }, (payload) => {
          if (payload.payload.senderId === friendId) {
             onTyping(payload.payload.isTyping);
          }
      }).subscribe();

      return () => { supabase.removeChannel(channel); };
  },

  sendTyping: async (userId: string, friendId: string, isTyping: boolean) => {
      const conversationId = [userId, friendId].sort().join('_');
      const channel = supabase.channel(`typing:${conversationId}`);
      await channel.subscribe();
      await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { senderId: userId, isTyping }
      });
  },

  sendMessage: async (msg: Message): Promise<{ data?: Message, error?: string }> => {
    if (msg.receiverId === NEXUS_BOT_ID || msg.senderId === NEXUS_BOT_ID) {
        const key = `bot_msgs_${msg.senderId === NEXUS_BOT_ID ? msg.receiverId : msg.senderId}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(msg);
        localStorage.setItem(key, JSON.stringify(existing));
        return { data: msg };
    }

    const payload = {
        sender_id: msg.senderId,
        receiver_id: msg.receiverId,
        text: msg.text || '',
        image_url: msg.imageUrl || null,
        conversation_id: msg.conversationId,
        status: msg.status || 'sent',
        type: msg.type || 'text',
        toxicity_data: msg.toxicity || null,
        // Removed reactions from insert payload to prevent "column not found" error
    };

    const { data, error } = await supabase.from('messages').insert(payload).select().single();
    if (error) return { error: error.message }; 

    // Return the mapped message
    const mapped: Message = {
      id: data.id,
      conversationId: data.conversation_id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      text: data.text,
      imageUrl: data.image_url,
      timestamp: new Date(data.created_at).getTime(),
      status: data.status,
      type: data.type,
      toxicity: data.toxicity_data,
      reactions: data.reactions || {}
    };

    return { data: mapped }; 
  },

  // --- BLOCKING ---

  blockUser: async (blockerId: string, blockedUserId: string) => {
    if (await SupabaseService.isBlocked(blockerId, blockedUserId)) return;
    await supabase.from('blocks').insert({ blocker_id: blockerId, blocked_user_id: blockedUserId });
  },

  unblockUser: async (blockerId: string, blockedUserId: string) => {
    await supabase.from('blocks').delete().eq('blocker_id', blockerId).eq('blocked_user_id', blockedUserId);
  },

  unblockAll: async (blockerId: string) => {
      await supabase.from('blocks').delete().eq('blocker_id', blockerId);
  },

  getBlockedUsers: async (userId: string): Promise<User[]> => {
    const { data: blocks } = await supabase
      .from('blocks')
      .select('blocked_user_id')
      .eq('blocker_id', userId);
    
    if (!blocks || blocks.length === 0) return [];
    
    const blockedIds = blocks.map((b: any) => b.blocked_user_id);
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', blockedIds);
    return (profiles || []).map(mapProfileToUser);
  },

  isBlocked: async (blockerId: string, targetId: string): Promise<boolean> => {
     const { data } = await supabase.from('blocks').select('id').eq('blocker_id', blockerId).eq('blocked_user_id', targetId);
     return !!(data && data.length > 0);
  },

  subscribeToBlocks: (currentUserId: string, friendId: string, onBlockChange: () => void) => {
      const channel = supabase.channel(`blocks:${currentUserId}_${friendId}`)
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'blocks' }, 
            (payload) => {
              const rec = payload.new as any || payload.old as any;
              if (rec) {
                  if ((rec.blocker_id === currentUserId && rec.blocked_user_id === friendId) || 
                      (rec.blocker_id === friendId && rec.blocked_user_id === currentUserId)) {
                      onBlockChange();
                  }
              }
            }
          )
          .subscribe();
      return () => { supabase.removeChannel(channel); };
  }
};