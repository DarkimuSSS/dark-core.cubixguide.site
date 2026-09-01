<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import HomePage from './components/HomePage.vue';
import GuideEditor from './components/GuideEditor.vue';
import GuideView from './components/GuideView.vue';
import AuthorProfileModal from './components/AuthorProfileModal.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import IconRenderer from './components/IconRenderer.vue';
import AuthModal from './components/AuthModal.vue';
import SiteFooter from './components/SiteFooter.vue';
import TermsModal from './components/TermsModal.vue';
import CookieBanner from './components/CookieBanner.vue';
import { PRESET_ITEMS } from './data/presetItems';
import type { Guide, AuthorProfile } from './types/guide';

const isTermsOpen = ref(false);

const guides = ref<Guide[]>([]);
const activeGuideId = ref<string>('');
const activeGuide = ref<Guide | null>(null);

// MODE: 'home' (Главная) | 'reader' (Вики Гайда) | 'editor' (Конструктор) | 'favorites' (Избранное)
const mode = ref<'home' | 'reader' | 'editor' | 'favorites'>('home');
const isLoading = ref<boolean>(true);

// Bookmarked / Favorited guide IDs in LocalStorage
const favoriteGuideIds = ref<string[]>([]);

// Author Profile Modal & Current Logged In User
const isProfileModalOpen = ref(false);
const profileUsername = ref('DarkimuSSS');
const currentUsername = ref<string | null>(null);
const currentUserIsAdmin = ref<boolean>(false);
const currentAuthorProfile = ref<AuthorProfile | null>(null);

// Auth & Protection State
const isAuthModalOpen = ref(false);
const isAuthenticated = ref(false);

const hasUnsavedDraft = ref<boolean>(false);
const draftSavedTime = ref<string>('');

// Notification Toast
const toastMessage = ref('');
const showToast = (msg: string) => {
  toastMessage.value = msg;
  setTimeout(() => {
    toastMessage.value = '';
  }, 3000);
};

const authorProfilesMap = ref<Record<string, { avatarUrl?: string; isVerified?: boolean }>>({});

