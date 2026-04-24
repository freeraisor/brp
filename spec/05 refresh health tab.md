# 05 Refresh health tab

Дата фиксации: 2026-04-22

Статус: план-предложение для полноценной реализации `Health` tab после refresh shell, Skills, Combat и первичного Health split. Документ описывает UI rebase, новую систему ран и миграцию данных. Сам по себе документ не меняет поведение.

## Цель

Сделать полноценный rebase вкладки `Health`, чтобы после реализации работали и новый интерфейс, и новая система ран:

- визуальный Health workspace в стиле нового sheet shell;
- human/humanoid silhouette как основной визуальный слой для типовых персонажей;
- всегда доступный список hit locations как рабочий fallback;
- новая модель wounds с историей, статусами, типом урона и лечением;
- нормальная миграция старых wounds;
- read-only сводка worn armor в Health, без переноса управления броней из `Items`;
- совместимость с текущими BRP actions, roll flow и actor preparation, насколько это не конфликтует с новой моделью.

Главный принцип: мокап задает визуальное направление и UX-идею, но не является буквальной реализацией. В `brp-health-tab-mockup.html` есть демо-логика и баги, поэтому код должен опираться на Foundry patterns, текущую модель проекта и отдельные сервисы механики.

## Источники

HTML и целевой UX:

- [BRP Health Tab Specification](./uirefresh/brp-health-tab-spec.md) - базовое описание новой логики Health, wounds, silhouette, healing, armor и Major Wound.
- [BRP Health Tab Mockup](./uirefresh/brp-health-tab-mockup.html) - визуальный ориентир для body-viz, summary, locations list, wound rows, worn armor и healing modals. Использовать как пример, не копировать дословно.

Предыдущие refresh-планы:

- [03 refresh sheet + skill tab.md](./03%20refresh%20sheet%20+%20skill%20tab.md) - shell, sidebar, rail, общая карта вкладок и первичный Health split.
- [04 refresh combat tab.md](./04%20refresh%20combat%20tab.md) - граница ownership между Combat и Health.

Backlog:

- [BACKLOG.md](../BACKLOG.md) - отложенные механики: полная RAW-автоматизация Major Wound, расширенный SVG support, body composition editor, advanced healing/conditions.

Текущая реализация BRP:

- [templates/actor/character.health.hbs](../templates/actor/character.health.hbs) - текущий Health template: summary, hit locations, wounds, healing actions.
- [module/actor/sheets/character/prepare/health.mjs](../module/actor/sheets/character/prepare/health.mjs) - текущая подготовка `healthView`.
- [module/actor/sheets/character/character-items.mjs](../module/actor/sheets/character/character-items.mjs) - routing items через preparers.
- [module/actor/sheets/character/character-context.mjs](../module/actor/sheets/character/character-context.mjs) - общий context builder.
- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs) - sheet parts, actions, render bindings, tab context.
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs) - текущие actions `addDamage`, `treatWound`, `viewWound`, `healing`, `itemToggle`, `armourRoll`, inline edit.
- [module/combat/damage.mjs](../module/combat/damage.mjs) - legacy damage/healing mechanics, add wound dialogs, natural healing, all heal, reset daily.
- [module/actor/actor.mjs](../module/actor/actor.mjs) - legacy prepare logic для HP, wounds, hit-location status aggregation и armor aggregation.
- [template.json](../template.json) - actor/item schema, текущие поля `wound`, `hit-location`, `armour`, health flags.
- [module/setup/update.mjs](../module/setup/update.mjs) - существующий world migration flow.
- [templates/dialog/newWound.hbs](../templates/dialog/newWound.hbs) - legacy add wound dialog.
- [templates/dialog/treatWound.hbs](../templates/dialog/treatWound.hbs) - legacy healing dialog.
- [module/item/sheets/wound.mjs](../module/item/sheets/wound.mjs) - current wound item sheet.
- [templates/item/wound.detail.hbs](../templates/item/wound.detail.hbs) - current wound details UI.
- [module/item/sheets/hit-location.mjs](../module/item/sheets/hit-location.mjs) - hit-location item sheet context.
- [templates/item/hit-location.detail.hbs](../templates/item/hit-location.detail.hbs) - hit-location item details and manual status toggles.
- [module/actor/sheets/character/prepare/statuses.mjs](../module/actor/sheets/character/prepare/statuses.mjs) - sidebar status model.
- [module/actor/sheets/character/prepare/sidebar.mjs](../module/actor/sheets/character/prepare/sidebar.mjs) - sidebar resource/status composition.
- [module/actor/sheets/character/prepare/inventory.mjs](../module/actor/sheets/character/prepare/inventory.mjs) - armor/gear view model.
- [templates/actor/character.items.hbs](../templates/actor/character.items.hbs) - current armor management UI.
- [css/brp.css](../css/brp.css) - current refresh theme, Combat styles and legacy Health styles.
- [lang/en.json](../lang/en.json), [lang/es.json](../lang/es.json), [lang/fr.json](../lang/fr.json) - localization keys.

