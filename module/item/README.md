# Item Module

Здесь живёт item-level логика BRP: document lifecycle, дефолтные значения, roll preparation и item sheets. После рефакторинга document-класс, default icon mapping и roll context разделены, чтобы добавление новых item types не требовало править один большой файл.

## Файлы и папки

- `item.mjs` — основной `BRPItem`, который координирует document lifecycle и делегирует частные задачи в helpers.
- `item-defaults.mjs` — дефолтные изображения и derived labels для item system data.
- `item-rolls.mjs` — сборка roll payload по типам item'ов.
- `sheets/` — item sheets и shared helpers для них.

## Рост

- Новые item types удобнее подключать через table-driven map в `item-defaults.mjs` и `item-rolls.mjs`, а не через длинные `if/else`.
- Если у части item sheets появится одинаковый lifecycle, лучше расширять shared helpers в `sheets/shared/`, а не копировать табы и enrich-логику.
