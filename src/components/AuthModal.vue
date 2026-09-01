<script setup lang="ts">
import { ref } from 'vue';
import IconRenderer from './IconRenderer.vue';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'authenticate', payload: { username: string; isAdmin: boolean; canEditOthers?: boolean; canCreateGuides?: boolean }): void;
}>();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const errorMessage = ref('');
const isLoading = ref(false);
const authMode = ref<'cubix' | 'local'>('cubix'); // Default to CubixWorld TCP Login

const handleLogin = async () => {
  errorMessage.value = '';
  if (!username.value.trim() || !password.value.trim()) {
    errorMessage.value = 'Заполните никнейм и пароль';
    return;
  }

  try {
    isLoading.value = true;
    const endpoint = authMode.value === 'cubix' ? '/api/auth/cubix-login' : '/api/auth/login';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value.trim(),
        password: password.value.trim()
      })
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Сервер вернул ошибку (${res.status}): ${text.substring(0, 100)}`);
    }

    if (res.ok && data.username) {
      emit('authenticate', {
        username: data.username,
        isAdmin: Boolean(data.isAdmin),
        canEditOthers: Boolean(data.canEditOthers),
        canCreateGuides: Boolean(data.canCreateGuides)
      });
      username.value = '';
      password.value = '';
    } else {
      errorMessage.value = data.error || 'Неверный никнейм или пароль';
    }
  } catch (err: any) {
    errorMessage.value = err.message ? err.message : 'Ошибка соединения с бэкендом';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
    <div class="bg-[#16181a] border border-[#26292d] w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative">
      
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-[#26292d] pb-4">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-extrabold shadow-lg shadow-emerald-950/50">
            <IconRenderer name="Lock" size="20" />
          </div>
          <div>
            <h2 class="text-lg font-extrabold text-white">Вход для Авторов</h2>
            <p class="text-xs text-dark-muted">Авторизуйтесь для создания и правки гайдов</p>
          </div>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="text-dark-muted hover:text-white p-1 rounded-xl hover:bg-[#212429] transition-all"
        >
          <IconRenderer name="X" size="20" />
        </button>
      </div>

      <!-- Mode Switcher Tabs -->
      <div class="grid grid-cols-2 gap-1.5 p-1 bg-[#0c0d0e] rounded-2xl border border-[#26292d]">
        <button
          type="button"
          @click="authMode = 'cubix'; errorMessage = ''"
          :class="[
            'py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all',
            authMode === 'cubix' ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md' : 'text-dark-muted hover:text-white'
          ]"
        >
          <IconRenderer name="Globe" size="14" />
          <span>CubixWorld TCP</span>
        </button>

        <button
          type="button"
          @click="authMode = 'local'; errorMessage = ''"
          :class="[
            'py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all',
            authMode === 'local' ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md' : 'text-dark-muted hover:text-white'
          ]"
        >
          <IconRenderer name="Shield" size="14" />
          <span>Вход Авторов</span>
        </button>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
        <IconRenderer name="AlertTriangle" size="16" class="text-rose-400 flex-shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1.5">
            {{ authMode === 'cubix' ? 'Игровой никнейм CubixWorld' : 'Никнейм автора' }}
          </label>
          <input
            type="text"
            v-model="username"
            :placeholder="authMode === 'cubix' ? 'Никнейм в лаунчере...' : 'Ваш никнейм...'"
            class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-accent"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1.5">
            {{ authMode === 'cubix' ? 'Пароль от аккаунта CubixWorld' : 'Пароль' }}
          </label>
          <div class="relative">
            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              :placeholder="authMode === 'cubix' ? 'Пароль CubixWorld...' : 'Введите пароль...'"
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl pl-3.5 pr-10 py-2.5 focus:outline-none focus:border-emerald-accent"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white p-1"
            >
              <IconRenderer :name="showPassword ? 'EyeOff' : 'Eye'" size="16" class="text-cyan-400" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2"
        >
          <span v-if="isLoading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>Войти в Аккаунт</span>
        </button>
      </form>

      <!-- Closed Registration Note -->
      <div class="text-center text-[11px] text-dark-muted pt-2 border-t border-[#26292d]">
        🔒 Регистрация авторов осуществляется только по запросу через Главного Администратора (<span class="text-emerald-400 font-bold">DarkimuSSS</span>).
      </div>
    </div>
  </div>
</template>
