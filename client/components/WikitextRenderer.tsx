
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, AlertTriangle, Play, HelpCircle, CheckCircle, XCircle, 
  Box, Shield, Zap, Skull, Crown, Info, ChevronUp, ChevronDown 
} from 'lucide-react';
import { MediaItem } from '../types';

/* ============================================================================
   HELPERS & PARSERS
   ============================================================================ */

export function findMediaUrl(filename: string, mediaFiles: MediaItem[]) {
    if (!filename) return '';
    if (filename.startsWith('http')) return filename; 
    const cleanName = filename.replace(/[[\]]/g, '').replace('File:', '').trim();
    const found = mediaFiles.find(m => m.filename === cleanName);
    return found ? found.url : 'https://via.placeholder.com/300?text=File+Not+Found';
}

export function parseArgs(inner: string) {
    const args: Record<string, string> = {};
    const parts = inner.split('|');
    parts.forEach((part, index) => {
        if (index === 0) return; 
        const eqIndex = part.indexOf('=');
        if (eqIndex > -1) {
            const key = part.substring(0, eqIndex).trim();
            const val = part.substring(eqIndex + 1).trim();
            args[key] = val;
            args[key.toLowerCase()] = val; 
        } else {
            args[index] = part.trim();
        }
    });
    return { parts, args };
}

export function parseInfobox(content: string, mediaFiles: MediaItem[]) {
  // Regex to find Infobox. Uses [\s\S]*? to match across newlines non-greedily.
  // We try to match {{Infobox ... }}
  const match = content.match(/{{Infobox\s*\|?([\s\S]*?)}}/i);
  
  if (!match) return null;
  
  const rawData = match[1];
  // Split by pipe | but be careful not to split pipes inside internal links [[|]]
  // Simple approach: split by newline, then look for | char at start or after trim
  const lines = rawData.split('\n');
  const data: Record<string, string> = {};
  
  lines.forEach(line => {
    let cleanLine = line.trim();
    if (cleanLine.startsWith('|')) cleanLine = cleanLine.substring(1).trim();
    
    const eqIndex = cleanLine.indexOf('=');
    if (eqIndex > -1) {
        const key = cleanLine.substring(0, eqIndex).trim();
        let val = cleanLine.substring(eqIndex + 1).trim();
        
        if (key && val) {
            if (key.toLowerCase() === 'image' && val.includes('File:')) {
                // Strip [[ ]] if present
                val = val.replace(/[[\]]/g, '');
                val = findMediaUrl(val, mediaFiles);
            }
            data[key] = val;
        }
    }
  });
  
  if (Object.keys(data).length === 0) return null;
  return data;
}

/* ============================================================================
   SUB-COMPONENTS
   ============================================================================ */

function MarkdownBlock({ text }: { text: string }) {
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

function TabberComponent({ tabs, mediaFiles }: { tabs: {title: string, content: string}[], mediaFiles: MediaItem[] }) {
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
                {/* Recursion works fine with function declarations */}
                <WikitextRenderer content={tabs[activeTab].content} mediaFiles={mediaFiles} />
            </div>
        </div>
    );
}

