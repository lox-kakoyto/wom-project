
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Article, ChatMessage, ColiseumThread, Notification, WallPost, UserRole, WikiTemplate, MediaItem, Comment, FriendRequest, Friendship } from '../types';
import { API_URL } from '../constants';

const TEMPLATES: WikiTemplate[] = [
  {
    name: 'Frame (Universal Frame)',
    description: 'Custom container with border, icon, and title.',
    content: `{{Frame|title=Title Here|content=Content Here|icon=box|border=#a855f7}}`
  },
  {
    name: 'BattleResult (Advanced)',
    description: 'Battle outcome with optional image background',
    content: `{{BattleResult|result=Victory|score=High Diff|image=File:BG.jpg}}`
  },
  {
    name: 'HoverImage (Image Swap)',
    description: 'Image changes when you hover over it.',
    content: `{{HoverImage|File:Base.jpg|File:Hover.jpg|width=300px}}`
  },
  {
    name: 'IMG2 (Advanced Image)',
    description: 'Use for aligned images: {{IMG2|File:Name.jpg|center|400px}}',
    content: `{{IMG2|File:Name.jpg|right|300px}}`
  },
  {
    name: 'Infobox Character',
    description: 'Standard character stats',
    content: `{{Infobox
| name = Name
| image = File:Image.jpg
| origin = Series
| classification = Class
| age = Age
}}`
  }
];

const GUEST_USER: User = {
    id: 'guest',
    username: 'Guest',
    role: UserRole.USER,
    avatar: '', 
    joinDate: new Date().toLocaleDateString()
};

// Helper to build tree from flat comments with parentId
const buildCommentTree = (flatComments: any[]): Comment[] => {
    const commentMap: Record<string, Comment> = {};
    const roots: Comment[] = [];

    flatComments.forEach(c => {
        commentMap[c.id] = { ...c, replies: [] };
    });

    flatComments.forEach(c => {
        if (c.parentId && commentMap[c.parentId]) {
            commentMap[c.parentId].replies.push(commentMap[c.id]);
        } else {
            roots.push(commentMap[c.id]);
        }
    });
    return roots;
};

interface DataContextType {
  currentUser: User;
  isAuthenticated: boolean;
  isLoading: boolean; 
  users: User[];
  articles: Article[];
  threads: ColiseumThread[];
  // chatMessages removed in favor of activeConversationMessages
  activeConversationMessages: ChatMessage[];
  wallPosts: WallPost[];
  notifications: Notification[];
  templates: WikiTemplate[];
  mediaFiles: MediaItem[];
  
  // Friend System
  friends: Friendship[];
  friendRequests: FriendRequest[];

  login: (email: string, pass: string) => Promise<boolean>;
  googleLogin: (token: string) => Promise<boolean>;
  register: (username: string, email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (id: string, data: { avatar?: string, banner?: string, bio?: string }) => Promise<void>;
  
  addArticle: (article: Article) => void;
  updateArticle: (article: Article) => void;
  addThread: (thread: ColiseumThread) => void;
  addThreadComment: (threadId: string, comment: Comment) => void;
  addArticleComment: (articleId: string, comment: Comment) => void;
  replyToArticleComment: (articleId: string, parentCommentId: string, reply: Comment) => void;
  
  // New Chat Logic
  setActiveConversation: (roomId: string) => void;
  activeConversationId: string | null;
  sendMessage: (msg: ChatMessage) => void;
  
  sendWallPost: (post: WallPost) => void;
  replyToWallPost: (postId: string, parentCommentId: string | null, reply: Comment) => void;
  markNotificationRead: (id: string) => void;
  uploadMedia: (file: MediaItem) => void;
  toggleWatch: (slug: string) => void;

  // Friend Actions
  sendFriendRequest: (receiverId: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  rejectFriendRequest: (requestId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('wom_token'));
  const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  
  const [users, setUsers] = useState<User[]>([]);
  const [articles, setArticles] = useState<Article[]>([]); 
  const [threads, setThreads] = useState<ColiseumThread[]>([]);
  
  // Chat State
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationMessages, setActiveConversationMessages] = useState<ChatMessage[]>([]);
  
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Friends State
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  // 1. Initial Data Fetch (Global Data that doesn't change often)
  useEffect(() => {
    const fetchGlobalData = async () => {
        try {
            const usersRes = await fetch(`${API_URL}/users`);
            if (usersRes.ok) setUsers(await usersRes.json());

            const articlesRes = await fetch(`${API_URL}/articles`);
            if (articlesRes.ok) {
                const rawArticles = await articlesRes.json();
                const processedArticles = rawArticles.map((a: any) => ({
                    ...a,
                    comments: buildCommentTree(a.comments)
                }));
                setArticles(processedArticles);
            }

            const threadsRes = await fetch(`${API_URL}/coliseum/threads`);
            if (threadsRes.ok) setThreads(await threadsRes.json());

            const wallRes = await fetch(`${API_URL}/wall`);
            if (wallRes.ok) {
                const rawWall = await wallRes.json();
                const processedWall = rawWall.map((p: any) => ({
                    ...p,
                    comments: buildCommentTree(p.comments)
                }));
                setWallPosts(processedWall);
            }

            const mediaRes = await fetch(`${API_URL}/media`);
            if (mediaRes.ok) setMediaFiles(await mediaRes.json());

        } catch (e) {
            console.error("Failed to load global data", e);
        } finally {
            if (!token) setIsLoading(false);
        }
    };

    fetchGlobalData();
  }, []);

  // 2. Auth & User Specific Data Fetch
  useEffect(() => {
    const verifyAndFetchUserData = async () => {
        if (!token) {
            setCurrentUser(GUEST_USER);
            setIsLoading(false);
            return;
        }
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const userData = await res.json();
            if (userData) {
                const mappedUser: User = {
                    id: userData.id.toString(),
                    username: userData.username,
                    email: userData.email,
                    role: userData.role,
                    avatar: userData.avatar || '',
                    banner: userData.banner || '',
                    bio: userData.bio,
                    joinDate: new Date(userData.created_at).toLocaleDateString(),
                    watchlist: userData.watchlist || []
                };
                setCurrentUser(mappedUser);
                
                // Fetch User Specific Data
                fetchFriends(mappedUser.id);
                fetchNotifications(mappedUser.id);
            } else {
                logout();
            }
        } catch (e) {
            console.error("Auth verify failed", e);
            logout();
        } finally {
            setIsLoading(false);
        }
    };
    verifyAndFetchUserData();
  }, [token]);

