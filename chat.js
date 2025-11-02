import { db } from './firebase.js';
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

// Get current user
const user = JSON.parse(localStorage.getItem('bb_user') || '{}');
const username = user.username || 'Anonymous';
const uid = user.uid || 'unknown';

// Reference to messages collection
const messagesRef = collection(db, 'rooms', 'global', 'messages');

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

  const headerDiv = document.createElement('div');
  headerDiv.className = 'chat-message-header';

  const userSpan = document.createElement('span');
  userSpan.className = 'chat-message-user';
  userSpan.textContent = data.username || 'Anonymous';

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

onSnapshot(q, (snapshot) => {
  // Clear loading message
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

  // Scroll to bottom after loading messages
  setTimeout(scrollToBottom, 100);
}, (error) => {
  console.error('Error loading messages:', error);
  chatLog.innerHTML = '<div class="chat-empty">Erreur de chargement des messages.</div>';
});

// Send message
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const text = chatMessage.value.trim();
  if (!text) return;

  // Disable button while sending
  sendBtn.disabled = true;

  try {
    await addDoc(messagesRef, {
      uid: uid,
      username: username,
      text: text,
      createdAt: serverTimestamp()
    });

    // Clear input
    chatMessage.value = '';

    // Scroll to bottom
    setTimeout(scrollToBottom, 100);
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Erreur lors de l\'envoi du message. Réessaie.');
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
