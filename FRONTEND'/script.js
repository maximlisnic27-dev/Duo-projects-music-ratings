 document.getElementById('hamburger').addEventListener('click', function() {
      document.getElementById('navLinks').classList.toggle('open');
    });
     const LASTFM_API_KEY = '300f20435acb7e89705c6a9cf807c4bd';
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';

const searchBtn = document.getElementById('searchBtn');
const musicInput = document.getElementById('musicInput');
const resultsContainer = document.getElementById('checkerResults');
function getFavorites() {
  return JSON.parse(localStorage.getItem('favorites') || '[]');
}

function saveFavorites(favs) {
  localStorage.setItem('favorites', JSON.stringify(favs));
}

function isFavorite(name, artist) {
  return getFavorites().some(f => f.name === name && f.artist === artist);
}

function toggleFavorite(track) {
  let favs = getFavorites();
  const exists = favs.some(f => f.name === track.name && f.artist === track.artist);
  if (exists) {
    favs = favs.filter(f => !(f.name === track.name && f.artist === track.artist));
  } else {
    favs.push(track);
  }
  saveFavorites(favs);
  renderFavorites();
  document.querySelectorAll('.fav-btn').forEach(btn => {
    const n = btn.getAttribute('data-name');
    const a = btn.getAttribute('data-artist');
    btn.textContent = isFavorite(n, a) ? '❤️' : '🤍';
  });
}

function renderFavorites() {
  const container = document.getElementById('favoritesResults');
  if (!container) return;
  const favs = getFavorites();
  if (favs.length === 0) {
    container.innerHTML = '<p class="checker-placeholder">Nicio melodie la favorite...</p>';
    return;
  }
  container.innerHTML = favs.map(t => {
    const ytQuery = encodeURIComponent(`${t.name} ${t.artist}`);
    const ytUrl = `https://www.youtube.com/results?search_query=${ytQuery}`;
    const cover = t.img
      ? `<img class="song-cover" src="${t.img}" alt="${t.name}" onerror="this.outerHTML='<div class=\\'song-cover-placeholder\\'>🎵</div>'">`
      : `<div class="song-cover-placeholder">🎵</div>`;
    const trackData = encodeURIComponent(JSON.stringify(t));
    return `
      <div class="song-card">
        <a href="${ytUrl}" target="_blank" rel="noopener noreferrer"
           style="display:flex;align-items:center;gap:16px;flex:1;text-decoration:none;color:inherit;">
          ${cover}
          <div class="song-info">
            <div class="song-name">${t.name}</div>
            <div class="song-artist">${t.artist}</div>
            <div class="song-listeners">🎵 ${t.listeners} listeners</div>
          </div>
        </a>
        <button class="fav-btn" data-name="${t.name}" data-artist="${t.artist}"
          onclick="toggleFavorite(JSON.parse(decodeURIComponent('${trackData}')))"
          title="Sterge din favorite">❤️</button>
      </div>`;
  }).join('');
}

renderFavorites();

searchBtn.addEventListener('click', () => {
  const q = musicInput.value.trim();
  if (q) searchMusic(q);
});

musicInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const q = musicInput.value.trim();
    if (q) searchMusic(q);
  }
});

async function searchMusic(query) {
  resultsContainer.innerHTML = `<p class="checker-placeholder">Searching...</p>`;
  searchBtn.disabled = true;

  try {
    const url = `${LASTFM_BASE}?method=track.search&track=${encodeURIComponent(query)}&api_key=${LASTFM_API_KEY}&format=json&limit=6`;
    const res = await fetch(url);
    const data = await res.json();
    const tracks = data?.results?.trackmatches?.track;

    if (!tracks || tracks.length === 0) {
      resultsContainer.innerHTML = `<p class="checker-placeholder">Nothing found...</p>`;
      return;
    }

    // Fetch detalii (inclusiv imagine album) pentru fiecare track
    const detailed = await Promise.all(tracks.map(t => getTrackInfo(t.name, t.artist)));
    showResults(detailed);

  } catch {
    resultsContainer.innerHTML = `<p class="checker-placeholder" style="color:red;">Error. Check your API key.</p>`;
  } finally {
    searchBtn.disabled = false;
  }
}

async function getTrackInfo(trackName, artistName) {
  try {
    const url = `${LASTFM_BASE}?method=track.getInfo&track=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    return data.track || { name: trackName, artist: { name: artistName } };
  } catch {
    return { name: trackName, artist: { name: artistName } };
  }
}

function getImage(images) {
  if (!images) return null;
  const preferred = ['large', 'extralarge', 'medium'];
  for (const size of preferred) {
    const img = images.find(i => i.size === size);
    if (img?.['#text'] && img['#text'].length > 0) return img['#text'];
  }
  return null;
}

function showResults(tracks) {
  resultsContainer.innerHTML = tracks.map(t => {
    const name = t.name || '—';
    const artist = t.artist?.name || t.artist || '—';
    const listeners = formatNum(t.listeners);
    const imgUrl = getImage(t.album?.image);
    const fav = isFavorite(name, artist);

    const cover = imgUrl
      ? `<img class="song-cover" src="${imgUrl}" alt="${name}" onerror="this.outerHTML='<div class=\\'song-cover-placeholder\\'>🎵</div>'">`
      : `<div class="song-cover-placeholder">🎵</div>`;

    const ytQuery = encodeURIComponent(`${name} ${artist}`);
    const ytUrl = `https://www.youtube.com/results?search_query=${ytQuery}`;
    const trackData = encodeURIComponent(JSON.stringify({ name, artist, listeners, img: imgUrl || '' }));

    return `
      <a class="song-card" href="${ytUrl}" target="_blank" rel="noopener noreferrer">
        ${cover}
        <div class="song-info">
          <div class="song-name">${name}</div>
          <div class="song-artist">${artist}</div>
          <div class="song-listeners">🎵 ${listeners} listeners</div>
        </div>
        <button class="fav-btn" data-name="${name}" data-artist="${artist}"
          onclick="event.preventDefault(); toggleFavorite(JSON.parse(decodeURIComponent('${trackData}')))"
          title="${fav ? 'Sterge din favorite' : 'Adauga la favorite'}">${fav ? '❤️' : '🤍'}</button>
      </a>`;
  }).join('');
}

function formatNum(n) {
  const num = parseInt(n, 10);
  if (isNaN(num)) return '—';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}