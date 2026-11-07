# Śrīla Prabhupāda Audio Library 🪷

> A modern, elegant, fully responsive web application and audio streaming archive of the complete audio books collection of **His Divine Grace A.C. Bhaktivedanta Swami Prabhupāda**, Founder-Ācārya of the International Society for Krishna Consciousness (ISKCON).

[![GitHub Pages Deployment](https://img.shields.io/badge/GitHub%20Pages-Ready-success?logo=github)](https://pages.github.com/)
[![Audio Tracks](https://img.shields.io/badge/Audio%20Tracks-3%2C824-amber)](data/catalog.json)
[![Audio Books](https://img.shields.io/badge/Audio%20Books-168-orange)](data/catalog.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Backend](https://img.shields.io/badge/Architecture-Static%20Client--Side-green)]()

---

## 🌟 Highlights & Features

- **Direct Google Drive Audio Streaming**:
  - High-performance, zero-latency streaming directly from the public Google Drive collection using browser range requests (`Accept-Ranges: bytes`).
  - Native scrubber seeking, buffer status indicator, and instant track switching.
  - Optional fallback links and direct one-click MP3 download.

- **Devotional & Aesthetic UI**:
  - Warm devotional theme with saffron accents, gold highlights, and serif typography with full diacritics support (`ā, ī, ū, ṛ, ś, ṣ, ṇ, ṭ, ḍ`).
  - Seamless toggle between **Dark Mode** and **Light (Parchment) Mode**.
  - Fully responsive: beautiful across mobile phones, tablets, laptops, and wide screens.

- **Fast Instant Search & Filtering**:
  - Real-time search across all 168 audio books, cantos, volumes, and 3,820+ individual tracks.
  - Quick category tabs:
    - *Major Classics* (Bhagavad-gītā, Śrīmad-Bhāgavatam, Kṛṣṇa Book, Nectar of Devotion, etc.)
    - *Bhagavad-gītā As It Is*
    - *Śrīmad-Bhāgavatam* (Cantos 1–12)
    - *Caitanya Literatures* (Śrī Caitanya-caritāmṛta Adi, Madhya & Antya volumes)
    - *Biographies & Lilamrita*
    - *Purāṇas & Epics* (Padma Purāṇa, Mahābhārata, Rāmāyaṇa)
    - *Philosophy & Science* (Dialectic Spiritualism, Life Comes From Life, etc.)
    - *Songs & Prayers* (Vaisnava Songs, Saranagati, Gitavali)
    - *Goswami Literature*
    - *My Favorites* (saved to local storage)

- **Persistent Bottom Audio Player**:
  - Play / Pause / Next / Previous / Repeat (Off, All, One) / Shuffle.
  - **Quick Jump**: Rewind 15 seconds (`↺ 15s`) & Fast Forward 30 seconds (`30s ↻`).
  - **Variable Playback Speed**: 0.75x, 1.0x, 1.25x, 1.5x, 1.75x, 2.0x.
  - **Sleep Timer**: 15m, 30m, 45m, 60m with gentle volume fade-out.
  - **Media Session API**: Control audio playback from OS lockscreen, keyboard media keys, and Bluetooth headsets with cover art.
  - **Shareable Deep Links**: Share exact track URLs with `?book={id}&track={trackId}`.

- **PWA (Progressive Web App)**:
  - Installable on Android, iPhone (iOS), macOS, and Windows.
  - Instant loading and offline caching via Service Worker (`sw.js`).

---

## 🚀 How to Put This Library on GitHub & GitHub Pages

### Step 1: Initialize Git and Commit
Open PowerShell or your terminal in this project folder:

```bash
git init
git add .
git commit -m "Initial commit: Srila Prabhupada Audio Library"
```

### Step 2: Create a Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Enter a repository name, e.g., `prabhupada-audio-library` or `SrilaPrabhupadaLibrary`.
3. Choose **Public**.
4. Click **Create repository** (do *not* add README or .gitignore as they are already provided here).

### Step 3: Push Your Code
Link your local repository to GitHub and push to the `main` branch:

```bash
git branch -M main
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/<YOUR-REPO-NAME>.git
git push -u origin main
```

### Step 4: Enable GitHub Pages
1. On GitHub, navigate to your repository's **Settings** tab.
2. Click on **Pages** in the left sidebar (under "Code and automation").
3. Under **Build and deployment**:
   - **Source**: Select **GitHub Actions** (recommended, uses the included `.github/workflows/deploy.yml` workflow automatically) OR select **Deploy from a branch** -> branch `main` -> folder `/ (root)`.
4. Click **Save**.
5. Within 1–2 minutes, your website will be live at:
   ```
   https://<YOUR-GITHUB-USERNAME>.github.io/<YOUR-REPO-NAME>/
   ```

---

## 📁 Repository Structure

```
├── .github/
│   └── workflows/
│       └── deploy.yml      # Automated GitHub Pages deployment
├── assets/
│   └── icon.svg            # Transcendental Lotus & Tilak vector logo
├── data/
│   └── catalog.json        # 168 books & 3,824 tracks indexed with Google Drive IDs
├── scripts/
│   └── crawl_catalog.py    # Python script to re-crawl or update catalog from Drive
├── index.html              # Main single-page application
├── styles.css              # Responsive styles, themes, and animations
├── app.js                  # Client-side audio player and search controller
├── manifest.json           # Progressive Web App manifest
├── sw.js                   # Service worker for offline shell caching
├── .gitignore              # Ignored files (node_modules, caches, temp files)
└── README.md               # Documentation and setup guide
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / Pause audio |
| `←` (Left Arrow) | Rewind 15 seconds |
| `→` (Right Arrow) | Fast-forward 30 seconds |
| `/` | Focus search bar |
| `Esc` | Close track modal |

---

## 🔄 Updating the Catalog

If files or folders are added or updated in the public Google Drive folder in the future, you can refresh `data/catalog.json` by running:

```bash
python scripts/crawl_catalog.py
```

This will automatically re-scan the entire Google Drive directory tree, verify tracks, and output the updated `data/catalog.json`.

---

## 🙏 Dedication & Gratitude

This audio library is humbly dedicated to **His Divine Grace A.C. Bhaktivedanta Swami Prabhupāda**, who tirelessly traveled the globe twelve times and published over eighty volumes of authoritative, transcendental literature so that humanity could awaken to eternal love of God (Kṛṣṇa Prema).

*All glories to Śrī Guru and Gaurāṅga.*
