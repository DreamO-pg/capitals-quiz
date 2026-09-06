# Столицы — Telegram Mini App

Игра-викторина про столицы стран. Личная: без рекламы, аккаунтов, аналитики и бэкенда.
Статика на GitHub Pages, прогресс — в `CloudStorage` телеграма.

## Стек

- Vite 6 + TypeScript + React 18, сборка в `dist/`
- Telegram Mini Apps SDK — скриптом в `index.html`, всё через `window.Telegram.WebApp`
- Шрифты (Literata, Golos Text) — в бандле через `@fontsource`, внешних запросов нет
- Единственное, что грузится извне в рантайме, — тайлы OpenStreetMap на экране ответа
  (появятся на этапе 5)

## Разработка

```bash
npm install
npm run dev        # http://localhost:5173 — работает и без телеграма
npm run build      # сборка в dist/
npm run preview    # посмотреть собранное
npm run typecheck  # tsc без эмита
```

Вне телеграма игра работает на `localStorage`, без тактильного отклика и без системной
кнопки «назад». Падать при этом не должна — если упала, это баг.

## Деплой на GitHub Pages

1. Создать репозиторий и запушить:

   ```bash
   git remote add origin git@github.com:<username>/capitals-quiz.git
   git push -u origin main
   ```

2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
   Дальше `.github/workflows/deploy.yml` собирает и публикует на каждый push в `main`.

3. Адрес страницы: `https://<username>.github.io/capitals-quiz/`

### Имя репозитория и base path

`base` в [`vite.config.ts`](vite.config.ts) задан константой `REPO = 'capitals-quiz'`.
Если репозиторий назван иначе — поменять её, иначе на Pages не подхватятся ассеты
(белый экран, 404 на `assets/*`).

Исключение: репозиторий вида `<username>.github.io` живёт в корне — тогда `REPO` заменить
на пустую строку и убрать слэши, `base: '/'`.

## Подключение к боту (BotFather)

1. `/newbot` — создать бота, забрать токен (никуда его в код не кладём, он не нужен:
   бэкенда нет).
2. `/newapp` → выбрать бота → название, описание, иконку 640×360 → **Web App URL**:
   `https://<username>.github.io/capitals-quiz/`
   Короткое имя даст прямую ссылку `t.me/<bot>/<short_name>`.
3. Чтобы игра открывалась кнопкой в чате: `/mybots` → бот → **Bot Settings → Menu Button →
   Configure menu button** → тот же URL и подпись кнопки.

После смены URL или пересборки телеграм может отдавать старую версию из кеша: в клиенте
долгий тап по мини-приложению → «Перезагрузить», либо закрыть и открыть заново.

## Структура

```
src/
  telegram/       обёртка над WebApp SDK + фолбэк на браузер
  theme/          токены палитры, радиусов, шрифтов
  hooks/          вьюпорт, системная кнопка «назад»
  components/     оболочка экрана, дальше — флаг, карта, варианты
  screens/        главная, вопрос, ответ, итог, статистика
  data/           countries.ts — 195 стран (этап 2)
  engine/         подбор вопросов, Лейтнер, хранилище (этап 3)
```

## Что уже сделано

- **Этап 1** — каркас: сборка, обёртка над SDK, токены темы, шрифты, пустые экраны,
  деплой.

Дальше по плану: данные стран → движок → экраны вопроса и ответа → карта → статистика →
полировка.
