import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  Save, Layout, Type, Image as ImageIcon, Link as LinkIcon, 
  Quote, Bold, Italic, Check, Eye, X, Settings, 
  ChevronDown, ChevronUp, Upload, Plus, ExternalLink, Minus, Heading, EyeOff, Bell
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Article, ArticleCategory } from '../types';
import { WikitextRenderer } from '../components/WikitextRenderer';

export const Editor: React.FC = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { articles, addArticle, updateArticle, currentUser, templates, mediaFiles, toggleWatch } = useData();

  // Core State
  const [content, setContent] = useState('');
  
  // Metadata State
  const [title, setTitle] = useState('');
  const [urlSlug, setUrlSlug] = useState('');
  const [category, setCategory] = useState<ArticleCategory>(ArticleCategory.CHARACTER);
  const [tags, setTags] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // UI State
  const [summary, setSummary] = useState('');
  const [isMinorEdit, setIsMinorEdit] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSettings, setShowSettings] = useState(!slug); 
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'formatting' | 'inserts' | 'tools'>('formatting');
  const [notification, setNotification] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derived state
  const isWatching = (currentUser.watchlist || []).includes(slug || urlSlug);

  // Load existing data
  useEffect(() => {
    if (slug) {
      const existing = articles.find(a => a.slug === slug);
      if (existing) {
        setTitle(existing.title);
        setUrlSlug(existing.slug);
        setContent(existing.content);
        setCategory(existing.category);
        setTags(existing.tags.join(', '));
        setImageUrl(existing.imageUrl || '');
      }
    }
  }, [slug, articles]);

  // Auto-generate slug for new articles
  useEffect(() => {
    if (!slug) {
      setUrlSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  }, [title, slug]);

  const handleToggleWatch = () => {
    const targetSlug = slug || urlSlug;
    if (!targetSlug) return;
    
    toggleWatch(targetSlug);
    
    // Show notification based on new state (which is inverted from current)
    const willWatch = !isWatching;
    setNotification(willWatch ? "Added to your watchlist." : "Removed from your watchlist.");
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Text Insertion Helpers ---
  const insertAtCursor = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end) || defaultText;
    
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    setContent(newText);
    
    // Restore focus and cursor
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const handleSave = () => {
    if (!title || !urlSlug || !content) {
      alert("Title, Slug, and Content are required.");
      return;
    }

    const articleData: Article = {
      id: slug ? (articles.find(a => a.slug === slug)?.id || Date.now().toString()) : Date.now().toString(),
      slug: urlSlug,
      title,
      content,
      category,
      authorId: currentUser.id,
      lastEdited: new Date().toLocaleDateString(),
      imageUrl: imageUrl || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      comments: slug ? (articles.find(a => a.slug === slug)?.comments || []) : []
    };

    if (slug) {
      updateArticle(articleData);
    } else {
      addArticle(articleData);
    }
    navigate(`/wiki/${urlSlug}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in max-w-6xl mx-auto w-full relative">
       
       {/* Notification Toast */}
       {notification && (
           <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-4 z-50 px-6 py-3 bg-wom-primary text-white rounded-full shadow-lg font-bold text-sm animate-fade-in flex items-center gap-2">
               <Check size={16} /> {notification}
           </div>
       )}

       {/* 1. Top Header */}
       <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-wom-primary/30 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="text-xs font-bold text-wom-primary uppercase tracking-widest">
                  {slug ? 'Editing Article' : 'Creating New Article'}
               </span>
               <span className="h-px flex-1 bg-wom-primary/30 w-12"></span>
            </div>
            <h1 className="text-3xl font-display font-bold text-white tracking-wide">
               {title || 'Untitled Article'}
            </h1>
          </div>
          <button 
             onClick={() => setShowSettings(!showSettings)}
             className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-bold transition-colors ${showSettings ? 'bg-wom-primary text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
          >
             <Settings size={16} /> Page Properties {showSettings ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
       </div>

       {/* 2. Collapsible Settings Panel */}
       {showSettings && (
          <div className="bg-wom-panel border border-white/10 p-6 rounded-xl mb-6 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-wom-primary to-wom-accent"></div>
             
             <div className="space-y-4">
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Article Title</label>
                   <input 
                      type="text" 
                      className="w-full bg-black/40 border border-white/10 p-2.5 rounded text-white focus:border-wom-primary outline-none"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Cosmic Fear Garou"
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL Slug (Auto-generated)</label>
                   <input 
                      type="text" 
                      className="w-full bg-black/40 border border-white/10 p-2.5 rounded text-gray-400 font-mono text-sm"
                      value={urlSlug}
                      onChange={e => setUrlSlug(e.target.value)}
                   />
                </div>
             </div>

             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                      <select 
                         className="w-full bg-black/40 border border-white/10 p-2.5 rounded text-white focus:border-wom-primary outline-none"
                         value={category}
                         onChange={(e) => setCategory(e.target.value as ArticleCategory)}
                      >
                         {Object.values(ArticleCategory).filter(c => c !== ArticleCategory.TEMPLATE).map(c => (
                            <option key={c} value={c}>{c}</option>
                         ))}
                      </select>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cover Image</label>
                      <input 
                         type="text" 
                         className="w-full bg-black/40 border border-white/10 p-2.5 rounded text-white text-sm"
                         placeholder="File:Name.jpg"
                         value={imageUrl}
                         onChange={e => setImageUrl(e.target.value)}
                      />
                   </div>
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tags (Comma separated)</label>
                   <input 
                      type="text" 
                      className="w-full bg-black/40 border border-white/10 p-2.5 rounded text-white text-sm"
                      placeholder="Villain, Tier 0, Divine"
                      value={tags}
                      onChange={e => setTags(e.target.value)}
                   />
                </div>
             </div>
          </div>
       )}

       {/* 3. Editor Container (Toolbar + Textarea/Preview) */}
       <div className="flex-1 flex flex-col min-h-0 bg-black/20 border border-white/10 rounded-t-xl overflow-hidden shadow-2xl relative">
          
          {/* Toolbar Tabs - Hide in preview mode */}
          {!showPreview && (
          <div className="bg-[#1a1a1a] border-b border-white/10 select-none">
             {/* Tabs Header */}
             <div className="flex border-b border-white/5">
                <button 
                  onClick={() => setActiveTab('formatting')}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'formatting' ? 'bg-white/5 text-wom-primary border-b-2 border-wom-primary' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                >
                   <Type size={16} /> <span className="hidden sm:inline">Formatting</span>
                </button>
                <button 
                  onClick={() => setActiveTab('inserts')}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'inserts' ? 'bg-white/5 text-wom-primary border-b-2 border-wom-primary' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                >
                   <Plus size={16} /> <span className="hidden sm:inline">Inserts</span>
                </button>
                <button 
                  onClick={() => setActiveTab('tools')}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'tools' ? 'bg-white/5 text-wom-primary border-b-2 border-wom-primary' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                >
                   <Layout size={16} /> <span className="hidden sm:inline">Tools</span>
                </button>
             </div>

             {/* Tab Content */}
             <div className="p-3 bg-black/20 min-h-[56px] flex items-center gap-2 overflow-x-auto custom-scrollbar">
                {/* Formatting Tab */}
                {activeTab === 'formatting' && (
                   <>
                      <button onClick={() => insertAtCursor("'''", "'''", "Bold Text")} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors" title="Bold">
                         <Bold size={18} />
                      </button>
                      <button onClick={() => insertAtCursor("''", "''", "Italic Text")} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors" title="Italic">
                         <Italic size={18} />
                      </button>
                      <div className="w-px h-6 bg-white/10 mx-2"></div>
                      <button onClick={() => insertAtCursor("==", "==", "Heading 2")} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors font-serif font-bold flex items-center gap-1" title="Heading 2">
                         <Heading size={18} /> <span className="text-xs">H2</span>
                      </button>
                      <button onClick={() => insertAtCursor("===", "===", "Heading 3")} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors font-serif font-bold flex items-center gap-1" title="Heading 3">
                         <Heading size={16} /> <span className="text-xs">H3</span>
                      </button>
                      <div className="w-px h-6 bg-white/10 mx-2"></div>
                      <button onClick={() => insertAtCursor("----", "", "")} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors" title="Horizontal Rule">
                         <Minus size={18} />
                      </button>
                   </>
                )}

                {/* Inserts Tab */}
                {activeTab === 'inserts' && (
                   <>
                      <button onClick={() => insertAtCursor("[[", "]]", "Link Title")} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors" title="Internal Link">
                         <LinkIcon size={18} />
                      </button>
                      <button onClick={() => insertAtCursor("[", "]", "http://example.com Link Title")} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors" title="External Link">
                         <ExternalLink size={18} />
                      </button>
                      <div className="w-px h-6 bg-white/10 mx-2"></div>
                      <button onClick={() => insertAtCursor("[[File:", "]]", "Filename.jpg")} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors" title="Image / File">
                         <ImageIcon size={18} />
                      </button>
                      <button onClick={() => insertAtCursor("{{Quote|", "|Author|Source}}", "Text")} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors" title="Quote">
                         <Quote size={18} />
                      </button>
                   </>
                )}

                {/* Tools Tab */}
                {activeTab === 'tools' && (
                   <>
                      <Link to="/media" target="_blank" className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded flex items-center gap-2 text-xs font-bold transition-colors">
                         <Upload size={14} /> Media Bank
                      </Link>
                      <div className="w-px h-6 bg-white/10 mx-2"></div>
                      
                      <div className="relative">
                         <button 
                            onClick={() => setShowTemplates(!showTemplates)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors ${showTemplates ? 'bg-wom-primary text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'}`}
                         >
                            <Layout size={14} /> Insert Template <ChevronDown size={12} />
                         </button>
                         
                         {showTemplates && (
                            <div className="absolute left-0 top-full mt-2 w-72 bg-wom-panel border border-wom-primary/30 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                               <div className="sticky top-0 bg-wom-panel p-2 text-xs font-bold text-gray-500 uppercase border-b border-white/5">Available Templates</div>
                               {templates.map((t, i) => (
                                  <button 
                                     key={i}
                                     onClick={() => {
                                        insertAtCursor(t.content);
                                        setShowTemplates(false);
                                     }}
                                     className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-wom-primary/10 transition-colors group"
                                  >
                                     <div className="text-sm font-bold text-white group-hover:text-wom-accent">{t.name}</div>
                                     <div className="text-xs text-gray-500 truncate">{t.description}</div>
                                  </button>
                               ))}
                            </div>
                         )}
                      </div>
                   </>
                )}
             </div>
          </div>
          )}

          {/* Textarea or Preview */}
          {showPreview ? (
              <div className="flex-1 w-full bg-[#0a0a0a] p-8 overflow-y-auto custom-scrollbar">
                  <div className="max-w-4xl mx-auto">
                      <div className="flex justify-between items-center mb-6 border-b border-wom-primary/30 pb-4">
                        <h2 className="text-3xl font-display font-bold text-white">Preview Mode</h2>
                        <button onClick={() => setShowPreview(false)} className="px-4 py-1 bg-white/10 hover:bg-white/20 rounded text-sm font-bold text-white">Return to Editor</button>
                      </div>
                      <WikitextRenderer content={content} mediaFiles={mediaFiles} />
                  </div>
              </div>
          ) : (
              <textarea 
                 ref={textareaRef}
                 className="flex-1 w-full bg-[#0a0a0a] text-gray-200 font-mono text-sm leading-relaxed p-4 resize-none focus:outline-none focus:ring-0 custom-scrollbar"
                 placeholder="Start typing your wikicode here..."
                 value={content}
                 onChange={e => setContent(e.target.value)}
                 spellCheck={false}
              />
          )}
       </div>

       {/* 4. Bottom Actions Bar */}
       <div className="bg-wom-panel border-x border-b border-white/10 rounded-b-xl p-4 flex flex-col md:flex-row gap-4 items-center shadow-lg">
          <div className="flex-1 w-full">
             <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold uppercase">Summary</span>
                <input 
                   type="text" 
                   className="w-full bg-black/40 border border-white/10 rounded pl-24 pr-4 py-2 text-sm text-white focus:border-wom-primary outline-none focus:shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                   placeholder="Describe what you changed..."
                   value={summary}
                   onChange={e => setSummary(e.target.value)}
                />
             </div>
             <div className="flex items-center gap-6 mt-3 px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                   <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isMinorEdit ? 'bg-wom-primary border-wom-primary' : 'border-gray-500 group-hover:border-white'}`}>
                      {isMinorEdit && <Check size={12} className="text-white" />}
                   </div>
                   <input type="checkbox" className="hidden" checked={isMinorEdit} onChange={() => setIsMinorEdit(!isMinorEdit)} />
                   <span className="text-xs text-gray-400 group-hover:text-white select-none">Minor edit</span>
                </label>
                
                <button 
                    onClick={handleToggleWatch}
                    className="flex items-center gap-2 cursor-pointer group focus:outline-none"
                    disabled={currentUser.id === 'guest'}
                >
                   <div className={`w-4 h-4 flex items-center justify-center transition-colors ${isWatching ? 'text-wom-accent' : 'text-gray-500 group-hover:text-white'}`}>
                      <Bell size={16} fill={isWatching ? "currentColor" : "none"} />
                   </div>
                   <span className={`text-xs select-none ${isWatching ? 'text-wom-accent font-bold' : 'text-gray-400 group-hover:text-white'}`}>
                       {isWatching ? 'Watching' : 'Watch this page'}
                   </span>
                </button>
             </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
             <button 
                onClick={() => setShowPreview(!showPreview)}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg border font-bold transition-colors text-sm flex items-center gap-2 ${showPreview ? 'bg-wom-accent text-white border-wom-accent hover:bg-fuchsia-600' : 'border-white/10 text-gray-300 hover:bg-white/5 hover:text-white'}`}
             >
                {showPreview ? <><EyeOff size={16}/> Edit Mode</> : <><Eye size={16}/> Show Preview</>}
             </button>
             <button 
                onClick={handleSave}
                className="flex-1 md:flex-none px-8 py-2.5 bg-wom-primary hover:bg-wom-glow text-white font-bold rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all transform active:scale-95 flex items-center justify-center gap-2 text-sm"
             >
                <Save size={16} /> Save Page
             </button>
          </div>
       </div>

       {/* License Note */}
       <div className="mt-2 text-center text-[10px] text-gray-600">
          By saving changes, you agree to the Terms of Use and agree to release your contribution under the CC-BY-SA 3.0 License.
       </div>

    </div>
  );
};