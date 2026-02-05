// ==================== DONNÉES ====================
let artists = [];
let currentArtistId = null;
let isEditMode = false;

// ==================== IndexedDB Setup ====================
const DB_NAME = 'BibliartDB';
const DB_VERSION = 1;
const STORE_NAME = 'artists';
let db = null;

// Initialiser IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      
      // Créer le store s'il n'existe pas
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Sauvegarder dans IndexedDB
async function saveToIndexedDB() {
  try {
    if (!db) await initDB();
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Supprimer toutes les anciennes données
    store.clear();
    
    // Ajouter tous les artistes
    for (const artist of artists) {
      store.add(artist);
    }
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('✅ Sauvegarde IndexedDB réussie');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('❌ Erreur sauvegarde IndexedDB:', error);
    showToast('❌ Erreur de sauvegarde', 'error');
    throw error;
  }
}

// Charger depuis IndexedDB
async function loadFromIndexedDB() {
  try {
    if (!db) await initDB();
    
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        artists = request.result || [];
        console.log(`✅ ${artists.length} artistes chargés depuis IndexedDB`);
        resolve(artists);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Erreur chargement IndexedDB:', error);
    artists = [];
    return artists;
  }
}

// Migrer depuis localStorage vers IndexedDB
async function migrateFromLocalStorage() {
  try {
    const saved = localStorage.getItem('bibliart-artists');
    if (!saved) return false;
    
    console.log('🔄 Migration localStorage → IndexedDB...');
    
    const oldArtists = JSON.parse(saved);
    artists = oldArtists;
    
    await saveToIndexedDB();
    
    // Supprimer de localStorage après migration réussie
    localStorage.removeItem('bibliart-artists');
    
    showToast('✅ Migration IndexedDB réussie ! Beaucoup plus d\'espace disponible.', 'success');
    console.log('✅ Migration terminée');
    return true;
  } catch (error) {
    console.error('❌ Erreur migration:', error);
    return false;
  }
}

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialiser la base de données
    await initDB();
    
    // Vérifier s'il y a des données dans localStorage à migrer
    const migrated = await migrateFromLocalStorage();
    
    // Charger les données depuis IndexedDB
    if (!migrated) {
      await loadFromIndexedDB();
    }
    
    setupEventListeners();
    renderArtistsList();
    checkStorageQuota();
    
    // Afficher l'état vide si aucun artiste
    if (artists.length === 0) {
      showEmptyState();
    }
  } catch (error) {
    console.error('❌ Erreur initialisation:', error);
    showToast('❌ Erreur de chargement', 'error');
  }
});

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Mode toggle
  document.getElementById('readModeBtn').addEventListener('click', () => switchMode('read'));
  document.getElementById('editModeBtn').addEventListener('click', () => switchMode('edit'));
  
  // Boutons d'ajout
  document.getElementById('addArtistBtn').addEventListener('click', createNewArtist);
  document.getElementById('createFirstArtist').addEventListener('click', createNewArtist);
  document.getElementById('addArtworkBtn').addEventListener('click', openArtworkModal);
  
  // Import/Export
  document.getElementById('importStatsBtn').addEventListener('click', openImportStatsModal);
  document.getElementById('repairDataBtn').addEventListener('click', repairAllData);
  document.getElementById('recompressBtn').addEventListener('click', recompressAllImages);
  document.getElementById('ultraCompressBtn').addEventListener('click', ultraCompressAllImages);
  document.getElementById('importBibliartBtn').addEventListener('click', openImportBibliartModal);
  document.getElementById('exportBtn').addEventListener('click', exportToFile);
  
  // Sauvegarde
  document.getElementById('saveBtn').addEventListener('click', saveCurrentArtist);
  
  // Suppression
  document.getElementById('deleteArtistBtn').addEventListener('click', deleteArtist);
  
  // Recherche et tri
  document.getElementById('searchInput').addEventListener('input', filterArtists);
  document.getElementById('sortSelect').addEventListener('change', sortArtists);
  
  // Upload d'images
  document.getElementById('editPortrait').addEventListener('change', handlePortraitUpload);
  document.getElementById('artworkImage').addEventListener('change', handleArtworkImageUpload);
  
  // Modal artwork
  document.getElementById('closeArtworkModal').addEventListener('click', closeArtworkModal);
  document.getElementById('saveArtworkBtn').addEventListener('click', saveArtwork);
  
  // Modal détails
  document.getElementById('closeDetailsModal').addEventListener('click', () => {
    document.getElementById('artworkDetailsModal').style.display = 'none';
  });
}

