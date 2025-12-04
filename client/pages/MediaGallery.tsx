
import React, { useRef, useState } from 'react';
import { Upload, FileImage, Film, Music, Copy, Check } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { MediaItem } from '../types';

export const MediaGallery: React.FC = () => {
  const { mediaFiles, uploadMedia, currentUser } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleFile = (file: File) => {
    // 1. Size Check
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > MAX_SIZE) { 
        alert("File too large. Max 10MB.");
        return;
    }

    // 2. Type Check (Strict)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/wav', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
        alert("Invalid file type. Only Images (JPG, PNG, GIF), Audio (MP3), and Video (MP4) are allowed.");
        return;
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

    // 3. Duplicate Name Check
    if (mediaFiles.some(m => m.filename === sanitizedName)) {
        alert("You cannot upload files with this name, it already exists. Please rename your file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
            let type: MediaItem['type'] = 'image';
            if (file.type.startsWith('video')) type = 'video';
            if (file.type.startsWith('audio')) type = 'audio';

            const newItem: MediaItem = {
                id: Date.now().toString(),
                filename: sanitizedName,
                url: result,
                uploaderId: currentUser.id,
                timestamp: new Date().toLocaleString(),
                type: type,
                size: file.size
            };
            uploadMedia(newItem);
        }
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="animate-fade-in space-y-8 max-w-full overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-6">
            <div>
                <h1 className="text-3xl font-display font-bold text-white mb-2">Media Bank</h1>
                <p className="text-gray-400">Upload images, gifs, and audio for use in articles.</p>
            </div>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-wom-primary hover:bg-wom-glow text-white font-bold rounded-lg flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all"
            >
                <Upload size={18} /> Upload File
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            />
        </div>

        {/* Drag Drop Area */}
        <div 
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors ${dragActive ? 'border-wom-accent bg-wom-accent/10' : 'border-white/10 bg-black/20'}`}
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
        >
            <FileImage size={48} className="text-gray-500 mb-4" />
            <p className="text-gray-300 font-bold">Drag and drop files here</p>
            <p className="text-xs text-gray-500 mt-2">Supports JPG, PNG, GIF, MP4, MP3 (Max 10MB)</p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mediaFiles.map(file => (
                <div key={file.id} className="glass-panel p-3 rounded-xl group relative overflow-hidden">
                    <div className="h-40 bg-black/50 rounded-lg overflow-hidden flex items-center justify-center mb-3 border border-white/5 relative">
                        {file.type === 'image' && <img src={file.url} className="w-full h-full object-cover" alt={file.filename} />}
                        {file.type === 'video' && (
                            <div className="w-full h-full flex items-center justify-center bg-black">
                                <video 
                                    src={file.url} 
                                    className="max-w-full max-h-full object-contain" 
                                    controls 
                                    preload="none" // IMPORTANT: Prevents browser from decoding all videos at once
                                    playsInline 
                                />
                                {/* Overlay icon only if not playing/interacted - simplified here */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                                     <Film size={32} className="text-wom-primary drop-shadow-lg" />
                                </div>
                            </div>
                        )}
                        {file.type === 'audio' && <Music size={32} className="text-wom-accent" />}
                    </div>
                    
                    <div className="flex justify-between items-start">
                        <div className="overflow-hidden w-full">
                            <p className="text-sm font-bold text-white truncate" title={file.filename}>{file.filename}</p>
                            <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB • {file.timestamp}</p>
                        </div>
                    </div>

                    {/* Copy Codes */}
                    <div className="mt-3 space-y-1">
                        <button 
                            onClick={() => copyToClipboard(`File:${file.filename}`, file.id + '1')}
                            className="w-full text-xs text-left px-2 py-1 bg-white/5 hover:bg-white/10 rounded flex justify-between items-center text-gray-400 font-mono"
                        >
                            <span className="truncate mr-2">File:{file.filename}</span>
                            {copiedId === file.id + '1' ? <Check size={12} className="text-green-400 shrink-0" /> : <Copy size={12} className="shrink-0" />}
                        </button>
                    </div>
                </div>
            ))}
            {mediaFiles.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-500">
                    No files uploaded yet. Be the first!
                </div>
            )}
        </div>
    </div>
  );
};