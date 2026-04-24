# 07 Refresh character tab

Дата фиксации: 2026-04-23

Статус: план-предложение для полноценного visual/data rebase вкладки `Character` после refresh shell, Skills, Combat, Health и Items. Документ описывает порядок работ и не меняет поведение сам по себе.

## Цель

Сделать полноценный rebase вкладки `Character` в стиле нового shell и целевого мокапа:

- визуально привести вкладку к [BRP Character Tab Mockup](./uirefresh/brp-character-tab-mockup.html);
- перенести biography/identity-поля в `Character` tab;
- заменить старую табличную `statistics`-вкладку на секции из мокапа;
- сохранить текущую BRP-логику характеристик, skill totals, powers и связанных item drops;
- добавить недостающие поля biography и custom fields;
- показать три BRP-важные development-карточки: `Class / Profession`, `Culture`, `Personality`;
- добавить `MOV` в sidebar и derived stats как UI/lookup, не решая полную формулу MOV в этой итерации.

Главный принцип: UI должен быть максимально близок к мокапу. Если при реализации обнаруживается, что мокап конфликтует с текущей BRP-логикой или содержит ошибку, сначала фиксируем отличие и уточняем решение, а не молча меняем поведение.

## Источники

HTML и целевой UX:

- [BRP Character Tab Mockup](./uirefresh/brp-character-tab-mockup.html) - главный источник визуального поведения и layout.
- [BRP Character Tab Specification](./uirefresh/brp-character-tab-spec.md) - текстовое описание; использовать как пояснение, но при расхождении с HTML приоритет у мокапа.

Предыдущие refresh-планы:

- [03 refresh sheet + skill tab.md](./03%20refresh%20sheet%20+%20skill%20tab.md) - refresh shell, sidebar/workspace/rail, общие UI patterns и начальное разделение вкладок.
- [04 refresh combat tab.md](./04%20refresh%20combat%20tab.md) - patterns для section headers, compact rows, сохранения scroll/UI state.
- [05 refresh health tab.md](./05%20refresh%20health%20tab.md) - sidebar/status/resource context и работа с health-related состояниями.
- [06 refresh item tab.md](./06%20refresh%20item%20tab.md) - последовательная структура плана, markers выполнения, inventory context menu/drag patterns.

Текущая реализация BRP:

- [templates/actor/character.statistics.hbs](../templates/actor/character.statistics.hbs) - текущая вкладка `Character`/`statistics`: stats table, derived stats, powers list.
- [templates/actor/character.background.hbs](../templates/actor/character.background.hbs) - текущие identity/story поля, которые нужно перераспределить между `Character` и `Story`.
- [templates/actor/character.sidebar.hbs](../templates/actor/character.sidebar.hbs) - новый sidebar, куда добавить MOV line.
- [templates/actor/character.shell.hbs](../templates/actor/character.shell.hbs) - текущий refresh shell.
- [templates/global/parts/actor-tab-navigation.hbs](../templates/global/parts/actor-tab-navigation.hbs) - rail navigation.
- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs) - `PARTS`, actions, transient UI state, context menus, drag/drop patterns.
- [module/actor/sheets/character/character-tabs.mjs](../module/actor/sheets/character/character-tabs.mjs) - mapping part `statistics` -> rail tab `character`.
- [module/actor/sheets/character/character-context.mjs](../module/actor/sheets/character/character-context.mjs) - общий context builder.
- [module/actor/sheets/character/prepare/identity.mjs](../module/actor/sheets/character/prepare/identity.mjs) - текущая identity view-model, linked `culture`, `profession`, `personality`.
- [module/actor/sheets/character/prepare/characteristics.mjs](../module/actor/sheets/character/prepare/characteristics.mjs) - текущая model для characteristic cards/derived values.
- [module/actor/sheets/character/prepare/sidebar.mjs](../module/actor/sheets/character/prepare/sidebar.mjs) - sidebar identity/resources view-model.
- [module/actor/sheets/character/prepare/resources.mjs](../module/actor/sheets/character/prepare/resources.mjs) - resource meters.
- [module/actor/sheets/character/prepare/powers.mjs](../module/actor/sheets/character/prepare/powers.mjs) - powers view-model and rows.
- [module/actor/sheets/character/prepare/skills.mjs](../module/actor/sheets/character/prepare/skills.mjs) - current `totalProf`, `totalPers`, `totalXP` totals.
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs) - existing actions `viewDoc`, `deleteProfession`, `deleteCulture`, `deletePersonality`, `rollCharStats`, `redistStat`, `statRoll`, drag/drop.
- [module/actor/actor.mjs](../module/actor/actor.mjs) - canonical current formulas for stat totals, XP bonus, damage bonus, health/power max.
- [module/actor/actor-itemDrop.mjs](../module/actor/actor-itemDrop.mjs) - current drop/delete behavior for `profession`, `culture`, `personality`.
- [template.json](../template.json) - current actor/item schema.
- [css/brp.css](../css/brp.css) - refresh variables and current Skills/Combat/Health/Items styles.
- [lang/en.json](../lang/en.json), [lang/es.json](../lang/es.json), [lang/fr.json](../lang/fr.json) - localization keys to extend.
- [BACKLOG.md](../BACKLOG.md) - место для задач, которые сознательно не входят в `07`.

