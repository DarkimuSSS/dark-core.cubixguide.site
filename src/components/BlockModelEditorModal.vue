<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import IconRenderer from './IconRenderer.vue';
import AuthorGalleryModal from './AuthorGalleryModal.vue';
import type { CustomBlockModel, ModelElement, AuthorMediaItem, MultiblockPaletteItem } from '../types/guide';

const props = defineProps<{
  isOpen: boolean;
  username: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select-model', model: MultiblockPaletteItem): void;
}>();

// 3D Viewport Controls
const isDragging = ref(false);
const previousMousePosition = ref({ x: 0, y: 0 });
const rotX = ref(-25);
const rotY = ref(40);
const zoomScale = ref(1.0);
const isAutoRotating = ref(true);
const showGrid = ref(true);
let autoRotateTimer: any = null;

// Active Model Metadata
const modelName = ref('Новая 3D Сборка');
const modelColor = ref('#06b6d4');
const modelIcon = ref('Box');
const modelCategory = ref('Декоративные блоки');

// Multi-Element Model State
const elements = ref<ModelElement[]>([
  {
    id: 'elem_base',
    name: 'Основной Куб',
    posX: 0,
    posY: 0,
    posZ: 0,
    sizeX: 16,
    sizeY: 16,
    sizeZ: 16,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    color: '#06b6d4',
    topImageUrl: '',
    bottomImageUrl: '',
    frontImageUrl: '',
    backImageUrl: '',
    leftImageUrl: '',
    rightImageUrl: ''
  }
]);

const activeElementId = ref<string>('elem_base');

const activeElement = computed(() => {
  return elements.value.find(e => e.id === activeElementId.value) || elements.value[0];
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
      rotY.value = (rotY.value + 0.6) % 360;
    }
  }, 16);
});

onUnmounted(() => {
  if (autoRotateTimer) clearInterval(autoRotateTimer);
});

watch(() => props.isOpen, (val) => {
  if (val) loadSavedModels();
});

// Orbit Controls Handlers
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

const onWheelZoom = (e: WheelEvent) => {
  e.preventDefault();
  if (e.deltaY < 0) {
    zoomScale.value = Math.min(2.5, zoomScale.value + 0.1);
  } else {
    zoomScale.value = Math.max(0.4, zoomScale.value - 0.1);
  }
};

// Element Actions
const addElement = () => {
  const count = elements.value.length + 1;
  const newElem: ModelElement = {
    id: `elem_${Date.now()}`,
    name: `Деталь ${count}`,
    posX: 0,
    posY: Math.min(12, (count - 1) * 4),
    posZ: 0,
    sizeX: 12,
    sizeY: 4,
    sizeZ: 12,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    color: modelColor.value,
    topImageUrl: '',
    bottomImageUrl: '',
    frontImageUrl: '',
    backImageUrl: '',
    leftImageUrl: '',
    rightImageUrl: ''
  };
  elements.value.push(newElem);
  activeElementId.value = newElem.id;
};

const duplicateElement = (elem: ModelElement) => {
  const dup: ModelElement = {
    ...JSON.parse(JSON.stringify(elem)),
    id: `elem_${Date.now()}`,
    name: `${elem.name} (Копия)`,
    posX: elem.posX + 2,
    posY: elem.posY + 2,
    posZ: elem.posZ + 2
  };
  elements.value.push(dup);
  activeElementId.value = dup.id;
};

const removeElement = (id: string) => {
  if (elements.value.length <= 1) {
    showNotification('Модель должна содержать хотя бы одну деталь');
    return;
  }
  elements.value = elements.value.filter(e => e.id !== id);
  if (activeElementId.value === id) {
    activeElementId.value = elements.value[0].id;
  }
};

