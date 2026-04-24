# 08 Refresh social tab

Дата фиксации: 2026-04-23

Статус: план-предложение для полноценного visual/data rebase вкладки `Social`. Документ не меняет поведение сам по себе и описывает порядок работ так, чтобы идти по этапам последовательно и не возвращаться к уже закрытым решениям без явного нового согласования.

## Цель

Сделать полноценный rebase rail-tab `Social` в стиле нового shell и целевого мокапа:

- визуально привести вкладку к [BRP Social Tab Mockup](./uirefresh/brp-social-tab-mockup.html);
- сохранить существующую рабочую механику `allegiance` и `reputation`, где это возможно без ломки данных;
- добавить недостающие сущности и минимально нужную новую логику для `contact` и `faction`;
- реализовать новый UI секций: `Allegiance`, `Reputation & Status`, `Contacts`, `Factions`;
- вынести переключение видимости секций в отдельное меню настроек, а не в постоянно открытую строку чипов;
- оставить текущий rail-tab `pers` вне этой задачи.

Главный принцип: UI должен быть максимально близок к мокапу. Если в ходе реализации окажется, что мокап конфликтует с текущей BRP-логикой или с уже подтвержденной моделью данных, работа ставится на паузу и конфликт явно фиксируется, а не решается молча.

## Источники

HTML и целевой UX:

- [BRP Social Tab Mockup](./uirefresh/brp-social-tab-mockup.html) - главный источник по layout, пропорциям, визуальной иерархии и composition карточек.
- [BRP Social Tab Specification](./uirefresh/brp-social-tab-spec.md) - текстовое описание; использовать как пояснение, но при расхождении с HTML и уже подтвержденными решениями приоритет у мокапа и этой `08`-спеки.

Предыдущие refresh-планы:

- [03 refresh sheet + skill tab.md](./03%20refresh%20sheet%20+%20skill%20tab.md) - shell/sidebar/workspace/rail composition и базовые refresh-patterns.
- [04 refresh combat tab.md](./04%20refresh%20combat%20tab.md) - section headers, collapse-state, compact rows и scroll/state handling.
- [06 refresh item tab.md](./06%20refresh%20item%20tab.md) - формат staged-спеки, acceptance gates, context menu patterns, link между actor UI и item sheets.
- [07 refresh character tab.md](./07%20refresh%20character%20tab.md) - актуальный формат sequential refresh-спек с markers выполнения.

Текущая реализация BRP:

- [templates/actor/character.social.hbs](../templates/actor/character.social.hbs) - текущий Social tab: legacy-table для `allegiance` и `reputation`.
- [templates/actor/character.pers.hbs](../templates/actor/character.pers.hbs) - отдельный rail-tab для `passion` и `persTrait`; эта задача его не трогает.
- [module/actor/sheets/character/prepare/social.mjs](../module/actor/sheets/character/prepare/social.mjs) - текущая подготовка `allegiances`, `passions`, `persTraits`, `reputations` и `socialView`.
- [module/actor/sheets/character/character-items.mjs](../module/actor/sheets/character/character-items.mjs) - маршрутизация item types в social/skills/combat/etc preparation.
- [module/actor/sheets/character/character-context.mjs](../module/actor/sheets/character/character-context.mjs) - общий context builder.
- [module/actor/sheets/character/character-tabs.mjs](../module/actor/sheets/character/character-tabs.mjs) - логика появления rail tabs `social` и `pers`.
- [module/actor/sheets/character/prepare/sheet-settings.mjs](../module/actor/sheets/character/prepare/sheet-settings.mjs) - текущие flags `useSocialTab` / `usePersTab`.
- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs) - `PARTS`, actions, transient UI state и refresh-workspace behavior.
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs) - existing actions `createDoc`, `viewDoc`, `itemToggle`, `allegianceRoll`, `reputationRoll`, `passionRoll`, `personalityRoll`.
- [module/actor/actor-itemDrop.mjs](../module/actor/actor-itemDrop.mjs) - текущие ограничения optional rules для `allegiance`, `reputation`, `passion`, `persTrait`.
- [template.json](../template.json) - текущая actor/item schema; сейчас нет типов `contact` и `faction`.
- [module/item/item.mjs](../module/item/item.mjs) - default icons и generic item behavior.
- [module/setup/register-sheets.mjs](../module/setup/register-sheets.mjs) - регистрация item sheets; сейчас есть `allegiance` и `reputation`, но нет `contact` и `faction`.
- [module/item/sheets/allegiance.mjs](../module/item/sheets/allegiance.mjs) и [templates/item/allegiance.detail.hbs](../templates/item/allegiance.detail.hbs) - текущий allegiance sheet.
- [module/item/sheets/reputation.mjs](../module/item/sheets/reputation.mjs) и [templates/item/reputation.detail.hbs](../templates/item/reputation.detail.hbs) - текущий reputation sheet.
- [css/brp.css](../css/brp.css) - refresh variables и current sheet styles.
- [lang/en.json](../lang/en.json), [lang/es.json](../lang/es.json), [lang/fr.json](../lang/fr.json) - localization keys, item labels, optional-rule strings.
- [BACKLOG.md](../BACKLOG.md) - место для задач, которые сознательно не входят в первую social-итерацию.

