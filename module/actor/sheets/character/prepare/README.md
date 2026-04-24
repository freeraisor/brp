# Character Prepare

В этой папке собираются подготовленные данные для refresh character sheet: здесь нет обработчиков кликов, только нормализация actor/item state в удобный для шаблонов вид. Разделение по вкладкам и доменам позволяет менять presentation-логику без каскадных правок в самом sheet-классе.

## Файлы

- `sheet-settings.mjs` — перенос Foundry settings в sheet context и подготовка derived labels/flags.
- `background.mjs` — data preparation для background/story блока.
- `character-tab.mjs` — view-model для statistics/character area.
- `characteristics.mjs` — нормализация characteristic cards и derived data.
- `combat.mjs` — weapon list, defense state и combat sort preparation.
- `development.mjs` — development/dev-tab aggregation.
- `effects.mjs` — active effects context.
- `health*.mjs` — hit location, wound и silhouette preparation.
- `identity.mjs` — identity/header/sidebar related actor data.
- `inventory*.mjs` — inventory sections, filters, hierarchy и display helpers.
- `powers.mjs` — magic/mutation/psychic/sorcery/super preparation.
- `resources.mjs` — HP/PP/FP/SAN style resource blocks.
- `sidebar.mjs` — sidebar context preparation.
- `skills.mjs` — skills grouping, sorting and improve data.
- `social.mjs` — orchestration social view-model и делегирование row builders в `social/`.
- `social/` — маленькие модули для social row builders и shared social preparation utils.
- `statuses.mjs` — status pills и state markers.

## Рост

- Если presentation-логика начинает влиять на rules/state mutation, её лучше возвращать в sheet domain modules, а не оставлять здесь.
- Для крупных вкладок стоит поддерживать правило “один orchestrator + набор маленьких row/helper модулей”, как теперь сделано в social.
