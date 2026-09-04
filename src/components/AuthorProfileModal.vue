<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import IconRenderer from './IconRenderer.vue';
import ConfirmModal from './ConfirmModal.vue';
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
  (e: 'view-all-guides', authorName: string): void;
  (e: 'logout'): void;
}>();

const isEditing = ref(false);
const isLoading = ref(false);
const isAuthorVerified = ref(false);

// Change Password State
const isChangePasswordOpen = ref(false);
const oldPassword = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');
const showOldPassword = ref(false);
const showNewPassword = ref(false);
const pwdMessage = ref('');
const pwdIsSuccess = ref(false);

// Admin Author Creation & Management State
const isAdminPanelOpen = ref(false);
const newAuthorUsername = ref('');
const newAuthorPassword = ref('');
const showNewAuthorPassword = ref(false);
const adminMessage = ref('');
const registeredAuthorsList = ref<any[]>([]);
const authorAvatarsMap = ref<Record<string, string>>({});

// Custom Confirm Modal State for Deletion
const isDeleteConfirmOpen = ref(false);
const authorToDelete = ref<string | null>(null);

// Admin Password Reset Modal State
const resetTargetUsername = ref<string | null>(null);
const resetNewPassword = ref('');
const showResetPasswordToggle = ref(false);

const profile = ref<AuthorProfile>({
  username: props.username,
  avatarUrl: '',
  bannerUrl: '',
  bio: '',
  server: 'MagicRPG',
  socialVk: '',
  socialTg: '',
  socialDs: '',
  customLinks: [],
  badges: [],
  pinnedGuideId: ''
});

const newBadgeInput = ref('');
const newLinkLabel = ref('');
const newLinkUrl = ref('');

const authorTeamRoles = ref<{ serverName: string; groupName: string }[]>([]);
const isAuthorRegistered = ref(true);
const isTeamRolesModalOpen = ref(false);

const fetchProfile = async () => {
  if (!props.username) return;
  try {
    isLoading.value = true;
    const res = await fetch(`/api/profiles/${encodeURIComponent(props.username)}`);
    if (res.ok) {
      const data = await res.json();
      profile.value = data;
      isAuthorVerified.value = Boolean(data.isVerified);
      if (!profile.value.customLinks) profile.value.customLinks = [];
    } else {
      // Create readable temporary profile for display
      profile.value = {
        username: props.username,
        avatarUrl: `https://cubixworld.net/api/account.load.avatar?login=${encodeURIComponent(props.username)}`,
        bannerUrl: '',
        bio: 'Участник проекта CubixWorld.',
        server: '',
        socialVk: '',
        socialTg: '',
        socialDs: '',
        customLinks: [],
        badges: ['Персонал'],
        pinnedGuideId: '',
        updatedAt: ''
      };
    }
    isAuthorRegistered.value = true;

    // Fetch Team API data directly to display official staff badges
    const teamRes = await fetch('/api/team');
    if (teamRes.ok) {
      const teamData = await teamRes.json();
      const roles: { serverName: string; groupName: string }[] = [];
      const rootTeam = (teamData && teamData.team) ? teamData.team : teamData;

      if (rootTeam && typeof rootTeam === 'object') {
        Object.values(rootTeam).forEach((srvObj: any) => {
          if (srvObj && srvObj.team && typeof srvObj.team === 'object') {
            Object.values(srvObj.team).forEach((m: any) => {
              if (m && m.name && m.name.toLowerCase() === props.username.toLowerCase()) {
                roles.push({ serverName: srvObj.server_name || m.server_name, groupName: m.group_name });
              }
            });
          }
        });
      }
      authorTeamRoles.value = roles;
    }
  } catch (err) {
    console.error('Error fetching profile:', err);
    isAuthorRegistered.value = true;
  } finally {
    isLoading.value = false;
  }
};