Ориентиры dnd5e в локальной копии:

- [dnd5e/dnd5e.mjs](../dnd5e/dnd5e.mjs) - ApplicationV2 parts/container pattern.
- [dnd5e/templates/actors/character-sidebar.hbs](../dnd5e/templates/actors/character-sidebar.hbs) - persistent sidebar/resource patterns.
- [dnd5e/dnd5e.css](../dnd5e/dnd5e.css) - list controls, sheets, compact rows, meters.

## Подтвержденные решения

- `05` включает и новый UI, и новую систему wounds. После реализации плана Health должен быть рабочей системой, а не декоративным мокапом.
- Делаем нормальную миграцию старых wounds. Не оставляем старые данные в полу-совместимом состоянии.
- Расширяем существующий `Item` type `wound`, а не вводим новый document type.
- Новая canonical-модель раны хранит `damageRemaining`, но legacy `system.value` сохраняется как compatibility mirror на переходный период.
- `system.treated` также остается compatibility mirror: новый UI показывает `status` и treatment flags, но старые места не должны падать.
- Реальный режим HPL/non-HPL берется из `game.settings.get('brp', 'useHPL')`. Toggle из мокапа не переносим в production UI.
- В HPL Major Wound не применяется. В non-HPL используем MVP-вариант Major Wound: рана помечается как major, actor flag синхронизируется, UI и chat явно сообщают, что нужен Major Wound workflow.
- Полная RAW-автоматизация Major Wound table, Luck roll, shock и permanent effects вынесена в [BACKLOG.md](../BACKLOG.md).
- Worn armor в `Health` read-only. Управление броней, equip status и редактирование остаются в `Items`.
- Первичная silhouette-реализация поддерживает human/humanoid only. Это визуальный слой для основных сценариев, а не универсальный редактор анатомии.
- Default silhouette matching идет по BRPID hit location item: `i.hit-location.<bodypart>-humanoid`.
- Предлагаемый набор стандартных body parts: `head-humanoid`, `chest-humanoid`, `abdomen-humanoid`, `left-arm-humanoid`, `right-arm-humanoid`, `left-leg-humanoid`, `right-leg-humanoid`, `general-humanoid`.
- Список частей тела должен быть всегда доступен как fallback. Локации, которые не матчятся на silhouette, остаются полностью рабочими через список.
- Список hit locations можно свернуть/развернуть шевроном, но он не исчезает из модели и не становится вторичным источником данных.
- У silhouette должна быть кнопка-настройка с gear icon для ручного mapping hit location -> silhouette part.
- Mapping хранится на actor flags, чтобы не менять hit-location schema ради UI-настройки.
- В коде silhouette registry оставить короткий TODO-коммент: подумать о расширении поддержки SVG templates после humanoid MVP.
- Мокап Health содержит баги и демо-упрощения. При конфликте между мокапом и текущей архитектурой выбирать архитектурно безопасную реализацию и фиксировать отличие в коде/спеке.

## Не входит в этот план

