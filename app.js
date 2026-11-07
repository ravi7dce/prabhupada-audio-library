/**
 * Srila Prabhupada Audio Library
 * Client-Side Application Controller
 */

(function () {
  'use strict';

  // State
  const state = {
    catalog: null,
    books: [],
    filteredBooks: [],
    currentBook: null,
    currentPlaylist: [],
    currentIndex: -1,
    currentTrack: null,
    isPlaying: false,
    playbackRate: 1.0,
    volume: 1.0,
    isMuted: false,
    repeatMode: 'off', // 'off', 'all', 'one'
    isShuffle: false,
    activeCategory: 'all',
    searchQuery: '',
    sortBy: 'name-asc',
    favorites: new Set(),
    history: [],
    sleepTimerId: null,
    sleepTimerMinutes: 0,
    sleepEndTime: null
  };

  // Audio element
  const audio = new Audio();
  audio.preload = 'metadata';

  // DOM Elements
  const el = {
    booksGrid: document.getElementById('booksGrid'),
    gridCount: document.getElementById('gridCount'),
    searchInput: document.getElementById('searchInput'),
    searchClear: document.getElementById('searchClear'),
    sortSelect: document.getElementById('sortSelect'),
    categoryButtons: document.querySelectorAll('.filter-btn'),
    themeToggle: document.getElementById('themeToggle'),
    
    // Modal
    bookModal: document.getElementById('bookModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalSubtitle: document.getElementById('modalSubtitle'),
    modalBody: document.getElementById('modalBody'),
    modalClose: document.getElementById('modalClose'),
    modalSearch: document.getElementById('modalSearch'),

    // Player
    playerBar: document.getElementById('playerBar'),
    playerArtwork: document.getElementById('playerArtwork'),
    playerTitle: document.getElementById('playerTitle'),
    playerSubtitle: document.getElementById('playerSubtitle'),
    playerTrackIndex: document.getElementById('playerTrackIndex'),
    drivePlayerFrame: document.getElementById('drivePlayerFrame'),
    btnPrev: document.getElementById('btnPrev'),
    btnNext: document.getElementById('btnNext'),
    btnDownload: document.getElementById('btnDownload'),
    btnDriveLink: document.getElementById('btnDriveLink'),
    btnShare: document.getElementById('btnShare'),
    btnClosePlayer: document.getElementById('btnClosePlayer')
  };

  // Load Saved Preferences
  function loadPreferences() {
    try {
      const favs = localStorage.getItem('sp_favs');
      if (favs) state.favorites = new Set(JSON.parse(favs));
      
      const hist = localStorage.getItem('sp_history');
      if (hist) state.history = JSON.parse(hist);

      const savedTheme = localStorage.getItem('sp_theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      updateThemeIcon(savedTheme);

      const savedVol = localStorage.getItem('sp_vol');
      if (savedVol !== null) {
        state.volume = parseFloat(savedVol);
        audio.volume = state.volume;
        if (el.volumeSlider) el.volumeSlider.value = state.volume * 100;
      }
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem('sp_favs', JSON.stringify(Array.from(state.favorites)));
    } catch (e) {}
  }

  function updateThemeIcon(theme) {
    if (!el.themeToggle) return;
    el.themeToggle.innerHTML = theme === 'dark' 
      ? '<span class="icon">☀️</span>' 
      : '<span class="icon">🌙</span>';
    el.themeToggle.title = theme === 'dark' ? 'Switch to Light (Parchment) Mode' : 'Switch to Dark Mode';
  }

  // Category Detection
  function getBookCategory(bookName) {
    const name = bookName.toLowerCase();
    if (name.includes('bhagavad-gītā') || name.includes('bhagavad gita')) return 'gita';
    if (name.includes('bhagavatam') || name.includes('bhāgavata')) return 'bhagavatam';
    if (name.includes('caitanya-caritāmṛta') || name.includes('caitanya caritamrta')) return 'caitanya';
    if (name.includes('līlāmṛta') || name.includes('lilamrita') || name.includes('transcendental diary') || name.includes('built a house') || name.includes('planted seed')) return 'biography';
    if (name.includes('song') || name.includes('gītāvali') || name.includes('saraṇāgati') || name.includes('sangit') || name.includes('prarthana')) return 'songs';
    if (name.includes('krsna') || name.includes('krishna') || name.includes('nectar of devotion') || name.includes('teachings of') || name.includes('īśopaniṣad') || name.includes('isopanisad') || name.includes('nectar of instruction')) return 'classics';
    if (name.includes('purāṇa') || name.includes('purana') || name.includes('mahābhārata') || name.includes('rāmāyaṇa')) return 'epics';
    if (name.includes('science') || name.includes('civilization') || name.includes('easy journey') || name.includes('birth and death') || name.includes('dialectic') || name.includes('peace formula') || name.includes('chant and be happy')) return 'essays';
    return 'goswami';
  }

  function getCategoryLabel(catKey) {
    const map = {
      all: 'All Books',
      classics: 'Major Classics',
      gita: 'Bhagavad-gītā',
      bhagavatam: 'Śrīmad-Bhāgavatam',
      caitanya: 'Caitanya Literatures',
      biography: 'Biographies & Lilamrita',
      essays: 'Essays & Philosophy',
      epics: 'Purāṇas & Epics',
      songs: 'Songs & Prayers',
      goswami: 'Goswami Works',
      favorites: 'My Favorites'
    };
    return map[catKey] || 'Books';
  }

  // Count total tracks for a book
  function getTotalTracks(book) {
    let count = (book.tracks || []).length;
    if (book.subsections) {
      book.subsections.forEach(s => {
        count += getTotalTracks(s);
      });
    }
    return count;
  }

  // Flatten all tracks for a book (including subsections)
  function getFlattenedTracks(book, parentPath = '') {
    let result = [];
    const currentPath = parentPath ? `${parentPath} • ${book.name}` : book.name;

    if (book.tracks && book.tracks.length > 0) {
      book.tracks.forEach((t, idx) => {
        result.push({
          ...t,
          bookName: state.currentBook ? state.currentBook.name : book.name,
          bookId: state.currentBook ? state.currentBook.id : book.id,
          subSectionName: parentPath ? book.name : '',
          trackIndex: idx + 1
        });
      });
    }

    if (book.subsections) {
      book.subsections.forEach(s => {
        result = result.concat(getFlattenedTracks(s, currentPath));
      });
    }
    return result;
  }

  // Format track title for cleaner display
  function formatTrackTitle(rawTitle) {
    if (!rawTitle) return 'Audio Track';
    let clean = rawTitle.replace(/\.(mp3|m4a|wav|ogg)$/i, '');
    clean = clean.replace(/^\d+[\s_-]+/, ''); // remove leading track number
    clean = clean.replace(/_/g, ' ');
    return clean.trim();
  }

  // Format time (seconds -> mm:ss or hh:mm:ss)
  function formatTime(sec) {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const hrs = Math.floor(m / 60);
    const remM = m % 60;
    const remS = s % 60;

    if (hrs > 0) {
      return `${hrs}:${remM < 10 ? '0' : ''}${remM}:${remS < 10 ? '0' : ''}${remS}`;
    }
    return `${m}:${remS < 10 ? '0' : ''}${remS}`;
  }

  // Render Books Grid
  function renderBooks() {
    if (!el.booksGrid) return;
    
    let list = [...state.books];

    // Filter by category
    if (state.activeCategory === 'favorites') {
      list = list.filter(b => state.favorites.has(b.id));
    } else if (state.activeCategory !== 'all') {
      list = list.filter(b => getBookCategory(b.name) === state.activeCategory);
    }

    // Filter by search query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      list = list.filter(b => {
        if (b.name.toLowerCase().includes(q)) return true;
        // Search inside tracks
        const allTracks = getFlattenedTracks(b);
        return allTracks.some(t => t.title.toLowerCase().includes(q));
      });
    }

    // Sort
    list.sort((a, b) => {
      if (state.sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (state.sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (state.sortBy === 'tracks-desc') return getTotalTracks(b) - getTotalTracks(a);
      if (state.sortBy === 'tracks-asc') return getTotalTracks(a) - getTotalTracks(b);
      return 0;
    });

    state.filteredBooks = list;
    if (el.gridCount) el.gridCount.textContent = `Showing ${list.length} ${list.length === 1 ? 'book' : 'books'}`;

    if (list.length === 0) {
      el.booksGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">📖</div>
          <h3 class="empty-title">No Audio Books Found</h3>
          <p class="empty-text">No books match your current search or category filter.</p>
          <button class="filter-btn active" id="btnResetFilters">Show All Audio Books</button>
        </div>
      `;
      const btnReset = document.getElementById('btnResetFilters');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          state.activeCategory = 'all';
          state.searchQuery = '';
          if (el.searchInput) el.searchInput.value = '';
          updateActiveCategoryPill();
          renderBooks();
        });
      }
      return;
    }

    const icons = ['🪷', '🦚', '📜', '🕉️', '✨', '📖', '🪘', '🔔'];

    el.booksGrid.innerHTML = list.map((b, i) => {
      const totalT = getTotalTracks(b);
      const isFav = state.favorites.has(b.id);
      const cat = getBookCategory(b.name);
      const catLabel = getCategoryLabel(cat);
      const icon = icons[i % icons.length];
      const hasSubsections = b.subsections && b.subsections.length > 0;

      return `
        <div class="book-card" data-book-id="${b.id}">
          <div class="book-cover">
            <div class="book-cover-pattern"></div>
            <div class="book-badge-category">${catLabel}</div>
            <button class="book-fav-btn ${isFav ? 'active' : ''}" data-fav-id="${b.id}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
              ${isFav ? '❤️' : '🤍'}
            </button>
            <div class="book-cover-icon">${icon}</div>
          </div>
          <div class="book-body">
            <h3 class="book-title" title="${b.name}">${b.name}</h3>
            <div class="book-meta">
              <span class="book-meta-item">
                <span>🎵</span>
                <strong>${totalT}</strong> ${totalT === 1 ? 'track' : 'tracks'}
              </span>
              ${hasSubsections ? `<span class="book-meta-item"><span>📁</span> ${b.subsections.length} parts</span>` : ''}
            </div>
            <div class="card-actions">
              <button class="btn-play-book" data-play-book-id="${b.id}">
                <span>▶</span> Listen
              </button>
              <button class="btn-open-book" data-open-book-id="${b.id}">
                Tracks ▾
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach card event listeners
    el.booksGrid.querySelectorAll('.book-card').forEach(card => {
      const bookId = card.getAttribute('data-book-id');
      const book = state.books.find(b => b.id === bookId);
      if (!book) return;

      // Card click opens modal
      card.addEventListener('click', (e) => {
        if (e.target.closest('.book-fav-btn') || e.target.closest('.btn-play-book')) return;
        openBookModal(book);
      });

      // Play button
      const playBtn = card.querySelector('.btn-play-book');
      if (playBtn) {
        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          playBook(book);
        });
      }

      // Fav button
      const favBtn = card.querySelector('.book-fav-btn');
      if (favBtn) {
        favBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleFavorite(bookId);
        });
      }
    });
  }

  function toggleFavorite(bookId) {
    if (state.favorites.has(bookId)) {
      state.favorites.delete(bookId);
    } else {
      state.favorites.add(bookId);
    }
    saveFavorites();
    renderBooks();
  }

  function updateActiveCategoryPill() {
    el.categoryButtons.forEach(btn => {
      const cat = btn.getAttribute('data-category');
      btn.classList.toggle('active', cat === state.activeCategory);
    });
  }

  // Open Book Modal
  function openBookModal(book) {
    state.currentBook = book;
    if (!el.bookModal) return;

    el.modalTitle.textContent = book.name;
    const totalT = getTotalTracks(book);
    el.modalSubtitle.innerHTML = `<span>📖 ${getCategoryLabel(getBookCategory(book.name))}</span> • <span>🎵 ${totalT} audio tracks</span>`;

    if (el.modalSearch) el.modalSearch.value = '';
    renderModalTracks(book);

    el.bookModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!el.bookModal) return;
    el.bookModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderModalTracks(book, filter = '') {
    if (!el.modalBody) return;

    const q = filter.trim().toLowerCase();

    function renderSection(sectionNode, depth = 0) {
      let html = '';
      const hasTracks = sectionNode.tracks && sectionNode.tracks.length > 0;
      const filteredTracks = hasTracks 
        ? sectionNode.tracks.filter(t => !q || t.title.toLowerCase().includes(q)) 
        : [];

      if (depth > 0 && (filteredTracks.length > 0 || (sectionNode.subsections && sectionNode.subsections.length > 0))) {
        html += `
          <div class="subsection-header">
            <span>📁 ${sectionNode.name}</span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${filteredTracks.length} tracks</span>
          </div>
        `;
      }

      if (filteredTracks.length > 0) {
        html += `<div class="track-list">`;
        filteredTracks.forEach((t) => {
          const isCurrent = state.currentTrack && state.currentTrack.id === t.id;
          const cleanTitle = formatTrackTitle(t.title);

          html += `
            <div class="track-item ${isCurrent ? 'playing' : ''}" data-track-id="${t.id}">
              <div class="track-play-btn">${isCurrent && state.isPlaying ? '❚❚' : '▶'}</div>
              <div class="track-info">
                <div class="track-title" title="${t.title}">${cleanTitle}</div>
                <div class="track-sub">${t.title}</div>
              </div>
              <div class="track-actions">
                <a href="${t.streamUrl}" download="${t.title}" class="track-btn" title="Download MP3" onclick="event.stopPropagation()">
                  ⬇️
                </a>
                <a href="${t.driveUrl}" target="_blank" rel="noopener" class="track-btn" title="Open in Google Drive" onclick="event.stopPropagation()">
                  ↗
                </a>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }

      if (sectionNode.subsections) {
        sectionNode.subsections.forEach(sub => {
          html += renderSection(sub, depth + 1);
        });
      }

      return html;
    }

    const content = renderSection(book, 0);
    el.modalBody.innerHTML = content || '<p style="text-align:center; padding: 40px; color: var(--text-muted);">No tracks found matching your query.</p>';

    // Attach click listeners to tracks
    el.modalBody.querySelectorAll('.track-item').forEach(item => {
      item.addEventListener('click', () => {
        const trackId = item.getAttribute('data-track-id');
        const flattened = getFlattenedTracks(book);
        const targetIdx = flattened.findIndex(t => t.id === trackId);
        if (targetIdx !== -1) {
          playPlaylist(flattened, targetIdx);
          renderModalTracks(book, filter);
        }
      });
    });
  }

  // Playback Control
  function playBook(book) {
    const flattened = getFlattenedTracks(book);
    if (flattened.length === 0) {
      alert('This folder has no audio tracks.');
      return;
    }
    state.currentBook = book;
    playPlaylist(flattened, 0);
  }

  function playPlaylist(playlist, startIndex = 0) {
    state.currentPlaylist = playlist;
    state.currentIndex = startIndex;
    loadAndPlayTrack(playlist[startIndex]);
  }

  function loadAndPlayTrack(track) {
    if (!track) return;
    state.currentTrack = track;

    // Load Google Drive waveform preview player
    if (el.drivePlayerFrame) {
      el.drivePlayerFrame.src = `https://drive.google.com/file/d/${track.id}/preview`;
    }

    updatePlayerUI();
    addToHistory(track);

    if (el.playerBar) {
      el.playerBar.style.display = 'flex';
    }

    // Highlight current track in modal if open
    highlightModalTrack();
  }

  function highlightModalTrack() {
    if (!el.modalBody || !state.currentTrack) return;
    el.modalBody.querySelectorAll('.track-item').forEach(item => {
      const id = item.getAttribute('data-track-id');
      const isCurrent = id === state.currentTrack.id;
      item.classList.toggle('playing', isCurrent);
      const playIcon = item.querySelector('.track-play-btn');
      if (playIcon) playIcon.textContent = isCurrent ? '🔊' : '▶';
    });
  }

  function playNextTrack() {
    if (!state.currentPlaylist.length) return;
    if (state.currentIndex < state.currentPlaylist.length - 1) {
      state.currentIndex++;
      loadAndPlayTrack(state.currentPlaylist[state.currentIndex]);
    }
  }

  function playPrevTrack() {
    if (!state.currentPlaylist.length) return;
    if (state.currentIndex > 0) {
      state.currentIndex--;
      loadAndPlayTrack(state.currentPlaylist[state.currentIndex]);
    }
  }

  function updatePlayerUI() {
    if (!state.currentTrack) return;
    const t = state.currentTrack;

    if (el.playerTitle) el.playerTitle.textContent = formatTrackTitle(t.title);
    if (el.playerSubtitle) {
      el.playerSubtitle.textContent = t.bookName || 'Srila Prabhupada Audio Library';
    }
    if (el.playerTrackIndex) {
      const total = state.currentPlaylist.length;
      const cur = state.currentIndex + 1;
      el.playerTrackIndex.textContent = total > 0 ? `Track ${cur} of ${total}` : '';
    }
    if (el.btnDownload) {
      el.btnDownload.href = `https://drive.usercontent.google.com/download?id=${t.id}&export=download`;
      el.btnDownload.download = t.title;
    }
    if (el.btnDriveLink) {
      el.btnDriveLink.href = t.driveUrl || `https://drive.google.com/file/d/${t.id}/view`;
    }

    // Update Prev / Next button states
    if (el.btnPrev) {
      el.btnPrev.disabled = state.currentIndex <= 0;
      el.btnPrev.style.opacity = state.currentIndex <= 0 ? '0.4' : '1';
    }
    if (el.btnNext) {
      el.btnNext.disabled = state.currentIndex >= state.currentPlaylist.length - 1;
      el.btnNext.style.opacity = state.currentIndex >= state.currentPlaylist.length - 1 ? '0.4' : '1';
    }
  }

  function addToHistory(track) {
    state.history = state.history.filter(h => h.id !== track.id);
    state.history.unshift({
      id: track.id,
      title: track.title,
      bookName: track.bookName,
      timestamp: Date.now()
    });
    if (state.history.length > 50) state.history.pop();
    try {
      localStorage.setItem('sp_history', JSON.stringify(state.history));
    } catch (e) {}
  }

  // UI Event Bindings
  function bindEvents() {
    // Search
    if (el.searchInput) {
      el.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (el.searchClear) el.searchClear.style.display = state.searchQuery ? 'block' : 'none';
        renderBooks();
      });
    }

    if (el.searchClear) {
      el.searchClear.addEventListener('click', () => {
        state.searchQuery = '';
        if (el.searchInput) {
          el.searchInput.value = '';
          el.searchInput.focus();
        }
        el.searchClear.style.display = 'none';
        renderBooks();
      });
    }

    // Modal Search
    if (el.modalSearch) {
      el.modalSearch.addEventListener('input', (e) => {
        if (state.currentBook) renderModalTracks(state.currentBook, e.target.value);
      });
    }

    // Category Buttons
    el.categoryButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeCategory = btn.getAttribute('data-category');
        updateActiveCategoryPill();
        renderBooks();
      });
    });

    // Sort Select
    if (el.sortSelect) {
      el.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderBooks();
      });
    }

    // Theme Toggle
    if (el.themeToggle) {
      el.themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('sp_theme', newTheme);
        updateThemeIcon(newTheme);
      });
    }

    // Modal Close
    if (el.modalClose) el.modalClose.addEventListener('click', closeModal);
    if (el.bookModal) {
      el.bookModal.addEventListener('click', (e) => {
        if (e.target === el.bookModal) closeModal();
      });
    }

    // Transport buttons
    if (el.btnPrev) el.btnPrev.addEventListener('click', playPrevTrack);
    if (el.btnNext) el.btnNext.addEventListener('click', playNextTrack);

    // Close Player
    if (el.btnClosePlayer) {
      el.btnClosePlayer.addEventListener('click', () => {
        if (el.playerBar) el.playerBar.style.display = 'none';
        if (el.drivePlayerFrame) el.drivePlayerFrame.src = '';
      });
    }

    // Share Button
    if (el.btnShare) {
      el.btnShare.addEventListener('click', () => {
        if (!state.currentTrack) return;
        const url = `${window.location.origin}${window.location.pathname}?book=${state.currentTrack.bookId}&track=${state.currentTrack.id}`;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(() => {
            alert('Direct link to this audio track copied to clipboard!');
          });
        } else {
          prompt('Copy track URL:', url);
        }
      });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Ignore if inside an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
        if (e.key === 'Escape' && el.bookModal && el.bookModal.classList.contains('open')) {
          closeModal();
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === '[') {
        playPrevTrack();
      } else if (e.key === 'ArrowRight' || e.key === ']') {
        playNextTrack();
      } else if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === '/') {
        e.preventDefault();
        if (el.searchInput) el.searchInput.focus();
      }
    });

    // Check for Deep Link Query Parameters (?book=...&track=...)
    handleUrlParams();
  }

  function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('book');
    const trackId = params.get('track');

    if (bookId && state.books) {
      const book = state.books.find(b => b.id === bookId);
      if (book) {
        openBookModal(book);
        if (trackId) {
          const flattened = getFlattenedTracks(book);
          const idx = flattened.findIndex(t => t.id === trackId);
          if (idx !== -1) {
            playPlaylist(flattened, idx);
          }
        }
      }
    }
  }

  // Load Catalog Data
  async function init() {
    loadPreferences();
    bindEvents();

    try {
      // Fetch catalog
      const resp = await fetch('data/catalog.json');
      if (!resp.ok) throw new Error('Failed to load catalog');
      const data = await resp.json();

      state.catalog = data;
      state.books = data.books || [];

      // Update Hero Stats
      const statBooks = document.getElementById('statTotalBooks');
      const statTracks = document.getElementById('statTotalTracks');
      if (statBooks) statBooks.textContent = data.totalBooks || state.books.length;
      if (statTracks) statTracks.textContent = data.totalTracks ? data.totalTracks.toLocaleString() : '3,800+';

      renderBooks();
      handleUrlParams();
    } catch (err) {
      console.error('Failed to initialize library:', err);
      if (el.booksGrid) {
        el.booksGrid.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-icon">⚠️</div>
            <h3 class="empty-title">Error Loading Catalog</h3>
            <p class="empty-text">Could not load the audio catalog data. Please make sure data/catalog.json is present.</p>
          </div>
        `;
      }
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Register Service Worker for PWA / offline support
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('SW registration note:', err.message);
      });
    });
  }
})();