  // 3. Polling for Active Chat & Notifications (Efficient Polling)
  useEffect(() => {
      if (!token || currentUser.id === 'guest') return;

      const poll = async () => {
          // Poll Active Chat if one is open
          if (activeConversationId) {
              const res = await fetch(`${API_URL}/chat/${activeConversationId}`);
              if (res.ok) setActiveConversationMessages(await res.json());
          }
          // Poll Notifications
          fetchNotifications(currentUser.id);
          // Poll Friends/Requests (to see status updates or new requests)
          fetchFriends(currentUser.id);
      };

      const interval = setInterval(poll, 3000);
      return () => clearInterval(interval);
  }, [token, currentUser.id, activeConversationId]);

  // --- Helper Fetchers ---

  const fetchNotifications = async (userId: string) => {
      const res = await fetch(`${API_URL}/notifications/${userId}`);
      if (res.ok) setNotifications(await res.json());
  };

  const fetchFriends = async (userId: string) => {
      const res = await fetch(`${API_URL}/friends/${userId}`);
      if (res.ok) {
          const data = await res.json();
          // Map friends to include computed roomId
          const mappedFriends = data.friends.map((f: any) => {
              // Deterministic Room ID for DMs: min(id1, id2)_max(id1, id2)
              const ids = [userId, f.friend_id].sort();
              const roomId = `dm_${ids[0]}_${ids[1]}`;
              return {
                  friendId: f.friend_id,
                  friend: {
                      id: f.friend_id,
                      username: f.username,
                      avatar: f.avatar,
                      role: f.role,
                      bio: f.bio
                  },
                  roomId: roomId
              };
          });
          setFriends(mappedFriends);
          setFriendRequests(data.requests);
      }
  };

