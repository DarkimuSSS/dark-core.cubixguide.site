<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import IconRenderer from './IconRenderer.vue'
import AuthorGalleryModal from './AuthorGalleryModal.vue'
import BlockModelEditorModal from './BlockModelEditorModal.vue'
import type { CustomBlockModel } from '../types/guide'

const props = defineProps<{
  isOpen: boolean
  authorName?: string
  embedded?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select-model', model: CustomBlockModel): void
}>()

// Active section in unified Assets Hub:
// 'market_models' | 'market_packs' | 'author_gallery' | 'model_editor'
const activeTab = ref<'market_models' | 'market_packs' | 'author_gallery' | 'model_editor'>('market_models')
const searchQuery = ref('')
const selectedCategory = ref('all')
const isPublishingModalOpen = ref(false)
const modelToPublish = ref<CustomBlockModel | null>(null)
const publishCategory = ref('blocks')

const categories = [
  { id: 'all', name: 'Все категории' },
  { id: 'blocks', name: 'Блоки' },
  { id: 'furniture', name: 'Декорации / Мебель' },
  { id: 'ores', name: 'Руды и металлы' },
  { id: 'nature', name: 'Растения и природа' }
]

// Models state
const localModels = ref<CustomBlockModel[]>([])
const marketModels = ref<CustomBlockModel[]>([])
const isLoadingMarket = ref(false)

const loadLocalModels = () => {
  try {
    const raw = localStorage.getItem('cubix_block_models')
    if (raw) {
      localModels.value = JSON.parse(raw)
    } else {
      localModels.value = []
    }
  } catch (e) {
    console.error('Failed to load local models:', e)
  }
}

const saveLocalModels = () => {
  localStorage.setItem('cubix_block_models', JSON.stringify(localModels.value))
}

const fetchMarketModels = async () => {
  isLoadingMarket.value = true
  try {
    const res = await fetch('/api/market/models')
    if (res.ok) {
      marketModels.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to fetch market block models:', e)
  } finally {
    isLoadingMarket.value = false
  }
}

onMounted(() => {
  loadLocalModels()
  fetchMarketModels()
})

const filteredMarketModels = computed(() => {
  return marketModels.value.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (m.author || '').toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCat = selectedCategory.value === 'all' || m.category === selectedCategory.value
    return matchesSearch && matchesCat
  })
})

const isInstalled = (modelId: string) => {
  return localModels.value.some(m => m.id === modelId)
}

const installMarketModel = async (model: CustomBlockModel) => {
  try {
    const res = await fetch(`/api/market/models/${model.id}/install`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      if (data.model) {
        if (!isInstalled(data.model.id)) {
          localModels.value.push(data.model)
          saveLocalModels()
        }
        // Update downloads count locally
        const found = marketModels.value.find(m => m.id === model.id)
        if (found) found.downloads = (found.downloads || 0) + 1
      }
    }
  } catch (e) {
    console.error('Failed to install model:', e)
  }
}

const openPublishModal = (model: CustomBlockModel) => {
  modelToPublish.value = JSON.parse(JSON.stringify(model))
  isPublishingModalOpen.value = true
}

const submitPublish = async () => {
  if (!modelToPublish.value) return
  try {
    const payload = {
      ...modelToPublish.value,
      category: publishCategory.value,
      author: props.authorName || 'Аноним'
    }
    const res = await fetch('/api/market/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (res.ok) {
      isPublishingModalOpen.value = false
      modelToPublish.value = null
      fetchMarketModels()
    }
  } catch (e) {
    console.error('Failed to publish model:', e)
  }
}

const useModel = (model: CustomBlockModel) => {
  emit('select-model', model)
  emit('close')
}

const deleteLocalModel = (id: string) => {
  if (confirm('Удалить эту 3D-модель из вашей коллекции?')) {
    localModels.value = localModels.value.filter(m => m.id !== id)
    saveLocalModels()
  }
}
</script>

