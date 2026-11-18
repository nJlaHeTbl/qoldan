# Qoldan

Казахстанский маркетплейс «всё нужное для дела рядом»: сельхозтехника и услуги, аренда оборудования,
стройматериалы и остатки, скот, жильё на сутки и заявки «Мне нужно» (обратный аукцион: исполнители сами
предлагают цену). Qoldan не принимает оплату и не берёт комиссию: участники договариваются напрямую.

Подробнее: [PRODUCT_STRUCTURE.md](PRODUCT_STRUCTURE.md) (идея и разделы), [QA_CHECKLIST.md](QA_CHECKLIST.md)
(что проверено), [docs/LAUNCH.md](docs/LAUNCH.md) (запуск и демонстрация), [docs/GROWTH.md](docs/GROWTH.md) (рост и первые пользователи),
[docs/compliance-audit.md](docs/compliance-audit.md) (правовая часть и аудиты).

## Стек

Next-совместимое приложение на [vinext](https://github.com/cloudflare/vinext) + React 19, Cloudflare Workers
(D1 — база, R2 — фото), drizzle (миграции в `drizzle/`), zod (проверка ввода), Leaflet + OpenStreetMap (карта).

## Быстрый старт (локально, без доступа к production)

```bash
npx pnpm@10 install --frozen-lockfile
# один раз: применить миграции к локальной базе (подробности в docs/LAUNCH.md)
node node_modules/vinext/dist/cli.js dev --port 3000
```

Откройте http://localhost:3000. На `localhost` вы автоматически входите как локальный пользователь с правами
модератора; настоящий вход через ChatGPT работает только на опубликованном сайте.

## Проверки

```bash
node --experimental-strip-types scripts/test-requests.mjs          # заявки, отклики, выбор, модерация
node --experimental-strip-types scripts/test-housing.mjs           # жильё, галереи, гонки за фото
node --experimental-strip-types scripts/test-request-selection.mjs
node --experimental-strip-types scripts/test-response-creation.mjs
node --experimental-strip-types scripts/test-legal.mjs             # политика данных и согласия
node --experimental-strip-types scripts/test-settlement-editor.mjs # нужен запущенный dev-сервер
node node_modules/typescript/bin/tsc --noEmit
node node_modules/oxlint/bin/oxlint                                # 65 известных замечаний, новых быть не должно
node node_modules/vinext/dist/cli.js build
```

Если путь к проекту содержит кириллицу, запускайте бинарники через `node node_modules/<пакет>/bin/...`, а не
через `npx`/`pnpm`-обёртки.

## Структура

| Путь | Что там |
|---|---|
| `app/` | страницы и API (`app/api/**`), главный клиент `qoldan-client.tsx`, жильё `app/housing`, правовые страницы `app/legal` |
| `components/` | карта, галерея жилья, баннер cookie, согласия, подвал |
| `lib/` | схемы ввода, работа с БД (`lib/server`), регионы, жильё, реквизиты оператора (`lib/legal.ts`) |
| `drizzle/` | миграции базы данных |
| `scripts/` | тесты на реальных обработчиках и SQLite, импорт населённых пунктов |
| `docs/` | документация по разделам и правовая часть |

## Важно знать

- Dev-сервер подставляет локального пользователя и игнорирует присланные заголовки личности. Сценарии с несколькими
  участниками проверяются тестами в `scripts/`, а не кликами в браузере.
- Права модератора на опубликованном сайте выдаёт список `QOLDAN_ADMIN_USER_IDS` / `QOLDAN_ADMIN_EMAILS`
  (привязки платформы), на `localhost` — встроенный локальный пользователь.
- Миграции production-базы, публикацию сайта и `git push` выполняет только владелец проекта.
