import type { UserRole, UserPermission, SystemRoleDefinition } from '../types/guide';

export const SYSTEM_PERMISSIONS: { key: UserPermission; label: string; description: string }[] = [
  { key: 'create_guide', label: 'Создание гайдов', description: 'Разрешает создавать новые гайды и сохранять черновики' },
  { key: 'edit_own_guide', label: 'Правка своих гайдов', description: 'Разрешает редактировать собственные статьи' },
  { key: 'edit_other_guide', label: 'Правка чужих гайдов', description: 'Разрешает вносить изменения в статьи других авторов' },
  { key: 'delete_own_guide', label: 'Удаление своих гайдов', description: 'Разрешает безвозвратно удалять свои статьи' },
  { key: 'delete_other_guide', label: 'Удаление чужих гайдов', description: 'Разрешает удалять статьи других авторов' },
  { key: 'publish_guide', label: 'Публикация гайдов', description: 'Разрешает публиковать статьи в открытый доступ' },
  { key: 'approve_guide', label: 'Модерация & Одобрение', description: 'Одобрение гайдов авторов и модерация статей' },
  { key: 'manage_authors', label: 'Управление авторами', description: 'Разрешает регистрировать авторов и сбрасывать им пароли' },
  { key: 'manage_roles', label: 'Управление ролями и правами', description: 'Разрешает изменять роли и точечные права пользователей' },
  { key: 'view_telemetry', label: 'Доступ к Телеметрии', description: 'Просмотр статистики просмотров, поиска и логов действий' },
  { key: 'view_rules', label: 'Просмотр правил', description: 'Просмотр общих и внутриигровых правил всех серверов' },
  { key: 'manage_rules', label: 'Управление правилами', description: 'Разрешает редактировать внутриигровые и общие правила' }
];

export const DEFAULT_SYSTEM_ROLES: Record<UserRole, SystemRoleDefinition> = {
  super_admin: {
    role: 'super_admin',
    name: 'Главный Администратор',
    description: 'Полный неограниченный доступ ко всем системам и правам',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    priority: 0,
    permissions: [
      'create_guide', 'edit_own_guide', 'edit_other_guide', 'delete_own_guide',
      'delete_other_guide', 'publish_guide', 'approve_guide', 'manage_authors', 'manage_roles',
      'view_telemetry', 'view_rules', 'manage_rules'
    ]
  },
  admin: {
    role: 'admin',
    name: 'Администратор',
    description: 'Управление статьями, модерацией, авторами, правилами и аналитикой',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    priority: 10,
    permissions: [
      'create_guide', 'edit_own_guide', 'edit_other_guide', 'delete_own_guide',
      'delete_other_guide', 'publish_guide', 'approve_guide', 'manage_authors', 'view_telemetry', 'view_rules', 'manage_rules'
    ]
  },
  manager: {
    role: 'manager',
    name: 'Управляющий',
    description: 'Управление закрепленными серверами, публикация, одобрение статей и модерация',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    priority: 15,
    permissions: [
      'create_guide', 'edit_own_guide', 'edit_other_guide', 'delete_own_guide',
      'delete_other_guide', 'publish_guide', 'approve_guide', 'view_telemetry', 'view_rules', 'manage_rules'
    ]
  },
  editor: {
    role: 'editor',
    name: 'Редактор',
    description: 'Проверка, редактирование, модерация и публикация статей',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    priority: 20,
    permissions: [
      'create_guide', 'edit_own_guide', 'edit_other_guide', 'delete_own_guide', 'publish_guide', 'approve_guide', 'view_rules'
    ]
  },
  author: {
    role: 'author',
    name: 'Автор статей',
    description: 'Создание и редактирование собственных вики-гайдов',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    priority: 30,
    permissions: [
      'create_guide', 'edit_own_guide', 'delete_own_guide', 'publish_guide', 'view_rules'
    ]
  },
  helper: {
    role: 'helper',
    name: 'Хелпер / Соавтор',
    description: 'Создание черновиков статей без права прямой публикации',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    priority: 40,
    permissions: [
      'create_guide', 'edit_own_guide', 'view_rules'
    ]
  },
  guest: {
    role: 'guest',
    name: 'Читатель',
    description: 'Чтение опубликованных руководств и страниц правил',
    badgeColor: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
    priority: 999,
    permissions: ['view_rules']
  }
};

/**
 * Получить числовой приоритет роли (0 — высшая, 999 — низшая).
 */
export function getRolePriority(role: UserRole | undefined): number {
  if (!role) return 999;
  return DEFAULT_SYSTEM_ROLES[role]?.priority ?? 999;
}

/**
 * Проверяет, может ли пользователь с ролью callerRole управлять пользователем/целью targetRole.
 * Управление разрешено ТОЛЬКО если у вызвавшего приоритет строго выше (число меньше),
 * либо если оба super_admin.
 */
export function canManageTargetRole(callerRole: UserRole | undefined, targetRole: UserRole | undefined): boolean {
  if (!callerRole) return false;
  if (callerRole === 'super_admin') return true;
  
  const callerPriority = getRolePriority(callerRole);
  const targetPriority = getRolePriority(targetRole);

  // Вызвавший должен иметь роль более высокого ранга (меньший priority)
  return callerPriority < targetPriority;
}

/**
 * Проверка наличия атомарного права строго на основе назначенного у пользователя Role.
 */
export function hasPermission(
  userRole: UserRole | undefined,
  _customPermissions: UserPermission[] | undefined,
  permission: UserPermission
): boolean {
  if (!userRole) return false;
  if (userRole === 'super_admin') return true;

  const roleDef = DEFAULT_SYSTEM_ROLES[userRole];
  return roleDef ? roleDef.permissions.includes(permission) : false;
}