Ориентиры dnd5e в локальной копии:

- [dnd5e/dnd5e.css](../dnd5e/dnd5e.css) - контекстные меню, compact controls и application spacing patterns.
- [dnd5e/templates/shared/activities.hbs](../dnd5e/templates/shared/activities.hbs) - пример компактных row-controls и secondary actions.

## Подтвержденные решения

- `08` покрывает только rail-tab `Social`. Текущий tab `pers` не объединяется с `Social` и не рефрешится в рамках этой задачи.
- `Allegiance`, `Reputation`, `Contacts`, `Factions` реализуются полноценно; schema и новая логика могут расширяться, если это нужно для UI из мокапа.
- Переключение видимости секций - это UI-state на уровне актора, а не отключение механики или удаление данных.
- Все четыре секции можно скрывать/показывать через меню настроек. Это согласованное отклонение от мокапа, где строка chips всегда открыта.
- Existing optional rules сохраняют смысл:
  - `useAlleg` продолжает управлять доступностью механики `allegiance`;
  - `useReputation` продолжает управлять доступностью семейства `reputation/honor/status`;
  - `Contacts` и `Factions` не зависят от этих старых world settings.
- Из-за `Contacts/Factions` вкладка `Social` должна стать доступной как core rail-tab даже если `useAlleg` и `useReputation` выключены.
- `Factions` следуют идее reference-based object из social-spec, но character-specific membership data не должны жить только на общем item. Поэтому canonical model для `08`:
  - shared faction definition - world `Item` типа `faction`;
  - membership data персонажа - actor-level link entry с `uuid`, `role`, `rank`, `reputationWithin`, `notes`.
- `Allegiance` primary должен храниться на акторе, а не в каждом item, чтобы избежать рассинхрона при переключении primary.
- Существующие legacy fields не удаляются в первой реализации, если на них уже опирается код или старые миры:
  - `allegiance.system.allegTitle`;
  - `allegiance.system.opposeAlleg`;
  - `allegiance.system.allegEnemy`;
  - `allegiance.system.allegAllied`;
  - `allegiance.system.allegApoth`;
  - `reputation.system.base`.
- Для `reputation` в этой итерации source of truth остается `system.base`; `category` и `scope` расширяют модель, а display total = current canonical total из item prep.

## Отличия от мокапа

Согласованные отклонения и production-адаптации:

- Вместо постоянно открытой строки `Show sections` используется кнопка/иконка настроек в titlebar, которая открывает компактное меню переключения видимости секций.
- Все четыре секции можно скрывать, включая `Allegiance` и `Reputation`. Если соответствующая мировая механика выключена, секция может быть видима, но должна показывать disabled-state и не разрешать создание/изменение.
- Для `Factions` данные на карточке делятся на:
  - shared faction item;
  - actor membership record.
  Это осознанное расхождение с текстовой social-spec, потому что мокап показывает character-specific `role/rank/reputation`, а сама spec одновременно требует переиспользуемый reference object.
