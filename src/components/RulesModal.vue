<script setup lang="ts">
import { ref, computed } from 'vue';
import IconRenderer from './IconRenderer.vue';

defineProps<{ 
  isOpen: boolean;
  embedded?: boolean;
}>();
const emit = defineEmits<{ (e: 'close'): void }>();

// Tab selection: 'general' (Общие правила проекта) | 'server' (Внутриигровые правила серверов)
const activeTab = ref<'general' | 'server'>('general');
const selectedServer = ref<string>('OneBlock');

const searchQuery = ref('');
const activeCategory = ref<string>('all');

const categories = [
  { id: 'all', title: 'Все правила', icon: 'BookOpen' },
  { id: 'general', title: '1. Основные правила', icon: 'FileText' },
  { id: 'chat', title: '2. Общение в чате', icon: 'MessageSquare' },
  { id: 'gameplay', title: '3. Игровой процесс', icon: 'Gamepad2' },
  { id: 'teleport', title: '4. Точки телепортации', icon: 'MapPin' },
  { id: 'staff', title: '5. Команда проекта', icon: 'ShieldAlert' },
  { id: 'donators', title: '6. Донат привилегии', icon: 'Crown' }
];

const availableServers = ref<Array<{ id: string; name: string }>>([
  { id: 'OneBlock', name: 'OneBlock' },
  { id: 'HiTech', name: 'HiTech' },
  { id: 'MagicRPG', name: 'MagicRPG' },
  { id: 'SkyBlock', name: 'SkyBlock' },
  { id: 'TechnoMagic', name: 'TechnoMagic' }
]);

