import { createRequire } from 'module';
import crypto from 'crypto';
const require = createRequire(import.meta.url);
const rawTelegramBot = require('node-telegram-bot-api');
const TelegramBot = rawTelegramBot.default || rawTelegramBot;
import { registerAuthorByAdmin, getAuthorUserByUsername } from './db';

let bot: any = null;



export function initTelegramBot() {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!BOT_TOKEN) {
    console.log('[Telegram Bot] TELEGRAM_BOT_TOKEN не задан в .env. Бот работает в режиме HTTP-уведомлений.');
    return;
  }

  try {
    bot = new TelegramBot(BOT_TOKEN, { polling: true });
    console.log('[Telegram Bot] Бот успешно запущен в упрощенном режиме (polling).');

    // Command /start & message listener
    bot.on('message', (msg: any) => {
      if (!msg.text) return;
      const text = msg.text.trim();
      const chatId = msg.chat.id;

      if (text.startsWith('/start')) {
        bot?.sendMessage(
          chatId,
          `👋 **Приветствуем в портале Dark Core Wiki!**\n\nДля подачи заявки на авторство используйте форму на сайте: https://wiki.dark-core.ru/apply-author\n\nЕсли ваша заявка будет одобрена администрацией, вам придет сообщение с данными от аккаунта в этот чат!`,
          { parse_mode: 'Markdown' }
        ).catch((e: any) => console.error('[Telegram Bot] Send message error:', e.message));
      }
    });

  } catch (err: any) {
    console.error('[Telegram Bot] Ошибка инициализации бота:', err.message);
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