- Production CSS классы должны быть префиксованы `brp-social-refresh-*`, а не копировать standalone `.section`, `.icon-btn`, `.rep-card`, `.faction-card`.
- Нельзя использовать Google Fonts/CDN из мокапа. Typography и цвета должны лечь на текущую refresh theme в [css/brp.css](../css/brp.css).

Mock audit result:

- Блокирующих визуальных ошибок в [BRP Social Tab Mockup](./uirefresh/brp-social-tab-mockup.html) не найдено.
- Главный data-model конфликт найден не в HTML, а в текстовой social-spec: shared `faction` object и одновременно character-specific `role/rank/reputation within`. В `08` это закрывается через actor membership records.

## Когда нужно остановиться и уточнить

- Если existing world data уже использует `opposeAlleg` как важное свободное текстовое поле и переход на `enemyId` начинает ломать старые карточки.
- Если пользователь захочет, чтобы `useReputation = 1` означало "по одному item на каждую category", а не "ровно один reputation-family item на персонажа".
- Если в процессе реализации выяснится, что `faction` должен быть embedded item, а не shared reference object.
- Если linked NPC для `contact` должен ссылаться не на Actor UUID, а на токен, journal или другой документ.

## Не входит в этот план

- Rebase или merge текущего rail-tab `pers` (`passion` / `persTrait`).
- Drag-drop custom sorting social карточек между собой.
- Search/filter внутри Social tab.
- Полная история роста/падения allegiance и reputation scores.
- Full compendium/browser UX для поиска и массового присоединения faction objects сверх минимального create/link flow.
- Автоматическая двусторонняя синхронизация `enemyId` между двумя allegiance.

## Текущая точка

Сейчас social-часть листа разбита и непоследовательна:

- [character.social.hbs](../templates/actor/character.social.hbs) рендерит только `allegiance` и `reputation`, причём в legacy-table layout.
- [character.pers.hbs](../templates/actor/character.pers.hbs) отдельно рендерит `passion` и `persTrait`.
- [prepare/social.mjs](../module/actor/sheets/character/prepare/social.mjs) уже готовит `passions` и `persTraits`, но текущий `Social` template эти данные не использует.
- `character-tabs.mjs` показывает rail-tab `social` только когда включены `useAlleg` или `useReputation > 0`. Для `Contacts/Factions` этого уже недостаточно.
- В [template.json](../template.json) сейчас есть item types `allegiance`, `passion`, `persTrait`, `reputation`, но нет `contact` и `faction`.
- В [register-sheets.mjs](../module/setup/register-sheets.mjs) сейчас зарегистрированы `allegiance` и `reputation` sheets, но не `contact` / `faction`.
- `base-actor-sheet.mjs` умеет `viewDoc` и `createDoc` для embedded items, но reference-based `faction` потребует отдельные actions для attach/open/unlink.
- Текущий `allegiance` sheet опирается на старые поля:
  - `opposeAlleg` как текст;
  - `allegEnemy` как checkbox;
  - `allegTitle` как title;
  - `rank` по сути не является стабильным schema field и сейчас подмешивается в prep.
- Текущий `reputation` sheet считает `item.system.total = item.system.base`, то есть unified `Reputation/Honor/Status` можно строить поверх текущего score source без отдельной формулы в этой итерации.

Значит `08` - это не просто template rewrite. Это foundation + prep + UI rebase, но с минимально необходимым новым поведением и без переработки `pers`.

## Целевая структура UI

Template target:

```hbs
<section class="actor tab social {{tab.cssClass}}" data-group="primary" data-tab="social">
  <section class="brp-social-refresh">
    <header class="brp-social-refresh-titlebar">
      <div class="brp-social-refresh-heading">...</div>
      <div class="brp-social-refresh-controls">
        <button data-action="socialSettingsToggle">...</button>
        <div class="brp-social-refresh-settings-menu">...</div>
      </div>
    </header>

    <section class="brp-social-refresh-section" data-social-section="allegiance">...</section>
    <section class="brp-social-refresh-section" data-social-section="reputation">...</section>
    <section class="brp-social-refresh-section" data-social-section="contacts">...</section>
    <section class="brp-social-refresh-section" data-social-section="factions">...</section>
  </section>
</section>
```

