<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import IconRenderer from './IconRenderer.vue';
import ConfirmModal from './ConfirmModal.vue';
import { SYSTEM_PERMISSIONS, DEFAULT_SYSTEM_ROLES, hasPermission, canManageTargetRole, getRolePriority } from '../data/roles';
import type { UserRole, UserPermission } from '../types/guide';

const props = defineProps<{
  isAdmin: boolean;
  currentUsername: string;
  currentRole?: UserRole;
}>();

const emit = defineEmits<{
  (e: 'go-home'): void;
}>();

const registeredAuthorsList = ref<any[]>([]);
const authorAvatarsMap = ref<Record<string, string>>({});
const isLoading = ref(false);
const adminMessage = ref('');
const searchQuery = ref('');
const editingCustomPermsAuthor = ref<string | null>(null);
const editingAssignedServersAuthor = ref<string | null>(null);

const availableServersList = ref<string[]>([
  "OneBlock", "IceAndFire_1165", "Create_1211", "MagicRPG", "Galaxy", 
  "OneBlock-Mobile", "Pixelmon_1211", "HiTech", "TechnoMagic", "UltraSky", 
  "HiTech-Mobile", "Cobblemon_1211", "TechnoMagic-Mobile", "OceanBlock_1165", 
  "Industrial", "GregTech", "Pixelmon_1165", "Pixelmon", "TechnomagicTest", 
  "SkyTech", "MagicalTech"
]);

// Registration State
const newAuthorUsername = ref('');
const newAuthorPassword = ref('');
const showNewAuthorPassword = ref(false);

// Deletion State
const isDeleteConfirmOpen = ref(false);
const authorToDelete = ref<string | null>(null);

// Reset Password State
const resetTargetUsername = ref<string | null>(null);
const resetNewPassword = ref('');
const showResetPasswordToggle = ref(false);

// Moderation Queue State
const pendingGuidesList = ref<any[]>([]);
const isModerationLoading = ref(false);

const fetchPendingGuides = async () => {
  isModerationLoading.value = true;
  try {
    const res = await fetch('/api/guides');
    if (res.ok) {
      const all = await res.json();
      pendingGuidesList.value = all.filter((g: any) => g.meta.status === 'pending_moderation');
    }
  } catch (e) {
    console.error('Ошибка загрузки гайдов на модерации:', e);
  } finally {
    isModerationLoading.value = false;
  }
};

const handleApproveGuide = async (guide: any) => {
  adminMessage.value = '';
  const updated = {
    ...guide,
    meta: {
      ...guide.meta,
      published: true,
      isVisible: true,
      status: 'approved'
    }
  };

  try {
    const res = await fetch(`/api/guides/${guide.meta.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-author-username': props.currentUsername
      },
      body: JSON.stringify(updated)
    });

    if (res.ok) {
      adminMessage.value = `Гайд "${guide.meta.title}" успешно ОДОБРЕН и ОПУБЛИКОВАН! 🚀`;
      fetchPendingGuides();
    } else {
      adminMessage.value = 'Ошибка модерации гайда';
    }
  } catch (e) {
    adminMessage.value = 'Ошибка соединения с сервером';
  }
};

const handleRejectGuide = async (guide: any) => {
  adminMessage.value = '';
  const updated = {
    ...guide,
    meta: {
      ...guide.meta,
      published: false,
      isVisible: false,
      status: 'rejected'
    }
  };

  try {
    const res = await fetch(`/api/guides/${guide.meta.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-author-username': props.currentUsername
      },
      body: JSON.stringify(updated)
    });

    if (res.ok) {
      adminMessage.value = `Гайд "${guide.meta.title}" отправлен на доработку автору! ❌`;
      fetchPendingGuides();
    } else {
      adminMessage.value = 'Ошибка отклонения гайда';
    }
  } catch (e) {
    adminMessage.value = 'Ошибка соединения с сервером';
  }
};

