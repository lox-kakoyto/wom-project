import { User, UserRole, Article, ArticleCategory, ChatMessage } from './types';

// Detect environment: 
const env = (import.meta as any)?.env;

// Force port 5000 in production to bypass Nginx blocking POST requests on static paths
const isProduction = (env?.PROD) || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

let apiUrl = 'http://localhost:5000';
if (isProduction && typeof window !== 'undefined') {
    // Construct the URL using the current IP/Domain but with port 5000
    // This connects directly to Node.js
    apiUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
}

export const API_URL = apiUrl;

export const DEFAULT_AVATAR = "https://i.ibb.co/hR5d56x/mystery-user.png"; 

export const CURRENT_USER: User = {
  id: 'u1',
  username: 'NeoGlitch',
  role: UserRole.ADMIN,
  avatar: 'https://picsum.photos/seed/neo/200/200',
  bio: 'Creator of WOM. Welcome to the madness.',
  joinDate: '2023-01-01'
};

export const MOCK_USERS: User[] = [
  CURRENT_USER,
  {
    id: 'u2',
    username: 'VoidWalker',
    role: UserRole.MODERATOR,
    avatar: 'https://picsum.photos/seed/void/200/200',
    joinDate: '2023-02-15'
  },
  {
    id: 'u3',
    username: 'AnimeFan99',
    role: UserRole.USER,
    avatar: 'https://picsum.photos/seed/anime/200/200',
    joinDate: '2023-05-20'
  }
];

export const MOCK_ARTICLES: Article[] = [
  {
    id: 'a1',
    slug: 'cosmic-garou',
    title: 'Cosmic Fear Garou',
    category: ArticleCategory.CHARACTER,
    authorId: 'u1',
    lastEdited: '2023-10-25',
    imageUrl: 'https://picsum.photos/seed/garou/800/400',
    content: `
# Cosmic Fear Garou

**Garou** receives power from God, granting him knowledge of the flow of all energy in the universe.

## Abilities
- **Mode: Saitama**: Copies Saitama's strength perfectly.
- **Nuclear Fission**: Can unleash nuclear attacks.
- **Gamma Ray Burst**: His ultimate attack.

## Tier
**Low 2-C**: Universe level+.
    `,
    tags: ['OPM', 'Villain', 'God Level'],
    comments: []
  },
  {
    id: 'a2',
    slug: 'goku-mui',
    title: 'Son Goku (MUI)',
    category: ArticleCategory.CHARACTER,
    authorId: 'u2',
    lastEdited: '2023-10-20',
    imageUrl: 'https://picsum.photos/seed/goku/800/400',
    content: `
# Mastered Ultra Instinct Goku

Goku achieves the state of angels, allowing his body to react automatically to any threat.

## Techniques
- **Kamehameha**: Standard energy wave.
- **Silver Dragon Flash**: High speed assault.

## Tier
**Low 1-C**: Complex Multiverse level.
    `,
    tags: ['Dragon Ball', 'Saiyan', 'Angel'],
    comments: []
  },
  {
    id: 'a3',
    slug: 'infinity',
    title: 'Limitless (Infinity)',
    category: ArticleCategory.ABILITY,
    authorId: 'u1',
    lastEdited: '2023-09-10',
    imageUrl: 'https://picsum.photos/seed/gojo/800/400',
    content: `
# Limitless

The inherited technique of the Gojo clan. It brings the concept of "Infinity" into reality.

## Effects
Creates an infinite space between the user and the opponent.
    `,
    tags: ['Jujutsu Kaisen', 'Hax'],
    comments: []
  }
];

export const CHAT_ROOMS = [
  { id: 'general', name: 'General Chaos' },
  { id: 'debates', name: 'Power Debates' },
  { id: 'rp', name: 'Roleplay' }
];

export const MOCK_MESSAGES: ChatMessage[] = [
  { id: 'm1', senderId: 'u2', content: 'Has anyone seen the new tier list update?', timestamp: '10:30 AM', roomId: 'general', type: 'text' },
  { id: 'm2', senderId: 'u3', content: 'Yeah, Garou is ranked too high imo.', timestamp: '10:32 AM', roomId: 'general', type: 'text' },
];