import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// Auto-reload page when async dynamic imports fail due to post-deploy hash changes
window.addEventListener('unhandledrejection', (event) => {
  const isChunkLoadFailed = event.reason && (
    event.reason.name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(event.reason.message || '') ||
    /Failed to load module script/i.test(event.reason.message || '')
  );

  if (isChunkLoadFailed) {
    const key = 'chunk_reload_count';
    const count = parseInt(sessionStorage.getItem(key) || '0', 10);
    if (count < 2) {
      sessionStorage.setItem(key, String(count + 1));
      window.location.reload();
    }
  }
});

// Clear reload counter on normal load
sessionStorage.removeItem('chunk_reload_count');

createApp(App).mount('#app')

