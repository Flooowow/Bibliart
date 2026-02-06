// ==================== QUIZART V3.0 + ACHIEVEMENTS ====================
// Version finale avec IndexedDB et système de succès intégré

// Variables globales pour les succès
window.currentAnswerStreak = 0;


// ==================== MASTERY ALGORITHM ====================
const MasteryCalculator = {
  // Calculer le score de maîtrise d'une carte (0-100)
  calculateMastery(card) {
    if (!card.stats || card.stats.played === 0) {
      return 0; // Carte jamais jouée = 0% maîtrise
    }

    const weights = {
      globalSuccess: 0.4,    // Taux de réussite global (40%)
      componentSuccess: 0.3, // Taux de réussite par composant (30%)
      playCount: 0.2,        // Nombre de fois jouée (20%)
      recency: 0.1          // Récence de la dernière révision (10%)
    };

    // 1. Taux de réussite global
    const globalRate = card.stats.successRate || 0;

    // 2. Taux de réussite par composant (moyenne des 3)
    const artistRate = card.stats.played > 0 ? (card.stats.artistCorrect / card.stats.played) * 100 : 0;
    const titleRate = card.stats.played > 0 ? (card.stats.titleCorrect / card.stats.played) * 100 : 0;
    const dateRate = card.stats.played > 0 ? (card.stats.dateCorrect / card.stats.played) * 100 : 0;
    const componentRate = (artistRate + titleRate + dateRate) / 3;

    // 3. Score basé sur le nombre de révisions (plafonné à 10)
    const playScore = Math.min((card.stats.played / 10) * 100, 100);

    // 4. Score de récence (si jamais jouée ou il y a longtemps = score bas)
    let recencyScore = 50; // Score par défaut
    if (card.lastPlayed) {
      const daysSinceLastPlay = (Date.now() - card.lastPlayed) / (1000 * 60 * 60 * 24);
      // Plus c'est ancien, plus le score baisse (courbe exponentielle)
      recencyScore = Math.max(0, 100 - (daysSinceLastPlay * 5));
    }

    // Calcul final pondéré
    const mastery = 
      (globalRate * weights.globalSuccess) +
      (componentRate * weights.componentSuccess) +
      (playScore * weights.playCount) +
      (recencyScore * weights.recency);

    return Math.round(mastery);
  },

  // Obtenir le niveau de maîtrise
  getMasteryLevel(score) {
    if (score === 0) return { label: 'Non révisée', color: '#9CA3AF', icon: '📝' };
    if (score < 30) return { label: 'À découvrir', color: '#EF4444', icon: '🔴' };
    if (score < 50) return { label: 'En cours', color: '#F59E0B', icon: '🟠' };
    if (score < 70) return { label: 'Bien', color: '#F59E0B', icon: '🟡' };
    if (score < 85) return { label: 'Très bien', color: '#10B981', icon: '🟢' };
    return { label: 'Maîtrisée', color: '#059669', icon: '✅' };
  },

  // Trier les cartes par priorité de révision (score bas = haute priorité)
  sortByPriority(cards) {
    return [...cards].sort((a, b) => {
      const scoreA = this.calculateMastery(a);
      const scoreB = this.calculateMastery(b);
      
      // Cartes jamais jouées en priorité absolue
      if (scoreA === 0 && scoreB !== 0) return -1;
      if (scoreA !== 0 && scoreB === 0) return 1;
      
      // Sinon, score le plus bas en premier
      return scoreA - scoreB;
    });
  },

  // Obtenir les cartes à réviser (score < 70)
  getCardsToReview(cards) {
    return cards.filter(card => {
      const score = this.calculateMastery(card);
      return score < 70;
    });
  }
};

// ==================== DONNÉES ====================
let cards = [];
let currentCardId = null;
let currentEditId = null;
let currentQuizIndex = 0;
let quizCards = [];
let quizStats = { correct: 0, wrong: 0, artistPoints: 0, titlePoints: 0, datePoints: 0, totalPoints: 0, maxPoints: 0 };
let quizHistory = [];
let quizMode = 'all'; // 'all', 'smart', ou 'manual'
let quizAnswered = false;
let currentSessionDetails = [];
let sessionStartTime = null;
let totalQuizTime = 0;
let timerInterval = null;

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    showToast('⏳ Chargement...', 'info');
    
    // Charger les données
    const migrated = await DB.loadSetting('migrated', false);
    if (!migrated) {
      showToast('🔄 Migration...', 'info');
      const result = await DB.migrateFromLocalStorage();
      cards = result.cards;
      quizHistory = result.history;
      totalQuizTime = result.totalTime;
      showToast('✨ Migration terminée !', 'success');
    } else {
      cards = await DB.loadCards();
      quizHistory = await DB.loadHistory();
      totalQuizTime = await DB.loadSetting('totalQuizTime', 0);
    }
    
    setupEventListeners();
    renderCardsList();
    updateGlobalStats();
    
    // Initialiser le système de succès
    await initAchievements();
    await checkAchievements();
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    showToast('❌ Erreur', 'error');
  }
});

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Basculer entre modes
  document.getElementById('editModeBtn').addEventListener('click', () => switchMode('edit'));
  document.getElementById('quizModeBtn').addEventListener('click', () => switchMode('quiz'));

  // Mode édition
  document.getElementById('addCardBtn').addEventListener('click', createNewCard);
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    sortCards(e.target.value);
    renderCardsList();
  });
  document.getElementById('cardImage').addEventListener('change', handleImageUpload);
  document.getElementById('saveCardBtn').addEventListener('click', saveCard);
  document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
  document.getElementById('deleteCardBtn').addEventListener('click', deleteCard);
  document.getElementById('resetStatsBtn').addEventListener('click', resetCardStats);

  // Export / Import
  document.getElementById('exportBtn').addEventListener('click', exportCards);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', importCards);

  // Nouveaux boutons de maintenance
  document.getElementById('repairBtn').addEventListener('click', repairData);
  document.getElementById('recompressBtn').addEventListener('click', forceCleanup);

  // Mode quiz
  document.getElementById('verifyBtn').addEventListener('click', verifyAnswer);
  document.getElementById('saveNoteBtn').addEventListener('click', saveNoteFromQuiz);
  document.getElementById('cardErrorCheckbox').addEventListener('change', autoSaveErrorCheckbox);
  document.getElementById('nextCardBtn').addEventListener('click', () => {
    nextQuizCard();
  });
  
  document.addEventListener('keydown', function(e) {
    const quizCard = document.getElementById('quizCard');
    const quizModeEl = document.getElementById('quizMode');
    
    if (!quizModeEl.classList.contains('active')) return;
    if (!quizCard || quizCard.style.display === 'none') return;
    
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      if (!quizAnswered) {
        verifyAnswer();
      } else {
        nextQuizCard();
      }
    }
  });
  document.getElementById('prevCardBtn').addEventListener('click', prevQuizCard);
  document.getElementById('restartQuizBtn').addEventListener('click', startQuiz);
  document.getElementById('viewHistoryBtn').addEventListener('click', showHistoryModal);
  document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
  
  document.getElementById('viewSessionStatsBtn').addEventListener('click', showSessionStatsModal);
  document.getElementById('closeSessionStatsBtn').addEventListener('click', closeSessionStatsModal);

  // Sélecteurs de mode quiz
  document.querySelectorAll('.quiz-mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.quiz-mode-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      quizMode = e.target.dataset.mode;
      startQuiz();
    });
  });
}

