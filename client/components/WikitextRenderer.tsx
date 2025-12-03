
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, AlertTriangle, Play, HelpCircle, CheckCircle, XCircle, 
  Box, Shield, Zap, Skull, Crown, Info, ChevronUp, ChevronDown, 
  Maximize, Minimize2, Image as ImageIcon, Music
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

/**
 * Robust Argument Parser that respects nested braces {{ }} and brackets [[ ]]
 */
export function parseArgs(inner: string) {
    const parts: string[] = [];
    let currentPart = '';
    let braceDepth = 0;
    let bracketDepth = 0;

    for (let i = 0; i < inner.length; i++) {
        const char = inner[i];
        
        if (char === '{' && inner[i+1] === '{') {
            braceDepth++;
            currentPart += '{';
        } else if (char === '}' && inner[i+1] === '}') {
            braceDepth--;
            currentPart += '}';
        } else if (char === '[' && inner[i+1] === '[') {
            bracketDepth++;
            currentPart += '[';
        } else if (char === ']' && inner[i+1] === ']') {
            bracketDepth--;
            currentPart += ']';
        } else if (char === '|' && braceDepth === 0 && bracketDepth === 0) {
            parts.push(currentPart.trim());
            currentPart = '';
            continue;
        }

        currentPart += char;
    }
    if (currentPart) parts.push(currentPart.trim());

    const args: Record<string, string> = {};
    parts.forEach((part, index) => {
        if (index === 0) return; // Template Name
        
        const eqIndex = part.indexOf('=');
        if (eqIndex > -1) {
            const key = part.substring(0, eqIndex).trim();
            const val = part.substring(eqIndex + 1).trim();
            args[key] = val;
            // Note: We removed auto-lowercasing to prevent duplicates in iteration
        } else {
            args[index] = part.trim();
        }
    });
    return { parts, args };
}

/**
 * Extracts a balanced template from a string start
 */
function extractBalancedTemplate(str: string, startIndex: number): string | null {
    let depth = 0;
    for (let i = startIndex; i < str.length; i++) {
        if (str[i] === '{' && str[i+1] === '{') {
            depth++;
            i++;
        } else if (str[i] === '}' && str[i+1] === '}') {
            depth--;
            i++;
            if (depth === 0) return str.substring(startIndex, i + 1);
        }
    }
    return null;
}

export function parseInfobox(content: string, mediaFiles: MediaItem[]) {
  const infoboxStart = content.indexOf('{{Infobox');
  if (infoboxStart === -1) return null;

  const fullTemplate = extractBalancedTemplate(content, infoboxStart);
  if (!fullTemplate) return null;

  const inner = fullTemplate.slice(9, -2); // Remove {{Infobox and }}
  const { args } = parseArgs(inner);
  
  // Clean up image url
  // Handle mixed case since we removed auto-lowercase in parseArgs
  const imgKey = Object.keys(args).find(k => k.toLowerCase() === 'image');
  if (imgKey) {
     let val = args[imgKey];
     val = val.replace(/[[\]]/g, '');
     args['image'] = findMediaUrl(val, mediaFiles);
  }

  return Object.keys(args).length > 0 ? args : null;
}

/* ============================================================================
   SUB-COMPONENTS
   ============================================================================ */

