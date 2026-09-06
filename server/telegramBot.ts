import TelegramBot from 'node-telegram-bot-api';
// Fallback ESM interop handler for node-telegram-bot-api
const TelegramBotClass: typeof TelegramBot = (TelegramBot as any).default || TelegramBot;
import { registerAuthorByAdmin, getAuthorUserByUsername } from './db';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

let bot: TelegramBot | null = null;

// User state tracker for step-by-step application in Telegram
interface ApplicationState {
  step: 'username' | 'server' | 'experience' | 'portfolio' | 'confirm';
  username?: string;
  server?: string;
  experience?: string;
  portfolio?: string;
}

const userStates = new Map<number, ApplicationState>();

export function initTelegramBot() {
  if (!BOT_TOKEN) {
    console.log('[Telegram Bot] TELEGRAM_BOT_TOKEN не задан в .env. Бот работает в режиме отправки по HTTP Webhook/API.');
    return;
  }

  try {
    bot = new TelegramBotClass(BOT_TOKEN, { polling: true });
    console.log('[Telegram Bot] Бот успешно запущен в режиме polling!');

    // Command /start
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      userStates.delete(chatId);

      const opts: TelegramBot.SendMessageOptions = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📝 Подать заявку на Авторство', callback_data: 'apply_author' }],
            [{ text: '💬 Написать в Поддержку', callback_data: 'support_ticket' }]
          ]
        }
      };

      bot?.sendMessage(
        chatId,
        `👋 **Приветствуем в портале Dark Core Wiki!**\n\nЗдесь вы можете подать заявку на вступление в команду авторов или связаться со службой поддержки сайта.`,
        { parse_mode: 'Markdown', ...opts }
      );
    });

    // Callback query listener (Buttons)
    bot.on('callback_query', async (query) => {
      if (!query.message) return;
      const chatId = query.message.chat.id;
      const data = query.data;

      if (data === 'apply_author') {
        userStates.set(chatId, { step: 'username' });
        bot?.sendMessage(chatId, `📌 **Шаг 1 из 4:** Укажите ваш игровой никнейм на серверах CubixWorld:`, { parse_mode: 'Markdown' });
      } else if (data === 'support_ticket') {
        bot?.sendMessage(chatId, `💬 Напишите ваш вопрос или описание проблемы ниже, и администрация свяжется с вами!`);
      } else if (data?.startsWith('approve_app_')) {
        // Admin approved applicant
        const appDataEncoded = data.replace('approve_app_', '');
        try {
          const [applicantUsername, applicantChatIdStr] = decodeURIComponent(appDataEncoded).split('::');
          const tempPassword = 'dc_' + Math.random().toString(36).substring(2, 8);
          
          // Register author in SQLite
          try {
            registerAuthorByAdmin({
              username: applicantUsername,
              password: tempPassword,
              role: 'author',
              canEditOthers: false,
              canCreateGuides: true
            }, 'TelegramBot');
          } catch (e: any) {
            // Already exists or registered
          }

          bot?.editMessageText(
            query.message.text + `\n\n✅ **ЗАЯВКА ОДОБРЕНА**\nСоздан аккаунт: \`${applicantUsername}\`\nВременный пароль: \`${tempPassword}\``,
            { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown' }
          );

          if (applicantChatIdStr && applicantChatIdStr !== 'web') {
            bot?.sendMessage(
              Number(applicantChatIdStr),
              `🎉 **Ваша заявка на авторство одобрена!**\n\nВаши данные для входа на вики (https://wiki.dark-core.ru):\n👤 Логин: \`${applicantUsername}\`\n🔑 Пароль: \`${tempPassword}\`\n\nСмените пароль в настройках профиля после первого входа!`,
              { parse_mode: 'Markdown' }
            );
          }
        } catch (err: any) {
          bot?.sendMessage(chatId, `Ошибка одобрения: ${err.message}`);
        }
      } else if (data?.startsWith('reject_app_')) {
        bot?.editMessageText(query.message.text + `\n\n❌ **ЗАЯВКА ОТКЛОНЕНА**`, { chat_id: chatId, message_id: query.message.message_id });
      }
    });

    // Step-by-step text message handler
    bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;

      if (!text || text.startsWith('/')) return;

      const state = userStates.get(chatId);
      if (!state) return;

      if (state.step === 'username') {
        state.username = text.trim();
        state.step = 'server';
        bot?.sendMessage(chatId, `🎮 **Шаг 2 из 4:** Укажите основной сервер, на котором вы играете (например, HiTech, OneBlock, GregTech):`, { parse_mode: 'Markdown' });
      } else if (state.step === 'server') {
        state.server = text.trim();
        state.step = 'experience';
        bot?.sendMessage(chatId, `✍️ **Шаг 3 из 4:** Опишите ваш опыт написания гайдов или знания модов:`, { parse_mode: 'Markdown' });
      } else if (state.step === 'experience') {
        state.experience = text.trim();
        state.step = 'portfolio';
        bot?.sendMessage(chatId, `🔗 **Шаг 4 из 4:** Прикрепите ссылки на примеры ваших работ или укажите контакты (Discord/ВК). Напишите "нет", если примеров нет:`, { parse_mode: 'Markdown' });
      } else if (state.step === 'portfolio') {
        state.portfolio = text.trim();
        userStates.delete(chatId);

        bot?.sendMessage(chatId, `✅ **Ваша заявка принята и отправлена старшей администрации!**\nМы уведомим вас о решении в этом чате.`, { parse_mode: 'Markdown' });

        // Forward application card to Admin Chat
        sendApplicationToAdmin({
          username: state.username!,
          server: state.server!,
          experience: state.experience!,
          portfolio: state.portfolio!,
          telegramTag: msg.from?.username ? `@${msg.from.username}` : `ID: ${chatId}`,
          chatId: String(chatId)
        });
      }
    });

  } catch (err: any) {
    console.error('[Telegram Bot] Ошибка инициализации бота:', err.message);
  }
}

