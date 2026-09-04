<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import HomePage from './components/HomePage.vue';
import GuideEditor from './components/GuideEditor.vue';
import GuideView from './components/GuideView.vue';
import AuthorProfileModal from './components/AuthorProfileModal.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import IconRenderer from './components/IconRenderer.vue';
import AuthModal from './components/AuthModal.vue';
import SiteFooter from './components/SiteFooter.vue';
import TermsModal from './components/TermsModal.vue';
import RulesModal from './components/RulesModal.vue';
import SettingsModal from './components/SettingsModal.vue';
import TelemetryPage from './components/TelemetryPage.vue';
import AdminPanel from './components/AdminPanel.vue';
import TeamPage from './components/TeamPage.vue';
import { PRESET_ITEMS } from './data/presetItems';
import { hasPermission } from './data/roles';
import type { Guide, AuthorProfile, UserRole, UserPermission } from './types/guide';

const isTermsOpen = ref(false);
const isRulesOpen = ref(false);
const isSettingsOpen = ref(false);

const guides = ref<Guide[]>([]);
const activeGuideId = ref<string>('');
const activeGuide = ref<Guide | null>(null);

// MODE: 'home' (Главная) | 'reader' (Вики Гайда) | 'editor' (Конструктор) | 'favorites' (Избранное) | 'drafts' (Мои Черновики) | 'rules' (Правила проекта)
const mode = ref<'home' | 'reader' | 'editor' | 'favorites' | 'drafts' | 'rules'>('home');
const isLoading = ref<boolean>(true);

const handleExportData = () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(guides.value, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `cubixguide_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Экспорт бэкапа базы завершён!');
};

const handleImportData = async (jsonString: string) => {
  try {
    const items = JSON.parse(jsonString);
    if (!Array.isArray(items)) throw new Error('Формат файла должен быть массивом гайдов');
    let importedCount = 0;
    for (const g of items) {
      if (g.meta && g.meta.id) {
        const res = await fetch('/api/guides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(g)
        });
        if (res.ok) importedCount++;
      }
    }
    await fetchGuides();
    isSettingsOpen.value = false;
    showToast(`Успешно импортировано ${importedCount} гайдов!`);
  } catch (e: any) {
    showToast(`Ошибка импорта: ${e.message}`, 'error');
  }
};

const handleClearDrafts = () => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('cubixguide_draft_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  hasUnsavedDraft.value = false;
  showToast('Локальные черновики очищены');
};

// Bookmarked / Favorited guide IDs in LocalStorage
const favoriteGuideIds = ref<string[]>([]);

// Theme Switcher State: 'dark' | 'light' | 'emerald' | 'cyberpunk' | 'midnight' | 'sapphire' | 'sunset' | 'dracula'
type ThemeMode = 'dark' | 'light' | 'emerald' | 'cyberpunk' | 'midnight' | 'sapphire' | 'sunset' | 'dracula';
const currentTheme = ref<ThemeMode>('dark');

const applyTheme = (theme: ThemeMode) => {
  currentTheme.value = theme;
  localStorage.setItem('cubix_theme', theme);
  const html = document.documentElement;
  html.classList.remove('theme-dark', 'theme-light', 'theme-emerald', 'theme-cyberpunk', 'theme-midnight', 'theme-sapphire', 'theme-sunset', 'theme-dracula');
  html.classList.add(`theme-${theme}`);
};

const toggleTheme = () => {
  const themes: ThemeMode[] = ['dark', 'light', 'emerald', 'cyberpunk', 'midnight', 'sapphire', 'sunset', 'dracula'];
  const cur = currentTheme.value || 'dark';
  const idx = themes.indexOf(cur);
  const nextIdx = (idx >= 0 ? idx + 1 : 0) % themes.length;
  applyTheme(themes[nextIdx]);
};

// Author Profile Modal & Current Logged In User
const isProfileModalOpen = ref(false);
const profileUsername = ref('DarkimuSSS');
const currentUsername = ref<string | null>(null);
const currentUserIsAdmin = ref<boolean>(false);
const currentUserCanEditOthers = ref<boolean>(false);
const currentUserCanCreateGuides = ref<boolean>(true);
const currentAuthorProfile = ref<AuthorProfile | null>(null);

// Auth & Protection State
const isAuthModalOpen = ref(false);
const isAuthenticated = ref(false);

const hasUnsavedDraft = ref<boolean>(false);
const draftSavedTime = ref<string>('');

// Notification Toast Stack System
interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  copied?: boolean;
}

const toasts = ref<ToastNotification[]>([]);

const removeToast = (id: string) => {
  toasts.value = toasts.value.filter(t => t.id !== id);
};

const copyToastText = (toast: ToastNotification) => {
  navigator.clipboard.writeText(toast.message);
  toast.copied = true;
  setTimeout(() => {
    toast.copied = false;
  }, 2000);
};

const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
  const newToast: ToastNotification = { id, message: msg, type };
  
  // Add to stack, keep max 5 items (oldest dropped if > 5)
  toasts.value.push(newToast);
  if (toasts.value.length > 5) {
    toasts.value.shift();
  }

  // Auto remove after 4.5 seconds
  setTimeout(() => {
    removeToast(id);
  }, 4500);
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

const openAuthorProfile = async (username?: string) => {
  const targetUser = username || currentUsername.value || activeGuide.value?.meta.author || 'DarkimuSSS';
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(targetUser)}`);
    if (res.ok) {
      profileUsername.value = targetUser;
      isProfileModalOpen.value = true;
    } else {
      const data = await res.json().catch(() => ({}));
      const errorMsg = data.error || `Пользователь ${targetUser} не является зарегистрированным автором`;
      showToast(errorMsg, 'error');
    }
  } catch (e) {
    showToast(`Не удалось проверить профиль ${targetUser}`, 'error');
  }
};

// URL Query Parameters Sync (tab=...&guide=...)
const initialRulesTab = ref<'general' | 'server'>('general');
const initialRulesServer = ref<string>('OneBlock');