const fetchCurrentAuthorProfile = async (usernameToFetch?: string) => {
  const targetUser = usernameToFetch || currentUsername.value || 'DarkimuSSS';
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(targetUser)}`);
    if (res.ok) {
      const data = await res.json();
      currentAuthorProfile.value = data;
      authorProfilesMap.value[targetUser.toLowerCase()] = {
        avatarUrl: data.avatarUrl,
        isVerified: Boolean(data.isVerified)
      };
    }
  } catch (err) {
    console.error('Error fetching header author profile:', err);
  }
};

const fetchAuthorProfiles = async () => {
  const authors = Array.from(new Set(guides.value.map(g => g.meta.author).filter(Boolean)));
  for (const author of authors) {
    if (authorProfilesMap.value[author.toLowerCase()]) continue;
    try {
      const res = await fetch(`/api/profiles/${encodeURIComponent(author)}`);
      if (res.ok) {
        const data = await res.json();
        authorProfilesMap.value[author.toLowerCase()] = {
          avatarUrl: data.avatarUrl,
          isVerified: Boolean(data.isVerified)
        };
      }
    } catch (e) {}
  }
};

watch(guides, () => {
  fetchAuthorProfiles();
}, { deep: true });

const openAuthorProfile = (username?: string) => {
  profileUsername.value = username || currentUsername.value || activeGuide.value?.meta.author || 'DarkimuSSS';
  isProfileModalOpen.value = true;
};

// URL Query Parameters Sync (tab=...&guide=...)
const updateUrlRoute = () => {
  const params = new URLSearchParams();

  if (isProfileModalOpen.value && profileUsername.value) {
    params.set('tab', 'Профиль');
    params.set('author', profileUsername.value);
  } else if (mode.value === 'home') {
    params.set('tab', 'Главная');
  } else if (mode.value === 'reader') {
    params.set('tab', 'Вики');
    if (activeGuideId.value) params.set('guide', activeGuideId.value);
  } else if (mode.value === 'editor') {
    params.set('tab', 'Конструктор');
    if (activeGuideId.value) params.set('guide', activeGuideId.value);
  } else if (mode.value === 'favorites') {
    params.set('tab', 'Закладки');
  }

  const queryString = params.toString() ? `?${params.toString()}` : '/';
  if (window.location.search !== `?${params.toString()}` && window.location.pathname + window.location.search !== queryString) {
    window.history.pushState({ mode: mode.value, guideId: activeGuideId.value }, '', queryString);
  }
};

const syncFromUrlPath = () => {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const guideParam = params.get('guide');
  const authorParam = params.get('author');

  if (authorParam && tab === 'Профиль') {
    profileUsername.value = authorParam;
    isProfileModalOpen.value = true;
  }

  if (guideParam) {
    activeGuideId.value = guideParam;
    const found = guides.value.find(g => g.meta.id === guideParam);
    if (found) activeGuide.value = JSON.parse(JSON.stringify(found));
  }

  if (tab === 'Вики' || tab === 'reader') {
    mode.value = 'reader';
  } else if (tab === 'Конструктор' || tab === 'editor') {
    mode.value = isAuthenticated.value ? 'editor' : 'reader';
  } else if (tab === 'Закладки' || tab === 'favorites') {
    mode.value = 'favorites';
  } else if (tab !== 'Профиль') {
    mode.value = 'home';
  }
};

watch([mode, activeGuideId, isProfileModalOpen, profileUsername], () => {
  updateUrlRoute();
});

// Check Session Auth Status & Favorites
onMounted(() => {
  const savedUser = localStorage.getItem('cubix_logged_username');
  const savedAdmin = localStorage.getItem('cubix_logged_is_admin');
  if (savedUser) {
    isAuthenticated.value = true;
    currentUsername.value = savedUser;
    currentUserIsAdmin.value = savedAdmin === 'true';
    fetchCurrentAuthorProfile(savedUser);
  }
  try {
    const rawFavs = localStorage.getItem('cubix_favorite_guides');
    if (rawFavs) favoriteGuideIds.value = JSON.parse(rawFavs);
  } catch (e) {}

  fetchGuides();
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('popstate', handlePopState);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  window.removeEventListener('popstate', handlePopState);
});

const handlePopState = () => {
  syncFromUrlPath();
};

const toggleBookmarkGuide = (guideId: string) => {
  if (favoriteGuideIds.value.includes(guideId)) {
    favoriteGuideIds.value = favoriteGuideIds.value.filter(id => id !== guideId);
    showToast('Удалено из закладок');
  } else {
    favoriteGuideIds.value.push(guideId);
    showToast('Добавлено в закладки ⭐');
  }
  localStorage.setItem('cubix_favorite_guides', JSON.stringify(favoriteGuideIds.value));
};

const favoritedGuidesList = computed(() => {
  return guides.value.filter(g => favoriteGuideIds.value.includes(g.meta.id));
});

const currentUserCanEditOthers = ref<boolean>(false);
const currentUserCanCreateGuides = ref<boolean>(true);

const canUserEditActiveGuide = computed(() => {
  if (!isAuthenticated.value || !currentUsername.value || !activeGuide.value) return false;
  
  // Super Admin or Users with explicitly granted canEditOthers permission can edit all guides
  if (currentUserIsAdmin.value || currentUserCanEditOthers.value) return true;
  
  const authorName = (activeGuide.value.meta.author || '').toLowerCase().trim();
  const currentName = currentUsername.value.toLowerCase().trim();
  if (authorName === currentName) return true;
  
  // Co-authors can also edit
  const coAuthors = (activeGuide.value.meta.coAuthors || []).map(s => s.toLowerCase().trim());
  if (coAuthors.includes(currentName)) return true;
  
  return false;
});

const openEditorProtection = () => {
  if (!isAuthenticated.value) {
    isAuthModalOpen.value = true;
    return;
  }
  
  if (canUserEditActiveGuide.value) {
    mode.value = 'editor';
  } else {
    showToast(`У вас нет прав на редактирование чужого гайда (Автор: ${activeGuide.value?.meta.author})`);
  }
};

const handleAuthentication = (payload: { username: string; isAdmin: boolean; canEditOthers?: boolean; canCreateGuides?: boolean }) => {
  isAuthenticated.value = true;
  currentUsername.value = payload.username;
  currentUserIsAdmin.value = payload.isAdmin;
  currentUserCanEditOthers.value = Boolean(payload.canEditOthers);
  currentUserCanCreateGuides.value = payload.canCreateGuides !== undefined ? Boolean(payload.canCreateGuides) : true;

  localStorage.setItem('cubix_logged_username', payload.username);
  localStorage.setItem('cubix_logged_is_admin', payload.isAdmin ? 'true' : 'false');
  localStorage.setItem('cubix_logged_can_edit_others', payload.canEditOthers ? 'true' : 'false');
  isAuthModalOpen.value = false;
  fetchCurrentAuthorProfile(payload.username);
  showToast(`Добро пожаловать, ${payload.username}!`);
};

const logoutAuthor = () => {
  isAuthenticated.value = false;
  currentUsername.value = null;
  currentUserIsAdmin.value = false;
  currentAuthorProfile.value = null;
  localStorage.removeItem('cubix_logged_username');
  localStorage.removeItem('cubix_logged_is_admin');
  mode.value = 'home';
  showToast('Вы вышли из аккаунта');
};

// Check & Save Draft in LocalStorage
const getDraftKey = (id: string) => `cubixguide_draft_${id}`;

const saveDraftToLocalStorage = (guide: Guide) => {
  try {
    const draftData = {
      timestamp: new Date().toLocaleTimeString(),
      guide
    };
    localStorage.setItem(getDraftKey(guide.meta.id), JSON.stringify(draftData));
    hasUnsavedDraft.value = true;
    draftSavedTime.value = draftData.timestamp;
  } catch (err) {
    console.error('LocalStorage write error:', err);
  }
};

const checkDraftInLocalStorage = (guideId: string) => {
  try {
    const raw = localStorage.getItem(getDraftKey(guideId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.guide) {
        hasUnsavedDraft.value = true;
        draftSavedTime.value = parsed.timestamp || '';
        return parsed.guide as Guide;
      }
    }
  } catch (err) {
    console.error('LocalStorage read error:', err);
  }
  hasUnsavedDraft.value = false;
  return null;
};

const clearDraftLocalStorage = (id: string) => {
  localStorage.removeItem(getDraftKey(id));
  hasUnsavedDraft.value = false;
};

const restoreDraft = () => {
  if (!activeGuideId.value) return;
  const draft = checkDraftInLocalStorage(activeGuideId.value);
  if (draft) {
    activeGuide.value = JSON.parse(JSON.stringify(draft));
    showToast('Черновик успешно восстановлен!');
  }
};

const discardDraft = () => {
  if (!activeGuideId.value) return;
  clearDraftLocalStorage(activeGuideId.value);
  const found = guides.value.find(g => g.meta.id === activeGuideId.value);
  if (found) {
    activeGuide.value = JSON.parse(JSON.stringify(found));
  }
  showToast('Черновик сброшен');
};

// Prevent accidental tab close/refresh if draft exists
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasUnsavedDraft.value) {
    e.preventDefault();
    e.returnValue = 'У вас есть несохраненные изменения в гайде.';
  }
};

// Fetch guides from backend API
const fetchGuides = async (silent: boolean = false) => {
  try {
    if (!silent) isLoading.value = true;
    const res = await fetch('/api/guides');
    if (!res.ok) throw new Error('Ошибка загрузки данных');
    const data: Guide[] = await res.json();
    guides.value = data;

    if (data.length > 0) {
      syncFromUrlPath();
      if (!activeGuideId.value || !data.some(g => g.meta.id === activeGuideId.value)) {
        activeGuideId.value = data[0].meta.id;
      }
      const draft = checkDraftInLocalStorage(activeGuideId.value);
      if (draft && isAuthenticated.value) {
        activeGuide.value = draft;
      } else {
        const current = data.find(g => g.meta.id === activeGuideId.value);
        if (current) activeGuide.value = JSON.parse(JSON.stringify(current));
      }
    } else {
      activeGuide.value = null;
    }
  } catch (err: any) {
    console.error(err);
    showToast('Ошибка загрузки гайдов');
  } finally {
    if (!silent) isLoading.value = false;
  }
};

const selectGuide = (guideId: string) => {
  activeGuideId.value = guideId;
  const draft = checkDraftInLocalStorage(guideId);
  if (draft && isAuthenticated.value) {
    activeGuide.value = draft;
    showToast(`Загружен черновик (${draftSavedTime.value})`);
  } else {
    const found = guides.value.find(g => g.meta.id === guideId);
    if (found) {
      activeGuide.value = JSON.parse(JSON.stringify(found));
    }
  }
  mode.value = 'reader';
};

const openRandomGuide = () => {
  if (guides.value.length === 0) return;
  const randomIdx = Math.floor(Math.random() * guides.value.length);
  const randomGuide = guides.value[randomIdx];
  selectGuide(randomGuide.meta.id);
  showToast(`Случайный гайд: ${randomGuide.meta.title}`);
};

const handleHomeSelectGuide = (guideId: string) => {
  selectGuide(guideId);
};

const updateActiveGuide = (updated: Guide) => {
  activeGuide.value = updated;
  saveDraftToLocalStorage(updated);
};

const createNewGuide = async () => {
  if (!isAuthenticated.value) {
    isAuthModalOpen.value = true;
    return;
  }

  const authorName = currentUsername.value || 'DarkimuSSS';

  const newGuide: Guide = {
    meta: {
      id: `guide_${Date.now()}`,
      title: 'Новый майнкрафт гайд',
      category: 'ХайТек',
      author: authorName,
      difficulty: 'Новичок',
      summary: 'Новое руководство по сборке.',
      updatedAt: new Date().toISOString().split('T')[0],
      published: true
    },
    blocks: [
      {
        id: `b_${Date.now()}_1`,
        type: 'heading',
        headingText: 'Обзор и требования',
        headingLevel: 'h1'
      },
      {
        id: `b_${Date.now()}_2`,
        type: 'text',
        textContent: 'Опишите шаги постройки или крафта здесь...'
      },
      {
        id: `b_${Date.now()}_3`,
        type: 'callout',
        calloutType: 'tip',
        calloutTitle: 'Совет для игроков',
        calloutText: 'Проверяйте рецепты в JEI / REI перед крафтом.'
      },
      {
        id: `b_${Date.now()}_4`,
        type: 'checklist',
        checklistTitle: 'Этапы выполнения',
        checklistItems: [
          { id: 'c1', text: 'Собрать ресурсы', completed: false }
        ]
      }
    ]
  };

  try {
    const res = await fetch('/api/guides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGuide)
    });

    if (res.ok) {
      guides.value.unshift(newGuide);
      activeGuideId.value = newGuide.meta.id;
      activeGuide.value = newGuide;
      saveDraftToLocalStorage(newGuide);
      mode.value = 'editor';
      showToast('Создан новый гайд!');
    }
  } catch (err) {
    console.error('Ошибка создания:', err);
    showToast('Ошибка сохранения');
  }
};

const handlePublish = async () => {
  if (!activeGuide.value) return;
  if (!canUserEditActiveGuide.value) {
    showToast(`У вас нет прав для сохранения изменений в чужом гайде (Автор: ${activeGuide.value.meta.author})`);
    return;
  }
  activeGuide.value.meta.published = true;
  activeGuide.value.meta.updatedAt = new Date().toISOString().split('T')[0];

  try {
    const authorUser = currentUsername.value || '';
    let res = await fetch(`/api/guides/${activeGuide.value.meta.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-author-username': authorUser
      },
      body: JSON.stringify(activeGuide.value)
    });

    if (!res.ok) {
      // Fallback to POST if guide is not present in SQLite database yet
      res = await fetch('/api/guides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-author-username': authorUser
        },
        body: JSON.stringify(activeGuide.value)
      });
    }

    if (res.ok) {
      const savedGuide = await res.json();
      const idx = guides.value.findIndex(g => g.meta.id === activeGuide.value?.meta.id);
      if (idx !== -1) {
        guides.value[idx] = savedGuide;
      } else {
        guides.value.unshift(savedGuide);
      }
      activeGuide.value = savedGuide;
      clearDraftLocalStorage(savedGuide.meta.id);
      showToast('Гайд успешно сохранен в базу данных!');
      mode.value = 'reader';
      await fetchGuides();
    } else {
      const errData = await res.json();
      showToast(errData.error || 'Ошибка при сохранении гайда');
    }
  } catch (err) {
    console.error('Ошибка сохранения:', err);
    showToast('Ошибка при сохранении гайда');
  }
};

