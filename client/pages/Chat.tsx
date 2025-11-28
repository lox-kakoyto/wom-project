
import React, { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, Smile, MoreVertical, Hash, User } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { ChatMessage } from '../types';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversationMessages]);

  const handleSend = () => {
    if (!inputValue.trim() || !activeConversationId) return;
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      roomId: activeConversationId,
      type: 'text'
    };
    sendMessage(newMessage);
    setInputValue('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file && activeConversationId) {
        const reader = new FileReader();
        reader.onload = (e) => {
           const result = e.target?.result as string;
           if (result) {
              const newMessage: ChatMessage = {
                 id: Date.now().toString(),
                 senderId: currentUser.id,
                 content: result, // Base64 string
                 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                 roomId: activeConversationId,
                 type: 'image'
              };
              sendMessage(newMessage);
           }
        };
        reader.readAsDataURL(file);
     }
     if (fileInputRef.current) fileInputRef.current.value = '';
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
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
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

                {/* Input */}
                <div className="p-4 bg-black/40 border-t border-white/5">
                <div className="flex items-center gap-2 bg-[#383a40] p-2 rounded-xl border border-transparent focus-within:border-wom-primary/50 transition-colors">
                    <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white transition-colors"><ImageIcon size={20} /></button>
                    <input 
                    type="text" 
                    className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none px-2 font-medium"
                    placeholder={`Message @${currentFriend?.friend.username || 'user'}...`}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button className="p-2 text-gray-400 hover:text-white transition-colors"><Smile size={20} /></button>
                    <button onClick={handleSend} className="p-2 bg-wom-primary text-white rounded-lg hover:bg-wom-accent transition-colors"><Send size={18} /></button>
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