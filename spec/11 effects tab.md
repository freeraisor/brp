# 11 effects tab

Дата фиксации: 2026-04-24

Статус: план-предложение для полного visual/data/interaction rebase rail-tab `Effects` в refresh-shell. Документ фиксирует порядок работ так, чтобы сначала закрыть все foundation-решения и совместимость со старой логикой, потом один раз собрать data/view-model, затем один раз переложить шаблон под mock и только после этого навешивать интерактив.

## Цель

Сделать полноценный rebase вкладки Effects в новом refresh-shell максимально близко к [BRP Effects Tab Mockup](./uirefresh/brp-effects-tab-mockup.html) и довести её до рабочего состояния, а не до демо-витрины:

- визуально повторить mockup 1 в 1 по композиции, иерархии, группам, карточкам, toolbar и modal flow;
- использовать [BRP Effects Tab Specification](./uirefresh/brp-effects-tab-spec.md) как источник логики там, где HTML не описывает поведение;
- сохранить Foundry `ActiveEffect` как canonical storage;
- добавить недостающий BRP-layer, который проецирует Active Effects в текущую BRP-модель расчётов, а не строить второй параллельный storage;
- привести старые и новые источники эффектов к одному читаемому UI;
- заложить этапы так, чтобы после окончания foundation больше не возвращаться к storage/state/target-contract решениям;
- в этой итерации трактовать `Hidden from player` только как sheet-level визуальное состояние и фильтр, без token HUD/status icon логики.

Главный принцип: HTML-mock — источник истины по UI. Если mock не задаёт поведение, используется текстовая effects-spec и текущие refresh-patterns проекта.

## Источники

UI и UX:

- [BRP Effects Tab Mockup](./uirefresh/brp-effects-tab-mockup.html) — главный источник layout, visual hierarchy, группировки, карточек, toolbar, modal composition и micro-interactions.
- [BRP Effects Tab Specification](./uirefresh/brp-effects-tab-spec.md) — главный источник по поведению, source taxonomy, builder logic и data-contract, если mock это явно не показывает.

Текущая реализация BRP:

- [templates/actor/character.effects.hbs](../templates/actor/character.effects.hbs) — текущий Effects tab в refresh-shell.
- [module/actor/sheets/character/prepare/effects.mjs](../module/actor/sheets/character/prepare/effects.mjs) — текущий prepare/view-model для Effects.
- [css/brp.css](../css/brp.css) — текущие стили вкладки `effects` и общий refresh theme.
- [module/actor/sheets/character/character-tabs.mjs](../module/actor/sheets/character/character-tabs.mjs) — rail metadata и текущее подключение `effects`.
- [module/actor/sheets/character/character-sheet-config.mjs](../module/actor/sheets/character/character-sheet-config.mjs) — part config для workspace part `effects`.
- [module/actor/sheets/character/character-context.mjs](../module/actor/sheets/character/character-context.mjs) — порядок prepare-steps character sheet.
- [module/actor/sheets/character/character-sheet-render.mjs](../module/actor/sheets/character/character-sheet-render.mjs) — bind lifecycle, transient UI state и render wiring.
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs) — `viewDoc`, embedded document lookup и общие action hooks.
- [module/sheets/brp-active-effect-sheet.mjs](../module/sheets/brp-active-effect-sheet.mjs) — текущая работа с item-origin Active Effects и их ручным редактированием на item sheets.
- [module/actor/actor.mjs](../module/actor/actor.mjs) — текущий actor data pipeline, в который уже встроены `*.effects`, `skillcat.mod` и item totals.
- [module/setup/config.mjs](../module/setup/config.mjs) — текущий список `CONFIG.BRP.keysActiveEffects`.
- [template.json](../template.json) — actor/item schema, включая текущие `stats.*.effects`, `item.system.effects`, `skillcat.system.mod`, `story`, `quest`.
- [templates/global/parts/active-effects.html](../templates/global/parts/active-effects.html) — текущий legacy item-level UI для автоэффектов.
- [module/item/sheets/armour.mjs](../module/item/sheets/armour.mjs), [module/item/sheets/gear.mjs](../module/item/sheets/gear.mjs), [module/item/sheets/weapon.mjs](../module/item/sheets/weapon.mjs), [module/item/sheets/wound.mjs](../module/item/sheets/wound.mjs) — текущие item sheets, где уже живёт ручное управление item-origin Active Effects.

