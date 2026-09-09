<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import IconRenderer from './IconRenderer.vue';
import AuthorGalleryModal from './AuthorGalleryModal.vue';
import type { CustomBlockModel, AuthorMediaItem, MultiblockPaletteItem } from '../types/guide';

const props = defineProps<{
  isOpen: boolean;
  username: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select-model', model: MultiblockPaletteItem): void;
}>();

// 3D Canvas Orbit Controls
const isDragging = ref(false);
const previousMousePosition = ref({ x: 0, y: 0 });
const rotX = ref(-20);
const rotY = ref(35);
const isAutoRotating = ref(true);
let autoRotateTimer: any = null;

// Active Editing Model State
const modelName = ref('Новый 3D Блок');
const modelColor = ref('#06b6d4');
const modelIcon = ref('Box');

// 6 Faces Textures
const faceTextures = ref({
  top: '',
  bottom: '',
  front: '',
  back: '',
  left: '',
  right: ''
});

// Gallery Picker State
const isGalleryOpen = ref(false);
const activeFaceForGallery = ref<'all' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right'>('all');

// Saved Models Library & Selected for Pack
const savedModels = ref<CustomBlockModel[]>([]);
const selectedModelIdsForPack = ref<string[]>([]);

// Publish Pack Modal State
const isPublishModalOpen = ref(false);
const publishTitle = ref('');
const publishDescription = ref('');
const publishCategory = ref('Мебель & Декор');
const isPublishing = ref(false);
const notification = ref<string | null>(null);

const showNotification = (msg: string) => {
  notification.value = msg;
  setTimeout(() => { notification.value = null; }, 4000);
};

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

const STORAGE_KEY = computed(() => `cubix_block_models_${effectiveUsername.value.toLowerCase()}`);

const loadSavedModels = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY.value);
    if (raw) {
      savedModels.value = JSON.parse(raw);
    } else {
      // Global fallback
      const globalRaw = localStorage.getItem('cubix_block_models');
      if (globalRaw) savedModels.value = JSON.parse(globalRaw);
    }
  } catch (e) {
    console.error('Error loading saved block models:', e);
  }
};

const persistSavedModels = () => {
  try {
    localStorage.setItem(STORAGE_KEY.value, JSON.stringify(savedModels.value));
    localStorage.setItem('cubix_block_models', JSON.stringify(savedModels.value));
  } catch (e) {
    console.error('Error saving block models:', e);
  }
};

onMounted(() => {
  loadSavedModels();
  autoRotateTimer = setInterval(() => {
    if (isAutoRotating.value && !isDragging.value) {
      rotY.value = (rotY.value + 0.8) % 360;
    }
  }, 16);
});

onUnmounted(() => {
  if (autoRotateTimer) clearInterval(autoRotateTimer);
});

watch(() => props.isOpen, (val) => {
  if (val) loadSavedModels();
});

// Mouse Orbit Handlers
const onMouseDown = (e: MouseEvent) => {
  isDragging.value = true;
  previousMousePosition.value = { x: e.clientX, y: e.clientY };
};

const onMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  const deltaX = e.clientX - previousMousePosition.value.x;
  const deltaY = e.clientY - previousMousePosition.value.y;

  rotY.value += deltaX * 0.7;
  rotX.value = Math.max(-85, Math.min(85, rotX.value - deltaY * 0.7));
  previousMousePosition.value = { x: e.clientX, y: e.clientY };
};

const onMouseUp = () => {
  isDragging.value = false;
};

// Texture Face Assignment Helpers
const openGalleryForFace = (face: 'all' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right') => {
  activeFaceForGallery.value = face;
  isGalleryOpen.value = true;
};

const handleSelectGalleryMedia = (media: AuthorMediaItem) => {
  if (activeFaceForGallery.value === 'all') {
    faceTextures.value.top = media.url;
    faceTextures.value.bottom = media.url;
    faceTextures.value.front = media.url;
    faceTextures.value.back = media.url;
    faceTextures.value.left = media.url;
    faceTextures.value.right = media.url;
  } else {
    faceTextures.value[activeFaceForGallery.value] = media.url;
  }
};

const applySingleTextureToAllFaces = (url: string) => {
  if (!url) return;
  faceTextures.value = {
    top: url,
    bottom: url,
    front: url,
    back: url,
    left: url,
    right: url
  };
};

