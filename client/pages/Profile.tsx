
import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Edit3, Camera, Save, X, Reply } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { WallPost, Comment } from '../types';
import { DEFAULT_AVATAR } from '../constants';

const WallComment: React.FC<{ comment: Comment, postId: string }> = ({ comment, postId }) => {
    const { currentUser, users, replyToWallPost } = useData();
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    
    const author = users.find(u => u.id === comment.authorId) || { username: 'Unknown', avatar: '' };
    const authorAvatar = author.avatar || DEFAULT_AVATAR;

    const handleReply = () => {
        if(!replyText.trim()) return;
        const newReply: Comment = {
            id: Date.now().toString() + Math.random().toString(),
            authorId: currentUser.id,
            content: replyText,
            timestamp: new Date().toLocaleTimeString(),
            replies: []
        };
        replyToWallPost(postId, comment.id, newReply);
        setIsReplying(false);
        setReplyText('');
    };

    return (
        <div className="flex gap-3 mb-3 mt-3 border-t border-white/5 pt-3">
             <div className="shrink-0">
                 <img src={authorAvatar} className="w-6 h-6 rounded-full object-cover" alt="User" />
             </div>
             <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2 mb-1">
                     <span className="font-bold text-gray-300 text-xs">{author.username}</span>
                     <span className="text-[10px] text-gray-600">{comment.timestamp}</span>
                 </div>
                 <p className="text-gray-400 text-xs leading-relaxed mb-1 whitespace-pre-wrap">{comment.content}</p>
                 
                 {currentUser.id !== 'guest' && (
                     <button 
                         onClick={() => setIsReplying(!isReplying)}
                         className="text-[10px] font-bold text-gray-500 hover:text-wom-primary flex items-center gap-1 transition-colors"
                     >
                         Reply
                     </button>
                 )}

                 {isReplying && (
                     <div className="mt-2 animate-fade-in mb-2">
                        <textarea 
                           className="w-full bg-black/30 border border-white/10 rounded p-2 text-xs text-white focus:border-wom-primary outline-none resize-none"
                           rows={2}
                           autoFocus
                           placeholder={`Reply...`}
                           value={replyText}
                           onChange={e => setReplyText(e.target.value)}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                           <button onClick={() => setIsReplying(false)} className="text-[10px] text-gray-400 hover:text-white">Cancel</button>
                           <button onClick={handleReply} className="px-3 py-1 bg-wom-primary text-white text-[10px] font-bold rounded hover:bg-wom-accent">Post</button>
                        </div>
                     </div>
                 )}

                 {/* Flattened Replies (One level deep visual style) */}
                 {comment.replies && comment.replies.length > 0 && (
                     <div className="mt-2 ml-4 pl-3 border-l border-white/10 space-y-2">
                         {comment.replies.map(reply => {
                             const replyAuthor = users.find(u => u.id === reply.authorId) || { username: 'Unknown', avatar: '' };
                             return (
                                <div key={reply.id} className="flex gap-2">
                                     <img src={replyAuthor.avatar || DEFAULT_AVATAR} className="w-5 h-5 rounded-full object-cover" alt="U" />
                                     <div>
                                         <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-400">{replyAuthor.username}</span>
                                            <span className="text-[9px] text-gray-700">{reply.timestamp}</span>
                                         </div>
                                         <p className="text-[11px] text-gray-500">{reply.content}</p>
                                     </div>
                                </div>
                             )
                         })}
                     </div>
                 )}
             </div>
        </div>
    );
};

