<script setup lang="ts">
import IconRenderer from './IconRenderer.vue';

const props = defineProps<{
  guidesCount: number;
  serversCount?: number;
}>();

const emit = defineEmits<{
  (e: 'navigate', mode: string): void;
  (e: 'open-author', username: string): void;
}>();

const currentYear = new Date().getFullYear();

const navLinks = [
  { label: 'Главная', mode: 'home', icon: 'Grid' },
  { label: 'Закладки', mode: 'favorites', icon: 'Star' },
];

const cubixLinks = [
  { label: 'Сайт CubixWorld', icon: 'Globe', url: 'https://cubixworld.net', color: 'hover:text-emerald-400 hover:border-emerald-500/50' },
  { label: 'Мониторинг серверов', icon: 'Activity', url: 'https://online.cubix.world', color: 'hover:text-cyan-400 hover:border-cyan-500/50' },
];

const supportLinks = [
  { label: 'Поддержка в Telegram', icon: 'Send', url: 'https://t.me/CubixWorldbot', color: 'hover:text-sky-400 hover:border-sky-500/50' },
  { label: 'Поддержка в Discord', icon: 'MessageCircle', url: 'https://discord.gg/YY7RmMw', color: 'hover:text-indigo-400 hover:border-indigo-500/50' },
];
</script>

<template>
  <footer class="mt-10 border-t border-[#26292d] bg-gradient-to-b from-[#0c0d0e] to-[#101214]">
    <!-- Top grid section -->
    <div class="px-4 sm:px-6 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

      <!-- Column 1: Brand -->
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-cyan-500 to-purple-600 p-0.5 shadow-lg shadow-emerald-950/50 shrink-0">
            <div class="w-full h-full bg-[#0c0d0e] rounded-[14px] flex items-center justify-center">
              <IconRenderer name="BookOpen" size="20" class="text-emerald-400" />
            </div>
          </div>
          <div>
            <div class="text-base font-black text-white tracking-tight flex items-center gap-1.5">
              CubixGuide
              <span class="bg-emerald-500/20 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/30">WIKI</span>
            </div>
            <div class="text-[10px] text-dark-muted font-semibold tracking-wider">DARK CORE SYSTEM</div>
          </div>
        </div>
        <p class="text-xs text-dark-muted leading-relaxed">
          База знаний и гайдов по серверам CubixWorld. Пошаговые статьи, схемы крафтов, прохождения квестов и сборки механизмов.
        </p>
        <!-- Live stats row -->
        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {{ guidesCount }} гайдов
          </div>
          <div v-if="serversCount" class="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">
            <IconRenderer name="Box" size="11" />
            {{ serversCount }} серверов
          </div>
        </div>
      </div>

      <!-- Column 2: Navigation -->
      <div class="space-y-4">
        <h4 class="text-[10px] font-extrabold uppercase tracking-widest text-dark-muted">Навигация</h4>
        <div class="space-y-2">
          <button
            v-for="link in navLinks"
            :key="link.mode"
            type="button"
            @click="emit('navigate', link.mode)"
            class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#26292d] text-slate-400 text-xs font-semibold transition-all bg-[#16181a] hover:bg-[#1c1f22] hover:text-emerald-400 hover:border-emerald-500/50"
          >
            <IconRenderer :name="link.icon" size="14" />
            {{ link.label }}
          </button>
        </div>
      </div>

      <!-- Column 3: CubixWorld links -->
      <div class="space-y-4">
        <h4 class="text-[10px] font-extrabold uppercase tracking-widest text-dark-muted">CubixWorld</h4>
        <div class="space-y-2">
          <a
            v-for="link in cubixLinks"
            :key="link.label"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            :class="['flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#26292d] text-slate-400 text-xs font-semibold transition-all bg-[#16181a] hover:bg-[#1c1f22]', link.color]"
          >
            <IconRenderer :name="link.icon" size="14" />
            {{ link.label }}
          </a>
        </div>
      </div>

      <!-- Column 4: Support -->
      <div class="space-y-4">
        <h4 class="text-[10px] font-extrabold uppercase tracking-widest text-dark-muted">Поддержка</h4>
        <div class="space-y-2">
          <a
            v-for="link in supportLinks"
            :key="link.label"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            :class="['flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#26292d] text-slate-400 text-xs font-semibold transition-all bg-[#16181a] hover:bg-[#1c1f22]', link.color]"
          >
            <IconRenderer :name="link.icon" size="14" />
            {{ link.label }}
          </a>
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
    <div class="border-t border-[#26292d] px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p class="text-[10px] text-dark-muted font-mono">
        © {{ currentYear }} CubixGuide Wiki · Dark Core System
      </p>
      <a href="https://cubixworld.net" target="_blank" rel="noopener noreferrer" class="text-[10px] text-dark-muted hover:text-emerald-400 transition-colors font-mono">
        cubixworld.net
      </a>
    </div>
  </footer>
</template>
