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
  WAITER_RULES: resolvePath('../../pages/waiter/regles.html'),
  WAITER_PERFORMANCES: resolvePath('../../pages/waiter/performances.html'),
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
  { key: 'logout', label: 'Out', href: '#', type: 'action' }
];

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
export const ADMIN_UID = 'ox7IA7SqTbh6BzDTjCI3PKlC1Kp1';

/**
 * Email/identifiant de l'administrateur pour pré-remplissage
 * @constant {string}
 */
export const ADMIN_EMAIL = 'team@thediningdispatch.com';

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