const telemetryStats = ref<{
  totalViews: number;
  totalEdits: number;
  totalLogins: number;
  topGuides: { guide_id: string; guide_title: string; views: number }[];
  recentLogs: { id: number; event_type: string; guide_id?: string; guide_title?: string; username?: string; ip_address?: string; user_agent?: string; created_at: string }[];
} | null>(null);

const activeAdminTab = ref<'users' | 'telemetry'>('users');

const fetchTelemetryStats = async () => {
  if (!props.isAdmin) return;
  try {
    const res = await fetch('/api/telemetry/stats', {
      headers: {
        'x-author-username': props.currentLoggedInUsername || ''
      }
    });
    if (res.ok) {
      telemetryStats.value = await res.json();
    }
  } catch (err) {
    console.error('Ошибка загрузки телеметрии:', err);
  }
};

const fetchAdminAuthorsList = async () => {
  if (!props.isAdmin) return;
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
  } catch (e) {}
  fetchTelemetryStats();
};

// Fetch author list whenever modal opens or admin panel is toggled
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    fetchProfile();
    if (props.isAdmin) {
      fetchAdminAuthorsList();
      fetchTelemetryStats();
    }
  }
}, { immediate: true });

watch(isAdminPanelOpen, (isOpen) => {
  if (isOpen && props.isAdmin) {
    fetchAdminAuthorsList();
    fetchTelemetryStats();
  }
});

watch(() => props.username, (newVal) => {
  if (newVal) {
    fetchProfile();
    if (props.isAdmin) fetchAdminAuthorsList();
  }
}, { immediate: true });

const authorGuides = computed(() => {
  if (!props.username || !props.allGuides) return [];
  const target = props.username.toLowerCase().trim();
  return props.allGuides.filter(g => {
    const isOwner = props.isOwnProfile;
    const canSeePrivate = props.isAdmin || isOwner;
    // Если гайд не виден публике и запрашивающий — не владелец и не админ, скрываем
    if (!g.meta.isVisible && !canSeePrivate) return false;

    const mainAuthor = (g.meta.author || '').toLowerCase().trim();
    if (mainAuthor === target) return true;
    const coAuthors = (g.meta.coAuthors || []).map(s => s.toLowerCase().trim());
    return coAuthors.includes(target);
  });
});