const MarkdownBlock: React.FC<{ text: string, mediaFiles: MediaItem[] }> = ({ text, mediaFiles }) => {
    // Check if text looks like a block (has newlines or headers)
    const hasBlockElements = text.includes('\n') || text.includes('==') || text.startsWith('* ');

    const processInline = (str: string) => {
        // Bold
        const boldParts = str.split("'''");
        return boldParts.map((part, idx) => {
             if (idx % 2 === 1) return <b key={`b-${idx}`} className="text-white font-bold">{part}</b>;
             // Italics
             const italicParts = part.split("''");
             return italicParts.map((ip, idx2) => {
                 if (idx2 % 2 === 1) return <i key={`i-${idx}-${idx2}`} className="text-gray-300 italic">{ip}</i>;
                 // Links [[Page]] or [[Page|Text]]
                 const linkParts = ip.split(/(\[\[.*?\]\])/g);
                 return linkParts.map((lp, idx3) => {
                     if (lp.startsWith('[[') && lp.endsWith(']]')) {
                         const content = lp.slice(2, -2);
                         const [target, label] = content.split('|');
                         if(target.startsWith('File:')) return null; // Skip raw images in text
                         return (
                             <Link key={idx3} to={`/wiki/${target.toLowerCase().replace(/ /g, '-')}`} className="text-wom-primary hover:text-white hover:underline transition-colors">
                                 {label || target}
                             </Link>
                         );
                     }
                     return lp;
                 });
             });
        });
    };

    if (!hasBlockElements) {
        return <span className="text-gray-300 leading-relaxed text-sm md:text-base">{processInline(text)}</span>;
    }

    const lines = text.split('\n');
    return (
        <>
            {lines.map((line, i) => {
                if (line.startsWith('== ') && line.endsWith(' ==')) return <h2 key={i} className="text-2xl font-bold text-white border-b-2 border-wom-primary/50 pb-1 mb-4 mt-8 uppercase tracking-wide clear-both">{line.replace(/==/g, '').trim()}</h2>;
                if (line.startsWith('=== ') && line.endsWith(' ===')) return <h3 key={i} className="text-xl font-bold text-wom-accent mb-2 mt-4 clear-both">{line.replace(/===/g, '').trim()}</h3>;
                if (line.startsWith('----')) return <hr key={i} className="border-t border-white/20 my-6 clear-both" />;

                if (line.trim() === '') return <br key={i}/>;

                if (line.startsWith('* ')) {
                    return <li key={i} className="ml-4 text-gray-300 list-disc marker:text-wom-primary mb-1">
                        {processInline(line.replace('* ', ''))}
                    </li>
                }

                return <p key={i} className="mb-2 text-gray-300 leading-relaxed text-sm md:text-base">
                    {processInline(line)}
                </p>;
            })}
        </>
    )
}

const TabberComponent: React.FC<{ tabs: {title: string, content: string}[], mediaFiles: MediaItem[], width?: string, height?: string }> = ({ tabs, mediaFiles, width, height }) => {
    const [activeTab, setActiveTab] = useState(0);
    if (tabs.length === 0) return null;

    return (
        // Changed overflow-hidden to flow-root to establish block formatting context for floats without clipping
        <div className="my-6 border border-white/10 rounded-xl bg-black/20 shadow-lg flow-root clear-both" style={{ width: width || '100%' }}>
            <div className="flex border-b border-white/10 overflow-x-auto bg-black/40 custom-scrollbar">
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
            <div className="p-4 bg-wom-panel/50 relative flow-root" style={{ minHeight: height || 'auto' }}>
                 {/* Re-render content when tab changes */}
                <WikitextRenderer content={tabs[activeTab].content} mediaFiles={mediaFiles} />
            </div>
        </div>
    );
}

/* ============================================================================
   MAIN RENDERER
   ============================================================================ */

