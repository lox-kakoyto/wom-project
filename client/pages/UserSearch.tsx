
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, User, Shield, Zap } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { UserRole } from '../types';
import { DEFAULT_AVATAR } from '../constants';

export const UserSearch: React.FC = () => {
  const { users } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  // Fail-safe filtering to prevent crashes if users is undefined/null
  const safeUsers = Array.isArray(users) ? users : [];
  
  const filteredUsers = safeUsers.filter(u => 
    u && u.id !== 'guest' &&
    (searchTerm === '' || (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-display font-bold text-white">Find Users</h1>
        <p className="text-gray-400">Search for friends, rivals, and legends of the World of Madness.</p>
        
        <div className="max-w-md mx-auto relative">
            <input 
                type="text" 
                placeholder="Search by username..." 
                className="w-full bg-wom-panel border border-white/10 rounded-full py-3 px-12 text-white focus:border-wom-primary outline-none shadow-lg"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(user => (
            <Link key={user.id} to={`/profile/${user.username}`} className="group">
                <div className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-wom-primary/50 transition-all duration-300 flex flex-col items-center gap-4 relative overflow-hidden">
                    {/* Banner Tint */}
                    <div className="absolute inset-0 bg-gradient-to-b from-wom-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="relative z-10">
                        <div className="w-24 h-24 rounded-full p-1 border-2 border-wom-primary/30 group-hover:border-wom-accent transition-colors">
                            <img 
                                src={user.avatar || DEFAULT_AVATAR} 
                                alt={user.username} 
                                className="w-full h-full rounded-full object-cover"
                            />
                        </div>
                        {user.role === UserRole.ADMIN && (
                            <div className="absolute -bottom-1 -right-1 bg-red-500 text-white p-1 rounded-full shadow-lg" title="Admin">
                                <Shield size={14} fill="currentColor" />
                            </div>
                        )}
                        {user.role === UserRole.MODERATOR && (
                            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full shadow-lg" title="Moderator">
                                <Zap size={14} fill="currentColor" />
                            </div>
                        )}
                    </div>

                    <div className="text-center relative z-10">
                        <h3 className="text-xl font-bold text-white group-hover:text-wom-primary transition-colors">{user.username}</h3>
                        <span className="text-xs uppercase tracking-widest text-gray-500 bg-white/5 px-2 py-1 rounded mt-2 inline-block">
                            {user.role}
                        </span>
                        <p className="text-xs text-gray-400 mt-3">Joined {user.joinDate}</p>
                    </div>
                </div>
            </Link>
        ))}
        
        {filteredUsers.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
                No users found.
            </div>
        )}
      </div>
    </div>
  );
};