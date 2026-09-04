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
  (e: 'open-profile', username: string): void;
}>();

// Navigation Sub-tabs for Admin Panel
type AdminTab = 'authors' | 'moderation' | 'roles' | 'register';
const activeTab = ref<AdminTab>('authors');

const registeredAuthorsList = ref<any[]>([]);
const authorAvatarsMap = ref<Record<string, string>>({});
const isLoading = ref(false);
const adminMessage = ref('');
const searchQuery = ref('');
const roleFilter = ref<string>('all');
const editingAssignedServersAuthor = ref<string | null>(null);
const editingRoleAuthor = ref<string | null>(null);
const isRoleFilterOpen = ref(false);

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
const newAuthorRole = ref<UserRole>('author');
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

// Analytical Metrics Computations
const totalAuthorsCount = computed(() => registeredAuthorsList.value.length);
const pendingModerationCount = computed(() => pendingGuidesList.value.length);

const roleStatsMap = computed(() => {
  const counts: Record<string, number> = {};
  for (const a of registeredAuthorsList.value) {
    const r = a.role || 'author';
    counts[r] = (counts[r] || 0) + 1;
  }
  return counts;
});

const fetchPendingGuides = async () => {
  isModerationLoading.value = true;
  try {
    const res = await fetch('/api/guides');
    if (res.ok) {
      const all = await res.json();
      pendingGuidesList.value = all.filter((g: any) => g.meta.status === 'pending_moderation' || g.meta.status === 'pending_unpublish');
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

const isRejectModalOpen = ref(false);
const pendingRejectGuide = ref<any>(null);
const rejectionReasonText = ref('');

const openRejectModal = (guide: any) => {
  pendingRejectGuide.value = guide;
  rejectionReasonText.value = '';
  isRejectModalOpen.value = true;
};

const confirmRejectGuide = async () => {
  if (!pendingRejectGuide.value) return;
  adminMessage.value = '';
  const guide = pendingRejectGuide.value;
  const reason = rejectionReasonText.value.trim() || 'Не указана';
  const updated = {
    ...guide,
    meta: {
      ...guide.meta,
      published: false,
      isVisible: false,
      status: 'rejected',
      rejectionReason: reason
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
      adminMessage.value = `Гайд "${guide.meta.title}" отклонен и отправлен автору с причиной: "${reason}" ❌`;
      isRejectModalOpen.value = false;
      pendingRejectGuide.value = null;
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
  let list = registeredAuthorsList.value;

  if (roleFilter.value !== 'all') {
    list = list.filter(a => (a.role || 'author') === roleFilter.value);
  }

  const q = searchQuery.value.toLowerCase().trim();
  if (q) {
    list = list.filter(a => a.username.toLowerCase().includes(q));
  }

  return list;
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
      if (newAuthorRole.value && newAuthorRole.value !== 'author') {
        await fetch('/api/admin/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUsername: data.username,
            role: newAuthorRole.value,
            adminUsername: props.currentUsername
          })
        });
      }
      adminMessage.value = `Успешно зарегистрирован участник: ${data.username} с ролью "${DEFAULT_SYSTEM_ROLES[newAuthorRole.value]?.name}"!`;
      newAuthorUsername.value = '';
      newAuthorPassword.value = '';
      newAuthorRole.value = 'author';
      fetchAdminAuthorsList();
      activeTab.value = 'authors';
    } else {
      adminMessage.value = data.error || 'Ошибка создания автора';
    }
  } catch (err) {
    adminMessage.value = 'Ошибка обращения к серверу';
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
      adminMessage.value = data.message || `Участник ${targetUser} удален!`;
      fetchAdminAuthorsList();
    } else {
      adminMessage.value = data.error || 'Ошибка удаления';
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
        adminUsername: props.currentUsername
      })
    });
    const data = await res.json();
    if (res.ok) {
      adminMessage.value = data.message || `Роль участника ${author.username} изменена на ${DEFAULT_SYSTEM_ROLES[role]?.name}!`;
      fetchAdminAuthorsList();
    } else {
      adminMessage.value = data.error || 'Ошибка смены роли';
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
        assignedServers: currentServers,
        adminUsername: props.currentUsername
      })
    });
    const data = await res.json();
    if (res.ok) {
      adminMessage.value = `Привязанные сервера для ${author.username} обновлены!`;
      author.assignedServers = currentServers;
    } else {
      adminMessage.value = data.error || 'Ошибка обновления серверов';
    }
  } catch (err) {
    adminMessage.value = 'Ошибка соединения с сервером';
  }
};
</script>

