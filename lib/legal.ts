// Operator details are deliberately placeholders: fill them in before launch.
// scripts/test-legal.mjs lists every placeholder that is still unfilled.
export const LEGAL_UPDATED = '14 ноября 2026';

export const OPERATOR = {
  name: '[НАИМЕНОВАНИЕ ОПЕРАТОРА]',
  id: '[БИН/ИИН ОПЕРАТОРА]',
  address: '[ЮРИДИЧЕСКИЙ АДРЕС]',
  email: '[E-MAIL ДЛЯ ЗАПРОСОВ]',
} as const;

export const LEGAL_DOCS = [
  { href: '/legal/privacy', title: 'Политика защиты персональных данных' },
  { href: '/legal/terms', title: 'Публичная оферта (пользовательское соглашение)' },
  { href: '/legal/returns', title: 'Условия возврата, отмены и споров' },
  { href: '/legal/cookies', title: 'Политика cookie и локального хранилища' },
] as const;

export const COOKIE_NOTICE_KEY = 'qoldan-cookie-notice-v1';

export const isPlaceholder = (value: string) => value.startsWith('[');
