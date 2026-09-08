import { createRequire } from 'module';
import crypto from 'crypto';
const require = createRequire(import.meta.url);
const TelegramBot = require('node-telegram-bot-api');
import { registerAuthorByAdmin, getAuthorUserByUsername } from './db';

let bot: any = null;

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
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!BOT_TOKEN) {
    console.log('[Telegram Bot] TELEGRAM_BOT_TOKEN не задан в .env. Бот работает в режиме HTTP-уведомлений.');
    return;
  }

  try {
    bot = new TelegramBot(BOT_TOKEN, { polling: true });
    console.log('[Telegram Bot] Бот успешно запущен в упрощенном режиме (polling).');

    // Command /start
    bot.onText(/\/start/, (msg: any) => {
      const chatId = msg.chat.id;
      bot?.sendMessage(
        chatId,
        `👋 **Приветствуем в портале Dark Core Wiki!**\n\nДля подачи заявки на авторство используйте форму на сайте: https://wiki.dark-core.ru/apply-author\n\nЕсли ваша заявка будет одобрена администрацией, вам придет сообщение с данными от аккаунта в этот чат!`,
        { parse_mode: 'Markdown' }
      );
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
  const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
  const messageText = `📥 **НОВАЯ ЗАЯВКА НА АВТОРСТВО**\n\n` +
    `👤 **Никнейм**: \`${appData.username}\`\n` +
    `🎮 **Сервер**: ${appData.server}\n` +
    `💬 **Контакты**: ${appData.telegramTag}\n` +
    `📝 **Опыт**: ${appData.experience}\n` +
    `🔗 **Работы/Ссылки**: ${appData.portfolio}\n\n` +
    `_Выберите решение ниже:_`;

  const approveData = `apv:${appData.username}:${appData.chatId}`;
  const rejectData = `rej:${appData.username}:${appData.chatId}`;

  if (bot && adminChat) {
    try {
      await bot.sendMessage(adminChat, messageText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Одобрить и создать аккаунт', callback_data: approveData },
              { text: '❌ Отклонить', callback_data: rejectData }
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
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Одобрить и создать аккаунт', callback_data: approveData },
                { text: '❌ Отклонить', callback_data: rejectData }
              ]
            ]
          }
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
  const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
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
