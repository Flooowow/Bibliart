// ==================== DONNÉES ====================
let artists = [];
let currentArtistId = null;
let isEditMode = false;

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();
  setupEventListeners();
  renderArtistsList();
  
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
  document.getElementById('importBtn').addEventListener('click', openImportModal);
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
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const artist = artists.find(a => a.id === currentArtistId);
    if (artist) {
      artist.portrait = event.target.result;
      document.getElementById('editPortraitPreview').innerHTML = 
        `<img src="${event.target.result}" alt="Portrait">`;
    }
  };
  reader.readAsDataURL(file);
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
  
  const reader = new FileReader();
  reader.onload = (event) => {
    document.getElementById('artworkImagePreview').innerHTML = 
      `<img src="${event.target.result}" alt="Œuvre">`;
  };
  reader.readAsDataURL(file);
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
      `<div class="artwork-analysis-preview">${escapeHtml(artwork.analysis.substring(0, 200))}${artwork.analysis.length > 200 ? '...' : ''}</div>` : '';
    
    const editButtons = isEditMode ? `
      <div class="artwork-actions">
        <button class="btn btn-icon btn-small" onclick="editArtworkAnalysis(${artwork.id})">✏️ Modifier</button>
        <button class="btn btn-icon btn-small" onclick="deleteArtwork(${artwork.id})" style="color: var(--danger); border-color: rgba(165, 42, 42, 0.4);">🗑️</button>
      </div>
    ` : '';
    
    return `
      <div class="artwork-card">
        ${analysisPreview}
        <img src="${artwork.image}" alt="${artwork.title}" class="artwork-image">
        <div class="artwork-info">
          <div class="artwork-title">${escapeHtml(artwork.title)}</div>
          ${artwork.date ? `<div class="artwork-date">${escapeHtml(artwork.date)}</div>` : ''}
        </div>
        ${editButtons}
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
    
    return `
      <div class="artist-item ${currentArtistId === artist.id ? 'active' : ''}" 
           data-artist-id="${artist.id}"
           onclick="selectArtist(${artist.id})">
        <div class="artist-item-name">${escapeHtml(artist.name || 'Sans nom')}</div>
        ${datesStr ? `<div class="artist-item-dates">${datesStr}</div>` : ''}
        ${artist.style ? `<div class="artist-item-style">${escapeHtml(artist.style)}</div>` : ''}
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
  }
  
  renderArtistsList();
}

// ==================== UTILS ====================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== IMPORT/EXPORT ====================
function openImportModal() {
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
        'Importer depuis QuizArt ?',
        `Cette action va créer des fiches artistes à partir de votre sauvegarde QuizArt. ${quizartData.length || 0} cartes détectées. Continuer ?`
      );
      
      if (!confirmed) return;
      
      importFromQuizArt(quizartData);
      
    } catch (error) {
      console.error('Erreur d\'import:', error);
      showToast('❌ Erreur lors de l\'import du fichier', 'error');
    }
  };
  
  input.click();
}

function importFromQuizArt(quizartCards) {
  if (!Array.isArray(quizartCards)) {
    showToast('❌ Format de fichier invalide', 'error');
    return;
  }
  
  let importCount = 0;
  let artistsCreated = 0;
  
  // Grouper les cartes par artiste
  const artistGroups = {};
  
  quizartCards.forEach(card => {
    const artistName = card.artist;
    if (!artistName) return;
    
    if (!artistGroups[artistName]) {
      artistGroups[artistName] = [];
    }
    
    artistGroups[artistName].push({
      id: Date.now() + Math.random(),
      title: card.title || 'Sans titre',
      date: card.date || '',
      image: card.image || '',
      analysis: card.note || ''
    });
    
    importCount++;
  });
  
  // Créer les artistes
  Object.keys(artistGroups).forEach(artistName => {
    // Vérifier si l'artiste existe déjà
    let artist = artists.find(a => a.name === artistName);
    
    if (!artist) {
      // Créer un nouvel artiste
      artist = {
        id: Date.now() + Math.random(),
        name: artistName,
        birthYear: null,
        deathYear: null,
        birthplace: '',
        style: '',
        bio: '',
        portrait: null,
        artworks: []
      };
      artists.push(artist);
      artistsCreated++;
    }
    
    // Ajouter les œuvres (éviter les doublons)
    artistGroups[artistName].forEach(artwork => {
      const exists = artist.artworks.some(aw => 
        aw.title === artwork.title && aw.date === artwork.date
      );
      if (!exists) {
        artist.artworks.push(artwork);
      }
    });
  });
  
  saveToLocalStorage();
  renderArtistsList();
  
  showToast(`✅ Import réussi ! ${artistsCreated} artistes créés, ${importCount} œuvres importées`, 'success');
  
  // Sélectionner le premier artiste si aucun n'est sélectionné
  if (!currentArtistId && artists.length > 0) {
    selectArtist(artists[0].id);
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
function saveToLocalStorage() {
  try {
    localStorage.setItem('bibliart-artists', JSON.stringify(artists));
  } catch (e) {
    console.error('Erreur de sauvegarde:', e);
    showToast('⚠️ Erreur de sauvegarde', 'error');
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
