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

const socialLinks = [
  { label: 'ВКонтакте', icon: 'ExternalLink', url: 'https://vk.com/cubixworld', color: 'hover:text-blue-400 hover:border-blue-500/50' },
  { label: 'Telegram', icon: 'Send', url: 'https://t.me/cubixworld', color: 'hover:text-sky-400 hover:border-sky-500/50' },
  { label: 'Discord', icon: 'MessageCircle', url: 'https://discord.gg/cubixworld', color: 'hover:text-indigo-400 hover:border-indigo-500/50' },
];

const categories = ['ХайТек', 'Магия RPG', 'СкайБлок', 'Автоматизация', 'Общий'];
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
          Официальный портал руководств и гайдов по серверам CubixWorld. Пошаговые статьи, схемы крафтов, прохождения квестов и сборки механизмов.
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
        <ul class="space-y-2">
          <li v-for="link in navLinks" :key="link.mode">
            <button
              type="button"
              @click="emit('navigate', link.mode)"
              class="flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition-colors group"
            >
              <IconRenderer :name="link.icon" size="13" class="text-dark-muted group-hover:text-emerald-400 transition-colors" />
              {{ link.label }}
            </button>
          </li>
        </ul>
      </div>

      <!-- Column 3: Categories -->
      <div class="space-y-4">
        <h4 class="text-[10px] font-extrabold uppercase tracking-widest text-dark-muted">Категории</h4>
        <ul class="space-y-2">
          <li v-for="cat in categories" :key="cat">
            <button
              type="button"
              @click="emit('navigate', 'home')"
              class="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
            >
              {{ cat }}
            </button>
          </li>
        </ul>
      </div>

      <!-- Column 4: Socials + info -->
      <div class="space-y-4">
        <h4 class="text-[10px] font-extrabold uppercase tracking-widest text-dark-muted">Сообщество</h4>
        <div class="space-y-2">
          <a
            v-for="social in socialLinks"
            :key="social.label"
            :href="social.url"
            target="_blank"
            rel="noopener noreferrer"
            :class="['flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#26292d] text-slate-400 text-xs font-semibold transition-all bg-[#16181a] hover:bg-[#1c1f22]', social.color]"
          >
            <IconRenderer :name="social.icon" size="14" />
            {{ social.label }}
          </a>
        </div>

        <!-- Author credit -->
        <div class="pt-2">
          <button
            type="button"
            @click="emit('open-author', 'DarkimuSSS')"
            class="flex items-center gap-2 text-[10px] text-dark-muted hover:text-emerald-400 transition-colors"
          >
            <div class="w-5 h-5 rounded-md bg-gradient-to-tr from-emerald-600 via-cyan-500 to-purple-600 p-0.5 shrink-0">
              <div class="w-full h-full bg-[#0c0d0e] rounded-[4px] flex items-center justify-center">
                <span class="text-[8px] font-black text-emerald-400">D</span>
              </div>
            </div>
            Главный Администратор: DarkimuSSS
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
    <div class="border-t border-[#26292d] px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p class="text-[10px] text-dark-muted font-mono">
        © {{ currentYear }} CubixGuide Wiki · Dark Core System · Все права защищены
      </p>
      <div class="flex items-center gap-4 text-[10px] text-dark-muted">
        <span class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Все сервисы работают штатно
        </span>
        <span class="text-[#26292d]">|</span>
        <span>Powered by Vue 3 + Vite</span>
      </div>
    </div>
  </footer>
</template>
