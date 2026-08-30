<script setup lang="ts">
import IconRenderer from './IconRenderer.vue';

const props = withDefaults(defineProps<{
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}>(), {
  title: 'Подтверждение действия',
  confirmText: 'Подтвердить',
  cancelText: 'Отмена',
  type: 'danger'
});

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
    <div class="bg-[#16181a] border border-rose-500/40 w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-center relative overflow-hidden animate-scaleUp">
      
      <!-- Ambient Glow Behind Modal -->
      <div class="absolute -top-12 -left-12 w-36 h-36 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-12 -right-12 w-36 h-36 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Icon Header -->
      <div class="relative z-10">
        <div
          :class="[
            'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-2xl border transition-transform hover:scale-105',
            type === 'danger' ? 'bg-rose-500/10 text-rose-400 border-rose-500/40 shadow-rose-950/60' : '',
            type === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-amber-950/60' : '',
            type === 'info' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 shadow-cyan-950/60' : ''
          ]"
        >
          <IconRenderer :name="type === 'danger' ? 'AlertTriangle' : (type === 'warning' ? 'AlertCircle' : 'Info')" size="28" class="stroke-[2.2]" />
        </div>
      </div>

      <!-- Title & Message Body -->
      <div class="relative z-10 space-y-2">
        <h3 class="text-lg font-extrabold text-white tracking-tight">
          {{ title }}
        </h3>
        <p class="text-xs text-slate-300 leading-relaxed font-medium">
          {{ message }}
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="relative z-10 flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          @click="emit('cancel')"
          class="px-5 py-2.5 rounded-xl bg-[#0c0d0e] hover:bg-[#121416] text-slate-300 hover:text-white border border-[#26292d] hover:border-slate-600 text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          {{ cancelText }}
        </button>

        <button
          type="button"
          @click="emit('confirm')"
          :class="[
            'px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95',
            type === 'danger' ? 'bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white shadow-rose-950/60' : '',
            type === 'warning' ? 'bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white shadow-amber-950/60' : '',
            type === 'info' ? 'bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 text-white shadow-cyan-950/60' : ''
          ]"
        >
          {{ confirmText }}
        </button>
      </div>

    </div>
  </div>
</template>
