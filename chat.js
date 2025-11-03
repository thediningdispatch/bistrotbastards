import { db, auth, rtdb } from './firebase.js';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  startAfter,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  ref,
  set,
  update,
  onDisconnect,
  onValue
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { authReady } from './auth-guard.js';

// DOM Elements (initialized after DOM loads)
let chatForm;
let chatStream;
let chatMessage;
let sendBtn;
let typingIndicator;

// State
let lastVisible = null;
let typingTimeout = null;
let lastMessageTime = 0;
let presenceInitialized = false;
let presenceRefCache = null;
const MESSAGE_COOLDOWN = 2000; // 2 seconds

// Message collection reference
const messagesRef = collection(db, 'rooms', 'global', 'messages');

// Get current user info
function getCurrentUser() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;

  let storedUser = {};
  try {
    storedUser = JSON.parse(localStorage.getItem('bb_user') || '{}');
  } catch (error) {
    console.warn('[Chat] Stored user parse failed', error);
  }

  const fallbackName =
    storedUser.username ||
    firebaseUser.displayName ||
    (firebaseUser.email ? firebaseUser.email.split('@')[0] : null);

  return {
    uid: firebaseUser.uid,
    username: fallbackName || 'Anonymous'
  };
}

// 30 pastel colors for users
const PASTEL_COLORS = [
  '#FFE5E5', '#FFE5F0', '#FFE5FA', '#F0E5FF', '#E5E5FF',
  '#E5F0FF', '#E5FAFF', '#E5FFFA', '#E5FFF0', '#E5FFE5',
  '#F0FFE5', '#FAFFE5', '#FFFFE5', '#FFF0E5', '#FFFAE5',
  '#FFD6E5', '#FFD6F5', '#F5D6FF', '#E5D6FF', '#D6E5FF',
  '#D6F5FF', '#D6FFFF', '#D6FFF5', '#D6FFE5', '#E5FFD6',
  '#F5FFD6', '#FFFFD6', '#FFF5D6', '#FFE5D6', '#FFDDE5'
];

// Hash function to convert username to color index
function hashStringToColorIndex(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % PASTEL_COLORS.length;
}

// Get consistent color for a username
function getUserColor(username) {
  const index = hashStringToColorIndex(username);
  return PASTEL_COLORS[index];
}

// Format timestamp
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function getPresenceRef() {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  if (!presenceRefCache || presenceRefCache.uid !== currentUser.uid) {
    presenceRefCache = {
      uid: currentUser.uid,
      ref: ref(rtdb, `presence/${currentUser.uid}`)
    };
  }

  return presenceRefCache.ref;
}

async function ensurePresenceOnline() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const userPresenceRef = getPresenceRef();
  if (!userPresenceRef) return;

  const payload = {
    username: currentUser.username,
    typing: false,
    lastSeen: Date.now()
  };

  try {
    await set(userPresenceRef, payload);
    onDisconnect(userPresenceRef)
      .remove()
      .catch((error) => {
        console.warn('[Presence] onDisconnect remove failed', error);
      });
    presenceInitialized = true;
  } catch (error) {
    console.warn('[Presence] ensure online failed', error);
  }
}

function markLastSeen() {
  const userPresenceRef = getPresenceRef();
  if (!userPresenceRef) return;

  update(userPresenceRef, {
    lastSeen: Date.now()
  }).catch(() => {
    // Presence update skipped
  });
}

// Create message element
function createMessageElement(data) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';

  const currentUser = getCurrentUser();
  const isCurrentUser = currentUser && data.uid === currentUser.uid;

  // Get unique color for this user
  const username = data.username || 'Anonymous';
  const userColor = getUserColor(username);

  // Apply the color as background
  messageDiv.style.backgroundColor = userColor;

  if (isCurrentUser) {
    messageDiv.classList.add('is-current-user');
  } else {
    messageDiv.classList.add('is-other-user');
  }

  const headerDiv = document.createElement('div');
  headerDiv.className = 'chat-message-header';

  const userSpan = document.createElement('span');
  userSpan.className = 'chat-message-user';
  userSpan.textContent = username;

  const timeSpan = document.createElement('span');
  timeSpan.className = 'chat-message-time';
  timeSpan.textContent = formatTime(data.createdAt);

  headerDiv.appendChild(userSpan);
  headerDiv.appendChild(timeSpan);

  const textDiv = document.createElement('div');
  textDiv.className = 'chat-message-text';
  textDiv.textContent = data.text;

  messageDiv.appendChild(headerDiv);
  messageDiv.appendChild(textDiv);

  return messageDiv;
}

// Auto-scroll to bottom (only if near bottom)
function scrollToBottom(force = false) {
  const isNearBottom = chatStream.scrollHeight - chatStream.scrollTop - chatStream.clientHeight < 100;
  if (force || isNearBottom) {
    chatStream.scrollTop = chatStream.scrollHeight;
  }
}

