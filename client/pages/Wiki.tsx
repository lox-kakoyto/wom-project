
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PenTool, Filter, HardDrive, MessageCircle, ArrowRight } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { ArticleCategory, Comment } from '../types';
import { WikitextRenderer, parseInfobox } from '../components/WikitextRenderer';

/* ============================================================================
   MAIN PAGE COMPONENTS
   ============================================================================ */

const SingleComment: React.FC<{ comment: Comment, articleId: string, depth?: number }> = ({ comment, articleId, depth = 0 }) => {
    const { currentUser, users, replyToArticleComment } = useData();
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    
    const author = users.find(u => u.id === comment.authorId) || currentUser;

    const handleReply = () => {
        if(!replyText.trim()) return;
        const newReply: Comment = {
            id: Date.now().toString() + Math.random().toString(),
            authorId: currentUser.id,
            content: replyText,
            timestamp: new Date().toLocaleTimeString(),
            replies: []
        };
        replyToArticleComment(articleId, comment.id, newReply);
        setIsReplying(false);
        setReplyText('');
    };

    // Cap visual indentation
    const indentClass = depth > 0 && depth < 4 ? 'ml-8 md:ml-12 border-l-2 border-white/10 pl-4' : 'mt-3 border-t border-white/5 pt-3';

    return (
        <div className={`flex gap-3 mb-4 ${indentClass}`}>
             <div className="shrink-0">
                 <img src={author.avatar} className="w-8 h-8 rounded-full object-cover" alt="User" />
             </div>
             <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2 mb-1">
                     <span className="font-bold text-wom-text text-sm">{author.username}</span>
                     <span className="text-xs text-gray-500">{comment.timestamp}</span>
                 </div>
                 <p className="text-gray-300 text-sm leading-relaxed mb-2">{comment.content}</p>
                 
                 <button 
                     onClick={() => setIsReplying(!isReplying)}
                     className="text-xs font-bold text-gray-500 hover:text-wom-primary flex items-center gap-1 transition-colors"
                 >
                     Reply
                 </button>

                 {isReplying && (
                     <div className="mt-2 animate-fade-in">
                        <textarea 
                           className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm text-white focus:border-wom-primary outline-none resize-none"
                           rows={2}
                           autoFocus
                           placeholder={`Reply to ${author.username}...`}
                           value={replyText}
                           onChange={e => setReplyText(e.target.value)}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                           <button onClick={() => setIsReplying(false)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                           <button onClick={handleReply} className="px-3 py-1 bg-wom-primary text-white text-xs font-bold rounded hover:bg-wom-accent">Post Reply</button>
                        </div>
                     </div>
                 )}

                 {/* Recursive Replies */}
                 {comment.replies && comment.replies.length > 0 && (
                     <div className="mt-4">
                         {comment.replies.map(reply => (
                             <SingleComment key={reply.id} comment={reply} articleId={articleId} depth={depth + 1} />
                         ))}
                     </div>
                 )}
             </div>
        </div>
    );
};

const CommentSection: React.FC<{ articleId: string, comments: Comment[] }> = ({ articleId, comments }) => {
   const { addArticleComment, currentUser } = useData();
   const [text, setText] = useState('');

   const handleSubmit = () => {
      if(!text.trim()) return;
      const newComment: Comment = {
         id: Date.now().toString(),
         authorId: currentUser.id,
         content: text,
         timestamp: new Date().toLocaleTimeString(),
         replies: []
      };
      addArticleComment(articleId, newComment);
      setText('');
   };

   return (
      <div className="mt-12 pt-8 border-t border-white/10">
         <h3 className="text-2xl font-bold text-white mb-6">Comments ({comments.length})</h3>
         
         <div className="bg-wom-panel border border-white/10 rounded-xl p-4 mb-8">
            <div className="flex gap-3">
               <img src={currentUser.avatar} className="w-8 h-8 rounded-full object-cover" alt="Me" />
               <div className="flex-1">
                    <textarea 
                    className="w-full bg-black/30 border border-white/10 rounded p-3 text-white focus:border-wom-primary outline-none resize-none"
                    rows={3}
                    placeholder="Add a comment to this article..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    />
                    <div className="flex justify-end mt-2">
                    <button onClick={handleSubmit} className="px-4 py-2 bg-wom-primary text-white font-bold rounded hover:bg-wom-accent transition-colors">Post Comment</button>
                    </div>
               </div>
            </div>
         </div>

         <div className="space-y-2">
            {comments.map(c => (
               <SingleComment key={c.id} comment={c} articleId={articleId} />
            ))}
            {comments.length === 0 && <p className="text-gray-500 italic">No comments yet. Be the first to discuss!</p>}
         </div>
      </div>
   )
}

const ArticleView: React.FC<{ slug: string }> = ({ slug }) => {
  const { articles, mediaFiles } = useData();
  const article = articles.find(a => a.slug === slug);

  if (!article) return <div className="text-center py-20 text-gray-500">Article not found. <Link to="/editor" className="text-wom-accent underline">Create it?</Link></div>;

  const infoboxData = parseInfobox(article.content, mediaFiles);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Title Bar */}
      <div className="border-b border-wom-primary/30 pb-4 mb-6 flex justify-between items-end">
         <div>
            <h1 className="text-4xl font-display font-bold text-white tracking-wide">{article.title}</h1>
            <div className="flex gap-2 mt-2">
               <span className="px-2 py-0.5 bg-wom-primary/20 border border-wom-primary/30 text-wom-primary text-xs rounded uppercase tracking-wider">{article.category}</span>
               {article.tags.map(t => <span key={t} className="px-2 py-0.5 bg-white/5 text-gray-400 text-xs rounded">#{t}</span>)}
            </div>
         </div>
         <div className="flex gap-2">
             <Link to={`/editor/${article.slug}`} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded flex items-center gap-2 transition-colors text-sm font-bold">
                <PenTool size={16} /> Edit
             </Link>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Main Content with Wikitext Renderer */}
        <div className="flex-1 min-w-0">
           <WikitextRenderer content={article.content} mediaFiles={mediaFiles} />
           <CommentSection articleId={article.id} comments={article.comments} />
        </div>

        {/* Infobox Sidebar */}
        {infoboxData && (
           <div className="w-full lg:w-80 shrink-0">
              <div className="bg-[#1a1a1a] border border-[#a855f7] rounded-sm overflow-hidden sticky top-24">
                 <div className="bg-[#a855f7] p-2 text-center">
                    <h3 className="font-bold text-white text-lg font-display uppercase">{infoboxData.name || article.title}</h3>
                 </div>
                 {infoboxData.image && (
                    <div className="p-1 bg-[#1a1a1a]">
                       <img src={infoboxData.image} alt={infoboxData.name} className="w-full object-cover border border-white/10" />
                    </div>
                 )}
                 <div className="divide-y divide-white/10">
                    {Object.entries(infoboxData).map(([key, value]) => {
                       if (key === 'name' || key === 'image') return null;
                       return (
                          <div key={key} className="flex text-sm">
                             <div className="w-1/3 bg-[#2a2a2a] p-2 font-bold text-gray-300 capitalize flex items-center">{key}</div>
                             <div className="w-2/3 bg-[#1a1a1a] p-2 text-white break-words">{value}</div>
                          </div>
                       );
                    })}
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

const WikiList: React.FC = () => {
  const { articles, mediaFiles } = useData();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'size' | 'comments'>('date');
  
  const categories = ['All', ...Object.values(ArticleCategory).filter(c => c !== ArticleCategory.TEMPLATE)];

  // Filtering and Sorting Logic
  const sortedArticles = [...articles]
    .filter(a => activeCategory === 'All' || a.category === activeCategory)
    .sort((a, b) => {
       if (sortBy === 'date') return new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime();
       if (sortBy === 'size') return b.content.length - a.content.length;
       if (sortBy === 'comments') return b.comments.length - a.comments.length;
       return 0;
    });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-white">Wiki Database</h2>
          <p className="text-gray-400">Recent entries from the multiverse.</p>
        </div>
        <Link to="/editor" className="px-6 py-2 bg-wom-primary hover:bg-wom-glow text-white font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)]">
          Create New Article
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-wom-panel p-4 rounded-xl border border-white/5">
         {/* Category Filters */}
         <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {categories.map(cat => (
               <button
               key={cat}
               onClick={() => setActiveCategory(cat)}
               className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat 
                     ? 'bg-wom-primary text-white' 
                     : 'bg-white/5 text-gray-400 hover:text-white'
               }`}
               >
               {cat}
               </button>
            ))}
         </div>

         {/* Sort Controls */}
         <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1 uppercase font-bold tracking-wider text-xs"><Filter size={12}/> Sort By:</span>
            <button onClick={() => setSortBy('date')} className={`hover:text-white ${sortBy === 'date' ? 'text-wom-accent font-bold' : ''}`}>Newest</button>
            <button onClick={() => setSortBy('size')} className={`hover:text-white flex items-center gap-1 ${sortBy === 'size' ? 'text-wom-accent font-bold' : ''}`}><HardDrive size={12}/> Size</button>
            <button onClick={() => setSortBy('comments')} className={`hover:text-white flex items-center gap-1 ${sortBy === 'comments' ? 'text-wom-accent font-bold' : ''}`}><MessageCircle size={12}/> Comments</button>
         </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sortedArticles.map(article => {
           // Try to find an image in Infobox if main url is missing
           const infoboxData = parseInfobox(article.content, mediaFiles);
           const displayImg = article.imageUrl || infoboxData?.image || 'https://via.placeholder.com/400x400?text=No+Image';
           
           return (
            <Link key={article.id} to={`/wiki/${article.slug}`} className="group relative rounded-xl overflow-hidden glass-panel border border-white/5 hover:border-wom-accent/50 transition-all duration-300">
               <div className="h-48 overflow-hidden relative">
                  <img src={displayImg} alt={article.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                  <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
                     <span className="text-xs font-bold bg-wom-primary px-2 py-0.5 rounded text-white">{article.category}</span>
                     <span className="text-[10px] text-gray-300 bg-black/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <HardDrive size={8} /> {(article.content.length / 1024).toFixed(1)} KB
                     </span>
                  </div>
               </div>
               <div className="p-4">
                  <h3 className="font-bold text-lg text-white group-hover:text-wom-accent truncate">{article.title}</h3>
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                     <span>{new Date(article.lastEdited).toLocaleDateString()}</span>
                     <span className="flex items-center gap-1"><MessageCircle size={10} /> {article.comments.length}</span>
                  </div>
               </div>
            </Link>
           );
        })}
      </div>
    </div>
  );
};

export const Wiki: React.FC = () => {
  const { slug } = useParams();
  return slug ? <ArticleView slug={slug} /> : <WikiList />;
};