Refresh-паттерны, которые надо переиспользовать:

- [08 refresh social tab.md](./08%20refresh%20social%20tab.md) — отдельный controller, section-state, context menu, actor flag state.
- [09 personality social tab.md](./09%20personality%20social%20tab.md) — compact staged-spec и per-tab controller contract.
- [10 story tab.md](./10%20story%20tab.md) — canonical pattern для крупного refresh tab с отдельным `prepare/*/shared.mjs`, отдельным controller и `flags.brp.sheet.<tab>`.
- [module/actor/sheets/character/social-sheet.mjs](../module/actor/sheets/character/social-sheet.mjs) — production reference для section collapse, context menu, state persistence.
- [module/actor/sheets/character/story-sheet.mjs](../module/actor/sheets/character/story-sheet.mjs) — production reference для отдельного tab-controller, filter state, modal/context flows и transient UI preservation.

## Что есть сейчас

- Текущий [character.effects.hbs](../templates/actor/character.effects.hbs) — это простой список строк, разбитый только на `active` и `inactive`.
- Текущий [prepare/effects.mjs](../module/actor/sheets/character/prepare/effects.mjs) строит строки только из результата `BRPActiveEffectSheet.getActorEffectsFromSheet()`.
- Текущий [BRPActiveEffectSheet.getActorEffectsFromSheet()](../module/sheets/brp-active-effect-sheet.mjs) фактически ориентирован на item-origin эффекты и раскладывает `ActiveEffect.changes[]` по строкам, но не строит полноценную taxonomy `items/status/wounds/magic/injuries/manual`.
- В текущем character refresh-stack для Effects нет отдельного controller-модуля, аналогичного `social-sheet` или `story-sheet`.
- В [module/setup/config.mjs](../module/setup/config.mjs) текущий `CONFIG.BRP.keysActiveEffects` покрывает только узкий набор путей:
  - `system.stats.*.effects`
  - `system.health.effects`
  - `system.power.effects`
  - `system.fatigue.effects`
- В [template.json](../template.json) у характеристик есть explicit `effects`, а у `health/power/fatigue` explicit полей `effects` сейчас нет, хотя [actor.mjs](../module/actor/actor.mjs) уже читает `system.health.effects`, `system.power.effects`, `system.fatigue.effects` через fallback `?? 0`.
- Текущие BRP-расчёты уже используют старые effect-accumulators:
  - `stats.*.effects` в `_prepStats()`;
  - `health/power/fatigue.effects` в `_prepDerivedStats()`;
  - `item.system.effects` и `skillcat.system.mod` в skill/power totals.
- В старой логике есть не только Active Effects:
  - часть модификаторов идёт через native item fields, например armour penalties `mnplmod/percmod/physmod/stealthmod` в [actor.mjs](../module/actor/actor.mjs);
  - значит текущий gameplay effect pipeline уже смешанный и не совпадает с новой effects-spec.

Итог planning audit: новый Effects tab нельзя делать только как template/CSS rework. Сначала нужно зафиксировать, что именно является canonical runtime-путём для эффектов в BRP и как в него попадают старые native modifiers.

## Подтверждённые решения

- Главный UI-source — [BRP Effects Tab Mockup](./uirefresh/brp-effects-tab-mockup.html).
- Если mock не задаёт логику, используется [BRP Effects Tab Specification](./uirefresh/brp-effects-tab-spec.md) и существующие refresh-patterns проекта.
- Канонический namespace для sheet state и новых флагов: `flags.brp.sheet.effects`.
- В этой задаче нужно закладывать полный foundation и все необходимые правки кода, а не урезать реализацию до текущих ограничений `prepare/effects.mjs`.
- `Hidden from player` в `11` — только sheet-level визуальное состояние и фильтр:
  - badge на карточке;
  - dashed/tinted visual state;
  - filter chip;
  - без token HUD/status icon filtering и без внешнего player-view поведения.
