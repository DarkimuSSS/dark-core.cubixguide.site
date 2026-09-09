<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import IconRenderer from './IconRenderer.vue';
import BlockModelEditorModal from './BlockModelEditorModal.vue';
import BlockModelGalleryModal from './BlockModelGalleryModal.vue';
import type { AuthorMediaItem, AssetPack, MultiblockPaletteItem } from '../types/guide';

const props = defineProps<{
  isOpen: boolean;
  username: string;
  isSelectMode?: boolean; // If true, clicking an image emits 'select'
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', media: AuthorMediaItem): void;
  (e: 'select-model', model: MultiblockPaletteItem): void;
}>();

const activeTab = ref<'my' | 'market'>('my');
const isModelEditorOpen = ref(false);
const isModelGalleryOpen = ref(false);

// Personal Gallery State
const mediaList = ref<AuthorMediaItem[]>([]);
const newImageName = ref('');
const newImageUrl = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const searchQuery = ref('');

// Marketplace State
const marketPacks = ref<AssetPack[]>([]);
const isMarketLoading = ref(false);
const marketSearchQuery = ref('');
const selectedCategory = ref('Все');

// Publish Pack Modal State
const isPublishModalOpen = ref(false);
const publishTitle = ref('');
const publishDescription = ref('');
const publishCategory = ref('Общий');
const selectedItemIdsForPack = ref<string[]>([]);
const publishErrorMessage = ref('');
const publishSuccessMessage = ref('');
const isPublishing = ref(false);

const CATEGORIES = ['Все', 'Minecraft Блоки', 'Индустриальные', 'Магия & Алхимия', 'Общий'];

const effectiveUsername = computed(() => {
  if (props.username && props.username.trim()) return props.username.trim();
  try {
    const savedUser = localStorage.getItem('cubix_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed && parsed.username) return parsed.username;
    }
  } catch (e) {}
  return 'author';
});

const STORAGE_KEY = computed(() => `cubix_author_gallery_${effectiveUsername.value.toLowerCase()}`);

