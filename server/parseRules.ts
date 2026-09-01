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

  // Контейнер текста сообщения на форуме CubixWorld
  const messageText = $('.text[data-v-9d53726e], .text').first();

  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let sectionCounter = 0;

  // Способ 1: Ищем карточки со спином/номерами (например 3.1, 3.2, 1.1)
  const ruleBlocks = messageText.find('div').filter((_, el) => {
    const text = $(el).text().trim();
    // Находим кружочки / плашки с номерами пунктов
    return Boolean(text.match(/^[\d.]{2,6}$/) || $(el).find('span').text().trim().match(/^[\d.]{2,6}$/));
  });

  if (ruleBlocks.length > 0) {
    // Формат старого верстального шаблона (Тема 27979)
    currentSection = {
      section_id: 1,
      title: 'Внутриигровые лимиты и регламент серверов',
      rules: []
    };
    sections.push(currentSection);

    ruleBlocks.each((_, ruleBadge) => {
      const container = $(ruleBadge).closest('div[style*="background"], div[style*="padding"], div');
      const ruleId = $(ruleBadge).text().trim() || $(ruleBadge).find('span').text().trim();
      
      let description = container.find('p').first().text().trim();
      if (!description) {
        description = container.children().not('div').text().trim();
      }

      let note: string | null = null;
      const noteElem = container.find('div').filter((_, e) => $(e).text().includes('Примечание'));
      if (noteElem.length > 0) {
        note = noteElem.text().replace(/^Примечание:\s*/i, '').trim();
      }

      let punishment: string | null = null;
      const penaltyElem = container.find('div').filter((_, e) => $(e).text().includes('Наказание'));
      if (penaltyElem.length > 0) {
        punishment = penaltyElem.text().replace(/^Наказание:\s*/i, '').trim();
      }

      if (ruleId && description) {
        const isExists = currentSection!.rules.some(r => r.rule_id === ruleId);
        if (!isExists) {
          currentSection!.rules.push({
            rule_id: ruleId,
            description: description,
            note: note || null,
            punishment: punishment || null
          });
        }
      }
    });
  } else {
    // Формат верстки для OneBlock / других тем (Тема 35287)
    messageText.find('div').each((_, elem) => {
      const text = $(elem).text().trim();

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
        
        let description = '';
        const descElem = $(elem).find('div').filter((_, el) => $(el).attr('style')?.includes('color: #0f172a') || $(el).attr('style')?.includes('font-weight: 700'));
        if (descElem.length > 0) {
          description = descElem.first().text().trim();
        }

        let note: string | null = null;
        const noteBlock = $(elem).find('div').filter((_, el) => $(el).text().includes('Примечание'));
        if (noteBlock.length > 0) {
          note = noteBlock.text().replace(/^Примечание\s*/i, '').trim();
        }

        let punishment: string | null = null;
        const punishmentBlock = $(elem).find('div').filter((_, el) => $(el).text().includes('Наказание'));
        if (punishmentBlock.length > 0) {
          punishment = punishmentBlock.text().replace(/^Наказание\s*/i, '').trim();
        }

        if (ruleId && (description || punishment)) {
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
  }

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