<template>
  <div class="space-y-6 pb-24 animate-in fade-in duration-300">
    <!-- Modern Header Bar -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#26292d] pb-5">
      <div class="flex items-center gap-3.5">
        <div class="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-rose-500/20 border border-cyan-500/30 text-cyan-400 shadow-xl shadow-cyan-950/20">
          <IconRenderer name="ShieldCheck" size="28" />
        </div>
        <div>
          <h1 class="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>Центр Управления Доступом</span>
            <span class="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 tracking-wider uppercase">ADMIN PORTAL</span>
          </h1>
          <p class="text-xs text-dark-muted">Иерархическое управление участниками, системными ролями и очередью модерации</p>
        </div>
      </div>

      <div class="flex items-center gap-2.5 self-end md:self-center">
        <button
          @click="fetchAdminAuthorsList(); fetchPendingGuides();"
          :disabled="isLoading || isModerationLoading"
          class="px-3.5 py-2 rounded-xl bg-[#16181a] hover:bg-[#202327] border border-[#26292d] text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
        >
          <IconRenderer name="RotateCw" size="14" :class="['text-cyan-400', (isLoading || isModerationLoading) ? 'animate-spin' : '']" />
          <span>Синхронизировать</span>
        </button>

        <button
          @click="emit('go-home')"
          class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
        >
          <span>На Главную</span>
        </button>
      </div>
    </div>

    <!-- Analytical Dashboard Widgets Row -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Authors Widget -->
      <div class="p-4 rounded-2xl bg-[#141618]/90 border border-[#26292d] hover:border-cyan-500/40 transition-all shadow-lg flex items-center justify-between">
        <div class="space-y-1">
          <div class="text-[11px] font-bold text-dark-muted">Всего Участников</div>
          <div class="text-2xl font-black text-white flex items-baseline gap-2">
            <span>{{ totalAuthorsCount }}</span>
            <span class="text-xs text-cyan-400 font-bold">аккаунтов</span>
          </div>
        </div>
        <div class="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <IconRenderer name="Users" size="22" />
        </div>
      </div>

      <!-- Pending Moderation Widget -->
      <div
        @click="activeTab = 'moderation'"
        class="p-4 rounded-2xl bg-[#141618]/90 border border-[#26292d] hover:border-amber-500/50 transition-all shadow-lg flex items-center justify-between cursor-pointer group"
      >
        <div class="space-y-1">
          <div class="text-[11px] font-bold text-dark-muted">Очередь Модерации</div>
          <div class="text-2xl font-black text-white flex items-baseline gap-2">
            <span>{{ pendingModerationCount }}</span>
            <span class="text-xs text-amber-400 font-bold">гайдов</span>
          </div>
        </div>
        <div class="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
          <IconRenderer name="Clock" size="22" />
        </div>
      </div>

      <!-- Roles Distribution Widget -->
      <div
        @click="activeTab = 'roles'"
        class="p-4 rounded-2xl bg-[#141618]/90 border border-[#26292d] hover:border-purple-500/50 transition-all shadow-lg flex items-center justify-between cursor-pointer group"
      >
        <div class="space-y-1">
          <div class="text-[11px] font-bold text-dark-muted">Администраторов</div>
          <div class="text-2xl font-black text-white flex items-baseline gap-2">
            <span>{{ (roleStatsMap['super_admin'] || 0) + (roleStatsMap['admin'] || 0) }}</span>
            <span class="text-xs text-purple-400 font-bold">с высшим доступом</span>
          </div>
        </div>
        <div class="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
          <IconRenderer name="Shield" size="22" />
        </div>
      </div>

      <!-- Quick Action: New Author Widget -->
      <div
        @click="activeTab = 'register'"
        class="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/40 hover:border-emerald-400 transition-all shadow-lg flex items-center justify-between cursor-pointer group"
      >
        <div class="space-y-1">
          <div class="text-[11px] font-bold text-emerald-300">Быстрое действие</div>
          <div class="text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
            + Создать аккаунт
          </div>
        </div>
        <div class="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 group-hover:rotate-90 transition-transform">
          <IconRenderer name="UserPlus" size="22" />
        </div>
      </div>
    </div>

    <!-- Alert / System Notification -->
    <div v-if="adminMessage" class="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/50 text-cyan-200 text-xs font-semibold flex items-center justify-between shadow-lg backdrop-blur-md">
      <div class="flex items-center gap-2.5">
        <IconRenderer name="Info" size="16" class="text-cyan-400 shrink-0" />
        <span>{{ adminMessage }}</span>
      </div>
      <button @click="adminMessage = ''" class="text-slate-400 hover:text-white p-1">
        <IconRenderer name="X" size="14" />
      </button>
    </div>

    <!-- Navigation Sub-tabs Bar -->
    <div class="flex items-center gap-2 border-b border-[#26292d] pb-2 overflow-x-auto custom-scrollbar">
      <button
        @click="activeTab = 'authors'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shrink-0 border',
          activeTab === 'authors'
            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md'
            : 'bg-[#121416] text-slate-400 border-transparent hover:border-[#26292d] hover:text-white'
        ]"
      >
        <IconRenderer name="Users" size="15" />
        <span>Список Участников ({{ registeredAuthorsList.length }})</span>
      </button>

      <button
        @click="activeTab = 'moderation'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shrink-0 border relative',
          activeTab === 'moderation'
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
            : 'bg-[#121416] text-slate-400 border-transparent hover:border-[#26292d] hover:text-white'
        ]"
      >
        <IconRenderer name="Clock" size="15" />
        <span>Модерация Гайдов</span>
        <span v-if="pendingModerationCount > 0" class="px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[9.5px] font-black">
          {{ pendingModerationCount }}
        </span>
      </button>

      <button
        @click="activeTab = 'roles'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shrink-0 border',
          activeTab === 'roles'
            ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md'
            : 'bg-[#121416] text-slate-400 border-transparent hover:border-[#26292d] hover:text-white'
        ]"
      >
        <IconRenderer name="Shield" size="15" />
        <span>Справочник Ролей & Иерархия</span>
      </button>

      <button
        @click="activeTab = 'register'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shrink-0 border',
          activeTab === 'register'
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md'
            : 'bg-[#121416] text-slate-400 border-transparent hover:border-[#26292d] hover:text-white'
        ]"
      >
        <IconRenderer name="UserPlus" size="15" />
        <span>Регистрация Автора</span>
      </button>
    </div>

    <!-- TAB 1: AUTHORS MANAGEMENT (CLEAN MODERN TABLE) -->
    <div v-if="activeTab === 'authors'" class="space-y-4">
      <!-- Search & Filter Controls -->
      <div class="p-4 rounded-2xl bg-[#141618] border border-[#26292d] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
        <!-- Search Input -->
        <div class="relative flex-1">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Поиск участников по никнейму..."
            class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-cyan-500/60"
          />
          <IconRenderer name="Search" size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
        </div>

        <!-- Role Filter Custom Dropdown -->
        <div class="flex items-center gap-2 relative">
          <span class="text-xs text-dark-muted font-bold whitespace-nowrap">Фильтр роли:</span>
          <div class="relative">
            <button
              type="button"
              @click="isRoleFilterOpen = !isRoleFilterOpen"
              class="bg-[#0c0d0e] border border-[#26292d] hover:border-cyan-500/60 text-white text-xs font-extrabold rounded-xl px-3.5 py-2 flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <span v-if="roleFilter === 'all'" class="text-slate-300">Все роли ({{ registeredAuthorsList.length }})</span>
              <span v-else :class="['px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border', DEFAULT_SYSTEM_ROLES[roleFilter as UserRole]?.badgeColor]">
                {{ DEFAULT_SYSTEM_ROLES[roleFilter as UserRole]?.name }}
              </span>
              <IconRenderer name="ChevronDown" size="13" :class="['text-dark-muted transition-transform duration-200', isRoleFilterOpen ? 'rotate-180' : '']" />
            </button>

            <!-- Custom Filter Dropdown Menu -->
            <div
              v-if="isRoleFilterOpen"
              class="absolute right-0 top-full mt-2 w-56 p-1.5 rounded-2xl bg-[#0e1013]/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl z-40 space-y-1 animate-in fade-in zoom-in-95 duration-150"
            >
              <button
                @click="roleFilter = 'all'; isRoleFilterOpen = false;"
                :class="[
                  'w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer',
                  roleFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'hover:bg-[#16181b] text-slate-300'
                ]"
              >
                <span>Все роли ({{ registeredAuthorsList.length }})</span>
                <IconRenderer v-if="roleFilter === 'all'" name="Check" size="13" class="text-cyan-400" />
              </button>

              <button
                v-for="r in Object.values(DEFAULT_SYSTEM_ROLES)"
                :key="r.role"
                @click="roleFilter = r.role; isRoleFilterOpen = false;"
                :class="[
                  'w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer',
                  roleFilter === r.role ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'hover:bg-[#16181b] text-slate-300'
                ]"
              >
                <span :class="['px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border', r.badgeColor]">
                  {{ r.name }}
                </span>
                <IconRenderer v-if="roleFilter === r.role" name="Check" size="13" class="text-cyan-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Authors Grid Cards View (High-Tech Design) -->
      <div v-if="isLoading" class="py-16 text-center text-dark-muted text-xs space-y-2 bg-[#141618] rounded-2xl border border-[#26292d]">
        <div class="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div>Загрузка списка участников...</div>
      </div>

      <div v-else-if="filteredAuthors.length === 0" class="py-16 text-center bg-[#141618] rounded-2xl border border-[#26292d] text-dark-muted text-xs space-y-1">
        <IconRenderer name="Users" size="32" class="mx-auto text-slate-600 mb-2" />
        <div class="text-sm font-bold text-white">Участники не найдены</div>
        <div>Попробуйте изменить поисковый запрос или сбросить фильтр роли</div>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="author in filteredAuthors"
          :key="author.username"
          class="p-5 rounded-2xl bg-[#141618]/90 border border-[#26292d] hover:border-cyan-500/50 transition-all duration-300 space-y-4 shadow-xl hover:shadow-cyan-950/20 group relative"
        >
          <!-- TOP CARD HEADER: AVATAR & USERNAME -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <!-- Avatar with Ring -->
              <div
                @click="emit('open-profile', author.username)"
                class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-cyan-500 to-purple-600 p-0.5 shadow-md shrink-0 cursor-pointer group-hover:scale-105 transition-transform"
                title="Просмотреть публичный профиль"
              >
                <div class="w-full h-full bg-[#0c0d0e] rounded-[14px] flex items-center justify-center overflow-hidden">
                  <img v-if="authorAvatarsMap[author.username.toLowerCase()]" :src="authorAvatarsMap[author.username.toLowerCase()]" class="w-full h-full object-cover" />
                  <span v-else class="text-sm font-black text-emerald-400">{{ author.username.charAt(0).toUpperCase() }}</span>
                </div>
              </div>

              <div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span
                    @click="emit('open-profile', author.username)"
                    class="font-black text-white text-base hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    {{ author.username }}
                  </span>

                  <span v-if="author.isVerified" class="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shadow-sm" title="Проверенный Аккаунт">
                    <IconRenderer name="Check" size="10" />
                  </span>
                </div>

                <div class="text-[10.5px] text-dark-muted mt-0.5">Создан: {{ author.createdAt || 'Ранее' }}</div>
              </div>
            </div>

            <!-- Role Badge -->
            <span :class="['px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border shadow-md shrink-0', DEFAULT_SYSTEM_ROLES[author.role as UserRole || 'author']?.badgeColor || 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40']">
              {{ DEFAULT_SYSTEM_ROLES[author.role as UserRole || 'author']?.name || author.role }}
            </span>
          </div>

          <!-- CARD CONTROLS: ROLE SELECTOR & SERVERS -->
          <div class="space-y-2.5 pt-3 border-t border-[#26292d]">
            <!-- Role Selector Row -->
            <div class="flex items-center justify-between gap-2 text-xs relative">
              <span class="text-dark-muted font-bold text-[11px]">Роль:</span>

              <span v-if="!canManageTargetRole(props.currentRole || (props.isAdmin ? 'super_admin' : 'guest'), author.role || 'author')" class="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                Защищено рангом
              </span>

              <!-- Custom Styled Role Dropdown Trigger Button -->
              <div v-else class="relative">
                <button
                  type="button"
                  @click="editingRoleAuthor = editingRoleAuthor === author.username ? null : author.username; editingAssignedServersAuthor = null;"
                  :class="['px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all cursor-pointer shadow-md', DEFAULT_SYSTEM_ROLES[author.role as UserRole || 'author']?.badgeColor || 'bg-[#0c0d0e] text-white border-[#26292d]']"
                >
                  <span>{{ DEFAULT_SYSTEM_ROLES[author.role as UserRole || 'author']?.name }}</span>
                  <IconRenderer name="ChevronDown" size="12" :class="['transition-transform duration-200', editingRoleAuthor === author.username ? 'rotate-180' : '']" />
                </button>

                <!-- Custom Role Selector Dropdown Menu -->
                <div
                  v-if="editingRoleAuthor === author.username"
                  class="absolute right-0 top-full mt-2 w-56 p-1.5 rounded-2xl bg-[#0e1013]/95 border border-purple-500/40 shadow-2xl backdrop-blur-xl z-40 space-y-1 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div class="text-[10px] font-extrabold text-purple-300 px-2.5 py-1 border-b border-[#26292d] uppercase tracking-wider flex justify-between items-center">
                    <span>Выбор системной роли:</span>
                    <button @click="editingRoleAuthor = null" class="text-slate-400 hover:text-white">
                      <IconRenderer name="X" size="12" />
                    </button>
                  </div>

                  <button
                    v-for="r in Object.values(DEFAULT_SYSTEM_ROLES)"
                    :key="r.role"
                    :disabled="getRolePriority(props.currentRole || (props.isAdmin ? 'super_admin' : 'guest')) >= r.priority && props.currentRole !== 'super_admin'"
                    @click="handleAdminChangeUserRole(author, r.role); editingRoleAuthor = null;"
                    :class="[
                      'w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border',
                      author.role === r.role ? 'bg-purple-500/20 border-purple-500/40 text-purple-200' : 'hover:bg-[#16181b] border-transparent text-slate-300',
                      (getRolePriority(props.currentRole || (props.isAdmin ? 'super_admin' : 'guest')) >= r.priority && props.currentRole !== 'super_admin') ? 'opacity-40 cursor-not-allowed' : ''
                    ]"
                  >
                    <span :class="['px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border', r.badgeColor]">
                      {{ r.name }}
                    </span>
                    <IconRenderer v-if="author.role === r.role" name="Check" size="13" class="text-purple-400" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Assigned Servers Row -->
            <div class="flex items-center justify-between gap-2 text-xs relative">
              <span class="text-dark-muted font-bold text-[11px]">Закрепленные сервера:</span>

              <button
                @click="editingAssignedServersAuthor = editingAssignedServersAuthor === author.username ? null : author.username"
                class="px-2.5 py-1 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-500/40 text-[10.5px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <IconRenderer name="Box" size="12" />
                <span>{{ (author.assignedServers && author.assignedServers.length > 0) ? `${author.assignedServers.length} серв.` : 'Все сервера' }}</span>
              </button>

              <!-- Assigned Servers Selection Modal Dropdown -->
              <div v-if="editingAssignedServersAuthor === author.username" class="absolute right-0 top-full mt-2 w-72 p-3.5 rounded-2xl bg-[#0d0f11] border border-emerald-500/50 shadow-2xl z-30 space-y-2.5 backdrop-blur-xl">
                <div class="text-[11px] font-bold text-emerald-300 border-b border-[#26292d] pb-1.5 flex justify-between items-center">
                  <span>Выбор серверов CubixWorld:</span>
                  <button @click="editingAssignedServersAuthor = null" class="text-slate-400 hover:text-white">
                    <IconRenderer name="X" size="13" />
                  </button>
                </div>

                <div class="flex flex-wrap gap-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  <button
                    v-for="srv in availableServersList"
                    :key="srv"
                    @click="handleAdminToggleAssignedServer(author, srv)"
                    :class="[
                      'px-2 py-0.5 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer flex items-center gap-1',
                      (author.assignedServers || []).includes(srv)
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                        : 'bg-[#16181a] text-slate-400 border-[#26292d] hover:text-white'
                    ]"
                  >
                    <span>{{ srv }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- BOTTOM FOOTER ACTIONS: PASSWORD RESET & DELETE -->
          <div class="pt-3 border-t border-[#26292d] flex items-center justify-between">
            <button
              @click="emit('open-profile', author.username)"
              class="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <IconRenderer name="User" size="13" />
              <span>Профиль</span>
            </button>

            <div v-if="canManageTargetRole(props.currentRole || (props.isAdmin ? 'super_admin' : 'guest'), author.role || 'author')" class="flex items-center gap-1.5">
              <button
                @click="resetTargetUsername = (resetTargetUsername === author.username ? null : author.username); resetNewPassword = '';"
                class="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Сбросить пароль"
              >
                <IconRenderer name="Key" size="12" />
                <span>Пароль</span>
              </button>

              <button
                v-if="author.username.toLowerCase() !== currentUsername.toLowerCase()"
                @click="promptDeleteAuthor(author.username)"
                class="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Удалить аккаунт"
              >
                <IconRenderer name="Trash2" size="12" />
                <span>Удалить</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Inline Password Reset Drawer Modal -->
      <div v-if="resetTargetUsername" class="p-4 rounded-2xl bg-[#16181a] border border-amber-500/40 space-y-3 shadow-xl">
        <div class="text-xs font-bold text-amber-300 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <IconRenderer name="Key" size="15" />
            <span>Сброс пароля для участника {{ resetTargetUsername }}:</span>
          </div>
          <button @click="resetTargetUsername = null" class="text-slate-400 hover:text-white">
            <IconRenderer name="X" size="14" />
          </button>
        </div>

        <div class="flex items-center gap-2 max-w-md">
          <div class="relative flex-1">
            <input
              :type="showResetPasswordToggle ? 'text' : 'password'"
              v-model="resetNewPassword"
              placeholder="Укажите новый пароль..."
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-amber-500/60"
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
            @click="handleAdminResetAuthorPassword(resetTargetUsername)"
            class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs transition-all cursor-pointer shadow-md shrink-0"
          >
            Сохранить пароль
          </button>
        </div>
      </div>
    </div>

    <!-- TAB 2: MODERATION QUEUE -->
    <div v-else-if="activeTab === 'moderation'" class="space-y-4">
      <div class="p-4 rounded-2xl bg-[#141618] border border-amber-500/40 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <IconRenderer name="Clock" size="20" class="text-amber-400" />
          <div>
            <h3 class="text-sm font-black text-white">Статьи, Ожидающие Проверки ({{ pendingGuidesList.length }})</h3>
            <p class="text-xs text-amber-200/70">Проверьте содержание статей авторов перед публикацией в открытый доступ</p>
          </div>
        </div>

        <button @click="fetchPendingGuides" class="text-xs text-amber-300 hover:underline flex items-center gap-1.5 cursor-pointer font-bold">
          <IconRenderer name="RotateCw" size="13" :class="isModerationLoading ? 'animate-spin' : ''" />
          <span>Обновить очередь</span>
        </button>
      </div>

      <div v-if="pendingGuidesList.length === 0" class="py-16 text-center bg-[#141618] border border-[#26292d] rounded-2xl text-dark-muted text-xs space-y-2">
        <IconRenderer name="CheckCircle" size="36" class="mx-auto text-emerald-400/50" />
        <div class="text-sm font-bold text-white">Очередь модерации пуста</div>
        <div>Все отправленные статьи уже проверены и опубликованы</div>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="guide in pendingGuidesList" :key="guide.meta.id" class="p-5 rounded-2xl bg-[#141618] border border-amber-500/30 space-y-3 shadow-lg">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h4 class="text-base font-extrabold text-white line-clamp-1">{{ guide.meta.title || '(Без названия)' }}</h4>
              <div class="text-xs text-amber-300/80 flex items-center gap-2 mt-0.5">
                <span>Автор: <strong class="text-white">{{ guide.meta.author }}</strong></span>
                <span>•</span>
                <span>Сервер: {{ guide.meta.server || 'Все' }}</span>
              </div>
            </div>
            <span v-if="guide.meta.status === 'pending_unpublish'" class="text-[9.5px] font-black px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
              Запрос снятия
            </span>
            <span v-else class="text-[9.5px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
              На модерации
            </span>
          </div>

          <p class="text-xs text-dark-muted line-clamp-2 leading-relaxed">{{ guide.meta.summary || 'Описание отсутствует' }}</p>
          
          <div v-if="guide.meta.status === 'pending_unpublish'" class="p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 space-y-0.5">
            <span class="font-bold text-purple-300">Причина запроса снятия:</span>
            <p class="italic text-[11px] text-purple-200/90">{{ guide.meta.unpublishReason || 'Без указания причины' }}</p>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-[#26292d]">
            <span class="text-[10px] text-dark-muted">Обновлен: {{ guide.meta.updatedAt }}</span>
            
            <div class="flex items-center gap-2">
              <button
                v-if="guide.meta.status === 'pending_unpublish'"
                @click="handleRejectGuide(guide)"
                class="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <IconRenderer name="EyeOff" size="14" />
                <span>Снять с публикации (Одобрить)</span>
              </button>

              <button
                v-else
                @click="openRejectModal(guide)"
                class="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <IconRenderer name="X" size="14" />
                <span>Отклонить</span>
              </button>
              
              <button
                @click="handleApproveGuide(guide)"
                class="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <IconRenderer name="Check" size="14" />
                <span>Опубликовать</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: SYSTEM ROLES CATALOG & PERMISSIONS DIRECTORY -->
    <div v-else-if="activeTab === 'roles'" class="space-y-4">
      <div class="p-4 rounded-2xl bg-[#141618] border border-purple-500/40 flex items-center gap-3">
        <IconRenderer name="Shield" size="22" class="text-purple-400 shrink-0" />
        <div>
          <h3 class="text-sm font-black text-white">Справочник Ролей & Разрешений Системы</h3>
          <p class="text-xs text-purple-200/70">Иерархия ролей (0 = высший ранг) определяет точный набор прав у участников</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="r in Object.values(DEFAULT_SYSTEM_ROLES)"
          :key="r.role"
          class="p-5 rounded-2xl bg-[#141618] border border-[#26292d] space-y-3 shadow-lg hover:border-purple-500/40 transition-all"
        >
          <div class="flex items-center justify-between border-b border-[#26292d] pb-3">
            <div class="flex items-center gap-2">
              <span :class="['px-3 py-1 rounded-full text-xs font-extrabold uppercase border shadow-sm', r.badgeColor]">
                {{ r.name }}
              </span>
            </div>
            <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#0c0d0e] text-purple-300 border border-purple-500/30">
              Приоритет: {{ r.priority }}
            </span>
          </div>

          <p class="text-xs text-dark-muted leading-relaxed">{{ r.description }}</p>

          <div class="space-y-1.5 pt-2">
            <div class="text-[11px] font-bold text-slate-300 flex justify-between">
              <span>Доступные разрешения:</span>
              <span class="text-purple-400 font-mono">{{ r.permissions.length }} прав</span>
            </div>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="pKey in r.permissions"
                :key="pKey"
                class="px-2 py-0.5 rounded-lg bg-[#0c0d0e] border border-[#26292d] text-[10px] text-slate-300 font-semibold"
              >
                {{ SYSTEM_PERMISSIONS.find(sp => sp.key === pKey)?.label || pKey }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: REGISTER NEW AUTHOR ACCOUNT -->
    <div v-else-if="activeTab === 'register'" class="max-w-xl mx-auto p-6 rounded-3xl bg-[#141618] border border-emerald-500/40 shadow-2xl space-y-4">
      <div class="flex items-center gap-3 border-b border-[#26292d] pb-4">
        <div class="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <IconRenderer name="UserPlus" size="22" />
        </div>
        <div>
          <h3 class="text-base font-black text-white">Регистрация Нового Участника</h3>
          <p class="text-xs text-dark-muted">Создайте новый аккаунт с назначением системной роли и пароля</p>
        </div>
      </div>

      <form @submit.prevent="handleAdminRegisterAuthor" class="space-y-4 pt-1">
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-slate-300">Игровой / Локальный никнейм:</label>
          <div class="relative">
            <input
              type="text"
              v-model="newAuthorUsername"
              placeholder="Введите никнейм..."
              class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-emerald-500/70 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none transition-all"
            />
            <IconRenderer name="User" size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-bold text-slate-300">Начальный пароль аккаунта:</label>
          <div class="relative">
            <input
              :type="showNewAuthorPassword ? 'text' : 'password'"
              v-model="newAuthorPassword"
              placeholder="Введите пароль..."
              class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-emerald-500/70 text-white text-xs rounded-xl pl-9 pr-9 py-2.5 focus:outline-none transition-all"
            />
            <IconRenderer name="Lock" size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
            <button
              type="button"
              @click="showNewAuthorPassword = !showNewAuthorPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white"
            >
              <IconRenderer :name="showNewAuthorPassword ? 'EyeOff' : 'Eye'" size="15" />
            </button>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-bold text-slate-300">Начальная системная роль:</label>
          <select
            v-model="newAuthorRole"
            class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-emerald-500/70 text-white text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer"
          >
            <option
              v-for="r in Object.values(DEFAULT_SYSTEM_ROLES)"
              :key="r.role"
              :value="r.role"
              :disabled="getRolePriority(props.currentRole || (props.isAdmin ? 'super_admin' : 'guest')) >= r.priority && props.currentRole !== 'super_admin'"
            >
              {{ r.name }}
            </option>
          </select>
        </div>

        <button
          type="submit"
          class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          <IconRenderer name="UserPlus" size="16" />
          <span>Создать учетную запись</span>
        </button>
      </form>
    </div>

    <!-- Confirm Author Delete Modal -->
    <ConfirmModal
      :is-open="isDeleteConfirmOpen"
      title="Удаление участника"
      :message="`Вы действительно хотите удалить аккаунт автора ${authorToDelete}? Доступ будет заблокирован.`"
      confirm-text="Да, удалить аккаунт"
      cancel-text="Отмена"
      type="danger"
      @confirm="confirmDeleteAuthor"
      @cancel="isDeleteConfirmOpen = false"
    />
  </div>
</template>