// ==================== MODE SWITCHING ====================
function switchMode(mode) {
  isEditMode = (mode === 'edit');
  
  const readBtn = document.getElementById('readModeBtn');
  const editBtn = document.getElementById('editModeBtn');
  const saveBtn = document.getElementById('saveBtn');
  const addArtistBtn = document.getElementById('addArtistBtn');
  const deleteArtistBtn = document.getElementById('deleteArtistBtn');
  const addArtworkBtn = document.getElementById('addArtworkBtn');
  
  if (isEditMode) {
    readBtn.classList.remove('active');
    editBtn.classList.add('active');
    saveBtn.style.display = 'block';
    addArtistBtn.style.display = 'block';
    if (currentArtistId) deleteArtistBtn.style.display = 'block';
    
    // Passer en mode édition
    if (currentArtistId) {
      showArtistEditor();
    }
  } else {
    readBtn.classList.add('active');
    editBtn.classList.remove('active');
    saveBtn.style.display = 'none';
    addArtistBtn.style.display = 'none';
    deleteArtistBtn.style.display = 'none';
    
    // Passer en mode lecture
    if (currentArtistId) {
      showArtistCard();
    }
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
    const overlay = modal.querySelector('.popup-overlay');
    
    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);
    overlay.addEventListener('click', handleNo);
    
    function cleanup() {
      yesBtn.removeEventListener('click', handleYes);
      noBtn.removeEventListener('click', handleNo);
      overlay.removeEventListener('click', handleNo);
    }
  });
}

// ==================== IMAGE COMPRESSION ====================
function compressImage(file, maxWidth = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Redimensionner si trop grande
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compresser en JPEG avec qualité réduite
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      
      img.onerror = reject;
      img.src = e.target.result;
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function checkStorageQuota() {
  try {
    // Pour IndexedDB, on vérifie l'API navigator.storage si disponible
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usedMB = estimate.usage / (1024 * 1024);
      const quotaMB = estimate.quota / (1024 * 1024);
      const percentUsed = (estimate.usage / estimate.quota) * 100;
      
      console.log(`📊 Stockage: ${usedMB.toFixed(1)}MB / ${quotaMB.toFixed(0)}MB (${percentUsed.toFixed(1)}%)`);
      
      if (percentUsed > 80) {
        showToast(`⚠️ Espace : ${usedMB.toFixed(1)}MB / ${quotaMB.toFixed(0)}MB utilisés`, 'info');
      }
      
      if (percentUsed > 95) {
        showToast('🚨 Espace presque plein ! Exportez vos données.', 'error');
      }
    }
  } catch (e) {
    console.log('ℹ️ API Storage non disponible');
  }
}

// ==================== ARTIST MANAGEMENT ====================
function createNewArtist() {
  const newArtist = {
    id: Date.now(),
    name: '',
    birthYear: null,
    deathYear: null,
    birthplace: '',
    style: '',
    bio: '',
    portrait: null,
    artworks: []
  };
  
  artists.push(newArtist);
  currentArtistId = newArtist.id;
  
  // Passer en mode édition automatiquement
  isEditMode = true;
  switchMode('edit');
  
  renderArtistsList();
  showArtistEditor();
  
  // Focus sur le champ nom
  document.getElementById('editName').focus();
  
  showToast('Nouvel artiste créé', 'success');
}

function selectArtist(artistId) {
  currentArtistId = artistId;
  
  // Mettre à jour la sélection dans la liste
  document.querySelectorAll('.artist-item').forEach(item => {
    item.classList.toggle('active', parseInt(item.dataset.artistId) === artistId);
  });
  
  // Afficher la fiche en mode lecture ou édition selon le mode actuel
  if (isEditMode) {
    showArtistEditor();
  } else {
    showArtistCard();
  }
  
  // Mettre à jour les boutons
  if (isEditMode) {
    document.getElementById('deleteArtistBtn').style.display = 'block';
    document.getElementById('addArtworkBtn').style.display = 'block';
  }
}

function showEmptyState() {
  document.getElementById('emptyState').style.display = 'flex';
  document.getElementById('artistCard').style.display = 'none';
  document.getElementById('artistEditor').style.display = 'none';
}

function showArtistCard() {
  const artist = artists.find(a => a.id === currentArtistId);
  if (!artist) return;
  
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('artistCard').style.display = 'block';
  document.getElementById('artistEditor').style.display = 'none';
  
  // Remplir les informations
  document.getElementById('artistName').textContent = artist.name || 'Nom de l\'artiste';
  
  // Dates
  const dates = [];
  if (artist.birthYear) dates.push(artist.birthYear);
  if (artist.deathYear) dates.push(artist.deathYear);
  document.getElementById('artistDates').textContent = dates.join(' - ') || 'Dates inconnues';
  
  // Lieu de naissance
  document.getElementById('artistBirthplace').textContent = artist.birthplace || 'Lieu inconnu';
  
  // Style
  const styleEl = document.getElementById('artistStyle');
  if (artist.style) {
    styleEl.textContent = artist.style;
    styleEl.style.display = 'inline-block';
  } else {
    styleEl.style.display = 'none';
  }
  
  // Portrait
  const portraitImg = document.getElementById('artistPortrait');
  const portraitPlaceholder = document.querySelector('.portrait-placeholder');
  
  if (artist.portrait) {
    portraitImg.src = artist.portrait;
    portraitImg.style.display = 'block';
    portraitPlaceholder.style.display = 'none';
  } else {
    portraitImg.style.display = 'none';
    portraitPlaceholder.style.display = 'flex';
  }
  
  // Biographie
  const bioEl = document.getElementById('artistBio');
  if (artist.bio) {
    bioEl.innerHTML = `<p>${artist.bio.replace(/\n/g, '</p><p>')}</p>`;
  } else {
    bioEl.innerHTML = '<p style="font-style: italic; opacity: 0.6;">Aucune biographie pour le moment...</p>';
  }
  
  // Œuvres
  renderArtworks(artist);
}

