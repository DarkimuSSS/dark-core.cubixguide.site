<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import IconRenderer from './IconRenderer.vue';
import type { AuthorProfile, Guide } from '../types/guide';

const props = defineProps<{
  isOpen: boolean;
  username: string;
  isOwnProfile: boolean;
  isAdmin: boolean;
  allGuides: Guide[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select-guide', guideId: string): void;
}>();

const isEditing = ref(false);
const isLoading = ref(false);

// Change Password State
const isChangePasswordOpen = ref(false);
const oldPassword = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');
const showOldPassword = ref(false);
const showNewPassword = ref(false);
const pwdMessage = ref('');
const pwdIsSuccess = ref(false);

// Admin Author Creation State
const isAdminPanelOpen = ref(false);
const newAuthorUsername = ref('');
const newAuthorPassword = ref('');
const showNewAuthorPassword = ref(false);
const adminMessage = ref('');
const registeredAuthorsList = ref<any[]>([]);

const profile = ref<AuthorProfile>({
  username: props.username,
  avatarUrl: '',
  bio: '',
  server: 'MagicRPG',
  socialVk: '',
  socialTg: '',
  socialDs: '',
  badges: [],
  pinnedGuideId: ''
});

const newBadgeInput = ref('');

const fetchProfile = async () => {
  if (!props.username) return;
  try {
    isLoading.value = true;
    const res = await fetch(`/api/profiles/${encodeURIComponent(props.username)}`);
    if (res.ok) {
      profile.value = await res.json();
    }
  } catch (err) {
    console.error('Error fetching profile:', err);
  } finally {
    isLoading.value = false;
  }
};

const fetchAdminAuthorsList = async () => {
  if (!props.isAdmin) return;
  try {
    const res = await fetch('/api/admin/authors');
    if (res.ok) {
      registeredAuthorsList.value = await res.json();
    }
  } catch (e) {}
};

watch(() => props.username, (newVal) => {
  if (newVal) {
    fetchProfile();
    if (props.isAdmin) fetchAdminAuthorsList();
  }
}, { immediate: true });

const authorGuides = computed(() => {
  return props.allGuides.filter(g => g.meta.author.toLowerCase() === props.username.toLowerCase());
});

const pinnedGuide = computed(() => {
  if (!profile.value.pinnedGuideId) return null;
  return props.allGuides.find(g => g.meta.id === profile.value.pinnedGuideId);
});

const saveProfile = async () => {
  try {
    isLoading.value = true;
    const res = await fetch(`/api/profiles/${encodeURIComponent(props.username)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile.value)
    });
    if (res.ok) {
      profile.value = await res.json();
      isEditing.value = false;
    }
  } catch (err) {
    console.error('Error saving profile:', err);
  } finally {
    isLoading.value = false;
  }
};

const handleChangePassword = async () => {
  pwdMessage.value = '';
  pwdIsSuccess.value = false;

  if (!oldPassword.value || !newPassword.value) {
    pwdMessage.value = 'Заполните старый и новый пароли';
    return;
  }
  if (newPassword.value !== confirmNewPassword.value) {
    pwdMessage.value = 'Новые пароли не совпадают';
    return;
  }

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: props.username,
        oldPassword: oldPassword.value,
        newPassword: newPassword.value
      })
    });
    const data = await res.json();
    if (res.ok) {
      pwdIsSuccess.value = true;
      pwdMessage.value = data.message || 'Пароль успешно изменен!';
      oldPassword.value = '';
      newPassword.value = '';
      confirmNewPassword.value = '';
      setTimeout(() => {
        isChangePasswordOpen.value = false;
        pwdMessage.value = '';
      }, 2000);
    } else {
      pwdMessage.value = data.error || 'Ошибка смены пароля';
    }
  } catch (err) {
    pwdMessage.value = 'Ошибка соединения с сервером';
  }
};

const handleAdminRegisterAuthor = async () => {
  adminMessage.value = '';
  if (!newAuthorUsername.value.trim() || !newAuthorPassword.value.trim()) {
    adminMessage.value = 'Заполните никнейм и пароль для нового автора';
    return;
  }

  try {
    const res = await fetch('/api/admin/register-author', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: newAuthorUsername.value.trim(),
        password: newAuthorPassword.value.trim(),
        adminUsername: props.username
      })
    });
    const data = await res.json();
    if (res.ok) {
      adminMessage.value = `Успешно создан автор: ${data.username}!`;
      newAuthorUsername.value = '';
      newAuthorPassword.value = '';
      fetchAdminAuthorsList();
    } else {
      adminMessage.value = data.error || 'Ошибка создания автора';
    }
  } catch (err) {
    adminMessage.value = 'Ошибка обращения к серверу';
  }
};

const addBadge = () => {
  const val = newBadgeInput.value.trim();
  if (val && !profile.value.badges?.includes(val)) {
    profile.value.badges = [...(profile.value.badges || []), val];
    newBadgeInput.value = '';
  }
};

const removeBadge = (badge: string) => {
  profile.value.badges = profile.value.badges?.filter(b => b !== badge) || [];
};

const handleAvatarFileUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  const file = target.files[0];
  const reader = new FileReader();
  reader.onload = (event) => {
    if (event.target?.result) {
      profile.value.avatarUrl = event.target.result as string;
    }
  };
  reader.readAsDataURL(file);
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
    
    <!-- Outer Relative Card Wrapper for Precise Floating Close Button -->
    <div class="relative w-full max-w-2xl">
      
      <!-- DISTINCT FLOATING CLOSE BUTTON MATCHING SCREENSHOT 2 EXACTLY -->
      <button
        type="button"
        @click="emit('close')"
        class="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 z-50 w-10 h-10 rounded-2xl bg-[#0c0d0e] border-2 border-indigo-500 hover:border-purple-400 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all cursor-pointer"
        title="Закрыть"
      >
        <IconRenderer name="X" size="20" class="stroke-[2.5]" />
      </button>

      <!-- Main Scrollable Modal Card -->
      <div class="bg-[#16181a] border border-[#26292d] w-full rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar relative">

        <!-- Loading State -->
        <div v-if="isLoading" class="py-12 text-center text-dark-muted space-y-2">
          <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div class="text-xs">Загрузка профиля...</div>
        </div>

        <template v-else>
          <!-- PROFILE HEADER BADGE -->
          <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-[#26292d]">
            <!-- Avatar with Glow -->
            <div class="relative flex-shrink-0">
              <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-emerald-600 via-cyan-500 to-purple-600 p-0.5 shadow-2xl shadow-emerald-950/60 overflow-hidden">
                <div class="w-full h-full bg-[#0c0d0e] rounded-[14px] flex items-center justify-center overflow-hidden">
                  <img v-if="profile.avatarUrl" :src="profile.avatarUrl" class="w-full h-full object-cover" />
                  <div v-else class="text-3xl font-black text-emerald-400">
                    {{ profile.username.charAt(0).toUpperCase() }}
                  </div>
                </div>
              </div>

              <!-- Online Dot -->
              <span class="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#16181a] shadow-lg" title="Онлайн"></span>
            </div>

            <!-- Profile Details -->
            <div class="space-y-3 text-center sm:text-left flex-1 min-w-0">
              <div class="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3">
                <div class="min-w-0">
                  <h2 class="text-2xl font-extrabold text-white tracking-tight flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <span>{{ profile.username }}</span>
                    <span v-if="profile.server" class="text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                      🎮 {{ profile.server }}
                    </span>
                  </h2>
                  <p class="text-xs text-dark-muted pt-0.5">Автор {{ authorGuides.length }} опубликованных гайдов</p>
                </div>

                <!-- Action Buttons: Admin, Password, Edit Profile -->
                <div class="flex items-center gap-2 flex-shrink-0">
                  <!-- 1. Admin Panel Button -->
                  <div v-if="isAdmin" class="relative group/tool">
                    <button
                      type="button"
                      @click="isAdminPanelOpen = !isAdminPanelOpen"
                      class="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-all shadow-md"
                    >
                      <IconRenderer name="Shield" size="18" />
                    </button>
                    <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tool:flex items-center z-30 pointer-events-none">
                      <div class="bg-[#0c0d0e] border border-purple-500/40 text-purple-300 text-xs font-semibold px-3 py-1 rounded-xl whitespace-nowrap shadow-2xl">
                        {{ isAdminPanelOpen ? 'Закрыть Админку' : 'Админ Панель' }}
                      </div>
                    </div>
                  </div>

                  <!-- 2. Change Password Button -->
                  <div v-if="isOwnProfile" class="relative group/tool">
                    <button
                      type="button"
                      @click="isChangePasswordOpen = !isChangePasswordOpen; pwdMessage = '';"
                      class="w-10 h-10 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 flex items-center justify-center transition-all shadow-md"
                    >
                      <IconRenderer name="Lock" size="18" />
                    </button>
                    <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tool:flex items-center z-30 pointer-events-none">
                      <div class="bg-[#0c0d0e] border border-cyan-500/40 text-cyan-300 text-xs font-semibold px-3 py-1 rounded-xl whitespace-nowrap shadow-2xl">
                        Сменить пароль
                      </div>
                    </div>
                  </div>

                  <!-- 3. Edit Profile Button -->
                  <div v-if="isOwnProfile && !isEditing" class="relative group/tool">
                    <button
                      type="button"
                      @click="isEditing = true"
                      class="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all shadow-md"
                    >
                      <IconRenderer name="Edit3" size="18" />
                    </button>
                    <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tool:flex items-center z-30 pointer-events-none">
                      <div class="bg-[#0c0d0e] border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-xl whitespace-nowrap shadow-2xl">
                        Редактировать профиль
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Badges List -->
              <div v-if="profile.badges && profile.badges.length > 0" class="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span
                  v-for="badge in profile.badges"
                  :key="badge"
                  class="text-[11px] font-bold bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full shadow-inner"
                >
                  {{ badge }}
                </span>
              </div>

              <!-- Bio Text -->
              <p v-if="profile.bio" class="text-xs text-slate-300 leading-relaxed max-w-lg whitespace-pre-line">
                {{ profile.bio }}
              </p>

              <!-- Social Links -->
              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                <a v-if="profile.socialVk" :href="profile.socialVk" target="_blank" class="px-3 py-1 bg-[#121416] hover:bg-[#212429] border border-[#26292d] text-cyan-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all">
                  <span>ВКонтакте</span>
                </a>
                <a v-if="profile.socialTg" :href="profile.socialTg" target="_blank" class="px-3 py-1 bg-[#121416] hover:bg-[#212429] border border-[#26292d] text-cyan-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all">
                  <span>Telegram</span>
                </a>
                <span v-if="profile.socialDs" class="px-3 py-1 bg-[#121416] border border-[#26292d] text-purple-300 text-xs font-mono rounded-xl">
                  Discord: {{ profile.socialDs }}
                </span>
              </div>
            </div>
          </div>

          <!-- CHANGE PASSWORD FORM (Self Service for Author) -->
          <div v-if="isChangePasswordOpen && isOwnProfile" class="space-y-4 bg-cyan-950/20 border border-cyan-500/40 p-5 rounded-2xl animate-fadeIn">
            <div class="flex items-center justify-between border-b border-cyan-500/30 pb-2">
              <h3 class="text-xs font-extrabold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                <IconRenderer name="Lock" size="16" class="text-cyan-400" />
                Смена собственного пароля
              </h3>
            </div>

            <div v-if="pwdMessage" :class="['p-3 rounded-xl text-xs font-bold flex items-center gap-2', pwdIsSuccess ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40']">
              <span>{{ pwdMessage }}</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] text-cyan-200 font-bold mb-1">Текущий пароль</label>
                <div class="relative">
                  <input
                    :type="showOldPassword ? 'text' : 'password'"
                    v-model="oldPassword"
                    placeholder="Введите текущий..."
                    class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-cyan-400"
                  />
                  <button type="button" @click="showOldPassword = !showOldPassword" class="absolute right-2 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white p-1">
                    <IconRenderer :name="showOldPassword ? 'EyeOff' : 'Eye'" size="14" class="text-cyan-400" />
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-[11px] text-cyan-200 font-bold mb-1">Новый пароль</label>
                <div class="relative">
                  <input
                    :type="showNewPassword ? 'text' : 'password'"
                    v-model="newPassword"
                    placeholder="Новый пароль..."
                    class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-cyan-400"
                  />
                  <button type="button" @click="showNewPassword = !showNewPassword" class="absolute right-2 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white p-1">
                    <IconRenderer :name="showNewPassword ? 'EyeOff' : 'Eye'" size="14" class="text-cyan-400" />
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-[11px] text-cyan-200 font-bold mb-1">Повтор нового пароля</label>
                <input
                  :type="showNewPassword ? 'text' : 'password'"
                  v-model="confirmNewPassword"
                  placeholder="Подтвердите новый..."
                  class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button type="button" @click="isChangePasswordOpen = false" class="px-4 py-2 rounded-xl bg-[#16181a] text-dark-muted hover:text-white text-xs font-bold">
                Отмена
              </button>
              <button type="button" @click="handleChangePassword" class="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg">
                Обновить пароль
              </button>
            </div>
          </div>

          <!-- ADMIN PANEL: MANUAL AUTHOR CREATION (Only for Super Admin) -->
          <div v-if="isAdminPanelOpen && isAdmin" class="space-y-4 bg-purple-950/20 border border-purple-500/40 p-5 rounded-2xl">
            <div class="flex items-center justify-between border-b border-purple-500/30 pb-2">
              <h3 class="text-xs font-extrabold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <IconRenderer name="Shield" size="16" class="text-purple-400" />
                Панель Главного Администратора — Ручное Создание Авторов
              </h3>
            </div>

            <div v-if="adminMessage" class="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-300 text-xs font-bold">
              {{ adminMessage }}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] text-purple-200 font-bold mb-1">Никнейм нового автора</label>
                <input
                  type="text"
                  v-model="newAuthorUsername"
                  placeholder="например: AlexCraft..."
                  class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label class="block text-[11px] text-purple-200 font-bold mb-1">Пароль автора</label>
                <div class="relative">
                  <input
                    :type="showNewAuthorPassword ? 'text' : 'password'"
                    v-model="newAuthorPassword"
                    placeholder="Задайте пароль..."
                    class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl pl-3 pr-9 py-2 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    @click="showNewAuthorPassword = !showNewAuthorPassword"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white p-1"
                  >
                    <IconRenderer :name="showNewAuthorPassword ? 'EyeOff' : 'Eye'" size="14" class="text-cyan-400" />
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              @click="handleAdminRegisterAuthor"
              class="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              + Зарегистрировать Автора Вручную
            </button>

            <!-- List of Registered Authors -->
            <div class="space-y-2 pt-2 border-t border-purple-500/30">
              <div class="text-[11px] font-bold text-purple-300 uppercase">Список всех авторов с доступом:</div>
              <div class="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                <span
                  v-for="a in registeredAuthorsList"
                  :key="a.username"
                  class="px-2.5 py-1 rounded-lg bg-[#0c0d0e] border border-[#26292d] text-xs font-semibold text-white flex items-center gap-1.5"
                >
                  <span>{{ a.username }}</span>
                  <span v-if="a.isAdmin" class="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1 rounded">Админ</span>
                </span>
              </div>
            </div>
          </div>

          <!-- EDITING MODE FORM -->
          <div v-if="isEditing" class="space-y-4 bg-[#0c0d0e] border border-[#26292d] p-5 rounded-2xl">
            <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#26292d] pb-2">
              <IconRenderer name="Sliders" size="14" class="text-emerald-400" />
              Редактирование профиля автора
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-[11px] text-dark-muted mb-1 font-medium">Ссылка на Аватарку (URL)</label>
                <input
                  type="text"
                  v-model="profile.avatarUrl"
                  placeholder="https://example.com/avatar.png..."
                  class="w-full bg-[#16181a] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-accent"
                />
              </div>

              <div>
                <label class="block text-[11px] text-dark-muted mb-1 font-medium">Или Загрузить файл с ПК</label>
                <input
                  type="file"
                  accept="image/*"
                  @change="handleAvatarFileUpload"
                  class="w-full text-xs text-dark-muted file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 cursor-pointer"
                />
              </div>

              <div>
                <label class="block text-[11px] text-dark-muted mb-1 font-medium">Основной Сервер CubixWorld</label>
                <input
                  type="text"
                  v-model="profile.server"
                  placeholder="MagicRPG, HiTech, OneBlock..."
                  class="w-full bg-[#16181a] border border-[#26292d] text-cyan-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-accent"
                />
              </div>

              <div>
                <label class="block text-[11px] text-dark-muted mb-1 font-medium">Прикрепленный Гайд</label>
                <select
                  v-model="profile.pinnedGuideId"
                  class="w-full bg-[#16181a] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-accent"
                >
                  <option value="">(Без прикрепленного гайда)</option>
                  <option v-for="g in authorGuides" :key="g.meta.id" :value="g.meta.id">{{ g.meta.title }}</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-[11px] text-dark-muted mb-1 font-medium">О себе (Био)</label>
              <textarea
                v-model="profile.bio"
                rows="3"
                placeholder="Расскажите игрокам о себе, вашем опыте и модах..."
                class="w-full bg-[#16181a] border border-[#26292d] text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-accent resize-y"
              ></textarea>
            </div>

            <!-- Social Inputs -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-[10px] text-dark-muted mb-1">Ссылка VK</label>
                <input
                  type="text"
                  v-model="profile.socialVk"
                  placeholder="https://vk.com/id..."
                  class="w-full bg-[#16181a] border border-[#26292d] text-xs rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label class="block text-[10px] text-dark-muted mb-1">Ссылка Telegram</label>
                <input
                  type="text"
                  v-model="profile.socialTg"
                  placeholder="https://t.me/..."
                  class="w-full bg-[#16181a] border border-[#26292d] text-xs rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label class="block text-[10px] text-dark-muted mb-1">Discord Никнейм</label>
                <input
                  type="text"
                  v-model="profile.socialDs"
                  placeholder="DarkimuSSS#0001"
                  class="w-full bg-[#16181a] border border-[#26292d] text-xs rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            <!-- Badges Manager -->
            <div class="space-y-2">
              <label class="block text-[11px] text-dark-muted font-medium">Достижения и Статусы</label>
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  v-model="newBadgeInput"
                  placeholder="Новый статус (например: 🐲 Драконовед)..."
                  @keyup.enter="addBadge"
                  class="flex-1 bg-[#16181a] border border-[#26292d] text-xs rounded-xl px-3 py-1.5 text-white"
                />
                <button type="button" @click="addBadge" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl">
                  + Добавить
                </button>
              </div>
              <div class="flex flex-wrap gap-1.5 pt-1">
                <span v-for="b in profile.badges" :key="b" class="text-xs bg-[#16181a] border border-[#26292d] text-emerald-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <span>{{ b }}</span>
                  <button type="button" @click="removeBadge(b)" class="text-rose-400 hover:text-white">&times;</button>
                </span>
              </div>
            </div>

            <!-- Save / Cancel Controls -->
            <div class="flex items-center justify-end gap-2 pt-2 border-t border-[#26292d]">
              <button type="button" @click="isEditing = false" class="px-4 py-2 rounded-xl bg-[#16181a] text-dark-muted hover:text-white text-xs font-bold">
                Отмена
              </button>
              <button type="button" @click="saveProfile" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg">
                Сохранить профиль
              </button>
            </div>
          </div>

          <!-- PINNED GUIDE SECTION -->
          <div v-if="pinnedGuide" class="space-y-3">
            <h3 class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <IconRenderer name="Star" size="14" />
              Прикрепленное руководство автора
            </h3>

            <div
              @click="emit('select-guide', pinnedGuide.meta.id); emit('close');"
              class="group bg-gradient-to-r from-amber-500/10 via-[#121416] to-[#121416] border border-amber-500/30 p-5 rounded-2xl cursor-pointer hover:border-amber-400 transition-all flex items-center justify-between shadow-lg"
            >
              <div class="space-y-1">
                <span class="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  📌 Главный Гайд
                </span>
                <h4 class="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                  {{ pinnedGuide.meta.title }}
                </h4>
                <p class="text-xs text-dark-muted line-clamp-1">
                  {{ pinnedGuide.meta.summary }}
                </p>
              </div>
              <IconRenderer name="ChevronRight" size="20" class="text-amber-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <!-- ALL AUTHOR'S GUIDES LIST -->
          <div class="space-y-4 pt-2">
            <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#26292d] pb-2">
              <IconRenderer name="BookOpen" size="14" class="text-emerald-400" />
              Все гайды автора ({{ authorGuides.length }})
            </h3>

            <div v-if="authorGuides.length === 0" class="text-center py-8 bg-[#0c0d0e] rounded-2xl border border-[#26292d] text-xs text-dark-muted">
              У этого автора пока нет других опубликованных гайдов
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="g in authorGuides"
                :key="g.meta.id"
                @click="emit('select-guide', g.meta.id); emit('close');"
                class="group p-4 bg-[#0c0d0e] hover:bg-[#121416] border border-[#26292d] hover:border-emerald-500/50 rounded-xl cursor-pointer transition-all space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded">
                    {{ g.meta.category }}
                  </span>
                  <span class="text-[10px] text-dark-muted">{{ g.meta.updatedAt }}</span>
                </div>
                <h4 class="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2">
                  {{ g.meta.title }}
                </h4>
              </div>
            </div>
          </div>
        </template>
      </div>

    </div>
  </div>
</template>