/**
 * Forward application card to Admin Telegram Chat
 */
export async function sendApplicationToAdmin(appData: {
  username: string;
  server: string;
  experience: string;
  portfolio: string;
  telegramTag: string;
  chatId: string;
}) {
  const adminChat = ADMIN_CHAT_ID;
  const messageText = `📥 **НОВАЯ ЗАЯВКА НА АВТОРСТВО**\n\n` +
    `👤 **Никнейм**: \`${appData.username}\`\n` +
    `🎮 **Сервер**: ${appData.server}\n` +
    `💬 **Контакты**: ${appData.telegramTag}\n` +
    `📝 **Опыт**: ${appData.experience}\n` +
    `🔗 **Работы/Ссылки**: ${appData.portfolio}\n\n` +
    `_Выберите решение abaixo:_`;

  const callbackPayload = encodeURIComponent(`${appData.username}::${appData.chatId}`);

  if (bot && adminChat) {
    try {
      await bot.sendMessage(adminChat, messageText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Одобрить и создать аккаунт', callback_data: `approve_app_${callbackPayload}` },
              { text: '❌ Отклонить', callback_data: `reject_app_${callbackPayload}` }
            ]
          ]
        }
      });
    } catch (e: any) {
      console.error('Ошибка отправки сообщения администратору Telegram:', e.message);
    }
  } else if (BOT_TOKEN && adminChat) {
    // Pure HTTP Fetch Fallback
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChat,
          text: messageText,
          parse_mode: 'Markdown'
        })
      });
    } catch (e: any) {
      console.error('HTTP Telegram Send Error:', e.message);
    }
  }
}

/**
 * Send support ticket to Admin Telegram Chat
 */
export async function sendSupportTicketToAdmin(ticket: {
  username?: string;
  contact: string;
  message: string;
  pageUrl?: string;
}) {
  const adminChat = ADMIN_CHAT_ID;
  const text = `💬 **НОВОЕ ОБРАЩЕНИЕ В ПОДДЕРЖКУ**\n\n` +
    `👤 **Пользователь**: ${ticket.username || 'Гость'}\n` +
    `📞 **Контакты**: \`${ticket.contact}\`\n` +
    `📄 **Страница**: ${ticket.pageUrl || 'Главная'}\n\n` +
    `💬 **Сообщение**:\n${ticket.message}`;

  if (bot && adminChat) {
    try {
      await bot.sendMessage(adminChat, text, { parse_mode: 'Markdown' });
    } catch (e: any) {}
  } else if (BOT_TOKEN && adminChat) {
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChat,
          text,
          parse_mode: 'Markdown'
        })
      });
    } catch (e: any) {}
  }
}
