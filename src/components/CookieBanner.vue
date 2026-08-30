<script setup lang="ts">
import { ref, onMounted } from 'vue';
import IconRenderer from './IconRenderer.vue';

const emit = defineEmits<{
  (e: 'open-terms'): void;
}>();

const STORAGE_KEY = 'cubixguide_cookies_accepted';
const isVisible = ref(false);

onMounted(() => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    // Small delay so it doesn't pop instantly on load
    setTimeout(() => { isVisible.value = true; }, 800);
  }
});

const accept = () => {
  localStorage.setItem(STORAGE_KEY, 'true');
  isVisible.value = false;
};

const decline = () => {
  // Still hide the banner but don't store - will show again next visit
  isVisible.value = false;
};
</script>

<template>
  <Transition name="cookie-slide">
    <div
      v-if="isVisible"
      class="fixed bottom-5 left-1/2 -translate-x-1/2 z-[998] w-full max-w-2xl px-4"
    >
      <div class="bg-[#16181a]/95 backdrop-blur-md border border-[#26292d] rounded-2xl shadow-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <!-- Icon -->
        <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
          <IconRenderer name="Cookie" size="18" />
        </div>

        <!-- Text -->
        <div class="flex-1 space-y-0.5">
          <p class="text-xs font-bold text-white">Этот сайт использует куки (cookies)</p>
          <p class="text-[11px] text-dark-muted leading-relaxed">
            Мы сохраняем данные сессии и предпочтения в localStorage для корректной работы сайта. Никакие данные не передаются третьим лицам.
            <button
              type="button"
              @click="emit('open-terms')"
              class="text-emerald-400 hover:underline ml-1"
            >Подробнее в соглашении →</button>
          </p>
        </div>

        <!-- Buttons -->
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            @click="decline"
            class="px-3 py-1.5 rounded-xl border border-[#26292d] text-dark-muted hover:text-white text-[11px] font-semibold transition-all hover:bg-[#1c1f22]"
          >
            Отклонить
          </button>
          <button
            type="button"
            @click="accept"
            class="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-1.5"
          >
            <IconRenderer name="Check" size="13" />
            Принять
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.cookie-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.cookie-slide-leave-active {
  transition: all 0.25s ease-in;
}
.cookie-slide-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(24px);
}
.cookie-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(24px);
}
</style>