- Полная Major Wound Table automation, Luck roll workflow, shock tracker, permanent loss automation. Это есть в [BACKLOG.md](../BACKLOG.md).
- Полноценный custom body composition editor.
- Поддержка произвольных SVG templates кроме humanoid MVP.
- Автоматические bleeding ticks, poison/disease progression и calendar-driven medical care.
- Перенос armor management из `Items` в `Health`.
- Переключение `useHPL` из actor sheet.
- Переработка NPC sheet, если изменение не требуется общей механикой damage/wounds.
- Подключение CDN или внешних UI libraries.
- Переписывание Combat roll mechanics. Combat должен только использовать новый apply damage entry point, когда до этого дойдет отдельный integration slice.

## Текущая точка

Health уже отделен как отдельный render part:

- `character.mjs` содержит `health` part в `brp-refresh-workspace`.
- `character-tabs.mjs` добавляет rail tab `health`.
- `character.health.hbs` показывает legacy wounds/hit locations/healing в отдельной вкладке.
- `prepare/health.mjs` строит `healthView` из `hit-location` и `wound` items.
- `combatView` уже в основном сфокусирован на Combat, но old health mechanics еще живут в `module/combat/damage.mjs` и `module/actor/actor.mjs`.

Legacy модель wounds минимальная:

```json
{
  "value": 1,
  "treated": false,
  "created": false,
  "locId": ""
}
```

Legacy поведение:

- `BRPDamage.addDamage` создает `wound` с `value` и `locId`.
- `actor.mjs` пересчитывает общий HP и HPL `currHP` через сумму `wound.system.value`.
- `BRPDamage.treatWound` уменьшает `value`, ставит `treated`, удаляет wound при полном лечении.
- `naturalHeal` распределяет healing по существующим wounds и удаляет закрытые.
- non-HPL Major/Minor Wound сейчас actor-level flags, а не свойства раны.
- HPL status effects частично выставляются по single damage threshold в `damage.mjs`, частично агрегируются в `actor.mjs`.

## Целевая структура Health tab

```text
Health
  header
    title
    lock indicator
  body overview
    silhouette panel
      viz tabs: Health / Armor / Wounds
      humanoid SVG
      mapping/settings gear
      legend
    summary panel
      total HP
      active wounds / major threshold
      natural healing rate
      disabled locations / worst wound
      active conditions
  hit locations / general body
    collapsible section
    rows
      location summary
      HP bar
      AP/BAP read-only
      wounds count
      add wound
      expandable wound list
  worn armor
    read-only rows for worn armor
  healing
    First Aid
    Medicine
    Natural
    Other
  modals
    add/apply damage
    heal wound
    silhouette mapping settings
```

## Целевая модель wound item

Не копируем snake_case из мокапа буквально. Для `template.json` и JS используем стиль текущего проекта: camelCase с сохранением legacy полей.

```json
{
  "value": 8,
  "damage": 8,
  "damageRemaining": 8,
  "damageType": "piercing",
  "status": "fresh",
  "locId": "hit-location-id-or-total",
  "isMajor": false,
  "firstAidUsed": false,
  "medicineLastDay": "",
  "source": "manual",
  "armorApplied": 0,
  "armorFormula": "",
  "armorRolls": [],
  "createdAt": 0,
  "createdLabel": "",
  "history": []
}
```

Compatibility:

- `system.value` mirrors `system.damageRemaining`.
- `system.treated` mirrors whether at least one treatment happened or `status` is one of `treated`, `healing`, `healed`, `scarred`.
- Existing places that still read `value` keep working during the migration period.
- New health mechanics must read/write `damageRemaining` and update mirrors through one helper.

Status values:

| Status | Meaning |
|---|---|
| `fresh` | active wound, no treatment yet |
| `bleeding` | active wound with bleeding state |
| `treated` | at least one treatment applied, still active |
| `healing` | natural healing in progress or recently applied |
| `infected` | manual GM/player state |
| `healed` | `damageRemaining <= 0`, normally hidden from active list |
| `scarred` | healed major wound, future polish |

Damage types:

```text
piercing, slashing, blunt, burn, cold, energy, poison, disease, other
```

History entry:

```json
{
  "id": "uuid-or-timestamp",
  "at": 1776864000,
  "label": "Session 12",
  "action": "First Aid",
  "method": "firstAid",
  "result": "success",
  "hp": 2,
  "note": "Bandaged and disinfected"
}
```

