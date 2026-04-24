# Actor Module

Здесь лежит actor-специфичная логика BRP: обработка drop-сценариев, листы акторов и вспомогательные домены рядом с ними. Директория теперь разделена по зонам ответственности, чтобы изменения в drop-flow, character sheet и общих actor-механиках меньше пересекались.

## Файлы и папки

- `actor-itemDrop.mjs` — тонкий фасад над item-drop pipeline; сохраняет старую публичную точку входа для drop/create/delete сценариев.
- `item-drop/` — разрезанная логика drop-проверок, selection dialogs, skill-base расчётов и composite item flow для `personality` / `profession` / `culture`.
- `sheets/` — actor sheets и их domain-specific helpers.

## Рост

- Если появятся новые сложные сценарии drop/create, их лучше добавлять отдельными модулями в `item-drop/`, а не возвращать в фасад.
- Общие actor-side утилиты, которые начинают использовать и `npc`, и `character`, стоит выносить из sheet-папок в отдельные shared-модули внутри `module/actor/`.