const fetchAdminAuthorsList = async () => {
  if (!props.isAdmin) return;
  isLoading.value = true;
  adminMessage.value = '';
  try {
    const res = await fetch('/api/admin/authors');
    if (res.ok) {
      const list = await res.json();
      registeredAuthorsList.value = list;

      for (const a of list) {
        try {
          const pres = await fetch(`/api/profiles/${encodeURIComponent(a.username)}`);
          if (pres.ok) {
            const p = await pres.json();
            if (p.avatarUrl) {
              authorAvatarsMap.value[a.username.toLowerCase()] = p.avatarUrl;
            }
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error('Ошибка загрузки списка авторов:', e);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchAdminAuthorsList();
  fetchPendingGuides();
});

const filteredAuthors = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return registeredAuthorsList.value;
  return registeredAuthorsList.value.filter(a =>
    a.username.toLowerCase().includes(q)
  );
});

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
        adminUsername: props.currentUsername
      })
    });
    const data = await res.json();
    if (res.ok) {
      adminMessage.value = `Успешно зарегистрирован новый автор: ${data.username}!`;
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

const handleToggleAuthorPermission = async (author: any, permType: 'editOthers' | 'createGuides' | 'verification') => {
  adminMessage.value = '';
  const newEditOthers = permType === 'editOthers' ? !author.canEditOthers : author.canEditOthers;
  const newCreateGuides = permType === 'createGuides' ? !author.canCreateGuides : author.canCreateGuides;
  const newIsVerified = permType === 'verification' ? !author.isVerified : author.isVerified;

  try {
    const res = await fetch('/api/admin/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUsername: author.username,
        canEditOthers: newEditOthers,
        canCreateGuides: newCreateGuides,
        isVerified: newIsVerified,
        adminUsername: props.currentUsername
      })
    });
    const data = await res.json();
    if (res.ok) {
      adminMessage.value = data.message || 'Права и верификация автора обновлены!';
      fetchAdminAuthorsList();
    } else {
      adminMessage.value = data.error || 'Ошибка обновления прав';
    }
  } catch (err) {
    adminMessage.value = 'Ошибка соединения с сервером';
  }
};

const handleAdminResetAuthorPassword = async (targetUser: string) => {
  adminMessage.value = '';
  if (!resetNewPassword.value.trim()) {
    adminMessage.value = 'Укажите новый пароль';
    return;
  }

  try {
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUsername: targetUser,
        newPassword: resetNewPassword.value.trim(),
        adminUsername: props.currentUsername
      })
    });
    const data = await res.json();
    if (res.ok) {
      adminMessage.value = data.message || `Пароль для ${targetUser} сброшен!`;
      resetTargetUsername.value = null;
      resetNewPassword.value = '';
    } else {
      adminMessage.value = data.error || 'Ошибка сброса пароля';
    }
  } catch (err) {
    adminMessage.value = 'Ошибка обращения к серверу';
  }
};

const promptDeleteAuthor = (targetUser: string) => {
  authorToDelete.value = targetUser;
  isDeleteConfirmOpen.value = true;
};

