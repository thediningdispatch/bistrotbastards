# 🎯 Avatar Badge — Diagnostic & Tests

## ✅ Modifications appliquées

### 1. **src/scripts/core/utils.js**
- ✅ Ajout `getStoredAvatar()` : récupère l'URL depuis `localStorage["bb.avatarUrl"]`
- ✅ Ajout `setStoredAvatar(url)` : stocke/supprime l'URL dans localStorage
- ✅ Ajout `hydrateBadge(url)` : hydrate l'avatar avec gestion cache + loading/hidden

### 2. **src/scripts/pages/signup.js**
- ✅ Import `updateProfile` depuis Firebase Auth
- ✅ Import `setStoredAvatar` depuis utils
- ✅ Après création utilisateur : `updateProfile(auth.currentUser, { photoURL })``
- ✅ Synchronisation `setStoredAvatar(avatarUrl)` pour hydratation rapide

### 3. **src/scripts/pages/login.js**
- ✅ Import `setStoredAvatar`
- ✅ Après login : sync `auth.currentUser.photoURL` → `localStorage["bb.avatarUrl"]`
- ✅ Fallback sur Firestore avatar si photoURL absent

### 4. **src/scripts/core/navigation.js**
- ✅ Import `getStoredAvatar`, `hydrateBadge`, `auth`, `onAuthStateChanged`
- ✅ Ajout listener `DOMContentLoaded` pour page home uniquement
- ✅ Hydratation via `onAuthStateChanged(auth, user => hydrateBadge(user.photoURL || getStoredAvatar()))`
- ✅ Refresh sur `visibilitychange` (tab devient visible)
- ✅ Support HMR Vite (`vite:afterUpdate`)

### 5. **src/pages/waiter/home.html**
- ✅ Badge initial avec classe `.bb-badge--hidden` au lieu de `hidden`
- ✅ Suppression du code inline legacy (avatarMap, inferredAvatar)
- ✅ Délégation complète à `navigation.js` / `hydrateBadge()`

### 6. **src/styles/waiter-home.css**
- ✅ État `.bb-badge--loading` avec spinner CSS animé
- ✅ Logs de diagnostic inclus en commentaires

---

## 🧪 LOGS DIAGNOSTIC (à coller en console)

### 1️⃣ Diagnostic complet

```javascript
(() => {
  const img = document.getElementById('bbUserBadge');
  const ls  = (() => { try { return localStorage.getItem('bb.avatarUrl') } catch { return null } })();
  const u   = window.auth?.currentUser || null;
  console.log('BB_AVATAR:diagnostic', {
    path: location.pathname,
    user: u ? { uid: u.uid, photoURL: u.photoURL } : null,
    localStorage: ls,
    img: img ? {
      present: true,
      srcAttr: img.getAttribute('src'),
      hidden: img.classList.contains('bb-badge--hidden'),
      loading: img.classList.contains('bb-badge--loading'),
      complete: img.complete,
      natural: img.naturalWidth + 'x' + img.naturalHeight
    } : { present: false }
  });
})();
```

### 2️⃣ Test forcé (avatar générique)

```javascript
document.getElementById('bbUserBadge')?.classList.remove('bb-badge--hidden');
document.getElementById('bbUserBadge')?.setAttribute('src', 'https://i.pravatar.cc/64');
```

### 3️⃣ Vérifier le markup du titre

```javascript
console.log(document.querySelector('.bb-welcome-title')?.outerHTML);
```

### 4️⃣ Forcer réhydratation manuelle

```javascript
import { hydrateBadge, getStoredAvatar } from '/src/scripts/core/utils.js';
const { auth } = await import('/src/scripts/core/firebase.js');
const src = auth.currentUser?.photoURL || getStoredAvatar() || "";
hydrateBadge(src);
```

---

## ✅ CHECKLIST DE TEST

### 1. Compte neuf : signup (choix avatar) → redirection home
- [ ] Badge visible immédiatement
- [ ] Pas d'icône cassée
- [ ] Spinner visible pendant chargement (< 1s)

### 2. Refresh home (F5) sans relogin
- [ ] Badge visible instantanément (cache localStorage)
- [ ] Pas de flash/saut visuel
- [ ] Console : `BB_AVATAR:hydrateBadge` avec `complete: true`

### 3. Logout → login
- [ ] Badge visible après redirection home
- [ ] Synchronisé depuis `user.photoURL` (console : `BB_AVATAR:login:sync`)

### 4. Changer avatar dans waiter-profile → revenir home
- [ ] Badge mis à jour sans refresh
- [ ] Visible après navigation retour

### 5. URL avatar invalide
- [ ] Badge masqué (`.bb-badge--hidden`)
- [ ] Pas d'icône cassée visible
- [ ] Console : `BB_AVATAR:img.onerror`

---

## 📋 Si un test échoue

**Renvoie-moi :**

1. La sortie complète de `BB_AVATAR:diagnostic`
2. Le `outerHTML` du `.bb-welcome-title`
3. Les erreurs console (filtrer par "BB_AVATAR")
4. Screenshot du badge (état loading/hidden/visible)

---

## 🔍 Points de debug supplémentaires

### Vérifier Firebase Auth photoURL

```javascript
const { auth } = await import('/src/scripts/core/firebase.js');
console.log('Firebase Auth photoURL:', auth.currentUser?.photoURL);
```

### Vérifier localStorage

```javascript
console.log('bb.avatarUrl:', localStorage.getItem('bb.avatarUrl'));
console.log('bb_user:', JSON.parse(localStorage.getItem('bb_user') || '{}'));
```

### Vérifier les classes du badge

```javascript
const badge = document.getElementById('bbUserBadge');
console.log({
  classList: Array.from(badge.classList),
  src: badge.src,
  complete: badge.complete,
  naturalWidth: badge.naturalWidth,
  naturalHeight: badge.naturalHeight
});
```

### Monitorer les changements d'état

```javascript
const badge = document.getElementById('bbUserBadge');
const observer = new MutationObserver((mutations) => {
  mutations.forEach(m => {
    if (m.attributeName === 'class' || m.attributeName === 'src') {
      console.log('BB_AVATAR:mutation', {
        attr: m.attributeName,
        classList: Array.from(badge.classList),
        src: badge.src
      });
    }
  });
});
observer.observe(badge, { attributes: true });
```

---

## 🎨 États CSS du badge

| État | Classes | Comportement |
|------|---------|--------------|
| **Hidden** | `.bb-badge--hidden` | `display: none !important` |
| **Loading** | `.bb-badge--loading` | Spinner CSS animé |
| **Visible** | `[src]:not(.bb-badge--hidden)` | `display: inline-block` |
| **Error** | `.bb-badge--hidden` + `onerror` | Masqué automatiquement |

---

## 🚀 Architecture finale

```
┌─────────────────────────────────────────────────────────────┐
│ SIGNUP                                                       │
│ 1. createUser → updateProfile(photoURL)                     │
│ 2. setStoredAvatar(avatarUrl) → localStorage["bb.avatarUrl"]│
│ 3. setStoredUser({ avatar, avatarKey })                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ LOGIN                                                        │
│ 1. signIn → sync auth.currentUser.photoURL                  │
│ 2. setStoredAvatar(photoURL || firestoreAvatar)             │
│ 3. setStoredUser({ avatar, avatarKey })                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ HOME HYDRATION (navigation.js)                              │
│ 1. onAuthStateChanged → hydrateBadge(photoURL || LS)        │
│ 2. visibilitychange → hydrateBadge (refresh)                │
│ 3. HMR → hydrateBadge (dev)                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ hydrateBadge(url)                                            │
│ • Ajoute .bb-badge--loading                                  │
│ • Set img.src = url                                          │
│ • img.onload → remove loading/hidden                         │
│ • img.onerror → add hidden                                   │
│ • Si img.complete + naturalWidth > 0 → show immédiat (cache)│
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Notes importantes

1. **Pas de double hydratation** : le code inline dans `home.html` a été supprimé, seul `navigation.js` gère l'avatar.

2. **Cache robuste** : `hydrateBadge()` vérifie `img.complete` et `naturalWidth` pour gérer les images déjà en cache (pas d'attente `onload`).

3. **Ordre de priorité** :
   - `auth.currentUser.photoURL` (source de vérité Firebase)
   - `localStorage["bb.avatarUrl"]` (hydratation rapide)
   - Vide → badge masqué

4. **Classes CSS obligatoires** :
   - Initial : `.bb-badge--hidden`
   - Loading : `.bb-badge--loading`
   - Success : aucune classe (juste `[src]:not(.bb-badge--hidden)`)

5. **Logs de suivi** :
   - `BB_AVATAR:signup:updateProfile`
   - `BB_AVATAR:login:sync`
   - `BB_AVATAR:home:hydrate`
   - `BB_AVATAR:hydrateBadge`
   - `BB_AVATAR:img.onload` / `BB_AVATAR:img.onerror`
