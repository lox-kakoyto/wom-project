
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, PenTool, MessageSquare, ChevronRight, User, Filter, ArrowDownWideNarrow, MessageCircle, HardDrive, Play, Pause, AlertTriangle, Info, CheckCircle, XCircle, HelpCircle, ChevronDown, ChevronUp, Reply, Box, Shield, Zap, Skull, Crown } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { ArticleCategory, Comment, MediaItem } from '../types';

/* ============================================================================
   WIKITEXT PARSER HELPERS
   ============================================================================ */

// Helper to find a media file by name in the Context
const findMediaUrl = (filename: string, mediaFiles: MediaItem[]) => {
    if (!filename) return '';
    if (filename.startsWith('http')) return filename; // It's already a link
    // Remove "File:" prefix and potential brackets [[ ]] if present
    const cleanName = filename.replace(/[[\]]/g, '').replace('File:', '').trim();
    const found = mediaFiles.find(m => m.filename === cleanName);
    return found ? found.url : 'https://via.placeholder.com/300?text=File+Not+Found';
};

const parseArgs = (inner: string) => {
    // Basic parser for named args: |key=value
    // And positional args: |value
    const args: Record<string, string> = {};
    const parts = inner.split('|');
    parts.forEach((part, index) => {
        if (index === 0) return; // Template name
        const eqIndex = part.indexOf('=');
        if (eqIndex > -1) {
            const key = part.substring(0, eqIndex).trim();
            const val = part.substring(eqIndex + 1).trim();
            args[key] = val;
            args[key.toLowerCase()] = val; // Case insensitive fallback
        } else {
            args[index] = part.trim();
        }
    });
    return { parts, args };
};

const parseInfobox = (content: string, mediaFiles: MediaItem[]) => {
  const match = content.match(/{{Infobox([\s\S]*?)}}/);
  if (!match) return null;
  
  const rawData = match[1];
  const lines = rawData.split('\n').filter(l => l.includes('='));
  const data: Record<string, string> = {};
  
  lines.forEach(line => {
    const [key, ...valParts] = line.split('=');
    const val = valParts.join('='); // Rejoin if value contained =
    if (key && val) {
      let finalVal = val.trim();
      // Handle Image in Infobox
      if (key.trim() === 'image' && finalVal.startsWith('File:')) {
          finalVal = findMediaUrl(finalVal, mediaFiles);
      }
      data[key.replace('|', '').trim()] = finalVal;
    }
  });
  return data;
};

/* ============================================================================
   WIKITEXT RENDERER (Engine)
   ============================================================================ */

