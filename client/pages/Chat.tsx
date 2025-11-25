
import React, { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, Smile, MoreVertical } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { ChatMessage } from '../types';
import { CHAT_ROOMS } from '../constants';

export const Chat: React.FC = () => {
  const { chatMessages, sendMessage, currentUser, users } = useData();
  const [activeRoom, setActiveRoom] = useState(CHAT_ROOMS[0].id);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, activeRoom]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      roomId: activeRoom,
      type: 'text'
    };
    sendMessage(newMessage);
    setInputValue('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
           const result = e.target?.result as string;
           if (result) {
              const newMessage: ChatMessage = {
                 id: Date.now().toString(),
                 senderId: currentUser.id,
                 content: result, // Base64 string
                 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                 roomId: activeRoom,
                 type: 'image'
              };
              sendMessage(newMessage);
           }
        };
        reader.readAsDataURL(file);
     }
     // Reset input
     if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileUpload = () => {
     fileInputRef.current?.click();
  };

  const currentMessages = chatMessages.filter(m => m.roomId === activeRoom);

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-2xl overflow-hidden glass-panel border border-white/5 animate-fade-in">
      {/* Channels Sidebar */}
      <div className="w-64 bg-black/20 border-r border-white/5 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-bold text-white uppercase tracking-wider text-sm">Channels</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {CHAT_ROOMS.map(room => (
            <button
              key={room.id}
              onClick={() => setActiveRoom(room.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeRoom === room.id ? 'bg-wom-primary/20 text-white' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              # {room.name}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-white/5">
           <h3 className="text-xs font-bold text-gray-500 mb-2">ONLINE USERS</h3>
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-gray-300">1,337 active</span>
           </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-black/40">
        {/* Header */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/20">
          <span className="font-bold text-white text-lg flex items-center gap-2">
            <span className="text-wom-primary">#</span> 
            {CHAT_ROOMS.find(r => r.id === activeRoom)?.name}
          </span>
          <MoreVertical className="text-gray-400 cursor-pointer" size={20} />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentMessages.length === 0 && (
             <div className="text-center text-gray-600 mt-10">Start the conversation...</div>
          )}
          {currentMessages.map((msg) => {
             const sender = users.find(u => u.id === msg.senderId) || currentUser;
             const isMe = msg.senderId === currentUser.id;
             
             return (
               <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                 <img src={sender.avatar} className="w-10 h-10 rounded-full object-cover" alt="Avatar" />
                 <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="flex items-baseline gap-2 mb-1">
                       <span className="font-bold text-white text-sm">{sender.username}</span>
                       <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
                    </div>
                    {msg.type === 'image' ? (
                       <img src={msg.content} className="rounded-lg max-w-sm border border-white/10" alt="Posted" />
                    ) : (
                       <div className={`px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                         isMe 
                           ? 'bg-wom-primary text-white rounded-tr-none' 
                           : 'bg-white/10 text-gray-200 rounded-tl-none'
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
        <div className="p-4 bg-black/20 border-t border-white/5">
          <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10 focus-within:border-wom-primary/50 transition-colors">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            <button onClick={triggerFileUpload} className="p-2 text-gray-400 hover:text-white transition-colors"><ImageIcon size={20} /></button>
            <input 
              type="text" 
              className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none px-2"
              placeholder={`Message #${CHAT_ROOMS.find(r => r.id === activeRoom)?.name}...`}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button className="p-2 text-gray-400 hover:text-white transition-colors"><Smile size={20} /></button>
            <button onClick={handleSend} className="p-2 bg-wom-primary text-white rounded-lg hover:bg-wom-accent transition-colors"><Send size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};
