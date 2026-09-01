<script setup lang="ts">
import IconRenderer from './IconRenderer.vue';

defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[999] flex items-center justify-center p-4"
        @click.self="emit('close')"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

        <!-- Modal -->
        <div class="relative w-full max-w-2xl max-h-[85vh] bg-[#16181a] border border-[#26292d] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-[#26292d] shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <IconRenderer name="FileText" size="16" />
              </div>
              <div>
                <h2 class="text-sm font-black text-white">Пользовательское соглашение</h2>
                <p class="text-[10px] text-dark-muted">CubixGuide Wiki · Dark Core System</p>
              </div>
            </div>
            <button
              type="button"
              @click="emit('close')"
              class="w-8 h-8 rounded-xl bg-[#0c0d0e] hover:bg-rose-500/10 text-dark-muted hover:text-rose-400 border border-[#26292d] hover:border-rose-500/30 flex items-center justify-center transition-all"
            >
              <IconRenderer name="X" size="15" />
            </button>
          </div>

          <!-- Scrollable content -->
          <div class="overflow-y-auto custom-scrollbar px-6 py-5 space-y-6 text-xs text-slate-300 leading-relaxed">

            <p class="text-dark-muted text-[11px]">
              Последнее обновление: 2026 г. Используя данный сайт, вы принимаете условия, изложенные ниже.
            </p>

            <!-- Section 1 -->
            <section class="space-y-2">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <span class="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black flex items-center justify-center border border-emerald-500/30">1</span>
                Статус ресурса
              </h3>
              <p>
                CubixGuide Wiki является независимым фанатским ресурсом и <strong class="text-white">не связан официально</strong> с проектом CubixWorld, его владельцами и разработчиками. Все упоминания названий серверов, игровых механик и брендов используются исключительно в информационных целях.
              </p>
            </section>

            <!-- Section 2 -->
            <section class="space-y-2">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <span class="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black flex items-center justify-center border border-emerald-500/30">2</span>
                Ресурс предоставляется «как есть»
              </h3>
              <p>
                Сайт предоставляется в состоянии <strong class="text-white">«как есть» (as is)</strong> без каких-либо явных или подразумеваемых гарантий — включая, но не ограничиваясь: гарантиями точности, актуальности, полноты информации, бесперебойной работы или отсутствия ошибок.
              </p>
              <p>
                Мы оставляем за собой право в любой момент без предупреждения изменить, ограничить доступ или прекратить работу сайта.
              </p>
            </section>

            <!-- Section 3 -->
            <section class="space-y-2">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <span class="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black flex items-center justify-center border border-emerald-500/30">3</span>
                Ограничение ответственности
              </h3>
              <p>
                Администрация сайта <strong class="text-white">не несёт ответственности</strong> за любые прямые или косвенные последствия использования материалов сайта — включая потерю игрового прогресса, бан аккаунта, неверно выполненные постройки или иные последствия, возникшие в результате следования гайдам.
              </p>
              <p>
                Вся информация носит <strong class="text-white">исключительно ознакомительный характер</strong>. Вы применяете её на собственный страх и риск.
              </p>
            </section>

            <!-- Section 4 -->
            <section class="space-y-2">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <span class="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black flex items-center justify-center border border-emerald-500/30">4</span>
                Поведение пользователей
              </h3>
              <p>
                Авторы гайдов несут личную ответственность за размещаемый ими контент. Запрещается публиковать материалы, нарушающие законодательство, содержащие оскорбления, спам или заведомо ложную информацию. Администрация вправе удалить любой контент без объяснения причин.
              </p>
            </section>

            <!-- Section 5 -->
            <section class="space-y-2">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <span class="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black flex items-center justify-center border border-emerald-500/30">5</span>
                Безопасность и авторизация CubixWorld
              </h3>
              <p>
                Авторизация через сервер CubixWorld используется <strong class="text-white">исключительно для сквозного подтверждения владения аккаунтом</strong>. 
                Наш ресурс <strong class="text-emerald-400">НЕ сохраняет, НЕ логирует и НЕ передаёт третьим лицам</strong> ваши пароли от игрового аккаунта. 
              </p>
              <p>
                Передача учетных данных происходит по прямой зашифрованной TCP-связи с официальным сервером авторизации. CubixGuide Wiki является неофициальным независимым ресурсом и не несёт ответственности за действия сторонних сервисов.
              </p>
            </section>

            <!-- Section 6 -->
            <section class="space-y-2">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <span class="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black flex items-center justify-center border border-emerald-500/30">6</span>
                Интеллектуальная собственность
              </h3>
              <p>
                Тексты гайдов и материалы, опубликованные авторами, принадлежат соответствующим авторам. Права на игровой контент, скриншоты и механики принадлежат их правообладателям. Копирование материалов сайта без указания источника не приветствуется.
              </p>
            </section>

            <!-- Section 6 -->
            <section class="space-y-2">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <span class="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black flex items-center justify-center border border-emerald-500/30">6</span>
                Изменения соглашения
              </h3>
              <p>
                Мы можем обновлять данное соглашение в любое время. Продолжение использования сайта после публикации изменений означает ваше согласие с новыми условиями.
              </p>
            </section>

            <!-- Disclaimer box -->
            <div class="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
              <IconRenderer name="AlertTriangle" size="16" class="text-amber-400 shrink-0 mt-0.5" />
              <p class="text-[11px] text-amber-200/80 leading-relaxed">
                Используя CubixGuide Wiki, вы подтверждаете, что ознакомились с настоящим соглашением, понимаете его условия и принимаете их в полном объёме.
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-[#26292d] shrink-0 flex justify-end">
            <button
              type="button"
              @click="emit('close')"
              class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-950/50"
            >
              Понятно
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
