# 06 Refresh item tab

Дата фиксации: 2026-04-22

Статус: план-предложение для полноценной реализации `Items` tab после refresh shell, Skills, Combat и Health. Документ описывает порядок работ, UI rebase и новую inventory-логику. Сам по себе документ не меняет поведение.

## Цель

Сделать полноценный rebase вкладки `Items` в стиле нового shell и мокапа:

- визуально привести вкладку к [BRP Items Tab Mockup](./uirefresh/brp-items-tab-mockup.html);
- показать `Weapons`, `Armour`, `Other` внутри Items;
- оставить `Combat` боевым представлением carried weapons, но перенести управление inventory-состоянием weapons в `Items`;
- адаптировать мокаповую модель через существующие item types `weapon`, `armour`, `gear`;
- добавить обязательные новые механики из мокапа: `inventoryKind`, контейнеры, currency, search/filter/sort, favorites, stack split, consumable use, bonuses display;
- сохранить текущую BRP-логику ENC, armour/HPL и `equipStatus`, если план явно не говорит иначе.

Главный принцип: UI должен быть максимально 1-в-1 с мокапом. Если при реализации обнаруживается, что мокап конфликтует с текущей BRP-логикой или содержит ошибку, сначала фиксируем отличие и уточняем решение, а не молча меняем поведение.

## Источники

HTML и целевой UX:

- [BRP Items Tab Specification](./uirefresh/brp-items-tab-spec.md) - базовое описание структуры, типов, состояний, контейнеров, валют, encumbrance, фильтров, сортировки и USE.
- [BRP Items Tab Mockup](./uirefresh/brp-items-tab-mockup.html) - визуальный ориентир. Использовать как целевой UI, но адаптировать data model к текущему BRP.

Предыдущие refresh-планы:

- [03 refresh sheet + skill tab.md](./03%20refresh%20sheet%20+%20skill%20tab.md) - refresh shell, sidebar/workspace/rail, тема, patterns для search/sort/collapse/context menu.
- [04 refresh combat tab.md](./04%20refresh%20combat%20tab.md) - граница между `Combat` и inventory-состоянием weapons.
- [05 refresh health tab.md](./05%20refresh%20health%20tab.md) - Health ownership для worn armour, wounds и read-only armour display.

Текущая реализация BRP:

- [templates/actor/character.items.hbs](../templates/actor/character.items.hbs) - текущий старый Items template: `Armour` + `Equipment`.
- [module/actor/sheets/character/prepare/inventory.mjs](../module/actor/sheets/character/prepare/inventory.mjs) - текущая подготовка `inventoryView`, armour rows, gear rows.
- [module/actor/sheets/character/character-items.mjs](../module/actor/sheets/character/character-items.mjs) - routing item preparers: `gear`, `armour`, `weapon`, health/combat/skills/social/powers.
- [module/actor/sheets/character/prepare/combat.mjs](../module/actor/sheets/character/prepare/combat.mjs) - текущая подготовка weapons для `Combat`; important reference for weapon view fields and custom ordering.
- [module/actor/sheets/character/prepare/health.mjs](../module/actor/sheets/character/prepare/health.mjs) - current read-only worn armour rows for `Health`.
- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs) - sheet-specific actions, context menus, drag/drop, scroll preservation patterns.
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs) - existing actions `createDoc`, `viewDoc`, `itemToggle`, `deleteDoc`, inline edit, Foundry drag/drop.
- [module/actor/actor.mjs](../module/actor/actor.mjs) - current actor prepare and canonical ENC/status side effects.
- [template.json](../template.json) - current schema: real item types are `gear`, `armour`, `weapon`.
- [templates/item/gear.detail.hbs](../templates/item/gear.detail.hbs) - current gear item sheet and owned quantity/status/ENC fields.
- [templates/item/armour.detail.hbs](../templates/item/armour.detail.hbs) - current armour item sheet and HPL/status fields.
- [templates/item/weapon.detail.hbs](../templates/item/weapon.detail.hbs) - current weapon item sheet, ammo fields and equip status.
- [module/item/sheets/gear.mjs](../module/item/sheets/gear.mjs), [module/item/sheets/armour.mjs](../module/item/sheets/armour.mjs), [module/item/sheets/weapon.mjs](../module/item/sheets/weapon.mjs) - item sheet context sources.
- [css/brp.css](../css/brp.css) - refresh theme variables, Skills/Combat/Health styles, legacy inventory styles.
- [lang/en.json](../lang/en.json), [lang/es.json](../lang/es.json), [lang/fr.json](../lang/fr.json) - localization keys to extend.
- [BACKLOG.md](../BACKLOG.md) - место для задач, которые будут отложены за пределы `06`.

Ориентиры dnd5e в локальной копии:

- [dnd5e/dnd5e.mjs](../dnd5e/dnd5e.mjs) - ApplicationV2 parts/container patterns.
- [dnd5e/dnd5e.css](../dnd5e/dnd5e.css) - list controls, item rows, compact controls, inventory-like visual density.

## Подтвержденные решения

- Мокаповый `armor` в плане реализации соответствует текущему `armour`. Production model не переименовываем.
- Новые смысловые типы из мокапа для не-weapon/armour предметов реализуем через `gear.system.inventoryKind`, а не через новые Foundry item types.
- Реальные item types остаются:
  - `weapon`;
  - `armour`;
  - `gear`.
- `gear.system.inventoryKind` покрывает:
  - `container`;
  - `consumable`;
  - `tool`;
  - `equipment`;
  - `loot`.
