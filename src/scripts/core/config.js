/**
 * Configuration centralisée de l'application Bistrot Bastards
 * @module config
 */

// ========== ROUTES ==========

const resolvePath = (relativePath) => new URL(relativePath, import.meta.url).pathname;

/**
 * Chemins des pages de l'application
 * @constant {Object.<string, string>}
 */
export const ROUTES = {
  INDEX: resolvePath('../../../index.html'),
  LOGIN: resolvePath('../../pages/auth/login.html'),
  SIGNUP: resolvePath('../../pages/auth/signup.html'),
  WAITER_HOME: resolvePath('../../pages/waiter/home.html'),
  WAITER_PROFILE: resolvePath('../../pages/waiter/profile.html'),
  WAITER_REVIEWS: resolvePath('../../pages/waiter/reviews.html'),
  WAITER_CRYPTO_TIPS: resolvePath('../../pages/waiter/crypto-tips.html'),
  WAITER_LEADERBOARD: resolvePath('../../pages/waiter/classement.html'),
  WAITER_PERFORMANCES: resolvePath('../../pages/waiter/performances.html'),
  CHAT: resolvePath('../../pages/shared/chat.html'),
  ADMIN_PORTAL: resolvePath('../../pages/admin/portal.html'),
  ADMIN_DASHBOARD: resolvePath('../../pages/admin/dashboard.html')
};

// ========== NAVIGATION ==========

/**
 * Items de navigation principale
 * @constant {Array<Object>}
 */
export const NAV_ITEMS = [
  { key: 'home', label: 'Home', href: ROUTES.WAITER_HOME, type: 'link' },
  { key: 'profile', label: 'Profil', href: ROUTES.WAITER_PROFILE, type: 'link' },
  { key: 'leaderboard', label: 'Classement', href: ROUTES.WAITER_LEADERBOARD, type: 'link' },
  { key: 'chat', label: 'Chat', href: ROUTES.CHAT, type: 'link' },
  { key: 'logout', label: 'Out', href: '#', type: 'action' }
];

// ========== CHAT CONFIGURATION ==========

/**
 * Configuration du système de chat
 * @constant {Object}
 */
export const CHAT_CONFIG = {
  /** Délai minimum entre deux messages (ms) */
  MESSAGE_COOLDOWN: 2000,
  /** Longueur maximale d'un message */
  MAX_MESSAGE_LENGTH: 400,
  /** Seuil de scroll pour considérer qu'on est "en bas" (px) */
  SCROLL_THRESHOLD: 100,
  /** Nombre de messages à charger par batch */
  LOAD_MORE_LIMIT: 20,
  /** Nombre de messages initiaux à afficher */
  INITIAL_MESSAGES_LIMIT: 50
};

// ========== ADMIN CONFIGURATION ==========

/**
 * Configuration du panneau admin
 * @constant {Object}
 */
export const ADMIN_CONFIG = {
  /** Note client maximale */
  MAX_NOTE_CLIENTS: 10,
  /** Intervalle de refresh auto (ms) */
  REFRESH_INTERVAL: 30000
};

// ========== AUTH CONFIGURATION ==========

/**
 * Configuration de l'authentification
 * @constant {Object}
 */
export const AUTH_CONFIG = {
  /** Longueur minimale du mot de passe */
  MIN_PASSWORD_LENGTH: 6,
  /** Domaine pour les pseudo-emails Firebase */
  PSEUDO_EMAIL_DOMAIN: '@bistrotbastards.local'
};

// ========== ADMIN CONFIGURATION (MVP) ==========

/**
 * UID de l'administrateur (sécurité basée sur UID pour MVP)
 * @constant {string}
 */
export const ADMIN_UID = '6jKlMTSdskPFgJvdoUmcAe3igPH2';

/**
 * Email/identifiant de l'administrateur pour pré-remplissage
 * @constant {string}
 */
export const ADMIN_EMAIL = 'admin@bistrotbastards.local';

// ========== FIREBASE / DATABASE ==========

/**
 * Noms des collections Firestore et chemins RTDB
 * @constant {Object}
 */
export const DB_COLLECTIONS = {
  USERS: 'users',
  MESSAGES_ROOM: 'rooms',
  MESSAGES_GLOBAL: 'global',
  MESSAGES_PATH: 'messages',
  PRESENCE: 'presence'
};

/**
 * Chemin complet vers les messages globaux
 * @returns {string}
 */
export function getGlobalMessagesPath() {
  return `${DB_COLLECTIONS.MESSAGES_ROOM}/${DB_COLLECTIONS.MESSAGES_GLOBAL}/${DB_COLLECTIONS.MESSAGES_PATH}`;
}

// ========== LOCAL STORAGE KEYS ==========

/**
 * Clés utilisées dans localStorage
 * @constant {Object}
 */
export const STORAGE_KEYS = {
  USER: 'bb_user',
  ACTIVE_DAYS: 'bb_active_days',
  TIPS_WEEK: 'bb_tips_week',
  TIPS_HISTORY: 'bb_tips_history',
  RESTAURANT: 'restaurant',
  USERNAME: 'username'
};

// ========== WAITER PROFILE ==========

/**
 * Configuration du profil serveur
 * @constant {Object}
 */
export const WAITER_CONFIG = {
  /** Ordre des jours de la semaine */
  DAY_ORDER: {
    'Lundi': 1,
    'Mardi': 2,
    'Mercredi': 3,
    'Jeudi': 4,
    'Vendredi': 5,
    'Samedi': 6,
    'Dimanche': 7
  },
  /** Liste des jours */
  DAYS: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
};

// ========== COLORS ==========

/**
 * Couleurs pastel pour le chat (attribution par username)
 * @constant {Array<string>}
 */
export const CHAT_PASTEL_COLORS = [
  '#FFE5E5', '#FFE5F0', '#FFE5FA', '#F0E5FF', '#E5E5FF',
  '#E5F0FF', '#E5FAFF', '#E5FFFA', '#E5FFF0', '#E5FFE5',
  '#F0FFE5', '#FAFFE5', '#FFFFE5', '#FFF0E5', '#FFFAE5',
  '#FFD6E5', '#FFD6F5', '#F5D6FF', '#E5D6FF', '#D6E5FF',
  '#D6F5FF', '#D6FFFF', '#D6FFF5', '#D6FFE5', '#E5FFD6',
  '#F5FFD6', '#FFFFD6', '#FFF5D6', '#FFE5D6', '#FFDDE5'
];