  // --- Auth Functions ---
  const login = async (email: string, pass: string): Promise<boolean> => {
      setIsLoading(true);
      try {
          const res = await fetch(`${API_URL}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password: pass })
          });
          const data = await res.json();
          if (res.ok && data.token) {
              localStorage.setItem('wom_token', data.token);
              setToken(data.token);
              return true;
          } else {
              alert(data.error || "Login failed");
              return false;
          }
      } catch (e) {
          return false;
      } finally {
          setIsLoading(false);
      }
  };

  const googleLogin = async (googleToken: string): Promise<boolean> => {
      setIsLoading(true);
      try {
          const res = await fetch(`${API_URL}/auth/google`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: googleToken })
          });
          const data = await res.json();
          if (res.ok && data.token) {
              localStorage.setItem('wom_token', data.token);
              setToken(data.token);
              return true;
          } else {
              return false;
          }
      } catch (e) {
          return false;
      } finally {
          setIsLoading(false);
      }
  };

  const register = async (username: string, email: string, pass: string): Promise<boolean> => {
      setIsLoading(true);
      try {
          const res = await fetch(`${API_URL}/auth/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, email, password: pass })
          });
          const data = await res.json();
          if (res.ok && data.token) {
              localStorage.setItem('wom_token', data.token);
              setToken(data.token);
              return true;
          } else {
              alert(data.error);
              return false;
          }
      } catch (e) {
          return false;
      } finally {
          setIsLoading(false);
      }
  };

  const logout = () => {
      localStorage.removeItem('wom_token');
      setToken(null);
      setCurrentUser(GUEST_USER);
      setActiveConversationId(null);
  };

  const updateUserProfile = async (id: string, data: { avatar?: string, banner?: string, bio?: string }) => {
      try {
          const res = await fetch(`${API_URL}/users/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
          });
          if (res.ok) {
              const updated = await res.json();
              setCurrentUser(prev => ({ ...prev, ...updated }));
              setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u));
          }
      } catch (e) { console.error(e); }
  };

  const toggleWatch = async (slug: string) => {
      if(!currentUser || currentUser.id === 'guest') return;
      try {
          const res = await fetch(`${API_URL}/users/${currentUser.id}/watchlist`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slug })
          });
          if (res.ok) {
              const data = await res.json();
              setCurrentUser(prev => ({ ...prev, watchlist: data.watchlist }));
          }
      } catch (e) { console.error(e); }
  };

  // --- Content Creation ---

  const addArticle = async (article: Article) => {
    try {
      const response = await fetch(`${API_URL}/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article)
      });
      // We don't fetch all data here to avoid heavy loads, maybe just alert success
    } catch (e) { console.error(e); }
  };

  const updateArticle = async (updated: Article) => {
      try {
        await fetch(`${API_URL}/articles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
      } catch (e) { console.error(e); }
  };

  const addThread = async (thread: ColiseumThread) => {
      try {
          await fetch(`${API_URL}/coliseum/threads`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(thread)
          });
      } catch (e) { console.error(e); }
  };

  const addThreadComment = async (threadId: string, comment: Comment) => {
      try {
          await fetch(`${API_URL}/coliseum/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ threadId, authorId: currentUser.id, content: comment.content })
          });
      } catch (e) { console.error(e); }
  };

  const addArticleComment = async (articleId: string, comment: Comment) => {
      try {
          await fetch(`${API_URL}/articles/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ articleId, authorId: currentUser.id, content: comment.content, parentId: null })
          });
      } catch (e) { console.error(e); }
  };

  const replyToArticleComment = async (articleId: string, parentCommentId: string, reply: Comment) => {
      try {
          await fetch(`${API_URL}/articles/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ articleId, authorId: currentUser.id, content: reply.content, parentId: parentCommentId })
          });
      } catch (e) { console.error(e); }
  };

  const replyToWallPost = async (postId: string, parentCommentId: string | null, reply: Comment) => {
      try {
          await fetch(`${API_URL}/wall/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId, authorId: currentUser.id, content: reply.content, parentId: parentCommentId })
          });
      } catch (e) { console.error(e); }
  };

  const sendWallPost = async (post: WallPost) => {
      try {
          await fetch(`${API_URL}/wall`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(post)
          });
      } catch (e) { console.error(e); }
  };

  // --- New Chat Functions ---

  const setActiveConversation = (roomId: string) => {
      setActiveConversationId(roomId);
      // Immediately fetch for responsiveness
      fetch(`${API_URL}/chat/${roomId}`)
        .then(res => res.json())
        .then(data => setActiveConversationMessages(data));
  };

  const sendMessage = async (msg: ChatMessage) => {
      try {
          const res = await fetch(`${API_URL}/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(msg)
          });
          if (res.ok) {
              // Optimistic UI update could happen here, but polling handles it
              const newMsg = await res.json();
              setActiveConversationMessages(prev => [...prev, newMsg]);
          }
      } catch (e) { console.error(e); }
  };

  // --- Friend Functions ---

  const sendFriendRequest = async (receiverId: string) => {
      try {
          await fetch(`${API_URL}/friends/request`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ senderId: currentUser.id, receiverId })
          });
          // Refresh requests
          fetchFriends(currentUser.id);
      } catch (e) { console.error(e); }
  };

  const acceptFriendRequest = async (requestId: string) => {
      try {
          await fetch(`${API_URL}/friends/accept`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ requestId })
          });
          fetchFriends(currentUser.id);
      } catch (e) { console.error(e); }
  };

  const rejectFriendRequest = async (requestId: string) => {
      try {
          await fetch(`${API_URL}/friends/reject`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ requestId })
          });
          fetchFriends(currentUser.id);
      } catch (e) { console.error(e); }
  };

  const markNotificationRead = async (id: string) => {
      try {
          await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PUT' });
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      } catch(e) { console.error(e); }
  };

  const uploadMedia = async (file: MediaItem) => {
      try {
          const res = await fetch(`${API_URL}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(file)
          });
          if (res.ok) {
              const saved = await res.json();
              setMediaFiles(prev => [saved, ...prev]);
          }
      } catch(e) { console.error(e); }
  };

  return (
    <DataContext.Provider value={{
      currentUser, isAuthenticated: !!token, isLoading, users, articles, threads, 
      activeConversationMessages, wallPosts, notifications, templates: TEMPLATES, mediaFiles,
      friends, friendRequests,
      login, googleLogin, register, logout, updateUserProfile,
      addArticle, updateArticle, addThread, addThreadComment, addArticleComment, replyToArticleComment, 
      setActiveConversation, activeConversationId, sendMessage, 
      sendWallPost, replyToWallPost, markNotificationRead, uploadMedia, toggleWatch,
      sendFriendRequest, acceptFriendRequest, rejectFriendRequest
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};