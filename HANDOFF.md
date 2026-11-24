# Qoldan — передача работы (24.11.2026)

Короткая записка для нового чата. Правила работы — в [AGENTS.md](AGENTS.md), история этапов — в [SAVEPOINT.md](SAVEPOINT.md).

## Что делаем

Qoldan — маркетплейс по Казахстану: объявления, «Мне нужно» (заявки), вторсырьё, жильё, торги, чат.
Стек: vinext (совместим с Next) + React 19, база Cloudflare D1, фото в R2.

- Сайт: https://qoldan-zhetisu.nuc9i218.chatgpt.site (OpenAI Sites). **Публикует только Codex**, push в GitHub сайт не обновляет.
- Код: https://github.com/nJlaHeTbl/qoldan (публичный), ветка `main`, CI зелёный.
- Рабочая копия владельца: `C:\Users\ASUS\Documents\Codex\2026-08-29\referenced-chatgpt-conversation-this-is-an\work\marketplace`.
- Рабочая копия Claude: `C:\Users\ASUS\Documents\ChatGPT\Новые проекты\Qoldan-claude-review`, ветка `claude/launch-readiness`.

## Что готово (уже в `main`)

- RU/KK/EN: главная, страницы объявления и заявки, «Жильё», карта, правовые документы.
- Защита API от запросов с чужих сайтов (`proxy.ts`), заголовки HSTS и CSP (строгая CSP пока в режиме отчёта).
- Полировка дизайна: шапка на всех ширинах, заглушка для битых фото, мобильная панель каталога.
- Исправление гонки удаления фото (`a5f6599`, от Codex).
- Резервные копии: `scripts/backup.mjs`.
- Сборка для обычного Node-сервера и старого Android-телефона: `scripts/pack-phone.mjs`, [docs/ANDROID.md](docs/ANDROID.md) (на телефоне не проверено).
- Проверка перед коммитом: `node scripts/check.mjs` (17 тестов, tsc, линтер).
- Последний коммит в `main`: `ffef9b6` (исправление клиентской навигации в production-сборке).

## Что дальше (порядок запуска)

1. **Codex:** резервная копия production-базы → миграции `0022`–`0026` → `check` → публикация Sites → проверка живого сайта (вход, объявление, заявка, языки).
2. После публикации: если в консоли нет сообщений CSP Report-Only — перевести CSP в строгий режим (шаг 8 в [docs/LAUNCH.md](docs/LAUNCH.md)).
3. Задать администраторов (`QOLDAN_ADMIN_*`) в панели Sites.
4. Юрист РК проверяет правовые документы.
5. Хранение данных в РК — см. [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md).
6. Подключить SMS или e-mail для кодов входа (сейчас код только в журнале сервера).
7. **Claude (следующий этап, после «да» владельца и выпуска Codex):** оставшиеся строки только на русском на главной, двойной подвал, номер «01» в блоке «О приложении». Файлы: `app/qoldan-client.tsx`, `app/globals.css`, `lib/ui-copy.ts`.

## Разделение с Codex

Codex — выпуск Sites, production-база, миграции, секреты. Claude — код интерфейса в своей ветке.
Одни и те же файлы одновременно не правим.
