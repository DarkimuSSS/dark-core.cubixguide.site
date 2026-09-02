<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import IconRenderer from './IconRenderer.vue';

const emit = defineEmits<{
  (e: 'go-home'): void;
  (e: 'open-author', username: string): void;
}>();

const isLoading = ref(true);
const teamData = ref<Record<string, any>>({});
const selectedServerFilter = ref<string>('all');
const searchQuery = ref('');

const fetchTeam = async () => {
  isLoading.value = true;
  try {
    const res = await fetch('/api/team');
    if (res.ok) {
      const data = await res.json();
      console.log('API Response:', data);

      const parsedServers: any[] = [];
      const rootObj = (data && data.team) ? data.team : data;

      if (rootObj && typeof rootObj === 'object') {
        Object.keys(rootObj).forEach(key => {
          const serverBlock = rootObj[key];
          if (serverBlock && typeof serverBlock === 'object' && serverBlock.server_name) {
            const memberList: any[] = [];
            const rawTeamObj = serverBlock.team || {};

            Object.keys(rawTeamObj).forEach(mKey => {
              const member = rawTeamObj[mKey];
              if (member && member.name) {
                memberList.push({
                  id: member.id || Math.random(),
                  name: member.name,
                  group: member.group,
                  group_name: member.group_name || 'Персонал',
                  server: member.server,
                  server_name: member.server_name || serverBlock.server_name
                });
              }
            });

            if (memberList.length > 0) {
              parsedServers.push({
                serverId: serverBlock.server_id || Math.random(),
                serverName: serverBlock.server_name,
                members: memberList
              });
            }
          }
        });
      }

      teamData.value = parsedServers;
    }
  } catch (e) {
    console.error('Error fetching team API:', e);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchTeam();
});

const serverList = computed(() => {
  const list: { id: number; name: string }[] = [];
  if (Array.isArray(teamData.value)) {
    teamData.value.forEach((srv: any) => {
      if (srv && srv.serverName) {
        list.push({ id: srv.serverId, name: srv.serverName });
      }
    });
  }
  return list;
});

// Role priority hierarchy for sorting (higher priority first)
const getRolePriority = (groupName: string): number => {
  const g = (groupName || '').toLowerCase();
  if (g.includes('главный') || g.includes('руковод') || g.includes('разработ')) return 100;
  if (g.includes('старший администратор')) return 90;
  if (g.includes('администратор')) return 80;
  if (g.includes('мл') || g.includes('младший')) return 70;
  if (g.includes('модератор')) return 60;
  if (g.includes('хелпер')) return 50;
  if (g.includes('строитель')) return 40;
  return 10;
};

const totalStaffCount = computed(() => {
  let count = 0;
  filteredTeam.value.forEach(g => {
    count += g.members.length;
  });
  return count;
});

// Group staff members by server and handle multi-role staff
const filteredTeam = computed(() => {
  const result: { serverId: number; serverName: string; members: any[] }[] = [];
  const query = searchQuery.value.toLowerCase().trim();
  const serversArray = Array.isArray(teamData.value) ? teamData.value : [];

  serversArray.forEach((srv: any) => {
    const srvName = srv.serverName || '';
    if (selectedServerFilter.value !== 'all' && srvName !== selectedServerFilter.value) {
      return;
    }

    const members: any[] = [];
    (srv.members || []).forEach((m: any) => {
      if (!query || m.name.toLowerCase().includes(query) || (m.group_name && m.group_name.toLowerCase().includes(query))) {
        members.push(m);
      }
    });

    if (members.length > 0) {
      members.sort((a, b) => getRolePriority(b.group_name) - getRolePriority(a.group_name));

      result.push({
        serverId: srv.serverId,
        serverName: srvName,
        members
      });
    }
  });

  return result;
});

const getRoleBadgeStyle = (groupName: string) => {
  const g = (groupName || '').toLowerCase();
  if (g.includes('главный') || g.includes('руковод') || g.includes('разработ')) {
    return 'bg-purple-600/30 text-purple-200 border-purple-400/60 shadow-purple-950/60 font-black';
  }
  if (g.includes('старший администратор')) {
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-950/40';
  }
  if (g.includes('администратор')) {
    return 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-purple-950/40';
  }
  if (g.includes('мл') || g.includes('младший')) {
    return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-950/40';
  }
  if (g.includes('модератор')) {
    return 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-blue-950/40';
  }
  if (g.includes('хелпер')) {
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-950/40';
  }
  if (g.includes('строитель')) {
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-950/40';
  }
  return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
};
</script>