Ориентиры dnd5e в локальной копии:

- [dnd5e/dnd5e.mjs](../dnd5e/dnd5e.mjs) - ApplicationV2 parts/container patterns.
- [dnd5e/dnd5e.css](../dnd5e/dnd5e.css) - compact cards, sidebar/rail density, actor sheet visual patterns.
- [dnd5e/templates/actors/tabs/character-details.hbs](../dnd5e/templates/actors/tabs/character-details.hbs) - пример details tab с grouped character data.

## Подтвержденные решения

- HTML-мокап является главным UI-источником.
- Текстовая spec используется как пояснение, но при расхождении с мокапом нужно явно фиксировать отличие.
- Вкладка `Character` забирает biography/identity-поля.
- Новые biography-поля добавляем в schema/view-model, а не прячем в старые свободные строки.
- `Class & Background` из мока адаптируется под BRP как три карточки:
  - `Class / Profession` -> current item type `profession`;
  - `Culture` -> current item type `culture`;
  - `Personality` -> current item type `personality`.
- Это осознанное отступление от мокапа: вместо двух equal-width карточек делаем три visually matching cards.
- `MOV` в UI нужен сейчас, но полноценный расчет MOV уходит в backlog.
- В `07` `MOV` читает текущий `actor.system.move` и может показывать placeholder/fallback, если значение не задано.
- `XP Bonus` сохраняет текущую логику кода: `Math.ceil(INT.total / 2)`.
- Powers summary в `Character` не заменяет existing power tabs; это entry point.
- Custom fields обязательны для `07`.
- Для custom fields нужен стабильный технический `id`, чтобы edit/delete/reorder не зависели от текущего index массива.
- Если custom field content будет богатым текстом, хранение блока все равно остается `system.customFields[]`; rich text касается только поля `content`.

## Отличия от мокапа

Разрешенные отличия:

- `Class & Background` становится рядом из трех карточек: `Class / Profession`, `Culture`, `Personality`.
- Название секции можно оставить `Class, Culture & Personality` или локализованное BRP-эквивалентное название. Визуальный паттерн карточек остается как в моке.
- Иконки можно брать из Font Awesome, если размер, цвет, вес и hover state совпадают с мокапом.
- `MOV` может показывать placeholder/fallback до отдельной реализации расчета.
- Пустые biography-поля можно показывать локализованным dash/empty state, если текст `Not specified` не подходит текущей локали.

Нужно остановиться и спросить:

- если для `culture` или `personality` не хватает данных для карточки, и требуется новая механика применения бонусов;
- если перенос biography ломает `Story` tab или приводит к дублированию editable полей;
- если custom fields удобнее реализовать через существующие story sections, но это нарушает мокаповый CRUD/reorder;
- если existing lock/unlock mode не дает сделать read-only biography как в моке;
- если `MOV` fallback начинает восприниматься как gameplay value, а не UI placeholder.

## Не входит в этот план

- Полный расчет MOV по RAW/optional rules. Он должен быть отдельной задачей в [BACKLOG.md](../BACKLOG.md).
- Полная переработка power-system tabs/windows.
- Удаление existing optional power tabs.
- Переписывание текущей логики `profession`, `culture`, `personality` drop/delete/application.
- Автоматизация major wound effects на characteristics.
- XP spending UI.
- Полная переработка `Story` tab beyond removing/moving duplicated identity fields.
- Подключение внешних UI libraries.

