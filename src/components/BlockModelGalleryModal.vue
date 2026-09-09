<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { CustomBlockModel } from '../types/guide'

const props = defineProps<{
  isOpen: boolean
  authorName?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select-model', model: CustomBlockModel): void
}>()

const activeTab = ref<'my' | 'market'>('market')
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
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content model-gallery-modal">
      <header class="modal-header">
        <div class="header-title">
          <i class="fas-cube title-icon"></i>
          <div>
            <h2>Галерея & Маркетплейс 3D-моделей</h2>
            <p class="subtitle">Выбирайте, публикуйте и применяйте объёмные 3D-модели блоков</p>
          </div>
        </div>
        <button class="btn-close" @click="$emit('close')">
          <i class="fas-times"></i>
        </button>
      </header>

      <!-- Tabs Navigation -->
      <div class="tabs-bar">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'market' }"
          @click="activeTab = 'market'"
        >
          <i class="fas-shopping-bag"></i> Маркетплейс 3D-моделей
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'my' }"
          @click="activeTab = 'my'; loadLocalModels()"
        >
          <i class="fas-box-open"></i> Мои 3D-модели ({{ localModels.length }})
        </button>
      </div>

      <!-- Marketplace Tab -->
      <div v-if="activeTab === 'market'" class="tab-pane">
        <div class="filter-controls">
          <div class="search-box">
            <i class="fas-search"></i>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Поиск по названию или автору..." 
            />
          </div>

          <div class="category-pills">
            <button 
              v-for="cat in categories" 
              :key="cat.id"
              class="pill-btn"
              :class="{ active: selectedCategory === cat.id }"
              @click="selectedCategory = cat.id"
            >
              {{ cat.name }}
            </button>
          </div>
        </div>

        <div v-if="isLoadingMarket" class="loading-state">
          <i class="fas-spinner fa-spin"></i> Загрузка 3D-моделей из маркетплейса...
        </div>

        <div v-else-if="filteredMarketModels.length === 0" class="empty-state">
          <i class="fas-cube-empty"></i>
          <p>В этой категории пока нет опубликованных 3D-моделей</p>
        </div>

        <div v-else class="models-grid">
          <div v-for="model in filteredMarketModels" :key="model.id" class="model-card">
            <!-- 3D Box Preview -->
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

            <div class="card-info">
              <h4 class="model-name">{{ model.name }}</h4>
              <p class="model-author"><i class="fas-user"></i> {{ model.author || 'Автор не указан' }}</p>
              <p v-if="model.description" class="model-desc">{{ model.description }}</p>
              
              <div class="card-footer">
                <span class="download-badge">
                  <i class="fas-download"></i> {{ model.downloads || 0 }}
                </span>
                
                <button 
                  v-if="isInstalled(model.id)" 
                  class="btn-action installed"
                  @click="useModel(model)"
                >
                  <i class="fas-check"></i> Использовать
                </button>
                <button 
                  v-else 
                  class="btn-action install"
                  @click="installMarketModel(model)"
                >
                  <i class="fas-file-download"></i> Скачать
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- My 3D Models Tab -->
      <div v-if="activeTab === 'my'" class="tab-pane">
        <div v-if="localModels.length === 0" class="empty-state">
          <i class="fas-cubes"></i>
          <p>У вас еще нет сохраненных 3D-моделей. Вы можете легко создать их в редакторе моделей!</p>
        </div>

        <div v-else class="models-grid">
          <div v-for="model in localModels" :key="model.id" class="model-card">
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

            <div class="card-info">
              <h4 class="model-name">{{ model.name }}</h4>
              
              <div class="card-actions">
                <button class="btn-primary-sm" @click="useModel(model)">
                  <i class="fas-paint-brush"></i> Применить
                </button>
                <button class="btn-publish-sm" @click="openPublishModal(model)">
                  <i class="fas-share-alt"></i> В маркет
                </button>
                <button class="btn-danger-sm" @click="deleteLocalModel(model.id)">
                  <i class="fas-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal to Publish to Marketplace -->
    <div v-if="isPublishingModalOpen" class="submodal-overlay" @click.self="isPublishingModalOpen = false">
      <div class="submodal-content">
        <h3>Публикация 3D-модели в Маркет</h3>
        
        <div v-if="modelToPublish" class="form-group">
          <label>Название модели:</label>
          <input v-model="modelToPublish.name" type="text" class="input-field" />

          <label>Категория:</label>
          <select v-model="publishCategory" class="input-field">
            <option value="blocks">Блоки</option>
            <option value="furniture">Декорации / Мебель</option>
            <option value="ores">Руды и металлы</option>
            <option value="nature">Растения и природа</option>
          </select>

          <label>Описание (опционально):</label>
          <textarea v-model="modelToPublish.description" class="input-field textarea" placeholder="Опишите текстуры и назначение блока..."></textarea>
        </div>

        <div class="submodal-actions">
          <button class="btn-secondary" @click="isPublishingModalOpen = false">Отмена</button>
          <button class="btn-success" @click="submitPublish">Опубликовать</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(10, 15, 25, 0.85);
  backdrop-filter: blur(8px);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-content.model-gallery-modal {
  background: #141c2c;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 1000px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  color: #fff;
  overflow: hidden;
}

