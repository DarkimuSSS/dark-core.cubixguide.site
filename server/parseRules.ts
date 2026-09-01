import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

/**
 * Скрипт автоматического парсинга темы внутриигровых правил серверов с форума CubixWorld.net
 * Вызов: npx ts-node server/parseRules.ts <URL> <SERVER_ID>
 */

export interface ParsedRuleItem {
  rule_id: string;
  description: string;
  note: string | null;
  punishment: string | null;
}

export interface ParsedSection {
  section_id: number;
  title: string;
  rules: ParsedRuleItem[];
}

export async function parseForumRulesPage(url: string, serverId: string, serverName?: string) {
  console.log(`[Parser] Загрузка HTML с форума: ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить страницу: ${response.statusText}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  // Кастомный контейнер сообщений форума CubixWorld
  const messageText = $('.text[data-v-9d53726e], .text').first();

  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let sectionCounter = 0;

  // Парсинг блоков
  messageText.find('div').each((_, elem) => {
    const text = $(elem).text().trim();

    // Заголовок секции (например "1.9.4 Положение относительно магазинов| варпов:" или "1.9.2. Лимиты:")
    if (text.match(/^\d+(\.\d+)*\b.*:/i) || $(elem).attr('style')?.includes('font-size: 34px')) {
      sectionCounter++;
      const title = text.replace(/^[\d.]+\s*/, '').replace(/:$/, '').trim();
      currentSection = {
        section_id: sectionCounter,
        title: title || `Раздел ${sectionCounter}`,
        rules: []
      };
      sections.push(currentSection);
      return;
    }

    // Если нашли блок карточки правила (содержит номер правила в кружочке/плашке)
    const ruleNumElem = $(elem).find('span').filter((_, el) => /^\d+\.\d+$/.test($(el).text().trim()));
    if (ruleNumElem.length > 0) {
      if (!currentSection) {
        sectionCounter++;
        currentSection = {
          section_id: sectionCounter,
          title: 'Основные правила',
          rules: []
        };
        sections.push(currentSection);
      }

      const ruleId = ruleNumElem.text().trim();
      
      // Ищем описание
      let description = '';
      const descElem = $(elem).find('div').filter((_, el) => $(el).attr('style')?.includes('color: #0f172a') || $(el).attr('style')?.includes('font-weight: 700'));
      if (descElem.length > 0) {
        description = descElem.first().text().trim();
      }

      // Ищем примечание
      let note: string | null = null;
      const noteBlock = $(elem).find('div').filter((_, el) => $(el).text().includes('Примечание'));
      if (noteBlock.length > 0) {
        note = noteBlock.text().replace(/^Примечание\s*/i, '').trim();
      }

      // Ищем наказание
      let punishment: string | null = null;
      const punishmentBlock = $(elem).find('div').filter((_, el) => $(el).text().includes('Наказание'));
      if (punishmentBlock.length > 0) {
        punishment = punishmentBlock.text().replace(/^Наказание\s*/i, '').trim();
      }

      if (ruleId && (description || punishment)) {
        // Проверяем на дубликаты
        const existing = currentSection.rules.find(r => r.rule_id === ruleId);
        if (!existing) {
          currentSection.rules.push({
            rule_id: ruleId,
            description: description || 'Соблюдайте регламент сервера',
            note: note || null,
            punishment: punishment || null
          });
        }
      }
    }
  });

  const result = {
    server_id: serverId,
    server_name: serverName || serverId,
    description: `Локальные внутриигровые правила и регламенты сервера ${serverName || serverId}`,
    sections: sections.filter(s => s.rules.length > 0)
  };

  console.log(`[Parser] Успешно распарсено ${result.sections.length} секций для сервера ${serverId}`);
  return result;
}

// Запуск напрямую из CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const targetUrl = args[0] || 'https://cubixworld.net/forum/topic/35287-vnutriigrovihe-pravila-servera';
  const targetServerId = args[1] || 'OneBlock';

  parseForumRulesPage(targetUrl, targetServerId)
    .then(data => {
      const outputPath = path.resolve(process.cwd(), `parsed_${targetServerId}_rules.json`);
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`[Parser] Результат сохранен в файл: ${outputPath}`);
    })
    .catch(err => {
      console.error('[Parser] Ошибка парсинга:', err);
    });
}