// ==================== MODE SWITCHING ====================
function switchMode(mode) {
  const editMode = document.getElementById('editMode');
  const quizModeEl = document.getElementById('quizMode');
  const editBtn = document.getElementById('editModeBtn');
  const quizBtn = document.getElementById('quizModeBtn');

  if (mode === 'edit') {
    editMode.classList.add('active');
    quizModeEl.classList.remove('active');
    editBtn.classList.add('active');
    quizBtn.classList.remove('active');
  } else {
    editMode.classList.remove('active');
    quizModeEl.classList.add('active');
    editBtn.classList.remove('active');
    quizBtn.classList.add('active');
    startQuiz();
  }
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== CONFIRMATION MODAL ====================
function showConfirm(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    
    modal.style.display = 'flex';
    
    const handleYes = () => {
      modal.style.display = 'none';
      cleanup();
      resolve(true);
    };
    
    const handleNo = () => {
      modal.style.display = 'none';
      cleanup();
      resolve(false);
    };
    
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');
    
    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleNo();
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    function cleanup() {
      yesBtn.removeEventListener('click', handleYes);
      noBtn.removeEventListener('click', handleNo);
      document.removeEventListener('keydown', handleEscape);
    }
  });
}

// ==================== CARDS MANAGEMENT ====================
async function createNewCard() {
  const newCard = {
    id: Date.now(),
    artist: '',
    title: '',
    date: '',
    image: null,
    note: '',
    hasError: false,
    order: cards.length,
    toWork: false,
    lastPlayed: null,
    stats: {
      played: 0,
      correct: 0,
      wrong: 0,
      successRate: 0,
      artistCorrect: 0,
      titleCorrect: 0,
      dateCorrect: 0
    }
  };
  cards.push(newCard);
  renderCardsList();
  selectCard(newCard.id);
  showToast('Nouvelle carte créée', 'success');
  await saveToDatabase();
}

function selectCard(cardId) {
  currentEditId = cardId;
  const card = cards.find(c => c.id === cardId);
  if (!card) return;

  if (!card.stats) {
    card.stats = { played: 0, correct: 0, wrong: 0, successRate: 0, artistCorrect: 0, titleCorrect: 0, dateCorrect: 0 };
  }
  if (!card.stats.artistCorrect) card.stats.artistCorrect = 0;
  if (!card.stats.titleCorrect) card.stats.titleCorrect = 0;
  if (!card.stats.dateCorrect) card.stats.dateCorrect = 0;
  if (card.lastPlayed === undefined) card.lastPlayed = null;
  
  if (card.toWork === undefined) {
    card.toWork = false;
  }

  document.querySelectorAll('.card-item').forEach(item => {
    item.classList.toggle('active', parseInt(item.dataset.cardId) === cardId);
  });

  document.querySelector('.editor-content .empty-state')?.remove();
  const editor = document.getElementById('cardEditor');
  editor.style.display = 'block';

  document.getElementById('cardArtist').value = card.artist || '';
  document.getElementById('cardTitle').value = card.title || '';
  document.getElementById('cardDate').value = card.date || '';
  document.getElementById('cardNote').value = card.note || '';
  document.getElementById('cardHasError').checked = card.hasError || false;

  const preview = document.getElementById('imagePreview');
  if (card.image) {
    preview.innerHTML = `<img src="${card.image}" alt="Aperçu">`;
  } else {
    preview.innerHTML = '';
  }

  // Afficher le score de maîtrise
  const masteryScore = MasteryCalculator.calculateMastery(card);
  const masteryLevel = MasteryCalculator.getMasteryLevel(masteryScore);
  
  const masteryBadge = document.getElementById('masteryBadge');
  masteryBadge.innerHTML = `
    <span style="color: ${masteryLevel.color}; font-size: 24px;">${masteryLevel.icon}</span>
    <span style="font-weight: 700; font-size: 20px; color: ${masteryLevel.color};">${masteryScore}%</span>
    <span style="font-size: 12px; color: var(--anthracite);">${masteryLevel.label}</span>
  `;

  document.getElementById('statPlayed').textContent = card.stats.played;
  document.getElementById('statCorrect').textContent = card.stats.correct;
  document.getElementById('statWrong').textContent = card.stats.wrong;
  document.getElementById('statRate').textContent = card.stats.successRate + '%';
  
  const artistRate = card.stats.played > 0 ? Math.round((card.stats.artistCorrect / card.stats.played) * 100) : 0;
  const titleRate = card.stats.played > 0 ? Math.round((card.stats.titleCorrect / card.stats.played) * 100) : 0;
  const dateRate = card.stats.played > 0 ? Math.round((card.stats.dateCorrect / card.stats.played) * 100) : 0;
  
  document.getElementById('statArtistRate').textContent = artistRate + '%';
  document.getElementById('statTitleRate').textContent = titleRate + '%';
  document.getElementById('statDateRate').textContent = dateRate + '%';
  
  // Afficher la dernière révision
  if (card.lastPlayed) {
    const lastPlayedDate = new Date(card.lastPlayed);
    const daysSince = Math.floor((Date.now() - card.lastPlayed) / (1000 * 60 * 60 * 24));
    const lastPlayedText = daysSince === 0 ? "Aujourd'hui" : 
                          daysSince === 1 ? "Hier" : 
                          `Il y a ${daysSince} jours`;
    document.getElementById('lastPlayed').textContent = lastPlayedText;
  } else {
    document.getElementById('lastPlayed').textContent = 'Jamais';
  }
}