// PRESET STARTER TEMPLATES
const applyPreset = (presetType: string) => {
  if (presetType === 'cube') {
    modelName.value = 'Стандартный Куб';
    elements.value = [{
      id: 'elem_cube',
      name: 'Куб 16x16',
      posX: 0, posY: 0, posZ: 0,
      sizeX: 16, sizeY: 16, sizeZ: 16,
      rotX: 0, rotY: 0, rotZ: 0,
      color: '#06b6d4'
    }];
  } else if (presetType === 'chair') {
    modelName.value = 'Деревянное Кресло';
    elements.value = [
      { id: 'elem_seat', name: 'Сиденье', posX: 0, posY: 6, posZ: 0, sizeX: 12, sizeY: 2, sizeZ: 12, rotX: 0, rotY: 0, rotZ: 0, color: '#854d0e' },
      { id: 'elem_back', name: 'Спинка', posX: 0, posY: 13, posZ: -5, sizeX: 12, sizeY: 12, sizeZ: 2, rotX: 0, rotY: 0, rotZ: 0, color: '#713f12' },
      { id: 'elem_leg1', name: 'Ножка Перед-Лево', posX: -5, posY: 2, posZ: 5, sizeX: 2, sizeY: 6, sizeZ: 2, rotX: 0, rotY: 0, rotZ: 0, color: '#54300c' },
      { id: 'elem_leg2', name: 'Ножка Перед-Право', posX: 5, posY: 2, posZ: 5, sizeX: 2, sizeY: 6, sizeZ: 2, rotX: 0, rotY: 0, rotZ: 0, color: '#54300c' },
      { id: 'elem_leg3', name: 'Ножка Зад-Лево', posX: -5, posY: 2, posZ: -5, sizeX: 2, sizeY: 6, sizeZ: 2, rotX: 0, rotY: 0, rotZ: 0, color: '#54300c' },
      { id: 'elem_leg4', name: 'Ножка Зад-Право', posX: 5, posY: 2, posZ: -5, sizeX: 2, sizeY: 6, sizeZ: 2, rotX: 0, rotY: 0, rotZ: 0, color: '#54300c' }
    ];
  } else if (presetType === 'table') {
    modelName.value = 'Магический Стол / Алтарь';
    elements.value = [
      { id: 'elem_top', name: 'Столешница', posX: 0, posY: 14, posZ: 0, sizeX: 16, sizeY: 2, sizeZ: 16, rotX: 0, rotY: 0, rotZ: 0, color: '#3b0764' },
      { id: 'elem_leg1', name: 'Опора Лево-Перед', posX: -6, posY: 6, posZ: 6, sizeX: 3, sizeY: 14, sizeZ: 3, rotX: 0, rotY: 0, rotZ: 0, color: '#581c87' },
      { id: 'elem_leg2', name: 'Опора Право-Перед', posX: 6, posY: 6, posZ: 6, sizeX: 3, sizeY: 14, sizeZ: 3, rotX: 0, rotY: 0, rotZ: 0, color: '#581c87' },
      { id: 'elem_leg3', name: 'Опора Лево-Зад', posX: -6, posY: 6, posZ: -6, sizeX: 3, sizeY: 14, sizeZ: 3, rotX: 0, rotY: 0, rotZ: 0, color: '#581c87' },
      { id: 'elem_leg4', name: 'Опора Право-Зад', posX: 6, posY: 6, posZ: -6, sizeX: 3, sizeY: 14, sizeZ: 3, rotX: 0, rotY: 0, rotZ: 0, color: '#581c87' }
    ];
  } else if (presetType === 'pillar') {
    modelName.value = 'Античная Колонна';
    elements.value = [
      { id: 'elem_base', name: 'Основание', posX: 0, posY: 2, posZ: 0, sizeX: 16, sizeY: 4, sizeZ: 16, rotX: 0, rotY: 0, rotZ: 0, color: '#475569' },
      { id: 'elem_shaft', name: 'Ствол Колонны', posX: 0, posY: 9, posZ: 0, sizeX: 10, sizeY: 10, sizeZ: 10, rotX: 0, rotY: 0, rotZ: 0, color: '#64748b' },
      { id: 'elem_cap', name: 'Капитель', posX: 0, posY: 15, posZ: 0, sizeX: 14, sizeY: 2, sizeZ: 14, rotX: 0, rotY: 0, rotZ: 0, color: '#94a3b8' }
    ];
  } else if (presetType === 'altar') {
    modelName.value = 'Кристальный Алтарь';
    elements.value = [
      { id: 'elem_base', name: 'Плита', posX: 0, posY: 1, posZ: 0, sizeX: 14, sizeY: 2, sizeZ: 14, rotX: 0, rotY: 0, rotZ: 0, color: '#0f172a' },
      { id: 'elem_core', name: 'Сердечник', posX: 0, posY: 6, posZ: 0, sizeX: 8, sizeY: 8, sizeZ: 8, rotX: 0, rotY: 0, rotZ: 0, color: '#0284c7' },
      { id: 'elem_crystal', name: 'Парящий Кристалл', posX: 0, posY: 14, posZ: 0, sizeX: 6, sizeY: 6, sizeZ: 6, rotX: 45, rotY: 45, rotZ: 0, color: '#38bdf8' }
    ];
  }
  activeElementId.value = elements.value[0].id;
  showNotification(`Применен шаблон "${modelName.value}"`);
};