// Keyboard-aware layout for iOS using visualViewport
function initKeyboardAwareLayout() {
  const chatLayout = document.querySelector('.chat-layout');
  const inputBar = document.querySelector('.chat-input-bar');
  const stream = document.getElementById('chatStream');

  if (!chatLayout || !inputBar || !stream || !window.visualViewport) return;

  const vv = window.visualViewport;

  const updateLayoutForViewport = () => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    // hauteur du clavier ≈ différence entre la fenêtre complète et le viewport visible
    const keyboardHeight = Math.max(
      0,
      window.innerHeight - viewport.height - viewport.offsetTop
    );

    // pousse la barre d'input au-dessus du clavier
    inputBar.style.marginBottom = keyboardHeight > 0
      ? `${keyboardHeight + 4}px`
      : '0px';

    // laisse un peu d'air pour le contenu aussi
    chatLayout.style.paddingBottom = keyboardHeight > 0
      ? '4px'
      : '0px';

    // si on est déjà proche du bas, on recolle le scroll au bas
    const nearBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 120;
    if (nearBottom) {
      stream.scrollTop = stream.scrollHeight;
    }
  };

  vv.addEventListener('resize', updateLayoutForViewport);
  vv.addEventListener('scroll', updateLayoutForViewport);

  // appel initial
  updateLayoutForViewport();
}

// Listen to messages in real-time (last 50)
function initMessageListener() {
  const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));

  let isFirstLoad = true;

  onSnapshot(q, (snapshot) => {
    // Store last visible for pagination
    if (!snapshot.empty) {
      lastVisible = snapshot.docs[snapshot.docs.length - 1];
    }

    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });

    // Reverse to show oldest first
    messages.reverse();

    chatStream.innerHTML = '';

    if (messages.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'chat-empty';
      emptyDiv.textContent = 'Aucun message. Sois le premier à écrire ! 💬';
      chatStream.appendChild(emptyDiv);
      return;
    }

    // Add "Load More" button if we have 50 messages
    if (messages.length === 50) {
      const loadMoreBtn = document.createElement('button');
      loadMoreBtn.className = 'load-more-btn';
      loadMoreBtn.textContent = '↑ Charger plus de messages';
      loadMoreBtn.addEventListener('click', loadOlderMessages);
      chatStream.appendChild(loadMoreBtn);
    }

    messages.forEach((data) => {
      const messageElement = createMessageElement(data);
      chatStream.appendChild(messageElement);
    });

    // Scroll to bottom on first load or new message
    if (isFirstLoad) {
      setTimeout(() => scrollToBottom(true), 100);
      isFirstLoad = false;
    } else {
      scrollToBottom();
    }
  }, (error) => {
    console.error('[Chat Load Error]', error.code, error.message);
    chatStream.innerHTML = '<div class="chat-empty">❌ Erreur de chargement.</div>';
  });
}

// Load older messages
async function loadOlderMessages() {
  if (!lastVisible) return;

  try {
    const olderQuery = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      startAfter(lastVisible),
      limit(20)
    );

    const snapshot = await getDocs(olderQuery);

    if (snapshot.empty) {
      alert('Plus de messages à charger');
      return;
    }

    // Update last visible
    lastVisible = snapshot.docs[snapshot.docs.length - 1];

    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });

    messages.reverse();

    // Find load more button and insert before it
    const loadMoreBtn = chatStream.querySelector('.load-more-btn');

    messages.forEach((data) => {
      const messageElement = createMessageElement(data);
      if (loadMoreBtn) {
        chatStream.insertBefore(messageElement, loadMoreBtn.nextSibling);
      } else {
        chatStream.insertBefore(messageElement, chatStream.firstChild);
      }
    });
  } catch (error) {
    console.error('[Load Older Error]', error);
    alert('Erreur lors du chargement des messages');
  }
}

// Initialize DOM and event listeners
function initDOM() {
  chatForm = document.getElementById('chatForm');
  chatStream = document.getElementById('chatStream');
  chatMessage = document.getElementById('chatMessage');
  sendBtn = document.getElementById('sendBtn');
  typingIndicator = document.getElementById('typingIndicator');

  if (!chatForm || !chatStream || !chatMessage || !sendBtn) {
    console.error('[Chat] Required DOM elements not found');
    return false;
  }

  // Auto-resize textarea
  chatMessage.addEventListener('input', () => {
    chatMessage.style.height = 'auto';
    const maxHeight = window.innerWidth <= 640 ? 60 : 80;
    chatMessage.style.height = Math.min(chatMessage.scrollHeight, maxHeight) + 'px';
  });

  // Send message on form submit
  chatForm.addEventListener('submit', handleSubmit);

  // Enter to send (Shift+Enter for new line)
  chatMessage.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  });

  // Listen to typing input
  chatMessage.addEventListener('input', () => {
    void updateTypingStatus(true);

    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set typing to false after 1.5s of inactivity
    typingTimeout = setTimeout(() => {
      void updateTypingStatus(false);
    }, 1500);
  });

  // Activer le layout "keyboard aware"
  initKeyboardAwareLayout();

  return true;
}