const loadGallery = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY.value);
    if (saved) {
      mediaList.value = JSON.parse(saved);
    } else {
      // Default sample Minecraft blocks presets
      mediaList.value = [
        { id: 'm1', name: 'Текстура Корпуса Реактора', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80', uploadedAt: '2026-09-09' },
        { id: 'm2', name: 'Улучшенное Квантовое Стекло', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80', uploadedAt: '2026-09-09' },
        { id: 'm3', name: 'Магическая Руна Таумкрафта', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80', uploadedAt: '2026-09-09' },
        { id: 'm4', name: 'Плотный Инваровый Сплав', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&auto=format&fit=crop&q=80', uploadedAt: '2026-09-09' }
      ];
    }
  } catch (e) {
    console.error('Error loading gallery:', e);
  }
};

const saveGallery = () => {
  try {
    localStorage.setItem(STORAGE_KEY.value, JSON.stringify(mediaList.value));
  } catch (e) {
    console.error('Error saving gallery:', e);
  }
};

const fetchMarketPacks = async () => {
  isMarketLoading.value = true;
  try {
    const res = await fetch('/api/market/packs');
    if (res.ok) {
      marketPacks.value = await res.json();
    }
  } catch (e) {
    console.error('Failed to load market packs:', e);
  } finally {
    isMarketLoading.value = false;
  }
};

onMounted(() => {
  loadGallery();
  fetchMarketPacks();
});

watch(() => props.isOpen, (val) => {
  if (val) {
    loadGallery();
    fetchMarketPacks();
  }
});

const filteredMedia = computed(() => {
  if (!searchQuery.value.trim()) return mediaList.value;
  const q = searchQuery.value.toLowerCase().trim();
  return mediaList.value.filter(m => m.name.toLowerCase().includes(q) || m.url.toLowerCase().includes(q));
});

const filteredMarketPacks = computed(() => {
  let list = marketPacks.value;
  if (selectedCategory.value !== 'Все') {
    list = list.filter(p => p.category === selectedCategory.value);
  }
  if (marketSearchQuery.value.trim()) {
    const q = marketSearchQuery.value.toLowerCase().trim();
    list = list.filter(p => p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
  }
  return list;
});

const handleAddMedia = () => {
  errorMessage.value = '';
  successMessage.value = '';

  if (!newImageUrl.value.trim()) {
    errorMessage.value = 'Укажите URL-ссылку на изображение';
    return;
  }

  const name = newImageName.value.trim() || `Текстура #${mediaList.value.length + 1}`;
  const newItem: AuthorMediaItem = {
    id: `media_${Date.now()}`,
    name,
    url: newImageUrl.value.trim(),
    uploadedAt: new Date().toISOString().split('T')[0]
  };

  mediaList.value.unshift(newItem);
  saveGallery();

  newImageName.value = '';
  newImageUrl.value = '';
  successMessage.value = 'Текстура успешно добавлена в вашу галерею!';
};

const handleFileUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (file.size > 3 * 1024 * 1024) {
    errorMessage.value = 'Размер файла слишком велик (макс 3MB)';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const dataUrl = event.target?.result as string;
    if (dataUrl) {
      const newItem: AuthorMediaItem = {
        id: `media_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        url: dataUrl,
        uploadedAt: new Date().toISOString().split('T')[0]
      };
      mediaList.value.unshift(newItem);
      saveGallery();
      successMessage.value = 'Картинка загружена!';
    }
  };
  reader.readAsDataURL(file);
};

const deleteMedia = (id: string) => {
  mediaList.value = mediaList.value.filter(m => m.id !== id);
  saveGallery();
};

const selectMediaItem = (item: AuthorMediaItem) => {
  if (props.isSelectMode) {
    emit('select', item);
    emit('close');
  }
};

// Install pack from Market
const installPack = async (pack: AssetPack) => {
  successMessage.value = '';
  errorMessage.value = '';

  // Add pack items to author local gallery without duplicates
  let addedCount = 0;
  for (const item of pack.items) {
    const exists = mediaList.value.some(m => m.url === item.url);
    if (!exists) {
      mediaList.value.unshift({
        id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: `${item.name} (${pack.title})`,
        url: item.url,
        uploadedAt: new Date().toISOString().split('T')[0]
      });
      addedCount++;
    }
  }

  saveGallery();

  try {
    await fetch(`/api/market/packs/${pack.id}/install`, { method: 'POST' });
    pack.downloads += 1;
  } catch (e) {}

  successMessage.value = `Пак "${pack.title}" добавлен в вашу галерею! (${addedCount} новых текстур)`;
  activeTab.value = 'my';
};

const deleteMarketPack = async (packId: string) => {
  if (!confirm('Вы действительно хотите удалить этот пак из Маркетплейса?')) return;
  try {
    const res = await fetch(`/api/market/packs/${packId}?requestingUsername=${encodeURIComponent(props.username)}&isAdmin=true`, {
      method: 'DELETE'
    });
    if (res.ok) {
      marketPacks.value = marketPacks.value.filter(p => p.id !== packId);
    }
  } catch (e) {
    console.error('Failed to delete pack:', e);
  }
};

// Open Publish Modal
const openPublishModal = () => {
  publishTitle.value = '';
  publishDescription.value = '';
  publishCategory.value = 'Общий';
  selectedItemIdsForPack.value = mediaList.value.map(m => m.id);
  publishErrorMessage.value = '';
  publishSuccessMessage.value = '';
  isPublishModalOpen.value = true;
};

const toggleSelectAllItemsForPack = () => {
  if (selectedItemIdsForPack.value.length === mediaList.value.length) {
    selectedItemIdsForPack.value = [];
  } else {
    selectedItemIdsForPack.value = mediaList.value.map(m => m.id);
  }
};

const toggleItemForPack = (id: string) => {
  if (selectedItemIdsForPack.value.includes(id)) {
    selectedItemIdsForPack.value = selectedItemIdsForPack.value.filter(i => i !== id);
  } else {
    selectedItemIdsForPack.value.push(id);
  }
};

const publishPack = async () => {
  publishErrorMessage.value = '';
  publishSuccessMessage.value = '';

  if (!publishTitle.value.trim()) {
    publishErrorMessage.value = 'Укажите название пака';
    return;
  }
  if (selectedItemIdsForPack.value.length === 0) {
    publishErrorMessage.value = 'Выберите хотя бы одну текстуру для набора';
    return;
  }

  const itemsToPublish = mediaList.value
    .filter(m => selectedItemIdsForPack.value.includes(m.id))
    .map(m => ({ id: m.id, name: m.name, url: m.url }));

  isPublishing.value = true;

  try {
    const res = await fetch('/api/market/packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: publishTitle.value.trim(),
        description: publishDescription.value.trim(),
        author: props.username || 'Анонимный Автор',
        category: publishCategory.value,
        items: itemsToPublish
      })
    });

    if (res.ok) {
      publishSuccessMessage.value = 'Пак успешно опубликован в Маркетплейсе!';
      setTimeout(() => {
        isPublishModalOpen.value = false;
        fetchMarketPacks();
        activeTab.value = 'market';
      }, 1000);
    } else {
      const err = await res.json();
      publishErrorMessage.value = err.error || 'Ошибка публикации пака';
    }
  } catch (e) {
    publishErrorMessage.value = 'Ошибка соединения с сервером';
  } finally {
    isPublishing.value = false;
  }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-fadeIn">
    <div class="bg-[#16181a] border border-[#26292d] w-full max-w-4xl rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 relative max-h-[92vh] flex flex-col overflow-hidden">
      
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-[#26292d] pb-4 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-cyan-950/50">
            <IconRenderer name="FolderPlus" size="22" />
          </div>
          <div>
            <h2 class="text-xl font-extrabold text-white flex items-center gap-2">
              Галерея & Маркетплейс текстур
            </h2>
            <p class="text-xs text-dark-muted">
              {{ isSelectMode ? 'Выберите текстуру для использования в 3D структуре' : 'Загружайте свои текстуры или скачивайте паки сообщества' }}
            </p>
          </div>
        </div>

        <!-- Close Button -->
        <button
          type="button"
          @click="emit('close')"
          class="text-dark-muted hover:text-white p-2 rounded-xl hover:bg-[#212429] transition-all cursor-pointer"
        >
          <IconRenderer name="X" size="20" />
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center justify-between gap-3 border-b border-[#26292d] pb-3 shrink-0 flex-wrap">
        <div class="flex items-center gap-2 bg-[#0c0d0e] p-1.5 rounded-2xl border border-[#26292d] flex-wrap">
          <button
            type="button"
            @click="activeTab = 'my'"
            :class="[
              'px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'my' ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            ]"
          >
            <IconRenderer name="Folder" size="15" />
            <span>Моя галерея ({{ mediaList.length }})</span>
          </button>

          <button
            type="button"
            @click="activeTab = 'market'"
            :class="[
              'px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer relative',
              activeTab === 'market' ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            ]"
          >
            <IconRenderer name="ShoppingBag" size="15" />
            <span>Маркетплейс паков</span>
            <span class="px-1.5 py-0.5 text-[10px] bg-amber-400/20 text-amber-300 font-extrabold rounded-md border border-amber-400/30">
              {{ marketPacks.length }}
            </span>
          </button>
        </div>

        <!-- Action: Publish Pack to Marketplace -->
        <button
          v-if="activeTab === 'my' && mediaList.length > 0"
          type="button"
          @click="openPublishModal"
          class="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <IconRenderer name="Share2" size="14" />
          <span>Опубликовать пак</span>
        </button>
      </div>

      <!-- Feedback Global Banners -->
      <div v-if="successMessage || errorMessage" class="shrink-0 space-y-2">
        <p v-if="successMessage" class="text-xs font-bold text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30 flex items-center justify-between">
          <span>{{ successMessage }}</span>
          <button @click="successMessage = ''" class="text-emerald-400 hover:text-white"><IconRenderer name="X" size="14" /></button>
        </p>
        <p v-if="errorMessage" class="text-xs font-bold text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30 flex items-center justify-between">
          <span>{{ errorMessage }}</span>
          <button @click="errorMessage = ''" class="text-rose-400 hover:text-white"><IconRenderer name="X" size="14" /></button>
        </p>
      </div>

      <!-- TAB 1: MY GALLERY -->
      <div v-if="activeTab === 'my'" class="space-y-4 overflow-y-auto custom-scrollbar pr-1 flex-1">
        
        <!-- Add New Image Box -->
        <div class="bg-[#0c0d0e] border border-[#26292d] p-4 rounded-2xl space-y-3 shadow-inner">
          <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <IconRenderer name="Plus" size="14" class="text-cyan-400" />
            Загрузить текстуру с ПК или добавить по URL
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-dark-muted mb-1">Название текстуры</label>
              <input
                type="text"
                v-model="newImageName"
                placeholder="например, Кварцевая плита..."
                class="w-full bg-[#121416] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label class="block text-[11px] font-bold text-dark-muted mb-1">URL-ссылка на картинку</label>
              <input
                type="text"
                v-model="newImageUrl"
                placeholder="https://i.imgur.com/example.png..."
                class="w-full bg-[#121416] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 pt-1">
            <label class="px-3 py-2 rounded-xl bg-[#16181a] hover:bg-[#212429] border border-[#26292d] text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer transition-all">
              <IconRenderer name="Upload" size="14" class="text-purple-400" />
              <span>Загрузить с ПК</span>
              <input type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
            </label>

            <button
              type="button"
              @click="handleAddMedia"
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <IconRenderer name="Check" size="14" />
              <span>Добавить в палитру</span>
            </button>
          </div>
        </div>

        <!-- Search Header -->
        <div class="flex items-center justify-between gap-3 pt-2">
          <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Ваши сохраненные текстуры ({{ filteredMedia.length }})
          </h4>

          <div class="relative w-48">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Поиск..."
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-cyan-400"
            />
            <IconRenderer name="Search" size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-muted" />
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredMedia.length === 0" class="text-center py-12 bg-[#0c0d0e] rounded-2xl border border-[#26292d] space-y-2">
          <IconRenderer name="Image" size="32" class="mx-auto text-dark-muted/40" />
          <p class="text-xs text-dark-muted">В вашей галерее пока нет текстур</p>
        </div>

        <!-- Media Grid -->
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <div
            v-for="item in filteredMedia"
            :key="item.id"
            @click="selectMediaItem(item)"
            :class="[
              'group bg-[#0c0d0e] border rounded-2xl p-2.5 space-y-2 relative transition-all shadow-md overflow-hidden',
              isSelectMode ? 'hover:border-cyan-400 cursor-pointer hover:shadow-cyan-950/50 hover:-translate-y-0.5' : 'border-[#26292d]'
            ]"
          >
            <div class="w-full h-24 rounded-xl bg-[#16181a] overflow-hidden relative border border-white/5">
              <img :src="item.url" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div v-if="isSelectMode" class="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span class="bg-cyan-500 text-black text-[10px] font-black px-2 py-1 rounded-lg shadow-lg">Выбрать</span>
              </div>
            </div>

            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs font-bold text-white truncate">{{ item.name }}</p>
                <p class="text-[10px] text-dark-muted">{{ item.uploadedAt }}</p>
              </div>
              <button
                type="button"
                @click.stop="deleteMedia(item.id)"
                class="text-rose-400/60 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                title="Удалить"
              >
                <IconRenderer name="Trash2" size="13" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: MARKETPLACE -->
      <div v-if="activeTab === 'market'" class="space-y-4 overflow-y-auto custom-scrollbar pr-1 flex-1">
        
        <!-- Marketplace Filters & Categories -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0c0d0e] p-3 rounded-2xl border border-[#26292d]">
          <!-- Category Pills -->
          <div class="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar pb-1 sm:pb-0">
            <button
              v-for="cat in CATEGORIES"
              :key="cat"
              type="button"
              @click="selectedCategory = cat"
              :class="[
                'px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer',
                selectedCategory === cat ? 'bg-amber-500 text-black font-black shadow-md' : 'bg-[#16181a] text-slate-400 hover:text-white border border-[#26292d]'
              ]"
            >
              {{ cat }}
            </button>
          </div>

          <!-- Search Input -->
          <div class="relative w-full sm:w-56">
            <input
              type="text"
              v-model="marketSearchQuery"
              placeholder="Поиск паков..."
              class="w-full bg-[#16181a] border border-[#26292d] text-white text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-amber-400"
            />
            <IconRenderer name="Search" size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-muted" />
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isMarketLoading" class="text-center py-12">
          <div class="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p class="text-xs text-dark-muted font-bold">Загрузка Маркетплейса паков...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredMarketPacks.length === 0" class="text-center py-12 bg-[#0c0d0e] rounded-2xl border border-[#26292d] space-y-2">
          <IconRenderer name="ShoppingBag" size="32" class="mx-auto text-dark-muted/40" />
          <p class="text-xs text-dark-muted font-bold">Публичных паков пока нет в этой категории</p>
        </div>

        <!-- Market Packs Cards Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="pack in filteredMarketPacks"
            :key="pack.id"
            class="bg-[#0c0d0e] border border-[#26292d] rounded-2xl p-4 space-y-3 shadow-lg hover:border-amber-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div class="flex items-start justify-between gap-2 mb-1">
                <div>
                  <h3 class="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>{{ pack.title }}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/30">
                      {{ pack.category }}
                    </span>
                  </h3>
                  <p class="text-[11px] text-dark-muted font-medium flex items-center gap-1 mt-0.5">
                    <span>Автор:</span>
                    <span class="text-cyan-400 font-bold">{{ pack.author }}</span>
                  </p>
                </div>

                <div class="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400 bg-[#16181a] px-2.5 py-1 rounded-xl border border-[#26292d]">
                  <IconRenderer name="Download" size="12" class="text-emerald-400" />
                  <span>{{ pack.downloads }}</span>
                </div>
              </div>

              <p v-if="pack.description" class="text-xs text-slate-300 leading-relaxed mb-3 line-clamp-2">
                {{ pack.description }}
              </p>

              <!-- Texture Items Preview -->
              <div class="grid grid-cols-5 gap-1.5 my-2">
                <div
                  v-for="(item, idx) in pack.items.slice(0, 5)"
                  :key="idx"
                  class="w-full h-12 rounded-lg bg-[#16181a] border border-white/10 overflow-hidden relative"
                  :title="item.name"
                >
                  <img :src="item.url" class="w-full h-full object-cover" />
                </div>
                <div v-if="pack.items.length > 5" class="w-full h-12 rounded-lg bg-[#16181a] border border-white/10 flex items-center justify-center text-[10px] font-black text-amber-300">
                  +{{ pack.items.length - 5 }}
                </div>
              </div>
            </div>

            <!-- Card Action Footer -->
            <div class="flex items-center justify-between gap-2 pt-2 border-t border-[#26292d]">
              <span class="text-[10px] text-dark-muted font-bold">
                Текстур в паке: {{ pack.items.length }}
              </span>

              <div class="flex items-center gap-2">
                <button
                  v-if="pack.author.toLowerCase() === (username || '').toLowerCase()"
                  type="button"
                  @click="deleteMarketPack(pack.id)"
                  class="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition-all cursor-pointer"
                  title="Удалить пак"
                >
                  <IconRenderer name="Trash2" size="14" />
                </button>

                <button
                  type="button"
                  @click="installPack(pack)"
                  class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <IconRenderer name="Plus" size="14" />
                  <span>Использовать пак</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- PUBLISH PACK MODAL OVERLAY -->
    <div v-if="isPublishModalOpen" class="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div class="bg-[#16181a] border border-[#26292d] w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 relative">
        <div class="flex items-center justify-between border-b border-[#26292d] pb-3">
          <h3 class="text-base font-extrabold text-white flex items-center gap-2">
            <IconRenderer name="Share2" size="18" class="text-amber-400" />
            Опубликовать пак в Маркетплейс
          </h3>
          <button @click="isPublishModalOpen = false" class="text-dark-muted hover:text-white">
            <IconRenderer name="X" size="18" />
          </button>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-[11px] font-bold text-dark-muted mb-1">Название пака</label>
            <input
              type="text"
              v-model="publishTitle"
              placeholder="например, Текстуры Квантовых Блоков v1"
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label class="block text-[11px] font-bold text-dark-muted mb-1">Категория</label>
            <select
              v-model="publishCategory"
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option v-for="cat in CATEGORIES.filter(c => c !== 'Все')" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-dark-muted mb-1">Описание набора (опционально)</label>
            <textarea
              v-model="publishDescription"
              rows="2"
              placeholder="Краткое описание текстур в этом паке..."
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400"
            ></textarea>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-[11px] font-bold text-dark-muted">Выберите текстуры для включения в пак</label>
              <button
                type="button"
                @click="toggleSelectAllItemsForPack"
                class="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer"
              >
                {{ selectedItemIdsForPack.length === mediaList.length ? 'Снять выделение' : 'Выбрать все' }}
              </button>
            </div>

            <div class="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1 bg-[#0c0d0e] border border-[#26292d] rounded-xl">
              <div
                v-for="item in mediaList"
                :key="item.id"
                @click="toggleItemForPack(item.id)"
                :class="[
                  'relative h-14 rounded-lg overflow-hidden border cursor-pointer transition-all',
                  selectedItemIdsForPack.includes(item.id) ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-transparent opacity-50'
                ]"
              >
                <img :src="item.url" class="w-full h-full object-cover" />
                <div v-if="selectedItemIdsForPack.includes(item.id)" class="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold text-[10px]">
                  ✓
                </div>
              </div>
            </div>
          </div>
        </div>

        <p v-if="publishErrorMessage" class="text-xs font-bold text-rose-400 bg-rose-500/10 p-2 rounded-xl border border-rose-500/30">
          {{ publishErrorMessage }}
        </p>
        <p v-if="publishSuccessMessage" class="text-xs font-bold text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/30">
          {{ publishSuccessMessage }}
        </p>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            @click="isPublishModalOpen = false"
            class="px-3.5 py-2 rounded-xl bg-[#0c0d0e] hover:bg-[#202327] border border-[#26292d] text-white text-xs font-bold cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            @click="publishPack"
            :disabled="isPublishing"
            class="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <IconRenderer name="Check" size="14" />
            <span>{{ isPublishing ? 'Публикация...' : 'Опубликовать' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 3D BLOCK MODEL EDITOR MODAL -->
    <BlockModelEditorModal
      :is-open="isModelEditorOpen"
      :username="props.username"
      @close="isModelEditorOpen = false"
      @select-model="(model) => { emit('select-model', model); isModelEditorOpen = false; emit('close'); }"
    />

    <!-- 3D BLOCK MODEL GALLERY MODAL -->
    <BlockModelGalleryModal
      :is-open="isModelGalleryOpen"
      :author-name="props.username"
      @close="isModelGalleryOpen = false"
      @select-model="(model) => { 
        emit('select-model', {
          id: model.id,
          name: model.name,
          icon: 'Box',
          color: '#3b82f6',
          topImageUrl: model.textures.top,
          bottomImageUrl: model.textures.bottom,
          sideImageUrl: model.textures.north || model.textures.south || model.textures.east || model.textures.west
        }); 
        isModelGalleryOpen = false; 
        emit('close'); 
      }"
    />
  </div>
</template>
