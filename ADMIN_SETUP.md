# Configuration Admin & Firestore Rules

Ce guide explique comment déployer les règles Firestore et attribuer les privilèges admin.

## 📋 Prérequis

- Accès à la console Firebase du projet
- Firebase CLI installé (`npm install -g firebase-tools`)
- Node.js pour exécuter le script d'attribution du claim admin

## 🔥 1. Déployer les règles Firestore

### Option A : Via la console Firebase (Recommandé pour les tests)

1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionner votre projet
3. Aller dans **Firestore Database** > **Règles**
4. Copier le contenu du fichier `firestore.rules` de ce dépôt
5. Cliquer sur **Publier**

### Option B : Via Firebase CLI (Recommandé pour la production)

```bash
# 1. Se connecter à Firebase
firebase login

# 2. Initialiser Firebase dans le projet (si pas déjà fait)
firebase init firestore
# Sélectionner le fichier firestore.rules existant

# 3. Déployer les règles
firebase deploy --only firestore:rules
```

## 📊 1.5. Déployer les index Firestore

Les index sont nécessaires pour les requêtes complexes (WHERE + ORDER BY).

### Option A : Via la console Firebase

1. Accéder à la page classement : `/waiter/classement.html`
2. Si l'index manque, un lien de création apparaît dans l'erreur
3. Cliquer sur le lien et confirmer la création
4. Attendre quelques minutes (création en arrière-plan)

### Option B : Via Firebase CLI (Recommandé)

```bash
# Déployer tous les index définis dans firestore.indexes.json
firebase deploy --only firestore:indexes

# Ou déployer rules + indexes ensemble
firebase deploy --only firestore
```

### Index requis (définis dans `firestore.indexes.json`)

**Index 1 : Classement de base**
- Collection : `users`
- Champs :
  - `isActive` (ASCENDING)
  - `score` (DESCENDING)
- Usage : Query `WHERE isActive==true ORDER BY score DESC`

**Index 2 : Classement avec tri secondaire (optionnel)**
- Collection : `users`
- Champs :
  - `isActive` (ASCENDING)
  - `score` (DESCENDING)
  - `username` (ASCENDING)
- Usage : Query avec tri alphabétique en cas d'égalité de score

## 👤 2. Attribuer le claim admin à un utilisateur

### Étape 1 : Obtenir l'UID de l'utilisateur

1. Aller dans **Authentication** dans la console Firebase
2. Copier l'UID de l'utilisateur qui doit être admin

### Étape 2 : Télécharger la clé de service

1. Aller dans **Paramètres du projet** (⚙️) > **Comptes de service**
2. Cliquer sur **Générer une nouvelle clé privée**
3. Télécharger le fichier JSON dans un endroit sécurisé (NE PAS le committer !)

### Étape 3 : Installer les dépendances

```bash
npm install firebase-admin
```

### Étape 4 : Configurer et exécuter le script

```bash
# 1. Éditer le fichier set-claim-admin.js
# Remplacer '<TON_UID_ADMIN>' par l'UID réel

# 2. Définir la variable d'environnement
export GOOGLE_APPLICATION_CREDENTIALS="/chemin/vers/serviceAccountKey.json"

# 3. Exécuter le script
node set-claim-admin.js
```

Vous devriez voir :
```
✓ Utilisateur trouvé: user@example.com
✓ Claim isAdmin=true appliqué à abc123xyz
✓ Claims actuels: { isAdmin: true }
```

### Étape 5 : Se reconnecter dans l'application

Pour que le claim prenne effet :

1. **Option A** : Se déconnecter puis se reconnecter dans l'application
2. **Option B** : Forcer le refresh du token dans la console développeur :
   ```javascript
   await auth.currentUser.getIdToken(true)
   ```

## 🔐 3. Structure des permissions

### Collection `users`

