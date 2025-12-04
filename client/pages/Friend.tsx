
import React, { useState } from 'react';
import { UserPlus, Check, X, User as UserIcon, MessageSquare } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Link, useNavigate } from 'react-router-dom';

export const Friends: React.FC = () => {
  const { friends, friendRequests, acceptFriendRequest, rejectFriendRequest, setActiveConversation, users, sendFriendRequest, currentUser } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleMessage = (roomId: string) => {
      setActiveConversation(roomId);
      navigate('/messages');
  };

  const handleAddFriend = (userId: string) => {
      sendFriendRequest(userId);
      alert("Friend request sent!");
      setSearchTerm('');
  };

  const usersToSearch = users.filter(u => 
      u.id !== currentUser.id && 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) && 
      !friends.find(f => f.friendId === u.id)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <UserPlus className="text-wom-primary" /> Friends & Requests
        </h1>

        {/* Incoming Requests */}
        {friendRequests.length > 0 && (
            <div className="bg-wom-panel border border-wom-accent/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-wom-accent animate-pulse"></span>
                    Incoming Requests
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {friendRequests.map(req => (
                        <div key={req.id} className="bg-black/30 p-4 rounded-lg flex items-center justify-between border border-white/5">
                            <div className="flex items-center gap-3">
                                <img src={req.sender?.avatar || 'https://via.placeholder.com/50'} className="w-10 h-10 rounded-full object-cover" alt="User" />
                                <span className="font-bold text-white">{req.sender?.username || 'Unknown User'}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => acceptFriendRequest(req.id)} className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded transition-colors"><Check size={18} /></button>
                                <button onClick={() => rejectFriendRequest(req.id)} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors"><X size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Friends List */}
            <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-bold text-gray-300">My Friends ({friends.length})</h2>
                <div className="bg-wom-panel border border-white/10 rounded-xl overflow-hidden min-h-[300px]">
                    {friends.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">
                            You haven't added any friends yet.
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {friends.map(f => (
                                <div key={f.friendId} className="p-4 hover:bg-white/5 flex items-center justify-between transition-colors group">
                                    <Link to={`/profile/${f.friend.username}`} className="flex items-center gap-4">
                                        <div className="relative">
                                            <img src={f.friend.avatar || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full object-cover border border-white/10" alt="Friend" />
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white group-hover:text-wom-primary transition-colors">{f.friend.username}</h4>
                                            <p className="text-xs text-gray-500">{f.friend.role}</p>
                                        </div>
                                    </Link>
                                    <button 
                                        onClick={() => handleMessage(f.roomId)}
                                        className="px-4 py-2 bg-white/5 hover:bg-wom-primary hover:text-white text-gray-300 rounded-lg flex items-center gap-2 text-sm font-bold transition-all"
                                    >
                                        <MessageSquare size={16} /> Message
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Friend Search */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-300">Add New Friend</h2>
                <div className="bg-wom-panel border border-white/10 rounded-xl p-6">
                    <input 
                        type="text" 
                        placeholder="Search username..." 
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-wom-primary outline-none mb-4"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    
                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {searchTerm && usersToSearch.length === 0 && <p className="text-gray-500 text-sm">No users found.</p>}
                        {searchTerm && usersToSearch.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors">
                                <div className="flex items-center gap-2">
                                    <img src={u.avatar || 'https://via.placeholder.com/30'} className="w-8 h-8 rounded-full" alt="User" />
                                    <span className="text-sm text-white font-bold">{u.username}</span>
                                </div>
                                <button onClick={() => handleAddFriend(u.id)} className="p-1.5 bg-wom-primary/20 text-wom-primary hover:bg-wom-primary hover:text-white rounded transition-colors">
                                    <UserPlus size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};