function NavboxComponent({ title, content }: { title: string, content: string }) {
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
   MAIN RENDERER
   ============================================================================ */

export function WikitextRenderer({ content, mediaFiles }: { content: string, mediaFiles: MediaItem[] }) {
  
  // 1. Remove Top-Level Infobox for main render (it's handled by sidebar usually)
  // Be robust: replace only the first occurrence if it starts near the top
  let cleanContent = content;
  const infoboxMatch = content.match(/{{Infobox[\s\S]*?}}/i);
  if (infoboxMatch && infoboxMatch.index !== undefined && infoboxMatch.index < 50) {
      // Only remove if it's at the start of the article
      cleanContent = content.replace(infoboxMatch[0], '').trim();
  }

  // 2. Advanced Splitter
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
          i++; 
      } else if (char === '}' && nextChar === '}') {
          currentStr += '}}';
          depth--;
          i++; 
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
           const inner = part.slice(2, -2);
           const templateName = inner.split('|')[0].trim();
           const { args, parts: splitParts } = parseArgs(inner);
           
           if (['IMG2', 'SIDE1', 'SIDE2', 'GIF1', 'GIF2'].includes(templateName)) {
               const filename = splitParts[1]?.trim();
               let align = 'right';
               let width = '300px';

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

           if (templateName === 'Spoiler') {
               const title = splitParts[1] || 'Spoiler Warning';
               const spoilerContent = splitParts.slice(2).join('|'); 
               return (
                   <details key={index} className="my-4 bg-wom-panel border border-wom-primary/30 rounded-lg overflow-hidden group">
                       <summary className="p-3 bg-white/5 cursor-pointer font-bold text-gray-200 select-none flex items-center gap-2 transition-colors hover:bg-white/10">
                           <AlertTriangle size={16} className="text-wom-accent" /> {title} <span className="text-xs font-normal opacity-50 ml-auto">(Click to reveal)</span>
                       </summary>
                       <div className="p-4 bg-black/20 text-gray-300">
                           <WikitextRenderer content={spoilerContent} mediaFiles={mediaFiles} />
                       </div>
                   </details>
               );
           }
           
           if (templateName === 'SpoilerList') {
                const title = args['title'] || splitParts[1] || 'Expand List';
                const content = args['content'] || splitParts.slice(2).join('|');
                return (
                    <details key={index} className="my-2 border-l-2 border-wom-primary/50 pl-2">
                        <summary className="cursor-pointer text-sm font-bold text-wom-primary hover:text-white transition-colors select-none flex items-center gap-1">
                             <ChevronRight size={14} className="transition-transform group-open:rotate-90"/> {title}
                        </summary>
                        <div className="mt-2 text-sm pl-4 text-gray-400">
                             <WikitextRenderer content={content} mediaFiles={mediaFiles} />
                        </div>
                    </details>
                );
           }

           if (templateName === 'SpoilerText') {
               const text = splitParts[1];
               return <span key={index} className="bg-black text-black hover:bg-transparent hover:text-white transition-colors cursor-help px-1 rounded select-none hover:select-text">{text}</span>;
           }

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
               return <TabberComponent key={index} tabs={tabs} mediaFiles={mediaFiles} />;
           }

           if (templateName === 'Quote') {
              return (
                 <div key={index} className="my-6 relative p-6 bg-white/5 border-l-4 border-wom-primary rounded-r-lg">
                    <p className="text-xl italic text-white font-display mb-2">"{splitParts[1]}"</p>
                    <p className="text-sm text-gray-400 text-right">— <span className="font-bold text-wom-accent">{splitParts[2]}</span> {splitParts[3] && `, ${splitParts[3]}`}</p>
                 </div>
              );
           }

           if (templateName === 'Furigana') {
              return (
                 <span key={index} className="inline-flex flex-col items-center leading-none mx-1 align-middle group cursor-help">
                    <span className="text-[9px] text-wom-accent opacity-70 group-hover:opacity-100 transition-opacity">{splitParts[2]}</span>
                    <span className="text-base text-white">{splitParts[1]}</span>
                 </span>
              );
           }
           
           if (templateName === 'Color') {
               return <span key={index} style={{ color: splitParts[1] }}>{splitParts[2]}</span>;
           }

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

           if (templateName === 'Frame') {
                const title = args['title'] || splitParts[1];
                const content = args['content'] || splitParts[2];
                const iconName = args['icon'] || 'box';
                const borderColor = args['border'] || '#a855f7'; 
                
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
                             <WikitextRenderer content={content} mediaFiles={mediaFiles} />
                        </div>
                    </div>
                );
           }

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
                           <div className="text-sm opacity-90"><WikitextRenderer content={text} mediaFiles={mediaFiles} /></div>
                       </div>
                   </div>
               );
           }

           if (templateName === 'Navbox') {
               const title = args['title'] || 'Navigation';
               const content = args['list'] || args['content'] || '';
               return <NavboxComponent key={index} title={title} content={content} />;
           }

           return <span key={index} className="text-xs text-red-400 border border-red-900 px-1 rounded bg-red-900/10" title={inner}>Missing Template: {templateName}</span>;
        } else {
           return <MarkdownBlock key={index} text={part} />;
        }
      })}
    </div>
  );
}