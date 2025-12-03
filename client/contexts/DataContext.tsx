
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Article, ChatMessage, ColiseumThread, Notification, WallPost, UserRole, WikiTemplate, MediaItem, Comment, FriendRequest, Friendship } from '../types';
import { API_URL } from '../constants';

const TEMPLATES: WikiTemplate[] = [
  {
    name: 'Tabber (Advanced)',
    description: 'Switch content tabs. Styles: classic, cyberpunk, folder, pills.',
    content: `{{Tabber
|style=cyberpunk
|Form 1={{IMG2|File:Base.jpg|center|100%}}
|Form 2={{IMG2|File:Super.jpg|center|100%}}
}}`
  },
  {
    name: 'MusicTabber',
    description: 'Audio player with playlist.',
    content: `{{MusicTabber
|Theme 1=File:Theme1.mp3
|Battle Theme=File:Theme2.mp3
}}`
  },
  {
    name: 'BattleResults',
    description: 'Wins, Draws, Losses tracking. Styles: classic, cards, compact.',
    content: `{{BattleResults
|style=cards
|wins=[[Goku]] (Low Diff)
|draws=[[Vegeta]] (Interrupted)
|losses=[[Saitama]] (One Shot)
}}`
  },
  {
    name: 'IDV1 (Techno)',
    description: 'Cyberpunk style identifier.',
    content: `{{IDV1
|title=UNIT-01
|name=NAME
|rank=S-CLASS
|image=File:Name.jpg
|color=#00eaff
}}`
  },
  {
    name: 'IDV2 (Mystic)',
    description: 'Scroll style for mages.',
    content: `{{IDV2
|name=Name
|title=Title
|image=File:Name.jpg
|color=#ffd700
}}`
  },
  {
    name: 'IDV3 (Modern)',
    description: 'Character card.',
    content: `{{IDV3
|name=NAME
|image=File:Name.jpg
|stats=HP: 100 | MP: 50
|bg=#222
}}`
  },
  {
    name: 'Frame',
    description: 'Colored block with icon.',
    content: `{{Frame|title=Title|content=Text|icon=zap|border=#a855f7|bg=#0f0a19}}`
  },
  {
    name: 'Video',
    description: 'Insert MP4 video.',
    content: `{{Video|File:Name.mp4|center|400px}}`
  },
  {
    name: 'Gallery',
    description: 'List of images.',
    content: `{{Gallery|title=Gallery|File:1.jpg|File:2.jpg}}`
  },
  {
    name: 'Gradient',
    description: 'Colored text.',
    content: `{{Gradient|Text|#ff0000|#0000ff}}`
  },
  {
    name: 'Infobox',
    description: 'Standard character table.',
    content: `{{Infobox
| name = Name
| image = File:Image.jpg
| origin = Universe
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

    const comments = flatComments.map(c => ({...c, replies: []}));

    comments.forEach(c => {
        commentMap[c.id] = c;
    });

    comments.forEach(c => {
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
  activeConversationMessages: ChatMessage[];
  wallPosts: WallPost[];
  notifications: Notification[];
  templates: WikiTemplate[];
  mediaFiles: MediaItem[];
  
  friends: Friendship[];
  friendRequests: FriendRequest[];

  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

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
  
  setActiveConversation: (roomId: string) => void;
  activeConversationId: string | null;
  sendMessage: (msg: ChatMessage) => void;
  
  sendWallPost: (post: WallPost) => void;
  replyToWallPost: (postId: string, parentCommentId: string | null, reply: Comment) => void;
  markNotificationRead: (id: string) => void;
  uploadMedia: (file: MediaItem) => void;
  toggleWatch: (slug: string) => void;

  sendFriendRequest: (receiverId: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  rejectFriendRequest: (requestId: string) => void;
  
  refreshArticles: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('wom_token'));
  const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  
  const [users, setUsers] = useState<User[]>([]);
  const [articles, setArticles] = useState<Article[]>([]); 
  const [threads, setThreads] = useState<ColiseumThread[]>([]);
  
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationMessages, setActiveConversationMessages] = useState<ChatMessage[]>([]);
  
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  const refreshArticles = useCallback(async () => {
    try {
        const articlesRes = await fetch(`${API_URL}/articles`);
        if (articlesRes.ok) {
            const rawArticles = await articlesRes.json();
            const processedArticles = rawArticles.map((a: any) => ({
                ...a,
                comments: buildCommentTree(a.comments)
            }));
            setArticles(processedArticles);
        }
    } catch (e) { console.error("Error fetching articles", e); }
  }, []);

  const refreshWall = useCallback(async () => {
      try {
        const wallRes = await fetch(`${API_URL}/wall`);
        if (wallRes.ok) {
            const rawWall = await wallRes.json();
            const processedWall = rawWall.map((p: any) => ({
                ...p,
                comments: buildCommentTree(p.comments)
            }));
            setWallPosts(processedWall);
        }
      } catch (e) { console.error(e); }
  }, []);

  const refreshThreads = useCallback(async () => {
      try {
        const threadsRes = await fetch(`${API_URL}/coliseum/threads`);
        if (threadsRes.ok) setThreads(await threadsRes.json());
      } catch (e) { console.error(e); }
  }, []);

  const refreshChat = useCallback(async (roomId: string) => {
      try {
        const res = await fetch(`${API_URL}/chat/${roomId}`);
        if (res.ok) {
            const msgs = await res.json();
            setActiveConversationMessages(prev => {
                if (prev.length !== msgs.length) return msgs;
                if (prev.length > 0 && msgs.length > 0 && prev[prev.length-1].id !== msgs[msgs.length-1].id) return msgs;
                return prev;
            });
        }
      } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    const initData = async () => {
        try {
            const usersRes = await fetch(`${API_URL}/users`);
            if (usersRes.ok) setUsers(await usersRes.json());

            await refreshArticles();
            await refreshThreads();
            await refreshWall();

            const mediaRes = await fetch(`${API_URL}/media`);
            if (mediaRes.ok) setMediaFiles(await mediaRes.json());

        } catch (e) {
            console.error("Failed to load global data", e);
        } finally {
            if (!token) setIsLoading(false);
        }
    };

    initData();
  }, [refreshArticles, refreshThreads, refreshWall]);

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

  useEffect(() => {
      if (!token || currentUser.id === 'guest') return;

      const poll = async () => {
          if (activeConversationId) {
              await refreshChat(activeConversationId);
          }
          fetchNotifications(currentUser.id);
      };

      const interval = setInterval(poll, 3000);
      return () => clearInterval(interval);
  }, [token, currentUser.id, activeConversationId, refreshChat]);

  const fetchNotifications = async (userId: string) => {
      try {
        const res = await fetch(`${API_URL}/notifications/${userId}`);
        if (res.ok) setNotifications(await res.json());
      } catch (e) { console.error(e); }
  };

  const fetchFriends = async (userId: string) => {
      try {
        const res = await fetch(`${API_URL}/friends/${userId}`);
        if (res.ok) {
            const data = await res.json();
            const mappedFriends = data.friends.map((f: any) => {
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
      } catch (e) { console.error(e); }
  };

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
      setCurrentUser(prev => ({ ...prev, ...data }));
      try {
          await fetch(`${API_URL}/users/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
          });
      } catch (e) { console.error(e); }
  };

  const toggleWatch = async (slug: string) => {
      if(!currentUser || currentUser.id === 'guest') return;
      const isWatching = currentUser.watchlist?.includes(slug);
      const newWatchlist = isWatching 
         ? currentUser.watchlist?.filter(s => s !== slug) 
         : [...(currentUser.watchlist || []), slug];
         
      setCurrentUser(prev => ({ ...prev, watchlist: newWatchlist }));

      try {
          await fetch(`${API_URL}/users/${currentUser.id}/watchlist`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slug })
          });
      } catch (e) { console.error(e); }
  };

  const addArticle = async (article: Article) => {
    try {
      await fetch(`${API_URL}/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article)
      });
      refreshArticles();
    } catch (e) { console.error(e); }
  };

  const updateArticle = async (updated: Article) => {
      try {
        await fetch(`${API_URL}/articles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
        refreshArticles();
      } catch (e) { console.error(e); }
  };

  const addThread = async (thread: ColiseumThread) => {
      try {
          await fetch(`${API_URL}/coliseum/threads`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(thread)
          });
          refreshThreads();
      } catch (e) { console.error(e); }
  };

  const addThreadComment = async (threadId: string, comment: Comment) => {
      setThreads(prev => prev.map(t => {
          if (t.id === threadId) {
              return { ...t, comments: [...t.comments, comment] };
          }
          return t;
      }));
      
      try {
          await fetch(`${API_URL}/coliseum/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ threadId, authorId: currentUser.id, content: comment.content })
          });
          refreshThreads();
      } catch (e) { console.error(e); }
  };

  const addArticleComment = async (articleId: string, comment: Comment) => {
      setArticles(prev => prev.map(a => {
          if (a.id === articleId) {
              return { ...a, comments: [...a.comments, comment] };
          }
          return a;
      }));

      try {
          await fetch(`${API_URL}/articles/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ articleId, authorId: currentUser.id, content: comment.content, parentId: null })
          });
          refreshArticles();
      } catch (e) { console.error(e); }
  };

  const replyToArticleComment = async (articleId: string, parentCommentId: string, reply: Comment) => {
      try {
          await fetch(`${API_URL}/articles/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ articleId, authorId: currentUser.id, content: reply.content, parentId: parentCommentId })
          });
          refreshArticles();
      } catch (e) { console.error(e); }
  };

  const replyToWallPost = async (postId: string, parentCommentId: string | null, reply: Comment) => {
      try {
          await fetch(`${API_URL}/wall/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId, authorId: currentUser.id, content: reply.content, parentId: parentCommentId })
          });
          refreshWall();
      } catch (e) { console.error(e); }
  };

  const sendWallPost = async (post: WallPost) => {
      setWallPosts(prev => [post, ...prev]);

      try {
          await fetch(`${API_URL}/wall`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(post)
          });
          refreshWall();
      } catch (e) { console.error(e); }
  };

  const setActiveConversation = (roomId: string) => {
      setActiveConversationId(roomId);
      refreshChat(roomId);
  };

  const sendMessage = async (msg: ChatMessage) => {
      setActiveConversationMessages(prev => [...prev, msg]);
      try {
          const res = await fetch(`${API_URL}/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(msg)
          });
          if (res.ok) {
              const savedMsg = await res.json();
              setActiveConversationMessages(prev => prev.map(m => m.id === msg.id ? savedMsg : m));
          }
      } catch (e) { console.error(e); }
  };

  const sendFriendRequest = async (receiverId: string) => {
      try {
          await fetch(`${API_URL}/friends/request`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ senderId: currentUser.id, receiverId })
          });
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
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      try {
          await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PUT' });
      } catch(e) { console.error(e); }
  };

  const uploadMedia = async (file: MediaItem) => {
      setMediaFiles(prev => [file, ...prev]);
      try {
          const res = await fetch(`${API_URL}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(file)
          });
          if (res.ok) {
              const saved = await res.json();
              setMediaFiles(prev => prev.map(m => m.id === file.id ? saved : m));
          }
      } catch(e) { console.error(e); }
  };

  return (
    <DataContext.Provider value={{
      currentUser, isAuthenticated: !!token, isLoading, users, articles, threads, 
      activeConversationMessages, wallPosts, notifications, templates: TEMPLATES, mediaFiles,
      friends, friendRequests,
      isSidebarCollapsed, toggleSidebar,
      login, googleLogin, register, logout, updateUserProfile,
      addArticle, updateArticle, addThread, addThreadComment, addArticleComment, replyToArticleComment, 
      setActiveConversation, activeConversationId, sendMessage, 
      sendWallPost, replyToWallPost, markNotificationRead, uploadMedia, toggleWatch,
      sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
      refreshArticles
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