- Effects tab остаётся `GM-only`, потому что это явно зафиксировано и в mock, и в исходной effects-spec.
- Canonical storage остаётся Foundry `ActiveEffect`; отдельный `system.effectsTab` storage не вводится.

## Разрешённые production-адаптации мока

- Production CSS-классы должны быть namespaced, например `brp-effects-refresh-*`, а не копировать mock classes `toolbar`, `effect-card`, `modal`, `ctx` без префикса.
- Нельзя переносить в production standalone theme/bootstrap из mock:
  - Google Fonts;
  - standalone inline palette;
  - demo JS.
- При этом composition, spacing, badges, proportions, section hierarchy и modal structure должны быть максимально близки к mock.

Mock audit result:

- Блокирующих визуальных ошибок в [BRP Effects Tab Mockup](./uirefresh/brp-effects-tab-mockup.html) на planning pass не найдено.
- Demo JS в mock отражает intended interaction flow, но не фиксирует production storage contract.

## Разрешённые конфликты и решения, которые нельзя переоткрывать позже

### 1. Namespace

Исходная effects-spec местами использует `flags.brp-sheet.*`. Для `11` канонический namespace фиксируется как:

- actor-level UI state: `actor.flags.brp.sheet.effects`
- effect-level metadata: `effect.flags.brp.sheet.effects`

Это не считается конфликтом, потому что документ actor/effect разный; главное — не вводить второй вариант namespace.

### 2. Hidden behavior

Исходная effects-spec включает скрытие в token HUD/status icons. Для `11` это сознательно вырезается из scope:

- `hidden` существует как эффектный metadata flag;
- вкладка Effects умеет это показывать, фильтровать и переключать;
- внешняя token/status integration не входит в `11`.

### 3. Canonical runtime не строится на raw mock-keys

Новая effects-spec описывает rich target taxonomy (`specific skill`, `derived`, `armor`, `resource`, `all skills` и т.д.), но текущий BRP runtime считает характеристики, ресурсы и item totals через старые накопительные поля:

- `stats.*.effects`
- `health/power/fatigue.effects`
- `item.system.effects`
- `skillcat.system.mod`

Чтобы не переписывать весь sheet/roll/runtime стек поверх raw effect paths, `11` фиксирует следующее решение:

- ActiveEffect остаётся canonical storage;
- BRP добавляет отдельный effect target registry + projection layer;
- projection layer materializes effect changes в текущие BRP accumulator-поля до того, как existing totals/checks их читают.

Иными словами: не второй storage, а один canonical ActiveEffect storage плюс централизованный BRP adapter/projection.

### 4. Совместимость со старыми автоэффектами и native modifiers

В старом коде уже есть смешанная модель:

- item-origin Active Effects на armour/gear/weapon/wound;
- native item modifiers вроде armour `mnplmod/percmod/physmod/stealthmod`, которые вообще обходят ActiveEffect UI.

Для `11` foundation фиксируется так:

- текущие item-origin Active Effects должны продолжать читаться без миграции мира;
- newly created/edited effects обязаны писать canonical metadata в `flags.brp.sheet.effects`;
- старые эффекты без metadata должны нормализоваться на чтении;
- native non-AE modifiers должны пройти отдельный compatibility audit в foundation-этапе:
  - либо конвертироваться в canonical effect flow;
  - либо получать явный compatibility adapter;
  - но их больше нельзя оставлять как “невидимую логику вне Effects tab” после завершения `11`.

### 5. Один card-row = один `change`, а не обязательно один `ActiveEffect`

Foundry `ActiveEffect` поддерживает массив `changes[]`, а mock показывает one-card-per-target/modifier. Чтобы не терять совместимость и не скрывать существующие multi-change docs, `11` фиксирует следующий UI contract:

- вкладка рендерит один visual card на один `change`;
- sibling cards знают `effectId` общего parent effect;
- `toggle active` и `toggle hidden` работают на parent `ActiveEffect`;
- `delete` и `duplicate` в Effects tab работают на выбранный `change`;
- `edit` открывает builder/edit flow для выбранного `change` в контексте parent effect;
- first-pass builder UI создаёт и редактирует один change за раз, но storage должен оставаться array-capable.