async function saveCard() {
  const card = cards.find(c => c.id === currentEditId);
  if (!card) return;

  const artist = document.getElementById('cardArtist').value.trim();
  const title = document.getElementById('cardTitle').value.trim();
  const date = document.getElementById('cardDate').value.trim();
  const note = document.getElementById('cardNote').value.trim();
  const hasError = document.getElementById('cardHasError').checked;

  if (!artist || !title || !date) {
    showToast('Veuillez remplir tous les champs obligatoires', 'error');
    return;
  }

  if (!card.image) {
    showToast('Veuillez ajouter une image', 'error');
    return;
  }

  card.artist = artist;
  card.title = title;
  card.date = date;
  card.note = note;
  card.hasError = hasError;

  renderCardsList();
  await saveToDatabase();
  await checkAchievements();
  showToast('Carte enregistrée !', 'success');
  updateGlobalStats();
}

function deleteCard() {
  if (!currentEditId) return;
  
  showConfirm(
    'Supprimer la carte ?',
    'Voulez-vous vraiment supprimer cette carte ? Cette action est irréversible.'
  ).then(confirmed => {
    if (!confirmed) return;

    cards = cards.filter(c => c.id !== currentEditId);
    currentEditId = null;
    
    document.getElementById('cardEditor').style.display = 'none';
    const editorContent = document.querySelector('.editor-content');
    if (!document.querySelector('.empty-state')) {
      editorContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎨</div>
          <h3>Aucune carte sélectionnée</h3>
          <p>Sélectionnez une carte ou créez-en une nouvelle</p>
        </div>
      `;
    }

    renderCardsList();
    await saveToDatabase();
    showToast('Carte supprimée', 'info');
  });
}

function resetCardStats() {
  if (!currentEditId) return;
  
  showConfirm(
    'Réinitialiser les statistiques ?',
    'Voulez-vous remettre à zéro toutes les statistiques de cette carte ?'
  ).then(confirmed => {
    if (!confirmed) return;

    const card = cards.find(c => c.id === currentEditId);
    if (!card) return;

    card.stats = { played: 0, correct: 0, wrong: 0, successRate: 0, artistCorrect: 0, titleCorrect: 0, dateCorrect: 0 };
    card.lastPlayed = null;
    
    document.getElementById('statPlayed').textContent = '0';
    document.getElementById('statCorrect').textContent = '0';
    document.getElementById('statWrong').textContent = '0';
    document.getElementById('statRate').textContent = '0%';
    document.getElementById('statArtistRate').textContent = '0%';
    document.getElementById('statTitleRate').textContent = '0%';
    document.getElementById('statDateRate').textContent = '0%';
    document.getElementById('lastPlayed').textContent = 'Jamais';
    
    // Recalculer le badge de maîtrise
    const masteryBadge = document.getElementById('masteryBadge');
    masteryBadge.innerHTML = `
      <span style="color: #9CA3AF; font-size: 24px;">📝</span>
      <span style="font-weight: 700; font-size: 20px; color: #9CA3AF;">0%</span>
      <span style="font-size: 12px; color: var(--anthracite);">Non révisée</span>
    `;

    await saveToDatabase();
    showToast('Statistiques réinitialisées', 'success');
  });
}

function cancelEdit() {
  if (currentEditId) {
    const card = cards.find(c => c.id === currentEditId);
    if (card && !card.artist && !card.title && !card.date) {
      cards = cards.filter(c => c.id !== currentEditId);
      renderCardsList();
      await saveToDatabase();
    }
  }
  
  currentEditId = null;
  document.getElementById('cardEditor').style.display = 'none';
  const editorContent = document.querySelector('.editor-content');
  if (!document.querySelector('.empty-state')) {
    editorContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎨</div>
        <h3>Aucune carte sélectionnée</h3>
        <p>Sélectionnez une carte ou créez-en une nouvelle</p>
      </div>
    `;
  }
}

async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const card = cards.find(c => c.id === currentEditId);
    if (card) {
      card.image = event.target.result;
      document.getElementById('imagePreview').innerHTML = 
        `<img src="${event.target.result}" alt="Aperçu">`;
      await saveToDatabase();
    }
  };
  reader.readAsDataURL(file);
}