function showArtistEditor() {
  const artist = artists.find(a => a.id === currentArtistId);
  if (!artist) return;
  
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('artistCard').style.display = 'none';
  document.getElementById('artistEditor').style.display = 'block';
  
  // Remplir le formulaire
  document.getElementById('editName').value = artist.name || '';
  document.getElementById('editBirthYear').value = artist.birthYear || '';
  document.getElementById('editDeathYear').value = artist.deathYear || '';
  document.getElementById('editBirthplace').value = artist.birthplace || '';
  document.getElementById('editStyle').value = artist.style || '';
  document.getElementById('editBio').value = artist.bio || '';
  
  // Preview du portrait
  const preview = document.getElementById('editPortraitPreview');
  if (artist.portrait) {
    preview.innerHTML = `<img src="${artist.portrait}" alt="Portrait">`;
  } else {
    preview.innerHTML = '';
  }
}

function saveCurrentArtist() {
  const artist = artists.find(a => a.id === currentArtistId);
  if (!artist) return;
  
  const name = document.getElementById('editName').value.trim();
  
  if (!name) {
    showToast('Le nom est obligatoire', 'error');
    return;
  }
  
  artist.name = name;
  artist.birthYear = parseInt(document.getElementById('editBirthYear').value) || null;
  artist.deathYear = parseInt(document.getElementById('editDeathYear').value) || null;
  artist.birthplace = document.getElementById('editBirthplace').value.trim();
  artist.style = document.getElementById('editStyle').value.trim();
  artist.bio = document.getElementById('editBio').value.trim();
  
  saveToLocalStorage();
  renderArtistsList();
  showToast('✅ Artiste sauvegardé !', 'success');
  
  // Retourner en mode lecture
  switchMode('read');
}

async function deleteArtist() {
  if (!currentArtistId) return;
  
  const artist = artists.find(a => a.id === currentArtistId);
  const confirmed = await showConfirm(
    'Supprimer cet artiste ?',
    `Voulez-vous vraiment supprimer ${artist.name} ? Cette action est irréversible.`
  );
  
  if (!confirmed) return;
  
  artists = artists.filter(a => a.id !== currentArtistId);
  currentArtistId = null;
  
  saveToLocalStorage();
  renderArtistsList();
  showEmptyState();
  showToast('Artiste supprimé', 'info');
}

function handlePortraitUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    showToast('❌ Veuillez sélectionner une image', 'error');
    return;
  }

  showToast('⏳ Compression de l\'image...', 'info');

  compressImage(file, 600, 0.75)
    .then(compressedBase64 => {
      const artist = artists.find(a => a.id === currentArtistId);
      if (artist) {
        artist.portrait = compressedBase64;
        document.getElementById('editPortraitPreview').innerHTML = 
          `<img src="${compressedBase64}" alt="Portrait">`;
        saveToLocalStorage();
        renderArtistsList();
        showToast('✅ Image compressée', 'success');
        checkStorageQuota();
      }
    })
    .catch(error => {
      console.error('Erreur compression:', error);
      showToast('❌ Erreur lors de la compression', 'error');
    });
}

// ==================== ARTWORKS MANAGEMENT ====================
function openArtworkModal() {
  document.getElementById('artworkModal').style.display = 'flex';
  
  // Reset du formulaire
  document.getElementById('artworkImage').value = '';
  document.getElementById('artworkTitle').value = '';
  document.getElementById('artworkDate').value = '';
  document.getElementById('artworkAnalysis').value = '';
  document.getElementById('artworkImagePreview').innerHTML = '';
}

function closeArtworkModal() {
  document.getElementById('artworkModal').style.display = 'none';
  
  // Reset du bouton
  const saveBtn = document.getElementById('saveArtworkBtn');
  saveBtn.textContent = '💾 Ajouter l\'œuvre';
  delete saveBtn.dataset.editId;
}

function handleArtworkImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    showToast('❌ Veuillez sélectionner une image', 'error');
    return;
  }

  showToast('⏳ Compression de l\'image...', 'info');

  compressImage(file, 900, 0.75)
    .then(compressedBase64 => {
      document.getElementById('artworkImagePreview').innerHTML = 
        `<img src="${compressedBase64}" alt="Œuvre">`;
      showToast('✅ Image compressée', 'success');
    })
    .catch(error => {
      console.error('Erreur compression:', error);
      showToast('❌ Erreur lors de la compression', 'error');
    });
}