## Целевая health view model

`prepare/health.mjs` должен перестать быть только thin wrapper вокруг legacy items. Он собирает Health workspace view model.

```js
context.healthView = {
  useHPL,
  modeLabel,
  summary,
  silhouette,
  locations,
  unmatchedLocations,
  wounds,
  wornArmor,
  healingActions,
  settings
};
```

Location row:

```js
{
  id,
  item,
  name,
  brpid,
  locType,
  range,
  silhouettePart,
  isMappedToSilhouette,
  hp: {
    value,
    max,
    pct,
    critical,
    disabled
  },
  armour: {
    ap,
    bap,
    randomAp,
    randomBap,
    display,
    rollable,
    average
  },
  status: {
    injured,
    bleeding,
    incapacitated,
    unconscious,
    dead,
    severed,
    autoConditions
  },
  wounds,
  woundCount,
  searchText
}
```

Summary:

```js
{
  hp: { value, max, pct },
  activeWounds,
  woundedLocations,
  majorThreshold,
  majorWounds,
  worstWound,
  naturalHealingRate,
  disabledLocations,
  activeConditions
}
```

Silhouette:

```js
{
  type: "humanoid",
  vizMode,
  parts,
  mapping,
  unmatchedCount,
  settingsAction: "healthSilhouetteSettings"
}
```

## Silhouette matching

Initial implementation supports humanoid SVG only.

Default match order:

1. Actor flag override:

```js
flags.brp.health.silhouetteMap[hitLocation.id] = "left-leg-humanoid"
```

2. Exact BRPID match:

```text
i.hit-location.head-humanoid
i.hit-location.chest-humanoid
i.hit-location.abdomen-humanoid
i.hit-location.left-arm-humanoid
i.hit-location.right-arm-humanoid
i.hit-location.left-leg-humanoid
i.hit-location.right-leg-humanoid
i.hit-location.general-humanoid
```

3. No match: location remains in the fallback list and is marked as not shown on silhouette.

Do not rely on translated display names as primary matching source. Display names are user-facing and localization-sensitive.

Implementation proposal:

```text
module/actor/sheets/character/prepare/health-silhouette.mjs
```

Responsibilities:

- expose humanoid parts metadata;
- map hit-location rows to silhouette parts;
- compute colors for Health/Armor/Wounds modes;
- return unmatched rows;
- keep the SVG contract small.

Code comment to include near the humanoid registry:

```js
// TODO: Consider extending silhouette support with additional SVG templates after the humanoid MVP.
```

Silhouette settings modal:

- opened by gear button on silhouette panel;
- lists all current hit locations;
- each row has select: humanoid part / not shown;
- save writes actor flag `flags.brp.health.silhouetteMap`;
- reset removes actor flag override and returns to BRPID matching.

## Hit-location list fallback

The hit-location/general-body list is not optional. It is the authoritative working UI.

Rules:

- show all hit locations;
- show unmatched locations in the same list with a clear marker;
- section can collapse/expand with chevron;
- collapse state stored in actor sheet flags, not in item data;
- add wound and view wound remain available from the list;
- silhouette click is a shortcut, not the only way to work.

Suggested flag:

```js
flags.brp.sheet.healthLocationsCollapsed = false
```

## Worn armor read-only model

Health displays only worn armor:

```js
armour.system.equipStatus === "worn"
```

Armor management remains in `Items`.

Health armor rows show:

- name;
- linked hit location / coverage;
- AP and BAP;
- random formulas when `useAVRand` is enabled;
- average value for silhouette Armor mode;
- ENC;
- tooltip/link to item sheet.

Armor aggregation:

- HPL: aggregate by `armour.system.hitlocID`.
- non-HPL: use actor-level `system.av1`, `system.av2`, `system.avr1`, `system.avr2` as current system already prepares them.
- Multiple worn armor items on one location are summed for fixed AP and combined/rolled for random AP.

The add/apply damage flow uses the same armor aggregation service as the read-only UI, so display and mechanics stay in sync.

## Health mechanics service

Move new wound/damage/healing logic out of templates and thin sheet actions.

Suggested new module:

```text
module/combat/health.mjs
```

or, if keeping combat mechanics together is preferred:

```text
module/combat/damage.mjs
```

with clearly separated `BRPHealth` helpers.

Recommended API:

```js
BRPHealth.applyDamage(actor, {
  locationId,
  rawDamage,
  damageType,
  appliesArmor,
  armorOverride,
  woundName,
  description,
  source
});

BRPHealth.healWound(actor, {
  woundId,
  method,
  result,
  healing,
  note
});

BRPHealth.distributeNaturalHealing(actor, {
  healing,
  note
});

BRPHealth.computeActorHealth(actor);
BRPHealth.computeLocationHealth(actor, hitLocation);
BRPHealth.computeAutoConditions(actor);
BRPHealth.rollArmorForLocation(actor, locationId);
BRPHealth.migrateLegacyWoundData(wound);
```

All sheet actions should call this layer instead of mutating wound fields directly.

## Apply damage behavior

Modal inputs:

- location, prefilled from silhouette/list click;
- wound name optional;
- damage type;
- raw damage number;
- apply armor checkbox;
- description optional.

Algorithm:

1. Resolve target location:
   - HPL: selected hit-location item;
   - non-HPL: `general`/`total` pseudo-location.
2. If armor applies:
   - collect worn armor for the location;
   - fixed armor: sum AP;
   - random armor: roll formulas once and keep roll details.
3. `finalDamage = max(0, rawDamage - armorApplied)`.
4. If `finalDamage === 0`:
   - no wound item is created;
   - chat message says armor absorbed all damage.
5. Create wound item:
   - `damage = finalDamage`;
   - `damageRemaining = finalDamage`;
   - `value = finalDamage`;
   - `damageType`;
   - `status = "fresh"` or `"bleeding"` if explicitly selected later;
   - `locId`;
   - armor/source metadata.
6. Recompute HP and conditions.
7. In non-HPL, check Major Wound MVP.
8. Emit chat message with raw damage, armor result and final wound damage.

Legacy conflict note:

- Old HPL logic in `damage.mjs` uses single-hit thresholds and clamps damage in ways that differ from the new Health spec.
- `05` chooses the new aggregate wound model: location state is derived from active wounds and current HP.
- During implementation, if exact BRP threshold behavior needs to preserve old `2x/3x` semantics, stop and confirm before coding that rule.

## HP and status calculation

New source of truth:

```text
current HP = max HP - sum(active wound damageRemaining)
```

For HPL:

- each location HP is computed from wounds with matching `locId`;
- actor total HP is computed from all active wounds;
- `hit-location.system.currHP` can stay as compatibility/prepared value, but new code should compute through the health service;
- auto conditions come from computed HP and manual hit-location flags.

For non-HPL:

- actor HP is computed from all active wounds;
- single-wound `damage >= majorThreshold` triggers Major Wound MVP;
- sum of minor wounds reaching threshold can continue to set minor wound actor flag if the old rule is still desired.

Auto conditions MVP:

| Condition | Trigger |
|---|---|
| Location disabled | HPL location `hp.value <= 0` |
| Prone | leg disabled or abdomen disabled |
| Unconscious | head disabled or actor-level unconscious flag |
| Incapacitated | chest disabled or actor-level incapacitated flag |
| Severed/destroyed | HPL location `hp.value <= -hp.max` or manual severed flag |
| Bleeding | manual location/wound/actor flag |

Manual flags still matter because current item sheets and sidebar expose them.

## Major Wound MVP

Scope for `05`:

- non-HPL only;
- when a newly created single wound has `damage >= context.system.health.mjrwnd`, set:
  - `wound.system.isMajor = true`;
  - `actor.system.majorWnd = true`;
  - `actor.system.health.daily = 0`;
- Health summary shows active major wound state;
- wound row displays `Major` badge;
- chat message says that Major Wound was triggered and that Luck/table workflow is manual for now.

Not in `05`:

- automatic Major Wound table;
- Luck roll automation;
- shock tracker;
- permanent characteristic loss.

Those items are tracked in [BACKLOG.md](../BACKLOG.md).

## Healing behavior

Healing actions in Health:

| Action | MVP behavior |
|---|---|
| First Aid | choose active wound, roll/apply healing, mark `firstAidUsed`, write history |
| Medicine | choose active wound, roll/apply healing, write history |
| Natural | roll/apply healing across active wounds using deterministic distribution |
| Other | custom healing amount/formula, write history |

Heal modal:

- wound dropdown with location/name/damage remaining/status;
- method preselected by button;
- result selector: success/special/critical/failure/fumble;
- roll button or manual amount;
- note field;
- preview: current damage -> healing -> remaining.

First Aid rule:

- one First Aid per wound;
- ineligible wound options disabled for First Aid;
- migration sets `firstAidUsed` conservatively from legacy `treated`.

Medicine rule:

- first implementation records history and can store `medicineLastDay`;
- because this system does not currently have a clear calendar/day model, strict once-per-day enforcement should be minimal and transparent;
- if implementation cannot define a safe day key, stop and confirm before hard-blocking Medicine.

Natural healing:

- reuse the spirit of current `naturalHeal`: distribute a total healing amount across active wounds;
- deterministic MVP: sort active wounds by `damageRemaining` ascending and heal the lightest wounds first;
- write one history entry per affected wound.

Fumble:

- if result is fumble, increase `damageRemaining` by 1 and sync `value`;
- write negative/failed history entry.

## Wound item sheet

Update [templates/item/wound.detail.hbs](../templates/item/wound.detail.hbs) and [module/item/sheets/wound.mjs](../module/item/sheets/wound.mjs):

- show original damage and remaining damage;
- show damage type;
- show status;
- show location link/name if owned by actor;
- show `isMajor`;
- show `firstAidUsed`;
- show history list;
- keep legacy `value` safe but do not make it the main user-facing field.

Validation:

- `damage` and `damageRemaining` cannot be negative;
- `value` is synced to `damageRemaining`;
- `status` auto-updates to `healed` when `damageRemaining <= 0`.

## Sidebar status integration

Update [prepare/statuses.mjs](../module/actor/sheets/character/prepare/statuses.mjs) after health service exists:

- manual actor flags remain toggleable where they are safe;
- aggregate HPL statuses come from computed hit-location/wound state;
- auto statuses should be visually distinct where possible;
- sidebar tooltip should explain cause: e.g. `Prone (auto: Left Leg disabled)`.

Do not add mass-toggle behavior for aggregate HPL statuses unless there is a clear target location.

## Template refresh

Replace legacy Health markup in [character.health.hbs](../templates/actor/character.health.hbs) with refresh structure:

- `.brp-health-refresh`;
- header matching Combat style;
- `.brp-health-overview`;
- `.brp-health-silhouette-panel`;
- `.brp-health-summary-panel`;
- `.brp-health-location-section`;
- `.brp-health-location-list`;
- `.brp-health-wound`;
- `.brp-health-armour-list`;
- `.brp-health-healing-actions`.

Use Font Awesome icons already available in the system. Do not embed long inline SVG copied from the mockup unless it becomes the cleanest local asset choice for the humanoid body. For humanoid silhouette, prefer a small local partial/template or JS registry with clear path ids.

The UI should keep stable dimensions:

- fixed button sizes;
- stable HP bars;
- no layout jump when expanding wounds;
- responsive list collapse on narrow widths;
- no nested cards inside cards.

## CSS refresh

Add Health styles near existing refresh/Combat blocks in [css/brp.css](../css/brp.css).

Use existing refresh variables:

- `--brp-refresh-bg-base`;
- `--brp-refresh-bg-card`;
- `--brp-refresh-bg-elevated`;
- `--brp-refresh-border-soft`;
- `--brp-refresh-red`;
- `--brp-refresh-red-bright`;
- `--brp-refresh-mint`;
- `--brp-refresh-blue`;
- `--brp-refresh-amber`;
- `--brp-refresh-text`;
- `--brp-refresh-text-dim`;
- `--brp-refresh-text-muted`.

Avoid one-off palettes and avoid copying mockup colors as new hardcoded values unless they map to existing variables.

## Migration plan

Use existing update flow in [module/setup/update.mjs](../module/setup/update.mjs).