export function WikitextRenderer({ content, mediaFiles }: { content: string, mediaFiles: MediaItem[] }) {
  
  let cleanContent = content;
  // Strip top-level infobox if detected
  const infoboxMatch = content.match(/{{Infobox[\s\S]*?}}/i);
  if (infoboxMatch && infoboxMatch.index !== undefined && infoboxMatch.index < 50) {
      cleanContent = content.replace(infoboxMatch[0], '').trim();
  }

  // Robust Splitter
  const parts: string[] = [];
  let currentStr = '';
  let braceDepth = 0;

  for (let i = 0; i < cleanContent.length; i++) {
      const char = cleanContent[i];
      const nextChar = cleanContent[i+1];

      if (char === '{' && nextChar === '{') {
          if (braceDepth === 0 && currentStr) {
              parts.push(currentStr);
              currentStr = '';
          }
          braceDepth++;
          currentStr += '{{';
          i++; 
      } else if (char === '}' && nextChar === '}') {
          currentStr += '}}';
          braceDepth--;
          i++; 
          if (braceDepth === 0) {
              parts.push(currentStr);
              currentStr = '';
          }
      } else {
          currentStr += char;
      }
  }
  if (currentStr) parts.push(currentStr);

  return (
    <div className="prose prose-invert prose-purple max-w-none text-gray-300">
      {parts.map((part, index) => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
           const inner = part.slice(2, -2);
           const { parts: splitParts, args } = parseArgs(inner);
           const templateName = splitParts[0].trim();
           
           /* --- MEDIA TEMPLATES --- */

           if (['IMG2', 'GIF', 'Video'].includes(templateName)) {
               const filename = splitParts[1]?.trim();
               const isVideo = templateName === 'Video';
               let align = 'right';
               let width = '300px';

               for (let i = 2; i < splitParts.length; i++) {
                   const arg = splitParts[i].trim().toLowerCase().replace(']]', ''); 
                   if (['left', 'right', 'center'].includes(arg)) {
                       align = arg;
                   } else if (arg.endsWith('px') || arg.endsWith('%')) {
                       width = splitParts[i].trim().replace(']]', '');
                   }
               }
               const url = findMediaUrl(filename, mediaFiles);
               
               let floatClass = 'float-right ml-6 mb-4';
               if (align === 'left') floatClass = 'float-left mr-6 mb-4';
               if (align === 'center') floatClass = 'float-none mx-auto block mb-6 clear-both';

               return (
                   <div key={index} className={`${floatClass} relative group z-10`} style={{ width: width, maxWidth: '100%' }}>
                       {/* REMOVED: purple border and padding wrapper */}
                       <div className="rounded overflow-hidden">
                           {isVideo ? (
                               <video src={url} controls className="w-full h-auto" />
                           ) : (
                               <img src={url} alt={filename} className="w-full h-auto object-contain max-h-[600px]" />
                           )}
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
                   <div key={index} className={`${floatClass} relative group overflow-hidden rounded bg-black z-10`} style={{ width: width, maxWidth: '100%' }}>
                       <img src={img1} className="w-full h-auto object-cover transition-opacity duration-300 group-hover:opacity-0" alt="Base" />
                       <img src={img2} className="w-full h-auto object-cover absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" alt="Hover" />
                   </div>
               );
           }

           /* --- TEXT & DECORATION --- */

           if (templateName === 'Gradient') {
                const text = args['1'] || splitParts[1] || 'Text';
                const from = args['2'] || splitParts[2] || '#a855f7';
                const to = args['3'] || splitParts[3] || '#d946ef';
                return (
                    <span key={index} 
                        style={{ 
                            background: `linear-gradient(to right, ${from}, ${to})`,
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            color: 'transparent',
                            fontWeight: 'bold',
                            display: 'inline'
                        }}
                    >
                        {text}
                    </span>
                );
           }

           if (templateName === 'Musikbox') {
               const title = args['title'] || 'Audio Track';
               const filename = splitParts[1]?.trim() || args['1'];
               const url = findMediaUrl(filename, mediaFiles);
               
               return (
                   <div key={index} className="my-4 bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-4 clear-both max-w-md">
                       <div className="w-10 h-10 bg-wom-primary/20 rounded-full flex items-center justify-center shrink-0">
                           <Music size={20} className="text-wom-primary ml-1" />
                       </div>
                       <div className="flex-1 min-w-0">
                           <div className="font-bold text-sm text-white truncate mb-1">{title}</div>
                           <audio controls src={url} className="w-full h-8" />
                       </div>
                   </div>
               );
           }

           /* --- ID TEMPLATES (V1, V2, V3) --- */

           // V1: Cyber/Tech
           if (templateName === 'IDV1') {
                const title = args['title'] || 'IDENTIFIER';
                const name = args['name'] || 'Unknown';
                const rank = args['rank'] || 'N/A';
                const image = findMediaUrl(args['image'], mediaFiles);
                const color = args['color'] || '#a855f7';
                
                return (
                    <div key={index} className="float-right ml-6 mb-4 w-72 bg-black border-2 relative overflow-hidden group shadow-lg z-10" style={{ borderColor: color }}>
                        {/* Scanline Effect */}
                        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20 z-20"></div>
                        
                        <div className="bg-white/5 p-2 border-b" style={{ borderColor: color }}>
                            <div className="text-xs font-mono uppercase tracking-[0.2em] text-right" style={{ color: color }}>// {title} //</div>
                        </div>
                        
                        <div className="relative h-64 overflow-hidden">
                            <img src={image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="ID" />
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                                <h3 className="text-2xl font-display font-bold text-white uppercase">{name}</h3>
                                <p className="text-sm font-mono" style={{ color: color }}>RANK: {rank}</p>
                            </div>
                        </div>
                    </div>
                );
           }

           // V2: Scroll/Mystic
           if (templateName === 'IDV2') {
               const name = args['name'] || 'Name';
               const title = args['title'] || 'Title';
               const image = findMediaUrl(args['image'], mediaFiles);
               const glow = args['color'] || '#ffd700';

               return (
                   <div key={index} className="float-right ml-6 mb-4 w-72 relative z-10 group text-center">
                       <div className="absolute inset-0 blur-xl opacity-30 rounded-full" style={{ backgroundColor: glow }}></div>
                       <div className="relative z-10 border-4 double p-1 rounded-t-full rounded-b-lg bg-[#0a0505]" style={{ borderColor: glow }}>
                            <div className="h-64 rounded-t-full rounded-b-sm overflow-hidden border border-white/10">
                                <img src={image} className="w-full h-full object-cover" alt="Portrait" />
                            </div>
                            <div className="p-4 border-t border-white/10 mt-1">
                                <h3 className="font-serif text-2xl text-white font-bold tracking-widest">{name}</h3>
                                <div className="h-px w-12 mx-auto my-2" style={{ backgroundColor: glow }}></div>
                                <p className="text-xs uppercase tracking-widest text-gray-400">{title}</p>
                            </div>
                       </div>
                   </div>
               );
           }

           // V3: Modern/Card
           if (templateName === 'IDV3') {
               const name = args['name'] || 'NAME';
               const stats = args['stats'] || '';
               const image = findMediaUrl(args['image'], mediaFiles);
               const bg = args['bg'] || '#222';

               return (
                   <div key={index} className="float-right ml-6 mb-4 w-80 rounded-2xl overflow-hidden shadow-2xl relative z-10 group" style={{ background: bg }}>
                        <div className="h-48 overflow-hidden relative">
                            <img src={image} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" alt="Header" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                            <div className="absolute bottom-4 left-4">
                                <h2 className="text-3xl font-black italic text-white tracking-tighter shadow-black drop-shadow-md">{name}</h2>
                            </div>
                        </div>
                        <div className="p-4 bg-white/5 backdrop-blur-sm">
                            <div className="text-sm text-gray-300 font-bold whitespace-pre-wrap">{stats}</div>
                        </div>
                   </div>
               );
           }

           /* --- LAYOUT & STRUCTURE --- */

           if (templateName === 'Gallery') {
               const title = args['title'] || splitParts[1] || 'Gallery';
               const content = args['content'] || splitParts.slice(2).join('\n');
               
               // Manually extract File: links from content args if provided as positional
               const images: string[] = [];
               if (!args['content']) {
                    splitParts.forEach((p, i) => {
                        if(i > 1 && p.includes('File:')) images.push(p.trim());
                    });
               } else {
                   // Try to regex parse if passed as content block
                   const matches = content.match(/File:[^|\n\]]+/g);
                   if (matches) matches.forEach(m => images.push(m));
               }

               return (
                   <details key={index} className="my-6 border border-white/10 rounded-xl overflow-hidden bg-black/20 group clear-both">
                       <summary className="p-4 bg-white/5 cursor-pointer font-bold text-lg flex items-center gap-2 hover:bg-white/10 transition-colors select-none">
                           <ImageIcon size={20} className="text-wom-primary" /> {title} <ChevronDown className="ml-auto transition-transform group-open:rotate-180" size={16} />
                       </summary>
                       <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                           {images.map((img, idx) => (
                               <div key={idx} className="bg-black border border-white/5 rounded-lg overflow-hidden p-1 hover:border-wom-primary transition-colors">
                                   <img 
                                        src={findMediaUrl(img, mediaFiles)} 
                                        className="w-full h-40 object-cover rounded hover:scale-105 transition-transform cursor-pointer" 
                                        alt="Gallery Item" 
                                        onClick={() => window.open(findMediaUrl(img, mediaFiles), '_blank')}
                                   />
                               </div>
                           ))}
                       </div>
                   </details>
               );
           }

           if (templateName === 'Tabber') {
               const tabs: {title: string, content: string}[] = [];
               const width = args['width'];
               const height = args['height'];

               // Fix duplication: Only use original keys since we disabled auto-lowercase in parseArgs
               Object.keys(args).forEach(key => {
                   if (key === 'width' || key === 'height') return;
                   // Filter out numeric keys generated by split if they duplicate named keys
                   if (isNaN(parseInt(key))) {
                       tabs.push({ title: key, content: args[key] });
                   }
               });
               
               return <TabberComponent key={index} tabs={tabs} mediaFiles={mediaFiles} width={width} height={height} />;
           }

           if (templateName === 'Spoiler' || templateName === 'SpoilerList') {
                const title = args['title'] || splitParts[1] || 'Spoiler';
                const content = args['content'] || splitParts.slice(2).join('|');
                return (
                    <details key={index} className="my-4 border-l-4 border-wom-primary bg-white/5 rounded-r-lg group clear-both">
                        <summary className="p-3 cursor-pointer font-bold flex items-center gap-2 text-wom-primary hover:text-white transition-colors">
                             <ChevronRight size={16} className="transition-transform group-open:rotate-90"/> {title}
                        </summary>
                        <div className="p-4 pt-0 text-sm text-gray-300">
                             <WikitextRenderer content={content} mediaFiles={mediaFiles} />
                        </div>
                    </details>
                );
           }

           if (templateName === 'Frame') {
                const title = args['title'] || splitParts[1];
                const content = args['content'] || splitParts[2];
                const iconName = args['icon'] || 'box';
                const borderColor = args['border'] || '#a855f7'; 
                const bg = args['bg'] || '#0f0a19';
                
                let IconComp = Box;
                if(iconName === 'shield') IconComp = Shield;
                if(iconName === 'zap') IconComp = Zap;
                if(iconName === 'skull') IconComp = Skull;
                if(iconName === 'crown') IconComp = Crown;

                return (
                    <div key={index} className="my-6 rounded-lg overflow-hidden border-2 shadow-lg clear-both" style={{ borderColor: borderColor, backgroundColor: bg }}>
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
                   <div key={index} className={`my-4 p-4 rounded-lg border flex gap-4 ${colors} clear-both`}>
                       <Icon className="shrink-0 mt-0.5" size={20} />
                       <div>
                           <div className="font-bold mb-1">{title}</div>
                           <div className="text-sm opacity-90"><WikitextRenderer content={text} mediaFiles={mediaFiles} /></div>
                       </div>
                   </div>
               );
           }

           return <span key={index} className="text-xs text-red-400 border border-red-900 px-1 rounded bg-red-900/10" title={inner}>Template Error: {templateName}</span>;
        } else {
           return <MarkdownBlock key={index} text={part} mediaFiles={mediaFiles} />;
        }
      })}
      
      {/* Clearfix to ensure floated images don't bleed into comments */}
      <div className="clear-both table"></div>
    </div>
  );
}