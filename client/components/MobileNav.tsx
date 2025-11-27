import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Swords, MessageSquare, User, Menu, X, Image, HelpCircle, ShieldAlert, Users } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole } from '../types';

export const MobileNav: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const { currentUser } = useData();

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-wom-panel border-t border-wom-primary/20 p-2 z-50 flex justify-around items-center backdrop-blur-xl pb-safe">
        <NavLink to="/" className={({isActive}) => `p-2 rounded-lg transition-colors ${isActive ? 'text-wom-accent' : 'text-gray-400'}`}>
            <Home size={24} />
        </NavLink>
        <NavLink to="/wiki" className={({isActive}) => `p-2 rounded-lg transition-colors ${isActive ? 'text-wom-accent' : 'text-gray-400'}`}>
            <BookOpen size={24} />
        </NavLink>
        
        <div className="relative -top-6">
          <NavLink to="/coliseum" className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-wom-primary to-wom-accent shadow-[0_0_20px_rgba(168,85,247,0.5)] border-4 border-wom-bg text-white hover:scale-105 transition-transform active:scale-95">
            <Swords size={28} />
          </NavLink>
        </div>
        
        <NavLink to="/chat" className={({isActive}) => `p-2 rounded-lg transition-colors ${isActive ? 'text-wom-accent' : 'text-gray-400'}`}>
            <MessageSquare size={24} />
        </NavLink>
        
        <button 
            onClick={() => setShowMenu(!showMenu)} 
            className={`p-2 rounded-lg transition-colors ${showMenu ? 'text-wom-accent' : 'text-gray-400'}`}
        >
            <Menu size={24} />
        </button>
      </nav>

      {/* Expanded Menu Drawer */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 bg-wom-panel border-t border-wom-primary/30 z-50 rounded-t-3xl overflow-hidden pb-24 shadow-[0_-5px_30px_rgba(0,0,0,0.8)]"
            >
               <div className="flex justify-center p-2">
                   <div className="w-12 h-1 bg-white/20 rounded-full"></div>
               </div>

               <div className="p-6 grid grid-cols-2 gap-4">
                  <NavLink 
                    to={`/profile/${currentUser.username}`} 
                    onClick={() => setShowMenu(false)}
                    className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/5 hover:border-wom-primary/50 transition-colors"
                  >
                     <User size={24} className="mb-2 text-wom-primary" />
                     <span className="text-sm font-bold text-white">Profile</span>
                  </NavLink>

                  <NavLink 
                    to="/users" 
                    onClick={() => setShowMenu(false)}
                    className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/5 hover:border-wom-primary/50 transition-colors"
                  >
                     <Users size={24} className="mb-2 text-yellow-400" />
                     <span className="text-sm font-bold text-white">Find Users</span>
                  </NavLink>

                  <NavLink 
                    to="/media" 
                    onClick={() => setShowMenu(false)}
                    className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/5 hover:border-wom-primary/50 transition-colors"
                  >
                     <Image size={24} className="mb-2 text-blue-400" />
                     <span className="text-sm font-bold text-white">Media Bank</span>
                  </NavLink>

                  <NavLink 
                    to="/templates" 
                    onClick={() => setShowMenu(false)}
                    className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/5 hover:border-wom-primary/50 transition-colors"
                  >
                     <HelpCircle size={24} className="mb-2 text-green-400" />
                     <span className="text-sm font-bold text-white">Templates</span>
                  </NavLink>

                   {currentUser.role !== UserRole.USER && (
                      <NavLink 
                        to="/admin" 
                        onClick={() => setShowMenu(false)}
                        className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/5 hover:border-wom-primary/50 transition-colors"
                      >
                        <ShieldAlert size={24} className="mb-2 text-red-400" />
                        <span className="text-sm font-bold text-white">Admin</span>
                      </NavLink>
                   )}
               </div>

               <div className="px-6 pb-6">
                   <button 
                      onClick={() => setShowMenu(false)}
                      className="w-full py-3 bg-white/10 rounded-xl text-sm font-bold text-gray-300 hover:bg-white/20 hover:text-white transition-colors flex items-center justify-center gap-2"
                   >
                       <X size={16} /> Close Menu
                   </button>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