function sortCards(sortType) {
  switch(sortType) {
    case 'date-asc':
      cards.sort((a, b) => {
        const dateA = parseInt(a.date) || 0;
        const dateB = parseInt(b.date) || 0;
        return dateA - dateB;
      });
      break;
    case 'date-desc':
      cards.sort((a, b) => {
        const dateA = parseInt(a.date) || 0;
        const dateB = parseInt(b.date) || 0;
        return dateB - dateA;
      });
      break;
    case 'artist':
      cards.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
      break;
    case 'mastery':
      // Tri par score de maîtrise (du plus faible au plus élevé)
      cards.sort((a, b) => {
        const scoreA = MasteryCalculator.calculateMastery(a);
        const scoreB = MasteryCalculator.calculateMastery(b);
        return scoreA - scoreB;
      });
      break;
    case 'order':
    default:
      cards.sort((a, b) => a.order - b.order);
      break;
  }
}

function renderCardsList() {
  const container = document.getElementById('cardsList');
  
  if (cards.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <p style="text-align: center; color: #6b7280;">Aucune carte pour le moment</p>
      </div>
    `;
    updateGlobalStats();
    return;
  }

  container.innerHTML = cards.map(card => {
    const displayTitle = card.title || 'Sans titre';
    const displayArtist = card.artist || 'Artiste inconnu';
    const displayDate = card.date || '?';
    const thumbnail = card.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60"%3E%3Crect fill="%23e5e7eb" width="60" height="60"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="24"%3E🎨%3C/text%3E%3C/svg%3E';
    const errorBadge = card.hasError ? '<span class="error-badge" title="Erreur signalée">⚠️</span>' : '';
    
    // Calculer le score de maîtrise
    const masteryScore = MasteryCalculator.calculateMastery(card);
    const masteryLevel = MasteryCalculator.getMasteryLevel(masteryScore);
    
    const masteryBadge = `<span class="mastery-badge-corner" style="background: ${masteryLevel.color};" title="${masteryLevel.label}: ${masteryScore}%">${masteryLevel.icon}</span>`;

    return `
      <div class="card-item ${currentEditId === card.id ? 'active' : ''}" 
           data-card-id="${card.id}"
           onclick="selectCard(${card.id})">
        ${masteryBadge}
        <img src="${thumbnail}" alt="${displayTitle}" class="card-item-thumb">
        <div class="card-item-info">
          <div class="card-item-title">${escapeHtml(displayTitle)}</div>
          <div class="card-item-meta">${escapeHtml(displayArtist)} - ${escapeHtml(displayDate)}</div>
          <div class="card-item-mastery" style="color: ${masteryLevel.color}; font-size: 11px; font-weight: 600; margin-top: 3px;">${masteryScore}% • ${masteryLevel.label}</div>
        </div>
        ${errorBadge}
      </div>
    `;
  }).join('');
  
  updateGlobalStats();
}

function updateGlobalStats() {
  const totalCards = cards.length;
  const cardsToReview = MasteryCalculator.getCardsToReview(cards).length;
  
  let totalPlayed = 0;
  let totalCorrect = 0;
  
  cards.forEach(card => {
    if (card.stats) {
      totalPlayed += card.stats.played;
      totalCorrect += card.stats.correct;
    }
  });
  
  const globalSuccessRate = totalPlayed > 0 ? Math.round((totalCorrect / totalPlayed) * 100) : 0;
  
  // Calculer le score de maîtrise moyen
  const avgMastery = cards.length > 0 
    ? Math.round(cards.reduce((sum, card) => sum + MasteryCalculator.calculateMastery(card), 0) / cards.length)
    : 0;
  
  document.getElementById('globalTotalCards').textContent = totalCards;
  document.getElementById('globalToReview').textContent = cardsToReview;
  document.getElementById('globalSuccessRate').textContent = globalSuccessRate + '%';
  document.getElementById('globalAvgMastery').textContent = avgMastery + '%';
  document.getElementById('globalTotalTime').textContent = formatTime(totalQuizTime);
}

// ==================== QUIZ MODE ====================
function updateTimerDisplay() {
  if (sessionStartTime === null) return;
  
  const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
  const timerDisplay = document.getElementById('timerDisplay');
  timerDisplay.textContent = `⏱️ ${formatTime(elapsed)}`;
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  
  return `${hh}:${mm}:${ss}`;
}

function startQuiz() {
  let availableCards = cards.filter(c => c.artist && c.title && c.date && c.image);
  
  if (quizMode === 'smart') {
    // Mode intelligent : sélectionner les cartes à réviser, triées par priorité
    availableCards = MasteryCalculator.sortByPriority(availableCards);
    
    // Prendre les 20 premières (ou moins si pas assez de cartes)
    availableCards = availableCards.slice(0, Math.min(20, availableCards.length));
    
    if (availableCards.length === 0) {
      showToast('🎉 Toutes vos cartes sont bien maîtrisées !', 'success');
      document.getElementById('quizEmpty').innerHTML = `
        <div class="empty-icon">🎉</div>
        <h3>Félicitations !</h3>
        <p>Toutes vos cartes sont bien maîtrisées</p>
        <p class="small" style="margin-top: 10px;">Continuez à réviser régulièrement pour maintenir votre niveau</p>
      `;
      document.getElementById('quizEmpty').style.display = 'block';
      document.getElementById('quizCard').style.display = 'none';
      document.getElementById('quizResult').style.display = 'none';
      return;
    }
    
    showToast(`📚 ${availableCards.length} carte(s) sélectionnée(s) pour révision`, 'info');
  } else if (quizMode === 'manual') {
    // Mode manuel : seulement les cartes marquées "à travailler"
    availableCards = availableCards.filter(c => c.toWork);
    if (availableCards.length === 0) {
      showToast('Aucune carte marquée "À travailler"', 'error');
      document.getElementById('quizEmpty').innerHTML = `
        <div class="empty-icon">📝</div>
        <h3>Aucune carte sélectionnée</h3>
        <p>Marquez des cartes "À travailler" en mode édition</p>
      `;
      document.getElementById('quizEmpty').style.display = 'block';
      document.getElementById('quizCard').style.display = 'none';
      document.getElementById('quizResult').style.display = 'none';
      return;
    }
  }
  
  if (availableCards.length === 0) {
    document.getElementById('quizEmpty').style.display = 'block';
    document.getElementById('quizCard').style.display = 'none';
    document.getElementById('quizResult').style.display = 'none';
    return;
  }

  quizCards = shuffleArray([...availableCards]);
  currentQuizIndex = 0;
  quizStats = { correct: 0, wrong: 0, artistPoints: 0, titlePoints: 0, datePoints: 0, totalPoints: 0, maxPoints: 0 };
  quizAnswered = false;
  currentSessionDetails = [];
  sessionStartTime = Date.now();
  window.currentAnswerStreak = 0; // Réinitialiser le streak pour les succès
  
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateTimerDisplay, 1000);
  
  document.getElementById('quizEmpty').style.display = 'none';
  document.getElementById('quizCard').style.display = 'block';
  document.getElementById('quizResult').style.display = 'none';
  
  showQuizCard();
}

function showQuizCard() {
  if (currentQuizIndex >= quizCards.length) {
    showQuizResults();
    return;
  }

  const card = quizCards[currentQuizIndex];
  
  document.getElementById('quizCardImage').src = card.image;
  
  const input = document.getElementById('quizInput');
  input.value = '';
  input.disabled = false;
  input.focus();
  
  document.getElementById('verifyBtn').disabled = false;
  document.getElementById('quizFeedback').style.display = 'none';
  
  quizAnswered = false;
  
  updateQuizProgress();
  
  document.getElementById('prevCardBtn').disabled = currentQuizIndex === 0;
  document.getElementById('nextCardBtn').disabled = false;
}

function verifyAnswer() {
  const input = document.getElementById('quizInput');
  const userAnswer = input.value.trim().toLowerCase();
  
  if (!userAnswer) {
    showToast('Veuillez entrer une réponse', 'error');
    return;
  }

  const card = quizCards[currentQuizIndex];
  const correctAnswer = `${card.artist} - ${card.title} - ${card.date}`;
  
  const artistMatch = userAnswer.includes(card.artist.toLowerCase());
  const titleMatch = userAnswer.includes(card.title.toLowerCase());
  const dateMatch = userAnswer.includes(card.date.toLowerCase());
  
  let points = 0;
  if (artistMatch) points++;
  if (titleMatch) points++;
  if (dateMatch) points++;
  
  const isCorrect = artistMatch && titleMatch && dateMatch;
  
  // Gestion du streak de réponses pour les succès
  if (isCorrect) {
    if (!window.currentAnswerStreak) window.currentAnswerStreak = 0;
    window.currentAnswerStreak++;
  } else {
    window.currentAnswerStreak = 0;
  }
  
  if (artistMatch) quizStats.artistPoints++;
  if (titleMatch) quizStats.titlePoints++;
  if (dateMatch) quizStats.datePoints++;
  quizStats.totalPoints += points;
  quizStats.maxPoints += 3;
  
  if (isCorrect) {
    quizStats.correct++;
  } else {
    quizStats.wrong++;
  }
  
  currentSessionDetails.push({
    cardId: card.id,
    artist: card.artist,
    title: card.title,
    date: card.date,
    userAnswer: input.value,
    artistMatch,
    titleMatch,
    dateMatch,
    points,
    isCorrect
  });

  if (!card.stats) {
    card.stats = { played: 0, correct: 0, wrong: 0, successRate: 0, artistCorrect: 0, titleCorrect: 0, dateCorrect: 0 };
  }
  if (!card.stats.artistCorrect) card.stats.artistCorrect = 0;
  if (!card.stats.titleCorrect) card.stats.titleCorrect = 0;
  if (!card.stats.dateCorrect) card.stats.dateCorrect = 0;
  
  card.stats.played++;
  card.lastPlayed = Date.now(); // Enregistrer la date de dernière révision
  
  if (isCorrect) {
    card.stats.correct++;
  } else {
    card.stats.wrong++;
  }
  
  if (artistMatch) card.stats.artistCorrect++;
  if (titleMatch) card.stats.titleCorrect++;
  if (dateMatch) card.stats.dateCorrect++;
  
  card.stats.successRate = Math.round((card.stats.correct / card.stats.played) * 100);
  
  await saveToDatabase();
  
  // Vérifier les succès de streak de réponses
  if (isCorrect && window.currentAnswerStreak >= 3) {
    const data = AchievementSystem.getProgressData();
    data.currentAnswerStreak = window.currentAnswerStreak;
    await AchievementSystem.check(data);
    updateAchievementBadge();
  }
  
  const feedback = document.getElementById('quizFeedback');
  feedback.style.display = 'block';
  feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'wrong'}`;
  
  document.querySelector('.feedback-icon').textContent = isCorrect ? '✅' : '❌';
  document.querySelector('.feedback-text').textContent = isCorrect ? 
    `Bravo ! Bonne réponse (${points}/3 points)` : `Pas tout à fait... (${points}/3 points)`;
  
  const correctAnswerEl = document.getElementById('correctAnswer');
  if (isCorrect) {
    correctAnswerEl.textContent = correctAnswer;
  } else {
    let displayAnswer = '';
    
    if (!artistMatch) {
      displayAnswer += `<strong style="color: var(--danger);">${card.artist}</strong> - `;
    } else {
      displayAnswer += `<strong style="color: var(--success);">✓ ${card.artist}</strong> - `;
    }
    
    if (!titleMatch) {
      displayAnswer += `<strong style="color: var(--danger);">${card.title}</strong> - `;
    } else {
      displayAnswer += `<strong style="color: var(--success);">✓ ${card.title}</strong> - `;
    }
    
    if (!dateMatch) {
      displayAnswer += `<strong style="color: var(--danger);">${card.date}</strong>`;
    } else {
      displayAnswer += `<strong style="color: var(--success);">✓ ${card.date}</strong>`;
    }
    
    correctAnswerEl.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong>Votre réponse :</strong> <span style="color: var(--anthracite);">${escapeHtml(input.value)}</span>
      </div>
      <div>
        <strong>Réponse correcte :</strong><br>${displayAnswer}
      </div>
    `;
  }
  
  const noteInput = document.getElementById('noteInput');
  noteInput.value = card.note || '';
  
  const cardErrorCheckbox = document.getElementById('cardErrorCheckbox');
  cardErrorCheckbox.checked = card.hasError || false;
  
  input.disabled = true;
  document.getElementById('verifyBtn').disabled = true;
  
  quizAnswered = true;
  
  updateQuizProgress();
}

function nextQuizCard() {
  if (currentQuizIndex < quizCards.length - 1) {
    currentQuizIndex++;
    quizAnswered = false;
    showQuizCard();
  } else {
    showQuizResults();
  }
}

async function saveNoteFromQuiz() {
  const card = quizCards[currentQuizIndex];
  const noteInput = document.getElementById('noteInput');
  const noteValue = noteInput.value.trim();
  const cardErrorCheckbox = document.getElementById('cardErrorCheckbox');
  const hasError = cardErrorCheckbox.checked;
  
  const originalCard = cards.find(c => c.id === card.id);
  if (originalCard) {
    originalCard.note = noteValue;
    originalCard.hasError = hasError;
    card.note = noteValue;
    card.hasError = hasError;
    await saveToDatabase();
    
    if (hasError) {
      showToast('📝 Note sauvegardée + Erreur signalée ⚠️', 'success');
    } else {
      showToast('📝 Note sauvegardée !', 'success');
    }
    
    renderCardsList();
  }
}

async function autoSaveErrorCheckbox() {
  const card = quizCards[currentQuizIndex];
  const cardErrorCheckbox = document.getElementById('cardErrorCheckbox');
  const hasError = cardErrorCheckbox.checked;
  
  const originalCard = cards.find(c => c.id === card.id);
  if (originalCard) {
    originalCard.hasError = hasError;
    card.hasError = hasError;
    await saveToDatabase();
    
    if (hasError) {
      showToast('⚠️ Erreur signalée automatiquement', 'info');
    } else {
      showToast('✅ Erreur retirée', 'info');
    }
    
    renderCardsList();
  }
}

function prevQuizCard() {
  if (currentQuizIndex > 0) {
    currentQuizIndex--;
    showQuizCard();
  }
}

function updateQuizProgress() {
  const progressText = document.getElementById('progressText');
  const progressFill = document.getElementById('progressFill');
  
  progressText.textContent = `${currentQuizIndex + 1} / ${quizCards.length}`;
  
  const percentage = ((currentQuizIndex + 1) / quizCards.length) * 100;
  progressFill.style.width = percentage + '%';
}

async function showQuizResults() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  document.getElementById('quizCard').style.display = 'none';
  document.getElementById('quizResult').style.display = 'block';
  
  const total = quizStats.correct + quizStats.wrong;
  const percentage = total > 0 ? Math.round((quizStats.correct / total) * 100) : 0;
  const pointsPercentage = quizStats.maxPoints > 0 ? Math.round((quizStats.totalPoints / quizStats.maxPoints) * 100) : 0;
  
  const sessionDuration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
  
  document.getElementById('correctCount').textContent = quizStats.correct;
  document.getElementById('wrongCount').textContent = quizStats.wrong;
  document.getElementById('scorePercent').textContent = percentage + '%';
  document.getElementById('pointsScore').textContent = `${quizStats.totalPoints}/${quizStats.maxPoints}`;
  document.getElementById('pointsPercent').textContent = pointsPercentage + '%';
  document.getElementById('sessionTime').textContent = formatTime(sessionDuration);
  
  totalQuizTime += sessionDuration;
  await DB.saveSetting("totalQuizTime", totalQuizTime);
  updateGlobalStats();
  
  const historyEntry = {
    date: new Date().toISOString(),
    mode: quizMode,
    total: total,
    correct: quizStats.correct,
    wrong: quizStats.wrong,
    percentage: percentage,
    artistPoints: quizStats.artistPoints,
    titlePoints: quizStats.titlePoints,
    datePoints: quizStats.datePoints,
    totalPoints: quizStats.totalPoints,
    maxPoints: quizStats.maxPoints,
    pointsPercentage: pointsPercentage,
    duration: sessionDuration
  };
  quizHistory.push(historyEntry);
  await DB.saveHistory(quizHistory);
  
  document.getElementById('nextCardBtn').disabled = true;
}

// ==================== SESSION STATS MODAL ====================
function showSessionStatsModal() {
  const modal = document.getElementById('sessionStatsModal');
  modal.style.display = 'flex';
  renderSessionStats();
}

function closeSessionStatsModal() {
  document.getElementById('sessionStatsModal').style.display = 'none';
}

function renderSessionStats() {
  const container = document.getElementById('sessionStatsList');
  
  if (quizHistory.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <p>Aucune session enregistrée</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = [...quizHistory].reverse().map((session, index) => {
    const date = new Date(session.date);
    const dateStr = date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let modeLabel = '📚 Toutes les cartes';
    if (session.mode === 'smart') modeLabel = '🧠 Révision intelligente';
    if (session.mode === 'manual') modeLabel = '⭐ À travailler';
    
    const duration = session.duration ? formatTime(session.duration) : 'N/A';
    const sessionIndex = quizHistory.length - 1 - index;
    
    const artistPercent = session.total > 0 ? Math.round((session.artistPoints / session.total) * 100) : 0;
    const titlePercent = session.total > 0 ? Math.round((session.titlePoints / session.total) * 100) : 0;
    const datePercent = session.total > 0 ? Math.round((session.datePoints / session.total) * 100) : 0;
    
    return `
      <div class="session-stats-item">
        <div class="session-header">
          <div>
            <div class="session-date">${dateStr}</div>
            <div class="session-mode">${modeLabel}</div>
          </div>
          <div class="session-header-right">
            <div class="session-score-badge">
              ${session.totalPoints}/${session.maxPoints} pts
            </div>
            <div class="session-time-badge">
              ⏱️ ${duration}
            </div>
            <button class="btn-icon-delete" onclick="deleteSession(${sessionIndex})" title="Supprimer cette session">
              🗑️
            </button>
          </div>
        </div>
        
        <div class="session-points-grid">
          <div class="session-point-box">
            <div class="session-point-icon">👤</div>
            <div class="session-point-label">Artiste</div>
            <div class="session-point-value">${session.artistPoints}/${session.total}</div>
            <div class="session-point-bar">
              <div class="session-point-fill" style="width: ${artistPercent}%"></div>
            </div>
          </div>
          
          <div class="session-point-box">
            <div class="session-point-icon">🎨</div>
            <div class="session-point-label">Titre</div>
            <div class="session-point-value">${session.titlePoints}/${session.total}</div>
            <div class="session-point-bar">
              <div class="session-point-fill" style="width: ${titlePercent}%"></div>
            </div>
          </div>
          
          <div class="session-point-box">
            <div class="session-point-icon">📅</div>
            <div class="session-point-label">Date</div>
            <div class="session-point-value">${session.datePoints}/${session.total}</div>
            <div class="session-point-bar">
              <div class="session-point-fill" style="width: ${datePercent}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==================== UTILS ====================
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== EXPORT / IMPORT ====================
async function exportCards() {
  if (cards.length === 0) {
    showToast('Aucune carte à exporter', 'error');
    return;
  }

  const data = {
    version: '2.0',
    exported: new Date().toISOString(),
    totalCards: cards.length,
    totalQuizTime: totalQuizTime,
    cards: cards
  };

  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  
  const date = new Date().toISOString().split('T')[0];
  link.download = `quizart-backup-${date}.json`;
  
  link.click();
  URL.revokeObjectURL(url);
  
  showToast(`✅ ${cards.length} carte(s) sauvegardée(s) !`, 'success');
}

function importCards(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      
      if (!imported.cards || !Array.isArray(imported.cards)) {
        showToast('❌ Fichier invalide', 'error');
        return;
      }

      // Normaliser les cartes importées
      imported.cards.forEach(card => {
        if (!card.stats) {
          card.stats = { played: 0, correct: 0, wrong: 0, successRate: 0, artistCorrect: 0, titleCorrect: 0, dateCorrect: 0 };
        }
        if (!card.stats.artistCorrect) card.stats.artistCorrect = 0;
        if (!card.stats.titleCorrect) card.stats.titleCorrect = 0;
        if (!card.stats.dateCorrect) card.stats.dateCorrect = 0;
        if (card.lastPlayed === undefined) card.lastPlayed = null;
        if (card.note === undefined) card.note = '';
        if (card.hasError === undefined) card.hasError = false;
        if (card.toWork === undefined) card.toWork = false;
      });

      if (imported.totalQuizTime !== undefined) {
        totalQuizTime = imported.totalQuizTime;
        await DB.saveSetting("totalQuizTime", totalQuizTime);
        updateGlobalStats();
      }

      // Si on a déjà des cartes, demander confirmation
      if (cards.length > 0) {
        showConfirm(
          'Remplacer ou ajouter ?',
          `Vous avez déjà ${cards.length} carte(s).\n\nCliquez "Oui" pour REMPLACER toutes vos cartes par les ${imported.cards.length} carte(s) du fichier.\n\nCliquez "Non" pour AJOUTER les cartes aux existantes.`
        ).then(replace => {
          if (replace) {
            cards = imported.cards;
            showToast(`✅ ${imported.cards.length} carte(s) restaurée(s) !`, 'success');
          } else {
            const newCards = imported.cards.map(card => ({
              ...card,
              id: Date.now() + Math.random(),
              order: cards.length + card.order
            }));
            cards = [...cards, ...newCards];
            showToast(`✅ ${newCards.length} carte(s) ajoutée(s) !`, 'success');
          }
          
          finalizeImport();
        });
      } else {
        // Pas de cartes existantes, importer directement
        cards = imported.cards;
        showToast(`✅ ${imported.cards.length} carte(s) restaurée(s) !`, 'success');
        finalizeImport();
      }
      
    } catch (err) {
      console.error(err);
      showToast('❌ Erreur : fichier corrompu', 'error');
    }
  };
  
  reader.readAsText(file);
  event.target.value = '';
}

function finalizeImport() {
  currentEditId = null;
  
  // Cacher l'éditeur
  const editor = document.getElementById('cardEditor');
  if (editor) {
    editor.style.display = 'none';
  }
  
  // Afficher l'état vide dans l'éditeur
  const editorContent = document.querySelector('.editor-content');
  if (editorContent && !document.querySelector('.empty-state')) {
    editorContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎨</div>
        <h3>Aucune carte sélectionnée</h3>
        <p>Sélectionnez une carte ou créez-en une nouvelle</p>
      </div>
    `;
  }
  
  // Rafraîchir la liste et sauvegarder
  renderCardsList();
  await saveToDatabase();
}

// ==================== HISTORY ====================
function showHistoryModal() {
  const modal = document.getElementById('historyModal');
  modal.style.display = 'flex';
  renderHistory();
}

function closeHistoryModal() {
  document.getElementById('historyModal').style.display = 'none';
}

function renderHistory() {
  const historyList = document.getElementById('historyList');
  const historyChart = document.getElementById('historyChart');
  const historyEmpty = document.querySelector('.history-empty');

  if (quizHistory.length === 0) {
    historyEmpty.style.display = 'block';
    historyChart.style.display = 'none';
    historyList.innerHTML = '';
    return;
  }

  historyEmpty.style.display = 'none';
  historyChart.style.display = 'block';

  drawProgressChart();

  historyList.innerHTML = [...quizHistory].reverse().map((entry, index) => {
    const date = new Date(entry.date);
    const dateStr = date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let modeLabel = '📚 Toutes les cartes';
    if (entry.mode === 'smart') modeLabel = '🧠 Révision intelligente';
    if (entry.mode === 'manual') modeLabel = '⭐ À travailler';
    
    const duration = entry.duration ? formatTime(entry.duration) : 'N/A';

    return `
      <div class="history-item">
        <div class="history-header">
          <span class="history-date">${dateStr}</span>
          <span class="history-mode">${modeLabel}</span>
        </div>
        <div class="history-stats">
          <div class="history-stat">
            <span class="history-stat-value">${entry.total}</span>
            <span class="history-stat-label">Questions</span>
          </div>
          <div class="history-stat">
            <span class="history-stat-value" style="color: var(--success)">${entry.correct}</span>
            <span class="history-stat-label">Réussies</span>
          </div>
          <div class="history-stat">
            <span class="history-stat-value" style="color: var(--gold)">${entry.percentage}%</span>
            <span class="history-stat-label">Score</span>
          </div>
          <div class="history-stat">
            <span class="history-stat-value" style="color: var(--burgundy)">⏱️ ${duration}</span>
            <span class="history-stat-label">Temps</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function drawProgressChart() {
  const canvas = document.getElementById('progressChart');
  const ctx = canvas.getContext('2d');
  
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = 300;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  ctx.clearRect(0, 0, width, height);

  if (quizHistory.length === 0) return;

  const data = quizHistory.slice(-10);
  const step = chartWidth / (data.length - 1 || 1);

  ctx.fillStyle = '#FAF7F2';
  ctx.fillRect(padding, padding, chartWidth, chartHeight);

  ctx.strokeStyle = '#E8DCC8';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + chartWidth, y);
    ctx.stroke();

    ctx.fillStyle = '#5A5A5A';
    ctx.font = '12px Georgia';
    ctx.textAlign = 'right';
    ctx.fillText((100 - i * 25) + '%', padding - 10, y + 4);
  }

  ctx.strokeStyle = '#7C1D1D';
  ctx.lineWidth = 3;
  ctx.beginPath();

  data.forEach((entry, index) => {
    const x = padding + step * index;
    const y = padding + chartHeight - (entry.percentage / 100) * chartHeight;
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  data.forEach((entry, index) => {
    const x = padding + step * index;
    const y = padding + chartHeight - (entry.percentage / 100) * chartHeight;
    
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#7C1D1D';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#5A5A5A';
    ctx.font = '11px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('#' + (quizHistory.length - data.length + index + 1), x, height - 15);
  });

  ctx.fillStyle = '#7C1D1D';
  ctx.font = 'bold 16px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('📈 Évolution de vos performances', width / 2, 25);
}

function clearHistory() {
  showConfirm(
    'Effacer l\'historique ?',
    'Voulez-vous vraiment supprimer tout l\'historique de vos quiz ? Cette action est irréversible.'
  ).then(confirmed => {
    if (!confirmed) return;
    
    quizHistory = [];
    await DB.saveHistory(quizHistory);
    renderHistory();
    showToast('Historique effacé', 'info');
  });
}

function deleteSession(sessionIndex) {
  showConfirm(
    'Supprimer cette session ?',
    'Voulez-vous vraiment supprimer cette session ? Cette action est irréversible.'
  ).then(confirmed => {
    if (!confirmed) return;
    
    const session = quizHistory[sessionIndex];
    if (session && session.duration) {
      totalQuizTime -= session.duration;
      if (totalQuizTime < 0) totalQuizTime = 0;
      await DB.saveSetting("totalQuizTime", totalQuizTime);
      updateGlobalStats();
    }
    
    quizHistory.splice(sessionIndex, 1);
    await DB.saveHistory(quizHistory);
    renderSessionStats();
    showToast('Session supprimée', 'info');
  });
}

// ==================== MAINTENANCE ====================
async function repairData() {
  cards = await DB.loadCards();
  
  renderCardsList();
  showToast('🔧 Données réparées !', 'success');
}

async function forceCleanup() {
  try {
    // Nettoyer toutes les anciennes clés
    DB.cleanupLocalStorage();
    await DB.saveCards(cards);
    await DB.saveHistory(quizHistory);
    await DB.saveSetting("totalQuizTime", totalQuizTime);
    showToast("🧹 Nettoyage effectué !", "success");
  } catch (error) {
    console.error("❌ Erreur:", error);
    showToast("❌ Erreur", "error");
  }
}

// OLD CODE BELOW
// const keysToRemove = [
      'flashcards',
      'quizHistory', 
      'totalQuizTime',
      'quizart_migrated'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Forcer la recompression des données actuelles
    if (cards.length > 0) {
      await DB.saveCards(cards);
    }
    if (quizHistory.length > 0) {
      await DB.saveHistory(quizHistory);
  await checkAchievements();
    }
    await DB.saveSetting("totalQuizTime", totalQuizTime);
    
    showToast('🧹 Nettoyage complet effectué !', 'success');
    console.log('✅ localStorage nettoyé et données recompressées');
  } catch (e) {
    console.error('❌ Erreur nettoyage:', e);
    showToast('❌ Erreur lors du nettoyage', 'error');
  }
}

// ==================== STORAGE ====================
async function saveToDatabase() {
  await DB.saveCards(cards);
}

// ==================== GLOBAL FUNCTIONS ====================
window.selectCard = selectCard;
window.closeHistoryModal = closeHistoryModal;
window.closeSessionStatsModal = closeSessionStatsModal;
window.deleteSession = deleteSession;
window.showAchievementsModal = showAchievementsModal;
window.closeAchievementsModal = closeAchievementsModal;