const WikitextRenderer: React.FC<{ content: string }> = ({ content }) => {
  const { mediaFiles } = useData();

  // 1. Remove Top-Level Infobox (rendered separately)
  let cleanContent = content.replace(/{{Infobox[\s\S]*?}}/, '').trim();

  // 2. Advanced Splitter: We need to respect nested brackets.
  const parts: string[] = [];
  let currentStr = '';
  let depth = 0;

  for (let i = 0; i < cleanContent.length; i++) {
      const char = cleanContent[i];
      const nextChar = cleanContent[i+1];

      if (char === '{' && nextChar === '{') {
          if (depth === 0 && currentStr) {
              parts.push(currentStr);
              currentStr = '';
          }
          depth++;
          currentStr += '{{';
          i++; // skip next
      } else if (char === '}' && nextChar === '}') {
          currentStr += '}}';
          depth--;
          i++; // skip next
          if (depth === 0) {
              parts.push(currentStr);
              currentStr = '';
          }
      } else {
          currentStr += char;
      }
  }
  if (currentStr) parts.push(currentStr);

  return (
    <div className="prose prose-invert prose-purple max-w-none">
      {parts.map((part, index) => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
           // === TEMPLATE PARSER ===
           const inner = part.slice(2, -2);
           const templateName = inner.split('|')[0].trim();
           const { args, parts: splitParts } = parseArgs(inner);
           
           // --- IMG2 / SIDE1 / SIDE2 / GIF1 / GIF2 ---
           if (['IMG2', 'SIDE1', 'SIDE2', 'GIF1', 'GIF2'].includes(templateName)) {
               const filename = splitParts[1]?.trim();
               let align = 'right';
               let width = '300px';

               // Heuristic: iterate args to find align and width keywords
               for (let i = 2; i < splitParts.length; i++) {
                   const arg = splitParts[i].trim().toLowerCase().replace(']]', ''); 
                   if (['left', 'right', 'center'].includes(arg)) {
                       align = arg;
                   } else if (arg.endsWith('px')) {
                       width = splitParts[i].trim().replace(']]', '');
                   }
               }

               const url = findMediaUrl(filename, mediaFiles);
               
               let floatClass = 'float-right ml-6 mb-4';
               if (align === 'left') floatClass = 'float-left mr-6 mb-4';
               if (align === 'center') floatClass = 'float-none mx-auto block mb-6 clear-both';

               return (
                   <div key={index} className={`${floatClass} relative group`} style={{ width: width, maxWidth: '100%' }}>
                       <div className="bg-wom-panel border border-wom-primary/30 p-1 rounded shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                           <img src={url} alt={filename} className="w-full h-auto object-cover rounded" />
                       </div>
                   </div>
               );
           }

           // --- HOVER IMAGE (Switch on Hover) ---
           if (templateName === 'HoverImage') {
               const img1 = findMediaUrl(args['1'] || splitParts[1], mediaFiles);
               const img2 = findMediaUrl(args['2'] || splitParts[2], mediaFiles);
               const width = args['width'] || '300px';
               const align = args['align'] || 'right';

               let floatClass = 'float-right ml-6 mb-4';
               if (align === 'left') floatClass = 'float-left mr-6 mb-4';
               if (align === 'center') floatClass = 'float-none mx-auto block mb-6 clear-both';

               return (
                   <div key={index} className={`${floatClass} relative group overflow-hidden rounded bg-black`} style={{ width: width }}>
                       <img src={img1} className="w-full h-auto object-cover transition-opacity duration-300 group-hover:opacity-0" alt="Base" />
                       <img src={img2} className="w-full h-auto object-cover absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" alt="Hover" />
                   </div>
               );
           }

           // --- IMAGE TOOLTIP (Image Popup on Hover) ---
           if (templateName === 'ImageTooltip') {
               const text = args['text'] || splitParts[1];
               const imageFile = args['image'] || splitParts[2];
               const url = findMediaUrl(imageFile, mediaFiles);

               return (
                   <span key={index} className="relative group inline-block border-b-2 border-dotted border-wom-accent/50 cursor-help">
                       <span className="text-wom-accent font-medium">{text}</span>
                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black/90 p-1 rounded border border-wom-primary/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                           <img src={url} className="w-full rounded" alt="Tooltip" />
                       </div>
                   </span>
               );
           }

           // --- HOVER TEXT (Text swap) ---
           if (templateName === 'HoverText') {
               const text1 = args['1'] || splitParts[1];
               const text2 = args['2'] || splitParts[2];
               return (
                   <span key={index} className="group relative inline-block cursor-pointer">
                        <span className="group-hover:opacity-0 transition-opacity">{text1}</span>
                        <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity text-wom-accent font-bold">{text2}</span>
                   </span>
               );
           }

           // --- SPOILER (BLOCK) ---
           if (templateName === 'Spoiler') {
               const title = splitParts[1] || 'Spoiler Warning';
               const spoilerContent = splitParts.slice(2).join('|'); 
               return (
                   <details key={index} className="my-4 bg-wom-panel border border-wom-primary/30 rounded-lg overflow-hidden group">
                       <summary className="p-3 bg-white/5 cursor-pointer font-bold text-gray-200 select-none flex items-center gap-2 transition-colors hover:bg-white/10">
                           <AlertTriangle size={16} className="text-wom-accent" /> {title} <span className="text-xs font-normal opacity-50 ml-auto">(Click to reveal)</span>
                       </summary>
                       <div className="p-4 bg-black/20 text-gray-300">
                           <WikitextRenderer content={spoilerContent} />
                       </div>
                   </details>
               );
           }
           
           // --- SPOILER (LIST) ---
           if (templateName === 'SpoilerList') {
                const title = args['title'] || splitParts[1] || 'Expand List';
                const content = args['content'] || splitParts.slice(2).join('|');
                return (
                    <details key={index} className="my-2 border-l-2 border-wom-primary/50 pl-2">
                        <summary className="cursor-pointer text-sm font-bold text-wom-primary hover:text-white transition-colors select-none flex items-center gap-1">
                             <ChevronRight size={14} className="transition-transform group-open:rotate-90"/> {title}
                        </summary>
                        <div className="mt-2 text-sm pl-4 text-gray-400">
                             <WikitextRenderer content={content} />
                        </div>
                    </details>
                );
           }

           // --- SPOILER (INLINE TEXT) ---
           if (templateName === 'SpoilerText') {
               const text = splitParts[1];
               return <span key={index} className="bg-black text-black hover:bg-transparent hover:text-white transition-colors cursor-help px-1 rounded select-none hover:select-text">{text}</span>;
           }

           // --- MUSIC BOX ---
           if (templateName === 'MusicBox') {
               const title = splitParts[1];
               const filename = splitParts[2];
               const url = findMediaUrl(filename, mediaFiles);
               
               return (
                   <div key={index} className="my-4 p-3 bg-wom-panel border border-wom-accent/30 rounded-full flex items-center gap-4 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
                       <div className="w-10 h-10 rounded-full bg-wom-accent flex items-center justify-center text-white shrink-0 animate-pulse">
                           <Play size={20} fill="currentColor" />
                       </div>
                       <div className="flex-1 min-w-0">
                           <p className="text-xs text-wom-accent font-bold uppercase tracking-wider">Now Playing</p>
                           <p className="text-white font-bold truncate">{title}</p>
                       </div>
                       <audio controls src={url} className="h-8 w-32 md:w-48 opacity-50 hover:opacity-100 transition-opacity" />
                   </div>
               );
           }

           // --- GALLERY ---
           if (templateName === 'Gallery') {
               const rawLines = inner.replace('Gallery', '').trim().split('\n');
               const images = rawLines.map(line => line.replace('|', '').trim()).filter(l => l.startsWith('File:'));
               
               return (
                   <div key={index} className="grid grid-cols-2 md:grid-cols-3 gap-2 my-6">
                       {images.map((imgName, idx) => (
                           <div key={idx} className="bg-black/40 border border-white/10 rounded p-1 hover:border-wom-primary transition-colors group">
                               <div className="overflow-hidden rounded">
                                  <img src={findMediaUrl(imgName, mediaFiles)} className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                               </div>
                               <div className="text-[10px] text-center text-gray-500 mt-1 truncate">{imgName.replace('File:', '')}</div>
                           </div>
                       ))}
                   </div>
               );
           }

           // --- TABBER ---
           if (templateName === 'Tabber') {
               const tabArgs = inner.replace('Tabber\n', '').replace('Tabber', '').split('|');
               const tabs: {title: string, content: string}[] = [];
               tabArgs.forEach(arg => {
                   if (!arg.trim()) return;
                   const firstEq = arg.indexOf('=');
                   if (firstEq > -1) {
                       const tTitle = arg.substring(0, firstEq).trim();
                       const tContent = arg.substring(firstEq + 1).trim();
                       if(tTitle) tabs.push({ title: tTitle, content: tContent });
                   }
               });
               return <TabberComponent key={index} tabs={tabs} />;
           }

           // --- QUOTE ---
           if (templateName === 'Quote') {
              return (
                 <div key={index} className="my-6 relative p-6 bg-white/5 border-l-4 border-wom-primary rounded-r-lg">
                    <p className="text-xl italic text-white font-display mb-2">"{splitParts[1]}"</p>
                    <p className="text-sm text-gray-400 text-right">— <span className="font-bold text-wom-accent">{splitParts[2]}</span> {splitParts[3] && `, ${splitParts[3]}`}</p>
                 </div>
              );
           }

           // --- FURIGANA ---
           if (templateName === 'Furigana') {
              return (
                 <span key={index} className="inline-flex flex-col items-center leading-none mx-1 align-middle group cursor-help">
                    <span className="text-[9px] text-wom-accent opacity-70 group-hover:opacity-100 transition-opacity">{splitParts[2]}</span>
                    <span className="text-base text-white">{splitParts[1]}</span>
                 </span>
              );
           }
           
           // --- COLOR ---
           if (templateName === 'Color') {
               return <span key={index} style={{ color: splitParts[1] }}>{splitParts[2]}</span>;
           }

           // --- TOOLTIP (Standard) ---
           if (templateName === 'Tooltip') {
               const text = splitParts[1];
               const tip = splitParts[2];
               return (
                   <span key={index} className="group relative border-b border-dotted border-gray-500 cursor-help inline-block">
                       {text}
                       <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 border border-white/20 text-xs text-white rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                           {tip}
                           <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 border-r border-b border-white/20 transform rotate-45"></span>
                       </span>
                   </span>
               );
           }

           // --- BATTLE RESULT (Enhanced) ---
           if (templateName === 'BattleResult') {
               const result = (args['result'] || splitParts[1] || 'Draw').toLowerCase();
               const score = args['score'] || splitParts[2] || '';
               const bgImage = args['image'] ? findMediaUrl(args['image'], mediaFiles) : null;
               
               let bgClass = 'from-gray-800 to-gray-900 border-gray-600';
               let textClass = 'text-gray-200';
               let icon = <HelpCircle size={24} />;
               
               if (result.includes('win') || result.includes('victory')) {
                   bgClass = 'from-green-900/50 to-green-950/80 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]';
                   textClass = 'text-green-400';
                   icon = <CheckCircle size={24} />;
               } else if (result.includes('los') || result.includes('defeat')) {
                   bgClass = 'from-red-900/50 to-red-950/80 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]';
                   textClass = 'text-red-400';
                   icon = <XCircle size={24} />;
               }

               return (
                   <div key={index} className={`my-6 rounded-xl border relative overflow-hidden group ${bgClass}`}>
                       {bgImage && (
                           <div className="absolute inset-0 z-0">
                               <img src={bgImage} className="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity" alt="Battle BG"/>
                               <div className="absolute inset-0 bg-gradient-to-r from-black/90 to-transparent"></div>
                           </div>
                       )}
                       <div className="relative z-10 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`${textClass}`}>{icon}</div>
                                <div>
                                    <h4 className={`text-xl font-display font-bold uppercase tracking-wider ${textClass}`}>{result.toUpperCase()}</h4>
                                    {score && <p className="text-sm text-gray-300 font-bold">{score}</p>}
                                </div>
                            </div>
                            <div className="hidden md:block text-xs font-mono opacity-50 uppercase tracking-widest bg-black/50 px-2 py-1 rounded">Battle Record</div>
                       </div>
                   </div>
               );
           }

           // --- FRAME (Universal Frame) ---
           if (templateName === 'Frame') {
                const title = args['title'] || splitParts[1];
                const content = args['content'] || splitParts[2];
                const iconName = args['icon'] || 'box';
                const borderColor = args['border'] || '#a855f7'; // Default purple
                
                let IconComp = Box;
                if(iconName === 'shield') IconComp = Shield;
                if(iconName === 'zap') IconComp = Zap;
                if(iconName === 'skull') IconComp = Skull;
                if(iconName === 'crown') IconComp = Crown;

                return (
                    <div key={index} className="my-6 rounded-lg overflow-hidden bg-wom-panel border-2 shadow-lg" style={{ borderColor: borderColor }}>
                        {title && (
                            <div className="p-2 font-display font-bold text-white text-center uppercase tracking-widest flex items-center justify-center gap-2" style={{ backgroundColor: borderColor }}>
                                <IconComp size={18} /> {title}
                            </div>
                        )}
                        <div className="p-4 text-gray-300">
                             <WikitextRenderer content={content} />
                        </div>
                    </div>
                );
           }

           // --- MESSAGE BLOCK / UNIVERSAL FRAME (New) ---
           if (templateName === 'MessageBlock') {
               const type = (args['type'] || 'info').toLowerCase();
               const title = args['title'] || 'Notice';
               const text = args['text'] || splitParts[2] || '';
               
               let colors = 'bg-blue-900/20 border-blue-500/30 text-blue-200';
               let Icon = Info;
               
               if (type === 'warning') { colors = 'bg-orange-900/20 border-orange-500/30 text-orange-200'; Icon = AlertTriangle; }
               if (type === 'success') { colors = 'bg-green-900/20 border-green-500/30 text-green-200'; Icon = CheckCircle; }
               if (type === 'error') { colors = 'bg-red-900/20 border-red-500/30 text-red-200'; Icon = XCircle; }

               return (
                   <div key={index} className={`my-4 p-4 rounded-lg border flex gap-4 ${colors}`}>
                       <Icon className="shrink-0 mt-0.5" size={20} />
                       <div>
                           <div className="font-bold mb-1">{title}</div>
                           <div className="text-sm opacity-90"><WikitextRenderer content={text} /></div>
                       </div>
                   </div>
               );
           }

           // --- NAVBOX (New) ---
           if (templateName === 'Navbox') {
               const title = args['title'] || 'Navigation';
               const content = args['list'] || args['content'] || '';
               return <NavboxComponent key={index} title={title} content={content} />;
           }

           // Fallback for unknown templates
           return <span key={index} className="text-xs text-red-400 border border-red-900 px-1 rounded bg-red-900/10" title={inner}>Missing Template: {templateName}</span>;
        } else {
           // === MARKDOWN RENDERER ===
           return <MarkdownBlock key={index} text={part} />;
        }
      })}
    </div>
  );
};