const updateUrlRoute = () => {
  const params = new URLSearchParams();

  if (isProfileModalOpen.value && profileUsername.value) {
    params.set('tab', 'profile');
    params.set('author', profileUsername.value);
  } else if (mode.value === 'home') {
    params.set('tab', 'home');
  } else if (mode.value === 'reader') {
    params.set('tab', 'wiki');
    if (activeGuideId.value) params.set('guide', activeGuideId.value);
  } else if (mode.value === 'editor') {
    params.set('tab', 'editor');
    if (activeGuideId.value) params.set('guide', activeGuideId.value);
  } else if (mode.value === 'favorites') {
    params.set('tab', 'favorites');
  } else if (mode.value === 'drafts') {
    params.set('tab', 'drafts');
  } else if (mode.value === 'telemetry') {
    params.set('tab', 'telemetry');
  } else if (mode.value === 'admin') {
    params.set('tab', 'admin');
  } else if (mode.value === 'team') {
    params.set('tab', 'team');
  } else if (mode.value === 'rules') {
    if (initialRulesTab.value === 'server') {
      params.set('tab', 'server_rules');
      if (initialRulesServer.value) params.set('server', initialRulesServer.value);
    } else {
      params.set('tab', 'rules');
    }
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
  const serverParam = params.get('server');

  if (authorParam && (tab === 'profile' || tab === 'Профиль')) {
    profileUsername.value = authorParam;
    isProfileModalOpen.value = true;
  }

  if (serverParam) {
    initialRulesServer.value = serverParam;
  }

  if (guideParam) {
    activeGuideId.value = guideParam;
    const found = guides.value.find(g => g.meta.id === guideParam);
    if (found) activeGuide.value = JSON.parse(JSON.stringify(found));
  }

  if (tab === 'rules' || tab === 'Правила' || tab === 'Общие') {
    initialRulesTab.value = 'general';
    mode.value = 'rules';
  } else if (tab === 'server_rules' || tab === 'Внутриигровые' || tab === 'Серверные') {
    initialRulesTab.value = 'server';
    mode.value = 'rules';
  } else if (tab === 'telemetry' || tab === 'Телеметрия' || tab === 'Аналитика') {
    mode.value = 'telemetry';
  } else if (tab === 'admin' || tab === 'АдминПанель' || tab === 'Авторы') {
    mode.value = 'admin';
  } else if (tab === 'team' || tab === 'Команда' || tab === 'Персонал') {
    mode.value = 'team';
  } else if (tab === 'wiki' || tab === 'reader' || tab === 'Вики') {
    mode.value = 'reader';
  } else if (tab === 'editor' || tab === 'Конструктор') {
    mode.value = isAuthenticated.value ? 'editor' : 'reader';
  } else if (tab === 'favorites' || tab === 'Закладки') {
    mode.value = 'favorites';
  } else if (tab === 'drafts' || tab === 'Черновики') {
    mode.value = isAuthenticated.value ? 'drafts' : 'home';
  } else if (tab === 'profile' || tab === 'Профиль') {
    // profile modal state handled above
  } else if (tab === 'home' || tab === 'Главная') {
    mode.value = 'home';
  }
};

const myDraftsList = computed(() => {
  if (!isAuthenticated.value || !currentUsername.value) return [];
  const username = currentUsername.value.toLowerCase().trim();
  const isAdmin = currentUserIsAdmin.value;
  return guides.value.filter(g => {
    const isAuthor = (g.meta.author || '').toLowerCase().trim() === username || (g.meta.coAuthors || []).some(ca => ca.toLowerCase().trim() === username);
    const canSee = isAuthor || isAdmin;
    const isNotPublished = !g.meta.published || !g.meta.isVisible;
    return canSee && isNotPublished;
  });
});

watch([mode, activeGuideId, isProfileModalOpen, profileUsername], () => {
  updateUrlRoute();
});

// Check Session Auth Status & Favorites & Saved Theme
const verifyAndRefreshSession = async (username: string) => {
  try {
    const res = await fetch(`/api/auth/me?username=${encodeURIComponent(username)}`);
    if (res.ok) {
      const data = await res.json();
      isAuthenticated.value = true;
      currentUsername.value = data.username;
      currentUserIsAdmin.value = Boolean(data.isAdmin);
      currentUserCanEditOthers.value = Boolean(data.canEditOthers);
      currentUserCanCreateGuides.value = Boolean(data.canCreateGuides);
      currentUserRole.value = data.role || (data.isAdmin ? 'super_admin' : 'author');
      currentUserCustomPermissions.value = data.customPermissions || [];
      currentUserAssignedServers.value = data.assignedServers || [];

      localStorage.setItem('cubix_logged_username', data.username);
      localStorage.setItem('cubix_logged_is_admin', data.isAdmin ? 'true' : 'false');
      localStorage.setItem('cubix_logged_role', currentUserRole.value);
      localStorage.setItem('cubix_logged_can_edit_others', currentUserCanEditOthers.value ? 'true' : 'false');
      localStorage.setItem('cubix_logged_can_create_guides', currentUserCanCreateGuides.value ? 'true' : 'false');
      localStorage.setItem('cubix_logged_custom_perms', JSON.stringify(currentUserCustomPermissions.value));
      localStorage.setItem('cubix_logged_assigned_servers', JSON.stringify(currentUserAssignedServers.value));
      fetchCurrentAuthorProfile(data.username);
    } else if (res.status === 404 || res.status === 401) {
      logoutAuthor();
    }
  } catch (err) {
    console.error('Error refreshing auth session:', err);
  }
};

onMounted(() => {
  const savedTheme = (localStorage.getItem('cubix_theme') as ThemeMode) || 'dark';
  applyTheme(savedTheme);

  const savedUser = localStorage.getItem('cubix_logged_username');
  if (savedUser) {
    isAuthenticated.value = true;
    currentUsername.value = savedUser;
    currentUserIsAdmin.value = localStorage.getItem('cubix_logged_is_admin') === 'true';
    currentUserRole.value = (localStorage.getItem('cubix_logged_role') as UserRole) || (currentUserIsAdmin.value ? 'super_admin' : 'author');
    currentUserCanEditOthers.value = localStorage.getItem('cubix_logged_can_edit_others') === 'true';
    currentUserCanCreateGuides.value = localStorage.getItem('cubix_logged_can_create_guides') !== 'false';
    try {
      const perms = localStorage.getItem('cubix_logged_custom_perms');
      if (perms) currentUserCustomPermissions.value = JSON.parse(perms);
      const srvs = localStorage.getItem('cubix_logged_assigned_servers');
      if (srvs) currentUserAssignedServers.value = JSON.parse(srvs);
    } catch (e) {}

    fetchCurrentAuthorProfile(savedUser);
    verifyAndRefreshSession(savedUser);
  }

  try {
    const rawFavs = localStorage.getItem('cubix_favorite_guides');
    if (rawFavs) favoriteGuideIds.value = JSON.parse(rawFavs);
  } catch (e) {}

  fetchGuides();
  syncFromUrlPath();
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
  const isAdding = !favoriteGuideIds.value.includes(guideId);
  if (!isAdding) {
    favoriteGuideIds.value = favoriteGuideIds.value.filter(id => id !== guideId);
    showToast('Удалено из закладок');
  } else {
    favoriteGuideIds.value.push(guideId);
    showToast('Добавлено в закладки ⭐');
  }
  localStorage.setItem('cubix_favorite_guides', JSON.stringify(favoriteGuideIds.value));

  // Отправка события телеметрии о закладках
  fetch('/api/telemetry/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: 'bookmark_toggle',
      guideId: guideId,
      username: currentUsername.value || undefined,
      extraData: isAdding ? 'add' : 'remove'
    })
  }).catch(() => {});
};

