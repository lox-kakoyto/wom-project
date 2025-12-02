
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Send, Image as ImageIcon, Smile, MoreVertical, Hash, User, X } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { ChatMessage } from '../types';

const EMOJIS = ['😀', '😂', '🔥', '❤️', '👍', '👎', '🎉', '💀', '😭', '👀', '🚀', '💯', '🤔', '👋', '✨', '🤬', '🤡', '🤮', '🤝', '🙏'];

export const Chat: React.FC = () => {
  const { 
      currentUser, 
      friends, 
      activeConversationMessages, 
      sendMessage, 
      setActiveConversation, 
      activeConversationId 
  } = useData();

  const [inputValue, setInputValue] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File, preview: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Track if we should auto-scroll (e.g., user is at bottom or sent a message)
  const shouldScrollRef = useRef(true);

  // Check scroll position before updates
  const handleScroll = () => {
      if (messagesContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
          // If we are within 50px of the bottom, we should auto-scroll on new messages
          const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
          shouldScrollRef.current = isAtBottom;
      }
  };

  // Scroll effect
  useLayoutEffect(() => {
      // If it's the very first load of messages (or empty), scroll to bottom
      // OR if the user was already at the bottom
      // OR if the last message is mine
      const lastMessage = activeConversationMessages[activeConversationMessages.length - 1];
      const isMine = lastMessage?.senderId === currentUser.id;

      if (shouldScrollRef.current || isMine) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); 
          // 'auto' is better than smooth for instant snap on load to prevent weird visual scrolling
      }
  }, [activeConversationMessages, currentUser.id]);

  // When switching rooms, reset scroll to bottom
  useEffect(() => {
      shouldScrollRef.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      setInputValue('');
      setPendingFile(null);
      setShowEmoji(false);
  }, [activeConversationId]);

  const handleSend = async () => {
    if ((!inputValue.trim() && !pendingFile) || !activeConversationId) return;

    // 1. Send File if exists
    if (pendingFile) {
        const fileMsg: ChatMessage = {
            id: Date.now().toString(),
            senderId: currentUser.id,
            content: pendingFile.preview, // Base64
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            roomId: activeConversationId,
            type: 'image'
        };
        sendMessage(fileMsg);
        setPendingFile(null);
    }

    // 2. Send Text if exists (as caption or standalone)
    if (inputValue.trim()) {
        // Small delay to ensure order if sending both, though not strictly guaranteed without batch API
        if (pendingFile) await new Promise(r => setTimeout(r, 100)); 
        
        const textMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            senderId: currentUser.id,
            content: inputValue,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            roomId: activeConversationId,
            type: 'text'
        };
        sendMessage(textMsg);
    }

    setInputValue('');
    shouldScrollRef.current = true; // Force scroll to bottom after sending
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert("File too large (Max 5MB)");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
           const result = e.target?.result as string;
           if (result) {
               setPendingFile({ file, preview: result });
           }
        };
        reader.readAsDataURL(file);
     }
     // Reset input so same file can be selected again if cancelled
     if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addEmoji = (emoji: string) => {
      setInputValue(prev => prev + emoji);
      setShowEmoji(false);
  };

  const currentFriend = friends.find(f => f.roomId === activeConversationId);

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-2xl overflow-hidden glass-panel border border-white/5 animate-fade-in shadow-2xl">
      {/* DM List Sidebar */}
      <div className="w-72 bg-black/40 border-r border-white/5 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
              <User size={16} className="text-wom-primary" /> Direct Messages
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {friends.length === 0 && <div className="p-4 text-xs text-gray-500 text-center">No friends yet. Add some!</div>}
          
          {friends.map(friend => (
            <button
              key={friend.roomId}
              onClick={() => setActiveConversation(friend.roomId)}
              className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                activeConversationId === friend.roomId ? 'bg-wom-primary/20 border border-wom-primary/30' : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="relative">
                  <img src={friend.friend.avatar || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover" alt="User" />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black"></div>
              </div>
              <div className="overflow-hidden">
                  <div className={`text-sm font-bold truncate ${activeConversationId === friend.roomId ? 'text-white' : 'text-gray-300'}`}>{friend.friend.username}</div>
                  <div className="text-[10px] text-gray-500 truncate">Click to chat</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-black/60 relative">
        {activeConversationId ? (
            <>
                {/* Header */}
                <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <Hash className="text-gray-500" size={20} />
                    <span className="font-bold text-white text-lg">
                        {currentFriend?.friend.username || "Unknown User"}
                    </span>
                    {currentFriend && <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-gray-400">{currentFriend.friend.role}</span>}
                </div>
                <MoreVertical className="text-gray-400 cursor-pointer hover:text-white" size={20} />
                </div>

                {/* Messages */}
                <div 
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
                >
                {activeConversationMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                        <img src={currentFriend?.friend.avatar} className="w-20 h-20 rounded-full mb-4 grayscale opacity-50" />
                        <p>This is the start of your legendary conversation with {currentFriend?.friend.username}.</p>
                    </div>
                )}
                {activeConversationMessages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    const sender = isMe ? currentUser : (currentFriend?.friend || { username: 'Unknown', avatar: '' });
                    
                    return (
                    <div key={msg.id} className={`flex gap-4 group ${isMe ? 'flex-row-reverse' : ''}`}>
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-800">
                             <img src={sender.avatar || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" alt="Avatar" />
                        </div>
                        <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-bold text-white text-sm">{sender.username}</span>
                                <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
                            </div>
                            {msg.type === 'image' ? (
                                <img src={msg.content} className="rounded-lg max-w-sm border border-white/10" alt="Posted" />
                            ) : (
                                <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${
                                    isMe 
                                    ? 'bg-wom-primary text-white rounded-tr-none' 
                                    : 'bg-[#2b2d31] text-gray-200 rounded-tl-none'
                                }`}>
                                    {msg.content}
                                </div>
                            )}
                        </div>
                    </div>
                    );
                })}
                <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-black/40 border-t border-white/5 relative">
                    {/* Emoji Picker Popover */}
                    {showEmoji && (
                        <div className="absolute bottom-full mb-2 left-4 bg-wom-panel border border-white/10 rounded-xl p-3 shadow-xl grid grid-cols-5 gap-2 z-50">
                            {EMOJIS.map(e => (
                                <button key={e} onClick={() => addEmoji(e)} className="text-2xl hover:bg-white/10 rounded p-1 transition-colors">
                                    {e}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Staging Area (File Preview) */}
                    {pendingFile && (
                        <div className="absolute bottom-full mb-2 left-4 bg-[#2b2d31] border border-white/10 rounded-xl p-2 shadow-xl flex items-center gap-3 animate-fade-in z-40">
                            <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-white/10 bg-black">
                                <img src={pendingFile.preview} className="w-full h-full object-cover" alt="Preview" />
                            </div>
                            <div className="flex flex-col gap-1 mr-4">
                                <span className="text-xs text-white font-bold max-w-[150px] truncate">{pendingFile.file.name}</span>
                                <span className="text-[10px] text-gray-400">{(pendingFile.file.size / 1024).toFixed(1)} KB</span>
                            </div>
                            <button 
                                onClick={() => setPendingFile(null)}
                                className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 bg-[#383a40] p-2 rounded-xl border border-transparent focus-within:border-wom-primary/50 transition-colors">
                        <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                        />
                        <button onClick={() => fileInputRef.current?.click()} className={`p-2 transition-colors ${pendingFile ? 'text-wom-accent' : 'text-gray-400 hover:text-white'}`}>
                            <ImageIcon size={20} />
                        </button>
                        
                        <input 
                            type="text" 
                            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none px-2 font-medium"
                            placeholder={pendingFile ? "Add a caption..." : `Message @${currentFriend?.friend.username || 'user'}...`}
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                        />
                        
                        <button 
                            onClick={() => setShowEmoji(!showEmoji)} 
                            className={`p-2 transition-colors ${showEmoji ? 'text-wom-accent' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Smile size={20} />
                        </button>
                        
                        <button 
                            onClick={handleSend} 
                            disabled={!inputValue.trim() && !pendingFile}
                            className="p-2 bg-wom-primary text-white rounded-lg hover:bg-wom-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <User size={40} className="text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">No Chat Selected</h3>
                <p>Select a friend from the sidebar to start chatting.</p>
            </div>
        )}
      </div>
    </div>
  );
};