import { db, auth } from './firebase.js';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const chatForm = document.getElementById('chatForm');
const chatLog = document.getElementById('chatLog');
const chatMessage = document.getElementById('chatMessage');
const sendBtn = document.getElementById('sendBtn');

// Auto-resize textarea
chatMessage.addEventListener('input', () => {
  chatMessage.style.height = 'auto';
  chatMessage.style.height = Math.min(chatMessage.scrollHeight, 120) + 'px';
});

// Reference to messages collection
const messagesRef = collection(db, 'rooms', 'global', 'messages');

// Get current user's UID
function getCurrentUserUid() {
  return auth.currentUser?.uid || null;
}

// Format timestamp
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (messageDate.getTime() === today.getTime()) {
    return timeStr;
  } else if (messageDate.getTime() === today.getTime() - 86400000) {
    return `Hier ${timeStr}`;
  } else {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + timeStr;
  }
}

// Create message element
function createMessageElement(data) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';

  const username = data.username || 'Anonymous';
  const currentUserUid = getCurrentUserUid();
  const isCurrentUser = currentUserUid && data.uid === currentUserUid;

  // Apply styling based on current user vs others
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

// Auto-scroll to bottom
function scrollToBottom() {
  chatLog.scrollTop = chatLog.scrollHeight;
}

// Listen to messages in real-time
const q = query(messagesRef, orderBy('createdAt', 'asc'));

let isFirstLoad = true;

onSnapshot(q, (snapshot) => {
  chatLog.innerHTML = '';

  if (snapshot.empty) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'chat-empty';
    emptyDiv.textContent = 'Aucun message pour le moment. Sois le premier à écrire !';
    chatLog.appendChild(emptyDiv);
    return;
  }

  snapshot.forEach((doc) => {
    const data = doc.data();
    const messageElement = createMessageElement(data);
    chatLog.appendChild(messageElement);
  });

  // Scroll to bottom
  if (isFirstLoad) {
    setTimeout(scrollToBottom, 100);
    isFirstLoad = false;
  } else {
    scrollToBottom();
  }
}, (error) => {
  console.error('[Chat Load Error]', error.code, error.message);
  chatLog.innerHTML = '<div class="chat-empty">❌ Erreur de chargement des messages.</div>';
});

// Send message
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Check authentication
  console.log('[Chat] AUTH?', !!auth.currentUser, 'UID:', auth.currentUser?.uid);

  if (!auth.currentUser) {
    console.error('[Chat] No auth.currentUser - redirecting to login');
    alert('⚠️ Session expirée\n\nVeuillez vous reconnecter pour envoyer des messages.');
    window.location.href = 'login.html';
    return;
  }

  const text = chatMessage.value.trim();

  // Validate message
  if (!text) {
    console.warn('[Chat] Empty message - ignoring');
    return;
  }
  if (text.length < 1 || text.length > 400) {
    console.warn('[Chat] Invalid text length:', text.length);
    alert('⚠️ Message invalide\n\nLe message doit contenir entre 1 et 400 caractères.');
    return;
  }

  // Disable button while sending
  sendBtn.disabled = true;

  try {
    const currentUser = auth.currentUser;
    const user = JSON.parse(localStorage.getItem('bb_user') || '{}');
    const username = user.username || 'Anonymous';

    const payload = {
      uid: currentUser.uid,
      username: username,
      text: text,
      createdAt: serverTimestamp()
    };

    console.log('[Chat] Sending message:', { uid: payload.uid, username: payload.username, textLength: text.length });

    await addDoc(messagesRef, payload);

    console.log('[Chat] Message sent successfully');

    // Clear input and reset height
    chatMessage.value = '';
    chatMessage.style.height = 'auto';

    // Scroll to bottom
    setTimeout(scrollToBottom, 100);
  } catch (error) {
    console.error('[Chat Error]', 'CODE:', error.code, 'MESSAGE:', error.message);
    console.error('[Chat Error] Full error:', error);

    if (error.code === 'permission-denied') {
      alert('⚠️ Permission refusée\n\nVous n\'avez pas les droits pour envoyer des messages.\n\nVérifiez les règles Firestore.');
    } else if (error.code === 'unauthenticated') {
      alert('⚠️ Non authentifié\n\nVeuillez vous reconnecter.');
      window.location.href = 'login.html';
    } else {
      alert('❌ Erreur d\'envoi\n\nCode: ' + (error.code || 'unknown') + '\n\nVérifiez la console pour plus de détails.');
    }
  } finally {
    sendBtn.disabled = false;
    chatMessage.focus();
  }
});

// Enter to send (Shift+Enter for new line)
chatMessage.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event('submit'));
  }
});
