import { User, FriendRequest, BlockRecord, Message } from "../types";

// --- Seed Data ---
const SEED_USERS: User[] = [
  { id: 'nexus-ai', name: 'Giggle AI', email: 'ai@giggle.bot', avatarUrl: 'https://cdn-icons-png.flaticon.com/512/4712/4712027.png', status: 'online', isBot: true, theme: 'midnight' },
  { id: 'u1', name: 'Alice Chen', email: 'alice@example.com', avatarUrl: 'https://picsum.photos/id/64/200/200', status: 'online', theme: 'giggle' },
  { id: 'u2', name: 'Bob Smith', email: 'bob@example.com', avatarUrl: 'https://picsum.photos/id/91/200/200', status: 'busy', theme: 'midnight' },
  { id: 'u3', name: 'Charlie Davis', email: 'charlie@example.com', avatarUrl: 'https://picsum.photos/id/177/200/200', status: 'offline', theme: 'ocean' },
  { id: 'u4', name: 'Toxic Troll', email: 'troll@example.com', avatarUrl: 'https://picsum.photos/id/237/200/200', status: 'online', theme: 'forest' },
];

const load = <T>(key: string, def: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : def;
  } catch (e) {
    console.error("Failed to load from localStorage", e);
    return def;
  }
};

const save = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save to localStorage (quota exceeded?)", e);
  }
};

let users: User[] = load('giggle_users', SEED_USERS);
if (!users.find(u => u.id === 'nexus-ai')) {
  users.unshift(SEED_USERS[0]);
  save('giggle_users', users);
}

// Migrate legacy Nexus users to Giggle
users = users.map(u => ({ ...u, theme: u.theme || 'midnight' }));

let passwords: Record<string, string> = load('giggle_passwords', {
  'alice@example.com': 'password',
  'bob@example.com': 'password',
  'charlie@example.com': 'password',
  'troll@example.com': 'password',
});

let requests: FriendRequest[] = load('giggle_requests', []);
let blocks: BlockRecord[] = load('giggle_blocks', []);
let messages: Message[] = load('giggle_messages', []);
let contacts: Record<string, string[]> = load('giggle_contacts', {
  'u1': ['u2', 'nexus-ai'], 
  'u2': ['u1', 'nexus-ai'],
  'u3': ['nexus-ai'],
  'u4': ['nexus-ai']
});

// Key: senderId_receiverId, Value: number of toxic strikes
let toxicityStrikes: Record<string, number> = {}; 

