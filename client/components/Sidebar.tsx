
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Swords, MessageSquare, User, Settings, ShieldAlert, Image, HelpCircle, Users, UserPlus } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { UserRole } from '../types';

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        isActive
          ? 'bg-wom-primary/20 text-wom-accent shadow-[0_0_15px_rgba(168,85,247,0.3)] border border-wom-primary/30'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`
    }
  >
    <span className="group-hover:scale-110 transition-transform">{icon}</span>
    <span className="font-medium tracking-wide">{label}</span>
  </NavLink>
);

export const Sidebar: React.FC = () => {
  const { currentUser, isAuthenticated, friendRequests } = useData();

  return (
    <aside className="w-64 h-screen bg-wom-bg border-r border-wom-primary/10 flex flex-col fixed left-0 top-0 z-20 hidden md:flex">
      <div className="p-6">
       <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 bg-gradient-to-br from-wom-primary to-wom-accent rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/50">
             <span className="font-display font-bold text-white text-xl">W</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white tracking-wider">WOM</h1>
            <p className="text-[10px] text-wom-primary tracking-[0.2em] uppercase">World of Madness</p>
          </div>
       </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-4 mb-2 mt-4">Main</div>
        <NavItem to="/" icon={<Home size={20} />} label="Dashboard" />
        <NavItem to="/wiki" icon={<BookOpen size={20} />} label="Wiki Database" />
        <NavItem to="/coliseum" icon={<Swords size={20} />} label="Coliseum" />
        <NavItem to="/media" icon={<Image size={20} />} label="Media Bank" />
        <NavItem to="/templates" icon={<HelpCircle size={20} />} label="Templates Guide" />
        
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-4 mb-2 mt-6">Social</div>
        <NavItem to="/users" icon={<Users size={20} />} label="Find Users" />
        
        {isAuthenticated && (
            <>
                <NavItem to="/friends" icon={
                    <div className="relative">
                        <UserPlus size={20} />
                        {friendRequests.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-wom-accent rounded-full animate-pulse"></span>}
                    </div>
                } label="Friends" />
                <NavItem to="/messages" icon={<MessageSquare size={20} />} label="Messages" />
                <NavItem to={`/profile/${currentUser.username}`} icon={<User size={20} />} label="My Profile" />
            </>
        )}

        {currentUser.role !== UserRole.USER && isAuthenticated && (
          <>
             <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-4 mb-2 mt-6">System</div>
             <NavItem to="/admin" icon={<ShieldAlert size={20} />} label="Moderation" />
          </>
        )}
      </nav>

      {isAuthenticated && (
          <div className="p-4 border-t border-wom-primary/10">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-wom-panel border border-white/5">
                {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full object-cover border border-wom-accent" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-wom-primary/20 flex items-center justify-center text-wom-primary font-bold">
                        {currentUser.username.charAt(0).toUpperCase()}
                    </div>
                )}
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{currentUser.username}</p>
                <p className="text-xs text-wom-primary">{currentUser.role}</p>
              </div>
              <Settings size={16} className="ml-auto text-gray-500 hover:text-white cursor-pointer" />
            </div>
          </div>
      )}
    </aside>
  );
};