const generalRules = [
  // 1. Основные правила
  {
    cat: 'general',
    num: '1.1',
    title: 'Согласие с правилами',
    text: 'Пройдя регистрацию на нашем проекте, вы автоматически и безоговорочно подтверждаете свою ознакомленность и своё полное согласие с приведенным ниже сводом правил, в таком виде, в котором они есть, и обязуетесь не нарушать их. Незнание правил не освобождает вас от ответственности. В целях безопасности игроков и проекта при регистрации вы даёте согласие на обработку личных данных и личных сообщений на форуме, сайте и в игре. Запомните, шуток мы не понимаем - если вы что-то нарушили, то получили своё соответствующее наказание, поэтому думайте, что вы делаете и что пишите.'
  },
  {
    cat: 'general',
    num: '1.2',
    title: 'Некоммерческий статус и отсутствие гарантий',
    text: 'Проект является бесплатной и некоммерческой структурой, предоставляющей игровые услуги без каких-либо гарантий правильности работы. Вы соглашаетесь с тем, что любые потерянные вами игровые ресурсы, деньги, пожертвованные на счет аккаунта, товары, купленные путём пожертвования в игровом онлайн магазине, и прочее не возвращаются ни при каких условиях и обстоятельствах. Все перечисления на счет являются добровольными пожертвованиями для развития проекта, а платные услуги предоставляются в качестве благодарности за материальную поддержку.'
  },
  {
    cat: 'general',
    num: '1.3',
    title: 'Официальные платежи',
    text: 'Оплата услуг и пополнение денег на счёт предоставляется только на официальном сайте проекта.'
  },
  {
    cat: 'general',
    num: '1.4',
    title: 'Ответственность за безопасность аккаунта',
    text: 'Запомните, вы сами несете ответственность за безопасность вашего аккаунта (используйте уникальные сложные пароли, активируйте двухфакторную авторизацию, не передавайте третьим лицам данные о вашем аккаунте и прочее), а также за любые действия, совершенные под этим аккаунтом. Взлом, кража, "играл не я, мой брат/сестра/бабушка/дедушка и прочее" - не являются оправданием. Администрация по возможности возвращает украденные при взломе вещи.'
  },
  {
    cat: 'general',
    num: '1.5',
    title: 'Игра «как есть» и претензии',
    text: 'Вы подтверждаете свое согласие с тем, что администрация проекта не несет перед вами никакие обязательства, и принимаете то, что игра на проекте предоставляется "как есть" и отказываетесь от каких-либо претензий к их решениям и действиям. Соглашаетесь с тем, что другие члены команды также не несут перед вами каких-либо дополнительных обязательств, кроме общих и должностных, указанных в этом своде правил.'
  },
  {
    cat: 'general',
    num: '1.6',
    title: 'Изъятие ценностей при блокировке',
    text: 'При блокировке аккаунта, все игровые ценности, территория и прочее не будут возвращены или переданы третьим лицам. Так же игровые ценности могут быть изъяты или удалены: - если нет доказательств их получения; - если они были получены нечестным путём (при покупки по низкой цене, при раздаче и прочее) или по какой-то ошибке; - в случае нанесения ущерба другим игрокам (при взломе, гриферстве).'
  },
  {
    cat: 'general',
    num: '1.7',
    title: 'Сфера действия правил общения',
    text: 'Правила общения относятся ко всем видам передачи информации на серверах. К этому относятся голосовой (в данном случае будет выдаваться бан), локальный, глобальный и личный чаты, таблички, префиксы, информационные панели, варпы и прочее.'
  },
  {
    cat: 'general',
    num: '1.8',
    title: 'Подача жалоб на форум',
    text: 'Зафиксированные нарушения подаются не позднее 72 часов на форум. Так же Вышестоящее руководство вправе отказать Вам, если Вы не можете предоставить чётких доказательств того или иного нарушения. Внутриигровой Администратор не обязан отвечать на жалобу непосредственно в игре. Используя форум и правильно составив свой вопрос или жалобу, Вы помогаете её скорейшему рассмотрению и решению.'
  },
  {
    cat: 'general',
    num: '1.9',
    title: 'Локальные правила серверов',
    text: 'На каждом сервере присутствуют свои внутриигровые правила. За нарушение их Вы в свою очередь получите наказание, поэтому внимательно читайте их. Каждый сервер по-своему уникален и поэтому, некоторые правила созданы на форуме в разделе серверов.'
  },
  {
    cat: 'general',
    num: '1.10',
    title: 'Добавление игроков в регион (Приват)',
    text: 'Запомните, Администрация проекта не несёт ответственность за тех игроков, которых вы добавили в приват. В случае обмана, кражи, убийства и прочее - вещи вам скорее всего не вернут, но за гриферство накажут. Если это будет возможно.'
  },
  {
    cat: 'general',
    num: '1.11',
    title: 'Запрещенные никнеймы',
    text: 'Запрещено регистрировать никнеймы, которые:\n- состоят из одних бессмысленных цифр (Пример: 175697699834);\n- нарушают нормы морали и приличия;\n- имеют рекламный подтекст (реклама сервера, групп, упоминание онлайн-игр, проектов);\n- содержат упоминание наркотических веществ, оскорбительный, нецензурный или сексуальный (порнографический) характер;\n- схожи с никами Команды проекта;\n- содержат технические слова (Helper, Moder, Admin, Server, Tester, OP и прочее).',
    penalty: 'Перманентный бан'
  },
  {
    cat: 'general',
    num: '1.12',
    title: 'Запрещенные скины, плащи и аватары',
    text: 'Запрещено устанавливать скины, плащи и аватары:\n- содержащие оскорбительный или нецензурный характер;\n- носящие порнографический характер;\n- имеющие отношение к нацизму (Адам, Ева, Гитлер, Сталин, обнаженный мужчина/женщина и прочее);\n- имеющие символику военных батальонов/организаций.',
    penalty: 'Устное предупреждение на смену / при рецидиве — бан от 1 до 10 дней'
  },
  {
    cat: 'general',
    num: '1.13',
    title: 'Коммерческая деятельность',
    text: 'На серверах запрещена любая коммерческая деятельность (покупать, обменивать, продавать, предоставлять какие-либо услуги за реальные деньги и прочее).',
    penalty: 'Перманентный бан'
  },
  {
    cat: 'general',
    num: '1.14',
    title: 'Реклама сторонних проектов',
    text: 'Запрещена реклама и упоминание сторонних проектов в любом виде.',
    penalty: 'Мут до 2 часов / бан до 4 месяцев'
  },
  {
    cat: 'general',
    num: '1.15',
    title: 'Стороннее ПО, читы и дюпы',
    text: 'Запрещено использование стороннего программного обеспечения: кликеры, программы для взлома, баги, недочеты, дюпы или другие нестандартные средства для получения преимущества над другими игроками. Помимо этого запрещено распространять любую информацию об их существовании.',
    penalty: 'Бан от 1 часа / Перманентный бан'
  },
  {
    cat: 'general',
    num: '1.16',
    title: 'Взлом и разглашение личных данных',
    text: 'Запрещены: взлом, попытки взлома чужого аккаунта, разглашение личных данных других игроков (место проживания, IP-адрес, личные фотографии, видеозаписи, контакты, социальные сети и т.д).',
    penalty: 'Бан от 3 дней / Перманентный бан'
  },
  {
    cat: 'general',
    num: '1.17',
    title: 'Права Управляющего сервера',
    text: 'Управляющий сервера имеет полное право забанить Вас без доказательств (до выяснений обстоятельств).'
  },

  // 2. Общение в чате
  {
    cat: 'chat',
    num: '2.1',
    title: 'Запреты в чате (Мат, Оскорбления, Политика, Наркотики)',
    text: 'Запрещено:\n- использовать мат (в том числе завуалированный/исковерканный) или нецензурную лексику в любом виде;\n- оскорблять или насмехаться (в виде троллинга) над игроками или их родственниками;\n- создавать конфликтные ситуации, путём подстрекания третьего лица на нарушение правил;\n- угрожать расправой в реальной жизни;\n- отправлять пикантные или сексуальные (порнографические) сообщения;\n- разжигать межнациональные розни (расизм, национализм и прочее);\n- пропагандировать суицид, экстремизм, террористические организации;\n- рассказывать про наркотические вещества;\n- призывать к употреблению алкогольной, табачной, наркотической продукции;\n- обсуждать политические действия и ситуации;\n- пропагандировать любую религию.',
    penalty: 'Мут до 40 минут / бан до 7 дней'
  },
  {
    cat: 'chat',
    num: '2.2',
    title: 'Оскорбление Проекта и Команды',
    text: 'Запрещена любая неуместная критика/оскорбление/унижение/принуждение/провокация/сообщения не по теме/троллинг в сторону Команды проекта или самого Проекта (сервера) в целом.',
    penalty: 'Мут от 5 минут / бан от 30 минут / Перманентный бан (при рецидиве — бан по железу)'
  },
  {
    cat: 'chat',
    num: '2.3',
    title: 'Правила торгового чата',
    text: 'Запрещено использование сообщений торгового характера в глобальном чате (не относится к вопросам о цене предмета) и использование торгового чата не по назначению. Для совершения обмена, покупки или продажи перед сообщением вместо «!» нужно использовать «$», либо же переключиться в специальную вкладку чата «Торговый».',
    penalty: 'Мут на 3 минуты'
  },
  {
    cat: 'chat',
    num: '2.4',
    title: 'Попрошайничество',
    text: 'Запрещены любые виды попрошайничества (дать ресурсы, взять в долг, сменить время суток/погоду, построить за вас дом, снизить время выданного наказания и т.д).',
    penalty: 'Мут от 3 до 15 минут / при рецидиве — мут 1 час'
  },
  {
    cat: 'chat',
    num: '2.5',
    title: 'Флуд, Спам, Капс и Транслит',
    text: 'Запрещено:\n- отправлять однотипные сообщения более 2-х раз в 3 минуты;\n- рекламировать варп/товар на рынке более 2-х раз в 10 минут, а также кооперироваться с игроками в целях отправки нескольких однотипных сообщений в один период времени;\n- отправлять бессмысленные сообщения, которые не несут смысловой логики;\n- флуд в чате;\n- спам запросами телепортации или эмодзи, стикерами;\n- использовать капс более 50% (кроме аббревиатур);\n- использовать транслит.',
    penalty: 'Мут до 2 часов / бан до суток'
  },
  {
    cat: 'chat',
    num: '2.6',
    title: 'Дезинформация и слухи',
    text: 'Запрещено дезинформировать игроков и команду проекта, пускать слухи о заведомо ложных изменениях на серверах и вайпах.',
    penalty: 'Мут до 2 часов / бан до 3 дней'
  },

  // 3. Игровой процесс
  {
    cat: 'gameplay',
    num: '3.1',
    title: 'Подобранные вещи в PVP и мире',
    text: 'Игрок, который подобрал ваши вещи в ходе PVP-сражений или найденные в мире, не обязан возвращать вам их.'
  },
  {
    cat: 'gameplay',
    num: '3.2',
    title: 'Порча ландшафта и недопустимые постройки',
    text: 'Запрещается портить внешний вид карты (основной мир), а также:\n- оставлять столбы (если не используются для разметки) и ставить в случайном порядке блоки;\n- рыть глубокие ямы (кроме шахтёрского мира, ада), способные убить игрока при падении;\n- строить символику нацистской Германии или другую символику (включая флаги стран), ведущую к политическим спорам;\n- бессмысленное разлитие жидкостей;\n- строить оскорбительные/порнографические постройки.',
    penalty: 'Удаление постройки + бан от 1 часа до 5 дней (при рецидиве — снос привата + бан от 7 дней до Перманентного)'
  },
  {
    cat: 'gameplay',
    num: '3.3',
    title: 'Дестабилизация экономики и раздачи',
    text: 'Запрещено совершать любые действия, направленные на дестабилизацию экономики сервера:\n- передача игровых ценностей (вещи, кубиксы) для аренды;\n- раздача (продажа предмета за несоответствующую его ценности стоимость, выброс ресурсов, ломание дома, сундуков; удаление привата и прочее).\n*Правило не распространяется на людей, играющих на одном регионе. Любой обход будет наказываться.',
    penalty: 'Бан до 7 дней / Перманентный бан'
  },
  {
    cat: 'gameplay',
    num: '3.4',
    title: 'Точки телепортации-ловушки',
    text: 'Запрещено создавать точки телепортации (дом/варп/релокатор и прочее) в следующих случаях:\n- если точка является ловушкой для других игроков;\n- если точка находится на чужом привате/магазине (без разрешения хозяина привата/магазина).',
    penalty: 'Бан до 5 дней'
  },
  {
    cat: 'gameplay',
    num: '3.5',
    title: 'Ловушки и убийство нечестным путем',
    text: 'Запрещено создавать ловушки для игроков любого вида (перекрывать порталы и прочее), убивать при помощи ведра лавы, зажигалки или иными средствами, способными ранить/убить (приглашать на варп в воздухе, поджигать, отравлять, топить и т.д).',
    penalty: 'Бан до 7 дней / при рецидиве — бан на 14 дней'
  },
  {
    cat: 'gameplay',
    num: '3.6',
    title: 'Мультиаккаунты и обход банов',
    text: 'Запрещено играть на сервере более чем с 5 аккаунтов одновременно и иметь на сервере более 5 аккаунтов, также обходить любой бан (по железу, айпи), менять название комплектующих компьютера.',
    penalty: 'Перманентный бан всех аккаунтов + изъятие ресурсов'
  },
  {
    cat: 'gameplay',
    num: '3.7',
    title: 'Лаго-зоны и нагрузка на сервер',
    text: 'Запрещено всячески дестабилизировать работу серверов, вызывать падения, создавать лаго-зоны; строить механизмы вызывающие избыточную нагрузку; а также выходить за рамки установленного сервером лимитов.',
    penalty: 'Устное предупреждение + снос / при рецидиве — реген привата + бан на 7 дней'
  },
  {
    cat: 'gameplay',
    num: '3.8',
    title: 'Помеха игровому процессу на привате',
    text: 'Запрещено находиться на территории и мешать игровому процессу, если хозяин или участник территории против (в случае, если команда /rgw kick не помогает). Данное правило не распространяется на должностное лицо, проверяющее ваш регион.',
    penalty: 'Бан от 1 часа до 7 дней'
  },
  {
    cat: 'gameplay',
    num: '3.9',
    title: 'Приват впритык к чужому',
    text: 'Запрещено ставить приват впритык к чужому без согласования с хозяином привата, соблюдайте расстояние в 30 блоков от чужого привата. Под регионом и над запрещено размещать приват вовсе.',
    penalty: 'Устное предупреждение / при рецидиве — бан до 7 дней + снос привата'
  },
  {
    cat: 'gameplay',
    num: '3.10',
    title: 'Гриферство',
    text: 'Запрещён «Гриф» в любом виде, а также поиск возможных его способов, независимо от результатов поиска.',
    penalty: 'Бан до 14 дней / при рецидиве — бан до 28 дней'
  },

  // 4. Точки телепортации
  {
    cat: 'teleport',
    num: '4.1',
    title: 'PVP Арены',
    text: 'Запрещено создавать любые пвп арены.',
    penalty: 'Устное предупреждение + снос / бан от 1 часа'
  },
  {
    cat: 'teleport',
    num: '4.2',
    title: 'Публичные качалки',
    text: 'Создание публичной качалки означает то, что вход в неё должен оплачиваться.',
    penalty: 'Устное предупреждение + снос / бан от 1 часа'
  },

  // 5. Команда проекта
  {
    cat: 'staff',
    num: '5.1',
    title: 'Соблюдение правил персоналом',
    text: 'Хелперу-Администратору запрещено нарушать все правила проекта.'
  },
  {
    cat: 'staff',
    num: '5.2',
    title: 'Помощь игрокам и слежка за чатом',
    text: 'Хелпер-Мл.Администратор обязан реагировать на просьбы помощи игроков, следить за чатом и не пропускать нарушителей. Член персонала может отказать в телепортации, если вы не указали причину.'
  },
  {
    cat: 'staff',
    num: '5.3',
    title: 'Выполнение указаний руководства',
    text: 'Хелпер-Администратор обязуется исполнять указания Старшей администрации вовремя, а также по возможности помогать при проведении мероприятий и вайпов.'
  },
  {
    cat: 'staff',
    num: '5.4',
    title: 'Игровой процесс персонала',
    text: 'Хелперу-Мл.Администратору разрешается торговать/жить/участвовать в pvp-сражениях/делать магазины с игроками или без них, но Старшая администрация вправе запретить вышеперечисленное.'
  },
  {
    cat: 'staff',
    num: '5.5',
    title: 'Запрет превышения полномочий',
    text: 'Хелпер-Администратор не имеет права злоупотреблять своими правами (выдавать наказание по максимуму, если нарушение несерьёзное) / мешать / телепортировать / кикать игрока без причины.'
  },
  {
    cat: 'staff',
    num: '5.6',
    title: 'Онлайн персонала',
    text: 'Хелпер-Модератор обязан иметь онлайн не менее 3 часов в день. Ст.Модератор и Мл.Администратор - не менее 2-ух часов (в случае малого онлайна должен сообщить Управляющему причину неактивности).'
  },
  {
    cat: 'staff',
    num: '5.7',
    title: 'Модерирование сторонних ресурсов',
    text: 'Хелперу-Администратору запрещается модерировать на серверах, к которым он не привязан, а также на других игровых проектах.'
  },
  {
    cat: 'staff',
    num: '5.8',
    title: 'Запрет AFK',
    text: 'Хелперу-Мл.Администратору запрещено находиться на сервере в AFK (если нужно отойти, то он должен покинуть сервер).'
  },
  {
    cat: 'staff',
    num: '5.9',
    title: 'Безопасность аккаунта персонала',
    text: 'Хелпер-Администратор обязан самостоятельно следить за безопасностью своего аккаунта. Если к аккаунту члена администрации проекта был получен доступ посторонними лицами, то он будет снят без разбирательств.'
  },
  {
    cat: 'staff',
    num: '5.10',
    title: 'Конфиденциальность информации',
    text: 'Хелперу-Администратору запрещено разглашать посторонним лицам содержание конференций персонала, личных сообщений персонала и Администрации, переговоров с Администрацией.'
  },
  {
    cat: 'staff',
    num: '5.11',
    title: 'Снятие за неактивность',
    text: 'Хелпер-Администратор может быть снят с поста, если он отсутствовал по неуважительной причине 3 дня и более.'
  },
  {
    cat: 'staff',
    num: '5.12',
    title: 'Доказательства нарушений (21 день)',
    text: 'Хелпер-Администратор обязан иметь доказательства нарушения и хранить их в течение 21 дня.'
  },
  {
    cat: 'staff',
    num: '5.13',
    title: 'Предоставление доказательств',
    text: 'Хелпер-Администратор обязан предъявлять доказательства нарушения только Старшей администрации.'
  },
  {
    cat: 'staff',
    num: '5.14',
    title: 'Помощь Управляющему',
    text: 'Мл.Администратор и Администратор обязан помогать Управляющему и следить за командой сервера.'
  },

  // 6. Донат привилегии
  {
    cat: 'donators',
    num: '6.1.1',
    title: 'Право игнорирования нарушений',
    text: 'BModer имеет право игнорировать нарушения других игроков.'
  },
  {
    cat: 'donators',
    num: '6.1.2',
    title: 'Причина наказаний и доказательства (31 день)',
    text: 'При выдаче наказания (kick, mute, ban), BModer обязан указать пункт правил или причину, по которой игрок получил наказание. BModer обязан хранить доказательства нарушений не менее 31-го дня и в случае необходимости предоставить их по требованию руководства.',
    penalty: 'В случае отсутствия док-в — бан до 14 дней / Бан без причины — бан до 21 дня (при рецидиве — бан по железу)'
  },
  {
    cat: 'donators',
    num: '6.1.3',
    title: 'Запрет злоупотребления донатом',
    text: 'BModer запрещено злоупотреблять донат возможностями и командами. Запрещено использовать свой статус в корыстных целях.',
    penalty: 'Бан от 3 до 23 дней / при рецидиве — Перманентный бан'
  },
  {
    cat: 'donators',
    num: '6.1.4',
    title: 'Запрет изменения чужих наказаний',
    text: 'BModer запрещено менять чужие наказания. Для изменения/снятия наказания необходимо обратиться к Ст.Модератору или Администратору.',
    penalty: 'Бан от 7 до 14 дней / при рецидиве — Перманентный бан'
  }
];