## Текущая точка

Сейчас `Character` tab технически является part `statistics`:

- [character-tabs.mjs](../module/actor/sheets/character/character-tabs.mjs) maps `statistics` to rail id `character`.
- [character.statistics.hbs](../templates/actor/character.statistics.hbs) рисует старую dense table:
  - stats columns: initial, redistribute, cultural, age, experience, effects, total, dice;
  - derived stats grid as legacy text cells;
  - powers list as simple links.
- [actor.mjs](../module/actor/actor.mjs) уже считает `stat.total`, `stat.deriv`, `system.xpBonus`, `system.dmgBonus`.
- [skills.mjs](../module/actor/sheets/character/prepare/skills.mjs) уже считает `actor.system.totalProf`, `actor.system.totalPers`, `actor.system.totalXP`.
- [identity.mjs](../module/actor/sheets/character/prepare/identity.mjs) уже умеет показывать linked/manual `profession`, `culture`, `personality`.
- [actor-itemDrop.mjs](../module/actor/actor-itemDrop.mjs) уже содержит apply/delete behavior для `profession`, `culture`, `personality`.
- [character.background.hbs](../templates/actor/character.background.hbs) сейчас содержит identity grid и dynamic story sections. После `07` identity должна жить в `Character`, а `Story` должен сфокусироваться на long-form story/background sections.

Значит `07` не должен повторять shell work. Работа идет поверх текущих parts/view-model patterns.

## Целевая структура UI

Template target:

```hbs
<section class="actor tab statistics {{tab.cssClass}}" data-group="primary" data-tab="statistics">
  <section class="brp-character-refresh">
    <header class="brp-character-refresh-titlebar">...</header>
    <section class="brp-character-refresh-section is-biography">...</section>
    <section class="brp-character-refresh-section is-core-development">...</section>
    <section class="brp-character-refresh-section is-characteristics">...</section>
    <section class="brp-character-refresh-section is-derived">...</section>
    <section class="brp-character-refresh-section is-powers">...</section>
    <section class="brp-character-refresh-section is-custom-fields">...</section>
  </section>
</section>
```

Production classes should be prefixed with `brp-character-refresh-*` where practical. Avoid generic `.section`, `.class-card`, `.icon-btn`, `.modal` from the standalone mockup.

Target section order:

1. `Biography`
2. `Class, Culture & Personality`
3. `Characteristics`
4. `Derived stats`
5. `Powers`
6. `Custom fields`

## Модель данных

### Biography

Add a structured actor-level object instead of scattering new fields:

```json
{
  "biography": {
    "pronouns": "",
    "dateOfBirth": "",
    "placeOfBirth": "",
    "nativeLanguage": "",
    "build": "",
    "eyeColor": "",
    "hairColor": "",
    "skinTone": "",
    "distinctiveMarks": "",
    "employer": "",
    "rankTitle": "",
    "maritalStatus": "",
    "socialClass": "",
    "knownLanguages": "",
    "about": ""
  }
}
```

Use existing fields where they already exist:

| Mock field | Production source |
|---|---|
| Name | `actor.name` |
| Age | `actor.system.age` |
| Gender | `actor.system.gender` |
| Nationality / Culture | linked/manual `identity.culture` |
| Religion | `actor.system.religion` |
| Height | `actor.system.height` |
| Weight | `actor.system.weight` |
| Handed | `actor.system.hand` |
| Profession | linked/manual `identity.profession` |
| About | `actor.system.biography.about`, not old root `biography` unless migration decides otherwise |

The existing root fields `system.biography`, `system.background`, `system.backstory`, `system.description`, `system.distincitve` must be audited before migration. Do not delete or rename them in `07` unless the implementation stage explicitly says so and migration is covered.

### Core development cards

Target view-model:

```js
context.characterView.coreCards = [
  {
    id: "profession",
    label: "BRP.profession",
    title,
    description,
    itemId,
    documentClass: "Item",
    empty,
    actions: { open, menu, remove, replace }
  },
  {
    id: "culture",
    label: "BRP.culture",
    title,
    description,
    itemId,
    documentClass: "Item",
    empty,
    actions: { open, menu, remove, replace }
  },
  {
    id: "personality",
    label: "BRP.personality",
    title,
    description,
    itemId,
    documentClass: "Item",
    empty,
    actions: { open, menu, remove, replace }
  }
];
```

Data source:

- linked item from actor items if present;
- manual `system.professionName`, `system.culture`, `system.personalityName` fallback if no item exists;
- description can come from item `system.description`, enriched item description, or short fallback. If unclear, use empty/muted description and ask before inventing text.

Use existing delete behavior:

- `deleteProfession`;
- `deleteCulture`;
- `deletePersonality`.

Assignment/replacement should start by relying on existing Foundry item drop behavior. A dedicated picker/compendium browser is not required in the first pass unless the user asks.

### Characteristics

Use current schema:

```json
system.stats.<key> = {
  "base": 0,
  "redist": 0,
  "culture": 0,
  "age": 0,
  "exp": 0,
  "effects": 0,
  "formula": ""
}
```

View-model should expose:

```js
{
  key,
  code,
  name,
  total,
  visible,
  breakdown: [
    { label: "BRP.initial", value: stat.base, editablePath: "system.stats.key.base" },
    { label: "BRP.redistribute", value: stat.redist, readonly: true },
    { label: "BRP.cultural", value: stat.culture, editablePath: "system.stats.key.culture" },
    { label: "BRP.age", value: stat.age, editablePath: "system.stats.key.age" },
    { label: "BRP.experience", value: stat.exp, editablePath: "system.stats.key.exp" },
    { label: "BRP.effects", value: stat.effects, readonly: true },
    { label: "BRP.total", value: stat.total, total: true }
  ],
  formula: stat.formula
}
```

Current formula wins:

```js
total = base + redist + culture + age + exp + effects
```

Unlock/edit behavior must preserve existing actions:

- `rollCharStats`;
- `redistStat`;
- `statRoll` where appropriate.

### Derived stats

Target view-model:

```js
context.characterView.derivedStats = [
  { id: "xpBonus", label: "BRP.xpBonus", value: system.xpBonus, formula: "ceil(INT / 2)", tone: "mint" },
  { id: "hpBonus", label: "BRP.hpBonus", value: system.health.mod, formula: "BRP.optional" },
  { id: "ppBonus", label: "BRP.ppBonus", value: system.power.mod, formula: "BRP.optional" },
  { id: "fpBonus", label: "BRP.fpBonus", value: system.fatigue.mod, formula: "BRP.optional", enabled: useFP },
  { id: "damageMod", label: "BRP.damageMod", value: system.dmgBonus.full, formula: "STR + SIZ" },
  { id: "totalEnc", label: "BRP.totalENC", value: system.enc, formula: "current ENC" },
  { id: "mov", label: "BRP.move", value: moveDisplay, formula: "placeholder/current system.move" },
  { id: "totalXP", label: "BRP.totalXP", value: system.totalXP, formula: "skill XP total" }
];
```

Notes:

- `Total ENC` should display current `actor.system.enc`, not `STR x 2`. The mock/spec says max carry, but current code uses `system.enc` as carried encumbrance. If a max carry display is needed, confirm before adding a second ENC concept.
- `HP Bonus`, `PP Bonus`, `FP Bonus` are existing mod fields.
- `XP Bonus` must use current `actor.mjs` logic.
- `MOV` displays current/placeholder value only; formula belongs to backlog.

### Skill points

Use current totals first:

```js
personal.used = actor.system.totalPers;
professional.used = actor.system.totalProf;
```

Budget calculation for display:

```js
personal.total = (system.stats.int.base + system.stats.int.culture) * 10;
professional.total = (system.stats.edu.base + system.stats.edu.culture) * 20;
```

Important:

- current `_calcBase` includes `base + redist + culture` for skill base formulas;
- mock text says `initial + cultural`;
- if the user expects redistribution to count in initial creation budgets, stop and confirm before changing formulas.

Display:

- percentage <= 100 is mint;
- percentage > 100 is red;
- overflow is not an error.

### Powers summary

Use existing power context:

```js
context.characterView.powerCards = [
  { id: "magic", label: context.magicLabel, count: context.magics.length, targetTab: "magic" },
  { id: "mutations", label: context.mutationLabel, count: context.mutations.length, targetTab: "mutations" },
  { id: "psychics", label: context.psychicLabel, count: context.psychics.length, targetTab: "psychics" },
  { id: "sorcery", label: context.sorceryLabel, count: context.sorceries.length, targetTab: "sorcery" },
  { id: "super", label: context.superLabel, count: context.superpowers.length, targetTab: "super" }
];
```

Only show configured/assigned systems unless the mock empty-state requires a visible empty card. If this choice is unclear during implementation, prefer existing optional tab visibility and ask.

### Custom fields

Add actor schema:

```json
{
  "customFields": []
}
```

Stored shape:

```json
{
  "id": "stable-random-id",
  "title": "",
  "content": "",
  "sortOrder": 0
}
```

Rules:

- `id` is technical and not shown in UI;
- `title` required;
- `content` supports multi-line plain text in MVP;
- future rich text can be implemented inside `content` without changing the block list contract;
- order is persisted by `sortOrder` or by array order, but actions should identify blocks by `id`.

## UI state flags

Use existing namespace pattern:

```json
flags.brp.sheet.character = {
  "collapsedSections": {
    "biography": false,
    "core": false,
    "characteristics": false,
    "derived": false,
    "powers": false,
    "custom": false
  },
  "expandedCharacteristic": ""
}
```

Search query is not needed for `07`.

## Этапы реализации

Legend:

- `[ ]` not started;
- `[~]` in progress;
- `[x]` completed;
- `[!]` blocked/needs user decision.

Do not start a later stage until the previous stage acceptance is satisfied, unless the user explicitly approves parallel work. If a later stage reveals a mistake in an earlier stage, pause, document the conflict, and ask instead of silently rewriting old decisions.

### Этап 0. Baseline and mock audit

Статус: [x] completed for planning pass

What was checked:

- [BRP Character Tab Mockup](./uirefresh/brp-character-tab-mockup.html);
- [BRP Character Tab Specification](./uirefresh/brp-character-tab-spec.md);
- [character.statistics.hbs](../templates/actor/character.statistics.hbs);
- [character.background.hbs](../templates/actor/character.background.hbs);
- [character.sidebar.hbs](../templates/actor/character.sidebar.hbs);
- [identity.mjs](../module/actor/sheets/character/prepare/identity.mjs);
- [characteristics.mjs](../module/actor/sheets/character/prepare/characteristics.mjs);
- [actor.mjs](../module/actor/actor.mjs);
- [actor-itemDrop.mjs](../module/actor/actor-itemDrop.mjs);
- [skills.mjs](../module/actor/sheets/character/prepare/skills.mjs);
- [powers.mjs](../module/actor/sheets/character/prepare/powers.mjs).

Findings:

- Current `statistics` already has most characteristic data needed by mock.
- Current identity model supports `profession`, `culture`, `personality` as linked/manual values.
- Full biography fields and custom fields are missing from schema.
- MOV exists as `system.move`, but complete calculation/fallback rules are not settled.

Acceptance:

- [x] Decisions above are reflected in this plan.
- [x] MOV calculation moved to backlog.

### Этап 1. Data schema and migration-safe defaults

Статус: [x]

Files:

- [template.json](../template.json)
- [module/actor/actor.mjs](../module/actor/actor.mjs), only if default normalization is needed

Work:

- Add `system.biography` object fields listed in this spec.
- Add `system.customFields` as an empty array.
- Do not remove old root biography/story fields.
- Confirm spelling and migration handling for existing `system.distincitve` typo before using it.

Acceptance:

- New characters get all new fields with safe empty defaults.
- Existing actors do not lose old `biography`, `background`, `backstory`, `stories`, `description`, `distincitve`.
- No behavior changes beyond new fields existing.

### Этап 2. Character view-model

Статус: [x]

Files:

- [module/actor/sheets/character/character-context.mjs](../module/actor/sheets/character/character-context.mjs)
- New suggested file: `module/actor/sheets/character/prepare/character-tab.mjs`
- [module/actor/sheets/character/prepare/identity.mjs](../module/actor/sheets/character/prepare/identity.mjs)
- [module/actor/sheets/character/prepare/sidebar.mjs](../module/actor/sheets/character/prepare/sidebar.mjs)