| Action | Qui peut le faire | Restrictions |
|--------|------------------|--------------|
| **create** | L'utilisateur lui-même | Création de son propre document |
| **read** | Tout utilisateur connecté | Pour le classement/performances |
| **update** | Admin OU utilisateur | Admin : tout ; Utilisateur : uniquement `username`, `avatar`, `avatarKey`, `photoURL` |
| **delete** | Admin uniquement | - |

### Collection `rooms/{roomId}/messages`

| Action | Qui peut le faire | Restrictions |
|--------|------------------|--------------|
| **read** | Tout utilisateur connecté | - |
| **create** | Tout utilisateur connecté | Doit être le propriétaire du message (uid match) |
| **update/delete** | Personne | Messages immutables |

## ✅ 4. Tests d'acceptation

### Test 1 : Non connecté
- ❌ Ne peut pas accéder au dashboard → redirection vers login
- ❌ Ne peut pas lire les users → erreur de permissions

### Test 2 : Connecté non-admin
- ❌ Dashboard bloqué avec message "Accès refusé — privilèges admin requis"
- ✅ Peut lire les users (classement/performances)
- ✅ Peut modifier son propre profil (username/avatar)
- ❌ Ne peut pas modifier les scores/xp

### Test 3 : Connecté admin
- ✅ Dashboard charge tous les users
- ✅ Peut modifier tous les champs (stats, xp, score)
- ✅ Les sauvegardes fonctionnent
- ✅ Le Top 3 se met à jour avec les nouveaux scores

## 🐛 Dépannage

### "The query requires an index" sur la page classement

**Erreur complète :**
```
The query requires an index. You can create it here: https://console.firebase.google.com/...
```

**Solutions :**

**Option 1 : Via le lien (rapide)**
1. Cliquer sur le lien dans l'erreur
2. Confirmer la création de l'index
3. Attendre 2-5 minutes (création en arrière-plan)
4. Rafraîchir la page

**Option 2 : Via Firebase CLI (recommandé)**
```bash
# Déployer les index définis dans firestore.indexes.json
firebase deploy --only firestore:indexes
```

**Option 3 : Manuellement dans la console**
1. Aller dans Firebase Console > Firestore Database > Index
2. Créer un index composite :
   - Collection : `users`
   - Champs : `isActive` (Ascending), `score` (Descending)
3. Attendre la création

### "Permission denied" lors du chargement des users

**Causes possibles :**
1. Les règles Firestore ne sont pas déployées
2. Le claim `isAdmin` n'est pas attribué
3. Le token n'a pas été rafraîchi après attribution du claim

**Solutions :**
```bash
# Vérifier les règles déployées
firebase firestore:rules get

# Rafraîchir le token dans l'app
await auth.currentUser.getIdToken(true)

# Vérifier les claims dans la console développeur
const token = await auth.currentUser.getIdTokenResult()
console.log(token.claims)
```

### Le script set-claim-admin.js échoue

**Erreur : "auth/user-not-found"**
- Vérifier que l'UID est correct dans la console Firebase

**Erreur : "Could not load the default credentials"**
- Vérifier que `GOOGLE_APPLICATION_CREDENTIALS` pointe vers le bon fichier
- Le fichier de clé de service doit être au format JSON valide

### L'utilisateur admin ne peut toujours pas accéder

1. Vérifier dans la console développeur :
   ```javascript
   const token = await auth.currentUser.getIdTokenResult(true)
   console.log('isAdmin:', token.claims.isAdmin)  // Doit être true
   ```

2. Se déconnecter complètement et se reconnecter

3. Vérifier les logs dans la console développeur pour voir les messages `[admin]`

## 🔄 Retirer les privilèges admin

Pour retirer le claim admin d'un utilisateur :

```javascript
// Modifier set-claim-admin.js
await getAuth().setCustomUserClaims(adminUid, { isAdmin: false });
// Ou supprimer complètement
await getAuth().setCustomUserClaims(adminUid, null);
```

## 📚 Références

- [Firebase Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