- Для старого gear без kind default = `equipment`.
- Мокаповые `carried` / `equipped` не становятся новым source of truth. UI адаптирует текущий `system.equipStatus`.
- Текущую механику брони и ENC не меняем. `armour` сохраняет существующее поведение, включая `worn`, HPL fraction ENC, AP/BAP в Health.
- `Items` показывает weapons и управляет их inventory-состоянием. `Combat` продолжает показывать только carried weapons.
- Currency входит в обязательный объем `06`.
- Контейнеры, вложенность, capacity, ENC reduction, search, filters, sort, context menu, split stack, consumable use и bonuses display входят в обязательный объем `06`.
- Если мокап и текущая логика расходятся, для UI приоритет - визуальная идентичность, для данных - текущая BRP-модель и подтвержденные решения выше.

## Не входит в этот план

- Не переименовывать `armour` в `armor` в schema/code.
- Не менять старую `armour` ENC/AP/HPL механику.
- Не переносить armour management в `Health`; `Health` остается read-only по armour.
- Не делать automatic exchange rates для currency.
- Не делать полноценную автоматизацию `bonuses[]` в skill rolls. В `06` bonuses только хранятся и отображаются.
- Не делать автоматическое применение `useEffect` кроме минимального consumable use: уменьшить quantity и отправить chat/action message.
- Не делать trade UI между персонажами.
- Не делать bulk actions/multi-select.
- Не подключать CDN или внешние UI libraries.

## Текущая точка

Сейчас `Items` является старой вкладкой:

- `character.items.hbs` рисует секции `Armour` и `Equipment`.
- `inventory.mjs` строит `inventoryView.armour` и `inventoryView.gear`.
- `weapon` готовится только для `Combat` через `prepare/combat.mjs`.
- `gear`, `weapon` и `armour` имеют `system.equipStatus`.
- `actor.mjs` считает ENC:
  - `gear`/`weapon`: только если `equipStatus === "carried"`;
  - `armour`: через текущие правила, включая HPL fraction ENC;
  - итог пишет в `actor.system.enc`.
- `Combat` уже имеет refresh patterns для weapon rows, sort flags, custom order и ammo/reload.
- `Skills` уже имеет patterns для search, context menu, favorites, scroll preservation.

Значит `06` должен не повторять shell/Skills/Combat работу, а строить Items поверх уже созданных patterns.

## Модель данных

### Item type adaptation

Production mapping:

| Mock type | Production type | Production kind/source |
|---|---|---|
| `weapon` | `weapon` | real item type |
| `armor` | `armour` | real item type |
| `container` | `gear` | `system.inventoryKind = "container"` |
| `consumable` | `gear` | `system.inventoryKind = "consumable"` |
| `tool` | `gear` | `system.inventoryKind = "tool"` |
| `equipment` | `gear` | `system.inventoryKind = "equipment"` |
| `loot` | `gear` | `system.inventoryKind = "loot"` |

Required `gear` fields in `template.json`:

```json
{
  "inventoryKind": "equipment",
  "stackable": false,
  "containerId": "",
  "capacityEnc": 0,
  "encReductionPct": 0,
  "useEffect": "",
  "usesRemaining": 0,
  "value": "",
  "bonuses": []
}
```

Required shared optional fields on `gear`, `weapon`, `armour`:

```json
{
  "containerId": "",
  "bonuses": []
}
```

Notes:

- `weapon` and `armour` can be placed in containers, so they need `containerId`.
- `bonuses[]` is universal because tools are the main use case, but armour/equipment can also grant bonuses.
- `quantity` already exists on `gear`, `armour`, `weapon`; do not add another quantity field.
- `contents[]` from the mockup is view-model only. Production source of truth is child `item.system.containerId`. This avoids duplicated container state.

### Status adapter

Current source of truth:

```text
item.system.equipStatus
```

UI adapter:

| UI concept | Production meaning |
|---|---|
| `carried = true` for `gear`/`weapon` | `equipStatus === "carried"` |
| `carried = false` for `gear`/`weapon` | `equipStatus === "packed"` or `equipStatus === "stored"` |
| `equipped = true` for `weapon` | no separate boolean; weapon is combat-active when `equipStatus === "carried"` |
| `carried = true` for `armour` | `equipStatus === "carried"` or `equipStatus === "worn"` |
| `equipped = true` for `armour` | `equipStatus === "worn"` |
| `carried = false` for `armour` | `equipStatus === "packed"` or `equipStatus === "stored"` |

Actions:

- Carry button cycles between carried and packed/stored using existing `itemToggle` or a new inventory-specific wrapper.
- Armour equip button toggles `worn` / `carried` without changing current armour mechanics.
- Weapon equip button should be visually present like the mockup, but production behavior must be documented during implementation:
  - recommended MVP: active state means `equipStatus === "carried"`;
  - click can set carried/packed through the same status wrapper;
  - no new weapon `equipped` boolean.

If this feels wrong during implementation, stop and confirm before inventing a second weapon state.

### Currency

Currency is actor-level data, not item data.

Preferred production storage:

```json
actor.system.currencies = [
  {
    "id": "credits",
    "name": "Credits",
    "icon": "coin",
    "amount": 0,
    "sortOrder": 0
  }
]
```

Allowed icons:

```text
coin, bill, card, crypto, gem, token
```

If adding `actor.system.currencies` to `template.json` proves risky with existing actor data, use `flags.brp.inventory.currencies` only after explicitly documenting the reason in this spec/status notes.

### UI state flags

Use the existing namespace pattern from Skills/Combat:

```json
flags.brp.sheet.inventory = {
  "sectionSortModes": {
    "weapons": "custom",
    "armour": "custom",
    "other": "custom"
  },
  "sectionCollapsed": {
    "weapons": false,
    "armour": false,
    "other": false
  },
  "expandedItems": {},
  "expandedContainers": {},
  "filters": {
    "types": ["weapon", "armour", "container", "consumable", "tool", "equipment", "loot"],
    "equipped": false,
    "carried": false,
    "favorite": false,
    "hideEmpty": true
  },
  "customOrder": {
    "weapons": [],
    "armour": [],
    "other": []
  }
}
```

Search query should remain local sheet state and not be stored on actor.

## Target view model

