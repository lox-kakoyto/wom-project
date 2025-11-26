
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
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load ALL public data from Server
  const fetchAllData = async () => {
    try {
        // 1. Users
        const usersRes = await fetch(`${API_URL}/users`);
        if (usersRes.ok) setUsers(await usersRes.json());

        // 2. Articles (with comments)
        const articlesRes = await fetch(`${API_URL}/articles`);
        if (articlesRes.ok) {
            const rawArticles = await articlesRes.json();
            // Process comments into trees
            const processedArticles = rawArticles.map((a: any) => ({
                ...a,
                comments: buildCommentTree(a.comments)
            }));
            setArticles(processedArticles);
        }

        // 3. Chat
        const chatRes = await fetch(`${API_URL}/chat`);
        if (chatRes.ok) setChatMessages(await chatRes.json());

        // 4. Coliseum Threads
        const threadsRes = await fetch(`${API_URL}/coliseum/threads`);
        if (threadsRes.ok) setThreads(await threadsRes.json());

        // 5. Wall Posts
        const wallRes = await fetch(`${API_URL}/wall`);
        if (wallRes.ok) {
            const rawWall = await wallRes.json();
            const processedWall = rawWall.map((p: any) => ({
                ...p,
                comments: buildCommentTree(p.comments)
            }));
            setWallPosts(processedWall);
        }

        // 6. Media
        const mediaRes = await fetch(`${API_URL}/media`);
        if (mediaRes.ok) setMediaFiles(await mediaRes.json());

    } catch (e) {
        console.error("Failed to load data", e);
    } finally {
        if (!token) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    // Polling every 5 seconds for chat/live updates
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
          // Optimistic update
          setCurrentUser(prev => ({ ...prev, ...data }));
          setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));

          await fetch(`${API_URL}/users/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
          });
      } catch (e) {
          console.error("Update failed", e);
      }
  };

  const addArticle = async (article: Article) => {
    try {
      await fetch(`${API_URL}/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article)
      });
      fetchAllData();
    } catch (e) { console.error(e); }
  };

  const updateArticle = async (updated: Article) => {
      try {
        await fetch(`${API_URL}/articles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
        fetchAllData();
      } catch (e) { console.error(e); }
  };

  const addThread = async (thread: ColiseumThread) => {
      // Optimistic
      setThreads(prev => [thread, ...prev]);
      try {
          await fetch(`${API_URL}/coliseum/threads`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(thread)
          });
      } catch (e) { 
          console.error(e); 
          setThreads(prev => prev.filter(t => t.id !== thread.id)); // Revert
      }
  };

  const addThreadComment = async (threadId: string, comment: Comment) => {
      // Optimistic
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, comments: [...t.comments, comment] } : t));
      try {
          await fetch(`${API_URL}/coliseum/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ threadId, authorId: currentUser.id, content: comment.content })
          });
      } catch (e) { 
          console.error(e); 
          // Revert logic omitted for brevity, simple removal
      }
  };

  const addArticleComment = async (articleId: string, comment: Comment) => {
      // Optimistic
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, comments: [...a.comments, comment] } : a));
      try {
          await fetch(`${API_URL}/articles/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ articleId, authorId: currentUser.id, content: comment.content, parentId: null })
          });
      } catch (e) { console.error(e); }
  };

  const replyToArticleComment = async (articleId: string, parentCommentId: string, reply: Comment) => {
      // Optimistic Logic
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

      try {
          await fetch(`${API_URL}/articles/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ articleId, authorId: currentUser.id, content: reply.content, parentId: parentCommentId })
          });
      } catch (e) { console.error(e); }
  };

  const replyToWallPost = async (postId: string, parentCommentId: string | null, reply: Comment) => {
      // Optimistic Logic
      setWallPosts(prev => prev.map(post => {
          if (post.id === postId) {
              if (parentCommentId === null) {
                  return { ...post, comments: [...(post.comments || []), reply] };
              } else {
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

      try {
          await fetch(`${API_URL}/wall/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId, authorId: currentUser.id, content: reply.content, parentId: parentCommentId })
          });
      } catch (e) { console.error(e); }
  };

  const sendMessage = async (msg: ChatMessage) => {
      // Optimistic
      setChatMessages(prev => [...prev, msg]);
      try {
          await fetch(`${API_URL}/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(msg)
          });
      } catch (e) { 
          console.error(e);
          setChatMessages(prev => prev.filter(m => m.id !== msg.id));
      }
  };

  const sendWallPost = async (post: WallPost) => {
      // Optimistic
      setWallPosts(prev => [post, ...prev]);
      try {
          await fetch(`${API_URL}/wall`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(post)
          });
      } catch (e) { 
          console.error(e);
          setWallPosts(prev => prev.filter(p => p.id !== post.id));
      }
  };

  const markNotificationRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  
  const uploadMedia = async (file: MediaItem) => {
      // Optimistic
      setMediaFiles(prev => [file, ...prev]);
      try {
          await fetch(`${API_URL}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(file)
          });
      } catch (e) {
          console.error(e);
          setMediaFiles(prev => prev.filter(f => f.id !== file.id));
      }
  };

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
