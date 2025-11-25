import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Swords, MessageSquare, Clock, Plus, User as UserIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { ColiseumThread, Comment } from '../types';

export const Coliseum: React.FC = () => {
  const { threads, addThread, currentUser, users, addThreadComment } = useData();
  const [view, setView] = useState<'list' | 'create' | 'thread'>('list');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Creation State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  // Comment State
  const [commentText, setCommentText] = useState('');

  const handleCreateThread = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    const thread: ColiseumThread = {
      id: Date.now().toString(),
      title: newTitle,
      authorId: currentUser.id,
      content: newContent,
      timestamp: new Date().toLocaleDateString(),
      linkedArticleIds: [],
      views: 0,
      comments: []
    };
    addThread(thread);
    setView('list');
    setNewTitle('');
    setNewContent('');
  };

  const handlePostComment = () => {
    if (!activeThreadId || !commentText.trim()) return;
    const comment: Comment = {
      id: Date.now().toString(),
      authorId: currentUser.id,
      content: commentText,
      timestamp: new Date().toLocaleTimeString(),
      replies: []
    };
    addThreadComment(activeThreadId, comment);
    setCommentText('');
  };

  const activeThread = threads.find(t => t.id === activeThreadId);

  if (view === 'create') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-display font-bold text-white">Create New Battle</h2>
          <button onClick={() => setView('list')} className="text-gray-400 hover:text-white">Cancel</button>
        </div>
        <div className="glass-panel p-8 rounded-xl space-y-4">
          <div>
            <label className="block text-sm font-bold text-wom-primary mb-2 uppercase">Battle Topic</label>
            <input 
              type="text" 
              className="w-full bg-black/50 border border-white/10 rounded-lg p-4 text-white focus:border-wom-primary outline-none"
              placeholder="e.g. Goku (MUI) vs. Saitama (Terra 2)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-wom-primary mb-2 uppercase">Rules & Conditions</label>
            <textarea 
              className="w-full h-64 bg-black/50 border border-white/10 rounded-lg p-4 text-white focus:border-wom-primary outline-none resize-none"
              placeholder="Describe the battlefield, restrictions, versions of characters..."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
            />
          </div>
          <button 
            onClick={handleCreateThread}
            className="w-full py-4 bg-gradient-to-r from-wom-primary to-wom-accent text-white font-bold rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all"
          >
            POST BATTLE
          </button>
        </div>
      </div>
    );
  }

  if (view === 'thread' && activeThread) {
    const author = users.find(u => u.id === activeThread.authorId) || currentUser;
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
         <button onClick={() => setView('list')} className="text-gray-400 hover:text-wom-primary mb-4 flex items-center gap-2">
            ← Back to Arena
         </button>
         
         {/* Original Post */}
         <div className="glass-panel border-l-4 border-wom-accent rounded-r-xl overflow-hidden">
            <div className="bg-white/5 p-4 flex justify-between items-center">
               <h1 className="text-2xl font-display font-bold text-white">{activeThread.title}</h1>
               <span className="text-sm text-gray-400 flex items-center gap-2"><Clock size={14}/> {activeThread.timestamp}</span>
            </div>
            <div className="p-6 flex gap-6">
               <div className="flex flex-col items-center gap-2 w-32 shrink-0">
                  <img src={author.avatar} className="w-16 h-16 rounded-full border-2 border-wom-primary" alt="OP"/>
                  <span className="font-bold text-wom-primary text-sm">{author.username}</span>
                  <span className="text-[10px] uppercase bg-white/10 px-2 py-0.5 rounded text-gray-400">{author.role}</span>
               </div>
               <div className="flex-1 prose prose-invert max-w-none text-gray-200 whitespace-pre-wrap">
                  {activeThread.content}
               </div>
            </div>
         </div>

         {/* Comments Area */}
         <div className="space-y-4 mt-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
               <MessageSquare /> Discussion ({activeThread.comments.length})
            </h3>
            
            {activeThread.comments.map(comment => {
               const commentAuthor = users.find(u => u.id === comment.authorId) || currentUser;
               return (
                  <div key={comment.id} className="glass-panel p-4 rounded-xl flex gap-4">
                     <img src={commentAuthor.avatar} className="w-10 h-10 rounded-full object-cover" alt="User" />
                     <div className="flex-1">
                        <div className="flex justify-between items-baseline mb-1">
                           <span className="font-bold text-wom-text">{commentAuthor.username}</span>
                           <span className="text-xs text-gray-500">{comment.timestamp}</span>
                        </div>
                        <p className="text-gray-300">{comment.content}</p>
                     </div>
                  </div>
               )
            })}

            {/* Reply Box */}
            <div className="glass-panel p-4 rounded-xl flex gap-4 mt-4">
               <img src={currentUser.avatar} className="w-10 h-10 rounded-full" alt="Me" />
               <div className="flex-1 space-y-2">
                  <textarea 
                     className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-wom-primary resize-none"
                     rows={3}
                     placeholder="Join the debate..."
                     value={commentText}
                     onChange={e => setCommentText(e.target.value)}
                  />
                  <div className="flex justify-end">
                     <button onClick={handlePostComment} className="px-6 py-2 bg-wom-primary text-white font-bold rounded-lg hover:bg-wom-accent transition-colors">
                        Post Reply
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-8">
         <div className="space-y-2">
            <h1 className="text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-purple-500 to-blue-500">
               THE COLISEUM
            </h1>
            <p className="text-gray-400 max-w-xl">
               The ultimate battleground. Create matchups, debate feats, and determine the strongest characters in the World of Madness.
            </p>
         </div>
         <button 
            onClick={() => setView('create')}
            className="px-6 py-3 bg-white text-black font-bold rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-lg shadow-white/10"
         >
            <Plus size={20} /> NEW BATTLE
         </button>
      </div>

      <div className="space-y-4">
         {threads.length === 0 ? (
            <div className="text-center py-20 text-gray-500 glass-panel rounded-xl">
               <Swords size={48} className="mx-auto mb-4 opacity-50" />
               <p>No battles currently raging. Start one yourself!</p>
            </div>
         ) : (
            threads.map(thread => {
               const author = users.find(u => u.id === thread.authorId) || currentUser;
               return (
                  <div 
                     key={thread.id} 
                     onClick={() => { setActiveThreadId(thread.id); setView('thread'); }}
                     className="glass-panel p-4 rounded-xl cursor-pointer hover:border-wom-accent/50 transition-all group relative overflow-hidden"
                  >
                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-wom-primary to-transparent group-hover:w-2 transition-all"></div>
                     <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/5 rounded-lg text-wom-primary group-hover:bg-wom-primary group-hover:text-white transition-colors">
                           <Swords size={24} />
                        </div>
                        <div className="flex-1">
                           <h3 className="text-lg font-bold text-white group-hover:text-wom-accent transition-colors mb-1">{thread.title}</h3>
                           <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1 text-wom-primary"><UserIcon size={12}/> {author.username}</span>
                              <span className="flex items-center gap-1"><Clock size={12}/> {thread.timestamp}</span>
                              <span className="flex items-center gap-1"><MessageSquare size={12}/> {thread.comments.length} replies</span>
                           </div>
                        </div>
                        <div className="hidden md:block text-right">
                           <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Active</span>
                        </div>
                     </div>
                  </div>
               );
            })
         )}
      </div>
    </div>
  );
};