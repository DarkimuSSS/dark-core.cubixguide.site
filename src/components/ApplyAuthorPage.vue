<script setup lang="ts">
import { ref } from 'vue';
import IconRenderer from './IconRenderer.vue';

const emit = defineEmits<{
  (e: 'navigate', mode: string): void;
}>();

const activeTab = ref<'apply' | 'support'>('apply');

// Application form fields
const appUsername = ref('');
const appServer = ref('');
const appContacts = ref('');
const appExperience = ref('');
const appPortfolio = ref('');
const isSubmittingApp = ref(false);
const appSuccessMsg = ref('');
const appErrorMsg = ref('');

// Support form fields
const supportContact = ref('');
const supportMessage = ref('');
const isSubmittingSupport = ref(false);
const supportSuccessMsg = ref('');
const supportErrorMsg = ref('');

const handleSendApplication = async () => {
  appSuccessMsg.value = '';
  appErrorMsg.value = '';

  if (!appUsername.value.trim() || !appServer.value.trim() || !appExperience.value.trim()) {
    appErrorMsg.value = 'Заполните все обязательные поля (Никнейм, Сервер, Опыт)';
    return;
  }

  isSubmittingApp.value = true;
  try {
    const res = await fetch('/api/apply-author', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: appUsername.value.trim(),
        server: appServer.value.trim(),
        telegramTag: appContacts.value.trim() || 'Не указан',
        experience: appExperience.value.trim(),
        portfolio: appPortfolio.value.trim() || 'Нет',
        chatId: 'web'
      })
    });

    if (res.ok) {
      appSuccessMsg.value = '🎉 Ваша заявка успешно отправлена администрации! Мы свяжемся с вами в Telegram/Discord.';
      appUsername.value = '';
      appServer.value = '';
      appContacts.value = '';
      appExperience.value = '';
      appPortfolio.value = '';
    } else {
      const err = await res.json().catch(() => ({}));
      appErrorMsg.value = err.error || 'Ошибка отправки заявки. Попробуйте позже.';
    }
  } catch (e: any) {
    appErrorMsg.value = 'Ошибка сети. Проверьте подключение.';
  } finally {
    isSubmittingApp.value = false;
  }
};