// Внутриигровые правила серверов (OneBlock, HiTech и др.)
const serverRulesMap: Record<string, Array<{ num: string; title: string; text: string; note?: string; penalty?: string }>> = {
  OneBlock: [
    {
      num: '4.1',
      title: 'Положение относительно магазинов и варпов',
      text: 'Запрещено создавать собственные магазины / зарядки / качалки / варпы без разрешения, а также изменять их без ведома модерации сервера.',
      note: 'Заявки подаются на форуме в разделе «Магазины». Разрешением является соответствующая табличка проверки модератора с его ником и датой.',
      penalty: 'Закрытие прохода и удаление варпа / Бан до 5 дней / Запрет на создание публичных варпов до конца вайпа'
    },
    {
      num: '4.2',
      title: 'Оформление варпов',
      text: 'Варп должен иметь красивое оформление и быть конструктивно продуманным.',
      penalty: 'Устное предупреждение / Бан от 2 часов до 5 дней / При рецидиве бан до 14 дней'
    },
    {
      num: '1.9',
      title: 'Рыбалка и магнит (/warp fishing)',
      text: 'Запрещено использовать магнит на /warp fishing, пытаться украсть рыбу у других игроков любыми способами.',
      penalty: 'Бан от 12 часов до 7 дней'
    },
    {
      num: '1.10',
      title: 'Проживание на нескольких островах и тиммейты',
      text: 'Запрещено проживать на нескольких островах, быть тиммейтом в нескольких командах игроков. Игрок, состоящий в команде, не может участвовать в развитии других команд (строить или безвозмездно передавать ресурсы).\nЗапрещено иметь более 1 блока генератора OneBlock на команду для фарма ресурсов.',
      note: 'Относится также к общим регионам и передаче ресурсов между островами. Мультиаккаунты также учитываются.',
      penalty: 'Устное предупреждение / Удаление одного из островов / Перманентный бан'
    },
    {
      num: '1.11',
      title: 'Добавление игроков без согласия',
      text: 'Запрещено добавлять игроков в ваш реалм (регион/команду) без их явного согласия.',
      note: 'Предотвращает автоматические нарушения правила 1.10 со стороны других игроков. При нарушении подайте заявку на форум.',
      penalty: 'Устное предупреждение / Бан до 30 дней / Очистка всех участников реалма'
    },
    {
      num: '1.12',
      title: 'Срыв стримов',
      text: 'Запрещено мешать, срывать проведение стримов на проекте.',
      penalty: 'Устное предупреждение / Бан до 3 дней / При рецидиве бан до 14 дней'
    },
    {
      num: '1.13 / 2.1',
      title: 'Лимиты механизмов на острове (OneBlock)',
      text: 'Запрещено превышать лимиты механизмов на острове (не более 16 на чанк / 64 каждого типа на весь остров, если на них не указаны другие индивидуальные ограничения в описании предмета).',
      note: 'Запрещено прятать лишние механизмы в тайных комнатах или распределять их по нескольким островам.',
      penalty: 'Устное предупреждение / Снос до лимита / Изъятие / При рецидиве бан до 14 дней'
    },
    {
      num: '1.14',
      title: 'Правила торговли и обмена',
      text: 'Запрещено нарушать минимальные цены и правила торговли / обмена / передачи предметов на сервере.',
      penalty: 'Изъятие предметов / Бан до 7 дней / Перманентная блокировка'
    }
  ],
  HiTech: [
    {
      num: '3.7.1',
      title: 'Лимит генераторов материи и спавнеров (HiTech)',
      text: 'На сервере HiTech действует строгое ограничение на количество генераторов материи, реакторов и спавнеров душ на один приват.',
      note: 'Точные значения указаны в описании предметов в JEI/NEI.',
      penalty: 'Снос лишних механизмов без компенсации / Бан до 7 дней'
    },
    {
      num: '3.7.2',
      title: 'Ограничение нагрузки на чанк (МЭ сети и кабели)',
      text: 'Запрещено закольцовывать МЭ-шины и вызывать цикличные перезагрузки чанков через жидкостные механизмы.',
      penalty: 'Очистка чанка / Бан до 5 дней'
    }
  ],
  MagicRPG: [
    {
      num: '2.1',
      title: 'Ограничение ритуалов и суммонов (MagicRPG)',
      text: 'Запрещено проводить суммоны боссов и масштабные ритуалы в близости от спавна или чужих приватов.',
      penalty: 'Удаление привата / Бан до 3 дней'
    }
  ],
  SkyBlock: [
    {
      num: '1.5',
      title: 'Правила генераторов руды (SkyBlock)',
      text: 'Запрещено использовать автоматизированные схемы с лагообразующими поршнями на авто-генераторах руды.',
      penalty: 'Устное предупреждение / Снос схемы / Бан до 5 дней'
    }
  ],
  TechnoMagic: [
    {
      num: '3.1',
      title: 'Правила узлов ауры и тауматургии (TechnoMagic)',
      text: 'Запрещено передавать или перемещать узлы ауры на чужие приваты без согласования с владельцами.',
      penalty: 'Изъятие узла / Бан до 3 дней'
    }
  ]
};

