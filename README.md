# Mezhduly Labs

Astro-сайт с русской и английской версиями.

## Команды

```sh
npm run build
npm run astro -- check
npm test
npm run translate:status
npm run translate
```

Для разработки используйте фоновый режим:

```sh
npm run astro -- dev --background
```

Остановить, проверить состояние и посмотреть логи можно командами `astro dev stop`, `astro dev status` и `astro dev logs`.

## Статьи

Русские оригиналы находятся в `src/content/articles/ru`, английские версии — в `src/content/articles/en`. Файлы с одинаковым именем образуют пару.

Порядок публикации задаётся в `src/data/article-order.ts`. Один и тот же массив используется для обоих языков.

```sh
npm run translate:status
npm run translate
npm run translate -- --id article-2 --force
```

Переводчик читает `GEMINI_API_KEY` из `.env`. Ключ не должен попадать в клиентский код или репозиторий. Обычная команда обращается к Gemini только для статей, у которых отсутствует английский файл. Уже существующие переводы не перезаписываются. Для повторного перевода используйте `--force` вместе с именем одной статьи через `--id`.

При необходимости модель можно переопределить через `GEMINI_MODEL`. По умолчанию используется `gemini-3.5-flash-lite` с минимальным уровнем thinking.

## Видео

Видео хранятся в `src/data/videos.ts` отдельно для `ru` и `en`. Карточка содержит только `videoUrl` и `excerpt`.