async function saveArtwork() {
  const artist = artists.find(a => a.id === currentArtistId);
  if (!artist) return;
  
  const title = document.getElementById('artworkTitle').value.trim();
  const date = document.getElementById('artworkDate').value.trim();
  const technique = document.getElementById('artworkTechnique').value.trim();
  const analysis = document.getElementById('artworkAnalysis').value.trim();
  const saveBtn = document.getElementById('saveArtworkBtn');
  const editId = saveBtn.dataset.editId;
  
  if (!title) {
    showToast('Le titre est obligatoire', 'error');
    return;
  }
  
  // Récupérer l'image
  const imagePreview = document.getElementById('artworkImagePreview').querySelector('img');
  if (!imagePreview) {
    showToast('L\'image est obligatoire', 'error');
    return;
  }
  
  if (editId) {
    // Mode édition - comparer en string pour éviter les problèmes de précision
    const artwork = artist.artworks.find(aw => String(aw.id) === String(editId));
    if (artwork) {
      artwork.title = title;
      artwork.date = date;
      artwork.technique = technique;
      artwork.image = imagePreview.src;
      artwork.analysis = analysis;
      console.log('✅ Analyse sauvegardée:', analysis);
      showToast('✅ Œuvre mise à jour !', 'success');
    } else {
      console.error('❌ Œuvre non trouvée, editId:', editId);
      showToast('❌ Erreur: œuvre non trouvée', 'error');
      return;
    }
    delete saveBtn.dataset.editId;
  } else {
    // Mode création
    const newArtwork = {
      id: Date.now(),
      title: title,
      date: date,
      technique: technique,
      image: imagePreview.src,
      analysis: analysis
    };
    artist.artworks.push(newArtwork);
    showToast('✅ Œuvre ajoutée !', 'success');
  }
  
  await saveToLocalStorage();
  closeArtworkModal();
  
  // Rafraîchir l'affichage
  if (isEditMode) {
    showArtistEditor();
  } else {
    showArtistCard();
  }
}

function editArtworkAnalysis(artworkId) {
  const artist = artists.find(a => a.id === currentArtistId);
  if (!artist) return;
  
  const artwork = artist.artworks.find(aw => String(aw.id) === String(artworkId));
  if (!artwork) {
    console.error('❌ Œuvre non trouvée, ID:', artworkId);
    return;
  }
  
  // Ouvrir le modal en mode édition
  document.getElementById('artworkModal').style.display = 'flex';
  
  // Pré-remplir avec les données existantes
  document.getElementById('artworkTitle').value = artwork.title;
  document.getElementById('artworkDate').value = artwork.date || '';
  document.getElementById('artworkTechnique').value = artwork.technique || '';
  document.getElementById('artworkAnalysis').value = artwork.analysis || '';
  
  // Afficher l'image
  document.getElementById('artworkImagePreview').innerHTML = 
    `<img src="${artwork.image}" alt="${artwork.title}">`;
  
  // Changer le comportement du bouton de sauvegarde
  const saveBtn = document.getElementById('saveArtworkBtn');
  saveBtn.textContent = '💾 Mettre à jour';
  
  // Stocker l'ID de l'artwork en cours d'édition
  saveBtn.dataset.editId = String(artworkId);
  console.log('📝 Édition œuvre:', artwork.title, 'ID:', artworkId);
}

function showArtworkDetails(artworkId) {
  console.log('🖱️ Clic sur artwork, ID:', artworkId);
  console.log('🎨 Artiste actuel:', currentArtistId);
  
  const artist = artists.find(a => a.id === currentArtistId);
  if (!artist) {
    console.error('❌ Artiste non trouvé');
    return;
  }
  
  console.log('👤 Artiste trouvé:', artist.name);
  
  const artwork = artist.artworks.find(aw => String(aw.id) === String(artworkId));
  if (!artwork) {
    console.error('❌ Œuvre non trouvée, ID:', artworkId);
    console.log('📋 Œuvres disponibles:', artist.artworks.map(aw => aw.id));
    return;
  }
  
  console.log('✅ Œuvre trouvée:', artwork.title);
  
  // Remplir le modal
  document.getElementById('detailsTitle').textContent = artwork.title;
  document.getElementById('detailsImage').src = artwork.image;
  document.getElementById('detailsImage').alt = artwork.title;
  
  // Infos (date + technique)
  let infoHTML = '';
  if (artwork.date) infoHTML += `<div><strong>📅 Date :</strong> ${artwork.date}</div>`;
  if (artwork.technique) infoHTML += `<div style="margin-top: 8px;"><strong>🎨 Technique :</strong> ${artwork.technique}</div>`;
  document.getElementById('detailsInfo').innerHTML = infoHTML;
  
  // Analyse
  document.getElementById('detailsAnalysis').textContent = artwork.analysis || 'Aucune analyse disponible.';
  
  // Afficher le modal
  document.getElementById('artworkDetailsModal').style.display = 'flex';
  console.log('✅ Modal affiché');
}

async function deleteArtwork(artworkId) {
  const confirmed = await showConfirm(
    'Supprimer cette œuvre ?',
    'Voulez-vous vraiment supprimer cette œuvre ? Cette action est irréversible.'
  );
  
  if (!confirmed) return;
  
  const artist = artists.find(a => a.id === currentArtistId);
  if (!artist) return;
  
  artist.artworks = artist.artworks.filter(aw => aw.id !== artworkId);
  
  saveToLocalStorage();
  showToast('Œuvre supprimée', 'info');
  
  // Rafraîchir l'affichage
  if (isEditMode) {
    showArtistEditor();
  } else {
    showArtistCard();
  }
}