const isDeleteGuideConfirmOpen = ref(false);

const requestDeleteGuide = () => {
  if (!canUserEditActiveGuide.value) {
    showToast(`У вас нет прав для удаления чужого гайда (Автор: ${activeGuide.value?.meta.author})`);
    return;
  }
  isDeleteGuideConfirmOpen.value = true;
};

// Delete a guide by ID directly from the catalog (admin quick-delete)
const pendingDeleteGuideId = ref<string>('');
const requestDeleteGuideById = (guideId: string) => {
  if (!currentUserIsAdmin.value) return;
  pendingDeleteGuideId.value = guideId;
  isDeleteGuideConfirmOpen.value = true;
};

const confirmDeleteGuideById = async () => {
  isDeleteGuideConfirmOpen.value = false;
  const guideId = pendingDeleteGuideId.value || activeGuide.value?.meta.id;
  if (!guideId) return;
  pendingDeleteGuideId.value = '';
  try {
    const authorUser = currentUsername.value || '';
    const res = await fetch(`/api/guides/${guideId}?requestingUsername=${encodeURIComponent(authorUser)}`, {
      method: 'DELETE',
      headers: { 'x-author-username': authorUser }
    });
    if (res.ok) {
      clearDraftLocalStorage(guideId);
      guides.value = guides.value.filter(g => g.meta.id !== guideId);
      showToast('Гайд успешно удалён');
      await fetchGuides(true);
      if (activeGuide.value?.meta.id === guideId) mode.value = 'home';
    } else {
      showToast('Ошибка при удалении гайда');
    }
  } catch (e) {
    showToast('Ошибка сети при удалении');
  }
};