const confirmDeleteAuthor = async () => {
  if (!authorToDelete.value) return;
  const targetUser = authorToDelete.value;
  isDeleteConfirmOpen.value = false;
  authorToDelete.value = null;
  adminMessage.value = '';

  try {
    const res = await fetch(`/api/admin/authors/${encodeURIComponent(targetUser)}?adminUsername=${encodeURIComponent(props.currentUsername)}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (res.ok) {
      adminMessage.value = data.message || `Автор ${targetUser} удален!`;
      fetchAdminAuthorsList();
    } else {
      adminMessage.value = data.error || 'Ошибка удаления автора';
    }
  } catch (err) {
    adminMessage.value = 'Ошибка соединения с сервером';
  }
};

const handleAdminChangeUserRole = async (author: any, role: UserRole) => {
  adminMessage.value = '';
  try {
    const res = await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUsername: author.username,
        role: role,
        customPermissions: author.customPermissions || null,
        adminUsername: props.currentUsername
      })
    });
    const data = await res.json();
    if (res.ok) {
      adminMessage.value = data.message || `Роль автора ${author.username} изменена на ${role}!`;
      fetchAdminAuthorsList();
    } else {
      adminMessage.value = data.error || 'Ошибка смены роли';
    }
  } catch (err) {
    adminMessage.value = 'Ошибка соединения с сервером';
  }
};

const handleAdminToggleGranularPermission = async (author: any, permissionKey: UserPermission) => {
  adminMessage.value = '';
  const currentRole = (author.role as UserRole) || 'author';
  const roleDefaults = DEFAULT_SYSTEM_ROLES[currentRole]?.permissions || [];
  
  let currentCustom: UserPermission[] = Array.isArray(author.customPermissions) && author.customPermissions.length > 0
    ? [...author.customPermissions]
    : [...roleDefaults];

  if (currentCustom.includes(permissionKey)) {
    currentCustom = currentCustom.filter(p => p !== permissionKey);
  } else {
    currentCustom.push(permissionKey);
  }

  try {
    const res = await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUsername: author.username,
        role: currentRole,
        customPermissions: currentCustom,
        adminUsername: props.currentUsername
      })
    });
    const data = await res.json();
    if (res.ok) {
      adminMessage.value = `Индивидуальное право "${permissionKey}" обновлено для ${author.username}`;
      fetchAdminAuthorsList();
    } else {
      adminMessage.value = data.error || 'Ошибка изменения прав';
    }
  } catch (err) {
    adminMessage.value = 'Ошибка соединения с сервером';
  }
};

const handleAdminToggleAssignedServer = async (author: any, serverName: string) => {
  adminMessage.value = '';
  const currentRole = (author.role as UserRole) || 'author';
  let currentServers: string[] = Array.isArray(author.assignedServers) ? [...author.assignedServers] : [];

  if (currentServers.includes(serverName)) {
    currentServers = currentServers.filter(s => s !== serverName);
  } else {
    currentServers.push(serverName);
  }

  try {
    const res = await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUsername: author.username,
        role: currentRole,
        customPermissions: author.customPermissions || null,
        assignedServers: currentServers,
        adminUsername: props.currentUsername
      })
    });
    const data = await res.json();
    if (res.ok) {
      adminMessage.value = `Список привязанных серверов для ${author.username} обновлён!`;
      fetchAdminAuthorsList();
    } else {
      adminMessage.value = data.error || 'Ошибка обновления привязки серверов';
    }
  } catch (err) {
    adminMessage.value = 'Ошибка соединения с сервером';
  }
};

const isAuthorHasPermission = (author: any, perm: UserPermission): boolean => {
  return hasPermission(author.role || 'author', author.customPermissions, perm);
};
</script>

<template>
  <div class="space-y-6 pb-24 animate-in fade-in duration-300">
    <!-- Header Title Bar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#26292d] pb-5">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-md">
            <IconRenderer name="Users" size="24" />
          </div>
          <div>
            <h1 class="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Панель Управления Авторами</span>
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">ADMIN PANEL</span>
            </h1>
            <p class="text-xs text-dark-muted">Управление учетными записями авторов, верификацией, доступом к созданию гайдов и паролями</p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="fetchAdminAuthorsList"
          :disabled="isLoading"
          class="px-3.5 py-2 rounded-xl bg-[#16181a] hover:bg-[#202327] border border-[#26292d] text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
        >
          <IconRenderer name="RotateCw" size="14" :class="['text-cyan-400', isLoading ? 'animate-spin' : '']" />
          <span>Обновить список</span>
        </button>

        <button
          @click="emit('go-home')"
          class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <span>На Главную</span>
        </button>
      </div>
    </div>

    <!-- Alert / Status Notification Message -->
    <div v-if="adminMessage" class="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/50 text-cyan-200 text-xs font-semibold flex items-center justify-between shadow-lg">
      <div class="flex items-center gap-2">
        <IconRenderer name="Info" size="16" class="text-cyan-400 shrink-0" />
        <span>{{ adminMessage }}</span>
      </div>
      <button @click="adminMessage = ''" class="text-slate-400 hover:text-white">
        <IconRenderer name="X" size="14" />
      </button>
    </div>

    <!-- MODERATION QUEUE CARD (If any pending guides) -->
    <div v-if="pendingGuidesList.length > 0" class="p-6 rounded-3xl bg-amber-950/20 border border-amber-500/40 shadow-xl space-y-4">
      <div class="flex items-center justify-between border-b border-amber-500/30 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <IconRenderer name="Clock" size="18" />
          </div>
          <div>
            <h3 class="text-base font-black text-white flex items-center gap-2">
              <span>Очередь Модерации Гайдов</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black font-extrabold">{{ pendingGuidesList.length }}</span>
            </h3>
            <p class="text-xs text-amber-200/70">Статьи авторов, ожидающие вашей проверки перед публикацией</p>
          </div>
        </div>

        <button @click="fetchPendingGuides" class="text-xs text-amber-300 hover:underline flex items-center gap-1">
          <IconRenderer name="RotateCw" size="12" :class="isModerationLoading ? 'animate-spin' : ''" />
          <span>Обновить</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div v-for="guide in pendingGuidesList" :key="guide.meta.id" class="p-4 rounded-2xl bg-[#0c0d0e] border border-amber-500/30 space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h4 class="text-sm font-bold text-white line-clamp-1">{{ guide.meta.title || '(Без названия)' }}</h4>
              <div class="text-[11px] text-amber-300 flex items-center gap-2 mt-0.5">
                <span>Автор: <strong>{{ guide.meta.author }}</strong></span>
                <span>•</span>
                <span>Сервер: {{ guide.meta.server || 'Все' }}</span>
              </div>
            </div>
            <span class="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
              На модерации
            </span>
          </div>

          <p class="text-xs text-dark-muted line-clamp-2">{{ guide.meta.summary || 'Описание отсутствует' }}</p>

          <div class="flex items-center justify-between pt-2 border-t border-[#1c1f22]">
            <span class="text-[10px] text-dark-muted">Обновлен: {{ guide.meta.updatedAt }}</span>
            
            <div class="flex items-center gap-2">
              <button
                @click="handleRejectGuide(guide)"
                class="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <IconRenderer name="X" size="13" />
                <span>Отклонить</span>
              </button>
              
              <button
                @click="handleApproveGuide(guide)"
                class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-all cursor-pointer shadow-md flex items-center gap-1"
              >
                <IconRenderer name="Check" size="14" />
                <span>Опубликовать</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Grid: Registration Form (Left) & Author List (Right) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      
      <!-- Left: Create New Author Account Card -->
      <div class="lg:col-span-1 p-6 rounded-3xl bg-[#16181a] border border-[#26292d] shadow-xl space-y-4">
        <div class="flex items-center gap-2.5 border-b border-[#26292d] pb-3">
          <IconRenderer name="UserPlus" size="18" class="text-emerald-400" />
          <h3 class="text-sm font-extrabold text-white">Регистрация Нового Автора</h3>
        </div>

        <p class="text-xs text-dark-muted leading-relaxed">
          Создайте аккаунт автора для публикации вики-руководств. Новые авторы смогут входить по указанному нику и паролю.
        </p>

        <form @submit.prevent="handleAdminRegisterAuthor" class="space-y-3.5 pt-1">
          <div class="space-y-1">
            <label class="text-[11px] font-bold text-slate-300">Никнейм автора (Cubix/Локальный):</label>
            <div class="relative">
              <input
                type="text"
                v-model="newAuthorUsername"
                placeholder="Игровой никнейм..."
                class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-emerald-500/70 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none transition-all"
              />
              <IconRenderer name="User" size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[11px] font-bold text-slate-300">Начальный пароль:</label>
            <div class="relative">
              <input
                :type="showNewAuthorPassword ? 'text' : 'password'"
                v-model="newAuthorPassword"
                placeholder="Пароль пользователя..."
                class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-emerald-500/70 text-white text-xs rounded-xl pl-9 pr-9 py-2.5 focus:outline-none transition-all"
              />
              <IconRenderer name="Lock" size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
              <button
                type="button"
                @click="showNewAuthorPassword = !showNewAuthorPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white"
              >
                <IconRenderer :name="showNewAuthorPassword ? 'EyeOff' : 'Eye'" size="14" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <IconRenderer name="UserPlus" size="16" />
            <span>Зарегистрировать Автора</span>
          </button>
        </form>
      </div>

      <!-- Right: Registered Authors Management Table -->
      <div class="lg:col-span-2 p-6 rounded-3xl bg-[#16181a] border border-[#26292d] shadow-xl space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#26292d] pb-3">
          <div class="flex items-center gap-2.5">
            <IconRenderer name="Users" size="18" class="text-cyan-400" />
            <h3 class="text-sm font-extrabold text-white">Список Авторов & Права доступа ({{ registeredAuthorsList.length }})</h3>
          </div>

          <!-- Search Input -->
          <div class="relative w-full sm:w-56">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Поиск по никнейму..."
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-[11px] rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-cyan-500/60"
            />
            <IconRenderer name="Search" size="13" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-muted" />
          </div>
        </div>

        <div v-if="isLoading" class="py-12 text-center text-dark-muted text-xs space-y-2">
          <div class="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div>Загрузка авторов...</div>
        </div>

        <div v-else-if="filteredAuthors.length === 0" class="py-12 text-center text-dark-muted text-xs">
          Авторов по данному запросу не найдено
        </div>

        <!-- Authors Grid / List Cards -->
        <div v-else class="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
          <div
            v-for="author in filteredAuthors"
            :key="author.username"
            class="p-4 rounded-2xl bg-[#0c0d0e] border border-[#26292d] hover:border-[#3b3f46] transition-all space-y-3"
          >
            <!-- Author Main Row Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1c1f22]">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-cyan-500 to-purple-600 p-0.5 shadow-md shrink-0">
                  <div class="w-full h-full bg-[#0c0d0e] rounded-[10px] flex items-center justify-center overflow-hidden">
                    <img v-if="authorAvatarsMap[author.username.toLowerCase()]" :src="authorAvatarsMap[author.username.toLowerCase()]" class="w-full h-full object-cover" />
                    <span v-else class="text-xs font-black text-emerald-400">{{ author.username.charAt(0).toUpperCase() }}</span>
                  </div>
                </div>

                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-extrabold text-white">{{ author.username }}</span>
                    
                    <!-- ROLE BADGE -->
                    <span :class="['px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border shadow-sm', DEFAULT_SYSTEM_ROLES[author.role as UserRole || 'author']?.badgeColor || 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40']">
                      {{ DEFAULT_SYSTEM_ROLES[author.role as UserRole || 'author']?.name || author.role }}
                    </span>

                    <span v-if="author.isVerified" class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-extrabold uppercase flex items-center gap-1">
                      <IconRenderer name="Check" size="10" />
                      <span>Verified</span>
                    </span>
                  </div>
                  <div class="text-[10px] text-dark-muted">Создан: {{ author.createdAt || 'Ранее' }}</div>
                </div>
              </div>

              <!-- Quick Password Reset / Delete Actions -->
              <div v-if="canManageTargetRole(props.currentRole || (props.isAdmin ? 'super_admin' : 'guest'), author.role || 'author')" class="flex items-center gap-2 self-end sm:self-center">
                <button
                  @click="resetTargetUsername = (resetTargetUsername === author.username ? null : author.username); resetNewPassword = '';"
                  class="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Сбросить пароль автора"
                >
                  <IconRenderer name="Key" size="12" />
                  <span>Пароль</span>
                </button>

                <button
                  v-if="author.username.toLowerCase() !== currentUsername.toLowerCase()"
                  @click="promptDeleteAuthor(author.username)"
                  class="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Удалить автора"
                >
                  <IconRenderer name="Trash2" size="12" />
                  <span>Удалить</span>
                </button>
              </div>
            </div>

            <!-- Inline Admin Password Reset Panel -->
            <div v-if="resetTargetUsername === author.username" class="p-3 rounded-xl bg-[#16181a] border border-amber-500/40 space-y-2 animate-in fade-in duration-200">
              <div class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <IconRenderer name="Key" size="13" />
                <span>Сброс пароля для {{ author.username }}:</span>
              </div>

              <div class="flex items-center gap-2">
                <div class="relative flex-1">
                  <input
                    :type="showResetPasswordToggle ? 'text' : 'password'"
                    v-model="resetNewPassword"
                    placeholder="Укажите новый пароль..."
                    class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl pl-3 pr-8 py-1.5 focus:outline-none focus:border-amber-500/60"
                  />
                  <button
                    type="button"
                    @click="showResetPasswordToggle = !showResetPasswordToggle"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white"
                  >
                    <IconRenderer :name="showResetPasswordToggle ? 'EyeOff' : 'Eye'" size="12" />
                  </button>
                </div>

                <button
                  @click="handleAdminResetAuthorPassword(author.username)"
                  class="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs transition-all cursor-pointer shrink-0"
                >
                  Сохранить
                </button>
                <button
                  @click="resetTargetUsername = null"
                  class="px-2.5 py-1.5 rounded-xl bg-[#26292d] text-slate-300 text-xs font-bold shrink-0"
                >
                  Отмена
                </button>
              </div>
            </div>

            <!-- Role Selector & Permissions Matrix Expansion Bar -->
            <div class="space-y-3 pt-2 border-t border-[#1c1f22]">
              <!-- Role Selector Row -->
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#121416] p-3 rounded-xl border border-[#26292d]">
                <div class="flex items-center gap-2">
                  <IconRenderer name="Shield" size="16" class="text-purple-400" />
                  <div>
                    <div class="text-xs font-extrabold text-white">Системная Роль Пользователя:</div>
                    <div class="text-[10px] text-dark-muted">{{ DEFAULT_SYSTEM_ROLES[author.role as UserRole || 'author']?.description || 'Определяет права в системе' }}</div>
                  </div>
                </div>

                <div v-if="!canManageTargetRole(props.currentRole || (props.isAdmin ? 'super_admin' : 'guest'), author.role || 'author')" class="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl">
                  Нельзя изменить (равный/старший ранг)
                </div>

                <select
                  v-else
                  :value="author.role || 'author'"
                  @change="handleAdminChangeUserRole(author, ($event.target as HTMLSelectElement).value as UserRole)"
                  class="bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option
                    v-for="r in Object.values(DEFAULT_SYSTEM_ROLES)"
                    :key="r.role"
                    :value="r.role"
                    :disabled="getRolePriority(props.currentRole || (props.isAdmin ? 'super_admin' : 'guest')) >= r.priority && props.currentRole !== 'super_admin'"
                  >
                    {{ r.name }} (Приоритет: {{ r.priority }})
                  </option>
                </select>
              </div>

              <!-- Assigned Servers Selection Drawer -->
              <div class="pt-2">
                <div class="flex items-center justify-between">
                  <button
                    @click="editingAssignedServersAuthor = editingAssignedServersAuthor === author.username ? null : author.username"
                    class="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <IconRenderer name="Box" size="13" />
                    <span>{{ editingAssignedServersAuthor === author.username ? 'Свернуть выбор серверов' : 'Закрепить автора за серверами CubixWorld' }}</span>
                  </button>

                  <span class="text-[9.5px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    {{ (author.assignedServers && author.assignedServers.length > 0) ? `Закреплено: ${author.assignedServers.length}` : 'Все сервера' }}
                  </span>
                </div>

                <div v-if="editingAssignedServersAuthor === author.username" class="mt-2 p-3 rounded-2xl bg-[#090a0c] border border-emerald-500/30 space-y-2 animate-in fade-in duration-200">
                  <div class="text-[10px] text-dark-muted">Выберите сервера, на которые автор может писать гайды (если не выбран ни один — разрешено создание на всех серверах):</div>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="srv in availableServersList"
                      :key="srv"
                      @click="handleAdminToggleAssignedServer(author, srv)"
                      :class="[
                        'px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1',
                        (author.assignedServers || []).includes(srv)
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/40'
                          : 'bg-[#121416] text-slate-400 border-[#26292d] hover:border-slate-600 hover:text-white'
                      ]"
                    >
                      <IconRenderer v-if="(author.assignedServers || []).includes(srv)" name="Check" size="12" />
                      <span>{{ srv }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>

    <!-- Confirm Author Delete Modal -->
    <ConfirmModal
      :is-open="isDeleteConfirmOpen"
      title="Удаление авторов"
      :message="`Вы действительно хотите удалить аккаунт автора ${authorToDelete}? Локальный пароль и доступ будут заблокированы.`"
      confirm-text="Да, удалить автора"
      cancel-text="Отмена"
      type="danger"
      @confirm="confirmDeleteAuthor"
      @cancel="isDeleteConfirmOpen = false"
    />
  </div>
</template>
