# Item Sheet Shared

Поддиректория хранит общие building blocks для item sheets. Её задача — убрать повторяющийся lifecycle подготовки табов и enriched HTML из простых item sheet классов.

## Файлы

- `standard-detail-sheet.mjs` — helper-функции для common parts, tabs, part context и GM-aware render options.

## Рост

- Если появится второй семейство листов с другим, но повторяющимся lifecycle, лучше добавить новый helper рядом, а не раздувать `standard-detail-sheet.mjs` флагами.