Add a new version migration after `13.1.55` when the implementation version is chosen.

Migration responsibilities:

1. Update `template.json` wound defaults with new fields.
2. Iterate world actors and actor compendia.
3. For every owned `wound` item:
   - read legacy `system.value`;
   - set `damage` to existing `damage` or legacy `value`;
   - set `damageRemaining` to existing `damageRemaining` or legacy `value`;
   - sync `value = damageRemaining`;
   - set `status = "treated"` if legacy `treated`, otherwise `"fresh"`;
   - set `firstAidUsed = Boolean(legacy treated)` as conservative compatibility;
   - set `isMajor = false` unless existing actor/non-HPL data can safely infer otherwise;
   - create empty `history` if missing;
   - preserve `locId`;
   - preserve existing description/gmDescription from base item template.
4. Recompute actor `majorWnd` only if unambiguous. Do not invent major wound history for old wounds.
5. Notify GM through update dialog before migration, following existing pattern.

Important: migration must not delete old wound items just because they lack new fields. It enriches them.

Suggested migration helper:

```text
module/setup/update-health-wounds.mjs
```

or local functions inside `update.mjs` if keeping migrations in one file is preferred.

## Этапы реализации

### Этап 0. Baseline

- Confirm current dirty tree and unrelated files.
- Capture current Health behavior:
  - HPL actor with hit locations and wounds;
  - non-HPL actor with wounds and major/minor flags;
  - armor in Items;
  - healing actions.
- Note current HP before migration for test actors.

Files to inspect/anchor:

- [templates/actor/character.health.hbs](../templates/actor/character.health.hbs)
- [module/actor/sheets/character/prepare/health.mjs](../module/actor/sheets/character/prepare/health.mjs)
- [module/combat/damage.mjs](../module/combat/damage.mjs)
- [module/actor/actor.mjs](../module/actor/actor.mjs)

### Этап 1. Schema and migration

- Extend `template.json` wound defaults.
- Add migration in `update.mjs`.
- Add update dialog template under `templates/updates/`.
- Add helper to normalize existing wound items.
- Verify migrated wounds preserve current HP math.

Acceptance:

- legacy wound with `value: 5, treated: false` becomes active wound with `damageRemaining: 5, status: "fresh"`;
- legacy wound with `treated: true` becomes `status: "treated", firstAidUsed: true`;
- old `value` remains equal to `damageRemaining`.

### Этап 2. Health mechanics service

- Add health service helpers for wound normalization, HP computation, armor aggregation, damage application and healing.
- Update old `BRPDamage` entry points to call new helpers or delegate cleanly.
- Keep old action names in sheet templates where useful.
- Make all mutations go through sync helpers.

Acceptance:

- `addDamage` creates new-format wound;
- old code paths still work through compatibility;
- `healWound`, `naturalHeal`, `allHeal`, `resetDaily` have equivalent or improved behavior.

### Этап 3. Health view model

- Rebuild `prepare/health.mjs` around the new view model.
- Prepare:
  - summary;
  - locations;
  - wounds;
  - worn armor;
  - healing actions;
  - silhouette data.
- Use current `inventory` armor preparation or shared armor helper to avoid duplicate AP logic.

Acceptance:

- Health template can render without reading raw `actor.system` deeply;
- HPL and non-HPL both have complete `healthView`;
- unmatched locations are explicit.

### Этап 4. Silhouette MVP

- Add humanoid silhouette metadata and matching helper.
- Add Health/Armor/Wounds color modes.
- Add gear/settings modal for mapping overrides.
- Store mapping in actor flags.
- Add TODO comment for future SVG support.

Acceptance:

- exact BRPID `i.hit-location.left-leg-humanoid` maps to left leg;
- unmatched custom location still appears in list;
- user can map/unmap a location manually;
- reset mapping returns to BRPID-based default.

### Этап 5. Health template refresh

- Replace legacy Health layout with refresh markup.
- Add body overview, summary, collapsible location list, worn armor, healing actions.
- Implement add damage and heal modals using Foundry dialogs/templates or ApplicationV2-compatible patterns.
- Keep actions semantic and data-driven.

Acceptance:

