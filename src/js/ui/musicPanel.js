// Audio panels (Section 5.11): cabin ambience + optional lofi music, both
// official YouTube embeds. Offline → friendly note; NEVER blocks the flight.
import * as store from '../store.js';

/** Convert any YouTube URL (watch, share, playlist, embed) to an embed URL.
 *  Returns null when the URL isn't recognizably YouTube. */
export function toEmbedUrl(raw) {
  let url;
  try { url = new URL(raw.trim()); } catch { return null; }
  const host = url.hostname.replace(/^www\./, '');
  const base = 'https://www.youtube-nocookie.com/embed';
  if (!['youtube.com', 'youtube-nocookie.com', 'youtu.be', 'm.youtube.com', 'music.youtube.com'].includes(host)) return null;

  const list = url.searchParams.get('list');
  let id = null;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
  else if (url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2];
  else if (url.pathname === '/watch') id = url.searchParams.get('v');

  if (id) {
    // loop a single video via the playlist trick; playlists loop natively
    const extra = list ? `list=${list}` : `playlist=${id}`;
    return `${base}/${id}?autoplay=1&loop=1&${extra}`;
  }
  if (list) return `${base}/videoseries?list=${list}&autoplay=1&loop=1`;
  return null;
}

export function mountMusicPanel(parentEl, settings) {
  const panel = document.createElement('div');
  panel.className = 'audio-dock';
  parentEl.appendChild(panel);

  function render() {
    if (!navigator.onLine) {
      panel.innerHTML = `
        <div class="audio-section">
          <div class="offline-note">✈ Offline — connect to the internet for ambience &amp; music.
          Your flight continues either way.</div>
        </div>`;
      return;
    }
    const ambience = toEmbedUrl(settings.ambienceDefaultUrl) ?? settings.ambienceDefaultUrl + '?autoplay=1';
    panel.innerHTML = `
      <div class="audio-section" id="sec-ambience">
        <div class="head"><span>🎧 Cabin ambience</span><button data-toggle="sec-ambience">hide</button></div>
        <iframe src="${ambience}" allow="autoplay; encrypted-media" title="Cabin ambience"></iframe>
      </div>
      <div class="audio-section collapsed" id="sec-music">
        <div class="head"><span>🎵 Music</span><button data-toggle="sec-music">show</button></div>
        <div class="music-body">
          <form id="music-form">
            <input type="text" id="music-url" placeholder="Paste a YouTube link…"
                   value="${settings.musicPanelDefaultUrl}" spellcheck="false" />
            <button type="submit">Play</button>
          </form>
          <div class="field-error" id="music-err"></div>
          <div id="music-frame"></div>
        </div>
      </div>`;

    panel.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sec = panel.querySelector('#' + btn.dataset.toggle);
        const collapsed = sec.classList.toggle('collapsed');
        btn.textContent = collapsed ? 'show' : 'hide';
      });
    });

    panel.querySelector('#music-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = panel.querySelector('#music-url').value;
      const embed = toEmbedUrl(raw);
      const err = panel.querySelector('#music-err');
      if (!embed) { err.textContent = 'That doesn’t look like a YouTube link.'; return; }
      err.textContent = '';
      panel.querySelector('#music-frame').innerHTML =
        `<iframe src="${embed}" allow="autoplay; encrypted-media" title="Music"></iframe>`;
      // remember the last URL they chose as the new default
      settings.musicPanelDefaultUrl = raw.trim();
      store.save();
    });
  }

  render();
  window.addEventListener('online', render);
  window.addEventListener('offline', render);
}