const displayedAuthorGuides = computed(() => {
  if (authorGuides.value.length <= 4) {
    return authorGuides.value;
  }
  return authorGuides.value.slice(0, 3);
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
      const data = await res.json();
      profile.value = data;
      isAuthorVerified.value = Boolean(data.isVerified);
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
        adminUsername: props.username
      })
    });
    const data = await res.json();
    if (res.ok) {
      adminMessage.value = data.message || 'Права и верификация автора обновлены!';
      fetchAdminAuthorsList();
      if (author.username.toLowerCase() === props.username.toLowerCase()) {
        fetchProfile();
      }
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
        adminUsername: props.username
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
    const res = await fetch(`/api/admin/authors/${encodeURIComponent(targetUser)}?adminUsername=${encodeURIComponent(props.username)}`, {
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

const addCustomLink = () => {
  const lbl = newLinkLabel.value.trim();
  const u = newLinkUrl.value.trim();
  if (lbl && u) {
    if (!profile.value.customLinks) profile.value.customLinks = [];
    profile.value.customLinks.push({
      id: `lnk_${Date.now()}`,
      label: lbl,
      url: u
    });
    newLinkLabel.value = '';
    newLinkUrl.value = '';
  }
};

const removeCustomLink = (id: string) => {
  if (profile.value.customLinks) {
    profile.value.customLinks = profile.value.customLinks.filter(l => l.id !== id);
  }
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

const handleBannerFileUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  const file = target.files[0];
  const reader = new FileReader();
  reader.onload = (event) => {
    if (event.target?.result) {
      profile.value.bannerUrl = event.target.result as string;
    }
  };
  reader.readAsDataURL(file);
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fadeIn" @click.self="emit('close')">
    
    <!-- CUSTOM DARK THEME CONFIRMATION MODAL -->
    <ConfirmModal
      :isOpen="isDeleteConfirmOpen"
      title="Удаление аккаунта автора"
      :message="`Вы действительно хотите удалить автора &quot;${authorToDelete}&quot;? Данное действие нельзя отменить!`"
      confirmText="Удалить автора"
      cancelText="Отмена"
      type="danger"
      @confirm="confirmDeleteAuthor"
      @cancel="isDeleteConfirmOpen = false; authorToDelete = null;"
    />

    <!-- Outer Relative Card Wrapper for Precise Floating Action Dock -->
    <div class="relative w-full max-w-2xl">
      
      <!-- FLOATING ACTION DOCK (flex-row on mobile, flex-col on sm) -->
      <div class="absolute top-2 right-2 sm:-top-4 sm:-right-4 z-50 flex flex-row sm:flex-col gap-2 items-center">
        
        <!-- 1. Close Modal Button -->
        <div class="relative group/tool">
          <button
            type="button"
            @click="emit('close')"
            class="w-10 h-10 rounded-2xl bg-[#0c0d0e] border-2 border-indigo-500 hover:border-purple-400 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all cursor-pointer"
          >
            <IconRenderer name="X" size="20" class="stroke-[2.5]" />
          </button>
          <div class="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover/tool:flex items-center pointer-events-none">
            <div class="bg-[#0c0d0e] border border-indigo-500/40 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-xl whitespace-nowrap shadow-2xl">
              Закрыть
            </div>
          </div>
        </div>

        <!-- 3. Change Password Button -->
        <div v-if="isOwnProfile" class="relative group/tool">
          <button
            type="button"
            @click="isChangePasswordOpen = !isChangePasswordOpen; pwdMessage = '';"
            class="w-10 h-10 rounded-2xl bg-[#0c0d0e] hover:bg-cyan-950/60 text-cyan-400 border-2 border-cyan-500/80 hover:border-cyan-400 flex items-center justify-center shadow-2xl hover:scale-110 transition-all cursor-pointer"
          >
            <IconRenderer name="Lock" size="18" class="stroke-[2]" />
          </button>
          <div class="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover/tool:flex items-center pointer-events-none">
            <div class="bg-[#0c0d0e] border border-cyan-500/40 text-cyan-300 text-xs font-semibold px-3 py-1 rounded-xl whitespace-nowrap shadow-2xl">
              Сменить пароль
            </div>
          </div>
        </div>

        <!-- 4. Edit Profile Button -->
        <div v-if="isOwnProfile && !isEditing" class="relative group/tool">
          <button
            type="button"
            @click="isEditing = true"
            class="w-10 h-10 rounded-2xl bg-[#0c0d0e] hover:bg-emerald-950/60 text-emerald-400 border-2 border-emerald-500/80 hover:border-emerald-400 flex items-center justify-center shadow-2xl hover:scale-110 transition-all cursor-pointer"
          >
            <IconRenderer name="Edit3" size="18" class="stroke-[2]" />
          </button>
          <div class="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover/tool:flex items-center pointer-events-none">
            <div class="bg-[#0c0d0e] border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-xl whitespace-nowrap shadow-2xl">
              Редактировать профиль
            </div>
          </div>
        </div>

        <!-- 5. Logout Button (Own Profile) -->
        <div v-if="isOwnProfile" class="relative group/tool">
          <button
            type="button"
            @click="emit('logout')"
            class="w-10 h-10 rounded-2xl bg-[#0c0d0e] hover:bg-rose-950/60 text-rose-400 border-2 border-rose-500/80 hover:border-rose-400 flex items-center justify-center shadow-2xl hover:scale-110 transition-all cursor-pointer"
          >
            <IconRenderer name="LogOut" size="18" class="stroke-[2]" />
          </button>
          <div class="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover/tool:flex items-center pointer-events-none">
            <div class="bg-[#0c0d0e] border border-rose-500/40 text-rose-300 text-xs font-semibold px-3 py-1 rounded-xl whitespace-nowrap shadow-2xl">
              Выйти из аккаунта
            </div>
          </div>
        </div>
      </div>

      <!-- EXACT ORIGINAL COMPACT MODAL CONTAINER WITH HIGH VISIBILITY FULL BODY BANNER -->
      <div class="bg-[#16181a] border border-[#26292d] w-full rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar relative">

        <!-- VIBRANT HIGH-VISIBILITY BODY BANNER BACKGROUND LAYER -->
        <div v-if="profile.bannerUrl" class="absolute inset-0 pointer-events-none z-0 rounded-3xl overflow-hidden">
          <img :src="profile.bannerUrl" class="w-full h-full object-cover opacity-85 profile-modal-banner-img" />
          <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-[#16181a]/95 profile-modal-banner-overlay"></div>
        </div>

        <!-- MODAL CONTENT LAYER (FLOATING OVER THE BODY BANNER BACKGROUND) -->
        <div class="relative z-10 space-y-6">
          
          <!-- Loading State -->
          <div v-if="isLoading" class="py-12 text-center text-dark-muted space-y-2">
            <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div class="text-xs">Загрузка профиля...</div>
          </div>

          <template v-else>
            <!-- PROFILE HEADER BADGE -->
            <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-[#26292d]/80">
              <!-- Avatar with Glow -->
              <div class="relative flex-shrink-0">
                <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-emerald-600 via-cyan-500 to-purple-600 p-0.5 shadow-2xl shadow-black/80 overflow-hidden ring-2 ring-black/40">
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
              <div class="space-y-3 text-center sm:text-left flex-1 min-w-0 pr-8">
                <div class="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="text-2xl font-extrabold text-white tracking-tight flex items-center justify-center sm:justify-start gap-2.5 flex-wrap drop-shadow-md">
                      <span>{{ profile.username }}</span>

                      <!-- CRISP VERIFIED CHECKMARK BADGE WITH HOVER TOOLTIP "Проверенный Автор" -->
                      <div v-if="isAuthorVerified" class="relative group/vtool inline-flex items-center">
                        <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-950/60 cursor-help transition-transform hover:scale-110 flex items-center justify-center">
                          <div class="w-full h-full bg-[#0c0d0e] rounded-full flex items-center justify-center">
                            <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                        <!-- Tooltip Popup -->
                        <div class="absolute bottom-full left-1/2 -translate-y-1 -translate-x-1/2 mb-2.5 hidden group-hover/vtool:flex items-center pointer-events-none z-30">
                          <div class="bg-[#0c0d0e] border border-emerald-500/50 text-emerald-300 text-xs font-extrabold px-3 py-1 rounded-xl whitespace-nowrap shadow-2xl backdrop-blur-md flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Проверенный Автор</span>
                          </div>
                        </div>
                      </div>

                      <span v-if="profile.server" class="text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-lg shadow-md backdrop-blur-md">
                        🎮 {{ profile.server }}
                      </span>
                    </h2>
                    <p class="text-xs text-slate-300 font-medium pt-0.5 drop-shadow">Автор {{ authorGuides.length }} опубликованных гайдов</p>
                  </div>
                </div>

                <!-- Official CubixWorld Team Staff Badges -->
                <div v-if="authorTeamRoles.length > 0" class="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <!-- Single role badge if author has only 1 role -->
                  <span
                    v-if="authorTeamRoles.length === 1"
                    class="text-[11px] font-extrabold bg-gradient-to-r from-purple-900/90 to-cyan-900/90 text-amber-300 border border-amber-500/50 px-3 py-1 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1.5"
                  >
                    <IconRenderer name="Shield" size="13" class="text-amber-400" />
                    <span>{{ authorTeamRoles[0].groupName }} ({{ authorTeamRoles[0].serverName }})</span>
                  </span>

                  <!-- Compact "Команда проекта" button opening separate popup modal -->
                  <button
                    v-else
                    type="button"
                    @click.stop="isTeamRolesModalOpen = true"
                    class="text-[11px] font-extrabold bg-gradient-to-r from-purple-900/90 via-amber-900/90 to-cyan-900/90 hover:from-purple-800 hover:to-cyan-800 text-amber-300 border border-amber-500/60 hover:border-amber-400 px-3.5 py-1 rounded-full shadow-xl backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer group/tbtn"
                  >
                    <IconRenderer name="Shield" size="14" class="text-amber-400 group-hover/tbtn:scale-110 transition-transform" />
                    <span>Команда проекта ({{ authorTeamRoles.length }})</span>
                    <IconRenderer name="Info" size="13" class="text-amber-400/80" />
                  </button>
                </div>

                <!-- Custom Badges List -->
                <div v-if="profile.badges && profile.badges.length > 0" class="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <span
                    v-for="badge in profile.badges"
                    :key="badge"
                    class="text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full shadow-md backdrop-blur-md"
                  >
                    {{ badge }}
                  </span>
                </div>

                <!-- Bio Text -->
                <p v-if="profile.bio" class="text-xs text-slate-100 font-medium leading-relaxed max-w-lg whitespace-pre-line drop-shadow-[#000_0_1px_4px]">
                  {{ profile.bio }}
                </p>

                <!-- CUSTOM AUTHOR LINKS DISPLAY -->
                <div v-if="profile.customLinks && profile.customLinks.length > 0" class="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
                  <template v-for="lnk in profile.customLinks" :key="lnk.id">
                    <a
                      v-if="lnk.url.startsWith('http://') || lnk.url.startsWith('https://')"
                      :href="lnk.url"
                      target="_blank"
                      class="px-3.5 py-1.5 bg-[#0c0d0e]/85 hover:bg-[#181d22] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md group/lnk backdrop-blur-md"
                    >
                      <span>{{ lnk.label }}</span>
                      <IconRenderer name="ExternalLink" size="12" class="group-hover/lnk:translate-x-0.5 transition-transform" />
                    </a>
                    <span
                      v-else
                      class="px-3.5 py-1.5 bg-[#0c0d0e]/85 border border-[#26292d] text-purple-300 text-xs font-mono rounded-xl shadow-md backdrop-blur-md"
                    >
                      {{ lnk.label }}: {{ lnk.url }}
                    </span>
                  </template>
                </div>
              </div>
            </div>

            <!-- CHANGE PASSWORD FORM (Self Service for Author) -->
            <div v-if="isChangePasswordOpen && isOwnProfile" class="space-y-4 bg-[#0c0d0e]/90 border border-cyan-500/40 p-5 rounded-2xl animate-fadeIn backdrop-blur-md shadow-2xl">
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
                      class="w-full bg-[#16181a] border border-[#26292d] text-white text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-cyan-400"
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
                      class="w-full bg-[#16181a] border border-[#26292d] text-white text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-cyan-400"
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
                    class="w-full bg-[#16181a] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400"
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



            <!-- EDITING MODE FORM -->
            <div v-if="isEditing" class="space-y-4 bg-[#0c0d0e]/95 border border-[#26292d] p-5 rounded-2xl backdrop-blur-md shadow-2xl">
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
                  <label class="block text-[11px] text-dark-muted mb-1 font-medium">Или Загрузить аватарку с ПК</label>
                  <input
                    type="file"
                    accept="image/*"
                    @change="handleAvatarFileUpload"
                    class="w-full text-xs text-dark-muted file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 cursor-pointer"
                  />
                </div>

                <!-- BANNER SETTINGS FOR MODAL BODY BACKGROUND -->
                <div>
                  <label class="block text-[11px] text-purple-300 font-medium mb-1">Ссылка на Баннер Фона Модалки (URL)</label>
                  <input
                    type="text"
                    v-model="profile.bannerUrl"
                    placeholder="https://example.com/banner.jpg..."
                    class="w-full bg-[#16181a] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label class="block text-[11px] text-purple-300 font-medium mb-1">Или Загрузить баннер с ПК</label>
                  <input
                    type="file"
                    accept="image/*"
                    @change="handleBannerFileUpload"
                    class="w-full text-xs text-dark-muted file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-500/20 file:text-purple-300 cursor-pointer"
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

              <!-- CUSTOM AUTHOR LINKS MANAGER -->
              <div class="space-y-3 pt-2 border-t border-[#26292d]">
                <label class="block text-[11px] text-cyan-400 font-bold uppercase tracking-wider">Кастомные Ссылки Профиля</label>
                
                <!-- Input Add Row -->
                <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div class="sm:col-span-5">
                    <input
                      type="text"
                      v-model="newLinkLabel"
                      placeholder="Название (например: Telegram, Boosty, YouTube)..."
                      class="w-full bg-[#16181a] border border-[#26292d] text-xs rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div class="sm:col-span-5">
                    <input
                      type="text"
                      v-model="newLinkUrl"
                      placeholder="Ссылка (https://t.me/username или ник)..."
                      class="w-full bg-[#16181a] border border-[#26292d] text-xs rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div class="sm:col-span-2">
                    <button
                      type="button"
                      @click="addCustomLink"
                      class="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                    >
                      + Добавить
                    </button>
                  </div>
                </div>

                <!-- List of Custom Links -->
                <div v-if="profile.customLinks && profile.customLinks.length > 0" class="space-y-2 pt-1">
                  <div
                    v-for="lnk in profile.customLinks"
                    :key="lnk.id"
                    class="flex items-center justify-between p-2.5 bg-[#16181a] border border-[#26292d] rounded-xl text-xs"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="font-bold text-cyan-400">{{ lnk.label }}:</span>
                      <span class="text-slate-300 truncate max-w-xs">{{ lnk.url }}</span>
                    </div>
                    <button
                      type="button"
                      @click="removeCustomLink(lnk.id)"
                      class="text-rose-400 hover:text-white p-1"
                    >
                      <IconRenderer name="Trash2" size="14" />
                    </button>
                  </div>
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
                  <span v-for="b in profile.badges" :key="b" class="text-xs bg-[#16181a] border border-[#26292d] text-[#6ee7b7] px-2 py-0.5 rounded-lg flex items-center gap-1">
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
              <h3 class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 drop-shadow">
                <IconRenderer name="Star" size="14" />
                Прикрепленное руководство автора
              </h3>

              <div
                @click="emit('select-guide', pinnedGuide.meta.id); emit('close');"
                class="group bg-[#0c0d0e]/85 hover:bg-[#121416] border border-amber-500/40 p-5 rounded-2xl cursor-pointer hover:border-amber-400 transition-all flex items-center justify-between shadow-lg backdrop-blur-md"
              >
                <div class="space-y-1">
                  <span class="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                    📌 Главный Гайд
                  </span>
                  <h4 class="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    {{ pinnedGuide.meta.title }}
                  </h4>
                  <p class="text-xs text-slate-300 line-clamp-1">
                    {{ pinnedGuide.meta.summary }}
                  </p>
                </div>
                <IconRenderer name="ChevronRight" size="20" class="text-amber-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <!-- ALL AUTHOR'S GUIDES LIST -->
            <div class="space-y-4 pt-2">
              <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#26292d]/80 pb-2 drop-shadow">
                <IconRenderer name="BookOpen" size="14" class="text-emerald-400" />
                Все гайды автора ({{ authorGuides.length }})
              </h3>

              <div v-if="authorGuides.length === 0" class="text-center py-8 bg-[#0c0d0e]/85 rounded-2xl border border-[#26292d] text-xs text-dark-muted backdrop-blur-md">
                У этого автора пока нет других опубликованных гайдов
              </div>

              <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  v-for="g in displayedAuthorGuides"
                  :key="g.meta.id"
                  @click="emit('select-guide', g.meta.id); emit('close');"
                  class="group p-4 bg-[#0c0d0e]/85 hover:bg-[#121416] border border-[#26292d] hover:border-emerald-500/50 rounded-xl cursor-pointer transition-all space-y-2 backdrop-blur-md shadow-md"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded">
                      {{ g.meta.category }}
                    </span>
                    <span class="text-[10px] text-slate-300 font-mono">{{ g.meta.updatedAt }}</span>
                  </div>
                  <h4 class="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {{ g.meta.title }}
                  </h4>
                </div>

                <!-- SPECIAL 4TH ITEM: VIEW ALL AUTHOR GUIDES CARD IF TOTAL > 4 -->
                <div
                  v-if="authorGuides.length > 4"
                  @click="emit('view-all-guides', username); emit('close');"
                  class="group p-4 bg-gradient-to-br from-emerald-950/80 via-[#0c0d0e]/95 to-cyan-950/80 hover:from-emerald-900/90 hover:to-cyan-900/90 border border-emerald-500/50 hover:border-emerald-400 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center text-center space-y-1.5 backdrop-blur-md shadow-lg"
                >
                  <div class="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <IconRenderer name="ExternalLink" size="14" />
                  </div>
                  <div>
                    <div class="text-xs font-bold text-emerald-300 group-hover:underline">Все гайды автора ({{ authorGuides.length }})</div>
                    <div class="text-[10px] text-slate-400 font-medium">Перейти к полному списку →</div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

      </div>

    </div>

    <!-- STANDALONE MODAL OVERLAY FOR MULTI-STAFF ROLES LIST -->
    <div
      v-if="isTeamRolesModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn"
      @click.self="isTeamRolesModalOpen = false"
    >
      <div class="bg-[#16181a] border border-amber-500/60 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-[#26292d] pb-3">
          <h3 class="text-sm font-black text-amber-400 flex items-center gap-2">
            <IconRenderer name="Shield" size="18" class="text-amber-400" />
            <span>Должности в Персонале ({{ authorTeamRoles.length }})</span>
          </h3>
          <button
            type="button"
            @click="isTeamRolesModalOpen = false"
            class="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-[#26292d] transition-colors"
          >
            <IconRenderer name="X" size="18" />
          </button>
        </div>

        <!-- Author Target Info -->
        <div class="flex items-center gap-3 bg-[#0c0d0e] p-3 rounded-2xl border border-[#26292d]">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-purple-600 p-0.5 shrink-0 overflow-hidden shadow-md">
            <img :src="profile.avatarUrl || `https://cubixworld.net/api/account.load.avatar?login=${encodeURIComponent(username)}`" class="w-full h-full object-cover rounded-[10px]" />
          </div>
          <div>
            <div class="text-xs font-extrabold text-white">{{ username }}</div>
            <div class="text-[11px] text-dark-muted font-medium">Официальные роли на серверах CubixWorld</div>
          </div>
        </div>

        <!-- Scrollable Roles List -->
        <div class="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
          <div
            v-for="(r, idx) in authorTeamRoles"
            :key="idx"
            class="flex items-center justify-between gap-3 bg-[#0c0d0e] p-3 rounded-2xl border border-[#26292d] hover:border-amber-500/40 transition-colors shadow-sm"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
              <span class="text-xs font-black text-amber-300 truncate">{{ r.groupName }}</span>
            </div>
            <span class="text-[10.5px] text-slate-300 font-extrabold px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 whitespace-nowrap shadow-sm">
              🎮 {{ r.serverName }}
            </span>
          </div>
        </div>

        <button
          type="button"
          @click="isTeamRolesModalOpen = false"
          class="w-full py-2.5 rounded-xl bg-[#0c0d0e] hover:bg-[#202327] border border-[#26292d] text-white text-xs font-extrabold transition-all cursor-pointer shadow-md"
        >
          Понятно
        </button>
      </div>
    </div>
  </div>
</template>