const clearAllTextures = () => {
  faceTextures.value = { top: '', bottom: '', front: '', back: '', left: '', right: '' };
};

// Model Saving & Management
const saveCurrentModel = () => {
  const newModel: CustomBlockModel = {
    id: `block_model_${Date.now()}`,
    name: modelName.value.trim() || 'Пользовательский 3D блок',
    color: modelColor.value,
    icon: modelIcon.value,
    imageUrl: faceTextures.value.front || faceTextures.value.top || '',
    topImageUrl: faceTextures.value.top,
    bottomImageUrl: faceTextures.value.bottom,
    frontImageUrl: faceTextures.value.front,
    backImageUrl: faceTextures.value.back,
    leftImageUrl: faceTextures.value.left,
    rightImageUrl: faceTextures.value.right,
    createdAt: new Date().toISOString().split('T')[0]
  };

  savedModels.value.unshift(newModel);
  persistSavedModels();
  showNotification(`3D-модель "${newModel.name}" сохранена в вашей библиотеке!`);
};

const loadModelIntoEditor = (m: CustomBlockModel) => {
  modelName.value = m.name;
  modelColor.value = m.color || '#06b6d4';
  modelIcon.value = m.icon || 'Box';
  faceTextures.value = {
    top: m.topImageUrl || m.imageUrl || '',
    bottom: m.bottomImageUrl || m.imageUrl || '',
    front: m.frontImageUrl || m.imageUrl || '',
    back: m.backImageUrl || m.imageUrl || '',
    left: m.leftImageUrl || m.imageUrl || '',
    right: m.rightImageUrl || m.imageUrl || ''
  };
};

const deleteModelPreset = (id: string) => {
  savedModels.value = savedModels.value.filter(m => m.id !== id);
  selectedModelIdsForPack.value = selectedModelIdsForPack.value.filter(mId => mId !== id);
  persistSavedModels();
};

// Form 3D Models Pack & Publish to Marketplace
const openCreatePackModal = () => {
  if (savedModels.value.length === 0) {
    showNotification('Сначала сохраните хотя бы одну 3D-модель!');
    return;
  }
  selectedModelIdsForPack.value = savedModels.value.map(m => m.id);
  publishTitle.value = '';
  publishDescription.value = '';
  publishCategory.value = 'Мебель & Декор';
  isPublishModalOpen.value = true;
};

const toggleSelectModelForPack = (id: string) => {
  if (selectedModelIdsForPack.value.includes(id)) {
    selectedModelIdsForPack.value = selectedModelIdsForPack.value.filter(mId => mId !== id);
  } else {
    selectedModelIdsForPack.value.push(id);
  }
};

const publishModelPack = async () => {
  if (!publishTitle.value.trim()) {
    showNotification('Укажите название пака моделей');
    return;
  }
  if (selectedModelIdsForPack.value.length === 0) {
    showNotification('Выберите хотя бы одну модель для пака');
    return;
  }

  isPublishing.value = true;
  try {
    const selectedModels = savedModels.value.filter(m => selectedModelIdsForPack.value.includes(m.id));
    const items = selectedModels.map(m => ({
      id: m.id,
      name: m.name,
      url: m.imageUrl || m.topImageUrl || m.frontImageUrl || '',
      type: 'model' as const,
      textures: {
        top: m.topImageUrl,
        bottom: m.bottomImageUrl,
        north: m.frontImageUrl,
        south: m.backImageUrl,
        west: m.leftImageUrl,
        east: m.rightImageUrl
      }
    }));

    const payload = {
      title: publishTitle.value.trim(),
      description: publishDescription.value.trim(),
      author: props.username || 'Аноним',
      category: publishCategory.value,
      items,
      models: selectedModels
    };

    const res = await fetch('/api/market/packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showNotification('Пак 3D-моделей успешно опубликован в Маркетплейсе!');
      isPublishModalOpen.value = false;
    }
  } catch (e) {
    showNotification('Ошибка при публикации пака');
  } finally {
    isPublishing.value = false;
  }
};