function renderArtworks(artist) {
  const container = document.getElementById('artworksList');
  
  if (!artist.artworks || artist.artworks.length === 0) {
    container.innerHTML = '<div class="empty-artworks"><p>Aucune œuvre pour le moment</p></div>';
    return;
  }
  
  container.innerHTML = artist.artworks.map(artwork => {
    const analysisPreview = artwork.analysis ? 
      `<div class="artwork-analysis-preview">${escapeHtml(artwork.analysis)}</div>` : 
      `<div class="artwork-analysis-preview">Aucune analyse pour cette œuvre</div>`;
    
    // Calculer le badge de stats
    let statsBadge = '';
    let suggestionBadge = '';
    
    if (artwork.stats && artwork.stats.played > 0) {
      const rate = artwork.stats.successRate;
      let colorClass = 'stats-low';
      if (rate >= 80) colorClass = 'stats-high';
      else if (rate >= 50) colorClass = 'stats-medium';
      
      statsBadge = `<div class="artwork-stats-badge ${colorClass}">${rate}%</div>`;
      
      // Générer des suggestions intelligentes
      const artistRate = artwork.stats.played > 0 ? Math.round((artwork.stats.artistCorrect / artwork.stats.played) * 100) : 0;
      const titleRate = artwork.stats.played > 0 ? Math.round((artwork.stats.titleCorrect / artwork.stats.played) * 100) : 0;
      const dateRate = artwork.stats.played > 0 ? Math.round((artwork.stats.dateCorrect / artwork.stats.played) * 100) : 0;
      
      let suggestion = '';
      if (rate < 50) {
        suggestion = '⚠️ À retravailler';
      } else if (rate < 80) {
        const weakest = Math.min(artistRate, titleRate, dateRate);
        if (weakest === dateRate && dateRate < 70) {
          suggestion = '📅 Revoir les dates';
        } else if (weakest === artistRate && artistRate < 70) {
          suggestion = '👤 Revoir l\'artiste';
        } else if (weakest === titleRate && titleRate < 70) {
          suggestion = '🎨 Revoir le titre';
        } else {
          suggestion = '💪 Continue !';
        }
      } else {
        suggestion = '✨ Bien maîtrisé';
      }
      
      suggestionBadge = `<div class="artwork-suggestion">${suggestion}</div>`;
    }
    
    return `
      <div class="artwork-card">
        <button class="btn-delete-artwork" onclick="deleteArtwork(${artwork.id})" title="Supprimer cette œuvre">✕</button>
        <button class="btn-edit-artwork" onclick="editArtworkAnalysis(${artwork.id})" title="Modifier cette œuvre">✏️</button>
        ${statsBadge}
        <img src="${artwork.image}" 
             alt="${artwork.title}" 
             class="artwork-image" 
             onclick="showArtworkDetails(${artwork.id})"
             style="cursor: pointer;"
             title="Cliquer pour voir les détails">
        <div class="artwork-info">
          <div class="artwork-title">${escapeHtml(artwork.title)}</div>
          ${artwork.date ? `<div class="artwork-date">${escapeHtml(artwork.date)}</div>` : ''}
          ${suggestionBadge}
        </div>
      </div>
    `;
  }).join('');
}

// ==================== ARTISTS LIST ====================
function renderArtistsList() {
  const container = document.getElementById('artistsList');
  
  if (artists.length === 0) {
    container.innerHTML = '<div class="empty-artworks"><p>Aucun artiste</p></div>';
    return;
  }
  
  container.innerHTML = artists.map(artist => {
    const dates = [];
    if (artist.birthYear) dates.push(artist.birthYear);
    if (artist.deathYear) dates.push(artist.deathYear);
    const datesStr = dates.join(' - ');
    
    const portraitImg = artist.portrait ? 
      `<img src="${artist.portrait}" alt="${artist.name}" class="artist-item-portrait">` : 
      `<div class="artist-item-portrait-placeholder">👤</div>`;
    
    // Calculer les stats globales de l'artiste
    let globalStats = '';
    if (artist.artworks && artist.artworks.length > 0) {
      let totalPlayed = 0;
      let totalCorrect = 0;
      let totalWorks = 0;
      
      artist.artworks.forEach(artwork => {
        if (artwork.stats && artwork.stats.played > 0) {
          totalPlayed += artwork.stats.played;
          totalCorrect += artwork.stats.correct;
          totalWorks++;
        }
      });
      
      if (totalWorks > 0 && totalPlayed > 0) {
        const globalRate = Math.round((totalCorrect / totalPlayed) * 100);
        let badgeClass = 'artist-stats-low';
        if (globalRate >= 80) badgeClass = 'artist-stats-high';
        else if (globalRate >= 50) badgeClass = 'artist-stats-medium';
        
        globalStats = `<div class="artist-stats-badge ${badgeClass}">${globalRate}%</div>`;
      }
    }
    
    return `
      <div class="artist-item ${currentArtistId === artist.id ? 'active' : ''}" 
           data-artist-id="${artist.id}"
           onclick="selectArtist(${artist.id})">
        ${portraitImg}
        <div class="artist-item-content">
          <div class="artist-item-name">${escapeHtml(artist.name || 'Sans nom')}</div>
          ${datesStr ? `<div class="artist-item-dates">${datesStr}</div>` : ''}
          ${artist.style ? `<div class="artist-item-style">${escapeHtml(artist.style)}</div>` : ''}
        </div>
        ${globalStats}
      </div>
    `;
  }).join('');
}

