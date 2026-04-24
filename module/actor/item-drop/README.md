# Item Drop

Эта папка отвечает за подготовку item'ов перед встраиванием в actor: проверки правил, автодобавление зависимостей, пользовательские выборы и cleanup для composite документов. Основная цель структуры — держать drop pipeline предсказуемым и не смешивать UI-диалоги с бизнес-правилами.

## Файлы

- `create.mjs` — главный pipeline проверки dropped item'ов и подготовки добавляемых документов.
- `dialogs.mjs` — UI-диалоги для hit location, specialism, radio selection и выбора skills/groups.
- `helpers.mjs` — BRPID-centric helpers и общие функции для duplicate / lookup / payload работы.
- `personality.mjs` — логика composite drop/delete для `personality`, `profession`, `culture`.
- `skills.mjs` — расчёт base skill и гарантирование skill category на actor.

## Рост

- Если появятся новые rule-heavy item types, лучше добавлять отдельные validator-модули и подключать их из `create.mjs`.
- Тексты hardcoded-диалогов стоит постепенно переводить в i18n keys, когда UX по этим сценариям устоится.
