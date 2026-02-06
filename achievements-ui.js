// ==================== ACHIEVEMENTS UI FUNCTIONS ====================
// Fonctions pour afficher et gérer l'interface des succès

// Afficher la modal des succès
function showAchievementsModal() {
  const modal = document.getElementById('achievementsModal');
  modal.style.display = 'flex';
  renderAchievements();
}

// Fermer la modal des succès
function closeAchievementsModal() {
  document.getElementById('achievementsModal').style.display = 'none';
}

// Rendre l'affichage des succès
function renderAchievements(filterCategory = 'all') {
  const container = document.getElementById('achievementsList');
  const achievements = AchievementSystem.getAllForDisplay();
  
  // Filtrer
  const filtered = filterCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === filterCategory);
  
  // Grouper par catégorie
  const grouped = {};
  for (const achievement of filtered) {
    if (!grouped[achievement.category]) {
      grouped[achievement.category] = [];
    }
    grouped[achievement.category].push(achievement);
  }
  
  // Construire le HTML
  let html = '';
  
  for (const [category, items] of Object.entries(grouped)) {
    const categoryInfo = AchievementSystem.categories[category];
    
    html += `
      <div class="achievements-category">
        <div class="achievements-category-title">
          ${categoryInfo.icon} ${categoryInfo.name}
        </div>
        <div class="achievements-grid">
    `;
    
    for (const achievement of items) {
      const lockedClass = achievement.unlocked ? 'unlocked' : 'locked';
      const secretClass = achievement.secret && !achievement.unlocked ? 'secret' : '';
      const statusText = achievement.unlocked ? '✅ Débloqué' : '🔒 Verrouillé';
      const dateText = achievement.unlocked 
        ? new Date(achievement.unlockedAt).toLocaleDateString('fr-FR')
        : '';
      
      html += `
        <div class="achievement-card ${lockedClass} ${secretClass}">
          <div class="achievement-card-header">
            <div class="achievement-card-icon">${achievement.icon}</div>
            <div class="achievement-card-rarity" style="color: ${achievement.rarity.color};">
              ${achievement.rarity.icon} ${achievement.rarity.name}
            </div>
          </div>
          <div class="achievement-card-body">
            <div class="achievement-card-name">${achievement.name}</div>
            <div class="achievement-card-description">${achievement.description}</div>
          </div>
          <div class="achievement-card-footer">
            <div class="achievement-card-status ${lockedClass}">
              ${statusText}
            </div>
            ${dateText ? `<div class="achievement-card-date">${dateText}</div>` : ''}
          </div>
          <div class="achievement-card-logo-slot">?</div>
        </div>
      `;
    }
    
    html += `
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
  
  // Mettre à jour les stats
  updateAchievementStats();
}

// Mettre à jour le badge dans le header
function updateAchievementBadge() {
  const count = AchievementSystem.getUnlockedCount();
  const total = AchievementSystem.getTotalCount();
  
  document.getElementById('achievementsCount').textContent = count;
  document.getElementById('achievementsTotal').textContent = total;
  document.getElementById('modalAchievementsCount').textContent = count;
  document.getElementById('modalAchievementsTotal').textContent = total;
}

// Mettre à jour les stats par rareté
function updateAchievementStats() {
  const achievements = AchievementSystem.getAllForDisplay();
  const unlocked = achievements.filter(a => a.unlocked);
  
  const stats = {
    common: unlocked.filter(a => a.rarity.name === 'Commun').length,
    rare: unlocked.filter(a => a.rarity.name === 'Rare').length,
    epic: unlocked.filter(a => a.rarity.name === 'Épique').length,
    legendary: unlocked.filter(a => a.rarity.name === 'Légendaire').length
  };
  
  document.getElementById('statCommon').textContent = stats.common;
  document.getElementById('statRare').textContent = stats.rare;
  document.getElementById('statEpic').textContent = stats.epic;
  document.getElementById('statLegendary').textContent = stats.legendary;
}

// Vérifier les succès après une action
async function checkAchievements() {
  // Construire les données de progression
  const data = AchievementSystem.getProgressData();
  
  // Ajouter les données contextuelles actuelles
  if (quizCards.length > 0 && currentQuizIndex === quizCards.length) {
    // Quiz terminé
    const totalCorrect = quizStats.correct;
    const totalCards = quizCards.length;
    
    // Quiz parfait ?
    data.perfectQuiz = (totalCorrect === totalCards && totalCards > 0);
    
    // Speed run ?
    if (sessionStartTime && quizCards.length === 20) {
      const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
      data.speedRun = duration < 300; // moins de 5 minutes
    }
    
    // Heure de la session
    const hour = new Date().getHours();
    data.nightSession = hour >= 0 && hour < 6;
    data.earlySession = hour >= 5 && hour < 7;
  }
  
  // Carte revenue d'entre les morts
  for (const card of cards) {
    if (card.lastPlayed) {
      const daysSince = (Date.now() - card.lastPlayed) / (1000 * 60 * 60 * 24);
      if (daysSince >= 30) {
        data.revivedCard = true;
        break;
      }
    }
  }
  
  // Transformation de carte
  for (const card of cards) {
    const mastery = MasteryCalculator.calculateMastery(card);
    if (mastery >= 85 && card.stats.played > 0) {
      // Vérifier si elle était à 0% avant
      // (On devrait stocker l'historique des scores, mais pour l'instant on simplifie)
      data.cardTransformation = true;
      break;
    }
  }
  
  // Vérifier et débloquer
  await AchievementSystem.check(data);
  
  // Mettre à jour le badge
  updateAchievementBadge();
}

// Setup des filtres
function setupAchievementFilters() {
  const filterBtns = document.querySelectorAll('.achievement-filter-btn');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Retirer active de tous
      filterBtns.forEach(b => b.classList.remove('active'));
      // Ajouter active au bouton cliqué
      btn.classList.add('active');
      // Filtrer
      const filter = btn.dataset.filter;
      renderAchievements(filter);
    });
  });
}

// Initialiser le système de succès
async function initAchievements() {
  await AchievementSystem.init();
  updateAchievementBadge();
  setupAchievementFilters();
  
  console.log(`🏆 Système de succès initialisé (${AchievementSystem.getUnlockedCount()}/${AchievementSystem.getTotalCount()})`);
}
