# Item Sheets

Эта папка содержит item sheet классы BRP и их локальные shared helpers. Здесь теперь явно отделены “простые detail sheets” от sheet'ов со своей собственной drag/drop или сильно кастомным lifecycle.

## Файлы

- `base-item-sheet.mjs` — общий базовый V2-sheet для item documents, header controls и bonus editor hooks.
- `allegiance.mjs` — detail sheet allegiance с enemy link и benefits tab.
- `contact.mjs` — detail sheet contact с linked actor preview/open.
- `faction.mjs` — detail sheet faction.
- `reputation.mjs` — detail sheet reputation/status.
- `shared/standard-detail-sheet.mjs` — общий каркас для простых tabbed detail sheets с `details/description/gmNotes`.
- Остальные `*.mjs` — специализированные item sheets, которые пока сохраняют свои отдельные сценарии и форму.

## Рост

- Простые листы без своей drag/drop логики лучше переводить на `shared/standard-detail-sheet.mjs`.
- Как только у shared helper'а появятся слишком специфичные ветки под отдельные типы, стоит дробить его на smaller composable helpers.