const applyToActiveGuide = () => {
  const paletteItem: MultiblockPaletteItem = {
    id: `custom_model_${Date.now()}`,
    name: modelName.value.trim() || '3D Блок',
    icon: modelIcon.value,
    color: modelColor.value,
    imageUrl: faceTextures.value.front || faceTextures.value.top || '',
    topImageUrl: faceTextures.value.top,
    bottomImageUrl: faceTextures.value.bottom,
    frontImageUrl: faceTextures.value.front,
    backImageUrl: faceTextures.value.back,
    leftImageUrl: faceTextures.value.left,
    rightImageUrl: faceTextures.value.right
  };

  emit('select-model', paletteItem);
  emit('close');
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-fadeIn">
    <div class="bg-[#141619] border border-[#26292d] w-full max-w-5xl rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 relative max-h-[92vh] flex flex-col overflow-hidden">
      
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-[#26292d] pb-4 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-amber-950/50">
            <IconRenderer name="Box" size="22" />
          </div>
          <div>
            <h2 class="text-xl font-black text-white flex items-center gap-2">
              Редактор 3D-моделей блоков
            </h2>
            <p class="text-xs text-dark-muted">
              Конструируйте уникальные кубы с индивидуальными текстурами на каждой из 6 граней
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="emit('close')"
          class="text-dark-muted hover:text-white p-2 rounded-xl hover:bg-[#212429] transition-all cursor-pointer"
        >
          <IconRenderer name="X" size="20" />
        </button>
      </div>

      <!-- MAIN EDITOR SPLIT CONTAINER -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 overflow-y-auto custom-scrollbar pr-1">
        
        <!-- LEFT COLUMN (5 cols): LIVE 3D CUBE PREVIEW CANVAS -->
        <div class="lg:col-span-5 bg-[#0c0d0e] border border-[#26292d] rounded-2xl p-4 flex flex-col items-center justify-between min-h-[320px] relative overflow-hidden select-none shadow-inner">
          
          <div class="w-full flex items-center justify-between text-xs font-bold text-slate-300 z-10">
            <span class="flex items-center gap-1.5 text-amber-400">
              <IconRenderer name="Eye" size="14" />
              3D Предпросмотр
            </span>
            
            <button
              type="button"
              @click="isAutoRotating = !isAutoRotating"
              :class="['px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold border transition-all cursor-pointer', isAutoRotating ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-[#16181a] text-dark-muted border-[#26292d]']"
            >
              {{ isAutoRotating ? 'Авто-вращение ON' : 'Авто-вращение OFF' }}
            </button>
          </div>

          <!-- 3D ORBIT VIEWPORT -->
          <div
            class="w-full h-64 flex items-center justify-center cursor-grab active:cursor-grabbing relative"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @mouseleave="onMouseUp"
          >
            <div
              class="scene-3d-single"
              :style="{ transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)` }"
            >
              <!-- 6 FACES OF CUBE -->
              <div 
                class="face-single front"
                :style="{ backgroundColor: modelColor, backgroundImage: faceTextures.front ? `url('${faceTextures.front}')` : 'none' }"
              ><span class="face-label">Front</span></div>

              <div 
                class="face-single back"
                :style="{ backgroundColor: modelColor, backgroundImage: faceTextures.back ? `url('${faceTextures.back}')` : 'none' }"
              ><span class="face-label">Back</span></div>

              <div 
                class="face-single top"
                :style="{ backgroundColor: modelColor, backgroundImage: faceTextures.top ? `url('${faceTextures.top}')` : 'none' }"
              ><span class="face-label">Top</span></div>

              <div 
                class="face-single bottom"
                :style="{ backgroundColor: modelColor, backgroundImage: faceTextures.bottom ? `url('${faceTextures.bottom}')` : 'none' }"
              ><span class="face-label">Bottom</span></div>

              <div 
                class="face-single left"
                :style="{ backgroundColor: modelColor, backgroundImage: faceTextures.left ? `url('${faceTextures.left}')` : 'none' }"
              ><span class="face-label">Left</span></div>

              <div 
                class="face-single right"
                :style="{ backgroundColor: modelColor, backgroundImage: faceTextures.right ? `url('${faceTextures.right}')` : 'none' }"
              ><span class="face-label">Right</span></div>
            </div>
          </div>

          <!-- Canvas Bottom Info -->
          <div class="w-full flex items-center justify-between text-[10.5px] text-dark-muted z-10 pt-2 border-t border-[#26292d]">
            <span>Зажмите ЛКМ для вращения 3D куба</span>
            <span class="font-mono text-cyan-400 font-bold">{{ modelName }}</span>
          </div>
        </div>

        <!-- RIGHT COLUMN (7 cols): FACE TEXTURE SELECTORS & PROPERTIES -->
        <div class="lg:col-span-7 space-y-4">
          
          <!-- Block General Settings -->
          <div class="bg-[#0c0d0e] border border-[#26292d] p-4 rounded-2xl space-y-3">
            <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <IconRenderer name="Sliders" size="14" class="text-amber-400" />
              Параметры блока
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-bold text-dark-muted mb-1">Название блока</label>
                <input
                  type="text"
                  v-model="modelName"
                  placeholder="например, Блок травы..."
                  class="w-full bg-[#141619] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-dark-muted mb-1">Базовый оттенок цвета</label>
                <div class="flex items-center gap-2">
                  <input
                    type="color"
                    v-model="modelColor"
                    class="w-9 h-9 rounded-xl border border-[#26292d] bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    v-model="modelColor"
                    class="w-full bg-[#141619] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            <!-- Quick Texture Actions -->
            <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                @click="openGalleryForFace('all')"
                class="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <IconRenderer name="FolderPlus" size="13" />
                <span>Задать текстуру на ВСЕ 6 граней</span>
              </button>

              <button
                type="button"
                @click="clearAllTextures"
                class="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                Очистить текстуры
              </button>
            </div>
          </div>

          <!-- 6 FACES TEXTURES GRID EDITORS -->
          <div class="bg-[#0c0d0e] border border-[#26292d] p-4 rounded-2xl space-y-3">
            <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <IconRenderer name="Layers" size="14" class="text-cyan-400" />
              Текстуры граней куба (6 Сторон)
            </h4>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              
              <!-- 1. Top -->
              <div class="bg-[#141619] border border-[#26292d] p-2.5 rounded-xl space-y-1.5">
                <div class="flex items-center justify-between text-[11px] font-extrabold text-emerald-400">
                  <span>⬆️ Верх (Top)</span>
                  <button type="button" @click="openGalleryForFace('top')" class="text-[10px] text-cyan-400 hover:underline cursor-pointer">Галерея</button>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded bg-[#1a1e24] border border-white/10 overflow-hidden shrink-0">
                    <img v-if="faceTextures.top" :src="faceTextures.top" class="w-full h-full object-cover" />
                  </div>
                  <input
                    type="text"
                    v-model="faceTextures.top"
                    placeholder="URL верха..."
                    class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-[10.5px] rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <!-- 2. Bottom -->
              <div class="bg-[#141619] border border-[#26292d] p-2.5 rounded-xl space-y-1.5">
                <div class="flex items-center justify-between text-[11px] font-extrabold text-amber-400">
                  <span>⬇️ Низ (Bottom)</span>
                  <button type="button" @click="openGalleryForFace('bottom')" class="text-[10px] text-cyan-400 hover:underline cursor-pointer">Галерея</button>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded bg-[#1a1e24] border border-white/10 overflow-hidden shrink-0">
                    <img v-if="faceTextures.bottom" :src="faceTextures.bottom" class="w-full h-full object-cover" />
                  </div>
                  <input
                    type="text"
                    v-model="faceTextures.bottom"
                    placeholder="URL низа..."
                    class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-[10.5px] rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <!-- 3. Front -->
              <div class="bg-[#141619] border border-[#26292d] p-2.5 rounded-xl space-y-1.5">
                <div class="flex items-center justify-between text-[11px] font-extrabold text-cyan-400">
                  <span>⏹️ Лицо (Front)</span>
                  <button type="button" @click="openGalleryForFace('front')" class="text-[10px] text-cyan-400 hover:underline cursor-pointer">Галерея</button>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded bg-[#1a1e24] border border-white/10 overflow-hidden shrink-0">
                    <img v-if="faceTextures.front" :src="faceTextures.front" class="w-full h-full object-cover" />
                  </div>
                  <input
                    type="text"
                    v-model="faceTextures.front"
                    @input="applySingleTextureToAllFaces(($event.target as HTMLInputElement).value)"
                    placeholder="URL переда..."
                    class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-[10.5px] rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <!-- 4. Back -->
              <div class="bg-[#141619] border border-[#26292d] p-2.5 rounded-xl space-y-1.5">
                <div class="flex items-center justify-between text-[11px] font-extrabold text-purple-400">
                  <span>⏹️ Зад (Back)</span>
                  <button type="button" @click="openGalleryForFace('back')" class="text-[10px] text-cyan-400 hover:underline cursor-pointer">Галерея</button>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded bg-[#1a1e24] border border-white/10 overflow-hidden shrink-0">
                    <img v-if="faceTextures.back" :src="faceTextures.back" class="w-full h-full object-cover" />
                  </div>
                  <input
                    type="text"
                    v-model="faceTextures.back"
                    placeholder="URL зада..."
                    class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-[10.5px] rounded-lg px-2 py-1 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <!-- 5. Left -->
              <div class="bg-[#141619] border border-[#26292d] p-2.5 rounded-xl space-y-1.5">
                <div class="flex items-center justify-between text-[11px] font-extrabold text-blue-400">
                  <span>◀️ Лево (Left)</span>
                  <button type="button" @click="openGalleryForFace('left')" class="text-[10px] text-cyan-400 hover:underline cursor-pointer">Галерея</button>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded bg-[#1a1e24] border border-white/10 overflow-hidden shrink-0">
                    <img v-if="faceTextures.left" :src="faceTextures.left" class="w-full h-full object-cover" />
                  </div>
                  <input
                    type="text"
                    v-model="faceTextures.left"
                    placeholder="URL левого бока..."
                    class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-[10.5px] rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <!-- 6. Right -->
              <div class="bg-[#141619] border border-[#26292d] p-2.5 rounded-xl space-y-1.5">
                <div class="flex items-center justify-between text-[11px] font-extrabold text-indigo-400">
                  <span>▶️ Право (Right)</span>
                  <button type="button" @click="openGalleryForFace('right')" class="text-[10px] text-cyan-400 hover:underline cursor-pointer">Галерея</button>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded bg-[#1a1e24] border border-white/10 overflow-hidden shrink-0">
                    <img v-if="faceTextures.right" :src="faceTextures.right" class="w-full h-full object-cover" />
                  </div>
                  <input
                    type="text"
                    v-model="faceTextures.right"
                    placeholder="URL правого бока..."
                    class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-[10.5px] rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

            </div>
          </div>

      <!-- Toast Notification -->
      <transition name="fade">
        <div v-if="notification" class="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 to-purple-600 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xl border border-white/20 flex items-center gap-2 animate-bounce">
          <IconRenderer name="CheckCircle" size="16" />
          <span>{{ notification }}</span>
        </div>
      </transition>

      <!-- SAVED MODELS LIBRARY & ACTIONS -->
          <div class="bg-[#0c0d0e] border border-[#26292d] p-4 rounded-2xl space-y-3">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <IconRenderer name="Bookmark" size="14" class="text-amber-400" />
                Библиотека моделей ({{ savedModels.length }})
              </h4>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="openCreatePackModal"
                  class="px-3 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <IconRenderer name="PackagePlus" size="13" />
                  <span>Сформировать пак</span>
                </button>
                <button
                  type="button"
                  @click="saveCurrentModel"
                  class="px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <IconRenderer name="Save" size="13" />
                  <span>Сохранить пресет</span>
                </button>
              </div>
            </div>

            <!-- Saved Presets List -->
            <div v-if="savedModels.length > 0" class="flex flex-wrap gap-2 max-h-28 overflow-y-auto custom-scrollbar p-1">
              <div
                v-for="m in savedModels"
                :key="m.id"
                @click="loadModelIntoEditor(m)"
                class="px-3 py-1.5 rounded-xl bg-[#141619] border border-[#26292d] hover:border-amber-400 text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer group"
              >
                <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: m.color }"></span>
                <span>{{ m.name }}</span>
                <button
                  type="button"
                  @click.stop="deleteModelPreset(m.id)"
                  class="text-rose-400/60 hover:text-rose-400 ml-1"
                >
                  <IconRenderer name="X" size="12" />
                </button>
              </div>
            </div>
            <p v-else class="text-[11px] text-dark-muted">У вас пока нет сохраненных 3D пресетов блоков</p>
          </div>

        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#26292d] shrink-0">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 rounded-xl bg-[#0c0d0e] hover:bg-[#202327] border border-[#26292d] text-white text-xs font-bold transition-all cursor-pointer"
        >
          Отмена
        </button>

        <button
          type="button"
          @click="applyToActiveGuide"
          class="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-amber-950/40 transition-all cursor-pointer flex items-center gap-2"
        >
          <IconRenderer name="Check" size="14" />
          <span>Применить блок к палитре</span>
        </button>
      </div>

    </div>

    <!-- GALLERY MODAL FOR TEXTURE SELECTION -->
    <AuthorGalleryModal
      :is-open="isGalleryOpen"
      :username="username"
      :is-select-mode="true"
      @close="isGalleryOpen = false"
      @select="handleSelectGalleryMedia"
    />

    <!-- CREATE & PUBLISH 3D MODELS PACK MODAL SUBDIALOG -->
    <div v-if="isPublishModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
      <div class="bg-[#141619] border border-[#26292d] w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 relative">
        <div class="flex items-center justify-between border-b border-[#26292d] pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <IconRenderer name="Package" size="18" />
            </div>
            <div>
              <h3 class="text-base font-black text-white">Публикация пака 3D-моделей</h3>
              <p class="text-xs text-dark-muted">Выберите модели и опубликуйте пак в Маркетплейс</p>
            </div>
          </div>
          <button type="button" @click="isPublishModalOpen = false" class="text-dark-muted hover:text-white p-1.5 rounded-lg hover:bg-[#202327]">
            <IconRenderer name="X" size="18" />
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-dark-muted mb-1">Название пака</label>
            <input
              type="text"
              v-model="publishTitle"
              placeholder="например, Набор Фэнтези Кубов"
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-dark-muted mb-1">Описание</label>
            <textarea
              v-model="publishDescription"
              rows="2"
              placeholder="Опишите особенности вашего набора..."
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-400 resize-none"
            ></textarea>
          </div>

          <div>
            <label class="block text-xs font-bold text-dark-muted mb-1">Категория</label>
            <select
              v-model="publishCategory"
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-400"
            >
              <option value="Мебель & Декор">Мебель & Декор</option>
              <option value="Строительные блоки">Строительные блоки</option>
              <option value="Техника & Механизмы">Техника & Механизмы</option>
              <option value="Природа & Биомы">Природа & Биомы</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-dark-muted mb-2">
              Включить модели в пак ({{ selectedModelIdsForPack.length }} из {{ savedModels.length }})
            </label>
            <div class="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar p-1">
              <div
                v-for="m in savedModels"
                :key="m.id"
                @click="toggleSelectModelForPack(m.id)"
                :class="['p-2 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-all', selectedModelIdsForPack.includes(m.id) ? 'bg-purple-500/15 border-purple-500/50 text-purple-200' : 'bg-[#0c0d0e] border-[#26292d] text-dark-muted']"
              >
                <div class="flex items-center gap-2 truncate">
                  <span class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: m.color }"></span>
                  <span class="truncate">{{ m.name }}</span>
                </div>
                <IconRenderer v-if="selectedModelIdsForPack.includes(m.id)" name="Check" size="14" class="text-purple-400 shrink-0" />
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#26292d]">
          <button
            type="button"
            @click="isPublishModalOpen = false"
            class="px-4 py-2 rounded-xl bg-[#0c0d0e] hover:bg-[#202327] border border-[#26292d] text-white text-xs font-bold transition-all cursor-pointer"
          >
            Отмена
          </button>

          <button
            type="button"
            @click="publishModelPack"
            :disabled="isPublishing"
            class="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-950/40 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <IconRenderer name="Upload" size="14" />
            <span>{{ isPublishing ? 'Публикация...' : 'Опубликовать в Маркет' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scene-3d-single {
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  transition: transform 0.05s linear;
}

.face-single {
  position: absolute;
  top: -65px;
  left: -65px;
  width: 130px;
  height: 130px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.5);
  backface-visibility: hidden;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  items-center: center;
  justify-content: center;
}

.face-label {
  font-size: 10px;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 1px;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 6px;
  border-radius: 6px;
}

.front  { transform: translateZ(65px); filter: brightness(1); }
.back   { transform: rotateY(180deg) translateZ(65px); filter: brightness(0.65); }
.top    { transform: rotateX(90deg) translateZ(65px); filter: brightness(1.2); }
.bottom { transform: rotateX(-90deg) translateZ(65px); filter: brightness(0.4); }
.left   { transform: rotateY(-90deg) translateZ(65px); filter: brightness(0.8); }
.right  { transform: rotateY(90deg) translateZ(65px); filter: brightness(0.9); }
</style>
