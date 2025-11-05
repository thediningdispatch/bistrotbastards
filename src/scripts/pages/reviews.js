// Reviews page — Défi Podium review generator

window.requestAnimationFrame(() => {
  // Map complète des 27 combinaisons possibles (food-service-experience)
  // 0 = mauvais (bof/lent), 1 = moyen (bon/correct/bien), 2 = excellent (top/rapide/excellent)
  const reviewMessages = {
    'bof-lent-bof': "Expérience décevante, plats sans saveur, service vraiment trop lent et ambiance fade. Il y a du travail à faire.",
    'bof-lent-bien': "Ambiance correcte mais malheureusement les plats manquaient de goût et l'attente était longue. Peut mieux faire.",
    'bof-lent-excellent': "Superbe ambiance qui sauve la soirée ! Dommage que les plats soient moyens et le service un peu lent.",
    'bof-correct-bof': "Visite moyenne, les plats manquaient de caractère, service correct mais rien de mémorable. Mitigé.",
    'bof-correct-bien': "Belle ambiance et service efficace, mais les plats étaient décevants. Un effort sur la cuisine serait apprécié.",
    'bof-correct-excellent': "Atmosphère incroyable et bon service, dommage que la cuisine ne suive pas. Beaucoup de potentiel !",
    'bof-rapide-bof': "Service rapide mais les plats étaient bof et l'ambiance sans âme. Pas convaincu.",
    'bof-rapide-bien': "Service ultra efficace et cadre sympa, malheureusement la cuisine était en dessous de nos attentes.",
    'bof-rapide-excellent': "Service au top et ambiance de fou ! Les plats pourraient être meilleurs mais l'expérience reste cool.",
    'bon-lent-bof': "Bons plats mais gâchés par un service vraiment lent et une ambiance sans charme. C'est dommage.",
    'bon-lent-bien': "Cuisine savoureuse et bonne ambiance, mais l'attente était vraiment trop longue. À améliorer.",
    'bon-lent-excellent': "Plats délicieux et atmosphère géniale ! Seul bémol : le service pourrait être plus rapide.",
    'bon-correct-bof': "Plats corrects et service efficace mais l'ambiance manquait de vie. Une expérience sans plus.",
    'bon-correct-bien': "Belle soirée au Podium, bons plats, service pro et ambiance sympa. On reviendra !",
    'bon-correct-excellent': "Super moment ! Cuisine délicieuse, service au point et ambiance électrique. Très bon resto !",
    'bon-rapide-bof': "Plats savoureux et service rapide, dommage que l'ambiance soit un peu fade. Bon rapport qualité/prix.",
    'bon-rapide-bien': "Excellente expérience ! Plats bons, service ultra efficace et cadre agréable. Je recommande.",
    'bon-rapide-excellent': "Soirée au top ! Cuisine excellente, service impeccable et ambiance de folie. Bravo l'équipe !",
    'top-lent-bof': "Plats exceptionnels mais malheureusement service trop lent et ambiance décevante. Potentiel inexploité.",
    'top-lent-bien': "Cuisine incroyable et belle ambiance, seul point noir : l'attente était vraiment longue.",
    'top-lent-excellent': "Plats au top et atmosphère de dingue ! Juste le service qui pourrait être plus rapide.",
    'top-correct-bof': "Cuisine exceptionnelle et service correct, mais l'ambiance manquait de punch. À mi-chemin de l'excellence.",
    'top-correct-bien': "Super moment au Podium ! Plats incroyables, bon service et ambiance cool. Une belle découverte !",
    'top-correct-excellent': "Expérience au top ! Cuisine d'exception, service pro et ambiance électrique. Rien à redire !",
    'top-rapide-bof': "Plats exceptionnels et service ultra rapide, dommage que l'ambiance soit plate. La cuisine sauve tout.",
    'top-rapide-bien': "Excellent resto ! Cuisine incroyable, service impeccable et bonne ambiance. On adore !",
    'top-rapide-excellent': "Soirée de folie au Podium ! Plats exceptionnels, service au top et ambiance de ouf. PARFAIT ! 🔥"
  };

  const state = {
    server: '',
    food: '',
    service: '',
    experience: ''
  };

  // Fonction de génération de message
  function generateMessage() {
    if (!state.server || !state.food || !state.service || !state.experience) {
      return '';
    }

    // Construire la clé à partir des sélections
    const key = `${state.food}-${state.service}-${state.experience}`;

    // Récupérer le message correspondant
    const baseMessage = reviewMessages[key] || "Merci pour votre visite au Podium !";

    // Ajouter le nom du serveur de manière naturelle
    return `${state.server} nous a super bien accueillis. ${baseMessage}`;
  }

  // Gestion des clics sur les emojis
  document.querySelectorAll('.emoji').forEach(emoji => {
    emoji.addEventListener('click', () => {
      const category = emoji.dataset.category;
      const value = emoji.dataset.value;

      // Désactiver les autres emojis de la même catégorie
      document.querySelectorAll(`.emoji[data-category="${category}"]`).forEach(el => el.classList.remove('active'));
      emoji.classList.add('active');

      // Mettre à jour l'état
      state[category] = value;
      document.getElementById(`${category}Input`).value = value;

      // Régénérer le message
      const message = generateMessage();
      document.getElementById('commentField').value = message;
    });
  });

  // Gestion du changement de serveur
  const serverSelect = document.getElementById('serverSelect');
  serverSelect.addEventListener('change', (e) => {
    state.server = e.target.value;
    const message = generateMessage();
    document.getElementById('commentField').value = message;
  });

  // Gestion de la soumission
  const reviewForm = document.getElementById('reviewForm');
  if (!reviewForm) return;

  reviewForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(ev.target).entries());

    if (!data.server || !data.food || !data.service || !data.experience || !data.comment) {
      alert('Merci de remplir tous les champs avant de continuer 😊');
      return;
    }

    try { await navigator.clipboard.writeText(data.comment); }
    catch (err) { console.warn('Clipboard error:', err); }

    const webhookURL = 'https://hook.eu2.make.com/nhx6dn3egqsqx4sg8knx2ycrbhpv7nof';

    try {
      await fetch(webhookURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.error('❌ Erreur webhook :', err);
    }

    alert(`✅ Votre avis est prêt !\n\nVous allez être redirigé vers Google.\nCollez votre message (déjà copié) et cliquez sur "Publier" ⭐\n\nMerci d'aider ${data.server} ! 🍾`);
    window.location.href = 'https://search.google.com/local/writereview?placeid=ChIJSQ8zOV1x5kcRqKqGrh0MXk4';
  });
});
