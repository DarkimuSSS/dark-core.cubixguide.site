<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import IconRenderer from './IconRenderer.vue';
import type { AuthorMediaItem } from '../types/guide';

const props = defineProps<{
  isOpen: boolean;
  username: string;
  isSelectMode?: boolean; // If true, clicking an image emits 'select'
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', media: AuthorMediaItem): void;
}>();

const mediaList = ref<AuthorMediaItem[]>([]);
const newImageName = ref('');
const newImageUrl = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const searchQuery = ref('');

const STORAGE_KEY = computed(() => `cubix_author_gallery_${(props.username || 'default').toLowerCase()}`);

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

onMounted(() => {
  loadGallery();
});

const filteredMedia = computed(() => {
  if (!searchQuery.value.trim()) return mediaList.value;
  const q = searchQuery.value.toLowerCase().trim();
  return mediaList.value.filter(m => m.name.toLowerCase().includes(q) || m.url.toLowerCase().includes(q));
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
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
    <div class="bg-[#16181a] border border-[#26292d] w-full max-w-3xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
      
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-[#26292d] pb-4">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-cyan-950/50">
            <IconRenderer name="FolderPlus" size="22" />
          </div>
          <div>
            <h2 class="text-xl font-extrabold text-white flex items-center gap-2">
              Персональная галерея и текстуры автора
            </h2>
            <p class="text-xs text-dark-muted">
              {{ isSelectMode ? 'Выберите текстуру/картинку для использования в 3D структуре или гайде' : 'Загружайте собственные текстуры блоков для построек и иллюстрирования статей' }}
            </p>
          </div>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="text-dark-muted hover:text-white p-1.5 rounded-xl hover:bg-[#212429] transition-all cursor-pointer"
        >
          <IconRenderer name="X" size="20" />
        </button>
      </div>

      <!-- Add New Image Section -->
      <div class="bg-[#0c0d0e] border border-[#26292d] p-4 rounded-2xl space-y-3 shadow-inner">
        <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <IconRenderer name="Plus" size="14" class="text-cyan-400" />
          Добавить новую текстуру или картинку
        </h4>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-bold text-dark-muted mb-1">Название блока/текстуры</label>
            <input
              type="text"
              v-model="newImageName"
              placeholder="например, Закаленный корпус..."
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
          <!-- File Upload Button -->
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
            <span>Сохранить в палитру</span>
          </button>
        </div>

        <!-- Feedback alerts -->
        <p v-if="errorMessage" class="text-xs font-bold text-rose-400 bg-rose-500/10 p-2 rounded-xl border border-rose-500/30">
          {{ errorMessage }}
        </p>
        <p v-if="successMessage" class="text-xs font-bold text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/30">
          {{ successMessage }}
        </p>
      </div>

      <!-- Search & Gallery Grid -->
      <div class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Ваша коллекция ({{ filteredMedia.length }})
          </h4>

          <div class="relative w-48">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Поиск по галерее..."
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-cyan-400"
            />
            <IconRenderer name="Search" size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-muted" />
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredMedia.length === 0" class="text-center py-12 bg-[#0c0d0e] rounded-2xl border border-[#26292d] space-y-2">
          <IconRenderer name="Image" size="32" class="mx-auto text-dark-muted/40" />
          <p class="text-xs text-dark-muted">В вашей коллекции пока нет загруженных текстур</p>
        </div>

        <!-- Media Items Grid -->
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto custom-scrollbar p-1">
          <div
            v-for="item in filteredMedia"
            :key="item.id"
            @click="selectMediaItem(item)"
            :class="[
              'group bg-[#0c0d0e] border rounded-2xl p-2.5 space-y-2 relative transition-all shadow-md overflow-hidden',
              isSelectMode ? 'hover:border-cyan-400 cursor-pointer hover:shadow-cyan-950/50 hover:-translate-y-0.5' : 'border-[#26292d]'
            ]"
          >
            <!-- Image Preview Box -->
            <div class="w-full h-24 rounded-xl bg-[#16181a] overflow-hidden relative border border-white/5">
              <img :src="item.url" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <button
                type="button"
                @click.stop="deleteMedia(item.id)"
                class="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 text-rose-400 hover:bg-rose-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
                title="Удалить из коллекции"
              >
                <IconRenderer name="Trash2" size="13" />
              </button>
            </div>

            <!-- Media Info -->
            <div class="space-y-0.5 text-left">
              <h5 class="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                {{ item.name }}
              </h5>
              <p class="text-[10px] text-dark-muted font-mono">{{ item.uploadedAt }}</p>
            </div>

            <!-- Select Overlay Badge -->
            <div v-if="isSelectMode" class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span class="px-2 py-0.5 rounded-lg bg-cyan-500 text-white text-[10px] font-extrabold shadow-md">
                Выбрать ➔
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