const handleSendSupport = async () => {
  supportSuccessMsg.value = '';
  supportErrorMsg.value = '';

  if (!supportContact.value.trim() || !supportMessage.value.trim()) {
    supportErrorMsg.value = 'Укажите контакт для связи и текст обращения';
    return;
  }

  isSubmittingSupport.value = true;
  try {
    const res = await fetch('/api/support-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact: supportContact.value.trim(),
        message: supportMessage.value.trim(),
        pageUrl: window.location.href
      })
    });

    if (res.ok) {
      supportSuccessMsg.value = '✅ Ваше обращение отправлено в службу поддержки! Ответим в ближайшее время.';
      supportContact.value = '';
      supportMessage.value = '';
    } else {
      const err = await res.json().catch(() => ({}));
      supportErrorMsg.value = err.error || 'Ошибка отправки обращения.';
    }
  } catch (e: any) {
    supportErrorMsg.value = 'Ошибка сети при отправке обращения.';
  } finally {
    isSubmittingSupport.value = false;
  }
};
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
    
    <!-- Hero Header -->
    <div class="relative bg-gradient-to-r from-[#16181a] via-[#1a1d21] to-[#16181a] border border-[#26292d] rounded-3xl p-6 sm:p-10 overflow-hidden shadow-2xl">
      <div class="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="relative z-10 space-y-4">
        <div class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-bold">
          <IconRenderer name="Sparkles" size="14" />
          <span>Присоединяйся к Dark Core Team</span>
        </div>
        <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Стань Автором Вики и Развивай Сообщество
        </h1>
        <p class="text-sm text-dark-muted max-w-2xl leading-relaxed">
          Создавай гайды по любимым серверам CubixWorld, делишься опытом, получай уникальный статус верифицированного автора и поддержку от команды Dark Core.
        </p>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center justify-center">
      <div class="bg-[#16181a] border border-[#26292d] p-1.5 rounded-2xl flex items-center gap-2 shadow-lg">
        <div class="px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg">
          <IconRenderer name="UserPlus" size="16" />
          <span>Заявка на Авторство</span>
        </div>
      </div>
    </div>

    <!-- TAB 1: APPLICATION FORM -->
    <div v-if="activeTab === 'apply'" class="space-y-6">
      
      <!-- Advantages Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-[#16181a] border border-[#26292d] rounded-2xl p-5 space-y-2">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <IconRenderer name="ShieldCheck" size="20" />
          </div>
          <h3 class="text-sm font-bold text-white">Верификация и Бейдж</h3>
          <p class="text-xs text-dark-muted leading-relaxed">Синяя галочка подтверждённого автора в профиле и статус в командном списке.</p>
        </div>

        <div class="bg-[#16181a] border border-[#26292d] rounded-2xl p-5 space-y-2">
          <div class="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
            <IconRenderer name="Layout" size="20" />
          </div>
          <h3 class="text-sm font-bold text-white">Кабинет Редактора</h3>
          <p class="text-xs text-dark-muted leading-relaxed">Полный визуальный конструктор блоков, загрузка скриншотов и аналитика просмотров.</p>
        </div>

        <div class="bg-[#16181a] border border-[#26292d] rounded-2xl p-5 space-y-2">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <IconRenderer name="Award" size="20" />
          </div>
          <h3 class="text-sm font-bold text-white">Бонусы и Награды</h3>
          <p class="text-xs text-dark-muted leading-relaxed">Поощрение лучших гайдов, упоминание в статьях и закрытом чате авторов.</p>
        </div>
      </div>

      <!-- Application Form -->
      <div class="bg-[#16181a] border border-[#26292d] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <h3 class="text-base font-extrabold text-white flex items-center gap-2">
          <IconRenderer name="PenTool" size="18" class="text-emerald-400" />
          <span>Онлайн-форма подачи заявки</span>
        </h3>

        <div v-if="appSuccessMsg" class="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-medium leading-relaxed flex items-center gap-3">
          <IconRenderer name="CheckCircle" size="20" class="text-emerald-400 flex-shrink-0" />
          <span>{{ appSuccessMsg }}</span>
        </div>

        <div v-if="appErrorMsg" class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-medium flex items-center gap-3">
          <IconRenderer name="AlertTriangle" size="20" class="text-rose-400 flex-shrink-0" />
          <span>{{ appErrorMsg }}</span>
        </div>

        <form @submit.prevent="handleSendApplication" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Ваш никнейм на CubixWorld *</label>
              <input
                type="text"
                v-model="appUsername"
                placeholder="например, DarkimuSSS"
                class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-accent"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Основной сервер *</label>
              <input
                type="text"
                v-model="appServer"
                placeholder="например, HiTech #1, GregTech, OneBlock"
                class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-accent"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1.5">Контакт для связи (Telegram или Discord) *</label>
            <input
              type="text"
              v-model="appContacts"
              placeholder="@username в Telegram или discord_tag"
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-accent"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1.5">Ваш опыт и знание модов *</label>
            <textarea
              v-model="appExperience"
              rows="3"
              placeholder="Расскажите о том, в каких модах вы разбираетесь лучше всего..."
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl p-3.5 focus:outline-none focus:border-emerald-accent"
            ></textarea>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1.5">Ссылки на ваши гайды или работы (опционально)</label>
            <input
              type="text"
              v-model="appPortfolio"
              placeholder="Ссылки на статьи, посты на форуме или темы..."
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-accent"
            />
          </div>

          <button
            type="submit"
            :disabled="isSubmittingApp"
            class="w-full py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span v-if="isSubmittingApp" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Отправить Заявку Администрации</span>
          </button>
        </form>
      </div>
    </div>

    <!-- TAB 2: SUPPORT TICKETS FORM -->
    <div v-if="activeTab === 'support'" class="space-y-6">
      <div class="bg-[#16181a] border border-[#26292d] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <h3 class="text-base font-extrabold text-white flex items-center gap-2">
          <IconRenderer name="HelpCircle" size="18" class="text-cyan-400" />
          <span>Обращение в Поддержку Вики</span>
        </h3>
        <p class="text-xs text-dark-muted leading-relaxed">
          Нашли ошибку в гайде? Нашли баг в работе сайта или хотите предложить идею нового инструмента? Напишите нам!
        </p>

        <div v-if="supportSuccessMsg" class="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-medium flex items-center gap-3">
          <IconRenderer name="CheckCircle" size="20" class="text-emerald-400 flex-shrink-0" />
          <span>{{ supportSuccessMsg }}</span>
        </div>

        <div v-if="supportErrorMsg" class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-medium flex items-center gap-3">
          <IconRenderer name="AlertTriangle" size="20" class="text-rose-400 flex-shrink-0" />
          <span>{{ supportErrorMsg }}</span>
        </div>

        <form @submit.prevent="handleSendSupport" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1.5">Ваш контакт для ответа (Telegram / VK / Discord) *</label>
            <input
              type="text"
              v-model="supportContact"
              placeholder="@username или ваш ник"
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-accent"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1.5">Текст сообщения или оглавление проблемы *</label>
            <textarea
              v-model="supportMessage"
              rows="5"
              placeholder="Подробно опишите вашу проблему или предложение..."
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl p-3.5 focus:outline-none focus:border-emerald-accent"
            ></textarea>
          </div>

          <button
            type="submit"
            :disabled="isSubmittingSupport"
            class="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span v-if="isSubmittingSupport" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Отправить Сообщение</span>
          </button>
        </form>
      </div>
    </div>

  </div>
</template>
