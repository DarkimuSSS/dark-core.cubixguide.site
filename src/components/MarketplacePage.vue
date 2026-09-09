<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import IconRenderer from './IconRenderer.vue'
import type { AssetPack, CustomBlockModel, AuthorMediaItem } from '../types/guide'

const props = defineProps<{
  currentUsername?: string
}>()

const emit = defineEmits<{
  (e: 'go-home'): void
}>()

const activeTab = ref<'packs' | 'models'>('packs')
const searchQuery = ref('')
const selectedCategory = ref('Все')
const notification = ref<string | null>(null)

const categories = ['Все', 'Minecraft Блоки', 'Индустриальные', 'Магия & Алхимия', 'Мебель & Декор', 'Руды & Металлы', 'Общий']

// Packs & Models State
const marketPacks = ref<AssetPack[]>([])
const marketModels = ref<CustomBlockModel[]>([])
const isLoadingPacks = ref(false)
const isLoadingModels = ref(false)

const showNotification = (msg: string) => {
  notification.value = msg
  setTimeout(() => {
    notification.value = null
  }, 4000)
}

const fetchPacks = async () => {
  isLoadingPacks.value = true
  try {
    const res = await fetch('/api/market/packs')
    if (res.ok) {
      marketPacks.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to fetch market packs:', e)
  } finally {
    isLoadingPacks.value = false
  }
}

const fetchModels = async () => {
  isLoadingModels.value = true
  try {
    const res = await fetch('/api/market/models')
    if (res.ok) {
      marketModels.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to fetch market models:', e)
  } finally {
    isLoadingModels.value = false
  }
}

onMounted(() => {
  fetchPacks()
  fetchModels()
})

const filteredPacks = computed(() => {
  return marketPacks.value.filter(p => {
    const matchesCat = selectedCategory.value === 'Все' || p.category === selectedCategory.value
    const q = searchQuery.value.toLowerCase().trim()
    const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    return matchesCat && matchesSearch
  })
})

const filteredModels = computed(() => {
  return marketModels.value.filter(m => {
    const matchesCat = selectedCategory.value === 'Все' || m.category === selectedCategory.value
    const q = searchQuery.value.toLowerCase().trim()
    const matchesSearch = !q || m.name.toLowerCase().includes(q) || (m.author || '').toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q)
    return matchesCat && matchesSearch
  })
})

// Local Storage Installed Items
const effectiveUsername = computed(() => {
  if (props.currentUsername && props.currentUsername.trim()) return props.currentUsername.trim()
  try {
    const savedUser = localStorage.getItem('cubix_user')
    if (savedUser) {
      const parsed = JSON.parse(savedUser)
      if (parsed && parsed.username) return parsed.username
    }
  } catch (e) {}
  return 'author'
})

const galleryStorageKey = computed(() => `cubix_author_gallery_${effectiveUsername.value.toLowerCase()}`)

const installPack = async (pack: AssetPack) => {
  try {
    const saved = localStorage.getItem(galleryStorageKey.value)
    let currentGallery: AuthorMediaItem[] = saved ? JSON.parse(saved) : []

    let addedImages = 0
    let addedModels = 0

    // Add textures
    if (pack.items && pack.items.length > 0) {
      for (const item of pack.items) {
        if (!currentGallery.some(m => m.url === item.url)) {
          currentGallery.unshift({
            id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: `${item.name} (${pack.title})`,
            url: item.url,
            uploadedAt: new Date().toISOString().split('T')[0]
          })
          addedImages++
        }
      }
      localStorage.setItem(galleryStorageKey.value, JSON.stringify(currentGallery))
    }

    // Add models if present in pack
    if (pack.models && pack.models.length > 0) {
      const localModelsRaw = localStorage.getItem('cubix_block_models')
      let localModels: CustomBlockModel[] = localModelsRaw ? JSON.parse(localModelsRaw) : []
      for (const model of pack.models) {
        if (!localModels.some(m => m.id === model.id)) {
          localModels.push(model)
          addedModels++
        }
      }
      localStorage.setItem('cubix_block_models', JSON.stringify(localModels))
    }

    await fetch(`/api/market/packs/${pack.id}/install`, { method: 'POST' })
    pack.downloads += 1
    showNotification(`Пак "${pack.title}" установлен! (Добавлено: ${addedImages} текстур, ${addedModels} моделей)`)
  } catch (e) {
    showNotification('Ошибка установки пака')
  }
}

const installModel = async (model: CustomBlockModel) => {
  try {
    const res = await fetch(`/api/market/models/${model.id}/install`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      if (data.model) {
        const localModelsRaw = localStorage.getItem('cubix_block_models')
        let localModels: CustomBlockModel[] = localModelsRaw ? JSON.parse(localModelsRaw) : []
        if (!localModels.some(m => m.id === data.model.id)) {
          localModels.push(data.model)
          localStorage.setItem('cubix_block_models', JSON.stringify(localModels))
        }
        const found = marketModels.value.find(m => m.id === model.id)
        if (found) found.downloads = (found.downloads || 0) + 1
        showNotification(`3D-Модель "${model.name}" добавлена в вашу коллекцию!`)
      }
    }
  } catch (e) {
    showNotification('Ошибка скачивания 3D-модели')
  }
}
</script>

<template>
  <div class="space-y-8 pb-24 max-w-7xl mx-auto px-4 sm:px-6 pt-4">
    
    <!-- HERO MARKETPLACE HEADER BANNER -->
    <div class="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#16181a] via-[#121416] to-[#0c0d0e] border border-[#26292d] p-6 sm:p-10 shadow-2xl">
      <div class="absolute -top-28 -right-28 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-28 -left-28 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div class="space-y-3">
          <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-extrabold shadow-inner">
            <IconRenderer name="ShoppingBag" size="14" class="text-amber-400" />
            <span>Официальный Маркетплейс Сообщества</span>
          </div>

          <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Маркетплейс <span class="bg-gradient-to-r from-amber-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">Ассетов & 3D-Моделей</span>
          </h1>

          <p class="text-xs sm:text-sm text-dark-muted max-w-2xl leading-relaxed">
            Единая коллекция авторских ресурс-паков, пакетов текстур и готовых 3D-моделей блоков. Скачивайте ассеты в 1 клик для применения в ваших гайдах.
          </p>
        </div>

        <button
          @click="emit('go-home')"
          class="px-5 py-2.5 rounded-2xl bg-[#1c1f24] hover:bg-[#262a30] border border-[#34383e] text-slate-300 hover:text-white text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 self-start md:self-center shadow-lg"
        >
          <IconRenderer name="ArrowLeft" size="16" />
          <span>На главную</span>
        </button>
      </div>
    </div>

    <!-- NOTIFICATION TOAST -->
    <div v-if="notification" class="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2.5 animate-bounce">
      <IconRenderer name="CheckCircle2" size="18" />
      <span>{{ notification }}</span>
    </div>

    <!-- TABS BAR & SEARCH -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#26292d] pb-4">
      
      <!-- Tabs Switcher -->
      <div class="flex items-center gap-2 bg-[#0c0d0e] p-1.5 rounded-2xl border border-[#26292d]">
        <button
          @click="activeTab = 'packs'"
          :class="[
            'px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
            activeTab === 'packs'
              ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-950/40'
              : 'text-slate-400 hover:text-white'
          ]"
        >
          <IconRenderer name="FolderImage" size="16" />
          <span>📦 Паки Ассетов ({{ marketPacks.length }})</span>
        </button>

        <button
          @click="activeTab = 'models'"
          :class="[
            'px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
            activeTab === 'models'
              ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-white shadow-lg shadow-purple-950/40'
              : 'text-slate-400 hover:text-white'
          ]"
        >
          <IconRenderer name="Box" size="16" />
          <span>🎲 3D-Модели Блоков ({{ marketModels.length }})</span>
        </button>
      </div>

      <!-- Search Input -->
      <div class="relative w-full md:w-80">
        <IconRenderer name="Search" size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск по маркетплейсу..."
          class="w-full pl-10 pr-4 py-2.5 bg-[#0c0d0e] border border-[#26292d] focus:border-amber-500 rounded-2xl text-xs text-white placeholder-dark-muted outline-none transition-all shadow-inner"
        />
      </div>
    </div>

    <!-- CATEGORY FILTERS BAR -->
    <div class="flex items-center gap-2 flex-wrap">
      <button
        v-for="cat in categories"
        :key="cat"
        @click="selectedCategory = cat"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border',
          selectedCategory === cat
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-950/30'
            : 'bg-[#0c0d0e] text-slate-400 border-[#26292d] hover:text-white hover:bg-[#16181a]'
        ]"
      >
        {{ cat }}
      </button>
    </div>

    <!-- SECTION 1: ASSET PACKS (TEXTURES & MODELS COMBINED) -->
    <div v-if="activeTab === 'packs'">
      <div v-if="isLoadingPacks" class="text-center py-20 text-dark-muted space-y-3">
        <IconRenderer name="Loader2" size="36" class="animate-spin mx-auto text-amber-400" />
        <p class="text-xs font-bold">Загрузка наборов из маркетплейса...</p>
      </div>

      <div v-else-if="filteredPacks.length === 0" class="text-center py-20 bg-[#0c0d0e] border border-[#26292d] rounded-3xl space-y-3">
        <div class="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400">
          <IconRenderer name="FolderImage" size="32" />
        </div>
        <h3 class="text-base font-bold text-white">Паки не найдены</h3>
        <p class="text-xs text-dark-muted">В этой категории пока нет опубликованных ассет-паков</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="pack in filteredPacks"
          :key="pack.id"
          class="bg-[#16181a] border border-[#26292d] hover:border-amber-500/50 rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 group hover:-translate-y-1.5 shadow-xl hover:shadow-2xl hover:shadow-amber-950/30 relative overflow-hidden"
        >
          <div class="space-y-4">
            <!-- Header Row -->
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1">
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {{ pack.category }}
                </span>
                <h3 class="text-lg font-black text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                  {{ pack.title }}
                </h3>
              </div>

              <div class="flex items-center gap-1 text-xs text-amber-300 font-extrabold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl shrink-0">
                <IconRenderer name="Download" size="13" />
                <span>{{ pack.downloads || 0 }}</span>
              </div>
            </div>

            <p v-if="pack.description" class="text-xs text-dark-muted line-clamp-2 leading-relaxed">
              {{ pack.description }}
            </p>

            <!-- Items / Textures / Models Grid Preview -->
            <div class="grid grid-cols-4 gap-2 bg-[#0c0d0e] border border-[#26292d] p-2.5 rounded-2xl">
              <div
                v-for="(item, idx) in pack.items.slice(0, 4)"
                :key="idx"
                class="w-full h-16 bg-[#16181a] border border-[#26292d] rounded-xl overflow-hidden relative group/item"
              >
                <img :src="item.url" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center p-1 text-[9px] text-white text-center font-bold">
                  {{ item.name }}
                </div>
              </div>
            </div>

            <!-- Author & Badges Info -->
            <div class="flex items-center justify-between text-xs text-dark-muted pt-1">
              <div class="flex items-center gap-1.5 font-bold text-slate-300">
                <IconRenderer name="User" size="14" class="text-amber-400" />
                <span>{{ pack.author }}</span>
              </div>
              <span class="text-[11px] text-slate-400 font-mono">
                {{ pack.items.length }} эл.
              </span>
            </div>
          </div>

          <!-- Footer Download Button -->
          <div class="mt-5 pt-4 border-t border-[#26292d]">
            <button
              @click="installPack(pack)"
              class="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
            >
              <IconRenderer name="Download" size="15" />
              <span>Установить пак ({{ pack.items.length }} ассетов)</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION 2: 3D MODELS MARKETPLACE -->
    <div v-if="activeTab === 'models'">
      <div v-if="isLoadingModels" class="text-center py-20 text-dark-muted space-y-3">
        <IconRenderer name="Loader2" size="36" class="animate-spin mx-auto text-cyan-400" />
        <p class="text-xs font-bold">Загрузка 3D-моделей из каталога...</p>
      </div>

      <div v-else-if="filteredModels.length === 0" class="text-center py-20 bg-[#0c0d0e] border border-[#26292d] rounded-3xl space-y-3">
        <div class="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mx-auto flex items-center justify-center text-cyan-400">
          <IconRenderer name="Box" size="32" />
        </div>
        <h3 class="text-base font-bold text-white">Модели не найдены</h3>
        <p class="text-xs text-dark-muted">В этой категории пока нет опубликованных 3D-блоков</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div
          v-for="model in filteredModels"
          :key="model.id"
          class="bg-[#16181a] border border-[#26292d] hover:border-cyan-500/50 rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 group hover:-translate-y-1.5 shadow-xl hover:shadow-2xl hover:shadow-cyan-950/30"
        >
          <!-- 3D Box Scene Container -->
          <div class="w-full h-44 bg-gradient-to-b from-[#0c0d0e] to-[#121416] border border-[#26292d] rounded-2xl flex items-center justify-center relative overflow-hidden group-hover:border-cyan-500/30 transition-colors">
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

            <div class="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 text-xs text-cyan-300 font-extrabold flex items-center gap-1.5 shadow-md">
              <IconRenderer name="Download" size="12" />
              <span>{{ model.downloads || 0 }}</span>
            </div>
          </div>

          <!-- Info Body -->
          <div class="mt-4 space-y-1.5 flex-1">
            <h4 class="text-base font-black text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
              {{ model.name }}
            </h4>
            <div class="flex items-center gap-1.5 text-xs text-dark-muted font-bold">
              <IconRenderer name="User" size="13" class="text-cyan-400" />
              <span>{{ model.author || 'Автор не указан' }}</span>
            </div>
            <p v-if="model.description" class="text-xs text-slate-400 line-clamp-2 leading-relaxed pt-1">
              {{ model.description }}
            </p>
          </div>

          <!-- Download Button -->
          <div class="mt-5 pt-4 border-t border-[#26292d]">
            <button
              @click="installModel(model)"
              class="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-xs shadow-lg shadow-purple-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
            >
              <IconRenderer name="Download" size="15" />
              <span>Скачать 3D-модель</span>
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.preview-3d-wrapper {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 600px;
}

.cube-3d {
  width: 60px;
  height: 60px;
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
  width: 60px;
  height: 60px;
  background-size: cover;
  image-rendering: pixelated;
  border: 1px solid rgba(0,0,0,0.4);
  box-shadow: inset 0 0 10px rgba(0,0,0,0.3);
}

.face.front  { transform: translateZ(30px); }
.face.back   { transform: rotateY(180deg) translateZ(30px); }
.face.right  { transform: rotateY(90deg) translateZ(30px); }
.face.left   { transform: rotateY(-90deg) translateZ(30px); }
.face.top    { transform: rotateX(90deg) translateZ(30px); }
.face.bottom { transform: rotateX(-90deg) translateZ(30px); }
</style>
