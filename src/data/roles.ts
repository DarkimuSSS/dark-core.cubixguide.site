import type { UserRole, UserPermission, SystemRoleDefinition } from '../types/guide';

export const SYSTEM_PERMISSIONS: { key: UserPermission; label: string; description: string }[] = [
  { key: 'create_guide', label: 'Создание гайдов', description: 'Разрешает создавать новые гайды и сохранять черновики' },
  { key: 'edit_own_guide', label: 'Правка своих гайдов', description: 'Разрешает редактировать собственные статьи' },
  { key: 'edit_other_guide', label: 'Правка чужих гайдов', description: 'Разрешает вносить изменения в статьи других авторов' },
  { key: 'delete_own_guide', label: 'Удаление своих гайдов', description: 'Разрешает безвозвратно удалять свои статьи' },
  { key: 'delete_other_guide', label: 'Удаление чужих гайдов', description: 'Разрешает удалять статьи других авторов' },
  { key: 'publish_guide', label: 'Публикация гайдов', description: 'Разрешает публиковать статьи в открытый доступ' },
  { key: 'manage_authors', label: 'Управление авторами', description: 'Разрешает регистрировать авторов и сбрасывать им пароли' },
  { key: 'manage_roles', label: 'Управление ролями и правами', description: 'Разрешает изменять роли и точечные права пользователей' },
  { key: 'view_telemetry', label: 'Доступ к Телеметрии', description: 'Просмотр статистики просмотров, поиска и логов действий' },
  { key: 'manage_rules', label: 'Управление правилами', description: 'Разрешает редактировать внутриигровые и общие правила' }
];

export const DEFAULT_SYSTEM_ROLES: Record<UserRole, SystemRoleDefinition> = {
  super_admin: {
    role: 'super_admin',
    name: 'Главный Администратор',
    description: 'Полный неограниченный доступ ко всем системам и правам',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    permissions: [
      'create_guide', 'edit_own_guide', 'edit_other_guide', 'delete_own_guide',
      'delete_other_guide', 'publish_guide', 'manage_authors', 'manage_roles',
      'view_telemetry', 'manage_rules'
    ]
  },
  admin: {
    role: 'admin',
    name: 'Администратор',
    description: 'Управление статьями, авторами, правилами и аналитикой',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    permissions: [
      'create_guide', 'edit_own_guide', 'edit_other_guide', 'delete_own_guide',
      'delete_other_guide', 'publish_guide', 'manage_authors', 'view_telemetry', 'manage_rules'
    ]
  },
  editor: {
    role: 'editor',
    name: 'Редактор',
    description: 'Проверка, редактирование и публикация статей всех авторов',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    permissions: [
      'create_guide', 'edit_own_guide', 'edit_other_guide', 'delete_own_guide', 'publish_guide'
    ]
  },
  author: {
    role: 'author',
    name: 'Автор статей',
    description: 'Создание и редактирование собственных вики-гайдов',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    permissions: [
      'create_guide', 'edit_own_guide', 'delete_own_guide', 'publish_guide'
    ]
  },
  helper: {
    role: 'helper',
    name: 'Хелпер / Соавтор',
    description: 'Создание черновиков статей без права прямой публикации',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    permissions: [
      'create_guide', 'edit_own_guide'
    ]
  },
  guest: {
    role: 'guest',
    name: 'Читатель',
    description: 'Только чтение опубликованных руководств',
    badgeColor: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
    permissions: []
  }
};

/**
 * Проверка наличия конкретного атомарного права у пользователя.
 * Учитывает назнанную роль + персональные точечные переопределения (customPermissions).
 */
export function hasPermission(
  userRole: UserRole | undefined,
  customPermissions: UserPermission[] | undefined,
  permission: UserPermission
): boolean {
  if (!userRole) return false;
  if (userRole === 'super_admin') return true;

  // Если заданы точечные кастомные права, проверяем их
  if (Array.isArray(customPermissions) && customPermissions.length > 0) {
    return customPermissions.includes(permission);
  }

  // Иначе берем дефолтный набор прав роли
  const roleDef = DEFAULT_SYSTEM_ROLES[userRole];
  return roleDef ? roleDef.permissions.includes(permission) : false;
}