Build a new `inventoryView` that replaces the old `armour`/`gear`-only shape but can keep compatibility fields during migration.

Suggested structure:

```js
context.inventoryView = {
  header,
  currencies,
  filters,
  sections: {
    weapons,
    armour,
    other
  },
  allRows,
  containerTree,
  settings
};
```

Inventory item row:

```js
{
  id,
  name,
  item,
  documentType,
  productionType,
  mockType,
  inventoryKind,
  icon,
  iconClass,
  rowClass,
  searchText,
  favorite,
  carried,
  equipped,
  empty,
  containerId,
  nestingDepth,
  stats,
  meta,
  details,
  bonuses,
  actions,
  sort
}
```

Container row additions:

```js
{
  isContainer: true,
  contents,
  capacity: {
    value,
    max,
    pct,
    over
  },
  encReductionPct,
  effectiveEnc,
  dropAllowed,
  depth
}
```

Encumbrance header:

```js
{
  total,
  max,
  pct,
  zone,
  penaltyLabel,
  markers
}
```

Important: header may display existing `actor.system.enc`, but container-aware effective ENC needs a dedicated helper. If helper output conflicts with existing `actor.mjs` ENC, stop and decide whether `06` updates actor prepare or only displays a preview. Do not silently show one ENC while fatigue uses another.

## Target UI structure

Template target:

```hbs
<section class="actor tab items {{tab.cssClass}}" data-group="primary" data-tab="items">
  <section class="brp-items-refresh">
    <header class="brp-items-refresh-header">...</header>
    <section class="brp-items-overview">...</section>
    <section class="brp-items-toolbar">...</section>
    <section class="brp-items-filter-panel">...</section>
    <section class="brp-items-section is-weapons">...</section>
    <section class="brp-items-section is-armour">...</section>
    <section class="brp-items-section is-other">...</section>
  </section>
</section>
```

Must match mockup:

- title `Items` with lock indicator;
- encumbrance panel left;
- currency pills right;
- toolbar with search, filters, add item;
- filter panel layout;
- section headers with count, line, sort pill;
- item row grid with handle, icon, name/meta, stats, actions, chevron;
- equipped left mint border;
- inactive carried opacity;
- empty quantity row line-through;
- container body with info bar, nested rows and drop zone.

Allowed adaptations:

- `Armour` label can use localized `BRP.armour`.
- Font Awesome icons can replace inline SVG if sizing/color/shape matches the mockup closely.
- Production CSS classes must be prefixed with `brp-items-refresh-*`, not copied as generic `.item`, `.toolbar`, `.modal`.

## Этапы реализации

Every stage below has an execution marker. Do not start a later stage until the acceptance of the previous stage is satisfied, unless the user explicitly approves parallel work.

### Этап 0. Baseline and exact mock audit

Статус: [x] completed

Files to inspect/anchor:

- [templates/actor/character.items.hbs](../templates/actor/character.items.hbs)
- [module/actor/sheets/character/prepare/inventory.mjs](../module/actor/sheets/character/prepare/inventory.mjs)
- [module/actor/actor.mjs](../module/actor/actor.mjs)
- [spec/uirefresh/brp-items-tab-mockup.html](./uirefresh/brp-items-tab-mockup.html)
- [spec/uirefresh/brp-items-tab-spec.md](./uirefresh/brp-items-tab-spec.md)

Actions:

- Confirm dirty tree and unrelated files.
- Snapshot current Items behavior:
  - armour rows;
  - gear rows;
  - inline quantity;
  - equip status cycle;
  - add gear/add armour;
  - view item sheet;
  - HPL armour summary toggle.
- Compare mockup row/section/header dimensions against current refresh CSS variables.
- Record any mockup issue before coding.

Acceptance:

- Current working actions are listed and must be preserved or intentionally replaced.
- UI differences from mock are known before template rewrite.

Audit notes:

- Dirty tree before work: unrelated untracked refresh specs/mockups exist under `spec/uirefresh/` for character/personality/social/story tabs. No tracked source files were modified before this stage.
- Current `Items` template renders two sections only: `Armour` and `Equipment`. `weapon` items are prepared only for `Combat`, not for `Items`.
- Current armour rows support HPL summary rows, per-location armour rows, AP/BAP, energy, power store, ENC, skill modifier display, `itemToggle` equip-status cycling, per-location collapse/expand and global HPL armour expand/collapse.
- Current gear rows support name click to open item sheet, inline `quantity`, inline power-store current value, ENC display and `equipStatus` cycling.
- Current create actions are `createDoc` for `gear` and `armour`; new items open their sheet after creation.
- Current view action is `viewDoc`; Ctrl-click can delete with confirmation for most item types, Alt-click has chat behavior for some powers.
- Current inline edits use shared `.inline-edit` handling and currently accept fields such as `quantity`, `av1`, `ppCurr`, `pSCurr`, `ammoCurr`.
- Current drag/drop accepts external item drops through the base actor sheet. Same-actor item sorting currently routes through the generic sort path and is not inventory-section aware.
- Current ENC source of truth is actor preparation: `gear`/`weapon` count only when `equipStatus === "carried"`; `armour` keeps its special HPL/fraction logic and worn AP application.
- Current refresh shell dimensions already match the mockup shell closely: sidebar `260px`, rail `52px`, card/base colors and 4px outer radius are present in `--brp-refresh-*` variables.
- Current legacy inventory styling is not mock-aligned: no Items tab title/header/toolbar/currency/filter panel; row grid is `minmax(170px, 1fr) minmax(240px, 2fr) auto`, row padding is `6px`, row radius is `4px`, cells are legacy boxed chips, and only armour/gear sections exist.
- Mockup target dimensions to preserve during template rewrite: workspace padding `20px 24px`, header grid `340px 1fr`, toolbar height `36px`, section body gap `4px`, row grid `12px 36px 1fr auto auto auto`, row padding `8px 12px`, row/action buttons `28px`, item icon `36px`, row/card radius `2px`.
- Mockup differences/issues recorded before coding: mockup uses standalone generic classes such as `.item`, `.toolbar`, `.modal` and imports Google Fonts; production must use prefixed `brp-items-refresh-*` classes and no CDN. Mockup says `armor`, production remains `armour`. Mockup separates carried/equipped for weapons, production currently has only `equipStatus`; the planned adapter remains required.