// Simplified Markdown Block Renderer to avoid hydration issues with simple splitting
const MarkdownBlock: React.FC<{ text: string }> = ({ text }) => {
    // Handle File Links [[File:Name|...]]
    if (text.includes('[[File:')) {
        // Very basic replace for inline images if not in a template
        // Not implemented fully for safety, simplified text return
    }

    const lines = text.split('\n');
    return (
        <>
            {lines.map((line, i) => {
                if (line.startsWith('# ')) return <h2 key={i} className="text-2xl font-bold text-white border-b-2 border-wom-primary/50 pb-1 mb-4 mt-8 uppercase tracking-wide">{line.replace('# ', '')}</h2>;
                if (line.includes('**Tier:**')) {
                    return <div key={i} className="bg-wom-panel border-l-4 border-wom-accent p-2 my-2 text-white">
                        {line.split('**').map((part, idx) => idx % 2 === 1 ? <b key={idx} className="text-wom-accent">{part}</b> : part)}
                    </div>;
                }
                if (line.startsWith('* ')) {
                    return <li key={i} className="ml-4 text-gray-300 list-disc marker:text-wom-primary mb-1">
                        {line.replace('* ', '').split('**').map((part, idx) => idx % 2 === 1 ? <b key={idx} className="text-white">{part}</b> : part)}
                    </li>
                }
                if (line.trim() === '') return <br key={i}/>;
                
                return <p key={i} className="mb-2 text-gray-300 leading-relaxed text-sm md:text-base">
                    {line.split('**').map((part, idx) => idx % 2 === 1 ? <b key={idx} className="text-white">{part}</b> : part)}
                </p>;
            })}
        </>
    )
}

