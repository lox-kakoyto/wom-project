
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Swords, MessageSquare, User, Settings, ShieldAlert, Image, HelpCircle, Users, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { UserRole } from '../types';

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; collapsed: boolean }> = ({ to, icon, label, collapsed }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group ${
        isActive
          ? 'bg-wom-primary/20 text-wom-accent shadow-[0_0_15px_rgba(168,85,247,0.3)] border border-wom-primary/30'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`
    }
    title={collapsed ? label : undefined}
  >
    <span className="group-hover:scale-110 transition-transform">{icon}</span>
    {!collapsed && <span className="font-medium tracking-wide animate-fade-in">{label}</span>}
  </NavLink>
);

export const Sidebar: React.FC = () => {
  const { currentUser, isAuthenticated, friendRequests, isSidebarCollapsed, toggleSidebar } = useData();

  return (
    <aside 
        className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} h-screen bg-wom-bg border-r border-wom-primary/10 flex flex-col fixed left-0 top-0 z-20 hidden md:flex transition-all duration-300`}
    >
      <div className={`p-6 flex ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} items-center`}>
        {!isSidebarCollapsed && (
            <div className="flex items-center gap-3 mb-2 animate-fade-in">
                <div className="h-10 w-10 bg-gradient-to-br from-wom-primary to-wom-accent rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/50">
                    <span className="font-display font-bold text-white text-xl">W</span>
                </div>
                <div>
                    <h1 className="font-display font-bold text-xl text-white tracking-wider">WOM</h1>
                    <p className="text-[10px] text-wom-primary tracking-[0.2em] uppercase">World of Madness</p>
                </div>
            </div>
        )}
        {isSidebarCollapsed && (
             <div className="h-10 w-10 bg-gradient-to-br from-wom-primary to-wom-accent rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/50 mb-2">
                <span className="font-display font-bold text-white text-xl">W</span>
             </div>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
        <div className={`text-xs font-bold text-gray-500 uppercase tracking-wider ${isSidebarCollapsed ? 'text-center' : 'px-4'} mb-2 mt-4`}>
            {isSidebarCollapsed ? '---' : 'Main'}
        </div>
        <NavItem to="/" icon={<Home size={20} />} label="Dashboard" collapsed={isSidebarCollapsed} />
        <NavItem to="/wiki" icon={<BookOpen size={20} />} label="Wiki Database" collapsed={isSidebarCollapsed} />
        <NavItem to="/coliseum" icon={<Swords size={20} />} label="Coliseum" collapsed={isSidebarCollapsed} />
        <NavItem to="/media" icon={<Image size={20} />} label="Media Bank" collapsed={isSidebarCollapsed} />
        <NavItem to="/templates" icon={<HelpCircle size={20} />} label="Templates Guide" collapsed={isSidebarCollapsed} />
        
        <div className={`text-xs font-bold text-gray-500 uppercase tracking-wider ${isSidebarCollapsed ? 'text-center' : 'px-4'} mb-2 mt-6`}>
             {isSidebarCollapsed ? '---' : 'Social'}
        </div>
        <NavItem to="/users" icon={<Users size={20} />} label="Find Users" collapsed={isSidebarCollapsed} />
        
        {isAuthenticated && (
            <>
                <NavItem to="/friends" collapsed={isSidebarCollapsed} icon={
                    <div className="relative">
                        <UserPlus size={20} />
                        {friendRequests.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-wom-accent rounded-full animate-pulse"></span>}
                    </div>
                } label="Friends" />
                <NavItem to="/messages" icon={<MessageSquare size={20} />} label="Messages" collapsed={isSidebarCollapsed} />
                <NavItem to={`/profile/${currentUser.username}`} icon={<User size={20} />} label="My Profile" collapsed={isSidebarCollapsed} />
            </>
        )}

        {currentUser.role !== UserRole.USER && isAuthenticated && (
          <>
             <div className={`text-xs font-bold text-gray-500 uppercase tracking-wider ${isSidebarCollapsed ? 'text-center' : 'px-4'} mb-2 mt-6`}>
                {isSidebarCollapsed ? '---' : 'System'}
             </div>
             <NavItem to="/admin" icon={<ShieldAlert size={20} />} label="Moderation" collapsed={isSidebarCollapsed} />
          </>
        )}
      </nav>

      <div className="p-4 border-t border-white/5 flex justify-center">
         <button 
            onClick={toggleSidebar}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
         >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
         </button>
      </div>
    </aside>
  );
};