Это снимает конфликт между mock layout и реальной моделью Foundry без redesign после начала реализации.

## Когда нужно остановиться и уточнить

- Если в живых мирах обнаружится критичный gameplay-path, который продолжает считать модификаторы мимо ActiveEffect/projection layer и не может быть безопасно завернут в compatibility adapter без изменения баланса.
- Если выяснится, что какая-то категория из mock/spec (`armor`, `resource per round`, `derived`) в текущем BRP runtime не имеет однозначного accumulator-пути и требует уже отдельного combat/health redesign.
- Если первый production pass обязательно должен уметь полноценно редактировать multi-change effects в одном modal, а не по одному change.

## Не входит в этот план

- token HUD/status icon filtering для hidden effects;
- автоматические timer countdown, combat-round decrement и auto-remove;
- import/export effects между актёрами;
- compendium готовых эффектов;
- отдельный debug panel “computed modifiers”;
- отдельный player read-only effects view;
- массовый multi-change editor поверх одного `ActiveEffect` документа.

## Этап 0. Planning audit и фиксация foundation-решений

Статус: [x] completed for planning pass

Файлы-якоря:

- [templates/actor/character.effects.hbs](../templates/actor/character.effects.hbs)
- [module/actor/sheets/character/prepare/effects.mjs](../module/actor/sheets/character/prepare/effects.mjs)
- [module/sheets/brp-active-effect-sheet.mjs](../module/sheets/brp-active-effect-sheet.mjs)
- [module/actor/actor.mjs](../module/actor/actor.mjs)
- [module/setup/config.mjs](../module/setup/config.mjs)
- [template.json](../template.json)
- [module/actor/sheets/character/story-sheet.mjs](../module/actor/sheets/character/story-sheet.mjs)
- [module/actor/sheets/character/social-sheet.mjs](../module/actor/sheets/character/social-sheet.mjs)
- [spec/uirefresh/brp-effects-tab-mockup.html](./uirefresh/brp-effects-tab-mockup.html)
- [spec/uirefresh/brp-effects-tab-spec.md](./uirefresh/brp-effects-tab-spec.md)

Что уже зафиксировано:

- UI source of truth — mock HTML.
- Logic source of truth — text spec, если mock не покрывает поведение.
- Namespace — `flags.brp.sheet.effects`.
- Hidden — только sheet-level visual/filter behavior.
- Storage — canonical `ActiveEffect`.
- Runtime contract — ActiveEffect + BRP projection layer.
- Card contract — one card per change.
- Effects tab — GM-only.

Acceptance:

- Нет незакрытых foundation-конфликтов, которые заставят переписывать data/state contract после начала template/controller работ.

## Этап 1. Effects foundation: canonical contract, target registry и compatibility strategy

Статус: [ ]

Файлы:

- [module/setup/config.mjs](../module/setup/config.mjs)
- [template.json](../template.json)
- [module/actor/actor.mjs](../module/actor/actor.mjs)
- [module/sheets/brp-active-effect-sheet.mjs](../module/sheets/brp-active-effect-sheet.mjs)
- [module/actor/sheets/character/character-tabs.mjs](../module/actor/sheets/character/character-tabs.mjs)
- [module/actor/sheets/character/character-sheet-config.mjs](../module/actor/sheets/character/character-sheet-config.mjs)
- [lang/en.json](../lang/en.json), [lang/es.json](../lang/es.json), [lang/fr.json](../lang/fr.json)
- new suggested files:
  - `module/actor/sheets/character/prepare/effects/shared.mjs`
  - `module/actor/effects/effect-target-registry.mjs`
  - `module/actor/effects/effect-compatibility.mjs`

Обоснование foundation/refactor:

Без этого этапа невозможно безопасно строить ни prepare-layer, ни template-layer: current BRP runtime использует старые accumulator-поля и часть native item modifiers вообще не попадает в current effects UI. Если сразу пойти в шаблон, потом придётся возвращаться к storage/model decisions.

Работы:

- Зафиксировать actor-level sheet state contract в `flags.brp.sheet.effects`:
  - `filter`
  - `collapsedGroups`
  - `stateInitialized`
- Зафиксировать effect-level metadata contract в `effect.flags.brp.sheet.effects`:
  - `sourceType`
  - `sourceLabel`
  - `targetType`
  - `targetLabel`
  - `durationType`
  - `timerNote`
  - `hidden`
- Вынести source taxonomy:
  - `items`
  - `status`
  - `wounds`
  - `magic`
  - `injuries`
  - `manual`
- Вынести duration taxonomy:
  - `permanent`
  - `timed`
  - `conditional`
- Построить canonical target registry с прямым и обратным резолвом:
  - builder picker -> effect change path/projection target
  - raw/legacy effect change -> UI category/target labels
- Явно описать mapping для target-типов из mock/spec:
  - characteristics
  - resources
  - skill categories
  - specific skills
  - derived stats
  - armour-related targets
  - custom/raw path mode
- Привести schema в порядок там, где runtime уже использует effect accumulators, а schema их не описывает.
- Решить strategy для старых item-origin Active Effects без metadata:
  - read-time normalization;
  - без обязательной world migration на первом проходе.
- Решить strategy для native non-AE modifiers:
  - что превращается в canonical effect flow;
  - что временно обслуживается compatibility adapter;
  - где нельзя оставить “невидимую” логику.
- Подготовить localization skeleton:
  - group titles
  - duration labels
  - filter chips
  - builder labels
  - context menu actions
  - empty states
- Зафиксировать GM-only visibility policy для rail/tab render path.

Acceptance:

- После завершения этапа больше не требуется redesign namespace/state/storage contract.
- Для каждого target-типа из mock/spec существует зафиксированный путь через registry/projection layer.
- Для legacy item-origin effects и native modifiers есть явная compatibility strategy.
- Локализационные ключи для нового Effects UI определены заранее, до template work.

## Этап 2. Effects runtime: projection layer и полноценный view-model

Статус: [ ]

Файлы:

- [module/actor/actor.mjs](../module/actor/actor.mjs)
- [module/actor/sheets/character/character-context.mjs](../module/actor/sheets/character/character-context.mjs)
- [module/actor/sheets/character/prepare/effects.mjs](../module/actor/sheets/character/prepare/effects.mjs)
- [module/actor/sheets/character/character-sheet-render.mjs](../module/actor/sheets/character/character-sheet-render.mjs)
- [module/sheets/brp-active-effect-sheet.mjs](../module/sheets/brp-active-effect-sheet.mjs)
- new suggested files:
  - `module/actor/effects/effect-projector.mjs`
  - `module/actor/effects/effect-normalize.mjs`
  - `module/actor/effects/effect-row-actions.mjs`

Работы:

- Встроить projection layer в actor runtime так, чтобы current BRP totals/checks читали уже проецированные effect deltas, а не raw mock-keys.
- Покрыть projection как минимум для:
  - `stats.*.effects`
  - `health/power/fatigue` effect accumulators
  - `skillcat.system.mod`
  - `skill.system.effects`
  - прочих accumulator-paths, которые нужны для mock/spec targets.
- Нормализовать один unified effects dataset из:
  - actor-owned manual effects;
  - item-origin transferred effects;
  - wound effects;
  - status-based effects;
  - magic/power effects;
  - injury/permanent effects;
  - legacy effects без metadata.
- Построить `effectsRefresh` / `effectsView` c готовыми данными для шаблона:
  - titlebar state
  - GM-only badge state
  - toolbar chips + counts
  - grouped sections в fixed order
  - rows/cards one-per-change
  - parent effect linkage
  - filter state
  - empty state
  - builder dropdown/view-model data
- Явно различать row-level и parent-effect-level actions:
  - row delete/duplicate/edit
  - parent toggle active/hidden/open effect/open source
- Подготовить disabled/read-only semantics для `lock` mode.
- Подготовить persisted state helpers для `collapsedGroups` и `filter`.
- Подготовить transient UI capture/restore для Effects tab по образцу Story/Social, если это нужно для modal/filter/collapse flow.