.modal-header {
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon {
  font-size: 28px;
  color: #10b981;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #f3f4f6;
}

.subtitle {
  font-size: 13px;
  color: #9ca3af;
  margin: 2px 0 0 0;
}

.btn-close {
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.tabs-bar {
  display: flex;
  gap: 8px;
  padding: 12px 24px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.tab-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #e5e7eb;
}

.tab-btn.active {
  color: #10b981;
  border-bottom-color: #10b981;
}

.tab-pane {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box i {
  position: absolute;
  left: 16px;
  color: #6b7280;
}

.search-box input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  outline: none;
}

.category-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pill-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #9ca3af;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.pill-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.pill-btn.active {
  background: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  color: #10b981;
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.model-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s, border-color 0.2s;
}

.model-card:hover {
  transform: translateY(-4px);
  border-color: rgba(16, 185, 129, 0.4);
}

.preview-3d-wrapper {
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 600px;
}

.cube-3d {
  width: 70px;
  height: 70px;
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
  width: 70px;
  height: 70px;
  background-size: cover;
  image-rendering: pixelated;
  border: 1px solid rgba(0,0,0,0.3);
  box-shadow: inset 0 0 10px rgba(0,0,0,0.2);
}

.face.front  { transform: translateZ(35px); }
.face.back   { transform: rotateY(180deg) translateZ(35px); }
.face.right  { transform: rotateY(90deg) translateZ(35px); }
.face.left   { transform: rotateY(-90deg) translateZ(35px); }
.face.top    { transform: rotateX(90deg) translateZ(35px); }
.face.bottom { transform: rotateX(-90deg) translateZ(35px); }

.card-info {
  width: 100%;
  margin-top: 16px;
}

.model-name {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: #f9fafb;
}

.model-author {
  font-size: 12px;
  color: #9ca3af;
  margin: 0 0 8px 0;
}

.model-desc {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.download-badge {
  font-size: 12px;
  color: #9ca3af;
}

.btn-action {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-action.install {
  background: #10b981;
  color: #fff;
}

.btn-action.installed {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: 1px solid #10b981;
}

.card-actions {
  display: flex;
  gap: 6px;
  margin-top: 12px;
}

.btn-primary-sm, .btn-publish-sm, .btn-danger-sm {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-primary-sm { background: #3b82f6; color: #fff; flex: 1; justify-content: center; }
.btn-publish-sm { background: #8b5cf6; color: #fff; }
.btn-danger-sm { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.empty-state, .loading-state {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
}

/* Submodal */
.submodal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submodal-content {
  background: #1e293b;
  border-radius: 12px;
  padding: 24px;
  width: 400px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.input-field {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  padding: 8px 12px;
  color: #fff;
}

.textarea {
  height: 80px;
  resize: none;
}

.submodal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.btn-secondary { background: #475569; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.btn-success { background: #10b981; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
</style>
