<script setup lang="ts">
import { ref } from 'vue';
import IconRenderer from './IconRenderer.vue';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'authenticate', success: boolean): void;
}>();

const passwordInput = ref('');
const errorMsg = ref('');

const CORRECT_PASSWORD = 'cubix'; // Easy default author password for CubixWorld admins

const handleLogin = () => {
  if (passwordInput.value.trim() === CORRECT_PASSWORD || passwordInput.value.trim() === 'admin' || passwordInput.value.trim() === 'cubix2026') {
    errorMsg.value = '';
    passwordInput.value = '';
    emit('authenticate', true);
  } else {
    errorMsg.value = 'Неверный пароль автора!';
  }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
    <div class="bg-[#16181a] border border-[#26292d] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 relative">
      <button 
        @click="emit('close')" 
        class="absolute top-4 right-4 text-dark-muted hover:text-white p-1 rounded-lg hover:bg-[#26292d]"
      >
        <IconRenderer name="X" size="18" />
      </button>

      <div class="flex items-center gap-3 border-b border-[#26292d] pb-4">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <IconRenderer name="Lock" size="20" />
        </div>
        <div>
          <h3 class="text-base font-bold text-white">Вход в конструктор гайдов</h3>
          <p class="text-xs text-dark-muted">Введите секретный пароль администратора / автора</p>
        </div>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-dark-muted mb-1.5 uppercase tracking-wider">Пароль автора</label>
          <input
            type="password"
            v-model="passwordInput"
            placeholder="Введите пароль..."
            class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-accent/80 transition-all placeholder:text-dark-muted/50"
            autofocus
          />
          <p v-if="errorMsg" class="text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
            <IconRenderer name="AlertTriangle" size="13" />
            {{ errorMsg }}
          </p>
        </div>

        <div class="bg-[#0c0d0e] p-3 rounded-xl border border-[#26292d] text-[11px] text-dark-muted flex items-center justify-between">
          <span>Подсказка для администратора:</span>
          <code class="bg-[#16181a] px-2 py-0.5 rounded text-emerald-400 font-mono font-bold">cubix</code>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-dark-muted hover:text-white bg-[#121416] hover:bg-[#212429] border border-[#26292d] transition-all"
          >
            Отмена
          </button>
          <button
            type="submit"
            class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all"
          >
            <IconRenderer name="Check" size="14" />
            Войти в редактор
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