import { ONEBLOCK_RULES_DATA } from '../data/serverRulesData';
import { watch, onMounted } from 'vue';

const activeSectionId = ref<number | 'all'>('all');
const loadedServerRules = ref<Record<string, any>>({});

const fetchServerRulesFromApi = async (serverId: string) => {
  try {
    const res = await fetch(`/api/server-rules/${serverId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.server_id) {
        loadedServerRules.value[serverId] = data;
        const cleanId = getBaseServerId(serverId);
        loadedServerRules.value[cleanId] = data;
        const shortId = cleanId.split('_')[0];
        loadedServerRules.value[shortId] = data;
      }
    }
  } catch (e) {
    console.warn(`Не удалось загрузить правила для ${serverId} с API, используем локальный фоллбек`);
  }
};

const isServerPickerOpen = ref(false);

const fetchServerListFromApi = async () => {
  try {
    const res = await fetch('/api/servers');
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        // Исключаем мобильные сервера (Mobile), так как их правила совпадают со старшими братьями
        const desktopServers = list
          .filter((s: string) => !s.toLowerCase().includes('mobile'))
          .map((s: string) => ({ id: s, name: s }));
        
        if (desktopServers.length > 0) {
          availableServers.value = desktopServers;
        }
      }
    }
  } catch (e) {
    console.warn('Не удалось загрузить живой список серверов с /api/servers');
  }
};

// Хелпер получения оригинального сервер ID (убирает -Mobile / _Mobile при вызове правил)
const getBaseServerId = (serverId: string) => {
  return serverId.replace(/[-_]mobile$/i, '');
};

watch(selectedServer, (newServer) => {
  if (newServer) {
    fetchServerRulesFromApi(newServer);
  }
}, { immediate: true });

onMounted(() => {
  fetchServerListFromApi();
  fetchServerRulesFromApi(selectedServer.value);
});

const currentServerData = computed(() => {
  const currentId = selectedServer.value;
  const cleanId = getBaseServerId(currentId);
  const shortId = cleanId.split('_')[0];

  if (loadedServerRules.value[currentId]) return loadedServerRules.value[currentId];
  if (loadedServerRules.value[cleanId]) return loadedServerRules.value[cleanId];
  if (loadedServerRules.value[shortId]) return loadedServerRules.value[shortId];

  if (cleanId === 'OneBlock') return ONEBLOCK_RULES_DATA;
  return null;
});

const filteredGeneralRules = computed(() => {
  return generalRules.filter(r => {
    const matchesCat = activeCategory.value === 'all' || r.cat === activeCategory.value;
    const q = searchQuery.value.toLowerCase().trim();
    const matchesSearch = !q || r.num.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.text.toLowerCase().includes(q) || (r.penalty || '').toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });
});

const filteredServerSections = computed(() => {
  if (!currentServerData.value) return [];
  const q = searchQuery.value.toLowerCase().trim();

  return currentServerData.value.sections.map((sec: any) => {
    if (activeSectionId.value !== 'all' && sec.section_id !== activeSectionId.value) {
      return { ...sec, rules: [] };
    }
    const matchingRules = (sec.rules || []).filter((r: any) => {
      if (!q) return true;
      return (r.rule_id || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.note || '').toLowerCase().includes(q) ||
        (r.punishment || '').toLowerCase().includes(q);
    });
    return { ...sec, rules: matchingRules };
  }).filter((sec: any) => sec.rules.length > 0);
});

const isParsingLoading = ref(false);
const customParseUrl = ref('');
const showParseInput = ref(false);

const handleAutoParseRules = async () => {
  const urlToParse = customParseUrl.value.trim() || 'https://cubixworld.net/forum/topic/35287-vnutriigrovihe-pravila-servera';
  isParsingLoading.value = true;
  try {
    const res = await fetch('/api/admin/parse-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        forumUrl: urlToParse,
        serverId: selectedServer.value,
        serverName: selectedServer.value
      })
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const textResponse = await res.text();
      console.error('[ParseRules API Non-JSON response]:', textResponse);
      throw new Error(`Сервер вернул HTML вместо JSON. Убедитесь, что бэкенд запущен и перезапущен через pm2! (${res.status} ${res.statusText})`);
    }

    const data = await res.json();
    if (res.ok && data.data) {
      loadedServerRules.value[selectedServer.value] = data.data;
      showParseInput.value = false;
      alert(`Успешно! Правила сервера ${selectedServer.value} обновлены прямо с форума.`);
    } else {
      alert(data.error || 'Ошибка при автоматическом парсинге');
    }
  } catch (e: any) {
    alert(`Ошибка парсинга: ${e.message}`);
  } finally {
    isParsingLoading.value = false;
  }
};
</script>

<template>
  <Teleport to="body" :disabled="embedded">
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        :class="embedded ? 'w-full' : 'fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4'"
        @click.self="!embedded && emit('close')"
      >
        <!-- Backdrop (only if modal mode) -->
        <div v-if="!embedded" class="absolute inset-0 bg-black/80 backdrop-blur-md"></div>

        <!-- Container -->
        <div :class="['relative w-full bg-[#16181a] border border-[#26292d] rounded-3xl shadow-2xl flex flex-col overflow-hidden', embedded ? 'min-h-[80vh]' : 'max-w-4xl max-h-[90vh]']">

          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-[#26292d] shrink-0 bg-[#121416]">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-extrabold shadow-lg shadow-emerald-950/50">
                <IconRenderer name="Shield" size="20" />
              </div>
              <div>
                <h2 class="text-base font-black text-white flex items-center gap-2">
                  Правила CubixWorld
                  <span class="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-2 py-0.5 rounded border border-emerald-500/30">Свод правил</span>
                </h2>
                <p class="text-xs text-dark-muted">Официальные правила проекта и внутриигровые ограничение серверов</p>
              </div>
            </div>
            <button
              type="button"
              @click="emit('close')"
              class="w-9 h-9 rounded-xl bg-[#0c0d0e] hover:bg-rose-500/10 text-dark-muted hover:text-rose-400 border border-[#26292d] hover:border-rose-500/30 flex items-center justify-center transition-all"
            >
              <IconRenderer name="X" size="18" />
            </button>
          </div>

          <!-- MAIN TAB SWITCHER BAR: General Rules vs Server In-game Rules -->
          <div class="px-6 py-3 border-b border-[#26292d] bg-[#16181a] shrink-0 flex items-center justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-2 bg-[#0c0d0e] p-1 rounded-2xl border border-[#26292d]">
              <button
                type="button"
                @click="activeTab = 'general'"
                :class="[
                  'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
                  activeTab === 'general'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                    : 'text-dark-muted hover:text-slate-200'
                ]"
              >
                <IconRenderer name="BookOpen" size="15" />
                <span>Общие правила проекта</span>
              </button>

              <button
                type="button"
                @click="activeTab = 'server'"
                :class="[
                  'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
                  activeTab === 'server'
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/50'
                    : 'text-dark-muted hover:text-slate-200'
                ]"
              >
                <IconRenderer name="Gamepad2" size="15" />
                <span>Правила серверов (Внутриигровые)</span>
              </button>
            </div>

            <!-- Server selector dropdown when Server tab active -->
            <div v-if="activeTab === 'server'" class="flex items-center gap-2 relative">
              <span class="text-xs font-bold text-dark-muted">Сервер:</span>
              <div class="relative">
                <button
                  type="button"
                  @click="isServerPickerOpen = !isServerPickerOpen"
                  class="bg-[#0c0d0e] border border-cyan-500/40 text-cyan-300 font-extrabold text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer flex items-center gap-2 hover:border-cyan-400"
                >
                  <span>{{ availableServers.find(s => s.id === selectedServer)?.name || selectedServer }}</span>
                  <IconRenderer name="ChevronDown" size="14" :class="['transition-transform', isServerPickerOpen ? 'rotate-180' : '']" />
                </button>

                <!-- 3-Column Dropdown Menu -->
                <div
                  v-if="isServerPickerOpen"
                  class="absolute top-full right-0 mt-2 w-[480px] max-w-[90vw] bg-[#121416] border border-[#26292d] rounded-2xl shadow-2xl p-3 z-50 space-y-2 backdrop-blur-xl"
                >
                  <div class="text-[10px] font-black text-cyan-400 uppercase tracking-wider px-1">Выберите сервер:</div>
                  <div class="grid grid-cols-3 gap-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <button
                      v-for="srv in availableServers"
                      :key="srv.id"
                      type="button"
                      @click="selectedServer = srv.id; isServerPickerOpen = false"
                      :class="[
                        'px-2.5 py-2 rounded-xl text-xs font-bold text-left transition-all truncate border flex items-center gap-1.5',
                        selectedServer === srv.id
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-black'
                          : 'bg-[#16181a] border-[#26292d] text-slate-300 hover:text-white hover:border-[#383d44] hover:bg-[#1c1f23]'
                      ]"
                    >
                      <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="selectedServer === srv.id ? 'bg-cyan-400' : 'bg-slate-600'"></span>
                      <span class="truncate">{{ srv.name }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Controls Bar: Categories & Search -->
          <div class="px-6 py-3 border-b border-[#26292d] bg-[#0c0d0e] shrink-0 space-y-3">
            <!-- Search input -->
            <div class="relative">
              <input
                type="text"
                v-model="searchQuery"
                :placeholder="activeTab === 'general' ? 'Поиск по номеру правила, тексту или наказанию (например: 1.11, читы, раздача)...' : `Поиск по внутриигровым правилам ${selectedServer} (варпы, макросы, лимиты)...`"
                class="w-full bg-[#16181a] border border-[#26292d] text-white text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-emerald-accent"
              />
              <IconRenderer name="Search" size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
            </div>

            <!-- Category Pills (Only for General Rules tab) -->
            <div v-if="activeTab === 'general'" class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
              <button
                v-for="cat in categories"
                :key="cat.id"
                type="button"
                @click="activeCategory = cat.id"
                :class="[
                  'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border',
                  activeCategory === cat.id
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-950/40'
                    : 'bg-[#16181a] border-[#26292d] text-dark-muted hover:text-slate-200'
                ]"
              >
                <IconRenderer :name="cat.icon" size="13" />
                <span>{{ cat.title }}</span>
              </button>
            </div>

            <!-- Server Info Note (For Server tab) -->
            <div v-else class="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-2.5 text-xs text-cyan-200">
              <div class="flex items-center gap-2">
                <IconRenderer name="Info" size="15" class="text-cyan-400 shrink-0" />
                <span>Показаны внутриигровые правила и ограничения для сервера <strong>{{ selectedServer }}</strong>.</span>
              </div>
              <a
                href="https://cubixworld.net/forum/topic/35287-vnutriigrovihe-pravila-servera"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Тема на форуме</span>
                <IconRenderer name="ExternalLink" size="12" />
              </a>
            </div>
          </div>

          <!-- Scrollable Rules list -->
          <div class="overflow-y-auto custom-scrollbar px-6 py-5 space-y-6 flex-1 bg-[#121416]">
            
            <!-- GENERAL RULES LIST -->
            <template v-if="activeTab === 'general'">
              <div v-if="filteredGeneralRules.length === 0" class="text-center py-12 space-y-2">
                <IconRenderer name="Search" size="32" class="mx-auto text-dark-muted/40" />
                <p class="text-sm font-bold text-slate-400">Правила по запросу не найдены</p>
                <p class="text-xs text-dark-muted">Попробуйте изменить поисковый запрос</p>
              </div>

              <div
                v-for="r in filteredGeneralRules"
                :key="r.num"
                class="p-4 rounded-2xl bg-[#16181a] border border-[#26292d] hover:border-[#383d44] transition-all space-y-2 group"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2.5">
                    <span class="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-extrabold flex items-center justify-center shrink-0">
                      {{ r.num }}
                    </span>
                    <h3 class="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{{ r.title }}</h3>
                  </div>
                </div>

                <p class="text-xs text-slate-300 whitespace-pre-line leading-relaxed pl-9">
                  {{ r.text }}
                </p>

                <!-- Penalty Box -->
                <div v-if="r.penalty" class="ml-9 mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <IconRenderer name="AlertTriangle" size="14" class="text-rose-400 shrink-0" />
                  <span><strong>Наказание:</strong> {{ r.penalty }}</span>
                </div>
              </div>
            </template>

            <!-- SERVER RULES SECTIONED LIST (OneBlock / HiTech) -->
            <template v-else-if="activeTab === 'server'">
              <div v-if="filteredServerSections.length === 0" class="text-center py-12 space-y-2">
                <IconRenderer name="Search" size="32" class="mx-auto text-dark-muted/40" />
                <p class="text-sm font-bold text-slate-400">Правила сервера не найдены</p>
                <p class="text-xs text-dark-muted">Попробуйте изменить поисковый запрос или выбрать другой сервер</p>
              </div>

              <div
                v-for="sec in filteredServerSections"
                :key="sec.section_id"
                class="space-y-3"
              >
                <!-- Section Header Badge -->
                <div class="flex items-center gap-2.5 pt-2 pb-1 border-b border-[#26292d]">
                  <div class="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-black text-xs flex items-center justify-center">
                    {{ sec.section_id }}
                  </div>
                  <h3 class="text-sm font-black text-white tracking-wide uppercase">{{ sec.title }}</h3>
                  <span class="text-[10px] text-dark-muted font-bold">({{ sec.rules.length }} правил)</span>
                </div>

                <!-- Rules in Section -->
                <div
                  v-for="r in sec.rules"
                  :key="r.rule_id"
                  class="p-4 rounded-2xl bg-[#16181a] border border-[#26292d] hover:border-cyan-500/40 transition-all space-y-2 group"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2.5">
                      <span class="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-extrabold flex items-center justify-center shrink-0">
                        {{ r.rule_id }}
                      </span>
                      <h4 class="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">Пункт {{ r.rule_id }}</h4>
                    </div>
                  </div>

                  <p class="text-xs text-slate-300 whitespace-pre-line leading-relaxed pl-9 font-normal">
                    {{ r.description }}
                  </p>

                  <!-- Note Box if exists -->
                  <div v-if="r.note" class="ml-9 mt-2 p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs font-medium space-y-1">
                    <div class="font-extrabold text-[10px] text-cyan-400 uppercase tracking-wider">Примечание:</div>
                    <div class="leading-relaxed">{{ r.note }}</div>
                  </div>

                  <!-- Penalty Box -->
                  <div v-if="r.punishment" class="ml-9 mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                    <IconRenderer name="AlertTriangle" size="14" class="text-rose-400 shrink-0" />
                    <span><strong>Наказание:</strong> {{ r.punishment }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Footer -->
          <div class="px-6 py-3.5 border-t border-[#26292d] bg-[#16181a] shrink-0 flex items-center justify-between">
            <span class="text-xs text-dark-muted">
              Показано записей: <strong class="text-emerald-400">{{ activeTab === 'general' ? filteredGeneralRules.length : filteredServerSections.reduce((acc, s) => acc + s.rules.length, 0) }}</strong>
            </span>
            <button
              type="button"
              @click="emit('close')"
              class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-emerald-950/50"
            >
              Закрыть правила
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