### Этап 1. Schema and item sheet fields

Статус: [x] completed

Files:

- [template.json](../template.json)
- [templates/item/gear.detail.hbs](../templates/item/gear.detail.hbs)
- [templates/item/weapon.detail.hbs](../templates/item/weapon.detail.hbs)
- [templates/item/armour.detail.hbs](../templates/item/armour.detail.hbs)
- [module/item/sheets/gear.mjs](../module/item/sheets/gear.mjs)
- [module/item/sheets/weapon.mjs](../module/item/sheets/weapon.mjs)
- [module/item/sheets/armour.mjs](../module/item/sheets/armour.mjs)
- [module/apps/select-lists.mjs](../module/apps/select-lists.mjs)
- [lang/en.json](../lang/en.json), [lang/es.json](../lang/es.json), [lang/fr.json](../lang/fr.json)

Actions:

- Add `gear.system.inventoryKind` and supporting fields.
- Add shared `containerId` and `bonuses` where needed.
- Add `actor.system.currencies` default.
- Add select list options for inventory kind, use effect and currency icons.
- Extend gear item sheet with kind-specific fields:
  - container capacity/reduction;
  - consumable use effect/stackable;
  - tool/equipment bonuses editor MVP;
  - loot value.
- Add minimal container field to weapon/armour item sheets only if required for debugging/editing.
- Keep old gear fields visible and working.

Acceptance:

- Old gear opens as `equipment`.
- New gear can be configured as container/consumable/tool/equipment/loot.
- Existing weapon/armour sheets still open.
- JSON/localization checks pass.

Implementation notes:

- Added `actor.system.currencies` default to `template.json` with initial `credits` currency.
- Added `gear.system.inventoryKind`, `stackable`, `containerId`, `capacityEnc`, `encReductionPct`, `useEffect`, `usesRemaining`, `value` and `bonuses`.
- Added shared `containerId` and `bonuses` to `weapon` and `armour`.
- Added select-list helpers for inventory kind, inventory use effect and currency icons.
- Gear sheet now exposes inventory kind and kind-specific MVP fields for container, consumable and loot. Tool/equipment bonuses use a JSON-array textarea stored through `system.bonuses`.
- Weapon and armour sheets expose minimal `containerId` plus the shared bonuses JSON-array editor.
- Added base item-sheet submit handling for `system.bonusesJson`, so invalid JSON warns and valid arrays save to `system.bonuses`.
- Validation run: `template.json`, `lang/en.json`, `lang/es.json`, `lang/fr.json` parsed successfully; changed `.mjs` files passed `node --check`.

### Этап 2. Inventory domain helpers

Статус: [x] completed

Files:

- new `module/actor/sheets/character/prepare/inventory-helpers.mjs` or equivalent
- [module/actor/sheets/character/prepare/inventory.mjs](../module/actor/sheets/character/prepare/inventory.mjs)
- [module/actor/actor.mjs](../module/actor/actor.mjs), only if actor ENC source of truth must change

Actions:

- Add helpers:
  - normalize item mock type;
  - adapt `equipStatus` to UI carried/equipped state;
  - compute stack quantity and empty state;
  - compute container tree from `containerId`;
  - compute nesting depth;
  - validate max nesting depth 3;
  - compute container content ENC;
  - compute effective container ENC with reduction;
  - compute total inventory ENC.
- Do not change armour ENC mechanics unless user confirms a specific mismatch.
- Decide and document whether container-aware ENC updates `actor.system.enc` or is displayed as Items-only preview.

Acceptance:

- Helper output can represent every mock row type.
- Container tree is derived from item `containerId`.
- Invalid cycles/nesting are detected.
- No template logic is needed for calculations.

Implementation notes:

- Added `module/actor/sheets/character/prepare/inventory-helpers.mjs`.
- Helpers normalize production item types into mock row types: `weapon`, `armor`, `container`, `consumable`, `tool`, `equipment`, `loot`.
- Helpers adapt legacy `system.equipStatus` into UI `carried` / `equipped` state without adding new source-of-truth fields.
- Helpers compute stack quantity, empty state, container tree from `system.containerId`, nesting depth, max-depth violations, cycle/missing/non-container parent issues, content ENC, effective container ENC and total preview ENC.
- Container-aware ENC is currently an Items-only preview in `context.inventoryDomain` / `inventoryView.domain`; `actor.system.enc` and `actor.mjs` were intentionally not changed in this stage.
- Armour ENC preview preserves current mechanics by using `system.actlEnc` when available and not replacing the existing HPL/fraction calculation.
- Validation run: changed inventory `.mjs` files passed `node --check`; standalone helper smoke verified mock type normalization, container tree derivation, reduction ENC and cycle detection.

### Этап 3. Inventory view model

Статус: [x] completed

Files:

- [module/actor/sheets/character/prepare/inventory.mjs](../module/actor/sheets/character/prepare/inventory.mjs)
- [module/actor/sheets/character/character-items.mjs](../module/actor/sheets/character/character-items.mjs)
- [module/actor/sheets/character/prepare/combat.mjs](../module/actor/sheets/character/prepare/combat.mjs)

Actions:

- Include `weapon` rows in `inventoryView.sections.weapons`.
- Include `armour` rows in `inventoryView.sections.armour`.
- Include `gear` rows in `inventoryView.sections.other`, grouped by `inventoryKind` only visually/filter-wise.
- Exclude contained children from top-level sections.
- Prepare row stats:
  - weapon damage/%/ENC using existing combat preparer fields where possible;
  - armour AP/BAP/ENC/skill mods using current armour fields;
  - container holds/effective ENC/capacity;
  - consumable quantity/ENC/use effect;
  - tool bonuses;
  - loot value.
