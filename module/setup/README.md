# Setup Module

Здесь живут setup и registration entry points для BRP system. Сейчас основная точка в этой директории — регистрация листов и central wiring, которое лучше держать декларативным и коротким.

## Файлы

- `register-sheets.mjs` — декларативная регистрация actor/item/table/journal sheets через списки sheet-классов.
- `brp-dialog.mjs` — общая dialog abstraction, которую используют sheet и drop-модули.
- `context-menu.mjs` — общий context menu helper для refresh UI и sheet actions.

## Рост

- По мере роста setup-слоя registrations стоит группировать списками и helper-функциями, а не возвращать длинные последовательности `registerSheet`.
- Если setup entry points начнут множиться, имеет смысл добавить отдельные registry-модули по доменам: actors, items, ui.
