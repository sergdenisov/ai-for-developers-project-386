# Календарь звонков

[![hexlet-check](https://github.com/sergdenisov/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/sergdenisov/ai-for-developers-project-386/actions)

Разработайте совместно с ИИ сервис для бронирования календаря

Учебный проект Хекслета: <https://ru.hexlet.io/programs/ai-for-developers>
Как это должно работать: <https://files.hexlet.app/a/2ipc5m>

## Стек

- **Контракт API:** TypeSpec → OpenAPI → клиентский SDK (`@hey-api/openapi-ts`)
- **Бэкенд:** Node.js 24, TypeScript, Fastify 5, хранение данных в памяти процесса
  - Тесты: Vitest
- **Фронтенд:** React 19, TypeScript, Vite
  - UI: Mantine 9 (`@mantine/core`, `@mantine/dates`, `@mantine/form`, `@mantine/notifications`)
  - Запросы к API: сгенерированный SDK + TanStack Query 5
  - Роутинг: React Router
  - Даты: dayjs
  - Тесты: Vitest + Testing Library, Playwright
- **Деплой:** Docker

## Установка

Всё окружение описано в `mise.toml`: версии инструментов, переменные окружения, задачи и фоновые dev-серверы.
Нужен [mise](https://mise.jdx.dev/getting-started.html).

```bash
git clone https://github.com/sergdenisov/ai-for-developers-project-386.git
cd ai-for-developers-project-386
mise install   # инструменты, а через хук postinstall — npm-зависимости и git-хуки
```

### Разработка

```bash
mise run dev                  # бэкенд (http://127.0.0.1:3000) и фронтенд (http://127.0.0.1:5173) в фоне
mise daemons status           # состояние dev-серверов
mise daemons logs backend     # логи (backend или frontend)
mise daemons restart frontend # перезапуск
mise daemons stop             # остановить всё

mise run check   # все проверки, как в CI
mise run fix     # безопасные автоисправления (форматирование и т. п.)
mise run build   # сборка бэкенда и фронтенда
mise run start   # сборка и запуск собранного бэкенда
mise tasks       # все задачи
```

Dev-серверы работают как daemons mise под управлением [pitchfork](https://pitchfork.jdx.dev/), поэтому их можно
запускать, останавливать и смотреть их состояние из любого терминала. Порты задаются в `mise.toml`
(`BACKEND_PORT`, `FRONTEND_PORT`).

### Контракт API

Репозиторий состоит из трёх npm-пакетов: `spec` (контракт на TypeSpec), `backend` и `frontend`. API описывается
сначала в `spec/main.tsp`, а код по нему генерируется:

```text
spec/main.tsp ── tsp compile ──> spec/openapi.yaml (OpenAPI 3.0.0)
                                  ├── openapi-ts ──> frontend/src/api/generated/  SDK: клиент fetch + TanStack Query
                                  └── openapi-ts ──> backend/src/api/generated/   типы обработчиков + копия контракта
```

```bash
mise run generate        # пересобрать OpenAPI, SDK и типы бэкенда после правки spec/main.tsp
mise run check:contract  # проверить, что закоммиченное сгенерированное совпадает с контрактом
```

Генератор `@hey-api/openapi-ts` и его настройки (`spec/openapi-ts.config.ts`) живут в пакете `spec` вместе с
TypeScript 6: генератору нужен API компилятора TypeScript, которого нет в TypeScript 7 бэкенда и фронтенда.
Сгенерированные файлы коммитятся и руками не правятся (ADR 0003). Бэкенд отдаёт API под `/api`, а Vite в dev и в
`vite preview` проксирует `/api` на бэкенд. API-тесты запускают приложение с `validateResponses`: ответ, которого нет
в контракте, превращается в ошибку 500.

## Коммиты

Сообщения коммитов пишем по [Conventional Commits](https://www.conventionalcommits.org/ru/v1.0.0/):

```text
<тип>(<область>): <описание>
```

- **Типы:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore`, `perf`, `revert`
- **Область** (необязательно): `backend`, `frontend`, `spec`
- **Ломающие изменения:** `!` после типа или области (`feat(spec)!: ...`) либо `BREAKING CHANGE:` в теле коммита

Примеры:

```text
feat(backend): add event types endpoint
fix(frontend): show validation error on booking form
docs: describe commit conventions
```

## Сценарии работы

### Владелец

1. Заходит на главную страницу, где видит 2 ссылки в заголовке страницы: "Записаться" и "Админка", а также контент
лендинга с описанием возможностей сервиса и так же кнопкой "Записаться".
2. Нажимаем на ссылку "Админка".
3. Видит уже созданные типы событий (если они есть), список предстоящих событий (с именем пользователя, его почтой,
слотом и временем создания) и кнопку "Создать тип события".
4. Нажимает на кнопку "Создать тип события".
5. Открывается форма с полями "Название" (обязательное поле), описание (необязательное поле) и длительность
(обязательное поле).
6. Заполняет их, например "Встреча"/"Короткий тип события для быстрого слота"/"15 минут" и нажимает кнопку
"Создать тип события".
7. Видит в списке новый созданный тип события и уведомление, что новый тип события успешно создан.

### Гость

1. Заходит на главную страницу, где видит 2 ссылки в заголовке страницы: "Записаться" и "Админка", а также контент
лендинга с описанием возможностей сервиса и так же кнопкой "Записаться".
2. Нажимаем на кнопку/ссылку "Записаться".
3. Видит список доступных типов событий.
4. Нажимает на один из типов событий.
5. Открывается календарь с доступным интервалом в 14 дней.
6. Нажимает на какой-либо день в календаре.
7. Открывается список доступных слотов на этот день.
8. Выбирает какой-либо слот.
9. Открывается форму, где надо указать имя и почту, а так же информацию о записи на событие (выбранную дату,
выбранное время и длительность).
10. Указывает их и нажимает на кнопку "Подтвердить запись".
11. Видит надпись "Запись подтверждена" и кнопку "Записаться еще" (которая возвращает к шагу 5).

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте
и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой
наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