Production classes must be prefixed with `brp-social-refresh-*` where practical. Avoid copying mockup generic class names verbatim.

Target section order:

1. `Allegiance`
2. `Reputation & Status`
3. `Contacts`
4. `Factions`

## Модель данных

### Actor UI state

Use actor flags for UI-only state:

```json
{
  "flags": {
    "brp": {
      "sheet": {
        "social": {
          "sectionVisibility": {
            "allegiance": true,
            "reputation": true,
            "contacts": true,
            "factions": true
          },
          "collapsedSections": {},
          "primaryAllegiance": "itemId-or-empty"
        }
      }
    }
  }
}
```

Notes:

- `sectionVisibility` controls only rendering in UI.
- `collapsedSections` follows the same pattern as other refresh tabs: store only `true` entries.
- Settings menu open/closed state should stay transient in `character.mjs`, not persisted.

### Actor social data

Use actor data only where the relationship is actor-specific:

```json
{
  "system": {
    "social": {
      "factionMemberships": [
        {
          "uuid": "Item.xyz",
          "role": "Certified member",
          "rank": "Senior",
          "reputationWithin": 68,
          "notes": "",
          "sort": 0
        }
      ]
    }
  }
}
```

Why only `factionMemberships`:

- `allegiance`, `reputation`, `contact` remain actor-owned embedded items;
- `faction` is reusable/shared, so character-specific membership fields must live on the actor link record.

### Allegiance

Canonical source for `08`:

- keep current total/improve mechanics;
- keep `system.allegTitle` as canonical title field for now;
- add `system.enemyId` for structured link to another allegiance item on the same actor;
- add `system.rankText` as manual rank field;
- derive display values in view-model:
  - `displayTitle = system.allegTitle`;
  - `displayRank = system.rankText || legacyDerivedRankFromAlliedFlags`;
  - `displayEnemy = resolve(enemyId) || legacyText(opposeAlleg)`.

Primary allegiance is not stored per item. Canonical source is `flags.brp.sheet.social.primaryAllegiance`.

### Reputation

Canonical source for `08`:

- keep current numeric score source as `system.base`;
- add `system.category` with allowed values `reputation`, `honor`, `status`;
- add `system.scope` as freeform text;
- do not add a second competing numeric source for total in this iteration.

Display total rule for `08`:

- `displayTotal = item.system.total` if already prepared canonically;
- otherwise fallback to `item.system.base`.

### Contact

New embedded item type `contact` with minimum structured fields:

```json
{
  "type": "contact",
  "system": {
    "role": "",
    "location": "",
    "relation": "neutral",
    "linkedActorUuid": ""
  }
}
```

Use existing base `description` / `gmDescription` for long-form notes instead of creating another redundant rich-text field in the first pass.

### Faction

Shared world item type `faction` should contain only shared definition data:

```json
{
  "type": "faction",
  "name": "Pilots Guild",
  "system": {
    "description": "",
    "gmDescription": ""
  }
}
```

Actor membership record stores:

- `uuid`;
- `role`;
- `rank`;
- `reputationWithin`;
- `notes`;
- `sort`.

This split is mandatory if factions must be reusable across multiple characters.

## Целевая view-model подготовка

Recommended target:

```js
context.socialRefresh = {
  visibility,
  sections: {
    allegiance: {
      visible,
      rulesEnabled,
      disabledReason,
      count,
      createAction,
      rows
    },
    reputation: { ... },
    contacts: { ... },
    factions: { ... }
  }
}
```

Recommended default ordering:

- `allegiance`: primary first, then total desc, then name;
- `reputation`: category order `reputation -> honor -> status`, then total desc, then name;
- `contacts`: relation order `ally -> friend -> neutral -> suspect -> enemy`, then name;
- `factions`: actor membership `sort`, otherwise `reputationWithin desc`, then name.