- no production HPL/non-HPL toggle;
- silhouette click and list plus button both open add damage;
- list remains usable without silhouette;
- worn armor is read-only and links to item sheet.

### Этап 6. Interactions

- Add actions in `character.mjs` or base sheet:
  - `healthAddDamage`;
  - `healthHealWound`;
  - `healthWoundToggle`;
  - `healthWoundDelete`;
  - `healthLocationToggle`;
  - `healthVizMode`;
  - `healthSilhouetteSettings`;
  - `healthSilhouetteMapSave`;
  - `healthNaturalHeal`;
  - `healthOtherHeal`.
- Preserve existing `addDamage`, `treatWound`, `viewWound`, `healing` where old templates or NPC sheets still use them.

Acceptance:

- no duplicated direct item mutation in template handlers;
- scroll position is preserved where expanding rows or applying small updates would otherwise jump;
- lock mode disables edit-style actions but keeps read/roll actions available as appropriate.

### Этап 7. Sidebar and status polish

- Update `prepareStatuses` with health service aggregate conditions.
- Make auto/manual distinction visible enough without turning sidebar into another Health editor.
- Ensure status click opens Health when a status is not directly toggleable.

Acceptance:

- non-HPL major wound badge is visible after major wound damage;
- HPL disabled/prone/unconscious auto states explain their source;
- no unsafe aggregate toggle for HPL locations.

### Этап 8. Wound item sheet refresh

- Update wound item sheet details.
- Add history display.
- Add validation/sync.
- Keep active effects tab intact.

Acceptance:

- opening a wound from Health shows the same data as Health row;
- editing damage remaining syncs `value`;
- history is readable.

### Этап 9. Verification and smoke-check

Manual smoke checks:

- New actor, non-HPL:
  - add minor wound;
  - add major wound;
  - see `isMajor`, actor `majorWnd`, chat instruction;
  - heal wound;
  - natural heal.
- New actor, HPL humanoid:
  - hit locations with BRPID map to silhouette;
  - add wound from silhouette;
  - add wound from list;
  - see HP and status update;
  - see armor mode colors.
- Legacy actor:
  - migration enriches wounds;
  - HP remains consistent before/after;
  - old wounds render in new Health UI.
- Armor:
  - equip/wear armor in Items;
  - Health read-only armor updates after render;
  - apply damage with armor creates correct final wound.
- Fallback:
  - custom hit location without silhouette mapping remains visible and usable in list.

CSS/responsive checks:

- default sheet size;
- narrow width around current compact breakpoint;
- long wound names and translated labels;
- no overlapping text;
- expanded wound history does not break location rows.

## Риски

- Legacy HP calculation currently mutates/derives values in `actor.mjs`. New service must not create double-subtraction between `value` and `damageRemaining`.
- `system.treated` had overloaded meaning. Migration cannot know whether old treatment was First Aid, magic or something else.
- Current HPL threshold behavior differs from the new aggregate model. This is the main rules-sensitive point.
- Armor aggregation lives partly in actor prepare and inventory prep. Duplicating it risks mismatch between display and damage application.
- Silhouette mapping by translated name would be brittle. Use BRPID and explicit actor flags.
- Full Major Wound automation is tempting but too large for this implementation slice.

## Рекомендуемый первый implementation slice

1. Add wound schema + migration helpers.
2. Add health service with normalized wound read/write and HP computation.
3. Update `prepare/health.mjs` to read new model while old template still renders.
4. Only then replace the Health template.

This keeps the dangerous data/model change separate from the visual rewrite.

## Критерий готовности `05`

`05` считается завершенным, когда:

- legacy wounds migrate automatically through the existing update flow;
- new wounds use extended data model;
- HPL and non-HPL Health tab both work;
- silhouette works for humanoid BRPID hit locations;
- fallback list works for every hit location;
- user can configure silhouette mapping;
- add damage, armor application, healing and natural healing work from Health UI;
- Major Wound MVP works for non-HPL;
- worn armor is visible read-only in Health and managed in Items;
- sidebar statuses reflect new health state;
- old NPC/legacy actions are not accidentally broken;
- manual smoke checks above pass.