Work:

- Create `prepareCharacterTab(context)` that builds `context.characterView`.
- Build `biographyGroups` from existing identity fields plus new `system.biography.*`.
- Build `coreCards` for `profession`, `culture`, `personality`.
- Build `characteristics` with breakdown rows from current `system.stats`.
- Build `derivedStats`.
- Build `skillPoints`.
- Build `powerCards`.
- Build `customFields`.
- Add sidebar `move` view-model with `value`, `runValue`, `isPlaceholder`.

Acceptance:

- Template can render from `characterView` without reading raw nested system paths except form input names.
- Missing optional data displays empty/muted state, not broken markup.
- `profession`, `culture`, `personality` cards work both with linked items and manual fallback strings.

### Этап 3. Sidebar MOV line

Статус: [x]

Files:

- [templates/actor/character.sidebar.hbs](../templates/actor/character.sidebar.hbs)
- [css/brp.css](../css/brp.css)
- [module/actor/sheets/character/prepare/sidebar.mjs](../module/actor/sheets/character/prepare/sidebar.mjs)

Work:

- Add MOV line between name/subtitle and status icons, matching mock placement.
- Show `MOV <value>` and `Run <value * 3>m/rd`.
- If value is missing/0 and fallback is used, visually keep it as normal lookup but add tooltip explaining placeholder/current value.
- Keep status strip and resource stack positions consistent with existing sidebar.

Acceptance:

- Sidebar visually matches mock hierarchy.
- Resource meters and status icons do not shift awkwardly.
- No full MOV formula is implemented here.

### Этап 4. Replace `character.statistics.hbs` structure

Статус: [x]

Files:

- [templates/actor/character.statistics.hbs](../templates/actor/character.statistics.hbs)

Work:

- Replace dense legacy stats table with `brp-character-refresh` sections.
- Keep part id/tab id as `statistics` for compatibility with [character-tabs.mjs](../module/actor/sheets/character/character-tabs.mjs).
- Add titlebar matching mock: icon, `Character`, lock indicator.
- Add six sections in target order.
- Use localized labels where existing keys exist.

Acceptance:

- The tab renders without relying on old `.stats-tab-grid` markup.
- All six section shells are present.
- The old powers list is replaced by power cards.
- No behavior handlers are required yet beyond existing `data-action` actions.

### Этап 5. Biography section

Статус: [x]

Files:

- [templates/actor/character.statistics.hbs](../templates/actor/character.statistics.hbs)
- [module/actor/sheets/character/prepare/character-tab.mjs](../module/actor/sheets/character/prepare/character-tab.mjs)
- [templates/actor/character.background.hbs](../templates/actor/character.background.hbs)

Work:

- Render groups `Demographics`, `Physical`, `Social`, `About` like mock.
- Locked mode: read-only text values with empty state.
- Unlocked mode: inputs/textarea for editable fields.
- Move identity grid out of `Story`/`background` after Character biography is functional.
- Keep dynamic story sections in `Story`.

Implementation note:

- `Name` is displayed in Character biography but remains edited through the existing sidebar name input to avoid duplicate `name` form controls in the same sheet.

Acceptance:

- No duplicate primary identity editor remains between `Character` and `Story`.
- Existing fields still save to current paths.
- New biography fields save to `system.biography.*`.
- Layout matches mock density and spacing.

### Этап 6. Core development cards

Статус: [x]

Files:

- [templates/actor/character.statistics.hbs](../templates/actor/character.statistics.hbs)
- [module/actor/sheets/character/prepare/character-tab.mjs](../module/actor/sheets/character/prepare/character-tab.mjs)
- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs)
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs), only if shared actions are insufficient

Work:

- Render three cards using mock class-card visual language.
- Card labels:
  - `Class / Profession`;
  - `Culture`;
  - `Personality`.
- Open action uses existing `viewDoc`.
- Remove action routes to existing delete actions.
- Context menu follows existing [BRPContextMenu](../module/setup/context-menu.mjs) pattern from Skills/Items.
- Empty cards show assign/drop state.

Acceptance:

- Three cards are visually coherent with the two-card mock.
- Existing `profession`, `culture`, `personality` item sheets can be opened.
- Existing delete workflows are preserved.
- No new unconfirmed background/class item type is introduced.

### Этап 7. Characteristics cards and breakdown

Статус: [x]

Files:

- [templates/actor/character.statistics.hbs](../templates/actor/character.statistics.hbs)
- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs)
- [module/actor/sheets/character/prepare/character-tab.mjs](../module/actor/sheets/character/prepare/character-tab.mjs)

Work:

- Render compact 4x2 characteristic cards.
- Add expandable breakdown panel that appears after active row.
- Only one characteristic can be expanded.
- Persist expanded characteristic in `flags.brp.sheet.character.expandedCharacteristic`.
- In unlocked mode expose editable inputs in breakdown where current sheet allowed editing.
- Preserve `rollCharStats`, `redistStat`, `statRoll` behavior.

Acceptance:

- Cards match mock behavior: hover, active border, chevron rotation, full-width breakdown.
- Hidden EDU remains hidden if `useEDU` disables it.
- Existing formulas/totals are unchanged.
- No old table columns remain visible.

### Этап 8. Derived stats and skill points

Статус: [x]

Files:

- [templates/actor/character.statistics.hbs](../templates/actor/character.statistics.hbs)
- [module/actor/sheets/character/prepare/character-tab.mjs](../module/actor/sheets/character/prepare/character-tab.mjs)
- [module/actor/actor.mjs](../module/actor/actor.mjs), only if a missing derived value must become canonical

Work:

- Render derived grid like mock.
- Use current values for XP bonus, HP/PP/FP mods, damage bonus, ENC, MOV placeholder/current value, Total XP.
- Render Personal/Professional skill point cards.
- Calculate percentages and overflow color.

Acceptance:

- `XP Bonus` matches current `ceil(INT / 2)` behavior.
- `Total XP`, `Personal`, `Professional` match existing `skills.mjs` totals.
- Overflow indicator is visual only.
- No new gameplay formula is silently introduced.

### Этап 9. Powers entry cards

Статус: [x]

Files:

- [templates/actor/character.statistics.hbs](../templates/actor/character.statistics.hbs)
- [module/actor/sheets/character/prepare/character-tab.mjs](../module/actor/sheets/character/prepare/character-tab.mjs)
- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs)

Work:

- Render horizontal power cards.
- Show assigned/configured systems with counts.
- Click should navigate/open existing power tab or document the chosen behavior.
- Add button can use existing `createDoc` only if target power type is unambiguous; otherwise leave disabled/placeholder and ask.

Implementation note:

- Power cards use the existing `tab` action to open the assigned power tab. The `+` button uses existing `createDoc` only for the card's exact item type (`magic`, `mutation`, `psychic`, `sorcery`, `super`).

Acceptance:

- Existing power tabs remain available.
- Character tab acts as summary/entry point.
- Empty state matches mock.

### Этап 10. Custom fields CRUD and reorder

Статус: [x]

Files:

- [templates/actor/character.statistics.hbs](../templates/actor/character.statistics.hbs)
- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs)
- [module/actor/sheets/character/prepare/character-tab.mjs](../module/actor/sheets/character/prepare/character-tab.mjs)
- [css/brp.css](../css/brp.css)
- [lang/en.json](../lang/en.json), [lang/es.json](../lang/es.json), [lang/fr.json](../lang/fr.json)

Work:

- Render custom field cards with handle, title, content, edit/delete icons.
- Add actions:
  - `characterCustomFieldAdd`;
  - `characterCustomFieldEdit`;
  - `characterCustomFieldDelete`;
  - `characterCustomFieldReorder`.
- Add modal/dialog for title/content.
- Use stable `id` for updates.
- Implement native drag/reorder using existing sheet patterns; no external library.

Acceptance:

- Add/edit/delete/reorder persists to actor.
- Empty list has add button.
- Hover actions match mock.
- No accidental dependency on array index for edit/delete.

### Этап 11. Section collapse and transient UI state

Статус: [x]

Files:

- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs)
- [templates/actor/character.statistics.hbs](../templates/actor/character.statistics.hbs)

Work:

- Add click handlers/actions for collapsible section headers.
- Persist collapsed sections in `flags.brp.sheet.character.collapsedSections`.
- Extend `captureCharacterRefreshUiState` / `restoreCharacterRefreshUiState` only for truly transient state that should not persist.

Acceptance:

- All sections collapse/expand like mock.
- Collapsed state survives rerender.
- Buttons inside section headers do not toggle collapse accidentally.

### Этап 12. CSS visual pass

Статус: [x]

Files:

- [css/brp.css](../css/brp.css)

Work:

- Add `brp-character-refresh-*` styles based on mock:
  - titlebar;
  - section headers;
  - biography grid/cards;
  - three core cards;
  - characteristic cards/breakdown;
  - derived cards;
  - skill point cards;
  - power cards;
  - custom fields/modal;
  - responsive layout.
- Reuse existing refresh variables:
  - `--brp-refresh-bg-base`;
  - `--brp-refresh-bg-card`;
  - `--brp-refresh-border-soft`;
  - `--brp-refresh-red`;
  - `--brp-refresh-mint`;
  - etc.
- Avoid generic selectors from standalone mock.

Acceptance:

- Visual result is recognizably 1:1 with mock except the approved 3-card adaptation.
- Text does not overflow controls at normal sheet widths.
- No old `.stats-tab-grid` visual remnants affect the new tab.
- Sidebar MOV matches the mock hierarchy.

### Этап 13. Localization

Статус: [x]

Files:

- [lang/en.json](../lang/en.json)
- [lang/es.json](../lang/es.json)
- [lang/fr.json](../lang/fr.json)

Work:

- Add labels/tooltips for new biography fields.
- Add labels/tooltips for custom fields actions.
- Add labels/tooltips for Character section collapse/core cards if missing.
- Prefer existing keys where possible.

Acceptance:

- No raw localization keys appear in UI.
- English has complete labels.
- Spanish/French get safe translations or English fallback values consistent with project practice.

### Этап 14. Story tab cleanup

Статус: [x]

Files:

- [templates/actor/character.background.hbs](../templates/actor/character.background.hbs)
- [module/actor/sheets/character/prepare/background.mjs](../module/actor/sheets/character/prepare/background.mjs)

Work:

- Remove duplicated identity grid from `Story` after Character biography is confirmed functional.
- Keep dynamic story/background sections.
- Update Story title/empty state if needed.

Acceptance:

- Identity editing is centered in Character.
- Story remains useful for long-form sections.
- Existing stories continue to render and edit.

### Этап 15. Verification

Статус: [ ]

Required checks:

- Open character sheet in Foundry.
- Check locked mode.
- Check unlocked mode.
- Edit and save existing identity fields.
- Edit and save new biography fields.
- Open/remove `profession`, `culture`, `personality` cards on a test actor.
- Expand/collapse each Character section.
- Expand/collapse characteristic breakdowns.
- Confirm stat totals and XP bonus remain unchanged against pre-refresh values.
- Add/edit/delete/reorder custom fields.
- Confirm power cards do not remove existing power tabs.
- Check responsive behavior at narrow sheet width.

Acceptance:

- No console errors during normal sheet render/interactions.
- No actor data loss.
- Current BRP calculations remain unchanged unless explicitly listed.
- Visual drift from mock is documented.

## Completion checklist

Use this section during implementation. Mark items only after verification, not while coding.

- [x] Planning audit completed.
- [x] `template.json` extended safely.
- [x] `characterView` prepared.
- [x] Sidebar MOV rendered.
- [x] `character.statistics.hbs` rebuilt.
- [x] Biography moved into Character tab.
- [x] Three core cards implemented.
- [x] Characteristics cards/breakdown implemented.
- [x] Derived stats/skill points implemented.
- [x] Powers summary implemented.
- [x] Custom fields implemented.
- [x] Section collapse persisted.
- [x] CSS matched to mock.
- [x] Localization updated.
- [x] Story duplicate identity removed.
- [ ] Manual verification completed.

## Backlog links

Already deferred:

- Canonical MOV calculation and fallback rules.

Add to [BACKLOG.md](../BACKLOG.md) if discovered during implementation:

- rich text editor for custom field content;
- GM-only/private custom fields;
- automatic major wound characteristic effects;
- compendium picker for `profession`, `culture`, `personality`;
- full power system dashboard/window redesign.