function filterArtists() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  
  document.querySelectorAll('.artist-item').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(searchTerm) ? 'block' : 'none';
  });
}

function sortArtists() {
  const sortType = document.getElementById('sortSelect').value;
  
  switch(sortType) {
    case 'alpha':
      artists.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    case 'alpha-reverse':
      artists.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      break;
    case 'chrono':
      artists.sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999));
      break;
    case 'chrono-reverse':
      artists.sort((a, b) => (b.birthYear || 0) - (a.birthYear || 0));
      break;
    case 'knowledge':
      artists.sort((a, b) => {
        // Calculer le taux de connaissance pour chaque artiste
        const rateA = getArtistKnowledgeRate(a);
        const rateB = getArtistKnowledgeRate(b);
        return rateB - rateA; // Du mieux connu au moins connu
      });
      break;
  }
  
  renderArtistsList();
}

function getArtistKnowledgeRate(artist) {
  if (!artist.artworks || artist.artworks.length === 0) return -1;
  
  let totalPlayed = 0;
  let totalCorrect = 0;
  let worksWithStats = 0;
  
  artist.artworks.forEach(artwork => {
    if (artwork.stats && artwork.stats.played > 0) {
      totalPlayed += artwork.stats.played;
      totalCorrect += artwork.stats.correct;
      worksWithStats++;
    }
  });
  
  if (worksWithStats === 0 || totalPlayed === 0) return -1;
  
  return Math.round((totalCorrect / totalPlayed) * 100);
}

// ==================== UTILS ====================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== DATA REPAIR ====================
async function repairAllData() {
  const confirmed = await showConfirm(
    '🔧 Réparer les données ?',
    'Cette opération va normaliser tous les IDs, vérifier la structure des données et corriger les problèmes. Recommandé après une migration ou un import. Continuer ?'
  );
  
  if (!confirmed) return;
  
  showToast('🔧 Réparation en cours...', 'info');
  
  let artistsFixed = 0;
  let artworksFixed = 0;
  let idCounter = 1;
  
  try {
    // Parcourir tous les artistes
    for (let artist of artists) {
      let artistChanged = false;
      
      // Réparer l'ID de l'artiste (utiliser un compteur simple)
      const oldId = artist.id;
      artist.id = idCounter++;
      if (oldId !== artist.id) {
        artistChanged = true;
        // Mettre à jour currentArtistId si c'est l'artiste sélectionné
        if (currentArtistId === oldId) {
          currentArtistId = artist.id;
        }
      }
      
      // Vérifier les propriétés obligatoires
      if (!artist.name) artist.name = 'Artiste sans nom';
      if (!artist.artworks) artist.artworks = [];
      if (artist.birthYear && typeof artist.birthYear === 'string') {
        artist.birthYear = parseInt(artist.birthYear) || null;
        artistChanged = true;
      }
      if (artist.deathYear && typeof artist.deathYear === 'string') {
        artist.deathYear = parseInt(artist.deathYear) || null;
        artistChanged = true;
      }
      
      // Réparer les œuvres
      if (artist.artworks && Array.isArray(artist.artworks)) {
        let artworkIdCounter = 1;
        for (let artwork of artist.artworks) {
          let artworkChanged = false;
          
          // Réparer l'ID de l'œuvre
          artwork.id = artworkIdCounter++;
          artworkChanged = true;
          
          // Vérifier les propriétés obligatoires
          if (!artwork.title) artwork.title = 'Sans titre';
          if (!artwork.image) artwork.image = '';
          if (!artwork.analysis) artwork.analysis = '';
          if (!artwork.date) artwork.date = '';
          if (!artwork.technique) artwork.technique = '';
          
          // Vérifier la structure des stats
          if (!artwork.stats) {
            artwork.stats = {
              played: 0,
              correct: 0,
              wrong: 0,
              successRate: 0,
              artistCorrect: 0,
              titleCorrect: 0,
              dateCorrect: 0
            };
            artworkChanged = true;
          } else {
            // Vérifier que toutes les propriétés stats existent
            if (typeof artwork.stats.played !== 'number') artwork.stats.played = 0;
            if (typeof artwork.stats.correct !== 'number') artwork.stats.correct = 0;
            if (typeof artwork.stats.wrong !== 'number') artwork.stats.wrong = 0;
            if (typeof artwork.stats.successRate !== 'number') artwork.stats.successRate = 0;
            if (typeof artwork.stats.artistCorrect !== 'number') artwork.stats.artistCorrect = 0;
            if (typeof artwork.stats.titleCorrect !== 'number') artwork.stats.titleCorrect = 0;
            if (typeof artwork.stats.dateCorrect !== 'number') artwork.stats.dateCorrect = 0;
          }
          
          if (artworkChanged) artworksFixed++;
        }
      }
      
      if (artistChanged) artistsFixed++;
    }
    
    // Sauvegarder
    await saveToIndexedDB();
    
    // Rafraîchir l'affichage
    renderArtistsList();
    if (currentArtistId) {
      if (isEditMode) {
        showArtistEditor();
      } else {
        showArtistCard();
      }
    }
    
    showToast(`✅ Réparation terminée ! ${artistsFixed} artistes et ${artworksFixed} œuvres normalisés.`, 'success');
    console.log('✅ Données réparées:', { artistsFixed, artworksFixed });
    
  } catch (error) {
    console.error('❌ Erreur réparation:', error);
    showToast('❌ Erreur lors de la réparation', 'error');
  }
}

