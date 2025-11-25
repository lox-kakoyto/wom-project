
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
    joinDate: new Date().toLocaleDateString()
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
  replyToWallPost: (postId: string, parentCommentId: string | null, reply: Comment) => void; // NEW
  markNotificationRead: (id: string) => void;
  uploadMedia: (file: MediaItem) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('wom_token'));
  const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  
  const [users, setUsers] = useState<User[]>([]);
  const [articles, setArticles] = useState<Article[]>([]); 

  // Mock data (Local Storage)
  const [threads, setThreads] = useState<ColiseumThread[]>(() => JSON.parse(localStorage.getItem('wom_threads') || '[]'));
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => JSON.parse(localStorage.getItem('wom_chat') || '[]'));
  const [wallPosts, setWallPosts] = useState<WallPost[]>(() => JSON.parse(localStorage.getItem('wom_wall') || '[]'));
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>(() => JSON.parse(localStorage.getItem('wom_media') || '[]'));
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load public data
  useEffect(() => {
    const fetchPublicData = async () => {
        setIsLoading(true);
        try {
            const articlesRes = await fetch(`${API_URL}/articles`);
            if (articlesRes.ok) setArticles(await articlesRes.json());
            
            const usersRes = await fetch(`${API_URL}/users`);
            if (usersRes.ok) setUsers(await usersRes.json());
        } catch (e) {
            console.error("Failed to load public data", e);
        } finally {
            if (!token) setIsLoading(false);
        }
    };
    fetchPublicData();
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
                    joinDate: new Date(userData.created_at).toLocaleDateString()
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

  useEffect(() => localStorage.setItem('wom_threads', JSON.stringify(threads)), [threads]);
  useEffect(() => localStorage.setItem('wom_chat', JSON.stringify(chatMessages)), [chatMessages]);
  useEffect(() => localStorage.setItem('wom_wall', JSON.stringify(wallPosts)), [wallPosts]);
  useEffect(() => localStorage.setItem('wom_media', JSON.stringify(mediaFiles)), [mediaFiles]);

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

  const addArticle = async (article: Article) => {
    try {
      const response = await fetch(`${API_URL}/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article)
      });
      if (response.ok) {
        const savedArticle = await response.json(); 
        const formattedArticle: Article = {
           ...article,
           id: savedArticle.id.toString(),
           authorId: savedArticle.author_id ? savedArticle.author_id.toString() : currentUser.id
        };
        setArticles(prev => [formattedArticle, ...prev]);
      }
    } catch (e) { console.error(e); }
  };

  const updateArticle = (updated: Article) => {
    setArticles(prev => prev.map(a => a.id === updated.id ? updated : a));
  };
  const addThread = (thread: ColiseumThread) => setThreads(prev => [thread, ...prev]);
  const addThreadComment = (threadId: string, comment: Comment) => {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, comments: [...t.comments, comment] } : t));
  };
  const addArticleComment = (articleId: string, comment: Comment) => {
    setArticles(prev => prev.map(a => a.id === articleId ? { ...a, comments: [...a.comments, comment] } : a));
  };

  const replyToArticleComment = (articleId: string, parentCommentId: string, reply: Comment) => {
      const addReplyToComment = (comments: Comment[]): Comment[] => {
          return comments.map(c => {
              if (c.id === parentCommentId) {
                  return { ...c, replies: [...(c.replies || []), reply] };
              }
              if (c.replies && c.replies.length > 0) {
                  return { ...c, replies: addReplyToComment(c.replies) };
              }
              return c;
          });
      };

      setArticles(prev => prev.map(a => {
          if (a.id === articleId) {
              return { ...a, comments: addReplyToComment(a.comments) };
          }
          return a;
      }));
  };

  const replyToWallPost = (postId: string, parentCommentId: string | null, reply: Comment) => {
      setWallPosts(prev => prev.map(post => {
          if (post.id === postId) {
              if (parentCommentId === null) {
                  // Reply to the main post (add to root comments)
                  return { ...post, comments: [...(post.comments || []), reply] };
              } else {
                  // Reply to a comment
                  const addReply = (comments: Comment[]): Comment[] => {
                      return comments.map(c => {
                          if (c.id === parentCommentId) {
                              return { ...c, replies: [...(c.replies || []), reply] };
                          }
                          if (c.replies) {
                              return { ...c, replies: addReply(c.replies) };
                          }
                          return c;
                      });
                  };
                  return { ...post, comments: addReply(post.comments || []) };
              }
          }
          return post;
      }));
  };

  const sendMessage = (msg: ChatMessage) => setChatMessages(prev => [...prev, msg]);
  const sendWallPost = (post: WallPost) => setWallPosts(prev => [post, ...prev]);
  const markNotificationRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const uploadMedia = (file: MediaItem) => setMediaFiles(prev => [file, ...prev]);

  return (
    <DataContext.Provider value={{
      currentUser, isAuthenticated: !!token, isLoading, users, articles, threads, chatMessages, wallPosts, notifications, templates: TEMPLATES, mediaFiles,
      login, googleLogin, register, logout, updateUserProfile,
      addArticle, updateArticle, addThread, addThreadComment, addArticleComment, replyToArticleComment, sendMessage, sendWallPost, replyToWallPost, markNotificationRead, uploadMedia
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