const TabberComponent: React.FC<{ tabs: {title: string, content: string}[] }> = ({ tabs }) => {
    const [activeTab, setActiveTab] = useState(0);
    if (tabs.length === 0) return null;

    return (
        <div className="my-6 border border-white/10 rounded-xl overflow-hidden bg-black/20 shadow-lg">
            <div className="flex border-b border-white/10 overflow-x-auto bg-black/40">
                {tabs.map((tab, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveTab(i)}
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                            activeTab === i 
                            ? 'bg-wom-primary text-white border-b-2 border-wom-accent' 
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        {tab.title}
                    </button>
                ))}
            </div>
            <div className="p-6 bg-wom-panel/50 min-h-[200px]">
                <WikitextRenderer content={tabs[activeTab].content} />
            </div>
        </div>
    );
}

const NavboxComponent: React.FC<{ title: string, content: string }> = ({ title, content }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="my-6 border border-wom-primary/30 rounded-lg overflow-hidden bg-wom-panel shadow-lg">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-gradient-to-r from-wom-primary/20 to-wom-accent/10 p-3 flex justify-between items-center hover:bg-white/5 transition-colors"
            >
                <span className="font-bold text-wom-accent uppercase tracking-wider text-sm">{title}</span>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isOpen && (
                <div className="p-4 bg-black/30 border-t border-white/5 text-sm text-gray-300">
                    <div className="flex flex-wrap gap-4 justify-center">
                        {content.split(',').map((item, i) => (
                            <Link key={i} to={`/wiki/${item.trim().toLowerCase().replace(/ /g, '-')}`} className="hover:text-wom-primary hover:underline transition-colors">
                                {item.trim()}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

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

    return (
        <div className={`flex gap-3 mb-4 ${depth > 0 ? 'ml-8 md:ml-12 border-l-2 border-white/10 pl-4' : ''}`}>
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
                     <Reply size={12}/> Reply
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
           <WikitextRenderer content={article.content} />
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