// ==================== RECOMPRESSION ====================
async function ultraCompressAllImages() {
  const confirmed = await showConfirm(
    '🔥 Ultra compression ?',
    'Cette compression EXTRÊME va réduire drastiquement la taille des images (qualité 60%, max 800px). La qualité visuelle sera réduite mais l\'espace gagné sera maximal. Voulez-vous continuer ?'
  );
  
  if (!confirmed) return;
  
  showToast('🔥 ULTRA compression en cours... Ne fermez pas la page !', 'info');
  
  let totalCompressed = 0;
  let errors = 0;
  
  try {
    // Recompresser les portraits
    for (let artist of artists) {
      if (artist.portrait && artist.portrait.startsWith('data:image')) {
        try {
          const compressed = await recompressBase64(artist.portrait, 600, 0.6);
          if (compressed) {
            artist.portrait = compressed;
            totalCompressed++;
          }
        } catch (e) {
          console.error('Erreur compression portrait:', e);
          errors++;
        }
      }
      
      // Recompresser les œuvres
      if (artist.artworks) {
        for (let artwork of artist.artworks) {
          if (artwork.image && artwork.image.startsWith('data:image')) {
            try {
              const compressed = await recompressBase64(artwork.image, 800, 0.6);
              if (compressed) {
                artwork.image = compressed;
                totalCompressed++;
              }
            } catch (e) {
              console.error('Erreur compression œuvre:', e);
              errors++;
            }
          }
        }
      }
    }
    
    saveToLocalStorage();
    renderArtistsList();
    
    if (currentArtistId) {
      if (isEditMode) {
        showArtistEditor();
      } else {
        showArtistCard();
      }
    }
    
    showToast(`🔥 ${totalCompressed} images ULTRA compressées ! ${errors > 0 ? `(${errors} erreurs)` : ''}`, 'success');
    checkStorageQuota();
    
  } catch (error) {
    console.error('Erreur ultra compression:', error);
    showToast('❌ Erreur lors de la compression', 'error');
  }
}

async function recompressAllImages() {
  const confirmed = await showConfirm(
    'Recompresser toutes les images ?',
    'Cette opération va recompresser tous les portraits et œuvres pour économiser de l\'espace. Cela peut prendre quelques minutes. Voulez-vous continuer ?'
  );
  
  if (!confirmed) return;
  
  showToast('⏳ Recompression en cours... Ne fermez pas la page !', 'info');
  
  let totalCompressed = 0;
  let errors = 0;
  
  try {
    // Recompresser les portraits
    for (let artist of artists) {
      if (artist.portrait && artist.portrait.startsWith('data:image')) {
        try {
          const compressed = await recompressBase64(artist.portrait, 800, 0.85);
          if (compressed) {
            artist.portrait = compressed;
            totalCompressed++;
          }
        } catch (e) {
          console.error('Erreur compression portrait:', e);
          errors++;
        }
      }
      
      // Recompresser les œuvres
      if (artist.artworks) {
        for (let artwork of artist.artworks) {
          if (artwork.image && artwork.image.startsWith('data:image')) {
            try {
              const compressed = await recompressBase64(artwork.image, 1200, 0.85);
              if (compressed) {
                artwork.image = compressed;
                totalCompressed++;
              }
            } catch (e) {
              console.error('Erreur compression œuvre:', e);
              errors++;
            }
          }
        }
      }
    }
    
    saveToLocalStorage();
    renderArtistsList();
    
    if (currentArtistId) {
      if (isEditMode) {
        showArtistEditor();
      } else {
        showArtistCard();
      }
    }
    
    showToast(`✅ ${totalCompressed} images recompressées ! ${errors > 0 ? `(${errors} erreurs)` : ''}`, 'success');
    checkStorageQuota();
    
  } catch (error) {
    console.error('Erreur recompression:', error);
    showToast('❌ Erreur lors de la recompression', 'error');
  }
}

