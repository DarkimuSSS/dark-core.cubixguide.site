<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import GuideEditor from './components/GuideEditor.vue';
import GuideView from './components/GuideView.vue';
import IconRenderer from './components/IconRenderer.vue';
import AuthModal from './components/AuthModal.vue';
import { PRESET_ITEMS } from './data/presetItems';
import type { Guide } from './types/guide';

const guides = ref<Guide[]>([]);
const activeGuideId = ref<string>('');
const activeGuide = ref<Guide | null>(null);

// DEFAULT MODE: Always default to 'reader' (Вики / База Знаний) for regular readers!
const mode = ref<'editor' | 'reader'>('reader');
const isLoading = ref<boolean>(true);

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

// Check Session Auth Status
onMounted(() => {
  const savedAuth = sessionStorage.getItem('cubix_author_authed');
  if (savedAuth === 'true') {
    isAuthenticated.value = true;
  }
  fetchGuides();
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

const openEditorProtection = () => {
  if (isAuthenticated.value) {
    mode.value = 'editor';
  } else {
    isAuthModalOpen.value = true;
  }
};

const handleAuthentication = (success: boolean) => {
  if (success) {
    isAuthenticated.value = true;
    sessionStorage.setItem('cubix_author_authed', 'true');
    isAuthModalOpen.value = false;
    mode.value = 'editor';
    showToast('Доступ автора подтвержден!');
  }
};

const logoutAuthor = () => {
  isAuthenticated.value = false;
  sessionStorage.removeItem('cubix_author_authed');
  mode.value = 'reader';
  showToast('Вы вышли из режима редактирования');
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
const fetchGuides = async () => {
  try {
    isLoading.value = true;
    const res = await fetch('/api/guides');
    if (!res.ok) throw new Error('Ошибка загрузки данных');
    const data: Guide[] = await res.json();
    guides.value = data;

    if (data.length > 0) {
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
    isLoading.value = false;
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
      showToast(`Загружен гайд: ${found.meta.title}`);
    }
  }
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

  const newGuide: Guide = {
    meta: {
      id: `guide_${Date.now()}`,
      title: 'Новый майнкрафт гайд',
      category: 'ХайТек',
      author: 'Игрок',
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
        type: 'crafting',
        craftingGrid: Array(9).fill(null).map((_, i) => ({ index: i, item: null, count: 1 })),
        craftingOutput: { index: 9, item: PRESET_ITEMS[0], count: 1 }
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
  activeGuide.value.meta.published = true;
  activeGuide.value.meta.updatedAt = new Date().toISOString().split('T')[0];

  try {
    const res = await fetch(`/api/guides/${activeGuide.value.meta.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activeGuide.value)
    });

    if (res.ok) {
      const idx = guides.value.findIndex(g => g.meta.id === activeGuide.value?.meta.id);
      if (idx !== -1) guides.value[idx] = activeGuide.value;
      clearDraftLocalStorage(activeGuide.value.meta.id);
      showToast('Гайд успешно сохранен в базу данных!');
      mode.value = 'reader';
    }
  } catch (err) {
    console.error('Ошибка сохранения:', err);
    showToast('Ошибка при сохранении гайда');
  }
};

const handleDeleteGuide = async () => {
  if (!activeGuide.value) return;
  const guideId = activeGuide.value.meta.id;
  try {
    const res = await fetch(`/api/guides/${guideId}`, { method: 'DELETE' });
    if (res.ok) {
      clearDraftLocalStorage(guideId);
      showToast('Гайд удален');
      await fetchGuides();
    }
  } catch (err) {
    console.error('Ошибка удаления:', err);
  }
};
</script>

<template>
  <div class="min-h-screen bg-[#0c0d0e] text-[#e2e8f0] font-sans antialiased">
    <!-- Top Reader Header Bar -->
    <header class="bg-[#16181a] border-b border-[#26292d] h-16 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 p-0.5 shadow-lg shadow-emerald-950/50">
          <div class="w-full h-full bg-[#0c0d0e] rounded-[10px] flex items-center justify-center text-emerald-400">
            <IconRenderer name="Box" size="20" />
          </div>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-base font-extrabold text-white tracking-tight">CubixGuide</span>
            <span class="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">База Знаний</span>
          </div>
          <p class="text-[11px] text-dark-muted hidden sm:block">Интерактивные руководства для игроков</p>
        </div>
      </div>

      <!-- Center & Right Navigation -->
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

        <!-- Guide Selector -->
        <div v-if="guides.length > 0" class="relative hidden md:block">
          <select 
            :value="activeGuideId"
            @change="selectGuide(($event.target as HTMLSelectElement).value)"
            class="bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-accent pr-8 cursor-pointer"
          >
            <option v-for="g in guides" :key="g.meta.id" :value="g.meta.id">
              {{ g.meta.title }}
            </option>
          </select>
        </div>

        <button
          v-if="isAuthenticated"
          type="button"
          @click="createNewGuide"
          class="px-3 py-2 rounded-xl bg-[#121416] hover:bg-[#212429] border border-[#26292d] text-cyan-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <IconRenderer name="Plus" size="15" />
          <span class="hidden sm:inline">Новый гайд</span>
        </button>

        <!-- Viewer Mode & Password Protected Author Access Button -->
        <div v-if="!isAuthenticated">
          <button
            type="button"
            @click="openEditorProtection"
            class="px-3.5 py-1.5 rounded-xl bg-[#121416] hover:bg-[#212429] border border-[#26292d] text-dark-muted hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <IconRenderer name="Lock" size="14" class="text-amber-400" />
            <span>Вход для авторов</span>
          </button>
        </div>

        <!-- Authenticated Author Toggles -->
        <div v-else class="flex items-center gap-2">
          <div class="flex items-center bg-[#0c0d0e] p-1 rounded-xl border border-[#26292d]">
            <button
              type="button"
              @click="mode = 'reader'"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
                mode === 'reader' 
                  ? 'bg-cyan-600 text-white shadow-md' 
                  : 'text-dark-muted hover:text-white'
              ]"
            >
              <IconRenderer name="BookOpen" size="14" />
              <span>Вики</span>
            </button>
            <button
              type="button"
              @click="mode = 'editor'"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
                mode === 'editor' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-dark-muted hover:text-white'
              ]"
            >
              <IconRenderer name="Edit3" size="14" />
              <span>Конструктор</span>
            </button>
          </div>

          <button
            type="button"
            @click="logoutAuthor"
            class="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition-all"
            title="Выйти из режима автора"
          >
            <IconRenderer name="X" size="14" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="pt-6">
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 text-dark-muted space-y-3">
        <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <div class="text-xs">Загрузка гайдов...</div>
      </div>

      <div v-else-if="!activeGuide" class="text-center py-20 space-y-4">
        <h3 class="text-lg font-bold text-white">Нет доступных гайдов</h3>
      </div>

      <template v-else>
        <!-- Editor View (Only when authenticated author clicks editor) -->
        <GuideEditor
          v-if="mode === 'editor' && isAuthenticated"
          :guide="activeGuide"
          @update:guide="updateActiveGuide"
          @toggle-preview="mode = 'reader'"
          @publish="handlePublish"
          @delete="handleDeleteGuide"
        />

        <!-- Default Wiki Reader View for regular visitors -->
        <GuideView
          v-else
          :guide="activeGuide"
          :all-guides="guides"
          @select-guide="selectGuide"
          @edit-mode="openEditorProtection"
        />
      </template>
    </div>

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
  </div>
</template>