// Handle form submit
async function handleSubmit(e) {
  e.preventDefault();

  const currentUser = getCurrentUser();

  if (!currentUser) {
    console.error('[Chat] Not authenticated');
    alert('⚠️ Session expirée\n\nReconnectez-vous pour envoyer des messages.');
    window.location.href = 'login.html';
    return;
  }

  const text = chatMessage.value.trim();

  if (!text) return;

  if (text.length > 400) {
    alert('⚠️ Message trop long (max 400 caractères)');
    return;
  }

  if (!presenceInitialized) {
    await ensurePresenceOnline();
  }

  // Cooldown check
  const now = Date.now();
  if (now - lastMessageTime < MESSAGE_COOLDOWN) {
    const remaining = Math.ceil((MESSAGE_COOLDOWN - (now - lastMessageTime)) / 1000);
    alert(`⏳ Attendez ${remaining}s avant d'envoyer un autre message`);
    return;
  }

  sendBtn.disabled = true;

  try {
    const payload = {
      uid: currentUser.uid,
      username: currentUser.username,
      text: text,
      createdAt: serverTimestamp()
    };

    await addDoc(messagesRef, payload);

    lastMessageTime = now;

    // Clear input and reset height
    chatMessage.value = '';
    chatMessage.style.height = 'auto';

    // Reset typing indicator
    await updateTypingStatus(false);

    // Scroll to bottom
    setTimeout(() => scrollToBottom(true), 100);
  } catch (error) {
    console.error('[Chat Error]', error.code, error.message);

    if (error.code === 'permission-denied') {
      alert('⚠️ Permission refusée\n\nVérifiez les règles Firestore.');
    } else {
      alert('❌ Erreur d\'envoi\n\nVérifiez votre connexion.');
    }
  } finally {
    sendBtn.disabled = false;
    chatMessage.focus();
  }
}

// ========== PRESENCE & TYPING ==========

// Update presence online/offline
function updatePresence(online = true) {
  if (!online) {
    const userPresenceRef = getPresenceRef();
    if (!userPresenceRef) return;

    presenceInitialized = false;
    presenceRefCache = null;

    return update(userPresenceRef, {
      typing: false,
      lastSeen: Date.now()
    }).catch(() => {
      // Presence update skipped on unload
    });
  }

  return ensurePresenceOnline();
}

// Update typing status
async function updateTypingStatus(isTyping) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  if (!presenceInitialized) {
    await ensurePresenceOnline();
  }

  const userPresenceRef = getPresenceRef();
  if (!userPresenceRef) return;

  try {
    await update(userPresenceRef, {
      typing: isTyping,
      lastSeen: Date.now()
    });
  } catch (error) {
    // Typing update fallback
    try {
      await set(userPresenceRef, {
        username: currentUser.username,
        typing: isTyping,
        lastSeen: Date.now()
      });
      onDisconnect(userPresenceRef)
        .remove()
        .catch(() => {});
      presenceInitialized = true;
    } catch (innerError) {
      console.warn('[Presence] typing status failed', innerError);
    }
  }
}

// Listen to all presence data
function initPresenceListener() {
  const presenceRef = ref(rtdb, 'presence');

  onValue(presenceRef, (snapshot) => {
    if (!typingIndicator) return;

    const currentUser = getCurrentUser();
    const presences = snapshot.val() || {};

    const typingUsers = [];

    Object.keys(presences).forEach((uid) => {
      const entry = presences[uid];
      if (!entry || typeof entry !== 'object') return;
      if (uid === currentUser?.uid) return;

      const username = typeof entry.username === 'string' && entry.username.trim()
        ? entry.username
        : 'Anonyme';

      if (entry.typing) {
        typingUsers.push(username);
      }
    });

    // Update typing indicator
    if (typingUsers.length === 0) {
      typingIndicator.hidden = true;
    } else {
      typingIndicator.hidden = false;
      const typingText = typingUsers.length === 1
        ? `${typingUsers[0]} tape...`
        : `${typingUsers.join(', ')} tapent...`;
      const typingTextEl = typingIndicator.querySelector('.typing-text');
      if (typingTextEl) {
        typingTextEl.textContent = typingText;
      }
    }
  });
}

// Initialize chat only when authenticated
let chatInitialized = false;

async function initChat() {
  // Wait for auth-guard to confirm authentication
  await authReady;

  // Only initialize if user is authenticated (authReady resolves with user or true)
  if (!auth.currentUser) {
    return; // User not authenticated, auth-guard will redirect
  }

  if (!chatInitialized) {
    initMessageListener();
    initPresenceListener();
    chatInitialized = true;
  }

  presenceInitialized = false;
  ensurePresenceOnline();

  window.addEventListener('focus', ensurePresenceOnline);
  window.addEventListener('blur', markLastSeen);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      ensurePresenceOnline();
    } else {
      markLastSeen();
    }
  });

  window.addEventListener('beforeunload', () => {
    updatePresence(false);
  });
}

// Main initialization - wait for DOM then start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (initDOM()) {
      initChat();
    }
  });
} else {
  // DOM already loaded
  if (initDOM()) {
    initChat();
  }
}
