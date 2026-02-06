// ==================== ACHIEVEMENTS SYSTEM ====================
// Système de succès gamifié pour QuizArt

const AchievementSystem = {
  // Définition de tous les succès
  definitions: {
    // 🎨 DÉCOUVERTE
    first_card: {
      id: 'first_card',
      name: 'Premier Pas',
      description: 'Créer votre première carte',
      icon: '🎨',
      rarity: 'common',
      category: 'discovery',
      secret: false,
      check: (data) => data.totalCards >= 1
    },
    collector_10: {
      id: 'collector_10',
      name: 'Collectionneur Débutant',
      description: 'Avoir 10 cartes',
      icon: '📚',
      rarity: 'common',
      category: 'discovery',
      secret: false,
      check: (data) => data.totalCards >= 10
    },
    library_50: {
      id: 'library_50',
      name: 'Bibliothèque',
      description: 'Avoir 50 cartes',
      icon: '📖',
      rarity: 'rare',
      category: 'discovery',
      secret: false,
      check: (data) => data.totalCards >= 50
    },
    museum_100: {
      id: 'museum_100',
      name: 'Musée Personnel',
      description: 'Avoir 100 cartes',
      icon: '🏛️',
      rarity: 'epic',
      category: 'discovery',
      secret: false,
      check: (data) => data.totalCards >= 100
    },

    // 📚 RÉVISION
    first_quiz: {
      id: 'first_quiz',
      name: 'Première Révision',
      description: 'Compléter votre premier quiz',
      icon: '✏️',
      rarity: 'common',
      category: 'revision',
      secret: false,
      check: (data) => data.totalSessions >= 1
    },
    marathon_10: {
      id: 'marathon_10',
      name: 'Marathon',
      description: 'Faire 10 quiz',
      icon: '🏃',
      rarity: 'common',
      category: 'revision',
      secret: false,
      check: (data) => data.totalSessions >= 10
    },
    streak_3: {
      id: 'streak_3',
      name: 'Assidu',
      description: 'Réviser 3 jours de suite',
      icon: '🔥',
      rarity: 'rare',
      category: 'revision',
      secret: false,
      check: (data) => data.currentStreak >= 3
    },
    streak_7: {
      id: 'streak_7',
      name: 'Dévoué',
      description: 'Réviser 7 jours de suite',
      icon: '⭐',
      rarity: 'rare',
      category: 'revision',
      secret: false,
      check: (data) => data.currentStreak >= 7
    },
    streak_15: {
      id: 'streak_15',
      name: 'Candidat CAPES',
      description: 'Réviser 15 jours de suite',
      icon: '🎓',
      rarity: 'epic',
      category: 'revision',
      secret: false,
      check: (data) => data.currentStreak >= 15
    },
    streak_30: {
      id: 'streak_30',
      name: "Professeur d'histoire de l'art",
      description: 'Réviser 30 jours de suite',
      icon: '👨‍🏫',
      rarity: 'legendary',
      category: 'revision',
      secret: false,
      check: (data) => data.currentStreak >= 30
    },
    time_1h: {
      id: 'time_1h',
      name: 'Marathonien',
      description: 'Passer 1h en mode quiz (cumulé)',
      icon: '⏱️',
      rarity: 'common',
      category: 'revision',
      secret: false,
      check: (data) => data.totalTime >= 3600
    },
    time_5h: {
      id: 'time_5h',
      name: 'Travailleur',
      description: 'Passer 5h en mode quiz (cumulé)',
      icon: '💼',
      rarity: 'rare',
      category: 'revision',
      secret: false,
      check: (data) => data.totalTime >= 18000
    },
    time_10h: {
      id: 'time_10h',
      name: 'Érudit',
      description: 'Passer 10h en mode quiz (cumulé)',
      icon: '📚',
      rarity: 'epic',
      category: 'revision',
      secret: false,
      check: (data) => data.totalTime >= 36000
    },

    // 🎯 PERFORMANCE
    perfect_quiz: {
      id: 'perfect_quiz',
      name: 'Sans Faute',
      description: 'Quiz parfait 100% de réussite',
      icon: '💯',
      rarity: 'rare',
      category: 'performance',
      secret: false,
      check: (data) => data.perfectQuiz === true
    },
    streak_3_answers: {
      id: 'streak_3_answers',
      name: 'Bonne lancée',
      description: '3 réponses correctes d\'affilée',
      icon: '🎯',
      rarity: 'common',
      category: 'performance',
      secret: false,
      check: (data) => data.currentAnswerStreak >= 3
    },
    streak_6_answers: {
      id: 'streak_6_answers',
      name: 'En Série',
      description: '6 réponses correctes d\'affilée',
      icon: '🔥',
      rarity: 'rare',
      category: 'performance',
      secret: false,
      check: (data) => data.currentAnswerStreak >= 6
    },
    streak_12_answers: {
      id: 'streak_12_answers',
      name: 'Expert',
      description: '12 réponses correctes d\'affilée',
      icon: '⚡',
      rarity: 'epic',
      category: 'performance',
      secret: false,
      check: (data) => data.currentAnswerStreak >= 12
    },
    master_10: {
      id: 'master_10',
      name: 'Maître',
      description: 'Avoir 10 cartes à 98% de maîtrise minimum',
      icon: '🏆',
      rarity: 'epic',
      category: 'performance',
      secret: false,
      check: (data) => data.mastered98Cards >= 10
    },
    perfectionist: {
      id: 'perfectionist',
      name: 'Perfectionniste',
      description: 'Toutes vos cartes au-dessus de 85%',
      icon: '💎',
      rarity: 'legendary',
      category: 'performance',
      secret: false,
      check: (data) => data.allAbove85 === true
    },

    // 🧠 SPÉCIALISATION
    visual_memory: {
      id: 'visual_memory',
      name: 'Mémoire Visuelle',
      description: '90% de réussite sur les titres',
      icon: '🖼️',
      rarity: 'rare',
      category: 'specialization',
      secret: false,
      check: (data) => data.titleSuccessRate >= 90
    },
    historian: {
      id: 'historian',
      name: 'Historien',
      description: '90% de réussite sur les dates',
      icon: '📅',
      rarity: 'rare',
      category: 'specialization',
      secret: false,
      check: (data) => data.dateSuccessRate >= 90
    },
    connoisseur: {
      id: 'connoisseur',
      name: 'Connaisseur',
      description: '90% de réussite sur les artistes',
      icon: '👨‍🎨',
      rarity: 'rare',
      category: 'specialization',
      secret: false,
      check: (data) => data.artistSuccessRate >= 90
    },

    // 🏅 DÉFIS
    speed_runner: {
      id: 'speed_runner',
      name: 'Speed Runner',
      description: 'Compléter un quiz de 20 cartes en moins de 5min',
      icon: '⚡',
      rarity: 'epic',
      category: 'challenge',
      secret: false,
      check: (data) => data.speedRun === true
    },
    night_owl: {
      id: 'night_owl',
      name: 'Nuit Blanche',
      description: 'Réviser après minuit',
      icon: '🌙',
      rarity: 'rare',
      category: 'challenge',
      secret: false,
      check: (data) => data.nightSession === true
    },
    early_bird: {
      id: 'early_bird',
      name: 'Lève-Tôt',
      description: 'Réviser avant 7h du matin',
      icon: '🌅',
      rarity: 'rare',
      category: 'challenge',
      secret: false,
      check: (data) => data.earlySession === true
    },
    renaissance: {
      id: 'renaissance',
      name: 'Renaissance',
      description: 'Réviser une carte abandonnée depuis 30 jours',
      icon: '🔄',
      rarity: 'epic',
      category: 'challenge',
      secret: true,
      check: (data) => data.revivedCard === true
    },

    // 📈 PROGRESSION
    progress_10: {
      id: 'progress_10',
      name: 'En Progrès',
      description: 'Augmenter son taux global de 10%',
      icon: '📈',
      rarity: 'rare',
      category: 'progression',
      secret: false,
      check: (data) => data.globalImprovement >= 10
    },
    transformation: {
      id: 'transformation',
      name: 'Transformation',
      description: 'Passer une carte de 0% à 85%+',
      icon: '✨',
      rarity: 'epic',
      category: 'progression',
      secret: false,
      check: (data) => data.cardTransformation === true
    },
    model_student: {
      id: 'model_student',
      name: 'Élève Modèle',
      description: '5 sessions avec +80% de réussite',
      icon: '🌟',
      rarity: 'rare',
      category: 'progression',
      secret: false,
      check: (data) => data.goodSessions >= 5
    }
  },

  // Niveaux de rareté
  rarities: {
    common: { name: 'Commun', color: '#9CA3AF', icon: '⚪' },
    rare: { name: 'Rare', color: '#3B82F6', icon: '🔵' },
    epic: { name: 'Épique', color: '#A855F7', icon: '🟣' },
    legendary: { name: 'Légendaire', color: '#F59E0B', icon: '🟡' }
  },

  // Catégories
  categories: {
    discovery: { name: 'Découverte', icon: '🎨' },
    revision: { name: 'Révision', icon: '📚' },
    performance: { name: 'Performance', icon: '🎯' },
    specialization: { name: 'Spécialisation', icon: '🧠' },
    challenge: { name: 'Défis', icon: '🏅' },
    progression: { name: 'Progression', icon: '📈' }
  },

  // État des succès
  state: {
    unlocked: [],
    unlockedAt: {},
    progress: {}
  },

  // Initialiser le système
  async init() {
    try {
      const saved = await DB.loadSetting('achievements', null);
      if (saved) {
        this.state = saved;
      }
    } catch (error) {
      console.error('❌ Erreur chargement succès:', error);
    }
  },

  // Sauvegarder l'état
  async save() {
    try {
      await DB.saveSetting('achievements', this.state);
    } catch (error) {
      console.error('❌ Erreur sauvegarde succès:', error);
    }
  },

  // Vérifier les succès
  async check(data) {
    const newlyUnlocked = [];

    for (const [id, achievement] of Object.entries(this.definitions)) {
      // Déjà débloqué ?
      if (this.state.unlocked.includes(id)) continue;

      // Vérifier la condition
      if (achievement.check(data)) {
        this.state.unlocked.push(id);
        this.state.unlockedAt[id] = Date.now();
        newlyUnlocked.push(achievement);
      }
    }

    if (newlyUnlocked.length > 0) {
      await this.save();
      
      // Afficher les pop-ups
      for (const achievement of newlyUnlocked) {
        this.showUnlockPopup(achievement);
      }
    }

    return newlyUnlocked;
  },

  // Afficher le pop-up de déverrouillage
  showUnlockPopup(achievement) {
    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    
    const rarity = this.rarities[achievement.rarity];
    
    popup.innerHTML = `
      <div class="achievement-popup-content" style="border-color: ${rarity.color};">
        <div class="achievement-popup-header">
          <span class="achievement-popup-rarity" style="color: ${rarity.color};">
            ${rarity.icon} ${rarity.name}
          </span>
          <span class="achievement-popup-category">
            ${this.categories[achievement.category].icon} ${this.categories[achievement.category].name}
          </span>
        </div>
        <div class="achievement-popup-icon">${achievement.icon}</div>
        <div class="achievement-popup-title">${achievement.name}</div>
        <div class="achievement-popup-description">${achievement.description}</div>
        <div class="achievement-popup-unlocked">🎉 Succès débloqué !</div>
      </div>
    `;

    document.body.appendChild(popup);

    // Animation d'entrée
    setTimeout(() => popup.classList.add('show'), 100);

    // Auto-fermeture après 5s
    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 500);
    }, 5000);

    // Fermeture au clic
    popup.addEventListener('click', () => {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 500);
    });
  },

  // Obtenir les données de progression
  getProgressData() {
    const data = {
      totalCards: cards.length,
      totalSessions: quizHistory.length,
      totalTime: totalQuizTime,
      currentStreak: this.calculateStreak(),
      perfectQuiz: false,
      currentAnswerStreak: 0,
      mastered98Cards: cards.filter(c => MasteryCalculator.calculateMastery(c) >= 98).length,
      allAbove85: cards.length > 0 && cards.every(c => MasteryCalculator.calculateMastery(c) >= 85),
      titleSuccessRate: this.getComponentSuccessRate('title'),
      dateSuccessRate: this.getComponentSuccessRate('date'),
      artistSuccessRate: this.getComponentSuccessRate('artist'),
      speedRun: false,
      nightSession: false,
      earlySession: false,
      revivedCard: false,
      globalImprovement: 0,
      cardTransformation: false,
      goodSessions: quizHistory.filter(s => s.successRate >= 80).length
    };

    return data;
  },

  // Calculer la série de jours
  calculateStreak() {
    if (quizHistory.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = quizHistory.map(s => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }).sort((a, b) => b - a);

    const uniqueDates = [...new Set(dates)];

    let streak = 0;
    let checkDate = today.getTime();

    for (const date of uniqueDates) {
      if (date === checkDate) {
        streak++;
        checkDate -= 86400000; // -1 jour
      } else if (date === checkDate + 86400000) {
        // Pas encore joué aujourd'hui mais hier oui
        streak++;
        checkDate -= 86400000;
      } else {
        break;
      }
    }

    return streak;
  },

  // Taux de réussite par composant
  getComponentSuccessRate(component) {
    let total = 0;
    let correct = 0;

    for (const card of cards) {
      if (!card.stats || card.stats.played === 0) continue;
      total += card.stats.played;
      correct += card.stats[`${component}Correct`] || 0;
    }

    return total > 0 ? (correct / total) * 100 : 0;
  },

  // Obtenir le nombre total de succès
  getTotalCount() {
    return Object.keys(this.definitions).length;
  },

  // Obtenir le nombre de succès débloqués
  getUnlockedCount() {
    return this.state.unlocked.length;
  },

  // Obtenir tous les succès pour l'affichage
  getAllForDisplay() {
    return Object.values(this.definitions).map(achievement => {
      const unlocked = this.state.unlocked.includes(achievement.id);
      const unlockedAt = this.state.unlockedAt[achievement.id];
      
      return {
        ...achievement,
        unlocked,
        unlockedAt,
        rarity: this.rarities[achievement.rarity],
        categoryInfo: this.categories[achievement.category]
      };
    });
  }
};