const favoritedGuidesList = computed(() => {
  return guides.value.filter(g => favoriteGuideIds.value.includes(g.meta.id));
});

const currentUserRole = ref<UserRole>('guest');
const currentUserCustomPermissions = ref<UserPermission[]>([]);
const currentUserAssignedServers = ref<string[]>([]);

const userHasPerm = (permission: UserPermission): boolean => {
  if (!isAuthenticated.value) return false;
  return hasPermission(currentUserRole.value, currentUserCustomPermissions.value, permission);
};

const canUserEditActiveGuide = computed(() => {
  if (!isAuthenticated.value || !currentUsername.value || !activeGuide.value) return false;
  
  // Super Admin or role/custom permission to edit all guides
  if (userHasPerm('edit_other_guide') || currentUserIsAdmin.value) return true;
  
  const authorName = (activeGuide.value.meta.author || '').toLowerCase().trim();
  const currentName = currentUsername.value.toLowerCase().trim();
  if (authorName === currentName && userHasPerm('edit_own_guide')) return true;
  
  // Co-authors can also edit if they have edit_own_guide
  const coAuthors = (activeGuide.value.meta.coAuthors || []).map(s => s.toLowerCase().trim());
  if (coAuthors.includes(currentName) && userHasPerm('edit_own_guide')) return true;
  
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
    showToast(`У вас нет прав на редактирование чужого гайда (Автор: ${activeGuide.value?.meta.author})`, 'error');
  }
};

const handleAuthentication = (payload: { username: string; isAdmin: boolean; canEditOthers?: boolean; canCreateGuides?: boolean; role?: UserRole; customPermissions?: UserPermission[]; assignedServers?: string[] }) => {
  isAuthenticated.value = true;
  currentUsername.value = payload.username;
  currentUserIsAdmin.value = payload.isAdmin;
  currentUserCanEditOthers.value = Boolean(payload.canEditOthers);
  currentUserCanCreateGuides.value = payload.canCreateGuides !== undefined ? Boolean(payload.canCreateGuides) : true;
  currentUserRole.value = payload.role || (payload.isAdmin ? 'super_admin' : 'author');
  currentUserCustomPermissions.value = payload.customPermissions || [];
  currentUserAssignedServers.value = payload.assignedServers || [];

  localStorage.setItem('cubix_logged_username', payload.username);
  localStorage.setItem('cubix_logged_is_admin', payload.isAdmin ? 'true' : 'false');
  localStorage.setItem('cubix_logged_role', currentUserRole.value);
  localStorage.setItem('cubix_logged_can_edit_others', currentUserCanEditOthers.value ? 'true' : 'false');
  localStorage.setItem('cubix_logged_can_create_guides', currentUserCanCreateGuides.value ? 'true' : 'false');
  localStorage.setItem('cubix_logged_custom_perms', JSON.stringify(currentUserCustomPermissions.value));
  localStorage.setItem('cubix_logged_assigned_servers', JSON.stringify(currentUserAssignedServers.value));

  isAuthModalOpen.value = false;
  fetchCurrentAuthorProfile(payload.username);
  showToast(`Добро пожаловать, ${payload.username}!`);
};

const isLogoutConfirmOpen = ref(false);

const requestLogout = () => {
  isLogoutConfirmOpen.value = true;
};