// Texture Handlers
const openGalleryForFace = (face: 'all' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right') => {
  activeFaceForGallery.value = face;
  isGalleryOpen.value = true;
};

const handleSelectGalleryMedia = (media: AuthorMediaItem) => {
  if (!activeElement.value) return;
  if (activeFaceForGallery.value === 'all') {
    activeElement.value.topImageUrl = media.url;
    activeElement.value.bottomImageUrl = media.url;
    activeElement.value.frontImageUrl = media.url;
    activeElement.value.backImageUrl = media.url;
    activeElement.value.leftImageUrl = media.url;
    activeElement.value.rightImageUrl = media.url;
  } else {
    const key = `${activeFaceForGallery.value}ImageUrl` as keyof ModelElement;
    (activeElement.value as any)[key] = media.url;
  }
};

const clearElementTextures = () => {
  if (!activeElement.value) return;
  activeElement.value.topImageUrl = '';
  activeElement.value.bottomImageUrl = '';
  activeElement.value.frontImageUrl = '';
  activeElement.value.backImageUrl = '';
  activeElement.value.leftImageUrl = '';
  activeElement.value.rightImageUrl = '';
};

// Model Saving & Management
const saveCurrentModel = () => {
  const mainElem = elements.value[0];
  const newModel: CustomBlockModel = {
    id: `block_model_${Date.now()}`,
    name: modelName.value.trim() || 'Пользовательская 3D модель',
    color: modelColor.value,
    icon: modelIcon.value,
    imageUrl: mainElem?.frontImageUrl || mainElem?.topImageUrl || '',
    topImageUrl: mainElem?.topImageUrl,
    bottomImageUrl: mainElem?.bottomImageUrl,
    frontImageUrl: mainElem?.frontImageUrl,
    backImageUrl: mainElem?.backImageUrl,
    leftImageUrl: mainElem?.leftImageUrl,
    rightImageUrl: mainElem?.rightImageUrl,
    elements: JSON.parse(JSON.stringify(elements.value)),
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
  if (m.elements && m.elements.length > 0) {
    elements.value = JSON.parse(JSON.stringify(m.elements));
  } else {
    elements.value = [{
      id: `elem_loaded`,
      name: m.name,
      posX: 0, posY: 0, posZ: 0,
      sizeX: 16, sizeY: 16, sizeZ: 16,
      rotX: 0, rotY: 0, rotZ: 0,
      color: m.color || '#06b6d4',
      topImageUrl: m.topImageUrl || m.imageUrl || '',
      bottomImageUrl: m.bottomImageUrl || m.imageUrl || '',
      frontImageUrl: m.frontImageUrl || m.imageUrl || '',
      backImageUrl: m.backImageUrl || m.imageUrl || '',
      leftImageUrl: m.leftImageUrl || m.imageUrl || '',
      rightImageUrl: m.rightImageUrl || m.imageUrl || ''
    }];
  }
  activeElementId.value = elements.value[0].id;
  showNotification(`Загружена модель "${m.name}"`);
};

const deleteModelPreset = (id: string) => {
  savedModels.value = savedModels.value.filter(m => m.id !== id);
  selectedModelIdsForPack.value = selectedModelIdsForPack.value.filter(mId => mId !== id);
  persistSavedModels();
};

// Form 3D Models Pack & Publish to Marketplace
const openCreatePackModal = () => {
  if (savedModels.value.length === 0) {
    showNotification('Сначала сохраните хотя бы одну 3D-модель в библиотеку!');
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

const exportAsJSON = () => {
  const exportData = {
    format_version: "1.20.0",
    model_name: modelName.value,
    elements: elements.value.map(e => ({
      name: e.name,
      from: [e.posX, e.posY, e.posZ],
      to: [e.posX + e.sizeX, e.posY + e.sizeY, e.posZ + e.sizeZ],
      rotation: { origin: [e.posX, e.posY, e.posZ], axis: "y", angle: e.rotY || 0 },
      color: e.color
    }))
  };
  const str = JSON.stringify(exportData, null, 2);
  navigator.clipboard.writeText(str);
  showNotification('JSON схемы 3D-модели скопирован в буфер обмена!');
};

const applyToActiveGuide = () => {
  const mainElem = elements.value[0];
  const paletteItem: MultiblockPaletteItem = {
    id: `custom_model_${Date.now()}`,
    name: modelName.value.trim() || '3D Сборка',
    icon: modelIcon.value,
    color: modelColor.value,
    imageUrl: mainElem?.frontImageUrl || mainElem?.topImageUrl || '',
    topImageUrl: mainElem?.topImageUrl,
    bottomImageUrl: mainElem?.bottomImageUrl,
    frontImageUrl: mainElem?.frontImageUrl,
    backImageUrl: mainElem?.backImageUrl,
    leftImageUrl: mainElem?.leftImageUrl,
    rightImageUrl: mainElem?.rightImageUrl
  };

  emit('select-model', paletteItem);
  emit('close');
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fadeIn">
    <div class="bg-[#101214] border border-[#26292d] w-full max-w-6xl rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 relative max-h-[95vh] flex flex-col overflow-hidden">
      
      <!-- Toast Notification -->
      <transition name="fade">
        <div v-if="notification" class="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 to-purple-600 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xl border border-white/20 flex items-center gap-2 animate-bounce">
          <IconRenderer name="CheckCircle" size="16" />
          <span>{{ notification }}</span>
        </div>
      </transition>

      <!-- Modal Header & Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#26292d] pb-3 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-amber-950/50">
            <IconRenderer name="Box" size="20" />
          </div>
          <div>
            <h2 class="text-lg font-black text-white flex items-center gap-2">
              3D Voxel Studio & Block Bench
            </h2>
            <p class="text-xs text-dark-muted">
              Конструируйте сложные составные 3D-модели блоков из множества деталей
            </p>
          </div>
        </div>

        <!-- Quick Starter Presets Toolbar -->
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1 bg-[#16181b] border border-[#26292d] p-1 rounded-xl">
            <span class="text-[10.5px] font-bold text-dark-muted px-2">Шаблоны:</span>
            <button type="button" @click="applyPreset('cube')" class="px-2 py-1 text-[11px] font-bold text-cyan-300 hover:bg-[#22252a] rounded-lg cursor-pointer">Куб</button>
            <button type="button" @click="applyPreset('chair')" class="px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-[#22252a] rounded-lg cursor-pointer">Стул</button>
            <button type="button" @click="applyPreset('table')" class="px-2 py-1 text-[11px] font-bold text-purple-300 hover:bg-[#22252a] rounded-lg cursor-pointer">Стол</button>
            <button type="button" @click="applyPreset('pillar')" class="px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-[#22252a] rounded-lg cursor-pointer">Колонна</button>
            <button type="button" @click="applyPreset('altar')" class="px-2 py-1 text-[11px] font-bold text-rose-300 hover:bg-[#22252a] rounded-lg cursor-pointer">Алтарь</button>
          </div>

          <button
            type="button"
            @click="exportAsJSON"
            class="px-3 py-1.5 rounded-xl bg-[#16181b] hover:bg-[#22252a] border border-[#26292d] text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Экспорт JSON"
          >
            <IconRenderer name="Code" size="14" />
            <span class="hidden sm:inline">JSON</span>
          </button>

          <button
            type="button"
            @click="emit('close')"
            class="text-dark-muted hover:text-white p-2 rounded-xl hover:bg-[#212429] transition-all cursor-pointer"
          >
            <IconRenderer name="X" size="20" />
          </button>
        </div>
      </div>

      <!-- MAIN THREE-COLUMN STUDIO LAYOUT -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-0">
        
        <!-- LEFT COLUMN (3 cols): HIERARCHY & ELEMENTS TREE -->
        <div class="lg:col-span-3 bg-[#0c0d0e] border border-[#26292d] rounded-2xl p-3.5 flex flex-col justify-between space-y-3 overflow-hidden">
          
          <div class="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
            <div class="flex items-center justify-between border-b border-[#26292d] pb-2">
              <span class="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <IconRenderer name="Layers" size="14" class="text-amber-400" />
                Детали ({{ elements.length }})
              </span>

              <button
                type="button"
                @click="addElement"
                class="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1"
              >
                <IconRenderer name="Plus" size="12" />
                <span>Деталь</span>
              </button>
            </div>

            <!-- Elements List -->
            <div class="space-y-1.5">
              <div
                v-for="elem in elements"
                :key="elem.id"
                @click="activeElementId = elem.id"
                :class="['p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-all', elem.id === activeElementId ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-md' : 'bg-[#141619] border-[#26292d] text-dark-muted hover:border-slate-700']"
              >
                <div class="flex items-center gap-2 truncate">
                  <span class="w-3 h-3 rounded shrink-0 border border-white/20" :style="{ backgroundColor: elem.color }"></span>
                  <input
                    type="text"
                    v-model="elem.name"
                    @click.stop
                    class="bg-transparent border-none text-white text-xs font-bold focus:outline-none w-24 truncate"
                  />
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    @click.stop="duplicateElement(elem)"
                    class="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10"
                    title="Дублировать"
                  >
                    <IconRenderer name="Copy" size="12" />
                  </button>
                  <button
                    type="button"
                    @click.stop="removeElement(elem.id)"
                    class="p-1 text-rose-400/70 hover:text-rose-400 rounded hover:bg-rose-500/10"
                    title="Удалить"
                  >
                    <IconRenderer name="Trash" size="12" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Global Model Metadata -->
            <div class="pt-3 border-t border-[#26292d] space-y-2.5">
              <span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">Параметры Сборки</span>
              
              <div>
                <label class="block text-[10.5px] font-bold text-dark-muted mb-1">Название модели</label>
                <input
                  type="text"
                  v-model="modelName"
                  class="w-full bg-[#141619] border border-[#26292d] text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label class="block text-[10.5px] font-bold text-dark-muted mb-1">Главный цвет</label>
                <div class="flex items-center gap-2">
                  <input
                    type="color"
                    v-model="modelColor"
                    class="w-7 h-7 rounded-lg border border-[#26292d] bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    v-model="modelColor"
                    class="w-full bg-[#141619] border border-[#26292d] text-white text-xs rounded-xl px-2.5 py-1.5 font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Library Bottom Actions -->
          <div class="pt-2 border-t border-[#26292d] space-y-2">
            <div class="flex items-center justify-between text-[11px] text-slate-300 font-bold">
              <span>Библиотека ({{ savedModels.length }})</span>
              <button type="button" @click="saveCurrentModel" class="text-amber-400 hover:underline cursor-pointer flex items-center gap-1">
                <IconRenderer name="Save" size="12" />
                Сохранить
              </button>
            </div>

            <div v-if="savedModels.length > 0" class="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
              <div
                v-for="m in savedModels"
                :key="m.id"
                @click="loadModelIntoEditor(m)"
                class="px-2 py-1 rounded-lg bg-[#141619] border border-[#26292d] hover:border-amber-400 text-[10.5px] font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: m.color }"></span>
                <span class="truncate max-w-[80px]">{{ m.name }}</span>
                <button type="button" @click.stop="deleteModelPreset(m.id)" class="text-rose-400/60 hover:text-rose-400">
                  <IconRenderer name="X" size="10" />
                </button>
              </div>
            </div>
            <p v-else class="text-[10px] text-dark-muted">Нет сохраненных 3D моделей</p>

            <button
              type="button"
              @click="openCreatePackModal"
              class="w-full py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <IconRenderer name="PackagePlus" size="13" />
              <span>Сформировать пак в Маркет</span>
            </button>
          </div>
        </div>

        <!-- CENTER COLUMN (5 cols): INTERACTIVE 3D ORBIT VIEWPORT -->
        <div class="lg:col-span-5 bg-[#08090a] border border-[#26292d] rounded-2xl p-3 flex flex-col justify-between min-h-[350px] relative overflow-hidden select-none shadow-inner">
          
          <div class="w-full flex items-center justify-between text-xs font-bold text-slate-300 z-10">
            <span class="flex items-center gap-1.5 text-amber-400">
              <IconRenderer name="Eye" size="14" />
              3D Вид
            </span>
            
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="showGrid = !showGrid"
                :class="['px-2 py-0.5 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer', showGrid ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-[#16181a] text-dark-muted border-[#26292d]']"
              >
                Сетка {{ showGrid ? 'ON' : 'OFF' }}
              </button>

              <button
                type="button"
                @click="isAutoRotating = !isAutoRotating"
                :class="['px-2 py-0.5 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer', isAutoRotating ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-[#16181a] text-dark-muted border-[#26292d]']"
              >
                Вращение {{ isAutoRotating ? 'ON' : 'OFF' }}
              </button>
            </div>
          </div>

          <!-- 3D ORBIT VIEWPORT CANVAS -->
          <div
            class="w-full h-80 flex items-center justify-center cursor-grab active:cursor-grabbing relative overflow-hidden"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @mouseleave="onMouseUp"
            @wheel="onWheelZoom"
          >
            <!-- 3D SCENE STAGE -->
            <div
              class="scene-3d-multi"
              :style="{ transform: `scale(${zoomScale}) rotateX(${rotX}deg) rotateY(${rotY}deg)` }"
            >
              <!-- 3D Floor Grid Plane -->
              <div v-if="showGrid" class="grid-plane-3d"></div>

              <!-- RENDER EACH ELEMENT IN 3D SPACE -->
              <div
                v-for="elem in elements"
                :key="elem.id"
                @click.stop="activeElementId = elem.id"
                :class="['element-3d-container', elem.id === activeElementId ? 'active-element' : '']"
                :style="{
                  transform: `translate3d(${elem.posX * 5}px, ${-elem.posY * 5}px, ${elem.posZ * 5}px) rotateX(${elem.rotX || 0}deg) rotateY(${elem.rotY || 0}deg) rotateZ(${elem.rotZ || 0}deg)`
                }"
              >
                <!-- 6 FACES OF THE CUBOID ELEMENT -->
                <!-- Front -->
                <div
                  class="face-multi front"
                  :style="{
                    width: `${elem.sizeX * 5}px`,
                    height: `${elem.sizeY * 5}px`,
                    transform: `translateZ(${elem.sizeZ * 2.5}px)`,
                    backgroundColor: elem.color,
                    backgroundImage: elem.frontImageUrl ? `url('${elem.frontImageUrl}')` : 'none'
                  }"
                ></div>

                <!-- Back -->
                <div
                  class="face-multi back"
                  :style="{
                    width: `${elem.sizeX * 5}px`,
                    height: `${elem.sizeY * 5}px`,
                    transform: `rotateY(180deg) translateZ(${elem.sizeZ * 2.5}px)`,
                    backgroundColor: elem.color,
                    backgroundImage: elem.backImageUrl ? `url('${elem.backImageUrl}')` : 'none'
                  }"
                ></div>

                <!-- Top -->
                <div
                  class="face-multi top"
                  :style="{
                    width: `${elem.sizeX * 5}px`,
                    height: `${elem.sizeZ * 5}px`,
                    transform: `rotateX(90deg) translateZ(${elem.sizeY * 2.5}px)`,
                    backgroundColor: elem.color,
                    backgroundImage: elem.topImageUrl ? `url('${elem.topImageUrl}')` : 'none'
                  }"
                ></div>

                <!-- Bottom -->
                <div
                  class="face-multi bottom"
                  :style="{
                    width: `${elem.sizeX * 5}px`,
                    height: `${elem.sizeZ * 5}px`,
                    transform: `rotateX(-90deg) translateZ(${elem.sizeY * 2.5}px)`,
                    backgroundColor: elem.color,
                    backgroundImage: elem.bottomImageUrl ? `url('${elem.bottomImageUrl}')` : 'none'
                  }"
                ></div>

                <!-- Left -->
                <div
                  class="face-multi left"
                  :style="{
                    width: `${elem.sizeZ * 5}px`,
                    height: `${elem.sizeY * 5}px`,
                    transform: `rotateY(-90deg) translateZ(${elem.sizeX * 2.5}px)`,
                    backgroundColor: elem.color,
                    backgroundImage: elem.leftImageUrl ? `url('${elem.leftImageUrl}')` : 'none'
                  }"
                ></div>

                <!-- Right -->
                <div
                  class="face-multi right"
                  :style="{
                    width: `${elem.sizeZ * 5}px`,
                    height: `${elem.sizeY * 5}px`,
                    transform: `rotateY(90deg) translateZ(${elem.sizeX * 2.5}px)`,
                    backgroundColor: elem.color,
                    backgroundImage: elem.rightImageUrl ? `url('${elem.rightImageUrl}')` : 'none'
                  }"
                ></div>
              </div>

            </div>
          </div>

          <!-- Bottom Viewport Info & Controls -->
          <div class="w-full flex items-center justify-between text-[10.5px] text-dark-muted z-10 pt-2 border-t border-[#26292d]">
            <span>Вращайте ЛКМ | Зум Колесиком</span>
            <div class="flex items-center gap-2 font-mono">
              <span class="text-cyan-400 font-bold">Зум: {{ Math.round(zoomScale * 100) }}%</span>
              <button type="button" @click="zoomScale = 1.0; rotX = -25; rotY = 40;" class="text-xs text-slate-400 hover:text-white underline cursor-pointer">Сброс вида</button>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN (4 cols): ACTIVE ELEMENT TRANSFORM & TEXTURES -->
        <div class="lg:col-span-4 bg-[#0c0d0e] border border-[#26292d] rounded-2xl p-3.5 space-y-3.5 overflow-y-auto custom-scrollbar">
          
          <div v-if="activeElement" class="space-y-3">
            <div class="flex items-center justify-between border-b border-[#26292d] pb-2">
              <span class="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <IconRenderer name="Sliders" size="14" />
                Трансформация: {{ activeElement.name }}
              </span>
            </div>

            <!-- Position Controls X, Y, Z -->
            <div class="bg-[#141619] border border-[#26292d] p-2.5 rounded-xl space-y-2">
              <span class="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider block">Позиция (X, Y, Z)</span>
              
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="block text-[10px] text-dark-muted mb-0.5">X: {{ activeElement.posX }}</label>
                  <input type="range" min="-16" max="16" v-model.number="activeElement.posX" class="w-full accent-cyan-400 cursor-pointer" />
                </div>
                <div>
                  <label class="block text-[10px] text-dark-muted mb-0.5">Y: {{ activeElement.posY }}</label>
                  <input type="range" min="-16" max="32" v-model.number="activeElement.posY" class="w-full accent-cyan-400 cursor-pointer" />
                </div>
                <div>
                  <label class="block text-[10px] text-dark-muted mb-0.5">Z: {{ activeElement.posZ }}</label>
                  <input type="range" min="-16" max="16" v-model.number="activeElement.posZ" class="w-full accent-cyan-400 cursor-pointer" />
                </div>
              </div>
            </div>

            <!-- Size Controls (Width, Height, Depth) -->
            <div class="bg-[#141619] border border-[#26292d] p-2.5 rounded-xl space-y-2">
              <span class="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider block">Размер (Ш, В, Г)</span>
              
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="block text-[10px] text-dark-muted mb-0.5">Ш (W): {{ activeElement.sizeX }}</label>
                  <input type="range" min="1" max="24" v-model.number="activeElement.sizeX" class="w-full accent-emerald-400 cursor-pointer" />
                </div>
                <div>
                  <label class="block text-[10px] text-dark-muted mb-0.5">В (H): {{ activeElement.sizeY }}</label>
                  <input type="range" min="1" max="24" v-model.number="activeElement.sizeY" class="w-full accent-emerald-400 cursor-pointer" />
                </div>
                <div>
                  <label class="block text-[10px] text-dark-muted mb-0.5">Г (D): {{ activeElement.sizeZ }}</label>
                  <input type="range" min="1" max="24" v-model.number="activeElement.sizeZ" class="w-full accent-emerald-400 cursor-pointer" />
                </div>
              </div>
            </div>

            <!-- Rotation Controls -->
            <div class="bg-[#141619] border border-[#26292d] p-2.5 rounded-xl space-y-2">
              <span class="text-[11px] font-extrabold text-purple-400 uppercase tracking-wider block">Вращение (Rot Y: {{ activeElement.rotY || 0 }}°)</span>
              <input type="range" min="-180" max="180" step="15" v-model.number="activeElement.rotY" class="w-full accent-purple-400 cursor-pointer" />
            </div>

            <!-- Color & Textures for Selected Element -->
            <div class="bg-[#141619] border border-[#26292d] p-2.5 rounded-xl space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider block">Цвет & Текстуры Детали</span>
                <button type="button" @click="openGalleryForFace('all')" class="text-[10px] text-purple-300 hover:underline cursor-pointer">Текстура на все грани</button>
              </div>

              <div>
                <label class="block text-[10px] text-dark-muted mb-1">Цвет детали</label>
                <div class="flex items-center gap-2">
                  <input type="color" v-model="activeElement.color" class="w-7 h-7 rounded bg-transparent cursor-pointer" />
                  <input type="text" v-model="activeElement.color" class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-[11px] rounded px-2 py-1 font-mono" />
                </div>
              </div>

              <!-- 6 Face Textures Grid -->
              <div class="grid grid-cols-2 gap-1.5 pt-1">
                <div class="bg-[#0c0d0e] border border-[#26292d] p-1.5 rounded-lg space-y-1">
                  <div class="flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                    <span>Верх (Top)</span>
                    <button type="button" @click="openGalleryForFace('top')" class="text-cyan-400 hover:underline">Галерея</button>
                  </div>
                  <input type="text" v-model="activeElement.topImageUrl" placeholder="URL..." class="w-full bg-[#141619] text-white text-[10px] rounded px-1.5 py-0.5 border border-[#26292d]" />
                </div>

                <div class="bg-[#0c0d0e] border border-[#26292d] p-1.5 rounded-lg space-y-1">
                  <div class="flex items-center justify-between text-[10px] text-amber-400 font-bold">
                    <span>Низ (Bottom)</span>
                    <button type="button" @click="openGalleryForFace('bottom')" class="text-cyan-400 hover:underline">Галерея</button>
                  </div>
                  <input type="text" v-model="activeElement.bottomImageUrl" placeholder="URL..." class="w-full bg-[#141619] text-white text-[10px] rounded px-1.5 py-0.5 border border-[#26292d]" />
                </div>

                <div class="bg-[#0c0d0e] border border-[#26292d] p-1.5 rounded-lg space-y-1">
                  <div class="flex items-center justify-between text-[10px] text-cyan-400 font-bold">
                    <span>Лицо (Front)</span>
                    <button type="button" @click="openGalleryForFace('front')" class="text-cyan-400 hover:underline">Галерея</button>
                  </div>
                  <input type="text" v-model="activeElement.frontImageUrl" placeholder="URL..." class="w-full bg-[#141619] text-white text-[10px] rounded px-1.5 py-0.5 border border-[#26292d]" />
                </div>

                <div class="bg-[#0c0d0e] border border-[#26292d] p-1.5 rounded-lg space-y-1">
                  <div class="flex items-center justify-between text-[10px] text-purple-400 font-bold">
                    <span>Зад (Back)</span>
                    <button type="button" @click="openGalleryForFace('back')" class="text-cyan-400 hover:underline">Галерея</button>
                  </div>
                  <input type="text" v-model="activeElement.backImageUrl" placeholder="URL..." class="w-full bg-[#141619] text-white text-[10px] rounded px-1.5 py-0.5 border border-[#26292d]" />
                </div>
              </div>

              <button
                type="button"
                @click="clearElementTextures"
                class="w-full py-1 text-[10.5px] text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded-lg cursor-pointer transition-all"
              >
                Очистить текстуры детали
              </button>
            </div>
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
          <span>Применить 3D модель к палитре</span>
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
              placeholder="например, Набор Декоративной Мебели"
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
.scene-3d-multi {
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  transition: transform 0.05s linear;
}

.grid-plane-3d {
  position: absolute;
  top: -150px;
  left: -150px;
  width: 300px;
  height: 300px;
  transform: rotateX(90deg) translateZ(-40px);
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
  background-size: 20px 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  pointer-events: none;
}

.element-3d-container {
  position: absolute;
  top: 0;
  left: 0;
  transform-style: preserve-3d;
  transition: transform 0.08s ease-out;
  cursor: pointer;
}

.element-3d-container.active-element .face-multi {
  border-color: rgba(245, 158, 11, 0.9) !important;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.5);
}

.face-multi {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.4);
  backface-visibility: hidden;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  margin-top: -50%;
  margin-left: -50%;
}

.front  { filter: brightness(1); }
.back   { filter: brightness(0.65); }
.top    { filter: brightness(1.2); }
.bottom { filter: brightness(0.4); }
.left   { filter: brightness(0.8); }
.right  { filter: brightness(0.9); }
</style>