## Этапы реализации

Legend:

- `[ ]` not started;
- `[~]` in progress;
- `[x]` completed;
- `[!]` blocked/needs user decision.

Do not start a later stage until the previous stage acceptance is satisfied, unless the user explicitly approves parallel work. If a later stage reveals a mistake in an earlier stage, pause, document the conflict, and ask instead of silently rewriting old decisions.

### Этап 0. Baseline and locked decisions

Статус: [x] completed for planning pass

Files to inspect/anchor:

- [templates/actor/character.social.hbs](../templates/actor/character.social.hbs)
- [templates/actor/character.pers.hbs](../templates/actor/character.pers.hbs)
- [module/actor/sheets/character/prepare/social.mjs](../module/actor/sheets/character/prepare/social.mjs)
- [module/actor/sheets/character/character-tabs.mjs](../module/actor/sheets/character/character-tabs.mjs)
- [template.json](../template.json)
- [module/setup/register-sheets.mjs](../module/setup/register-sheets.mjs)
- [spec/uirefresh/brp-social-tab-mockup.html](./uirefresh/brp-social-tab-mockup.html)
- [spec/uirefresh/brp-social-tab-spec.md](./uirefresh/brp-social-tab-spec.md)

Actions:

- Confirm what current `Social` and `pers` tabs already do.
- Compare mockup section/card structure against current refresh shell.
- Resolve model conflicts before implementation starts:
  - faction as shared object vs character-specific membership data;
  - primary allegiance actor-level vs item-level;
  - legacy `opposeAlleg` text vs structured `enemyId`.
- Freeze allowed deviation from mockup: settings menu instead of always-open chips row.

Acceptance:

- Current behavior that must survive is listed.
- All blocking data-model conflicts are resolved in writing before schema work starts.
- No later stage needs to redesign faction storage or primary allegiance ownership.

Audit notes:

- Current `Social` tab is still a legacy table and does not use refresh-section/card patterns.
- `pers` is a separate rail-tab and stays out of scope for `08`.
- `prepare/social.mjs` already collects more data than `character.social.hbs` renders.
- `Social` rail visibility currently depends only on `useAlleg` / `useReputation`, which is no longer sufficient after adding always-available `Contacts/Factions`.
- `contact` and `faction` item types do not exist yet in schema, icons or sheet registration.
- Existing `allegiance` rank handling is not migration-safe enough for the new UI and must be normalized before the template rewrite.
- No blocking mockup issue was found beyond the approved settings-menu deviation and the faction model conflict resolved above.

### Этап 1. Social foundation: schema, item types and migration-safe storage

Статус: [ ]

Files:

- [template.json](../template.json)
- [module/item/item.mjs](../module/item/item.mjs)
- [module/setup/register-sheets.mjs](../module/setup/register-sheets.mjs)
- [module/item/sheets/allegiance.mjs](../module/item/sheets/allegiance.mjs)
- [templates/item/allegiance.detail.hbs](../templates/item/allegiance.detail.hbs)
- [module/item/sheets/reputation.mjs](../module/item/sheets/reputation.mjs)
- [templates/item/reputation.detail.hbs](../templates/item/reputation.detail.hbs)
- new suggested files:
  - `module/item/sheets/contact.mjs`
  - `templates/item/contact.detail.hbs`
  - `module/item/sheets/faction.mjs`
  - `templates/item/faction.detail.hbs`
- [lang/en.json](../lang/en.json), [lang/es.json](../lang/es.json), [lang/fr.json](../lang/fr.json)

Work:

- Extend actor schema with `system.social.factionMemberships`.
- Extend `allegiance` schema with `enemyId` and `rankText`.
- Extend `reputation` schema with `category` and `scope`.
- Add new item types `contact` and `faction`.
- Add default icons in [module/item/item.mjs](../module/item/item.mjs) for `contact` and `faction`.
- Register new item sheets in [register-sheets.mjs](../module/setup/register-sheets.mjs).
- Update `allegiance` and `reputation` sheets so they can edit the new canonical fields without deleting legacy ones.
- Create minimal `contact` and `faction` sheets:
  - `contact` edits structured row data;
  - `faction` edits shared object definition only.
