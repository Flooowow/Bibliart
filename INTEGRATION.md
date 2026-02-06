# 🏆 SYSTÈME DE SUCCÈS - GUIDE D'INTÉGRATION

## 📦 Fichiers à Ajouter

```
achievements.js         → Définitions et logique des succès
achievements-ui.js      → Interface et affichage
achievements.css        → Styles complets
achievements.html       → HTML du modal (à intégrer)
```

## 🔧 Intégration Étape par Étape

### 1. Ajouter les fichiers dans index.html

**AVANT la fermeture du `</head>` :**
```html
<link rel="stylesheet" href="achievements.css">
```

**APRÈS `<script src="script.js"></script>` :**
```html
<script src="achievements.js"></script>
<script src="achievements-ui.js"></script>
```

### 2. Ajouter le HTML du modal

**AVANT la fermeture du `</body>` :**

Copier tout le contenu de `achievements.html` :
- Le badge dans le header
- La modal complète

**OU** placer le badge dans le header existant à côté des stats.

### 3. Modifier script.js

#### A. Dans l'initialisation (DOMContentLoaded)

**AJOUTER après** `updateGlobalStats()` :
```javascript
// Initialiser les succès
await initAchievements();
```

#### B. Après chaque action importante

**Après la création d'une carte** (fonction `saveCard`) :
```javascript
await saveToDatabase();
await checkAchievements(); // AJOUTER
```

**Après la fin d'un quiz** (fonction `showQuizResults`) :
```javascript
await DB.saveHistory(quizHistory);
await checkAchievements(); // AJOUTER
```

**Après chaque bonne réponse** (fonction `verifyAnswer`) :
```javascript
// Mettre à jour currentAnswerStreak
if (isCorrect) {
  if (!window.currentAnswerStreak) window.currentAnswerStreak = 0;
  window.currentAnswerStreak++;
  // Vérifier les succès de streak de réponses
  const data = AchievementSystem.getProgressData();
  data.currentAnswerStreak = window.currentAnswerStreak;
  await AchievementSystem.check(data);
  updateAchievementBadge();
} else {
  window.currentAnswerStreak = 0;
}
```

**Après chaque mauvaise réponse** :
```javascript
window.currentAnswerStreak = 0;
```

## 🎯 Points de Vérification

### Points où vérifier les succès :

1. **Création de carte** → `first_card`, `collector_10`, `library_50`, `museum_100`
2. **Fin de quiz** → `first_quiz`, `marathon_10`, `streak_3/7/15/30`, `time_1h/5h/10h`, `perfect_quiz`
3. **Bonne réponse** → `streak_3/6/12_answers`
4. **Modification de stats globales** → `visual_memory`, `historian`, `connoisseur`, `master_10`, `perfectionist`
5. **Transformation de carte** → `transformation`, `renaissance`

## 📊 Données Contextuelles

### Variables globales à ajouter

Au début de script.js, ajouter :
```javascript
// Streak de réponses (réinitialisé à chaque quiz)
window.currentAnswerStreak = 0;

// Stats de session pour speed run
window.sessionStartTime = null;
```

### Dans startQuiz()

**AJOUTER** :
```javascript
window.currentAnswerStreak = 0;
window.sessionStartTime = Date.now();
```

## 🎨 Personnalisation du Badge dans le Header

### Option A : Dans la sidebar (recommandé)

Placer le badge après les stats globales :
```html
<div class="sidebar-stats">
  <!-- Stats existantes -->
  ...
</div>

<!-- Badge des succès -->
<div style="padding: 15px;">
  <div class="achievements-badge" id="achievementsBadge" onclick="showAchievementsModal()">
    <span class="achievements-badge-icon">🏆</span>
    <span class="achievements-badge-count">
      <span id="achievementsCount">0</span>/<span id="achievementsTotal">32</span>
    </span>
  </div>
</div>
```

### Option B : Dans le header principal

Placer à côté du logo QuizArt.

## 🧪 Tests

### Test 1 : Badge et Modal
```
1. Recharger la page
2. Voir le badge 🏆 0/32
3. Cliquer dessus
4. Modal s'ouvre avec tous les succès
```

### Test 2 : Déverrouillage
```
1. Créer une première carte
2. Pop-up "Premier Pas" apparaît
3. Badge passe à 1/32
4. Ouvrir la modal → "Premier Pas" débloqué
```

### Test 3 : Quiz
```
1. Faire un quiz complet
2. Pop-up "Première Révision"
3. Si 100% → Pop-up "Sans Faute"
4. Badge mis à jour
```

### Test 4 : Filtres
```
1. Ouvrir la modal
2. Cliquer sur "📚 Révision"
3. Seuls les succès de révision affichés
4. Cliquer sur "Tous" → tout réapparaît
```

## 🎭 Succès Spéciaux

### Streak de jours

Calculé automatiquement à partir de `quizHistory`.
Vérifie si l'utilisateur a fait au moins 1 quiz chaque jour.

### Speed Runner

Chronométré automatiquement si le quiz contient exactement 20 cartes.
Temps limite : 5 minutes (300 secondes).

### Succès Secrets

Les succès avec `secret: true` affichent leur contenu flouté tant qu'ils ne sont pas débloqués.
Exemple : "Renaissance"

## 🔮 Évolution Future

### Emplacements pour logos

Chaque carte de succès a un emplacement circulaire pour un futur logo/badge personnalisé.
Visible comme un cercle en pointillés quand verrouillé.

### Nouvelles catégories

Pour ajouter une catégorie :
```javascript
// Dans achievements.js
categories: {
  new_category: { name: 'Nouvelle Catégorie', icon: '🆕' }
}
```

### Nouveaux succès

Pour ajouter un succès :
```javascript
// Dans achievements.js → definitions
new_achievement_id: {
  id: 'new_achievement_id',
  name: 'Nom du Succès',
  description: 'Description',
  icon: '🎯',
  rarity: 'rare', // common, rare, epic, legendary
  category: 'performance',
  secret: false,
  check: (data) => data.someValue >= 10
}
```

## 📱 Responsive

Le système est entièrement responsive :
- Modal adaptée mobile
- Pop-ups ajustés à la largeur d'écran
- Grille adaptative
- Filtres scrollables horizontalement

## 🐛 Debug

### Console
```javascript
// Voir l'état actuel
console.log(AchievementSystem.state);

// Forcer un check
await checkAchievements();

// Réinitialiser (DEV ONLY)
AchievementSystem.state = { unlocked: [], unlockedAt: {}, progress: {} };
await AchievementSystem.save();
```

### IndexedDB
```
F12 → Application → IndexedDB → QuizartDB → settings
→ Voir la clé "achievements"
```

## ✨ Fonctionnalités Bonus

### Animation du badge

Le badge pulse légèrement pour attirer l'attention.

### Pop-up interactive

Cliquer sur un pop-up le ferme immédiatement.
Auto-fermeture après 5 secondes.

### Stats par rareté

En bas de la modal, voir combien de chaque rareté débloquée.

---

**Total de succès** : 32  
**Catégories** : 6  
**Raretés** : 4  
**Succès secrets** : 1 (Renaissance)

🎉 Prêt à gamifier QuizArt !