- Prepare search text from name, notes/description, kind, bonuses.
- Prepare sort keys for custom/name/type/ENC.
- Prepare currencies.
- Keep compatibility `inventoryView.armour` and `inventoryView.gear` only as long as old template needs them; remove when template is fully replaced.

Acceptance:

- New template can render without reading raw item internals deeply.
- Combat still receives carried weapons.
- Health still receives worn armour.

Implementation notes:

- `inventoryView.sections.weapons`, `inventoryView.sections.armour` and `inventoryView.sections.other` are now prepared from `context.inventoryDomain`.
- `inventoryView.sectionList` contains the same three refresh sections in render order.
- `inventoryView.armour` and `inventoryView.gear` remain as legacy compatibility for the current old template.
- Top-level refresh sections use `inventoryDomain.topLevelRows`, so contained children are excluded from top-level lists and attached to container row `children`.
- Weapon inventory rows reuse exported `buildCombatWeaponRow()` from `prepare/combat.mjs`, while `Combat` still filters to carried weapons as before.
- Armour inventory rows expose AP/BAP/ENC/skill modifier fields from current armour data without changing Health preparation.
- Gear inventory rows expose kind-specific data for containers, consumables, tools, equipment and loot; `other.kindGroups` groups rows by `inventoryKind` for future visual/filter use.
- Rows now include prepared `stats`, `details`, `searchText`, `sort` keys for custom/name/type/encumbrance, status flags and actions, so the next template stage should not need deep raw item reads.
- `inventoryView.currencies` prepares actor currency rows from `actor.system.currencies`.
- Validation run: changed inventory/combat helper files passed `node --check`; standalone view-model smoke verified weapons/armour/other sections, contained-child exclusion, nested child rows, currencies and legacy gear compatibility.

### Этап 4. Template refresh, static interactions only

Статус: [x] completed

Files:

- [templates/actor/character.items.hbs](../templates/actor/character.items.hbs)
- [css/brp.css](../css/brp.css)

Actions:

- Replace old Items markup with refresh structure.
- Add header, encumbrance panel, currency panel, toolbar, filter panel and three sections.
- Render rows from prepared view model.
- Add item details and container body markup.
- Add action data attributes but only wire existing safe actions at this stage:
  - `viewDoc`;
  - `createDoc`;
  - inline edit where still needed.
- Preserve double click/open item sheet behavior.
- Use stable dimensions and responsive rules like Combat rows.

Acceptance:

- Items visually matches the mockup in static layout.
- Existing item sheets open.
- Add weapon/add armour/add gear paths remain reachable.
- No new destructive actions yet.

Implementation notes:

- Replaced the old `Armour` + `Equipment` Items template with the refresh structure: title/lock bar, ENC preview, currency panel, toolbar, disabled filter panel and `Weapons` / `Armour` / `Other` sections.
- Rows now render from `inventoryView.sections` prepared in stage 3, including stats, detail strips, item icons, status visuals and empty states.
- Container rows render a static container body with content ENC, capacity, reduction, nested child rows and a placeholder drop zone.
- Only existing safe actions are wired in markup: `viewDoc` on rows/eye actions and `createDoc` on add weapon/add armour/add gear controls. Status, filter, sort, currency and drop controls remain visual/disabled for later stages.
- Added scoped `brp-items-refresh` CSS before the legacy inventory block, with stable grids, compact action buttons, color accents by mock item type, nested container rows and responsive fallbacks.
- Validation run: changed `.mjs` files passed `node --check`; `template.json` and `lang/*.json` parsed successfully; `git diff --check` passed with line-ending warnings only; `character.items.hbs` passed a local Handlebars block-balance check. Full Handlebars parser check was skipped because the repository does not include the `handlebars` npm module.

### Этап 5. Basic item actions

Статус: [x] completed

Files:

- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs)
- possibly new `module/actor/sheets/character/character-inventory-actions.mjs`
- [templates/actor/character.items.hbs](../templates/actor/character.items.hbs)

Actions:

- Add inventory actions:
  - row details toggle;
  - section collapse;
  - favorite toggle;
  - carry/status toggle through current `equipStatus`;
  - armour worn toggle through current `equipStatus`;
  - delete with confirmation;
  - duplicate;
  - context menu.
- Reuse Skills/Combat scroll preservation patterns.
- Keep row click, action click and double click separated.
- Ensure changing weapon status updates Combat on render.
- Ensure changing armour status keeps Health behavior.

Acceptance:

- Every row can be expanded/collapsed.
- Carry/equip icons reflect current `equipStatus`.
- No accidental roll/open/delete from clicking action buttons.
- Favorite persists.

Implementation notes:

- Added inventory action handlers to `BRPCharacterSheet` for row details, section collapse, favorite toggle, carry/status toggle, armour worn toggle, duplicate, delete and context menu.
- Row details and section collapse persist under `flags.brp.sheet.inventory.expandedItems` and `flags.brp.sheet.inventory.sectionCollapsed`.
- Favorite reuses the existing item flag pattern `flags.brp.sheet.favorite`.
- Carry/status controls update only `system.equipStatus`: non-armour items toggle `carried` / `packed`; armour carry toggles `worn -> carried`, `carried -> packed`, otherwise `carried`; armour worn toggles `worn` / `carried`.
- Duplicate clones the owned item with a localized copy name. Delete uses a confirmation dialog before removing the owned item.
- Added an inventory context menu with view, favorite/unfavorite, carry/pack, armour worn, duplicate and delete options.
- Updated Items markup and CSS for expanded rows, collapsed sections, favorite accents, action buttons and hidden detail/container bodies.
- Added generic `BRP.duplicate` localization key for item duplicate controls.
- Validation run: changed character/inventory `.mjs` files passed `node --check`; `character.items.hbs` passed a local Handlebars block-balance check.