Acceptance:

- Новый Effects template можно полностью рендерить из `effectsView`, без прямого доступа к raw `ActiveEffect` объектам из HBS.
- BRP gameplay calculations читают projected effect data централизованно, а не через разрозненные ad-hoc ветки.
- Dataset для template/controller не требует ещё одного redesign перед UI rebase.

Implementation notes to keep stable:

- Не строить эффекты поверх отдельного custom storage на actor.
- Не разбрасывать reverse/forward target mapping по template/controller; registry должен быть централизован.
- Не пытаться решить token HUD hidden behavior в этом этапе.

## Этап 3. Effects template и CSS rebase по mock

Статус: [ ]

Файлы:

- [templates/actor/character.effects.hbs](../templates/actor/character.effects.hbs)
- [css/brp.css](../css/brp.css)

Работы:

- Полностью переписать [character.effects.hbs](../templates/actor/character.effects.hbs) под новый Effects UI.
- Собрать titlebar по mock:
  - icon
  - `Effects`
  - `GM-only` badge
  - lock indicator
- Собрать toolbar 1 в 1 по mock:
  - filter chips
  - counters
  - primary add button
- Реализовать шесть групп-источников в fixed order:
  - From items
  - From status conditions
  - From wounds
  - From magic / powers
  - From injuries (permanent)
  - Manual / GM-applied
- Реализовать effect card composition максимально близко к mock:
  - source icon
  - effect name
  - source row/link
  - target badge
  - modifier badge
  - duration badge
  - hidden badge/state
  - inactive visual state
  - action cluster
- Реализовать modal skeleton builder/edit flow по mock:
  - identification
  - target/modifier
  - duration
  - visibility
  - preview
  - footer actions
- Реализовать context menu container/layout по mock, если выбранный production path оставляет custom menu в DOM.
- Все effects-specific classes префиксовать `brp-effects-refresh-*`.
- Визуально повторить mock максимально близко, адаптируя только palette/font variables к текущему refresh theme.

Acceptance:

- Статический Effects layout считывается как mock почти 1 в 1.
- Следующий этап сможет только навесить поведение и wiring, не переписывая DOM-структуру.
- В production markup нет generic mock class leakage без namespace.

## Этап 4. Dedicated effects controller, builder flow и action wiring

Статус: [ ]

Файлы:

- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs)
- [module/actor/sheets/character/character-sheet-render.mjs](../module/actor/sheets/character/character-sheet-render.mjs)
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs)
- [module/sheets/brp-active-effect-sheet.mjs](../module/sheets/brp-active-effect-sheet.mjs)
- new suggested file:
  - `module/actor/sheets/character/effects-sheet.mjs`
- [lang/en.json](../lang/en.json), [lang/es.json](../lang/es.json), [lang/fr.json](../lang/fr.json)

Работы:

- Добавить dedicated `effects-sheet` controller по паттерну `social-sheet` / `story-sheet`.
- Вынести all Effects actions из ad-hoc binding в action-driven flow:
  - filter chip select
  - group collapse
  - open source
  - open parent effect
  - toggle active
  - toggle hidden
  - create effect
  - edit selected change
  - duplicate selected change
  - delete selected change
  - open menu
- Реализовать builder/create flow:
  - simple target picker
  - advanced raw path mode
  - preview
  - duration handling
  - visibility handling
  - save to canonical `ActiveEffect`
- Реализовать edit flow для selected change внутри parent effect.
- Реализовать row/parent semantics:
  - row delete -> remove selected change, delete parent effect if empty;
  - row duplicate -> create new effect with cloned selected change;
  - parent toggle active/hidden -> update shared parent effect.
- Реализовать persisted actor flag state:
  - current filter
  - collapsed groups
- Скрыть rail/tab и workspace content для non-GM.
- Привязать transient UI preservation:
  - workspace scroll
  - collapse state
  - filter state
  - modal/timeline-like ephemeral state только если оно действительно нужно и безопасно.

Acceptance:

- Каждый видимый control во вкладке Effects подключён к реальному действию или осознанно disabled-state.
- Effects tab больше не опирается только на старый prepare/template pair без dedicated controller.
- GM-only behavior работает на уровне rail и tab content.
- Реализация не требует возвращения к этапам 1-3 из-за action semantics.

## Этап 5. Compatibility pass, проверка и фиксация follow-ups

Статус: [ ]

Файлы:

- [BACKLOG.md](../BACKLOG.md)
- все файлы этапов 1-4 по мере необходимости

Работы:

- Пройти ручную проверку нового Effects tab на пустом персонаже.
- Пройти ручную проверку на персонаже с:
  - item-origin effects;
  - wound effects;
  - manual actor effects;
  - inactive effects;
  - hidden effects;
  - legacy effects без metadata.
- Проверить, что filters/counts/groups работают согласованно.
- Проверить, что `lock` mode не ломает view path и корректно режет mutating controls.
- Проверить, что projection layer действительно влияет на старые BRP totals/checks, для которых был задуман.
- Отдельно проверить compatibility path для старых native non-AE modifiers.
- Зафиксировать все consciously deferred follow-ups в [BACKLOG.md](../BACKLOG.md).

Acceptance:

- После этапа 5 не требуется возвращаться к foundation/state/template decisions.
- Новый Effects tab покрывает и visual mock, и production behavior, и compatibility со старой effect-логикой.
- Все out-of-scope следы вынесены в backlog, а не потеряны.

## Required manual checks

- Открыть Effects tab под GM на пустом персонаже.
- Убедиться, что non-GM не видит rail/tab `Effects`.
- Проверить filter chips `All`, `Active only`, `Temporary`, `Hidden from player`.
- Проверить collapse/expand всех source groups.
- Создать новый manual effect через builder.
- Отредактировать существующий effect/change.
- Переключить `active` у parent effect.
- Переключить `hidden` у parent effect.
- Продублировать выбранный change.
- Удалить выбранный change.
- Открыть source object из карточки.
- Открыть parent ActiveEffect из карточки.
- Проверить, что inactive row уходит в visual disabled state.
- Проверить, что hidden row получает dashed/tinted state и badge.
- Проверить, что magic/wound/status/manual/item grouping заполняется корректно.
- Проверить legacy item-origin effects без metadata.
- Проверить эффект, содержащий больше одного `change`, чтобы sibling rows не ломали action semantics.
- Проверить locked/unlocked режимы.
- Проверить, что skill/stat/resource calculations реально отражают projected effects.

## Финальный критерий готовности `11`

Спека считается пригодной для последовательной реализации, если одновременно выполнено следующее:

- UI-source, logic-source и model conflicts зафиксированы заранее.
- Этапы крупные, но не распадаются на хаотичные мелкие возвраты.
- После этапа 1 больше не нужно перепридумывать namespace/storage/target contract.
- После этапа 2 больше не нужно перепридумывать view-model/runtime adapter.
- После этапа 3 можно только навешивать wiring.
- После этапа 4 можно только проверять compatibility и фиксировать follow-ups.

## Completion checklist

Отмечать только после фактической проверки, а не во время кодинга.

- [x] Planning audit completed.
- [ ] Canonical `flags.brp.sheet.effects` contract added.
- [ ] Effect target registry and reverse resolver added.
- [ ] Legacy effect normalization strategy implemented.
- [ ] Native non-AE modifier compatibility path implemented.
- [ ] Runtime projection layer integrated into BRP calculations.
- [ ] `effectsView` rebuilt for grouped mock layout.
- [ ] Effects template rebuilt to mock.
- [ ] Toolbar/group/card UI matched to mock.
- [ ] Dedicated effects controller wired.
- [ ] Builder create/edit flow wired.
- [ ] GM-only tab gating wired.
- [ ] Localization updated.
- [ ] Manual verification completed.

## Backlog links

Out-of-scope follow-ups are tracked in [BACKLOG.md](../BACKLOG.md).

Expected Effects-specific follow-ups after first rebase:

- token HUD/status icon integration for `hidden`;
- automatic timers and combat-time decrement;
- richer multi-change editor over one `ActiveEffect`;
- computed modifier debug view;
- compendium of ready-made effects.
