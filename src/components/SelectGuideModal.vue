<script setup lang="ts">
import { computed } from 'vue';
import IconRenderer from './IconRenderer.vue';
import type { Guide } from '../types/guide';

const props = defineProps<{
  isOpen: boolean;
  guides: Guide[];
  currentUsername: string;
  isAdmin: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', guide: Guide): void;
  (e: 'create'): void;
}>();

// User's own or co-authored guides
const userGuides = computed(() => {
  if (!props.currentUsername) return [];
  const username = props.currentUsername.toLowerCase().trim();
  return props.guides.filter(g => {
    const isAuthor = (g.meta.author || '').toLowerCase().trim() === username || 
                     (g.meta.coAuthors || []).some(ca => ca.toLowerCase().trim() === username);
    return isAuthor || props.isAdmin;
  });
});

const publishedGuides = computed(() => userGuides.value.filter(g => g.meta.published && g.meta.isVisible));
const draftGuides = computed(() => userGuides.value.filter(g => !g.meta.published || !g.meta.isVisible));

const handleSelect = (guide: Guide) => {
  emit('select', guide);
  emit('close');
};

const handleCreateNew = () => {
  emit('create');
  emit('close');
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
    <div class="bg-[#141619] border border-[#2d3239] w-full max-w-2xl rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative overflow-hidden flex flex-col max-h-[85vh]">
      
      <!-- Ambient Background Glow -->
      <div class="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-16 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-[#26292d] pb-4 relative z-10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg">
            <IconRenderer name="Edit3" size="20" />
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-extrabold text-white tracking-tight">Выбор гайда для Конструктора</h3>
            <p class="text-xs text-slate-400 font-medium">Выберите черновик или созданный гайд для редактирования</p>
          </div>
        </div>

        <button 
          @click="emit('close')"
          class="p-2 rounded-xl bg-[#1c1f24] hover:bg-[#262a30] text-dark-muted hover:text-white border border-[#34383e] transition-colors"
        >
          <IconRenderer name="X" size="18" />
        </button>
      </div>

      <!-- Action: Create New Guide Header Button -->
      <div class="relative z-10">
        <button
          type="button"
          @click="handleCreateNew"
          class="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] group cursor-pointer"
        >
          <div class="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
            <IconRenderer name="Plus" size="16" />
          </div>
          <span>Создать новый чистый гайд</span>
        </button>
      </div>

      <!-- Scrollable List of Guides & Drafts -->
      <div class="flex-1 overflow-y-auto space-y-6 pr-1 relative z-10 custom-scrollbar">
        
        <!-- Empty State: No Guides Found -->
        <div v-if="userGuides.length === 0" class="py-10 text-center space-y-4 bg-[#0d0e10] border border-[#23272d] rounded-2xl p-6">
          <div class="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <IconRenderer name="FileText" size="26" />
          </div>
          <div class="space-y-1">
            <h4 class="text-sm font-bold text-white">У вас пока нет созданных гайдов или черновиков</h4>
            <p class="text-xs text-dark-muted max-w-sm mx-auto">
              Нажмите кнопку выше, чтобы создать ваш первый обучающий гайд в нашем интерактивном конструкторе!
            </p>
          </div>
        </div>

        <template v-else>
          <!-- Section 1: Drafts & In Moderation -->
          <div v-if="draftGuides.length > 0" class="space-y-3">
            <div class="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-400">
              <span class="flex items-center gap-1.5">
                <IconRenderer name="Clock" size="14" />
                Черновики и На модерации ({{ draftGuides.length }})
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div 
                v-for="guide in draftGuides" 
                :key="guide.meta.id"
                @click="handleSelect(guide)"
                :class="[
                  'p-4 rounded-2xl bg-[#181a1e] hover:bg-[#202329] border transition-all cursor-pointer group flex flex-col justify-between space-y-3 shadow-md',
                  guide.meta.status === 'rejected' ? 'border-rose-500/50 hover:border-rose-500' : 
                  guide.meta.status === 'pending_moderation' ? 'border-cyan-500/50 hover:border-cyan-500' : 
                  'border-[#2b2f36] hover:border-amber-500/50'
                ]"
              >
                <div>
                  <div class="flex items-center justify-between gap-2 mb-1.5">
                    <span v-if="guide.meta.status === 'rejected'" class="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      Отклонен (Доработать)
                    </span>
                    <span v-else-if="guide.meta.status === 'pending_moderation'" class="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      На модерации
                    </span>
                    <span v-else class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Черновик
                    </span>
                    <span v-if="guide.meta.server" class="text-[10px] font-semibold text-emerald-400">
                      {{ guide.meta.server }}
                    </span>
                  </div>
                  <h4 class="text-xs font-extrabold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                    {{ guide.meta.title || 'Без названия' }}
                  </h4>

                  <!-- Rejection Reason Banner for Author -->
                  <div v-if="guide.meta.status === 'rejected' && guide.meta.rejectionReason" class="mt-2 p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-200 space-y-0.5">
                    <div class="font-extrabold text-rose-400 flex items-center gap-1">
                      <IconRenderer name="AlertTriangle" size="12" />
                      <span>Замечания администрации:</span>
                    </div>
                    <p class="leading-tight line-clamp-2 text-rose-300/90 font-medium">{{ guide.meta.rejectionReason }}</p>
                  </div>
                </div>

                <div class="flex items-center justify-between text-[10px] text-dark-muted border-t border-[#292d34] pt-2">
                  <span>Обновлено: {{ guide.meta.updatedAt }}</span>
                  <span class="text-amber-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Открыть <IconRenderer name="ArrowRight" size="12" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Published Guides -->
          <div v-if="publishedGuides.length > 0" class="space-y-3">
            <div class="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-400">
              <span class="flex items-center gap-1.5">
                <IconRenderer name="CheckCircle2" size="14" />
                Опубликованные гайды ({{ publishedGuides.length }})
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div 
                v-for="guide in publishedGuides" 
                :key="guide.meta.id"
                @click="handleSelect(guide)"
                class="p-4 rounded-2xl bg-[#181a1e] hover:bg-[#202329] border border-[#2b2f36] hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3 shadow-md"
              >
                <div>
                  <div class="flex items-center justify-between gap-2 mb-1.5">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Опубликован
                    </span>
                    <span v-if="guide.meta.server" class="text-[10px] font-semibold text-emerald-400">
                      {{ guide.meta.server }}
                    </span>
                  </div>
                  <h4 class="text-xs font-extrabold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
                    {{ guide.meta.title || 'Без названия' }}
                  </h4>
                </div>

                <div class="flex items-center justify-between text-[10px] text-dark-muted border-t border-[#292d34] pt-2">
                  <span>Просмотров: {{ guide.meta.viewsCount || 0 }}</span>
                  <span class="text-emerald-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Редактировать <IconRenderer name="ArrowRight" size="12" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-end pt-3 border-t border-[#26292d] relative z-10">
        <button
          type="button"
          @click="emit('close')"
          class="px-5 py-2 rounded-xl bg-[#1c1f24] hover:bg-[#262a30] text-slate-300 hover:text-white border border-[#34383e] text-xs font-bold transition-all"
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>
</template>
