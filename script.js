// ==================== DONNÉES ====================
let artists = [];
let currentArtistId = null;
let isEditMode = false;

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();
  setupEventListeners();
  renderArtistsList();
  checkStorageQuota(); // Vérifier l'espace au démarrage
  
  // Afficher l'état vide si aucun artiste
  if (artists.length === 0) {
    showEmptyState();
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
  document.getElementById('recompressBtn').addEventListener('click', recompressAllImages);
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

function checkStorageQuota() {
  try {
    const totalSize = new Blob(Object.values(localStorage)).size;
    const limitMB = 5; // Limite approximative du localStorage
    const usedMB = totalSize / (1024 * 1024);
    
    if (usedMB > limitMB * 0.8) {
      showToast(`⚠️ Espace stockage : ${usedMB.toFixed(1)}/${limitMB}MB - Pensez à exporter !`, 'info');
    }
    
    if (usedMB > limitMB * 0.95) {
      showToast('🚨 ATTENTION : Limite de stockage presque atteinte ! Exportez vos données !', 'error');
    }
  } catch (e) {
    console.error('Erreur vérification quota:', e);
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

  compressImage(file, 800, 0.85)
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

  compressImage(file, 1200, 0.85)
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

function saveArtwork() {
  const artist = artists.find(a => a.id === currentArtistId);
  if (!artist) return;
  
  const title = document.getElementById('artworkTitle').value.trim();
  const date = document.getElementById('artworkDate').value.trim();
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
    // Mode édition
    const artwork = artist.artworks.find(aw => aw.id === parseInt(editId));
    if (artwork) {
      artwork.title = title;
      artwork.date = date;
      artwork.image = imagePreview.src;
      artwork.analysis = analysis;
      showToast('✅ Œuvre mise à jour !', 'success');
    }
    delete saveBtn.dataset.editId;
  } else {
    // Mode création
    const newArtwork = {
      id: Date.now(),
      title: title,
      date: date,
      image: imagePreview.src,
      analysis: analysis
    };
    artist.artworks.push(newArtwork);
    showToast('✅ Œuvre ajoutée !', 'success');
  }
  
  saveToLocalStorage();
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
  
  const artwork = artist.artworks.find(aw => aw.id === artworkId);
  if (!artwork) return;
  
  // Ouvrir le modal en mode édition
  document.getElementById('artworkModal').style.display = 'flex';
  
  // Pré-remplir avec les données existantes
  document.getElementById('artworkTitle').value = artwork.title;
  document.getElementById('artworkDate').value = artwork.date || '';
  document.getElementById('artworkAnalysis').value = artwork.analysis || '';
  
  // Afficher l'image
  document.getElementById('artworkImagePreview').innerHTML = 
    `<img src="${artwork.image}" alt="${artwork.title}">`;
  
  // Changer le comportement du bouton de sauvegarde
  const saveBtn = document.getElementById('saveArtworkBtn');
  saveBtn.textContent = '💾 Mettre à jour';
  
  // Stocker l'ID de l'artwork en cours d'édition
  saveBtn.dataset.editId = artworkId;
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
    
    const actionButtons = `
      <div class="artwork-actions">
        <button class="btn-icon-small" onclick="editArtworkAnalysis(${artwork.id})" title="Modifier cette œuvre">✏️</button>
        ${isEditMode ? `<button class="btn-icon-small btn-delete-small" onclick="deleteArtwork(${artwork.id})" title="Supprimer cette œuvre">🗑️</button>` : ''}
      </div>
    `;
    
    return `
      <div class="artwork-card">
        ${analysisPreview}
        ${statsBadge}
        <img src="${artwork.image}" alt="${artwork.title}" class="artwork-image">
        <div class="artwork-info">
          <div class="artwork-title">${escapeHtml(artwork.title)}</div>
          ${artwork.date ? `<div class="artwork-date">${escapeHtml(artwork.date)}</div>` : ''}
          ${suggestionBadge}
        </div>
        ${actionButtons}
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

// ==================== RECOMPRESSION ====================
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
function saveToLocalStorage() {
  try {
    localStorage.setItem('bibliart-artists', JSON.stringify(artists));
    checkStorageQuota();
  } catch (e) {
    console.error('Erreur de sauvegarde:', e);
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      showToast('🚨 LIMITE DÉPASSÉE ! Exportez vos données puis supprimez des images/artistes.', 'error');
    } else {
      showToast('⚠️ Erreur de sauvegarde', 'error');
    }
  }
}

function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem('bibliart-artists');
    if (saved) {
      artists = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Erreur de chargement:', e);
    artists = [];
  }
}

// Exposer les fonctions globales
window.selectArtist = selectArtist;
window.editArtworkAnalysis = editArtworkAnalysis;
window.deleteArtwork = deleteArtwork;