### Этап 6. Search, filters and sort

Статус: [x] completed

Files:

- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs)
- [module/actor/sheets/character/prepare/inventory.mjs](../module/actor/sheets/character/prepare/inventory.mjs)
- [templates/actor/character.items.hbs](../templates/actor/character.items.hbs)
- [css/brp.css](../css/brp.css)

Actions:

- Implement live search as local sheet state.
- Implement filter panel:
  - type filters;
  - equipped only;
  - carried only;
  - favorites only;
  - hide empty default on.
- Implement active filter count badge.
- Implement per-section sort modes:
  - custom;
  - A-Z;
  - Z-A;
  - By type for Other;
  - ENC down;
  - ENC up.
- Store sort/filter/collapse state under `flags.brp.sheet.inventory`.
- Search must temporarily reveal matching rows in collapsed sections/containers without destroying saved collapsed state.

Acceptance:

- Search/filter/sort match mockup behavior.
- Clearing search restores saved collapse state.
- Filter count counts deviations from default.

Implementation notes:

- Added local live search state on the character sheet. The query is not stored on the actor; matching rows are revealed transiently inside collapsed sections/containers and clearing the query returns to the saved collapse/expanded state.
- Added persisted inventory filters under `flags.brp.sheet.inventory.filters`: type filters, equipped/carried/favorite only, and hide-empty default-on. Saved type filter values use the production `armour` name, while the visual row class still follows the mockup `armor` class.
- Added active filter count preparation and toolbar badge rendering.
- Added per-section sort state under `flags.brp.sheet.inventory.sectionSortModes` with custom, name A-Z/Z-A, type for Other, ENC high-low and ENC low-high modes.
- Updated the refresh Items template and CSS for the search input, filter panel, active badges and section sort menus.
- Added localization keys for filter/sort/search labels in `lang/en.json`, `lang/es.json` and `lang/fr.json`.
- Validation run: changed character/inventory `.mjs` files passed `node --check`; `template.json` and `lang/*.json` parsed successfully; `character.items.hbs` passed a local Handlebars block-balance check; `git diff --check` passed with line-ending warnings only.

### Этап 7. Custom order and drag/drop

Статус: [x] completed

Files:

- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs)
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs), only if generic drop handling must be extended
- [module/actor/sheets/character/prepare/inventory.mjs](../module/actor/sheets/character/prepare/inventory.mjs)

Actions:

- Implement custom order drag handles for section rows.
- Drag reorder works only in Custom sort mode, or switches section to Custom before saving.
- Store order in `flags.brp.sheet.inventory.customOrder`.
- Implement container drop zones:
  - top-level item into container;
  - item out of container;
  - item from one container to another.
- Validate:
  - max nesting depth 3;
  - no cycles;
  - capacity;
  - no cross-section type mutation through drag.
- Keep Foundry item drag/drop for external drops.

Acceptance:

- Custom order persists.
- Container moves update `containerId`.
- Invalid drops warn and do not mutate data.
- Drag handles do not interfere with opening item sheets.

Implementation notes:

- Added local inventory drag handles on row grips. Drag starts only from the grip, so row name/eye actions still open item sheets normally and generic Foundry external drops remain handled by the base actor sheet.
- Added `flags.brp.sheet.inventory.customOrder` normalization and custom-order sorting for `Weapons`, `Armour` and `Other`.
- Row-to-row drops reorder only within the same inventory section and the same current parent container. A successful reorder switches that section to `custom` sort and saves the order in inventory sheet flags.
- Added container drop zones for moving items into containers and top-level section drop zones for moving contained items back out.
- Container drops update `item.system.containerId` and validate target container type, max nesting depth, cycles, capacity and section ownership before mutating data.
- Added drag/drop visual states and localized warning labels for invalid inventory drops.
- Validation run: changed character/inventory `.mjs` files passed `node --check`; `template.json` and `lang/*.json` parsed successfully; `character.items.hbs` passed a local Handlebars block-balance check; `git diff --check` passed with line-ending warnings only.

### Этап 8. Containers and ENC integration

Статус: [x] completed

Files:

- [module/actor/sheets/character/prepare/inventory.mjs](../module/actor/sheets/character/prepare/inventory.mjs)
- [module/actor/actor.mjs](../module/actor/actor.mjs), only if agreed
- [templates/actor/character.items.hbs](../templates/actor/character.items.hbs)

Actions:

- Finalize container capacity info bar.
- Apply ENC reduction only when the container is carried by current `equipStatus` adapter.
- Show over-capacity state.
- Ensure contained items do not double-count in top-level inventory ENC.
- Resolve source of truth for `actor.system.enc` vs container-aware computed ENC.

Acceptance:

- Container display matches mockup.
- Nested containers render up to depth 3.
- ENC math is documented and consistent with fatigue/actor prepare or explicitly marked as Items-only until actor prepare update.

Implementation notes:

- `actor.system.enc` is now resolved through the same container-aware inventory domain used by the Items tab, so fatigue uses the same total as the refreshed inventory view.
- Individual `gear`/`weapon`/`armour` `system.actlEnc` preparation remains in the actor loop for legacy row data and armour/HPL side effects, but the actor total ENC is assigned once after item preparation from `computeInventoryTotalEnc(actor.items)`.
- Contained items are excluded from top-level total ENC. A carried container contributes its own ENC plus contained effective ENC after `encReductionPct`; a non-carried container contributes `0`, so its contents do not affect carried ENC.
- Container rows now expose `capacityLabel`, applied reduction percentage and `overCapacity` state. Over-capacity containers get a red row/info highlight while still rendering and remaining draggable.
- Nested container contents are flattened into the container child list up to the existing max depth of 3, with indentation by depth and container drop zones available on nested container rows.
- Validation run: changed actor/character/inventory `.mjs` files passed `node --check`; `template.json` and `lang/*.json` parsed successfully; `character.items.hbs` passed a local Handlebars block-balance check; a small helper smoke verified carried container reduction and non-carried container exclusion from total ENC; `git diff --check` passed with line-ending warnings only.

