export enum UserRole {
  USER = 'User',
  MODERATOR = 'Moderator',
  ADMIN = 'Admin'
}

export interface User {
  id: string;
  username: string;
  email?: string; // Optional for security on frontend
  role: UserRole;
  avatar: string;
  banner?: string; // New field
  bio?: string;
  joinDate: string;
  watchlist?: string[]; // Array of article IDs or slugs
}

export enum ArticleCategory {
  CHARACTER = 'Character',
  ABILITY = 'Ability',
  LOCATION = 'Location',
  ITEM = 'Item',
  TEMPLATE = 'Template'
}

export interface MediaItem {
  id: string;
  filename: string; 
  url: string; 
  uploaderId: string;
  timestamp: string;
  type: 'image' | 'video' | 'audio';
  size: number;
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  timestamp: string;
  parentId?: string | null; // For DB mapping
  replies: Comment[];
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  content: string; 
  category: ArticleCategory;
  authorId: string;
  lastEdited: string;
  imageUrl?: string;
  tags: string[];
  comments: Comment[];
}

export interface ColiseumThread {
  id: string;
  title: string;
  authorId: string;
  content: string; 
  timestamp: string;
  linkedArticleIds: string[]; 
  views: number;
  comments: Comment[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  roomId?: string; 
  recipientId?: string; 
  type: 'text' | 'image' | 'system';
}

export interface Notification {
  id: string;
  userId: string;
  type: 'reply' | 'message' | 'system';
  content: string;
  read: boolean;
  timestamp: string;
  link?: string;
}

export interface WallPost {
  id: string;
  authorId: string;
  targetUserId: string;
  content: string;
  timestamp: string;
  comments: Comment[]; // Added support for replies
}

export interface WikiTemplate {
  name: string;
  content: string; 
  description: string;
}