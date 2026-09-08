<script setup lang="ts">
import IconRenderer from './IconRenderer.vue';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'open-invite-input'): void;
}>();

const steps = [
  {
    number: '01',
    title: 'Оформить заявку или получить код',
    description: 'Обратитесь к администрации сервиса для получения персонального инвайт-кода.'
  },
  {
    number: '02',
    title: 'Активировать инвайт',
    description: 'В поле «Активировать код» введите инвайт (например, DC-INV-8A2F) и создайте свой аккаунт автора.'
  },
  {
    number: '03',
    title: 'Писать и публиковать гайды',
    description: 'Используйте интерактивный конструктор гайдов, схемы и палитры для создания лучших руководств.'
  }
];

const perks = [
  { icon: 'Award', title: 'Официальный статус', desc: 'Возможность получить значок проверенного автора за качественные руководства' },
  { icon: 'Shield', title: 'Права модератора', desc: 'Доступ к закрепленным разделам выбранных серверов' },
  { icon: 'Zap', title: 'Интерактивные инструменты', desc: 'Доступ к конструктору Thaumcraft, блокам кода и кастомным компонентам' },
  { icon: 'BarChart2', title: 'Дашборд аналитики', desc: 'Отслеживание просмотров, лайков и рейтинга своих публикаций' }
];
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
    <div class="bg-[#16181a] border border-[#26292d] w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
      
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-[#26292d] pb-4">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-emerald-500 to-indigo-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-cyan-950/50">
            <IconRenderer name="UserPlus" size="22" />
          </div>
          <div>
            <h2 class="text-xl font-extrabold text-white flex items-center gap-2">
              Как стать Автором DarkCore Wiki?
            </h2>
            <p class="text-xs text-dark-muted">Инструкция по получению доступа к созданию руководств</p>
          </div>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="text-dark-muted hover:text-white p-1.5 rounded-xl hover:bg-[#212429] transition-all cursor-pointer"
        >
          <IconRenderer name="X" size="20" />
        </button>
      </div>

      <!-- Hero Banner -->
      <div class="bg-gradient-to-r from-cyan-950/60 via-[#182229] to-indigo-950/60 border border-cyan-500/30 rounded-2xl p-5 space-y-3 relative overflow-hidden">
        <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <span class="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black uppercase tracking-wider">Закрытый клуб авторов</span>
        <h3 class="text-base sm:text-lg font-bold text-white leading-snug">
          Делитесь знаниями, создавайте интерактивные руководства и развивайте комьюнити CubixWorld!
        </h3>
        <p class="text-xs text-slate-300 leading-relaxed">
          Публикация гайдов доступна проверенным игрокам и авторам по персональным пригласительным инвайт-кодам.
        </p>
      </div>

      <!-- Step-by-Step guide -->
      <div class="space-y-3">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Шаги для активации статуса автора:</h4>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div v-for="step in steps" :key="step.number" class="bg-[#0c0d0e] border border-[#26292d] p-4 rounded-2xl space-y-2 relative">
            <span class="text-xs font-black text-cyan-400/80 font-mono">{{ step.number }}</span>
            <h5 class="text-xs font-bold text-white leading-tight">{{ step.title }}</h5>
            <p class="text-[11px] text-dark-muted leading-relaxed">{{ step.description }}</p>
          </div>
        </div>
      </div>

      <!-- Perks Grid -->
      <div class="space-y-3">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Что получает автор гайдов:</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-for="perk in perks" :key="perk.title" class="flex items-start gap-3 bg-[#111315] border border-[#212429] p-3.5 rounded-2xl">
            <div class="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <IconRenderer :name="perk.icon" size="16" />
            </div>
            <div class="space-y-0.5">
              <h5 class="text-xs font-bold text-slate-200">{{ perk.title }}</h5>
              <p class="text-[11px] text-dark-muted leading-snug">{{ perk.desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="bg-[#0c0d0e] border border-[#26292d] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="text-center sm:text-left space-y-1">
          <div class="text-xs font-bold text-white flex items-center gap-1.5 justify-center sm:justify-start">
            <IconRenderer name="Key" size="15" class="text-cyan-400" />
            <span>У вас уже есть инвайт-код?</span>
          </div>
          <p class="text-[11px] text-dark-muted">Активируйте код DC-INV-XXXX и перейдите в конструктор</p>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            @click="emit('open-invite-input'); emit('close');"
            class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <span>Ввести Инвайт-код</span>
            <IconRenderer name="ArrowRight" size="14" />
          </button>
        </div>
      </div>

    </div>
  </div>
</template>