function recompressBase64(base64String, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Redimensionner si trop grande
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Compresser en JPEG
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    
    img.onerror = reject;
    img.src = base64String;
  });
}

// ==================== IMPORT/EXPORT ====================
function openImportBibliartModal() {
  // Créer un input file temporaire
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const bibliartData = JSON.parse(text);
      
      // Vérifier que c'est bien un export Bibliart
      if (!Array.isArray(bibliartData)) {
        showToast('❌ Format Bibliart invalide', 'error');
        return;
      }
      
      // Confirmer l'import
      const confirmed = await showConfirm(
        'Importer depuis Bibliart ?',
        `Cette action va remplacer vos données actuelles. ${bibliartData.length} artistes détectés. Continuer ?`
      );
      
      if (!confirmed) return;
      
      importFromBibliart(bibliartData);
      
    } catch (error) {
      console.error('Erreur d\'import:', error);
      showToast('❌ Erreur lors de l\'import du fichier', 'error');
    }
  };
  
  input.click();
}

function importFromBibliart(bibliartData) {
  artists = bibliartData;
  currentArtistId = null;
  
  saveToLocalStorage();
  renderArtistsList();
  
  showToast(`✅ Import Bibliart réussi ! ${artists.length} artistes importés`, 'success');
  
  // Sélectionner le premier artiste
  if (artists.length > 0) {
    selectArtist(artists[0].id);
  } else {
    showEmptyState();
  }
}

function openImportStatsModal() {
  // Créer un input file temporaire
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const quizartData = JSON.parse(text);
      
      // Confirmer l'import
      const confirmed = await showConfirm(
        'Importer les statistiques QuizArt ?',
        `Cette action va ajouter les statistiques de vos quiz aux œuvres correspondantes. Les fiches artistes ne seront pas modifiées. Continuer ?`
      );
      
      if (!confirmed) return;
      
      importStatsFromQuizArt(quizartData);
      
    } catch (error) {
      console.error('Erreur d\'import:', error);
      showToast('❌ Erreur lors de l\'import du fichier', 'error');
    }
  };
  
  input.click();
}

function importStatsFromQuizArt(quizartData) {
  // Gérer la structure QuizArt (objet avec propriété cards)
  let quizartCards = [];
  
  if (Array.isArray(quizartData)) {
    quizartCards = quizartData;
  } else if (quizartData.cards && Array.isArray(quizartData.cards)) {
    quizartCards = quizartData.cards;
  } else {
    showToast('❌ Format de fichier invalide', 'error');
    return;
  }
  
  let statsUpdated = 0;
  let statsAdded = 0;
  
  // Pour chaque carte QuizArt
  quizartCards.forEach(quizCard => {
    if (!quizCard.artist || !quizCard.title) return;
    
    // Trouver l'artiste correspondant dans Bibliart
    const artist = artists.find(a => 
      a.name && a.name.toLowerCase() === quizCard.artist.toLowerCase()
    );
    
    if (!artist) return;
    
    // Trouver l'œuvre correspondante
    const artwork = artist.artworks.find(aw => 
      aw.title && aw.title.toLowerCase() === quizCard.title.toLowerCase()
    );
    
    if (artwork) {
      // Ajouter/mettre à jour les stats
      artwork.stats = {
        played: quizCard.stats?.played || 0,
        correct: quizCard.stats?.correct || 0,
        wrong: quizCard.stats?.wrong || 0,
        successRate: quizCard.stats?.successRate || 0,
        artistCorrect: quizCard.stats?.artistCorrect || 0,
        titleCorrect: quizCard.stats?.titleCorrect || 0,
        dateCorrect: quizCard.stats?.dateCorrect || 0
      };
      
      if (quizCard.stats && quizCard.stats.played > 0) {
        statsUpdated++;
      } else {
        statsAdded++;
      }
    }
  });
  
  saveToLocalStorage();
  
  if (statsUpdated > 0 || statsAdded > 0) {
    showToast(`✅ Stats importées ! ${statsUpdated + statsAdded} œuvres mises à jour`, 'success');
    
    // Rafraîchir l'affichage si on est sur une fiche artiste
    if (currentArtistId) {
      if (isEditMode) {
        showArtistEditor();
      } else {
        showArtistCard();
      }
    }
  } else {
    showToast('ℹ️ Aucune correspondance trouvée', 'info');
  }
}

function exportToFile() {
  const dataStr = JSON.stringify(artists, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `bibliart-export-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
  showToast('💾 Export réussi !', 'success');
}

// ==================== STORAGE ====================
async function saveToLocalStorage() {
  // Wrapper pour compatibilité - utilise maintenant IndexedDB
  await saveToIndexedDB();
}

function loadFromLocalStorage() {
  // Cette fonction n'est plus utilisée - migration auto au démarrage
  console.log('⚠️ loadFromLocalStorage appelée - utiliser loadFromIndexedDB');
}

// Exposer les fonctions globales
window.selectArtist = selectArtist;
window.editArtworkAnalysis = editArtworkAnalysis;
window.deleteArtwork = deleteArtwork;
window.showArtworkDetails = showArtworkDetails;
