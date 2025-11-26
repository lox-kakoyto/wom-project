
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Article, ChatMessage, ColiseumThread, Notification, WallPost, UserRole, WikiTemplate, MediaItem, Comment } from '../types';
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
    joinDate: new Date().toLocaleDateString(),
    watchlist: []
};

// Helper to build tree from flat comments with parentId
const buildCommentTree = (flatComments: any[]): Comment[] => {
    const commentMap: Record<string, Comment> = {};
    const roots: Comment[] = [];

    // Init map
    flatComments.forEach(c => {
        commentMap[c.id] = { ...c, replies: [] };
    });

    // Build tree
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
  chatMessages: ChatMessage[];
  wallPosts: WallPost[];
  notifications: Notification[];
  templates: WikiTemplate[];
  mediaFiles: MediaItem[];
  
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
  sendMessage: (msg: ChatMessage) => void;
  sendWallPost: (post: WallPost) => void;
  replyToWallPost: (postId: string, parentCommentId: string | null, reply: Comment) => void;
  markNotificationRead: (id: string) => void;
  uploadMedia: (file: MediaItem) => void;
  toggleWatch: (articleId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('wom_token'));
  const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  
  const [users, setUsers] = useState<User[]>([]);
  const [articles, setArticles] = useState<Article[]>([]); 
  const [threads, setThreads] = useState<ColiseumThread[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>(() => JSON.parse(localStorage.getItem('wom_media') || '[]')); 
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load ALL public data from Server
  const fetchAllData = async () => {
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

        const chatRes = await fetch(`${API_URL}/chat`);
        if (chatRes.ok) setChatMessages(await chatRes.json());

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

    } catch (e) {
        console.error("Failed to load data", e);
    } finally {
        if (!token) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Verify Token
  useEffect(() => {
    const verifyToken = async () => {
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
                    watchlist: userData.watchlist || [] // Backend needs to support this
                };
                setCurrentUser(mappedUser);
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
    verifyToken();
  }, [token]);

  // Auth functions (login, googleLogin, register, logout)
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
          alert("Server error");
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
              alert(data.error || "Google Login failed");
              return false;
          }
      } catch (e) {
          alert("Server error during Google Auth");
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
              alert(data.error || "Registration failed");
              return false;
          }
      } catch (e) {
          alert("Server error");
          return false;
      } finally {
          setIsLoading(false);
      }
  };

  const logout = () => {
      localStorage.removeItem('wom_token');
      setToken(null);
      setCurrentUser(GUEST_USER);
  };

  const updateUserProfile = async (id: string, data: { avatar?: string, banner?: string, bio?: string }) => {
      try {
          const res = await fetch(`${API_URL}/users/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
          });
          if (res.ok) {
              setCurrentUser(prev => ({ ...prev, ...data }));
              setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
          }
      } catch (e) {
          console.error("Update failed", e);
      }
  };

  // Content Actions
  const addArticle = async (article: Article) => {
    try {
      const response = await fetch(`${API_URL}/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article)
      });
      if (response.ok) fetchAllData();
    } catch (e) { console.error(e); }
  };

  const updateArticle = async (updated: Article) => {
      try {
        const response = await fetch(`${API_URL}/articles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
        if (response.ok) fetchAllData();
      } catch (e) { console.error(e); }
  };

  const addThread = async (thread: ColiseumThread) => {
      try {
          const res = await fetch(`${API_URL}/coliseum/threads`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(thread)
          });
          if (res.ok) fetchAllData();
      } catch (e) { console.error(e); }
  };

  const addThreadComment = async (threadId: string, comment: Comment) => {
      try {
          const res = await fetch(`${API_URL}/coliseum/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ threadId, authorId: currentUser.id, content: comment.content })
          });
          if(res.ok) fetchAllData();
      } catch (e) { console.error(e); }
  };

  const addArticleComment = async (articleId: string, comment: Comment) => {
      try {
          const res = await fetch(`${API_URL}/articles/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ articleId, authorId: currentUser.id, content: comment.content, parentId: null })
          });
          if (res.ok) fetchAllData();
      } catch (e) { console.error(e); }
  };

  const replyToArticleComment = async (articleId: string, parentCommentId: string, reply: Comment) => {
      try {
          const res = await fetch(`${API_URL}/articles/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ articleId, authorId: currentUser.id, content: reply.content, parentId: parentCommentId })
          });
          if (res.ok) fetchAllData();
      } catch (e) { console.error(e); }
  };

  const replyToWallPost = async (postId: string, parentCommentId: string | null, reply: Comment) => {
      try {
          const res = await fetch(`${API_URL}/wall/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId, authorId: currentUser.id, content: reply.content, parentId: parentCommentId })
          });
          if (res.ok) fetchAllData();
      } catch (e) { console.error(e); }
  };

  const sendMessage = async (msg: ChatMessage) => {
      try {
          const res = await fetch(`${API_URL}/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(msg)
          });
          if (res.ok) fetchAllData();
      } catch (e) { console.error(e); }
  };

  const sendWallPost = async (post: WallPost) => {
      try {
          const res = await fetch(`${API_URL}/wall`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(post)
          });
          if (res.ok) fetchAllData();
      } catch (e) { console.error(e); }
  };

  const markNotificationRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const uploadMedia = (file: MediaItem) => setMediaFiles(prev => [file, ...prev]);

  const toggleWatch = (articleId: string) => {
      if(!currentUser || currentUser.id === 'guest') return;
      
      const currentWatchlist = currentUser.watchlist || [];
      let newWatchlist = [];
      if (currentWatchlist.includes(articleId)) {
          newWatchlist = currentWatchlist.filter(id => id !== articleId);
      } else {
          newWatchlist = [...currentWatchlist, articleId];
      }
      
      // Optimistic update
      setCurrentUser(prev => ({ ...prev, watchlist: newWatchlist }));
      
      // Persist to localStorage for now (would be DB call in production)
      // Since currentUser is reset on reload from /auth/me, this only lasts for session unless DB supports it.
      // We will pretend the DB supports it via the same user update endpoint if possible, but the DB schema likely needs updates.
      // For this demo, we'll keep it client-side context state or just simple console log.
      console.log(`Toggled watch for ${articleId}. New list:`, newWatchlist);
  };

  return (
    <DataContext.Provider value={{
      currentUser, isAuthenticated: !!token, isLoading, users, articles, threads, chatMessages, wallPosts, notifications, templates: TEMPLATES, mediaFiles,
      login, googleLogin, register, logout, updateUserProfile,
      addArticle, updateArticle, addThread, addThreadComment, addArticleComment, replyToArticleComment, sendMessage, sendWallPost, replyToWallPost, markNotificationRead, uploadMedia, toggleWatch
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