export const Backend = {
  // Auth
  login: async (email: string, password: string): Promise<{user?: User, error?: string}> => {
    await new Promise(r => setTimeout(r, 600)); 
    const user = users.find(u => u.email === email);
    if (!user) return { error: "User not found." };
    if (passwords[email] !== password) return { error: "Invalid password." };
    return { user };
  },

  register: async (name: string, email: string, password: string): Promise<{user?: User, error?: string}> => {
    await new Promise(r => setTimeout(r, 800));
    if (users.find(u => u.email === email)) {
      return { error: "Email already registered." };
    }
    const newUser: User = {
      id: `u${Date.now()}`,
      name,
      email,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      status: 'online',
      theme: 'midnight'
    };
    users.push(newUser);
    passwords[email] = password;
    contacts[newUser.id] = ['nexus-ai'];
    save('giggle_users', users);
    save('giggle_passwords', passwords);
    save('giggle_contacts', contacts);
    return { user: newUser };
  },

  resetPassword: async (email: string): Promise<{success: boolean, message: string}> => {
    await new Promise(r => setTimeout(r, 500));
    return { success: true, message: "Reset link sent to your email." };
  },

  updateProfile: async (userId: string, updates: { name?: string, avatarUrl?: string, customBotName?: string, theme?: string }) => {
    try {
      const idx = users.findIndex(u => u.id === userId);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...updates };
        save('giggle_users', users);
      } else {
        throw new Error("User not found");
      }
    } catch (e) {
      console.error("Update profile failed", e);
      throw e;
    }
  },

  getAllUsers: (): User[] => users,

  getContacts: (userId: string): User[] => {
    const friendIds = contacts[userId] || [];
    if (!friendIds.includes('nexus-ai')) friendIds.push('nexus-ai');
    return users.filter(u => friendIds.includes(u.id));
  },

  sendFriendRequest: async (senderId: string, receiverId: string): Promise<{ success: boolean; message: string }> => {
    if (receiverId === 'nexus-ai') return { success: false, message: "AI is already your friend." };
    if (contacts[senderId]?.includes(receiverId)) return { success: false, message: "Already friends." };

    // Strict Block Check
    const isBlocked = blocks.some(b => b.blockerId === receiverId && b.blockedUserId === senderId);
    if (isBlocked) return { success: false, message: "User is unavailable." }; 
    
    const hasBlocked = blocks.some(b => b.blockerId === senderId && b.blockedUserId === receiverId);
    if (hasBlocked) return { success: false, message: "You must unblock this user first." };

    const existing = requests.find(r => 
      (r.senderId === senderId && r.receiverId === receiverId) || 
      (r.senderId === receiverId && r.receiverId === senderId)
    );
    if (existing) {
      if (existing.status === 'pending') return { success: false, message: "Request pending." };
      if (existing.status === 'denied') return { success: false, message: "User unavailable." };
    }

    const newReq: FriendRequest = {
      id: `req_${Date.now()}`,
      senderId,
      receiverId,
      status: 'pending',
      timestamp: Date.now()
    };
    requests.push(newReq);
    save('giggle_requests', requests);
    return { success: true, message: "Friend request sent." };
  },

  getIncomingRequests: (userId: string): (FriendRequest & { sender: User })[] => {
    return requests
      .filter(r => r.receiverId === userId && r.status === 'pending')
      .map(r => ({ ...r, sender: users.find(u => u.id === r.senderId)! }));
  },

  respondToRequest: async (requestId: string, action: 'accept' | 'deny'): Promise<void> => {
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return;
    const req = requests[reqIndex];
    
    if (action === 'accept') {
      req.status = 'accepted';
      contacts[req.senderId] = [...(contacts[req.senderId] || []), req.receiverId];
      contacts[req.receiverId] = [...(contacts[req.receiverId] || []), req.senderId];
      save('giggle_contacts', contacts);
    } else {
      req.status = 'denied';
      // AUTOMATIC BLOCK ON DENY
      const newBlock: BlockRecord = {
        id: `blk_${Date.now()}`,
        blockerId: req.receiverId,
        blockedUserId: req.senderId,
        timestamp: Date.now()
      };
      blocks.push(newBlock);
      save('giggle_blocks', blocks);
    }
    requests[reqIndex] = req;
    save('giggle_requests', requests);
  },

  getBlockedUsers: (currentUserId: string): User[] => {
    const blockedIds = blocks
      .filter(b => b.blockerId === currentUserId)
      .map(b => b.blockedUserId);
    return users.filter(u => blockedIds.includes(u.id));
  },

  unblockUser: async (blockerId: string, blockedUserId: string): Promise<void> => {
    blocks = blocks.filter(b => !(b.blockerId === blockerId && b.blockedUserId === blockedUserId));
    save('giggle_blocks', blocks);
    const key = `${blockedUserId}_${blockerId}`;
    delete toxicityStrikes[key];
  },

  sendMessage: async (msg: Message): Promise<{ blocked?: boolean, warning?: boolean }> => {
    try {
        const isBlocked = blocks.some(b => b.blockerId === msg.receiverId && b.blockedUserId === msg.senderId);
        if (isBlocked) {
            return { blocked: true };
        }

        if (msg.toxicity && msg.toxicity.flagged) {
            const key = `${msg.senderId}_${msg.receiverId}`;
            const currentStrikes = (toxicityStrikes[key] || 0) + 1;
            toxicityStrikes[key] = currentStrikes;

            if (currentStrikes === 1) {
                msg.status = 'quarantined';
                messages.push(msg);
                save('giggle_messages', messages);
                return { warning: true };
            } 
            else if (currentStrikes >= 2) {
                const newBlock: BlockRecord = {
                id: `auto_blk_${Date.now()}`,
                blockerId: msg.receiverId,
                blockedUserId: msg.senderId,
                timestamp: Date.now()
                };
                blocks.push(newBlock);
                save('giggle_blocks', blocks);
                
                msg.status = 'quarantined'; 
                messages.push(msg);
                save('giggle_messages', messages);
                
                return { blocked: true };
            }
        }

        if (msg.status === 'pending') msg.status = 'sent';
        
        messages.push(msg);
        save('giggle_messages', messages);
        return {};
    } catch(e) {
        console.error("Failed to send message", e);
        return { blocked: true }; // Fail safe
    }
  },

  getMessages: (u1: string, u2: string): Message[] => {
    return messages.filter(m => 
      (m.senderId === u1 && m.receiverId === u2) || 
      (m.senderId === u2 && m.receiverId === u1)
    ).sort((a, b) => a.timestamp - b.timestamp);
  }
};