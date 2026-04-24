# Character Sheet

Это точка сборки refresh character sheet для BRP. После рефакторинга верхний `character.mjs` только собирает поведение, а логика разложена по доменным модулям, чтобы агенту и человеку не приходилось читать весь лист целиком.

## Файлы

- `character.mjs` — сборка `BRPCharacterSheet`, подключение actions, parts и domain-specific methods.
- `character-context.mjs` — pipeline подготовки sheet context перед рендером.
- `character-items.mjs` — маршрутизация item preparation и финализация domain state.
- `character-sheet-actions.mjs` — объединение action maps из отдельных доменов.
- `character-sheet-config.mjs` — parts, selectors и общие sheet constants.
- `character-sheet-render.mjs` — render lifecycle, refresh container wiring и transient UI state.
- `character-sheet-utils.mjs` — общие DOM / numeric / scroll helpers для character modules.
- `character-core-sheet.mjs` — character/core card actions и custom field drag/drop.
- `skills-sheet.mjs` — skill actions, search, context menu и category ordering.
- `combat-sheet.mjs` — combat actions, ammo flow и weapon drag ordering.
- `inventory-sheet.mjs` — inventory actions, filters, currency dialogs и container drag/drop.
- `social-sheet.mjs` — social actions, context menu, faction linking и actor-side social mutations.
- `character-tabs.mjs` — parts-to-tabs mapping и rail metadata.
- `prepare/` — подготовка view-model данных по вкладкам и секциям.
- `view-model/` — маленькие структуры представления для списков и секций.
- `character-theme.mjs` — theme settings и применение визуальных переменных.

## Рост

- Если один из domain-модулей снова вырастет, следующая естественная граница — вынос dialog/context-menu helpers в поддиректории по домену.
- Общие row/context helpers, которые начнут использовать и `npc`, и `character`, лучше переносить из этой папки в actor-level shared helpers.