const confirmDeleteGuide = async () => {
  isDeleteGuideConfirmOpen.value = false;
  if (!activeGuide.value) return;
  const guideId = activeGuide.value.meta.id;
  try {
    const authorUser = currentUsername.value || '';
    const res = await fetch(`/api/guides/${guideId}?requestingUsername=${encodeURIComponent(authorUser)}`, {
      method: 'DELETE',
      headers: {
        'x-author-username': authorUser
      }
    });
    if (res.ok) {
      clearDraftLocalStorage(guideId);
      showToast('Гайд успешно удален');
      await fetchGuides();
      mode.value = 'home';
    } else {
      const errData = await res.json();
      showToast(errData.error || 'Ошибка при удалении гайда');
    }
  } catch (err) {
    console.error('Ошибка удаления:', err);
    showToast('Ошибка при удалении гайда');
  }
};

const initialCatalogSearchQuery = ref('');

const handleViewAllAuthorGuides = (username: string) => {
  initialCatalogSearchQuery.value = username;
  mode.value = 'home';
  isProfileModalOpen.value = false;
  showToast(`Показаны все гайды автора ${username}`);
};
</script>

<template>
  <div class="h-screen w-screen overflow-hidden bg-[#0c0d0e] text-[#e2e8f0] font-sans antialiased flex flex-col">
    <!-- SINGLE UNIFIED TOP HEADER BAR -->
    <header class="bg-[#16181a] border-b border-[#26292d] h-16 shrink-0 px-4 sm:px-8 flex items-center justify-between z-40 shadow-xl">
      <div class="flex items-center gap-4">
        <!-- Logo -->
        <button 
          @click="mode = 'home'"
          class="flex items-center gap-3 group text-left transition-opacity hover:opacity-90"
        >
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 p-0.5 shadow-lg shadow-emerald-950/50 overflow-hidden">
            <div class="w-full h-full bg-[#0c0d0e] rounded-[10px] flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform overflow-hidden">
              <img src="/logo.jpg" alt="CubixGuide Logo" class="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-base font-extrabold text-white tracking-tight">CubixGuide</span>
              <span class="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">База Знаний</span>
            </div>
            <p class="text-[11px] text-dark-muted hidden sm:block">Интерактивные руководства для игроков</p>
          </div>
        </button>

        <!-- Expanded Top Navigation Tabs Bar -->
        <nav class="hidden md:flex items-center bg-[#0c0d0e] p-1 rounded-xl border border-[#26292d] ml-2">
          <!-- 1. Главная -->
          <button
            type="button"
            @click="mode = 'home'"
            :class="[
              'px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
              mode === 'home'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-dark-muted hover:text-white'
            ]"
          >
            <IconRenderer name="Home" size="14" />
            <span>Главная</span>
          </button>

          <!-- 2. Вики Статья -->
          <button
            v-if="activeGuide"
            type="button"
            @click="mode = 'reader'"
            :class="[
              'px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
              mode === 'reader'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-dark-muted hover:text-white'
            ]"
          >
            <IconRenderer name="BookOpen" size="14" />
            <span>Вики Статья</span>
          </button>

          <!-- 3. Избранное / Закладки -->
          <button
            type="button"
            @click="mode = 'favorites'"
            :class="[
              'px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
              mode === 'favorites'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-dark-muted hover:text-white'
            ]"
          >
            <IconRenderer name="Star" size="14" class="text-amber-400" />
            <span>Закладки</span>
            <span v-if="favoriteGuideIds.length > 0" class="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full font-bold">
              {{ favoriteGuideIds.length }}
            </span>
          </button>

          <!-- 4. Случайный гайд -->
          <button
            type="button"
            @click="openRandomGuide"
            class="px-3 py-1.5 rounded-lg text-xs font-bold text-purple-400 hover:text-purple-300 hover:bg-[#16181a] flex items-center gap-1.5 transition-all"
            title="Открыть случайную полезную статью из базы"
          >
            <IconRenderer name="Sparkles" size="14" />
            <span>Случайный</span>
          </button>
        </nav>
      </div>

      <!-- Center & Right Navigation Actions -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Draft restoration banner -->
        <div v-if="hasUnsavedDraft && isAuthenticated" class="hidden lg:flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl">
          <IconRenderer name="Sliders" size="14" class="text-amber-400 animate-pulse" />
          <span class="text-[11px] text-amber-300 font-semibold">Черновик ({{ draftSavedTime }})</span>
          <button @click="restoreDraft" class="text-[10px] bg-amber-600 text-white font-bold px-2 py-0.5 rounded hover:bg-amber-500 transition-colors">
            Восстановить
          </button>
          <button @click="discardDraft" class="text-[10px] text-amber-400 hover:text-white px-1">
            Сбросить
          </button>
        </div>

        <!-- Author Profile Quick Trigger Button with Live Avatar & Nickname -->
        <button
          v-if="isAuthenticated && currentUsername"
          type="button"
          @click="openAuthorProfile(currentUsername)"
          class="px-3.5 py-1.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-2 transition-all shadow-md group"
          title="Открыть ваш профиль"
        >
          <div class="w-6 h-6 rounded-full bg-purple-500/30 border border-purple-400/40 text-purple-200 flex items-center justify-center font-bold text-[11px] overflow-hidden flex-shrink-0">
            <img v-if="currentAuthorProfile?.avatarUrl" :src="currentAuthorProfile.avatarUrl" class="w-full h-full object-cover" />
            <span v-else>{{ currentUsername.charAt(0).toUpperCase() }}</span>
          </div>
          <span class="font-extrabold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1">
            <span>{{ currentUsername }}</span>
            <span v-if="currentUserIsAdmin" class="text-[9px] bg-purple-500/30 text-purple-300 border border-purple-400/40 px-1 rounded font-mono">Админ</span>
          </span>
        </button>

        <button
          v-if="isAuthenticated"
          type="button"
          @click="createNewGuide"
          class="px-3.5 py-2 rounded-xl bg-[#121416] hover:bg-[#212429] border border-[#26292d] text-cyan-400 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
        >
          <IconRenderer name="Plus" size="15" />
          <span class="hidden sm:inline">Новый гайд</span>
        </button>

        <!-- Viewer Mode & Manual Author Login Button -->
        <div v-if="!isAuthenticated">
          <button
            type="button"
            @click="openEditorProtection"
            class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-950/50"
          >
            <IconRenderer name="Lock" size="14" />
            <span>Вход для Авторов</span>
          </button>
        </div>

        <!-- Authenticated Author Toggles -->
        <div v-else class="flex items-center gap-2">
          <button
            type="button"
            @click="mode = 'editor'"
            :class="[
              'px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all',
              mode === 'editor' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-[#121416] text-emerald-400 border border-emerald-500/30 hover:bg-[#212429]'
            ]"
          >
            <IconRenderer name="Edit3" size="14" />
            <span>Конструктор</span>
          </button>

          <button
            type="button"
            @click="logoutAuthor"
            class="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition-all"
            title="Выйти из аккаунта"
          >
            <IconRenderer name="X" size="14" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Container (Global Unified Scrollbar) -->
    <main class="flex-1 overflow-y-auto custom-scrollbar relative">
      <div v-if="isLoading" class="flex flex-col items-center justify-center h-full text-dark-muted space-y-3">
        <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <div class="text-xs">Загрузка гайдов...</div>
      </div>

      <template v-else>
        <!-- 1. HOMEPAGE CATALOG VIEW (DEFAULT LANDING) -->
        <div v-if="mode === 'home'" class="px-3 sm:px-4 pt-4">
          <HomePage
            :guides="guides"
            :initial-search-query="initialCatalogSearchQuery"
            :is-admin="currentUserIsAdmin"
            :can-edit-others="canUserEditActiveGuide"
            :current-username="currentUsername || ''"
            @select-guide="handleHomeSelectGuide"
            @create-guide="createNewGuide"
            @open-author="openAuthorProfile"
            @delete-guide="requestDeleteGuideById"
          />
          <SiteFooter
            :guides-count="guides.length"
            @navigate="(m) => { mode = m; initialCatalogSearchQuery = ''; }"
            @open-author="openAuthorProfile"
            @open-terms="isTermsOpen = true"
          />
        </div>

        <!-- 2. BOOKMARKS / FAVORITES VIEW -->
        <div v-else-if="mode === 'favorites'" class="px-3 sm:px-4 pt-4 space-y-6 pb-24">
          <div class="flex items-center justify-between border-b border-[#26292d] pb-4">
            <div>
              <h2 class="text-xl font-bold text-white flex items-center gap-2">
                <IconRenderer name="Star" size="22" class="text-amber-400" />
                Закладки статей ({{ favoritedGuidesList.length }})
              </h2>
              <p class="text-xs text-dark-muted">Сохранённые руководства для быстрого доступа</p>
            </div>
            <button @click="mode = 'home'" class="text-xs text-cyan-400 hover:underline">Вернуться на Главную</button>
          </div>

          <div v-if="favoritedGuidesList.length === 0" class="text-center py-20 bg-[#16181a] border border-[#26292d] rounded-2xl space-y-3">
            <IconRenderer name="Star" size="36" class="mx-auto text-amber-400/40" />
            <h3 class="text-base font-bold text-white">В закладках пока пусто</h3>
            <p class="text-xs text-dark-muted">Нажмите на звёздочку при чтении гайда, чтобы сохранить его сюда</p>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div
              v-for="guide in favoritedGuidesList"
              :key="guide.meta.id"
              @click="selectGuide(guide.meta.id)"
              class="group bg-[#16181a] hover:bg-[#1c1f22] border border-[#26292d] hover:border-emerald-500/50 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between shadow-md hover:shadow-xl hover:shadow-emerald-950/30 hover:-translate-y-1 overflow-hidden"
            >
              <!-- COVER BANNER WITH BADGES & BOOKMARK REMOVE BUTTON -->
              <div class="h-28 sm:h-32 w-full relative overflow-hidden flex-shrink-0">
                <img v-if="guide.meta.coverUrl" :src="guide.meta.coverUrl" class="w-full h-full object-cover object-[center_30%] group-hover:scale-105 transition-transform duration-500" />
                <div v-else-if="guide.meta.coverGradient" :class="['w-full h-full bg-gradient-to-tr', guide.meta.coverGradient]"></div>
                <div v-else class="w-full h-full bg-gradient-to-r from-slate-900 via-slate-800 to-[#121416]"></div>

                <!-- Gradient Overlay -->
                <div class="absolute inset-0 bg-gradient-to-t from-[#16181a] via-[#16181a]/20 to-black/30 pointer-events-none"></div>

                <!-- Top Right Bookmark Star Button -->
                <button 
                  @click.stop="toggleBookmarkGuide(guide.meta.id)" 
                  class="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-xl bg-black/60 hover:bg-rose-500/30 border border-amber-500/40 hover:border-rose-400 text-amber-400 hover:text-rose-400 flex items-center justify-center backdrop-blur-md transition-all shadow-lg"
                  title="Удалить из закладок"
                >
                  <IconRenderer name="Star" size="16" class="fill-amber-400 text-amber-400" />
                </button>

                <!-- Badges Overlaid on Banner -->
                <div class="absolute inset-x-0 bottom-2.5 px-4 sm:px-5 z-10 flex items-center justify-between flex-wrap gap-1.5">
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-md backdrop-blur-md bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    {{ guide.meta.category }}
                  </span>

                  <div class="flex items-center gap-1">
                    <span v-if="guide.meta.server" class="text-[9px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded shadow-md backdrop-blur-md">
                      🎮 {{ guide.meta.server }}
                    </span>
                    <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shadow-md backdrop-blur-md bg-purple-500/20 text-purple-300 border-purple-500/30">
                      {{ guide.meta.difficulty }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- CARD BODY -->
              <div class="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div class="space-y-1.5">
                  <h3 class="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                    {{ guide.meta.title }}
                  </h3>
                  <p class="text-xs text-dark-muted line-clamp-2 leading-relaxed">
                    {{ guide.meta.summary || 'Интерактивное руководство по сборке...' }}
                  </p>
                </div>

                <!-- Bottom Row Metadata with Avatar and Author Profile -->
                <div class="flex items-center justify-between pt-2.5 border-t border-[#26292d]/80 text-[11px]">
                  <div 
                    @click.stop="openAuthorProfile(guide.meta.author)"
                    class="flex items-center gap-2 hover:text-emerald-400 transition-colors cursor-pointer group/author"
                    title="Просмотреть профиль автора"
                  >
                    <!-- Avatar with Glow Ring -->
                    <div class="w-6 h-6 rounded-lg bg-gradient-to-tr from-emerald-600 via-cyan-500 to-purple-600 p-0.5 shadow-md flex-shrink-0">
                      <div class="w-full h-full bg-[#0c0d0e] rounded-[6px] flex items-center justify-center overflow-hidden">
                        <img v-if="authorProfilesMap[guide.meta.author.toLowerCase()]?.avatarUrl" :src="authorProfilesMap[guide.meta.author.toLowerCase()]?.avatarUrl" class="w-full h-full object-cover" />
                        <span v-else class="text-[10px] font-black text-emerald-400">{{ guide.meta.author ? guide.meta.author.charAt(0).toUpperCase() : 'A' }}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1">
                      <span class="font-bold text-slate-200 text-xs group-hover/author:text-emerald-400 group-hover/author:underline">{{ guide.meta.author }}</span>
                      <span v-if="authorProfilesMap[guide.meta.author.toLowerCase()]?.isVerified" class="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 flex items-center justify-center shadow-sm" title="Проверенный Автор">
                        <svg class="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    </div>
                  </div>

                  <button class="bg-[#121416] group-hover:bg-emerald-600 text-slate-300 group-hover:text-white px-3 py-1 rounded-xl text-xs font-bold transition-all">
                    Читать →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. EDITOR VIEW (Only for authenticated author) -->
        <div v-else-if="mode === 'editor' && isAuthenticated && activeGuide" class="px-3 sm:px-4 pt-4">
          <GuideEditor
            :guide="activeGuide"
            @update:guide="updateActiveGuide"
            @toggle-preview="mode = 'reader'"
            @publish="handlePublish"
            @delete="requestDeleteGuide"
          />
        </div>

        <!-- 4. SINGLE GUIDE WIKI READER VIEW -->
        <div v-else-if="activeGuide" class="px-3 sm:px-4 pt-4">
          <GuideView
            :guide="activeGuide"
            :all-guides="guides"
            :is-favorited="favoriteGuideIds.includes(activeGuide.meta.id)"
            @select-guide="selectGuide"
            @toggle-bookmark="toggleBookmarkGuide"
            @edit-mode="openEditorProtection"
            @open-author="openAuthorProfile"
          />
        </div>
      </template>

      <!-- SINGLE UNIFIED SITE FOOTER -->
      <SiteFooter
        :guides-count="guides.length"
        :servers-count="21"
        @navigate="mode = 'home'"
        @open-terms="isTermsOpen = true"
      />

      <!-- DELETE GUIDE CONFIRMATION MODAL -->
      <ConfirmModal
        :is-open="isDeleteGuideConfirmOpen"
        title="Удаление гайда"
        message="Вы действительно хотите безвозвратно удалить этот гайд? Все блоки и данные будут удалены из базы."
        confirm-text="Да, удалить гайд"
        cancel-text="Отмена"
        type="danger"
        @confirm="pendingDeleteGuideId ? confirmDeleteGuideById() : confirmDeleteGuide()"
        @cancel="isDeleteGuideConfirmOpen = false"
      />
    </main>

    <!-- Author Profile Modal -->
    <AuthorProfileModal
      :is-open="isProfileModalOpen"
      :username="profileUsername"
      :is-own-profile="isAuthenticated && currentUsername?.toLowerCase() === profileUsername.toLowerCase()"
      :is-admin="currentUserIsAdmin"
      :all-guides="guides"
      @close="isProfileModalOpen = false; fetchCurrentAuthorProfile();"
      @select-guide="selectGuide"
      @view-all-guides="handleViewAllAuthorGuides"
    />

    <!-- Password Protected Author Auth Modal -->
    <AuthModal
      :is-open="isAuthModalOpen"
      @close="isAuthModalOpen = false"
      @authenticate="handleAuthentication"
    />

    <!-- Notification Toast -->
    <div v-if="toastMessage" class="fixed bottom-6 right-6 z-50 animate-bounce">
      <div class="bg-[#16181a] border border-emerald-500/50 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5">
        <div class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <IconRenderer name="Check" size="12" />
        </div>
        <span>{{ toastMessage }}</span>
      </div>
    </div>

    <!-- Terms Modal -->
    <TermsModal :is-open="isTermsOpen" @close="isTermsOpen = false" />

    <!-- Cookie Banner -->
    <CookieBanner @open-terms="isTermsOpen = true" />
  </div>
</template>
