// ==================== INDEXEDDB MANAGER ====================
// Système de stockage moderne avec IndexedDB + compression

const DB_NAME = 'QuizartDB';
const DB_VERSION = 1;

const STORES = {
  CARDS: 'cards',
  HISTORY: 'history',
  SETTINGS: 'settings'
};

class DatabaseManager {
  constructor() {
    this.db = null;
    this.ready = false;
    this.initPromise = null;
  }

  // Initialiser la base de données
  async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ Erreur ouverture IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.ready = true;
        console.log('✅ IndexedDB initialisée');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store des cartes
        if (!db.objectStoreNames.contains(STORES.CARDS)) {
          const cardsStore = db.createObjectStore(STORES.CARDS, { keyPath: 'id' });
          cardsStore.createIndex('artist', 'artist', { unique: false });
          cardsStore.createIndex('date', 'date', { unique: false });
          cardsStore.createIndex('order', 'order', { unique: false });
          console.log('✅ Store "cards" créé');
        }

        // Store de l'historique
        if (!db.objectStoreNames.contains(STORES.HISTORY)) {
          db.createObjectStore(STORES.HISTORY, { keyPath: 'date' });
          console.log('✅ Store "history" créé');
        }

        // Store des paramètres (key-value)
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
          console.log('✅ Store "settings" créé');
        }
      };
    });

    return this.initPromise;
  }

  // Obtenir une transaction
  getTransaction(storeNames, mode = 'readonly') {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.transaction(storeNames, mode);
  }

  // ==================== CARDS ====================
  
  async saveCards(cards) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(STORES.CARDS, 'readwrite');
      const store = transaction.objectStore(STORES.CARDS);
      
      // Vider le store avant de sauvegarder
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // Compresser et sauvegarder chaque carte
        let completed = 0;
        const total = cards.length;
        
        if (total === 0) {
          resolve();
          return;
        }
        
        cards.forEach(card => {
          // Compresser l'image si elle existe
          const cardToSave = { ...card };
          if (cardToSave.image) {
            cardToSave.imageCompressed = LZString.compressToUTF16(cardToSave.image);
            delete cardToSave.image; // Stocker uniquement la version compressée
          }
          
          const request = store.put(cardToSave);
          
          request.onsuccess = () => {
            completed++;
            if (completed === total) {
              console.log(`💾 ${total} cartes sauvegardées`);
              resolve();
            }
          };
          
          request.onerror = () => {
            console.error('❌ Erreur sauvegarde carte:', request.error);
            reject(request.error);
          };
        });
      };
      
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  async loadCards() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(STORES.CARDS);
      const store = transaction.objectStore(STORES.CARDS);
      const request = store.getAll();

      request.onsuccess = () => {
        const cards = request.result.map(card => {
          // Décompresser l'image
          if (card.imageCompressed) {
            card.image = LZString.decompressFromUTF16(card.imageCompressed);
            delete card.imageCompressed;
          }
          return card;
        });
        
        console.log(`📚 ${cards.length} cartes chargées`);
        resolve(cards);
      };

      request.onerror = () => {
        console.error('❌ Erreur chargement cartes:', request.error);
        reject(request.error);
      };
    });
  }

  async getCard(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(STORES.CARDS);
      const store = transaction.objectStore(STORES.CARDS);
      const request = store.get(id);

      request.onsuccess = () => {
        const card = request.result;
        if (card && card.imageCompressed) {
          card.image = LZString.decompressFromUTF16(card.imageCompressed);
          delete card.imageCompressed;
        }
        resolve(card);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async deleteCard(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(STORES.CARDS, 'readwrite');
      const store = transaction.objectStore(STORES.CARDS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearCards() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(STORES.CARDS, 'readwrite');
      const store = transaction.objectStore(STORES.CARDS);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🗑️ Toutes les cartes supprimées');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== HISTORY ====================
  
  async saveHistory(history) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(STORES.HISTORY, 'readwrite');
      const store = transaction.objectStore(STORES.HISTORY);
      
      // Vider le store
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        if (history.length === 0) {
          resolve();
          return;
        }
        
        let completed = 0;
        history.forEach(entry => {
          const request = store.put(entry);
          request.onsuccess = () => {
            completed++;
            if (completed === history.length) {
              console.log(`📊 ${history.length} sessions sauvegardées`);
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
      };
      
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  async loadHistory() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(STORES.HISTORY);
      const store = transaction.objectStore(STORES.HISTORY);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log(`📈 ${request.result.length} sessions chargées`);
        resolve(request.result);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearHistory() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(STORES.HISTORY, 'readwrite');
      const store = transaction.objectStore(STORES.HISTORY);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== SETTINGS ====================
  
  async saveSetting(key, value) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(STORES.SETTINGS, 'readwrite');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadSetting(key, defaultValue = null) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(STORES.SETTINGS);
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : defaultValue);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async deleteSetting(key) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(STORES.SETTINGS, 'readwrite');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== MIGRATION ====================
  
  async migrateFromLocalStorage() {
    console.log('🔄 Début migration depuis localStorage...');
    
    try {
      // Charger les anciennes données
      let cards = [];
      let history = [];
      let totalTime = 0;
      
      // Essayer le nouveau format d'abord
      const compressedData = localStorage.getItem('quizart_data_v2');
      if (compressedData) {
        console.log('📦 Détection format v2.0 compressé');
        const json = LZString.decompressFromUTF16(compressedData);
        const data = JSON.parse(json);
        cards = data.cards || [];
      } else {
        // Sinon, essayer l'ancien format
        const oldData = localStorage.getItem('flashcards');
        if (oldData) {
          console.log('📦 Détection ancien format v1.0');
          cards = JSON.parse(oldData);
        }
      }
      
      // Historique
      const compressedHistory = localStorage.getItem('quizart_history_v2');
      if (compressedHistory) {
        const json = LZString.decompressFromUTF16(compressedHistory);
        history = JSON.parse(json);
      } else {
        const oldHistory = localStorage.getItem('quizHistory');
        if (oldHistory) {
          history = JSON.parse(oldHistory);
        }
      }
      
      // Temps total
      totalTime = parseInt(localStorage.getItem('quizart_time_v2') || localStorage.getItem('totalQuizTime') || '0');
      
      // Normaliser les cartes
      cards.forEach(card => {
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
      
      console.log(`📊 Migration: ${cards.length} cartes, ${history.length} sessions, ${totalTime}s de quiz`);
      
      // Sauvegarder dans IndexedDB
      await this.saveCards(cards);
      await this.saveHistory(history);
      await this.saveSetting('totalQuizTime', totalTime);
      await this.saveSetting('migrated', true);
      await this.saveSetting('migrationDate', new Date().toISOString());
      
      // Nettoyer le localStorage
      this.cleanupLocalStorage();
      
      console.log('✅ Migration terminée avec succès !');
      return { cards, history, totalTime };
      
    } catch (error) {
      console.error('❌ Erreur migration:', error);
      throw error;
    }
  }

  cleanupLocalStorage() {
    const keysToRemove = [
      'flashcards',
      'quizHistory',
      'totalQuizTime',
      'quizart_data_v2',
      'quizart_history_v2',
      'quizart_time_v2',
      'quizart_migrated'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('🧹 localStorage nettoyé');
  }

  // ==================== UTILITAIRES ====================
  
  async getDatabaseSize() {
    await this.init();
    
    const cards = await this.loadCards();
    const history = await this.loadHistory();
    
    const cardsSize = JSON.stringify(cards).length;
    const historySize = JSON.stringify(history).length;
    
    return {
      cards: cardsSize,
      history: historySize,
      total: cardsSize + historySize,
      cardsCount: cards.length,
      historyCount: history.length
    };
  }

  async exportAll() {
    await this.init();
    
    const cards = await this.loadCards();
    const history = await this.loadHistory();
    const totalQuizTime = await this.loadSetting('totalQuizTime', 0);
    
    return {
      version: '2.1',
      exported: new Date().toISOString(),
      totalCards: cards.length,
      totalQuizTime,
      cards,
      history
    };
  }

  async importAll(data) {
    await this.init();
    
    // Normaliser les données
    if (data.cards) {
      data.cards.forEach(card => {
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
    }
    
    await this.saveCards(data.cards || []);
    await this.saveHistory(data.history || []);
    await this.saveSetting('totalQuizTime', data.totalQuizTime || 0);
    
    console.log('✅ Import terminé');
  }

  async clearAll() {
    await this.init();
    
    await this.clearCards();
    await this.clearHistory();
    await this.saveSetting('totalQuizTime', 0);
    
    console.log('🗑️ Toutes les données effacées');
  }
}

// Instance globale
const DB = new DatabaseManager();
