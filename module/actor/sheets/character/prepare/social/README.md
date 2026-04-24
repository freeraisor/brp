# Social Prepare

Поддиректория содержит подготовку refresh social tab на уровне row builders и shared formatting helpers. Она нужна, чтобы social orchestration оставался коротким, а правила сортировки и отображения для allegiance/reputation/contact/faction жили отдельно.

## Файлы

- `shared.mjs` — social constants, formatting helpers, label resolvers и row utility functions.
- `allegiance-rows.mjs` — preparation и sorting allegiance rows.
- `reputation-rows.mjs` — preparation и sorting reputation/status rows.
- `contact-rows.mjs` — linked actor resolution и contact rows.
- `faction-rows.mjs` — faction membership rows и missing-link handling.

## Рост

- Если social появится drag-sort или inline editing на prepare-уровне, новые row builders лучше держать рядом, а не раздувать `shared.mjs`.
- При появлении общих social enums для item sheets и actor sheets можно вынести label/option factories выше, в отдельный shared social package.