- Add minimal localization for:
  - `contact`, `faction`;
  - social categories;
  - contact relation labels;
  - faction membership fields.

Acceptance:

- Existing `allegiance` and `reputation` items still open and remain readable.
- New `contact` and `faction` documents can be created and opened.
- No existing field is silently dropped or overwritten.
- Foundation is sufficient for later stages without another schema redesign.

Implementation notes to keep stable:

- Do not remove `opposeAlleg`, `allegEnemy`, `allegAllied`, `allegApoth` in this stage.
- Do not move `reputation` score away from current numeric source until after UI rebase ships and is verified.
- `faction` shared item must not store character-specific membership rank/reputation as canonical data.

### Этап 2. Social domain and view-model

Статус: [ ]

Files:

- [module/actor/sheets/character/prepare/social.mjs](../module/actor/sheets/character/prepare/social.mjs)
- [module/actor/sheets/character/character-items.mjs](../module/actor/sheets/character/character-items.mjs)
- [module/actor/sheets/character/character-context.mjs](../module/actor/sheets/character/character-context.mjs)
- [module/actor/sheets/character/character-tabs.mjs](../module/actor/sheets/character/character-tabs.mjs)
- [module/actor/sheets/character/prepare/sheet-settings.mjs](../module/actor/sheets/character/prepare/sheet-settings.mjs)
- [module/actor/actor-itemDrop.mjs](../module/actor/actor-itemDrop.mjs)
- new suggested helper if needed:
  - `module/actor/sheets/character/prepare/social-domain.mjs`

Work:

- Build canonical `context.socialRefresh` view-model for the new template.
- Keep temporary compatibility exports (`context.allegiances`, `context.reputations`) only until stage 3 swaps the template.
- Resolve primary allegiance from actor flag instead of item-local boolean.
- Resolve allegiance enemy row using:
  - `enemyId` first;
  - legacy `opposeAlleg` as fallback display-only text.
- Resolve `reputation` category/scope and keep current score source intact.
- Resolve `contact` linked actor summary from `linkedActorUuid`.
- Resolve `faction` rows by hydrating actor membership records from linked world items.
- Prepare section-level state:
  - visibility;
  - rules enabled/disabled;
  - disabled reason;
  - count;
  - create/link actions;
  - empty states.
- Update tab availability so `social` is always available as a core tab.
- Keep `pers` part and `usePersTab` logic untouched.
- Preserve optional-rule behavior:
  - `useAlleg = false` -> allegiance section disabled for creation/logic;
  - `useReputation = 0` -> reputation-family section disabled;
  - `useReputation = 1` -> still exactly one reputation-family item total.

Acceptance:

- New social template can render entirely from prepared view-model without deep raw-item digging.
- Social rail tab appears even when a character only has contacts or factions.
- Faction cards can be hydrated from actor membership records without another data-model change.
- Later UI stages do not need to revisit actor/item storage decisions.

### Этап 3. Social tab template and CSS rebase

Статус: [ ]

Files:

- [templates/actor/character.social.hbs](../templates/actor/character.social.hbs)
- [css/brp.css](../css/brp.css)

Work:

- Replace legacy table markup in `character.social.hbs` with refresh layout based on the mockup.
- Match mockup structure and density for:
  - titlebar;
  - section headers;
  - allegiance cards;
  - reputation rows;
  - contact rows;
  - faction cards;
  - empty/disabled states.
- Implement approved settings-menu deviation:
  - button in header;
  - compact popover/menu with visibility toggles;
  - section hidden state bound to prepared visibility flags.
- Render all cards from `context.socialRefresh`.
- Add action data attributes for stage 4, but do not depend on raw DOM-only state.
- Scope all CSS with `brp-social-refresh-*`.
- Keep visual parity with mockup:
  - spacing;
  - accent colors;
  - typography hierarchy;
  - action button density;
  - state badges;
  - bar thresholds;
  - hover/empty styling.