const logoutAuthor = () => {
  isLogoutConfirmOpen.value = false;
  isAuthenticated.value = false;
  currentUsername.value = null;
  currentUserIsAdmin.value = false;
  currentUserCanEditOthers.value = false;
  currentUserCanCreateGuides.value = true;
  currentUserRole.value = 'guest';
  currentUserCustomPermissions.value = [];
  currentUserAssignedServers.value = [];
  currentAuthorProfile.value = null;
  localStorage.removeItem('cubix_logged_username');
  localStorage.removeItem('cubix_logged_is_admin');
  localStorage.removeItem('cubix_logged_role');
  localStorage.removeItem('cubix_logged_can_edit_others');
  localStorage.removeItem('cubix_logged_can_create_guides');
  localStorage.removeItem('cubix_logged_custom_perms');
  localStorage.removeItem('cubix_logged_assigned_servers');
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
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ошибка загрузки данных (${res.status}): ${errText.substring(0, 100)}`);
    }
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

  // Автоматический сброс скролла на самый верх при открытии статьи
  nextTick(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
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
      title: '',
      category: 'ХайТек',
      author: authorName,
      difficulty: 'Новичок',
      summary: '',
      updatedAt: new Date().toISOString().split('T')[0],
      published: false,
      isVisible: false
    },
    blocks: []
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

const handleSubmitModeration = async () => {
  if (!activeGuide.value) return;
  if (!canUserEditActiveGuide.value) {
    showToast(`У вас нет прав для сохранения изменений в чужом гайде (Автор: ${activeGuide.value.meta.author})`);
    return;
  }

  activeGuide.value.meta.published = false;
  activeGuide.value.meta.isVisible = false;
  activeGuide.value.meta.status = 'pending_moderation';
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
      showToast('Гайд успешно отправлен на модерацию Администратору! 📩');
      mode.value = 'home';
      await fetchGuides();
    } else {
      const errData = await res.json();
      showToast(errData.error || 'Ошибка отправки на модерацию');
    }
  } catch (err) {
    console.error('Ошибка отправки на модерацию:', err);
    showToast('Ошибка обращения к серверу');
  }
};

const handlePublish = async () => {
  if (!activeGuide.value) return;
  if (!canUserEditActiveGuide.value) {
    showToast(`У вас нет прав для сохранения изменений в чужом гайде (Автор: ${activeGuide.value.meta.author})`);
    return;
  }
  activeGuide.value.meta.published = true;
  activeGuide.value.meta.status = 'approved';
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
      showToast('Гайд успешно опубликован!');
      mode.value = 'reader';
      await fetchGuides();
    } else {
      const errData = await res.json();
      showToast(errData.error || 'Ошибка при публикации гайда');
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
const headerSearchQuery = ref('');
const isHeaderSearchFocused = ref(false);
const isHeaderNavMenuOpen = ref(false);
const isPreviewActive = ref(false);

const handleTogglePreview = () => {
  isPreviewActive.value = true;
  mode.value = 'reader';
};

const handleExitPreview = () => {
  isPreviewActive.value = false;
  mode.value = 'editor';
};

let searchDebounceTimeout: any = null;

const handleHeaderSearchInput = (val: string) => {
  headerSearchQuery.value = val;
  initialCatalogSearchQuery.value = val;
  if (mode.value !== 'home') {
    mode.value = 'home';
  }

  // Дебаунс отправки статистики поисковых запросов в телеметрию
  if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
  if (val.trim().length >= 2) {
    searchDebounceTimeout = setTimeout(() => {
      fetch('/api/telemetry/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'search_query',
          username: currentUsername.value || undefined,
          extraData: val.trim()
        })
      }).catch(() => {});
    }, 1200);
  }
};

const handleHeaderCategorySelect = (category: string) => {
  initialCatalogSearchQuery.value = category;
  headerSearchQuery.value = category;
  if (mode.value !== 'home') {
    mode.value = 'home';
  }
  isHeaderNavMenuOpen.value = false;
  showToast(`Категория: ${category}`);

  // Отправка выборки категорий в телеметрию
  fetch('/api/telemetry/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: 'category_select',
      username: currentUsername.value || undefined,
      extraData: category
    })
  }).catch(() => {});
};

const handleViewAllAuthorGuides = (username: string) => {
  initialCatalogSearchQuery.value = username;
  headerSearchQuery.value = username;
  mode.value = 'home';
  isProfileModalOpen.value = false;
  showToast(`Показаны все гайды автора ${username}`);
};
</script>

<template>
  <div class="h-screen w-screen overflow-hidden bg-[#0c0d0e] text-[#e2e8f0] font-sans antialiased flex flex-col">
    <!-- MODULAR EXPANDABLE HIGH-TECH TOP HEADER BAR -->
    <header class="bg-[#121417]/95 backdrop-blur-xl border-b border-[#262a30] h-16 shrink-0 px-4 sm:px-6 flex items-center justify-between z-40 shadow-2xl transition-all select-none gap-4">
      
      <!-- Left: Logo & Navigation Dock -->
      <div class="flex items-center gap-1.5 sm:gap-4 shrink-0">
        <!-- Logo Brand Button -->
        <button 
          @click="mode = 'home'"
          class="flex items-center gap-2 group text-left transition-all hover:opacity-90 cursor-pointer shrink-0"
        >
          <div class="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-md shadow-emerald-950/40 group-hover:scale-105 transition-all duration-300 overflow-hidden shrink-0">
            <div class="w-full h-full bg-[#0c0d0e] rounded-[10px] flex items-center justify-center text-emerald-400 overflow-hidden">
              <img src="/logo.jpg" alt="CubixGuide Logo" class="w-full h-full object-cover" />
            </div>
          </div>
          <span class="hidden min-[390px]:inline text-sm sm:text-base font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">
            CubixGuide
          </span>
        </button>

        <div class="h-6 w-px bg-[#262a30] hidden lg:block"></div>

        <!-- Expandable Mega-Menu Trigger Button -->
        <div class="relative shrink-0">
          <button
            type="button"
            @click="isHeaderNavMenuOpen = !isHeaderNavMenuOpen"
            :class="[
              'px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 sm:gap-2 transition-all duration-300 shadow-md cursor-pointer border',
              isHeaderNavMenuOpen
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-950/60 ring-2 ring-emerald-500/40'
                : 'bg-[#090a0c] text-slate-200 border-[#262a30] hover:border-emerald-500/40 hover:text-white'
            ]"
          >
            <IconRenderer name="Menu" size="16" class="text-emerald-400 shrink-0" />
            <span class="hidden min-[360px]:inline text-[11px] sm:text-xs">Навигация</span>
            <IconRenderer name="ChevronDown" size="14" :class="['text-slate-400 transition-transform duration-300 shrink-0', isHeaderNavMenuOpen ? 'rotate-180 text-white' : '']" />
          </button>

          <!-- Backdrop overlay for closing on click outside (no header blur) -->
          <div v-if="isHeaderNavMenuOpen" @click="isHeaderNavMenuOpen = false" class="fixed inset-0 bg-black/50 sm:bg-transparent z-40"></div>

          <!-- Rich Interactive Mega-Menu Dropdown Panel -->
          <div
            v-if="isHeaderNavMenuOpen"
            @click.stop
            class="fixed inset-x-3 top-16 max-h-[85vh] overflow-y-auto z-50 sm:absolute sm:inset-auto sm:top-full sm:left-0 sm:mt-3 w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-140px)] lg:w-[840px] max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-140px)] lg:max-w-[840px] sm:max-h-[80vh] bg-[#121417] border border-[#262a30] rounded-3xl shadow-2xl p-4 sm:p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200 custom-scrollbar"
          >
            <!-- Mobile Header with Close X button -->
            <div class="flex items-center justify-between pb-2 border-b border-[#262a30] sm:hidden">
              <div class="flex items-center gap-2 text-xs font-black text-white">
                <IconRenderer name="Menu" size="16" class="text-emerald-400" />
                <span>Навигация по сайту</span>
              </div>
              <button @click="isHeaderNavMenuOpen = false" class="p-1.5 rounded-xl bg-[#1c1f24] text-slate-300 hover:text-white cursor-pointer" title="Закрыть">
                <IconRenderer name="X" size="18" />
              </button>
            </div>
            <!-- Navigation Modes -->
            <div>
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Основные разделы:</div>
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <button
                  @click="mode = 'home'; isHeaderNavMenuOpen = false"
                  :class="['p-3 rounded-2xl border text-left transition-all flex items-center gap-2 cursor-pointer', mode === 'home' ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300' : 'bg-[#090a0c] border-[#262a30] text-slate-300 hover:border-emerald-500/40']"
                >
                  <IconRenderer name="Home" size="18" class="text-emerald-400 shrink-0" />
                  <div class="min-w-0">
                    <div class="text-xs font-bold truncate">Каталог</div>
                    <div class="text-[10px] text-dark-muted truncate">Все гайды</div>
                  </div>
                </button>

                <button
                  v-if="activeGuide"
                  @click="mode = 'reader'; isHeaderNavMenuOpen = false"
                  :class="['p-3 rounded-2xl border text-left transition-all flex items-center gap-2 cursor-pointer', mode === 'reader' ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300' : 'bg-[#090a0c] border-[#262a30] text-slate-300 hover:border-cyan-500/40']"
                >
                  <IconRenderer name="BookOpen" size="18" class="text-cyan-400 shrink-0" />
                  <div class="min-w-0">
                    <div class="text-xs font-bold truncate">Вики Статья</div>
                    <div class="text-[10px] text-dark-muted truncate">Текущая статья</div>
                  </div>
                </button>

                <button
                  @click="mode = 'favorites'; isHeaderNavMenuOpen = false"
                  :class="['p-3 rounded-2xl border text-left transition-all flex items-center gap-2 cursor-pointer', mode === 'favorites' ? 'bg-amber-500/15 border-amber-500/50 text-amber-300' : 'bg-[#090a0c] border-[#262a30] text-slate-300 hover:border-amber-500/40']"
                >
                  <IconRenderer name="Star" size="18" class="text-amber-400 shrink-0" />
                  <div class="min-w-0">
                    <div class="text-xs font-bold truncate">Закладки</div>
                    <div class="text-[10px] text-dark-muted truncate">{{ favoriteGuideIds.length }} сохранено</div>
                  </div>
                </button>

                <button
                  v-if="isAuthenticated"
                  @click="mode = 'drafts'; isHeaderNavMenuOpen = false"
                  :class="['p-3 rounded-2xl border text-left transition-all flex items-center gap-2 cursor-pointer', mode === 'drafts' ? 'bg-purple-500/15 border-purple-500/50 text-purple-300' : 'bg-[#090a0c] border-[#262a30] text-slate-300 hover:border-purple-500/40']"
                >
                  <IconRenderer name="FileText" size="18" class="text-purple-400 shrink-0" />
                  <div class="min-w-0">
                    <div class="text-xs font-bold truncate">Черновики</div>
                    <div class="text-[10px] text-dark-muted truncate">{{ myDraftsList.length }} неопубликовано</div>
                  </div>
                </button>

                <button
                  v-if="currentUserIsAdmin"
                  @click="mode = 'admin'; isHeaderNavMenuOpen = false"
                  :class="['p-3 rounded-2xl border text-left transition-all flex items-center gap-2 cursor-pointer', mode === 'admin' ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300' : 'bg-[#090a0c] border-[#262a30] text-slate-300 hover:border-cyan-500/40']"
                >
                  <IconRenderer name="Users" size="18" class="text-cyan-400 shrink-0" />
                  <div class="min-w-0">
                    <div class="text-xs font-bold truncate">Панель Авторов</div>
                    <div class="text-[10px] text-dark-muted truncate">Управление доступом</div>
                  </div>
                </button>

                <button
                  v-if="currentUserIsAdmin"
                  @click="mode = 'telemetry'; isHeaderNavMenuOpen = false"
                  :class="['p-3 rounded-2xl border text-left transition-all flex items-center gap-2 cursor-pointer', mode === 'telemetry' ? 'bg-purple-500/15 border-purple-500/50 text-purple-300' : 'bg-[#090a0c] border-[#262a30] text-slate-300 hover:border-purple-500/40']"
                >
                  <IconRenderer name="BarChart2" size="18" class="text-purple-400 shrink-0" />
                  <div class="min-w-0">
                    <div class="text-xs font-bold truncate">Телеметрия</div>
                    <div class="text-[10px] text-dark-muted truncate">Аналитика сайта</div>
                  </div>
                </button>

                <button
                  @click="mode = 'team'; isHeaderNavMenuOpen = false"
                  :class="['p-3 rounded-2xl border text-left transition-all flex items-center gap-2 cursor-pointer', mode === 'team' ? 'bg-amber-500/15 border-amber-500/50 text-amber-300' : 'bg-[#090a0c] border-[#262a30] text-slate-300 hover:border-amber-500/40']"
                >
                  <IconRenderer name="Shield" size="18" class="text-amber-400 shrink-0" />
                  <div class="min-w-0">
                    <div class="text-xs font-bold truncate">Команда Проекта</div>
                    <div class="text-[10px] text-dark-muted truncate">Состав серверов</div>
                  </div>
                </button>

                <button
                  @click="mode = 'rules'; isHeaderNavMenuOpen = false"
                  :class="['p-3 rounded-2xl border text-left transition-all flex items-center gap-2 cursor-pointer', mode === 'rules' ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300' : 'bg-[#090a0c] border-[#262a30] text-slate-300 hover:border-emerald-500/40']"
                >
                  <IconRenderer name="ShieldCheck" size="18" class="text-emerald-400 shrink-0" />
                  <div class="min-w-0">
                    <div class="text-xs font-bold truncate">Правила</div>
                    <div class="text-[10px] text-dark-muted truncate">Свод правил проекта</div>
                  </div>
                </button>

                <button
                  @click="openRandomGuide(); isHeaderNavMenuOpen = false"
                  class="p-3 rounded-2xl bg-[#090a0c] border border-[#26292d] hover:border-purple-500/40 text-left transition-all flex items-center gap-2 cursor-pointer group"
                >
                  <IconRenderer name="Sparkles" size="18" class="text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-purple-300 truncate">Случайный</div>
                    <div class="text-[10px] text-dark-muted truncate">Случайный гайд</div>
                  </div>
                </button>

                <button
                  @click="isSettingsOpen = true; isHeaderNavMenuOpen = false"
                  class="p-3 rounded-2xl bg-[#090a0c] border border-[#26292d] hover:border-cyan-500/40 text-left transition-all flex items-center gap-2 cursor-pointer group"
                >
                  <IconRenderer name="Settings" size="18" class="text-cyan-400 group-hover:rotate-90 transition-transform shrink-0" />
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-cyan-300 truncate">Настройки</div>
                    <div class="text-[10px] text-dark-muted truncate">Темы и параметры</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Rich Interactive Categories Hub (4 COLUMNS GRID) -->
            <div class="border-t border-[#262a30] pt-3.5 space-y-2.5">
              <div class="flex items-center justify-between px-1">
                <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Тематические категории:</div>
                <span class="text-[10px] text-emerald-400 font-bold">10 направлений</span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                <button
                  v-for="cat in [
                    { name: 'ХайТек', icon: 'Cpu', color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300', desc: 'Автоматизация & Энергия' },
                    { name: 'Магия RPG', icon: 'Sparkles', color: 'from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-300', desc: 'Заклинания & Алхимия' },
                    { name: 'СкайБлок', icon: 'Layers', color: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300', desc: 'Развитие острова' },
                    { name: 'Автоматизация', icon: 'Zap', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300', desc: 'Схемы & Логистика' },
                    { name: 'Крафты & Рецепты', icon: 'Sliders', color: 'from-indigo-500/20 to-blue-500/10 border-indigo-500/40 text-indigo-300', desc: 'Сложные рецепты' },
                    { name: 'Фермы & Заводы', icon: 'CheckSquare', color: 'from-teal-500/20 to-emerald-500/10 border-teal-500/40 text-teal-300', desc: 'Фермы ресурсов' },
                    { name: 'Покемоны', icon: 'Smile', color: 'from-rose-500/20 to-red-500/10 border-rose-500/40 text-rose-300', desc: 'Pixelmon & Cobblemon' },
                    { name: 'Строительство', icon: 'Home', color: 'from-amber-400/20 to-yellow-500/10 border-amber-400/40 text-amber-200', desc: 'Декор & Постройки' },
                    { name: 'ПВП & Боссы', icon: 'Shield', color: 'from-red-500/20 to-rose-600/10 border-red-500/40 text-red-300', desc: 'Броня & Боссы' },
                    { name: 'Общий', icon: 'BookOpen', color: 'from-slate-700/30 to-slate-800/20 border-slate-600/40 text-slate-300', desc: 'Базовые советы' }
                  ]"
                  :key="cat.name"
                  @click="handleHeaderCategorySelect(cat.name)"
                  :class="[
                    'p-2 sm:p-2.5 rounded-2xl border text-left transition-all duration-300 flex items-center justify-between group cursor-pointer bg-gradient-to-r hover:scale-[1.02] shadow-sm',
                    cat.color
                  ]"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="p-1.5 rounded-xl bg-black/40 border border-white/10 group-hover:scale-110 transition-transform shrink-0">
                      <IconRenderer :name="cat.icon" size="15" />
                    </div>
                    <div class="min-w-0">
                      <div class="text-[11px] font-bold text-white group-hover:text-emerald-300 transition-colors truncate">{{ cat.name }}</div>
                      <div class="text-[9px] text-slate-400 truncate">{{ cat.desc }}</div>
                    </div>
                  </div>
                  <span class="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-black/40 border border-white/10 text-slate-300 shrink-0 ml-1">
                    {{ guides.filter(g => g.meta.category === cat.name).length }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Center: Smart Embedded Global Search Input (Scalable Modularity) -->
      <div class="flex-1 max-w-md mx-2 relative group hidden md:block">
        <div class="relative flex items-center">
          <IconRenderer name="Search" size="15" class="absolute left-3.5 text-slate-400 group-focus-within:text-emerald-400 transition-colors pointer-events-none" />
          <input
            type="text"
            :value="headerSearchQuery"
            @input="handleHeaderSearchInput(($event.target as HTMLInputElement).value)"
            @focus="isHeaderSearchFocused = true"
            @blur="setTimeout(() => isHeaderSearchFocused = false, 200)"
            placeholder="Быстрый поиск руководств, модов и разделов..."
            class="w-full bg-[#090a0c] border border-[#262a30] focus:border-emerald-500/60 focus:bg-[#0e1013] text-white placeholder-slate-500 text-xs rounded-2xl pl-10 pr-8 py-2 focus:outline-none transition-all shadow-inner"
          />
          <button
            v-if="headerSearchQuery"
            @click="handleHeaderSearchInput('')"
            class="absolute right-3 text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-[#1f2328] transition-colors"
          >
            <IconRenderer name="X" size="12" />
          </button>
        </div>
      </div>

      <!-- Right: Action Buttons & Author User Card -->
      <div class="flex items-center gap-2.5 shrink-0">
        
        <!-- Unsaved Draft Indicator Badge -->
        <div v-if="hasUnsavedDraft && isAuthenticated" class="hidden 2xl:flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl shadow-md">
          <IconRenderer name="Sliders" size="13" class="text-amber-400 animate-pulse" />
          <span class="text-[11px] text-amber-300 font-semibold">Черновик ({{ draftSavedTime }})</span>
          <button @click="restoreDraft" class="text-[10px] bg-amber-600 text-white font-bold px-2 py-0.5 rounded-lg hover:bg-amber-500 transition-colors cursor-pointer">
            Восстановить
          </button>
          <button @click="discardDraft" class="text-[10px] text-amber-400 hover:text-white px-1 cursor-pointer">
            ✕
          </button>
        </div>

        <!-- Quick Create Guide Button -->
        <button
          v-if="isAuthenticated"
          type="button"
          @click="createNewGuide"
          class="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md group cursor-pointer"
          title="Создать новый гайд"
        >
          <IconRenderer name="Plus" size="15" class="group-hover:rotate-90 transition-transform duration-300" />
          <span class="hidden sm:inline">Новый гайд</span>
        </button>

        <!-- Editor Mode Switcher Button -->
        <button
          v-if="isAuthenticated"
          type="button"
          @click="mode = 'editor'"
          :class="[
            'px-2.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all duration-300 shadow-md cursor-pointer shrink-0',
            mode === 'editor' 
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-950/60 ring-2 ring-emerald-500/50' 
              : 'bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/40'
          ]"
          title="Конструктор гайдов"
        >
          <IconRenderer name="Edit3" size="15" />
          <span class="hidden sm:inline">Конструктор</span>
        </button>

        <!-- Author User Profile Card Widget -->
        <button
          v-if="isAuthenticated && currentUsername"
          type="button"
          @click="openAuthorProfile(currentUsername)"
          class="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-[#090a0c] hover:bg-[#181b20] text-purple-300 border border-[#262a30] hover:border-purple-500/40 text-xs font-extrabold flex items-center gap-2 transition-all duration-300 shadow-md group cursor-pointer shrink-0"
          title="Открыть ваш профиль автора"
        >
          <div class="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-500 p-0.5 flex-shrink-0 shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
            <div class="w-full h-full bg-[#0c0d0e] rounded-[10px] flex items-center justify-center font-black text-[11px] text-white overflow-hidden">
              <img v-if="currentAuthorProfile?.avatarUrl" :src="currentAuthorProfile.avatarUrl" class="w-full h-full object-cover" />
              <span v-else>{{ currentUsername.charAt(0).toUpperCase() }}</span>
            </div>
          </div>
          <span class="hidden sm:flex items-center gap-1.5 font-extrabold text-slate-200 group-hover:text-purple-300 transition-colors">
            <span>{{ currentUsername }}</span>
            <span v-if="currentUserIsAdmin" class="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-400/30 px-1.5 py-0.2 rounded-md font-mono">Админ</span>
          </span>
        </button>

        <!-- Global Settings Button -->
        <button
          type="button"
          @click="isSettingsOpen = true"
          class="p-2 sm:p-2.5 rounded-xl bg-[#090a0c] hover:bg-[#181b20] border border-[#262a30] hover:border-cyan-500/40 text-slate-400 hover:text-white flex items-center justify-center transition-all shadow-md group cursor-pointer shrink-0"
          title="Настройки приложения"
        >
          <IconRenderer name="Settings" size="16" class="text-cyan-400 group-hover:rotate-90 transition-transform duration-300" />
        </button>

        <!-- Logged In / Logged Out Controls -->
        <div v-if="!isAuthenticated" class="shrink-0">
          <button
            type="button"
            @click="isAuthModalOpen = true"
            class="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
          >
            <IconRenderer name="UserCheck" size="16" />
            <span class="hidden sm:inline">Войти в аккаунт</span>
            <span class="sm:hidden text-xs">Войти</span>
          </button>
        </div>

      </div>
    </header>

    <!-- Main Content Container (Global Unified Scrollbar) -->
    <main class="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
      <div v-if="isLoading" class="flex flex-col items-center justify-center flex-1 text-dark-muted space-y-3">
        <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <div class="text-xs">Загрузка гайдов...</div>
      </div>

      <template v-else>
        <div class="max-w-[1600px] mx-auto w-full flex-1 flex flex-col justify-between">
          <!-- 1. HOMEPAGE CATALOG VIEW (DEFAULT LANDING) -->
          <div v-if="mode === 'home'" class="px-3 sm:px-6 pt-4">
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
          </div>

          <!-- 2. BOOKMARKS / FAVORITES VIEW -->
          <div v-else-if="mode === 'favorites'" class="px-3 sm:px-6 pt-4 space-y-6 pb-24">
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

          <!-- 3. RULES PAGE VIEW -->
          <div v-else-if="mode === 'rules'" class="px-3 sm:px-6 pt-4 pb-24 space-y-6">
            <RulesModal :is-open="true" :embedded="true" @close="mode = 'home'" />
          </div>

          <!-- 3. MY UNPUBLISHED DRAFTS VIEW -->
          <div v-else-if="mode === 'drafts' && isAuthenticated" class="px-3 sm:px-6 pt-4 space-y-6 pb-24">
            <div class="flex items-center justify-between border-b border-[#26292d] pb-4">
              <div>
                <h2 class="text-xl font-bold text-white flex items-center gap-2">
                  <IconRenderer name="FileText" size="22" class="text-purple-400" />
                  Мои черновики ({{ myDraftsList.length }})
                </h2>
                <p class="text-xs text-dark-muted">Неопубликованные руководства, находящиеся в процессе написания</p>
              </div>
              <div class="flex items-center gap-2">
                <button @click="createNewGuide" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-md flex items-center gap-1.5">
                  <IconRenderer name="Plus" size="14" />
                  <span>Создать черновик</span>
                </button>
                <button @click="mode = 'home'" class="text-xs text-cyan-400 hover:underline">На Главную</button>
              </div>
            </div>

            <div v-if="myDraftsList.length === 0" class="text-center py-20 bg-[#16181a] border border-[#26292d] rounded-2xl space-y-3">
              <IconRenderer name="FileText" size="36" class="mx-auto text-purple-400/40" />
              <h3 class="text-base font-bold text-white">Черновиков пока нет</h3>
              <p class="text-xs text-dark-muted">Создайте новый гайд, и не опубликованные статьи будут сохранены здесь</p>
              <button @click="createNewGuide" class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-lg">
                + Создать первый черновик
              </button>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div
                v-for="guide in myDraftsList"
                :key="guide.meta.id"
                @click="selectGuide(guide.meta.id); mode = 'editor';"
                class="group bg-[#16181a] hover:bg-[#1c1f22] border border-purple-500/30 hover:border-purple-400 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between shadow-md hover:shadow-xl hover:shadow-purple-950/30 hover:-translate-y-1 overflow-hidden relative"
              >
                <!-- DRAFT BADGE TOP LEFT -->
                <div class="absolute top-2.5 left-2.5 z-20 bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold backdrop-blur-md shadow-md flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                  <span>Черновик</span>
                </div>

                <!-- COVER BANNER -->
                <div class="h-28 sm:h-32 w-full relative overflow-hidden flex-shrink-0">
                  <img v-if="guide.meta.coverUrl" :src="guide.meta.coverUrl" class="w-full h-full object-cover object-[center_30%] group-hover:scale-105 transition-transform duration-500" />
                  <div v-else-if="guide.meta.coverGradient" :class="['w-full h-full bg-gradient-to-tr', guide.meta.coverGradient]"></div>
                  <div v-else class="w-full h-full bg-gradient-to-r from-purple-950 via-slate-900 to-[#121416]"></div>
                  <div class="absolute inset-0 bg-gradient-to-t from-[#16181a] via-[#16181a]/20 to-black/30 pointer-events-none"></div>
                </div>

                <!-- BODY -->
                <div class="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div class="space-y-1.5">
                    <h3 class="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
                      {{ guide.meta.title || '(Без названия)' }}
                    </h3>
                    <p class="text-xs text-dark-muted line-clamp-2 leading-relaxed">
                      {{ guide.meta.summary || 'Черновик статьи в процессе наполнения...' }}
                    </p>
                  </div>

                  <div class="flex items-center justify-between pt-2.5 border-t border-[#26292d]/80 text-[11px]">
                    <span class="text-[10px] text-dark-muted">Блоков: {{ (guide.blocks || []).length }}</span>
                    <div class="flex items-center gap-1.5">
                      <button 
                        @click.stop="requestDeleteGuideById(guide.meta.id)" 
                        class="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold transition-all"
                        title="Удалить черновик"
                      >
                        Удалить
                      </button>
                      <button class="bg-purple-600 group-hover:bg-purple-500 text-white px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1">
                        <IconRenderer name="Edit3" size="12" />
                        <span>Редактировать</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TELEMETRY & ANALYTICS FULL PAGE VIEW -->
          <div v-else-if="mode === 'telemetry' && currentUserIsAdmin" class="px-3 sm:px-6 pt-4">
            <TelemetryPage
              :is-admin="currentUserIsAdmin"
              @go-home="mode = 'home'"
              @select-guide="selectGuide"
            />
          </div>

          <!-- CUBIXWORLD TEAM STAFF FULL PAGE VIEW -->
          <div v-else-if="mode === 'team'" class="px-3 sm:px-6 pt-4">
            <TeamPage
              @go-home="mode = 'home'"
              @open-author="openAuthorProfile"
            />
          </div>

          <!-- DEDICATED ADMIN PANEL FULL PAGE VIEW -->
          <div v-else-if="mode === 'admin' && (currentUserIsAdmin || userHasPerm('manage_roles'))" class="px-3 sm:px-6 pt-4">
            <AdminPanel
              :is-admin="currentUserIsAdmin || userHasPerm('manage_roles')"
              :current-username="currentUsername || ''"
              :current-role="currentUserRole"
              @go-home="mode = 'home'"
              @open-profile="openAuthorProfile"
            />
          </div>

          <!-- 4. EDITOR VIEW (Only for authenticated author) -->
          <div v-else-if="mode === 'editor' && isAuthenticated && activeGuide" class="px-3 sm:px-6 pt-4">
            <GuideEditor
              :guide="activeGuide"
              :can-approve="userHasPerm('approve_guide') || currentUserIsAdmin"
              :assigned-servers="currentUserAssignedServers"
              @update:guide="updateActiveGuide"
              @toggle-preview="handleTogglePreview"
              @publish="handlePublish"
              @submit-moderation="handleSubmitModeration"
              @delete="requestDeleteGuide"
            />
          </div>

          <!-- 5. SINGLE GUIDE WIKI READER VIEW -->
          <div v-else-if="activeGuide" class="px-3 sm:px-6 pt-4">
            <GuideView
              :guide="activeGuide"
              :all-guides="guides"
              :is-favorited="favoriteGuideIds.includes(activeGuide.meta.id)"
              :is-preview-mode="isPreviewActive"
              @select-guide="selectGuide"
              @toggle-bookmark="toggleBookmarkGuide"
              @edit-mode="openEditorProtection"
              @open-author="openAuthorProfile"
              @exit-preview="handleExitPreview"
            />
          </div>

          <!-- SINGLE UNIFIED SITE FOOTER -->
          <SiteFooter
            :guides-count="guides.length"
            :servers-count="21"
            @navigate="mode = 'home'"
            @open-terms="isTermsOpen = true"
            @open-rules="isRulesOpen = true"
          />
        </div>
      </template>

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
      @logout="isProfileModalOpen = false; requestLogout();"
    />

    <!-- Password Protected Author Auth Modal -->
    <AuthModal
      :is-open="isAuthModalOpen"
      @close="isAuthModalOpen = false"
      @authenticate="handleAuthentication"
    />

    <!-- Notification Toast Stack Container -->
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none items-end">
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4 scale-90"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-2 scale-95"
      >
        <div
          v-for="t in toasts"
          :key="t.id"
          :class="[
            'pointer-events-auto px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center justify-between gap-3 text-xs font-bold text-white transition-all duration-300 w-full sm:w-auto min-w-[280px]',
            t.type === 'error' ? 'bg-[#1e0e11]/95 border-rose-500/50 shadow-rose-950/40 text-rose-200' :
            t.type === 'info' ? 'bg-[#0e1720]/95 border-cyan-500/50 shadow-cyan-950/40 text-cyan-200' :
            'bg-[#0e1e15]/95 border-emerald-500/50 shadow-emerald-950/40 text-emerald-200'
          ]"
        >
          <!-- Left Icon & Message Body -->
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div :class="[
              'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-inner',
              t.type === 'error' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
              t.type === 'info' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            ]">
              <IconRenderer :name="t.type === 'error' ? 'AlertCircle' : t.type === 'info' ? 'Info' : 'Check'" size="15" />
            </div>
            <span class="tracking-wide leading-relaxed break-words line-clamp-3 select-text">{{ t.message }}</span>
          </div>

          <!-- Action Buttons: Copy & Close -->
          <div class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              @click="copyToastText(t)"
              :title="t.copied ? 'Скопировано!' : 'Скопировать текст'"
              :class="[
                'p-1.5 rounded-lg transition-colors border',
                t.copied ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-transparent'
              ]"
            >
              <IconRenderer :name="t.copied ? 'Check' : 'Copy'" size="13" />
            </button>

            <button
              type="button"
              @click="removeToast(t.id)"
              title="Закрыть уведомление"
              class="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/60 hover:text-rose-300 transition-colors border border-transparent hover:border-rose-500/30"
            >
              <IconRenderer name="X" size="13" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Settings Modal -->
    <SettingsModal
      :is-open="isSettingsOpen"
      :current-theme="currentTheme"
      :is-admin="currentUserIsAdmin"
      :is-authenticated="isAuthenticated"
      :guides-count="guides.length"
      @close="isSettingsOpen = false"
      @select-theme="applyTheme"
      @export-data="handleExportData"
      @import-data="handleImportData"
      @clear-drafts="handleClearDrafts"
      @logout="isSettingsOpen = false; requestLogout();"
    />

    <!-- LOGOUT CONFIRMATION MODAL -->
    <ConfirmModal
      :is-open="isLogoutConfirmOpen"
      title="Выход из аккаунта"
      message="Вы действительно хотите выйти из аккаунта автора? Для повторного редактирования потребуется ввести пароль."
      confirm-text="Да, выйти из аккаунта"
      cancel-text="Отмена"
      type="danger"
      @confirm="logoutAuthor"
      @cancel="isLogoutConfirmOpen = false"
    />

    <!-- Terms Modal -->
    <TermsModal :is-open="isTermsOpen" @close="isTermsOpen = false" />

    <!-- Rules Modal -->
    <RulesModal
      :is-open="isRulesOpen"
      :initial-tab="initialRulesTab"
      :initial-server="initialRulesServer"
      @update-tab="(t) => { initialRulesTab = t; updateUrlRoute(); }"
      @update-server="(s) => { initialRulesServer = s; updateUrlRoute(); }"
      @close="isRulesOpen = false"
    />

    <!-- Cookie Banner -->
    <CookieBanner @open-terms="isTermsOpen = true" />
  </div>
</template>
