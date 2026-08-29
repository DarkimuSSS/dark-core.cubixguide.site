<script setup lang="ts">
import { ref } from 'vue';
import IconRenderer from './IconRenderer.vue';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'authenticate', username: string): void;
}>();

const tabMode = ref<'login' | 'register'>('login');
const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  errorMessage.value = '';
  if (!username.value.trim() || !password.value.trim()) {
    errorMessage.value = 'Заполните никнейм и пароль';
    return;
  }

  try {
    isLoading.value = true;
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value.trim(),
        password: password.value.trim()
      })
    });

    const data = await res.json();
    if (res.ok && data.username) {
      emit('authenticate', data.username);
      username.value = '';
      password.value = '';
    } else {
      errorMessage.value = data.error || 'Ошибка входа';
    }
  } catch (err) {
    errorMessage.value = 'Ошибка соединения с сервером';
  } finally {
    isLoading.value = false;
  }
};

const handleRegister = async () => {
  errorMessage.value = '';
  if (!username.value.trim() || !password.value.trim()) {
    errorMessage.value = 'Заполните все поля';
    return;
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Пароли не совпадают';
    return;
  }

  try {
    isLoading.value = true;
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value.trim(),
        password: password.value.trim()
      })
    });

    const data = await res.json();
    if (res.ok && data.username) {
      emit('authenticate', data.username);
      username.value = '';
      password.value = '';
      confirmPassword.value = '';
    } else {
      errorMessage.value = data.error || 'Ошибка регистрации';
    }
  } catch (err) {
    errorMessage.value = 'Ошибка соединения с сервером';
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
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center text-white font-bold shadow-md">
            <IconRenderer name="Lock" size="18" />
          </div>
          <div>
            <h3 class="text-base font-extrabold text-white">Авторизация Авторов</h3>
            <p class="text-[11px] text-dark-muted">Войдите или зарегистрируйтесь вручную</p>
          </div>
        </div>

        <button @click="emit('close')" class="text-dark-muted hover:text-white p-1.5 rounded-lg bg-[#0c0d0e] border border-[#26292d]">
          <IconRenderer name="X" size="16" />
        </button>
      </div>

      <!-- Mode Switcher Tabs -->
      <div class="flex items-center bg-[#0c0d0e] p-1 rounded-xl border border-[#26292d]">
        <button
          type="button"
          @click="tabMode = 'login'; errorMessage = '';"
          :class="[
            'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
            tabMode === 'login' ? 'bg-emerald-600 text-white shadow-md' : 'text-dark-muted hover:text-white'
          ]"
        >
          Вход
        </button>
        <button
          type="button"
          @click="tabMode = 'register'; errorMessage = '';"
          :class="[
            'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
            tabMode === 'register' ? 'bg-emerald-600 text-white shadow-md' : 'text-dark-muted hover:text-white'
          ]"
        >
          Ручная Регистрация
        </button>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
        <IconRenderer name="AlertTriangle" size="16" class="text-rose-400 flex-shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- LOGIN FORM -->
      <form v-if="tabMode === 'login'" @submit.prevent="handleLogin" class="space-y-4">
        <div class="space-y-1.5">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-dark-muted">Никнейм автора</label>
          <input
            type="text"
            v-model="username"
            placeholder="Введите ваш никнейм..."
            required
            class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-emerald-accent text-white text-sm rounded-xl px-4 py-3 focus:outline-none transition-all"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-dark-muted">Пароль</label>
          <input
            type="password"
            v-model="password"
            placeholder="Ваш пароль..."
            required
            class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-emerald-accent text-white text-sm rounded-xl px-4 py-3 focus:outline-none transition-all"
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <span v-if="isLoading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>Войти в аккаунт</span>
        </button>
      </form>

      <!-- MANUAL REGISTER FORM -->
      <form v-else @submit.prevent="handleRegister" class="space-y-4">
        <div class="space-y-1.5">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-dark-muted">Ваш Никнейм</label>
          <input
            type="text"
            v-model="username"
            placeholder="Придумайте никнейм (например: DarkimuSSS)..."
            required
            class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-emerald-accent text-white text-sm rounded-xl px-4 py-3 focus:outline-none transition-all"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-dark-muted">Пароль</label>
          <input
            type="password"
            v-model="password"
            placeholder="Придумайте надежный пароль..."
            required
            class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-emerald-accent text-white text-sm rounded-xl px-4 py-3 focus:outline-none transition-all"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-dark-muted">Повторите Пароль</label>
          <input
            type="password"
            v-model="confirmPassword"
            placeholder="Подтвердите ваш пароль..."
            required
            class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-emerald-accent text-white text-sm rounded-xl px-4 py-3 focus:outline-none transition-all"
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <span v-if="isLoading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>Зарегистрировать аккаунт</span>
        </button>
      </form>
    </div>
  </div>
</template>