Acceptance:

- Static Social layout visually tracks the mockup closely aside from the approved settings-menu deviation.
- Template reads prepared data only.
- No generic/mockup-only CSS class leaks into production markup.
- The next stage can wire behavior without rewriting structure.

### Этап 4. Social interactions, item-sheet wiring, localization and verification

Статус: [ ]

Files:

- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs)
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs)
- [templates/actor/character.social.hbs](../templates/actor/character.social.hbs)
- [module/actor/actor-itemDrop.mjs](../module/actor/actor-itemDrop.mjs)
- [module/item/sheets/allegiance.mjs](../module/item/sheets/allegiance.mjs)
- [module/item/sheets/reputation.mjs](../module/item/sheets/reputation.mjs)
- new suggested module if extraction is needed:
  - `module/actor/sheets/character/character-social-actions.mjs`
- [lang/en.json](../lang/en.json), [lang/es.json](../lang/es.json), [lang/fr.json](../lang/fr.json)
- [BACKLOG.md](../BACKLOG.md)

Work:

- Add Social-specific actions:
  - settings menu open/close;
  - section visibility toggle;
  - section collapse toggle;
  - primary allegiance set/clear;
  - open object / linked actor / linked faction;
  - add `contact`;
  - create new `faction` and attach;
  - attach existing `faction`;
  - unlink `faction` from character without deleting world item;
  - context menu actions per row/card.
- Preserve refresh scroll/transient state using the same patterns as other refreshed tabs.
- Reuse existing `viewDoc`, `allegianceRoll`, `reputationRoll` where safe; add dedicated actions where reference-based rows make generic embedded-document actions insufficient.
- Ensure delete/remove semantics are explicit:
  - embedded social items can still be deleted from actor with confirmation;
  - faction unlink removes only actor membership record.
- Finalize item-sheet wiring so:
  - `enemyId` can be selected safely;
  - `category`/`scope` are editable;
  - linked actor on `contact` can be attached/cleared;
  - faction attach flow is explicit and testable.
- Add all missing localization keys.
- Run manual verification.
- Record intentionally deferred follow-ups in [BACKLOG.md](../BACKLOG.md).

Acceptance:

- Every visible control on the refreshed Social tab works or is explicitly disabled with a reason.
- No stage 1-3 redesign is needed after wiring actions.
- Verification checklist below is complete.

Required manual checks:

- Open Social tab in locked mode.
- Open Social tab in unlocked mode.
- Toggle section visibility from the settings menu and confirm state persists.
- Collapse/expand each section and confirm state persists.
- Create/open/remove an `allegiance`.
- Change primary allegiance and confirm only one row is primary.
- Create/open/edit a `reputation` with each category.
- Create/open/edit a `contact`, including linked NPC flow if available.
- Create/link/unlink/open a `faction`.
- Verify disabled-state behavior when `useAlleg` or `useReputation` are off.
- Verify no regression in separate `pers` tab behavior.

## Completion checklist

Use this section during implementation. Mark items only after verification, not while coding.

- [x] Planning audit completed.
- [ ] Social schema extended safely.
- [ ] `contact` and `faction` item types registered.
- [ ] Actor faction membership model implemented.
- [ ] `socialRefresh` view-model prepared.
- [ ] Social rail visibility updated.
- [ ] `character.social.hbs` rebuilt.
- [ ] Settings menu deviation implemented.
- [ ] Allegiance cards matched to mock.
- [ ] Reputation cards matched to mock.
- [ ] Contacts rows implemented.
- [ ] Factions cards implemented.
- [ ] Social actions/context menus wired.
- [ ] Localization updated.
- [ ] Manual verification completed.

## Backlog links

Out-of-scope follow-ups are tracked in [BACKLOG.md](../BACKLOG.md).

Current linked follow-ups:

- `pers` tab refresh / possible future merge strategy.
- Custom drag-sort persistence for social cards.
- Advanced faction attach/browser UX beyond minimal create/link flow.
