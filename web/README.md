# Aufstieg | Химия — Web & Telegram Mini App

Веб-версия и Telegram Mini App для iPhone, Android и десктопа с тем же дизайном и функционалом, что и нативное Android-приложение:
- Мгновенный поиск по 4 388 синтезам, фильтры (Все / Лекарства / Природные), сортировка, случайный синтез.
- Точечная загрузка синтезов и превью через HTTP `Range`-запросы из нарезанных чанков `pack_00.bin`..`pack_07.bin` (≤ 45 МБ каждый, полностью укладывается в бесплатные лимиты GitHub Pages).
- Два режима просмотра: **Лента** и интерактивная **Схема (змейка)** с зумом, панорамированием и подсинтезами.
- Экспорт 2-страничной PDF-флешкарты A4 (задание + ответы) прямо в браузере.
- Светлая/тёмная тема, адаптивная перекраска формул, интеграция с Telegram `BackButton` и `HapticFeedback`.

## Локальный запуск

1. Если нужно пересобрать чанки данных из `android/app/src/main/assets/cbyd.db`:
   ```bash
   python web/scripts/prepare_data.py
   ```
2. Установить зависимости и запустить dev-сервер:
   ```bash
   cd web
   npm install
   npm run dev
   ```
3. Сборка production-версии:
   ```bash
   npm run build
   ```

## Бесплатный деплой на GitHub Pages + подключение к Telegram

1. Запушьте ветку с папкой `web/` (включая `web/public/data/`) и `.github/workflows/deploy-web.yml` в публичный репозиторий на GitHub.
2. В настройках репозитория: **Settings → Pages → Source** выберите **GitHub Actions**.
3. После завершения workflow получите HTTPS-ссылку вида `https://<username>.github.io/<repo>/`.
4. Откройте `@BotFather` в Telegram → создайте бота (`/newbot`) или выберите существующего → `/mybots` → **Bot Settings → Menu Button** (или `/newapp`) и вставьте вашу HTTPS-ссылку.
5. Готово — теперь приложение открывается на iPhone прямо внутри Telegram (и в Safari как обычный сайт).