### Этап 9. Consumable use and stack split

Статус: [x] completed

Files:

- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs)
- [templates/dialog/selectItem.hbs](../templates/dialog/selectItem.hbs) or new split dialog template
- [templates/actor/character.items.hbs](../templates/actor/character.items.hbs)
- [lang/*.json](../lang)

Actions:

- Implement `inventoryUseConsumable`:
  - only for `gear.inventoryKind === "consumable"`;
  - if stackable, decrement `quantity`;
  - if `quantity === 0`, leave item and apply empty visual state;
  - create chat/action message with use effect label.
- Implement split stack:
  - only if `stackable && quantity > 1`;
  - dialog with amount 1..quantity-1;
  - clone item with split quantity;
  - original quantity decreases;
  - favorite does not transfer.
- Do not implement full use effects beyond message/decrement.

Acceptance:

- USE button matches mockup and cannot reduce below 0.
- Empty items are hidden by default filter and visible if filter disabled.
- Split stack creates a valid owned item.

Implementation notes:

- Added `inventoryUseConsumable` for `gear` items with `inventoryKind === "consumable"`. Stackable consumables decrement `system.quantity` by 1 and stop at 0; non-stackable consumables post the use message without quantity mutation.
- Consumable use creates a chat/action message with the localized use-effect label. No automatic effect automation was added.
- Added `inventorySplitStack` for stackable gear with quantity greater than 1. The split dialog accepts an amount from `1` to `quantity - 1`, clones the item with the split quantity, decreases the original quantity and clears the copied favorite flag.
- Added USE and split controls to top-level and contained consumable rows, plus matching inventory context menu entries.
- Prepared consumable row state now exposes localized use-effect labels, `canUse` and `canSplit`.
- Empty stackable consumables continue to use the existing empty row state and hide-empty filter from Stage 6.
- Validation run: changed character/inventory `.mjs` files passed `node --check`; `template.json` and `lang/*.json` parsed successfully; `character.items.hbs` passed a local Handlebars block-balance check; `git diff --check` passed with line-ending warnings only.

### Этап 10. Currency CRUD

Статус: [x] completed

Files:

- [template.json](../template.json)
- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs)
- [templates/actor/character.items.hbs](../templates/actor/character.items.hbs)
- new or existing dialog template
- [lang/*.json](../lang)

Actions:

- Render currency pills and add button.
- Add currency dialog:
  - name;
  - amount;
  - icon picker.
- Click pill edits amount.
- Context menu or unlock-mode action supports rename/icon/delete.
- Persist to `actor.system.currencies` or documented fallback.

Acceptance:

- Currency UI matches mockup.
- Add/edit/delete works.
- Currency is not an item and does not affect ENC.

Implementation notes:

- Currency pills now open a dialog that edits name, amount and icon.
- The plus button adds a new currency entry with a stable generated id and sort order.
- Currency context menu supports edit and delete with confirmation.
- Currency data persists only in `actor.system.currencies`; no Item document is created, so currency does not affect ENC.

### Этап 11. Bonuses display

Статус: [x] completed

Files:

- [templates/item/gear.detail.hbs](../templates/item/gear.detail.hbs)
- [module/item/sheets/gear.mjs](../module/item/sheets/gear.mjs)
- [module/actor/sheets/character/prepare/inventory.mjs](../module/actor/sheets/character/prepare/inventory.mjs)
- [templates/actor/character.items.hbs](../templates/actor/character.items.hbs)

Actions:

- Add simple bonuses editor/display in item sheet.
- Render compact bonuses in item row:
  - `+10% Repair`;
  - `Easy - First Aid`;
  - truncated text mode.
- Render full bonus list in details.
- Respect `requiresCarried` visually:
  - if item is not carried, bonus row can be dimmed;
  - do not automate skill rolls.

Acceptance:

- Tools and other gear can show bonuses.
- Three modes render correctly: `flat`, `difficulty`, `text`.
- No roll automation is added.

Implementation notes:

- Gear item sheets now show a lightweight preview for stored `system.bonuses` above the existing JSON-array editor.
- Inventory rows prepare normalized bonus display rows for `flat`, `difficulty` and `text` bonus modes. Supported object aliases include `mode`/`type`/`kind`, `value`/`amount`/`modifier`/`bonus`/`percent`, `skill`/`skillName`/`target`/`targetSkill`, and `text`/`label`/`name`/`description`/`note`.
- Compact row chips render examples such as `+10% Repair`, `Easy - First Aid` and truncated text labels; expanded details render the full prepared bonus labels.
- `requiresCarried` only changes visual state by dimming the bonus when the item is not carried. No skill roll automation was added.

### Этап 12. Visual parity pass

Статус: [x] completed

Files:

- [templates/actor/character.items.hbs](../templates/actor/character.items.hbs)
- [css/brp.css](../css/brp.css)
- [spec/uirefresh/brp-items-tab-mockup.html](./uirefresh/brp-items-tab-mockup.html)

Actions:

- Compare implemented UI against mockup section by section.
- Tune:
  - spacing;
  - row grid columns;
  - icon colors;
  - opacity states;
  - section headers;
  - filter panel;
  - currency pills;
  - container nested body.
- Check narrow width behavior.
- Explicitly document any visual deviation.

Acceptance:

- UI is visually 1-в-1 with mockup except documented project-specific adaptations.
- Long names/translated labels do not overlap.
- No card-inside-card visual issue.

Implementation notes:

- Compared the implemented Items tab against `spec/uirefresh/brp-items-tab-mockup.html` and tuned CSS for the header, currency pills, toolbar/filter panel, section headers, row grid, icon colors, opacity states and container body.
- Sections are now unframed visual groups with header lines instead of card shells around row cards, avoiding the card-inside-card look.
- Type color now primarily lives on item icons, matching the mockup: weapon/loot amber, armor blue, container mint, consumable green, tool purple and equipment muted.
- `!carried` rows use the mockup's stronger dimming, empty rows dim further and strike through the item name.
- Narrow-width CSS keeps stats/actions/details under the main row content and keeps container bodies full-width with reduced padding on very narrow layouts.

Documented project-specific visual deviations:

- Production keeps Foundry/BRP action wiring and Font Awesome icons instead of the mockup's inline SVG controls.
- Production uses `armour` internally and localized labels externally; the mockup names the data type `armor`.
- Currency CRUD uses the Foundry dialog/select flow from Stage 10 rather than the mockup's custom modal icon grid.
- The ENC panel still shows current actor ENC plus the prepared preview because that matches the existing BRP data model.

### Этап 13. Verification and smoke-check

Статус: [x] completed (static checks complete; Foundry smoke-check delegated to user)

Code checks:

- `node --check module/actor/sheets/character.mjs`
- `node --check module/actor/sheets/character/character-items.mjs`
- `node --check module/actor/sheets/character/prepare/inventory.mjs`
- `node --check module/actor/sheets/character/prepare/combat.mjs`
- `node --check module/item/sheets/gear.mjs`
- `node --check module/item/sheets/weapon.mjs`
- `node --check module/item/sheets/armour.mjs`
- JSON parse for `template.json` and `lang/*.json`
- `git diff --check`

Manual Foundry smoke-check:

- Items tab opens in locked and unlocked states.
- Weapons/Armour/Other sections render.
- Weapon status change affects Combat visibility after render.
- Armour worn/carried/packed/stored still affects Health and ENC as before.
- Gear old items default to equipment.
- New gear kinds render in Other with correct colors/icons.
- Search filters by name/description/bonus.
- Type/state filters work.
- Section collapse persists.
- Sort modes work per section.
- Custom order persists.
- Container add/move/remove works.
- Nested depth 3 guard works.
- Container capacity and reduction display correctly.
- Consumable use decrements quantity and posts message.
- Quantity 0 visual state and hide-empty filter work.
- Split stack works.
- Currency add/edit/delete works.
- Context menu view/favorite/duplicate/split/delete works.
- Double click opens item sheet.
- External item drop still works.
- Narrow sheet width does not overlap text/actions.

Acceptance:

- All mandatory mockup features work.
- Old Combat/Health/Skills core flows are not broken.
- Any deferred item is written to [BACKLOG.md](../BACKLOG.md), but only if it is truly outside the confirmed `06` scope.

Verification notes:

- Static code checks passed:
  - `node --check module/actor/actor.mjs`
  - `node --check module/actor/sheets/character.mjs`
  - `node --check module/actor/sheets/character/character-items.mjs`
  - `node --check module/actor/sheets/character/prepare/combat.mjs`
  - `node --check module/actor/sheets/character/prepare/inventory.mjs`
  - `node --check module/actor/sheets/character/prepare/inventory-helpers.mjs`
  - `node --check module/apps/select-lists.mjs`
  - `node --check module/item/sheets/armour.mjs`
  - `node --check module/item/sheets/base-item-sheet.mjs`
  - `node --check module/item/sheets/gear.mjs`
  - `node --check module/item/sheets/weapon.mjs`
- `template.json` and `lang/en.json`, `lang/es.json`, `lang/fr.json` parsed successfully.
- Local Handlebars block-balance check passed for `templates/actor/character.items.hbs`, `templates/item/armour.detail.hbs`, `templates/item/gear.detail.hbs` and `templates/item/weapon.detail.hbs`.
- `git diff --check` passed with line-ending warnings only.
- No repository `package.json` was found, so no npm test script was available.
- Manual Foundry smoke-check was intentionally not run here because the user will run it in Foundry.
- No deferred task was added to `BACKLOG.md`; the remaining check is an owner-run manual verification, not out-of-scope work.

## Риски

- `equipStatus` is a compact legacy state, while mockup separates carried/equipped. The adapter must stay explicit to avoid adding contradictory state.
- Container-aware ENC may conflict with current `actor.mjs` fatigue calculation. This is the highest-risk rules point.
- Showing weapons in Items and Combat can create duplicate management surfaces. `Items` owns inventory state; `Combat` owns attack workflow.
- `armour` has special HPL behavior. Avoid reusing generic gear/container logic blindly on armour.
- `contents[]` duplication would cause stale container data. Use `containerId` as source of truth.
- Context menu/delete/split are destructive. Use confirmations where data loss can happen.
- Search/filter/collapse can conflict with nested containers. Keep saved state separate from transient search state.
- Currency actor schema may need careful template defaults to avoid breaking old actors.

## Рекомендуемый первый implementation slice

First slice after approving this plan:

1. Add `inventoryKind`, container fields, bonuses and currency schema defaults.
2. Extend gear item sheet enough to edit the new fields.
3. Build inventory helpers and view model while still rendering old template.
4. Only after data is prepared, replace `character.items.hbs`.

Why:

- data adaptation is the real foundation;
- template parity is much easier when rows are prepared already;
- old Items can remain usable until the new renderer is ready.

## Критерий готовности `06`

`06` считается завершенным, когда:

- Items UI visually matches the mockup;
- `weapon`, `armour`, and all `gear.inventoryKind` rows are visible in the right sections;
- existing `equipStatus` remains source of truth and is correctly adapted to UI;
- weapons are managed in Items and shown in Combat only when carried;
- armour mechanics remain compatible with current Health/ENC behavior;
- containers with nesting/capacity/reduction work;
- currency CRUD works;
- search/filter/sort/custom order work;
- consumable use and split stack work;
- bonuses display works without roll automation;
- old item sheets still open and edit required fields;
- code checks and manual smoke-check pass.