<template>
  <div class="space-y-6 pb-24 animate-in fade-in duration-300">
    <!-- Header Bar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#26292d] pb-5">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-md">
            <IconRenderer name="Shield" size="24" />
          </div>
          <div>
            <h1 class="text-2xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>Команда Проекта CubixWorld</span>
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">STAFF</span>
              <span v-if="totalStaffCount > 0" class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                {{ totalStaffCount }} человек
              </span>
            </h1>
            <p class="text-xs text-dark-muted">Официальный состав администрации, модераторов, хелперов и строителей всех серверов</p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="fetchTeam"
          :disabled="isLoading"
          class="px-3.5 py-2 rounded-xl bg-[#16181a] hover:bg-[#202327] border border-[#26292d] text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
        >
          <IconRenderer name="RotateCw" size="14" :class="['text-amber-400', isLoading ? 'animate-spin' : '']" />
          <span>Обновить состав</span>
        </button>

        <button
          @click="emit('go-home')"
          class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <span>На Главную</span>
        </button>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#16181a] p-4 rounded-2xl border border-[#26292d]">
      <!-- Server Filter Select -->
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <label class="text-xs font-bold text-dark-muted whitespace-nowrap">Сервер:</label>
        <select
          v-model="selectedServerFilter"
          class="bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer w-full sm:w-64"
        >
          <option value="all">Все сервера ({{ serverList.length }})</option>
          <option v-for="srv in serverList" :key="srv.id" :value="srv.name">
            {{ srv.name }}
          </option>
        </select>
      </div>

      <!-- Search Input -->
      <div class="relative w-full sm:w-72">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Поиск по никнейму или должности..."
          class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-amber-500"
        />
        <IconRenderer name="Search" size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="py-20 text-center space-y-3">
      <div class="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <div class="text-xs text-dark-muted">Загрузка состава Команды Проекта...</div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredTeam.length === 0" class="py-20 text-center bg-[#16181a] border border-[#26292d] rounded-3xl space-y-2">
      <IconRenderer name="Shield" size="36" class="mx-auto text-amber-500/30" />
      <div class="text-sm font-bold text-white">Члены персонала по вашему запросу не найдены</div>
      <div class="text-xs text-dark-muted">Попробуйте изменить фильтр сервера или поисковый запрос</div>
    </div>

    <!-- Staff Grid grouped by Server -->
    <div v-else class="space-y-6">
      <div v-for="group in filteredTeam" :key="group.serverId" class="p-6 rounded-3xl bg-[#16181a] border border-[#26292d] shadow-xl space-y-4">
        <!-- Server Title Header -->
        <div class="flex items-center justify-between border-b border-[#26292d] pb-3">
          <h3 class="text-base font-black text-white flex items-center gap-2">
            <span class="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">🎮</span>
            <span>{{ group.serverName }}</span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Состав: {{ group.members.length }}
            </span>
          </h3>
        </div>

        <!-- Members Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <div
            v-for="m in group.members"
            :key="`${m.id}_${group.serverId}`"
            @click="emit('open-author', m.name)"
            class="p-3.5 rounded-2xl bg-[#0c0d0e] border border-[#26292d] hover:border-amber-500/50 transition-all cursor-pointer flex items-center gap-3 group/card shadow-md hover:shadow-lg"
          >
            <!-- Member Avatar -->
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-purple-600 to-cyan-500 p-0.5 shrink-0 shadow-md">
              <div class="w-full h-full bg-[#0c0d0e] rounded-[10px] flex items-center justify-center overflow-hidden">
                <img :src="`https://cubixworld.net/api/account.load.avatar?login=${encodeURIComponent(m.name)}`" class="w-full h-full object-cover" />
              </div>
            </div>

            <!-- Member Info -->
            <div class="min-w-0 flex-1 space-y-0.5">
              <div class="text-xs font-extrabold text-white group-hover/card:text-amber-300 transition-colors truncate">
                {{ m.name }}
              </div>

              <div :class="['inline-block text-[9.5px] font-extrabold px-2 py-0.5 rounded-full border shadow-sm truncate', getRoleBadgeStyle(m.group_name)]">
                {{ m.group_name }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