<template>
  <div v-if="isOpen" :class="[embedded ? 'w-full space-y-6' : 'fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-fadeIn']">
    <div :class="[embedded ? 'w-full space-y-6' : 'bg-[#16181a] border border-[#26292d] w-full max-w-6xl rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 relative max-h-[92vh] flex flex-col overflow-hidden']">
      
      <!-- HERO BANNER FOR MARKETPLACE HUB -->
      <div class="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#16181a] via-[#121416] to-[#0c0d0e] border border-[#26292d] p-6 sm:p-8 shadow-xl">
        <div class="absolute -top-24 -right-24 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold shadow-inner">
              <IconRenderer name="Box" size="14" class="text-emerald-400 animate-pulse" />
              <span>Маркетплейс Ресурсов & 3D-Моделей</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Центр Ассетов <span class="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">& 3D-Блоков</span>
            </h2>
            <p class="text-xs sm:text-sm text-dark-muted max-w-xl leading-relaxed">
              Публикуйте свои текстуры, скачивайте уникальные 3D-блоки сообщества в 1 клик и используйте их в интерактивных гайдах.
            </p>
          </div>

          <!-- Top Actions -->
          <div class="flex items-center gap-3">
            <button
              v-if="!embedded"
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 rounded-xl bg-[#0c0d0e] hover:bg-[#212429] border border-[#26292d] text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
            >
              <IconRenderer name="X" size="16" />
              <span>Закрыть</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MAIN TABS CONTROL -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#26292d] pb-4">
        <!-- Tab Selector Pills -->
        <div class="flex items-center gap-2 bg-[#0c0d0e] p-1.5 rounded-2xl border border-[#26292d] flex-wrap">
          
          <!-- Tab 1: Маркет 3D-Моделей -->
          <button
            type="button"
            @click="activeTab = 'market_models'"
            :class="[
              'px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'market_models' 
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-950/40' 
                : 'text-slate-400 hover:text-white'
            ]"
          >
            <IconRenderer name="ShoppingBag" size="15" />
            <span>🛒 Маркет 3D-Моделей</span>
            <span class="px-1.5 py-0.5 text-[10px] bg-emerald-400/20 text-emerald-300 font-black rounded-md border border-emerald-400/30">
              {{ marketModels.length }}
            </span>
          </button>

          <!-- Tab 2: Галерея & Паки Текстур -->
          <button
            type="button"
            @click="activeTab = 'author_gallery'"
            :class="[
              'px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'author_gallery' 
                ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-lg shadow-amber-950/40' 
                : 'text-slate-400 hover:text-white'
            ]"
          >
            <IconRenderer name="FolderImage" size="15" />
            <span>📁 Галерея Текстур & Паки</span>
          </button>

          <!-- Tab 3: Редактор 3D-Блоков -->
          <button
            type="button"
            @click="activeTab = 'model_editor'"
            :class="[
              'px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'model_editor' 
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-white shadow-lg shadow-purple-950/40' 
                : 'text-slate-400 hover:text-white'
            ]"
          >
            <IconRenderer name="Box" size="15" />
            <span>🎲 Конструктор 3D</span>
          </button>
        </div>

        <!-- Search Bar -->
        <div v-if="activeTab === 'market_models'" class="relative flex-1 max-w-sm">
          <IconRenderer name="Search" size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск 3D-модели..."
            class="w-full pl-10 pr-4 py-2.5 bg-[#0c0d0e] border border-[#26292d] focus:border-emerald-500 rounded-xl text-xs text-slate-100 placeholder-dark-muted focus:outline-none transition-all shadow-inner"
          />
        </div>
      </div>

      <!-- CATEGORIES BAR FOR MARKETPLACE -->
      <div v-if="activeTab === 'market_models'" class="flex items-center gap-2 flex-wrap">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="selectedCategory = cat.id"
          :class="[
            'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-2',
            selectedCategory === cat.id
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-950/30'
              : 'bg-[#0c0d0e] text-slate-400 border-[#26292d] hover:text-white hover:bg-[#1a1d21]'
          ]"
        >
          <span>{{ cat.name }}</span>
        </button>
      </div>

      <!-- CONTENT GRID -->
      <div class="flex-1 overflow-y-auto custom-scrollbar pr-1">
        
        <!-- SECTION 1: 3D Models Marketplace -->
        <div v-if="activeTab === 'market_models'">
          <div v-if="isLoadingMarket" class="text-center py-20 text-dark-muted space-y-3">
            <IconRenderer name="Loader2" size="36" class="animate-spin mx-auto text-emerald-400" />
            <p class="text-xs font-semibold">Загрузка карточек из каталога...</p>
          </div>

          <div v-else-if="filteredMarketModels.length === 0" class="text-center py-20 bg-[#0c0d0e] border border-[#26292d] rounded-2xl space-y-3">
            <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center text-emerald-400">
              <IconRenderer name="Box" size="28" />
            </div>
            <h3 class="text-base font-bold text-white">Модели не найдены</h3>
            <p class="text-xs text-dark-muted">В этой категории пока нет опубликованных 3D-блоков</p>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            <div
              v-for="model in filteredMarketModels"
              :key="model.id"
              class="bg-[#0c0d0e] border border-[#26292d] hover:border-emerald-500/50 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 group hover:-translate-y-1.5 shadow-lg hover:shadow-2xl hover:shadow-emerald-950/30"
            >
              <!-- 3D Box Visual Scene -->
              <div class="w-full h-40 bg-gradient-to-b from-[#16181a] to-[#0d0f11] border border-[#26292d] rounded-xl flex items-center justify-center relative overflow-hidden group-hover:border-emerald-500/30 transition-colors">
                <div class="preview-3d-wrapper">
                  <div class="cube-3d">
                    <div class="face front" :style="{ backgroundImage: `url(${model.textures.north || ''})` }"></div>
                    <div class="face back" :style="{ backgroundImage: `url(${model.textures.south || ''})` }"></div>
                    <div class="face right" :style="{ backgroundImage: `url(${model.textures.east || ''})` }"></div>
                    <div class="face left" :style="{ backgroundImage: `url(${model.textures.west || ''})` }"></div>
                    <div class="face top" :style="{ backgroundImage: `url(${model.textures.top || ''})` }"></div>
                    <div class="face bottom" :style="{ backgroundImage: `url(${model.textures.bottom || ''})` }"></div>
                  </div>
                </div>

                <div class="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[11px] text-emerald-300 font-extrabold flex items-center gap-1.5 shadow-md">
                  <IconRenderer name="Download" size="12" />
                  <span>{{ model.downloads || 0 }}</span>
                </div>
              </div>

              <!-- Info Card Body -->
              <div class="mt-3.5 space-y-1.5 flex-1">
                <h4 class="text-sm font-extrabold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                  {{ model.name }}
                </h4>
                <div class="flex items-center gap-1.5 text-[11px] text-dark-muted font-medium">
                  <IconRenderer name="User" size="12" class="text-emerald-400" />
                  <span>{{ model.author || 'Автор не указан' }}</span>
                </div>
                <p v-if="model.description" class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed pt-1">
                  {{ model.description }}
                </p>
              </div>

              <!-- Footer Action -->
              <div class="mt-4 pt-3 border-t border-[#26292d]">
                <button
                  v-if="isInstalled(model.id)"
                  @click="useModel(model)"
                  class="w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <IconRenderer name="Check" size="14" />
                  <span>Уже установлено</span>
                </button>
                <button
                  v-else
                  @click="installMarketModel(model)"
                  class="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                >
                  <IconRenderer name="Download" size="14" />
                  <span>Скачать 3D-модель</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 2: Author Texture Gallery & Packs -->
        <div v-else-if="activeTab === 'author_gallery'">
          <AuthorGalleryModal
            :is-open="true"
            :username="props.authorName || ''"
            @close="activeTab = 'market_models'"
          />
        </div>

        <!-- SECTION 3: 3D Block Model Editor Constructor -->
        <div v-else-if="activeTab === 'model_editor'">
          <BlockModelEditorModal
            :is-open="true"
            :username="props.authorName || ''"
            @close="activeTab = 'market_models'"
          />
        </div>

      </div>
    </div>

    <!-- Submodal for Publishing to Marketplace -->
    <div v-if="isPublishingModalOpen" class="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn" @click.self="isPublishingModalOpen = false">
      <div class="bg-[#16181a] border border-[#26292d] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <IconRenderer name="Share2" size="18" class="text-emerald-400" />
          Публикация 3D-модели в Маркет
        </h3>

        <div v-if="modelToPublish" class="space-y-3 text-xs">
          <div>
            <label class="block text-slate-300 mb-1 font-semibold">Название модели:</label>
            <input v-model="modelToPublish.name" type="text" class="w-full px-3 py-2 bg-[#0c0d0e] border border-[#26292d] rounded-xl text-white outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label class="block text-slate-300 mb-1 font-semibold">Категория:</label>
            <select v-model="publishCategory" class="w-full px-3 py-2 bg-[#0c0d0e] border border-[#26292d] rounded-xl text-white outline-none focus:border-emerald-500">
              <option value="blocks">Блоки</option>
              <option value="furniture">Декорации / Мебель</option>
              <option value="ores">Руды и металлы</option>
              <option value="nature">Растения и природа</option>
            </select>
          </div>

          <div>
            <label class="block text-slate-300 mb-1 font-semibold">Описание (опционально):</label>
            <textarea v-model="modelToPublish.description" class="w-full px-3 py-2 bg-[#0c0d0e] border border-[#26292d] rounded-xl text-white outline-none focus:border-emerald-500 h-20 resize-none"></textarea>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-[#26292d]">
          <button @click="isPublishingModalOpen = false" class="px-4 py-2 rounded-xl bg-[#0c0d0e] hover:bg-[#1a1d21] border border-[#26292d] text-slate-300 text-xs font-bold cursor-pointer">
            Отмена
          </button>
          <button @click="submitPublish" class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md cursor-pointer">
            Опубликовать
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.preview-3d-wrapper {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 500px;
}

.cube-3d {
  width: 54px;
  height: 54px;
  position: relative;
  transform-style: preserve-3d;
  animation: rotateCube 12s infinite linear;
}

@keyframes rotateCube {
  0% { transform: rotateX(-20deg) rotateY(0deg); }
  100% { transform: rotateX(-20deg) rotateY(360deg); }
}

.face {
  position: absolute;
  width: 54px;
  height: 54px;
  background-size: cover;
  image-rendering: pixelated;
  border: 1px solid rgba(0,0,0,0.4);
  box-shadow: inset 0 0 8px rgba(0,0,0,0.3);
}

.face.front  { transform: translateZ(27px); }
.face.back   { transform: rotateY(180deg) translateZ(27px); }
.face.right  { transform: rotateY(90deg) translateZ(27px); }
.face.left   { transform: rotateY(-90deg) translateZ(27px); }
.face.top    { transform: rotateX(90deg) translateZ(27px); }
.face.bottom { transform: rotateX(-90deg) translateZ(27px); }
</style>
