<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
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
const inviteSuccessMsg = ref('');
const isLoading = ref(false);
const authMode = ref<'local' | 'cubix'>('local');
const viewState = ref<'login' | 'register'>('login');
const inviteCode = ref('');
const isCubixUnlocked = ref(false);

const handleKeyDown = (e: KeyboardEvent) => {
  // Secret hotkey: Ctrl + Shift + C unlocks CubixWorld Login mode
  if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.key === 'С' || e.key === 'с')) {
    e.preventDefault();
    isCubixUnlocked.value = true;
    authMode.value = 'cubix';
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

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
      if (data.token) {
        localStorage.setItem('cubix_jwt_token', data.token);
      }
      emit('authenticate', {
        username: data.username,
        isAdmin: Boolean(data.isAdmin),
        canEditOthers: Boolean(data.canEditOthers),
        canCreateGuides: Boolean(data.canCreateGuides),
        token: data.token
      });
      username.value = '';
      password.value = '';
      emit('close');
    } else {
      errorMessage.value = data.error || 'Неверный никнейм или пароль';
    }
  } catch (err: any) {
    errorMessage.value = err.message ? err.message : 'Ошибка соединения с бэкендом';
  } finally {
    isLoading.value = false;
  }
};

const handleRegisterInvite = async () => {
  errorMessage.value = '';
  inviteSuccessMsg.value = '';
  if (!inviteCode.value.trim() || !username.value.trim() || !password.value.trim()) {
    errorMessage.value = 'Заполните инвайт-код, никнейм и желаемый пароль';
    return;
  }

  if (password.value.trim().length < 6) {
    errorMessage.value = 'Пароль должен быть длиннее 6 символов';
    return;
  }

  try {
    isLoading.value = true;
    const res = await fetch('/api/auth/register-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: inviteCode.value.trim(),
        username: username.value.trim(),
        password: password.value.trim()
      })
    });

    const data = await res.json();

    if (res.ok && data.user) {
      if (data.token) {
        localStorage.setItem('cubix_jwt_token', data.token);
      }
      inviteSuccessMsg.value = '🎉 Регистрация по инвайту успешна!';
      setTimeout(() => {
        emit('authenticate', {
          username: data.user.username,
          isAdmin: Boolean(data.user.isAdmin),
          canEditOthers: Boolean(data.user.canEditOthers),
          canCreateGuides: Boolean(data.user.canCreateGuides),
          token: data.token
        });
        username.value = '';
        password.value = '';
        inviteCode.value = '';
        emit('close');
      }, 500);
    } else {
      errorMessage.value = data.error || 'Ошибка активации инвайта';
    }
  } catch (err: any) {
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
        <div class="flex items-center gap-2.5">
          <div 
            @dblclick="isCubixUnlocked = true"
            class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-extrabold shadow-lg shadow-emerald-950/50 cursor-pointer select-none"
            title="Двойной клик разблокирует CubixWorld авторизацию"
          >
            <IconRenderer name="Lock" size="20" />
          </div>
          <div>
            <h2 class="text-lg font-extrabold text-white">
              {{ authMode === 'cubix' ? 'Вход CubixWorld' : 'Вход для Авторов' }}
            </h2>
            <p class="text-xs text-dark-muted">
              {{ authMode === 'cubix' ? 'Прямой вход через аккаунт CubixWorld.net' : 'Авторизуйтесь для создания и правки гайдов' }}
            </p>
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

      <!-- Secret Unlocked Mode Switcher Tabs -->
      <div v-if="isCubixUnlocked" class="grid grid-cols-2 gap-1.5 p-1 bg-[#0c0d0e] rounded-2xl border border-emerald-500/30 animate-fadeIn">
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

        <button
          type="button"
          @click="authMode = 'cubix'; errorMessage = ''"
          :class="[
            'py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all',
            authMode === 'cubix' ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md' : 'text-dark-muted hover:text-white'
          ]"
        >
          <IconRenderer name="Globe" size="14" />
          <span>CubixWorld</span>
        </button>
      </div>

      <!-- Success Message -->
      <div v-if="inviteSuccessMsg" class="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
        <IconRenderer name="CheckCircle" size="16" class="text-emerald-400 flex-shrink-0" />
        <span>{{ inviteSuccessMsg }}</span>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
        <IconRenderer name="AlertTriangle" size="16" class="text-rose-400 flex-shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- VIEW 1: Login Form -->
      <form v-if="viewState === 'login'" @submit.prevent="handleLogin" class="space-y-4">
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
          <span>{{ authMode === 'cubix' ? 'Войти через CubixWorld' : 'Войти как Автор' }}</span>
        </button>
      </form>

      <!-- VIEW 2: Invite Registration Form -->
      <form v-else @submit.prevent="handleRegisterInvite" class="space-y-4 animate-fadeIn">
        <div>
          <label class="block text-xs font-bold text-cyan-300 mb-1.5">
            Пригласительный Инвайт-код *
          </label>
          <input
            type="text"
            v-model="inviteCode"
            placeholder="например, DC-INV-8A2F"
            class="w-full bg-[#0c0d0e] border border-cyan-500/50 font-mono text-cyan-300 text-xs font-bold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cyan-400 uppercase tracking-widest"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1.5">
            Ваш игровой Никнейм на CubixWorld *
          </label>
          <input
            type="text"
            v-model="username"
            placeholder="например, DarkimuSSS"
            class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-accent"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1.5">
            Придумайте свой пароль *
          </label>
          <div class="relative">
            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              placeholder="Минимум 6 символов..."
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
          class="w-full py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span v-if="isLoading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>🔑 Активировать Инвайт и Создать Аккаунт</span>
        </button>
      </form>

      <!-- Closed Registration Note & Legal Disclaimer -->
      <div v-if="authMode === 'cubix'" class="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-1.5 text-center text-[10.5px] leading-relaxed shadow-lg animate-fadeIn">
        <p class="text-amber-200 font-medium">
          🔒 <span class="font-bold text-white">Прямая сквозная аутентификация</span>. Ваш пароль зашифрован RSA-ключом и <strong class="text-amber-400">не сохраняется</strong> на нашем сайте.
        </p>
      </div>
      <div v-else-if="viewState === 'login'" class="bg-[#111315] border border-[#26292d] rounded-2xl p-3.5 space-y-1.5 text-center text-[10.5px] leading-relaxed shadow-lg">
        <p class="text-slate-300 font-medium">
          Есть пригласительный инвайт-код?
        </p>
        <button
          type="button"
          @click="viewState = 'register'; errorMessage = ''; inviteSuccessMsg = ''"
          class="text-xs text-cyan-400 font-extrabold hover:underline cursor-pointer"
        >
          🔑 Активировать инвайт и зарегистрироваться
        </button>
      </div>
      <div v-else class="bg-[#111315] border border-[#26292d] rounded-2xl p-3.5 text-center text-[10.5px] leading-relaxed shadow-lg">
        <button
          type="button"
          @click="viewState = 'login'; errorMessage = ''; inviteSuccessMsg = ''"
          class="text-xs text-slate-400 font-bold hover:text-white cursor-pointer"
        >
          ← Вернуться к обычному входу
        </button>
      </div>
    </div>
  </div>
</template>
