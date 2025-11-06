/**
 * Script pour attribuer le custom claim isAdmin à un utilisateur Firebase
 *
 * PRÉREQUIS:
 * 1. Installer firebase-admin: npm install firebase-admin
 * 2. Télécharger une clé de compte de service depuis la console Firebase:
 *    - Aller dans Paramètres > Comptes de service
 *    - Cliquer sur "Générer une nouvelle clé privée"
 *    - Sauvegarder le fichier JSON dans un endroit sécurisé
 * 3. Définir la variable d'environnement:
 *    export GOOGLE_APPLICATION_CREDENTIALS="/chemin/vers/serviceAccountKey.json"
 *
 * UTILISATION:
 * 1. Remplacer '<TON_UID_ADMIN>' par l'UID réel de l'utilisateur admin
 * 2. Exécuter: node set-claim-admin.js
 * 3. Dans l'application, se reconnecter et forcer le refresh du token:
 *    await auth.currentUser.getIdToken(true)
 */

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialiser Firebase Admin avec les credentials par défaut
initializeApp();

// UID de l'utilisateur à promouvoir admin
const adminUid = 'ox7IA7SqTbh6BzDTjCI3PKlC1Kp1';

async function setAdminClaim() {
  try {
    // Vérifier que l'utilisateur existe
    const user = await getAuth().getUser(adminUid);
    console.log(`✓ Utilisateur trouvé: ${user.email || user.uid}`);

    // Attribuer le custom claim isAdmin
    await getAuth().setCustomUserClaims(adminUid, { isAdmin: true });
    console.log(`✓ Claim isAdmin=true appliqué à ${adminUid}`);

    // Vérifier que le claim a bien été appliqué
    const updatedUser = await getAuth().getUser(adminUid);
    console.log('✓ Claims actuels:', updatedUser.customClaims);

    console.log('\n📝 Prochaines étapes:');
    console.log('1. Se déconnecter puis se reconnecter dans l\'application');
    console.log('2. Ou forcer le refresh du token: await auth.currentUser.getIdToken(true)');
    console.log('3. Accéder au dashboard admin');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code === 'auth/user-not-found') {
      console.error('L\'utilisateur avec l\'UID spécifié n\'existe pas.');
      console.error('Vérifiez l\'UID dans la console Firebase Authentication.');
    }
    process.exit(1);
  }
}

// Exécuter le script
setAdminClaim();
