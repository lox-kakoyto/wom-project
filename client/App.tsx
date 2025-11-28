
import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Logo } from './components/Logo';
import { Dashboard } from './pages/Dashboard';
import { Wiki } from './pages/Wiki';
import { Coliseum } from './pages/Coliseum';
import { Chat } from './pages/Chat';
import { Profile } from './pages/Profile';
import { Editor } from './pages/Editor';
import { MediaGallery } from './pages/MediaGallery';
import { TemplateGuide } from './pages/TemplateGuide';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { UserSearch } from './pages/UserSearch';
import { Friends } from './pages/Friend';
import { Bell, Search, LogIn } from 'lucide-react';
import { useData } from './contexts/DataContext';
import { AnimatePresence, motion } from 'framer-motion';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LoadingScreen } from './components/LoadingScreen';

// YOUR GOOGLE CLIENT ID
const GOOGLE_CLIENT_ID = "831251822210-eljbdqkcp5f9bi0bdaqahpcdjmtve73m.apps.googleusercontent.com";

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.99 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

const SearchBar: React.FC = () => {
  const [term, setTerm] = useState('');
  const { articles } = useData();
  const navigate = useNavigate();
  const [results, setResults] = useState<typeof articles>([]);

  const handleSearch = (val: string) => {
    setTerm(val);
    if (val.length > 1) {
      setResults(articles.filter(a => a.title.toLowerCase().includes(val.toLowerCase())));
    } else {
      setResults([]);
    }
  };

  const handleResultClick = (slug: string) => {
    navigate(`/wiki/${slug}`);
    setTerm('');
    setResults([]);
  };

  return (
     <div className="hidden md:block relative z-50">
        <div className="flex items-center gap-2 bg-wom-panel border border-white/5 rounded-full px-4 py-1.5 w-96 transition-all focus-within:border-wom-primary/50 focus-within:shadow-[0_0_15px_rgba(168,85,247,0.2)]">
           <Search size={16} className="text-gray-500" />
           <input 
              type="text" 
              placeholder="Search Database..." 
              className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-gray-600"
              value={term}
              onChange={e => handleSearch(e.target.value)}
              onBlur={() => setTimeout(() => setResults([]), 200)} 
           />
        </div>
        <AnimatePresence>
        {results.length > 0 && (
           <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-full mt-2 w-full bg-wom-panel border border-wom-primary/20 rounded-lg shadow-2xl overflow-hidden"
           >
              {results.map(r => (
                 <div 
                    key={r.id} 
                    onMouseDown={() => handleResultClick(r.slug)} 
                    className="px-4 py-2 hover:bg-white/10 cursor-pointer flex items-center gap-2"
                 >
                    <img src={r.imageUrl || 'https://via.placeholder.com/30'} className="w-6 h-6 rounded object-cover" alt="icon"/>
                    <span className="text-white text-sm">{r.title}</span>
                 </div>
              ))}
           </motion.div>
        )}
        </AnimatePresence>
     </div>
  );
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />
        <Route path="/users" element={<PageWrapper><UserSearch /></PageWrapper>} />
        <Route path="/wiki" element={<PageWrapper><Wiki /></PageWrapper>} />
        <Route path="/wiki/:slug" element={<PageWrapper><Wiki /></PageWrapper>} />
        <Route path="/editor" element={<PageWrapper><Editor /></PageWrapper>} />
        <Route path="/editor/:slug" element={<PageWrapper><Editor /></PageWrapper>} />
        <Route path="/coliseum" element={<PageWrapper><Coliseum /></PageWrapper>} />
        {/* Chat route is now primarily for Direct Messages */}
        <Route path="/messages" element={<PageWrapper><Chat /></PageWrapper>} /> 
        <Route path="/friends" element={<PageWrapper><Friends /></PageWrapper>} />
        <Route path="/profile/:username" element={<PageWrapper><Profile /></PageWrapper>} />
        <Route path="/media" element={<PageWrapper><MediaGallery /></PageWrapper>} />
        <Route path="/templates" element={<PageWrapper><TemplateGuide /></PageWrapper>} />
        <Route path="/admin" element={<PageWrapper><div className="p-10 text-center text-xl text-red-500 font-display uppercase tracking-widest">Restricted Area: Level 5 Access Required</div></PageWrapper>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

const AppContent: React.FC = () => {
  const { currentUser, isAuthenticated, logout, notifications, isLoading } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  const handleLogout = () => {
      logout();
      navigate('/');
  };

  return (
      <div className="flex min-h-screen bg-wom-bg text-wom-text font-body selection:bg-wom-primary selection:text-white">
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-[9999]"
                >
                    <LoadingScreen />
                </motion.div>
            )}
        </AnimatePresence>

        {!isAuthPage && <Sidebar />}
        
        <div className={`flex-1 flex flex-col min-h-screen ${!isAuthPage ? 'md:ml-64' : ''}`}>
          {!isAuthPage && (
              <header className="sticky top-0 z-30 bg-wom-bg/80 backdrop-blur-md border-b border-wom-primary/10 h-16 px-6 flex items-center justify-between">
                <div className="md:hidden">
                  <Logo className="h-8" />
                </div>
                
                <SearchBar />

                <div className="flex items-center gap-4">
                  {isAuthenticated ? (
                      <>
                          <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="relative p-2 text-gray-400 hover:text-white transition-colors"
                          >
                              <Bell size={20} />
                              {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-wom-accent rounded-full animate-pulse"></span>
                              )}
                          </motion.button>
                          <div className="flex items-center gap-3">
                              <Link to={`/profile/${currentUser.username}`}>
                                    {currentUser.avatar ? (
                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-wom-primary cursor-pointer hover:scale-105 transition-transform">
                                            <img src={currentUser.avatar} alt="User" className="w-full h-full object-cover"/>
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-wom-primary/20 flex items-center justify-center text-xs font-bold text-wom-primary border border-wom-primary/50">
                                            {currentUser.username.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                              </Link>
                              <button onClick={handleLogout} className="text-xs text-red-400 font-bold hover:underline">Log Out</button>
                          </div>
                      </>
                  ) : (
                      <Link to="/login" className="flex items-center gap-2 px-4 py-2 bg-wom-primary/10 text-wom-primary font-bold rounded-lg hover:bg-wom-primary hover:text-white transition-colors">
                          <LogIn size={18} /> Login
                      </Link>
                  )}
                </div>
              </header>
          )}

          <main className={`flex-1 p-4 md:p-8 pb-24 md:pb-8 w-full max-w-[1600px] mx-auto overflow-x-hidden ${isAuthPage ? 'flex items-center justify-center' : ''}`}>
            <AnimatedRoutes />
          </main>
        </div>
        {!isAuthPage && <MobileNav />}
      </div>
  );
}

const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <Router>
           <AppContent />
        </Router>
    </GoogleOAuthProvider>
  );
};

export default App;