export const Profile: React.FC = () => {
  const { username } = useParams();
  const { currentUser, wallPosts, sendWallPost, replyToWallPost, articles, users, updateUserProfile } = useData();
  const [activeTab, setActiveTab] = useState<'wall' | 'history'>('wall');
  const [wallInput, setWallInput] = useState('');
  
  // Reply state for main posts
  const [replyingToPostId, setReplyingToPostId] = useState<string | null>(null);
  const [postReplyText, setPostReplyText] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Correctly find the user being viewed, separate from the logged-in user
  const profileUser = users.find(u => u.username === username);
  
  // Fallback for loading state or invalid user
  if (!profileUser) {
      if (username) return <div className="text-center p-20 text-gray-500">User "{username}" not found.</div>;
      return null; 
  }

  const isOwner = currentUser.id === profileUser.id && currentUser.id !== 'guest';

  const handleWallPost = () => {
     if(!wallInput.trim()) return;
     const newPost: WallPost = {
        id: Date.now().toString(),
        authorId: currentUser.id,
        targetUserId: profileUser.id,
        content: wallInput,
        timestamp: new Date().toLocaleString(),
        comments: []
     };
     sendWallPost(newPost);
     setWallInput('');
  };

  const handlePostReply = (postId: string) => {
      if(!postReplyText.trim()) return;
      const newReply: Comment = {
          id: Date.now().toString(),
          authorId: currentUser.id,
          content: postReplyText,
          timestamp: new Date().toLocaleTimeString(),
          replies: []
      };
      replyToWallPost(postId, null, newReply);
      setReplyingToPostId(null);
      setPostReplyText('');
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 8 * 1024 * 1024) return alert("Max Avatar size is 8MB");
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  updateUserProfile(currentUser.id, { avatar: ev.target.result as string });
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 10 * 1024 * 1024) return alert("Max Banner size is 10MB");
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  updateUserProfile(currentUser.id, { banner: ev.target.result as string });
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const saveBio = () => {
      updateUserProfile(currentUser.id, { bio: editBio });
      setIsEditing(false);
  };

  const userWallPosts = wallPosts.filter(p => p.targetUserId === profileUser.id);
  const userArticles = articles.filter(a => a.authorId === profileUser.id);

  const displayAvatar = profileUser.avatar || DEFAULT_AVATAR;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile Header Container */}
      <div className="relative mb-24">
          {/* Banner */}
          <div className="relative h-60 md:h-80 rounded-2xl overflow-hidden glass-panel border border-white/5 group z-0">
             {profileUser.banner ? (
                 <img src={profileUser.banner} className="w-full h-full object-cover" alt="Banner" />
             ) : (
                 <div className="absolute inset-0 bg-gradient-to-r from-wom-primary/20 to-purple-900/40"></div>
             )}
             
             {isOwner && (
                 <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => bannerInputRef.current?.click()} className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg backdrop-blur-md flex items-center gap-2 text-sm font-bold">
                         <Camera size={16} /> Edit Banner
                     </button>
                     <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={handleBannerUpload} />
                 </div>
             )}
          </div>

          {/* Avatar & Info Overlay */}
          <div className="absolute -bottom-20 left-6 right-6 flex items-end gap-6 z-20 pointer-events-none">
              {/* Avatar */}
              <div className="relative group/avatar pointer-events-auto z-50">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-wom-bg overflow-hidden bg-black shadow-2xl">
                      <img src={displayAvatar} className="w-full h-full object-cover" alt="Profile" />
                  </div>
                  {isOwner && (
                      <div 
                          onClick={() => avatarInputRef.current?.click()}
                          className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity border-4 border-transparent"
                      >
                          <Camera size={24} className="text-white" />
                          <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                      </div>
                  )}
              </div>

              {/* User Details & Edit Button */}
              <div className="flex-1 flex justify-between items-end pb-2 pointer-events-auto">
                   <div className="mb-2">
                        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-2 drop-shadow-lg">
                            {profileUser.username} 
                            <span className="text-xs px-2 py-1 bg-wom-primary rounded text-white font-sans uppercase tracking-widest shadow-lg shadow-purple-500/50">{profileUser.role}</span>
                        </h1>
                        <p className="text-gray-300 text-sm flex items-center gap-4 mt-1 drop-shadow-md">
                            <span className="flex items-center gap-1"><Calendar size={14} /> Joined {profileUser.joinDate}</span>
                        </p>
                   </div>
              </div>
              
              {/* Edit Button inside banner area for better visibility */}
              {isOwner && !isEditing && (
                   <div className="pointer-events-auto absolute bottom-4 right-0 mb-20 mr-4 md:mb-24 md:mr-6">
                       <button onClick={() => { setIsEditing(true); setEditBio(profileUser.bio || ''); }} className="px-6 py-2 bg-black/50 border border-white/20 hover:bg-wom-primary/80 hover:border-wom-primary backdrop-blur-md rounded-lg text-sm font-bold text-white flex items-center gap-2 transition-all shadow-lg">
                           <Edit3 size={16} /> Edit Profile
                       </button>
                   </div>
               )}
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-10">
        {/* Sidebar Info */}
        <div className="space-y-6">
           <div className="glass-panel p-4 rounded-xl relative">
              <h3 className="font-bold text-white mb-2 border-b border-white/10 pb-2 flex justify-between">
                  About
                  {isOwner && isEditing && (
                      <div className="flex gap-2">
                          <button onClick={saveBio} className="text-green-400"><Save size={16}/></button>
                          <button onClick={() => setIsEditing(false)} className="text-red-400"><X size={16}/></button>
                      </div>
                  )}
              </h3>
              {isOwner && isEditing ? (
                  <textarea 
                    className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm text-white focus:border-wom-primary outline-none"
                    rows={4}
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                  />
              ) : (
                  <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{profileUser.bio || "No bio yet."}</p>
              )}
           </div>
           
           <div className="glass-panel p-4 rounded-xl">
             <h3 className="font-bold text-white mb-4 border-b border-white/10 pb-2">Stats</h3>
             <div className="space-y-3">
               <div className="flex justify-between text-sm"><span className="text-gray-500">Wall Posts</span> <span className="text-white">{userWallPosts.length}</span></div>
               <div className="flex justify-between text-sm"><span className="text-gray-500">Articles</span> <span className="text-white">{userArticles.length}</span></div>
             </div>
           </div>
        </div>

        {/* Main Content Tabs */}
        <div className="md:col-span-3 space-y-6">
           <div className="flex gap-4 border-b border-white/10 pb-2">
              <button onClick={() => setActiveTab('wall')} className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'wall' ? 'text-wom-primary border-b-2 border-wom-primary' : 'text-gray-500 hover:text-white'}`}>Discussion Wall</button>
              <button onClick={() => setActiveTab('history')} className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'history' ? 'text-wom-primary border-b-2 border-wom-primary' : 'text-gray-500 hover:text-white'}`}>Contributions</button>
           </div>

           <div className="glass-panel p-6 rounded-xl min-h-[300px]">
              {activeTab === 'wall' && (
                <div className="space-y-6">
                  {currentUser.id !== 'guest' && (
                      <div className="flex gap-4 mb-8">
                        {/* Fallback avatar for current user in input */}
                        <img src={currentUser.avatar || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover" alt="Me" />
                        <div className="flex-1">
                            <textarea 
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-wom-primary resize-none" 
                            rows={3} 
                            placeholder={`Write something on ${profileUser.username}'s wall...`}
                            value={wallInput}
                            onChange={e => setWallInput(e.target.value)}
                            />
                            <div className="flex justify-end mt-2">
                            <button onClick={handleWallPost} className="px-4 py-1.5 bg-wom-primary text-white rounded text-sm font-bold hover:bg-wom-glow shadow-[0_0_10px_rgba(168,85,247,0.3)]">Post</button>
                            </div>
                        </div>
                      </div>
                  )}
                  
                  {userWallPosts.length === 0 && <p className="text-gray-500 text-center">No posts yet.</p>}

                  {userWallPosts.map(post => {
                     const author = users.find(u => u.id === post.authorId) || { username: 'Unknown', avatar: '' };
                     const authorAvatar = author.avatar || DEFAULT_AVATAR;
                     return (
                        <div key={post.id} className="border-b border-white/5 pb-6 last:border-0">
                           <div className="flex gap-4">
                                <img src={authorAvatar} className="w-10 h-10 rounded-full object-cover" alt="Other" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-white">{author.username}</span>
                                        <span className="text-xs text-gray-500">{post.timestamp}</span>
                                    </div>
                                    <p className="text-gray-300 mb-2 whitespace-pre-wrap">{post.content}</p>
                                    
                                    {/* Reply Button for Post */}
                                    {currentUser.id !== 'guest' && (
                                        <button 
                                            onClick={() => setReplyingToPostId(replyingToPostId === post.id ? null : post.id)}
                                            className="text-xs font-bold text-gray-500 hover:text-wom-primary flex items-center gap-1 transition-colors"
                                        >
                                            <Reply size={12} /> Reply
                                        </button>
                                    )}

                                    {/* Main Post Reply Input */}
                                    {replyingToPostId === post.id && (
                                        <div className="mt-2 flex gap-2 animate-fade-in">
                                            <input 
                                                type="text" 
                                                className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-wom-primary outline-none"
                                                placeholder="Write a reply..."
                                                autoFocus
                                                value={postReplyText}
                                                onChange={e => setPostReplyText(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handlePostReply(post.id)}
                                            />
                                            <button onClick={() => handlePostReply(post.id)} className="px-3 py-1 bg-wom-primary text-white text-sm font-bold rounded">Send</button>
                                        </div>
                                    )}
                                </div>
                           </div>

                           {/* Nested Comments (Flattened Visuals) */}
                           {post.comments && post.comments.length > 0 && (
                               <div className="pl-2">
                                   {post.comments.map(comment => (
                                       <WallComment key={comment.id} comment={comment} postId={post.id} />
                                   ))}
                               </div>
                           )}
                        </div>
                     )
                  })}
                </div>
              )}

              {activeTab === 'history' && (
                 <div className="space-y-4">
                    {userArticles.map(article => (
                       <div key={article.id} className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/5 hover:border-wom-primary/30 transition-colors">
                          <div className="flex items-center gap-3">
                             <div className="p-2 bg-wom-primary/20 rounded text-wom-primary"></div>
                             <div>
                                <p className="text-white font-medium">Created article <span className="text-wom-accent">{article.title}</span></p>
                                <p className="text-xs text-gray-500">{article.lastEdited}</p>
                             </div>
                          </div>
                       </div>
                    ))}
                    {userArticles.length === 0 && <p className="text-gray-500 text-center">No contributions yet.</p>}
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};