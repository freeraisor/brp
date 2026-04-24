# 10 Story tab

Дата фиксации: 2026-04-23

Статус: план-предложение для полного visual/data/interaction rebase rail-tab `Story` (текущий technical part в коде: `background`). Документ описывает порядок работ так, чтобы идти крупными последовательными этапами, не возвращаться к уже закрытым решениям и отмечать прогресс прямо по ходу реализации.

## Цель

Сделать полноценный rebase Story tab в новом refresh-shell, максимально близко к [BRP Story Tab Mockup](./uirefresh/brp-story-tab-mockup.html), при этом довести до рабочего состояния не только внешний вид, но и недостающую story-логику:

- заменить текущий legacy-редактор `system.stories[]` на новый Story UI;
- визуально повторить mockup: `Active Quests`, `Journal`, `Open timeline`, fullscreen timeline overlay;
- реализовать недостающую story-модель данных, quest item type, journal CRUD, фильтры, pin, linked references, timeline;
- сделать миграцию со старых story-данных;
- явно пометить legacy story-поля и старые обработчики как deprecated и подготовить их к будущему удалению;
- не использовать `dnd5e` как reference;
- не делать “демо-UI”: все видимые элементы, нужные по специке, должны реально работать.

Главный принцип: HTML-мок — источник истины по UI. Если в мокапе нет логики, логика берётся из [BRP Story Tab Specification](./uirefresh/brp-story-tab-spec.md) и из общей согласованности фичи с уже существующим BRP refresh-стеком.

## Источники

UI и UX:

- [BRP Story Tab Mockup](./uirefresh/brp-story-tab-mockup.html) — главный источник по layout, visual hierarchy, spacing, overlay composition, карточкам, toolbar и timeline.
- [BRP Story Tab Specification](./uirefresh/brp-story-tab-spec.md) — главный источник по поведению, storage model и взаимодействиям, если они не выражены в HTML.

Текущая реализация BRP:

- [templates/actor/character.background.hbs](../templates/actor/character.background.hbs) — текущая Story/background вкладка на `system.stories[]`.
- [module/actor/sheets/character/prepare/background.mjs](../module/actor/sheets/character/prepare/background.mjs) — текущая prepare-логика старого story/background UI.
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs) — legacy update path для `system.stories.*` и story section handlers.
- [module/actor/sheets/character/character-sheet-render.mjs](../module/actor/sheets/character/character-sheet-render.mjs) — текущее bind-подключение `.addNewSection`, reorder/delete story sections и общий refresh-render lifecycle.
- [module/actor/sheets/character/character-context.mjs](../module/actor/sheets/character/character-context.mjs) — порядок prepare steps character sheet.
- [module/actor/sheets/character/character-sheet-config.mjs](../module/actor/sheets/character/character-sheet-config.mjs) — current part config и existing context-selector conventions.
- [module/actor/sheets/character/character-tabs.mjs](../module/actor/sheets/character/character-tabs.mjs) — rail metadata: текущая вкладка `background` уже рендерится как `Story`.
- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs) — общий character sheet класс и composition modules.
- [module/actor/sheets/character/character-items.mjs](../module/actor/sheets/character/character-items.mjs) — routing item types в prepare states; сюда ляжет `quest`.
- [module/actor/sheets/character/social-sheet.mjs](../module/actor/sheets/character/social-sheet.mjs) — актуальный refresh-pattern для section flags, dialogs, context menu и row actions.
- [module/actor/sheets/character/pers-sheet.mjs](../module/actor/sheets/character/pers-sheet.mjs) — актуальный refresh-pattern для compact section controller и per-tab actions.
- [module/actor/sheets/character/character-sheet-utils.mjs](../module/actor/sheets/character/character-sheet-utils.mjs) — scroll/transient UI helpers для safe rerender.
- [template.json](../template.json) — текущая actor/item schema; сейчас есть legacy `background`, `backstory`, `stories`, но нет story-domain и `quest`.
- [module/setup/register-sheets.mjs](../module/setup/register-sheets.mjs) — регистрация item sheets; `quest` пока отсутствует.
- [module/item/item-defaults.mjs](../module/item/item-defaults.mjs) — default item image map; сюда понадобится icon для `quest`.
- [module/setup/update.mjs](../module/setup/update.mjs) — уже существующий migration pattern, в том числе старая миграция `background/backstory -> stories`.
- [templates/item/item.description.hbs](../templates/item/item.description.hbs) и [templates/item/item.gmnotes.hbs](../templates/item/item.gmnotes.hbs) — current project contract для `system.description` и `system.gmDescription`.
- [module/item/sheets/contact.mjs](../module/item/sheets/contact.mjs), [module/item/sheets/faction.mjs](../module/item/sheets/faction.mjs) — уже существующие linked-doc endpoints для story references.
- [lang/en.json](../lang/en.json), [lang/es.json](../lang/es.json), [lang/fr.json](../lang/fr.json) — story labels, entry type labels, actions, empty states, migration/deprecation notices.
- [BACKLOG.md](../BACKLOG.md) — место для story follow-ups, не входящих в первый rebase.

Предыдущие refresh-планы:

- [07 refresh character tab.md](./07%20refresh%20character%20tab.md) — staged-spec, section-state, custom modal/context patterns.
- [08 refresh social tab.md](./08%20refresh%20social%20tab.md) — refresh-controller pattern, actor-flag UI state, linked object handling.
- [09 personality social tab.md](./09%20personality%20social%20tab.md) — отдельный tab-domain, item prep split, sequential implementation structure.

## Подтверждённые решения

- Главный UI-source — [BRP Story Tab Mockup](./uirefresh/brp-story-tab-mockup.html).
- Если mockup не задаёт логику, используется [BRP Story Tab Specification](./uirefresh/brp-story-tab-spec.md) и общий здравый смысл фичи.
- Story tab должен стать рабочим UI, а не визуальной заглушкой.
- Нужна миграция старых story-данных.
- Старые story-поля и хендлеры не удаляются молча в этой задаче: они помечаются как deprecated и выносятся в future cleanup.
- `dnd5e` не используется ни как источник решений, ни как reference links в этой спецификации.
- Канонический namespace UI state: `flags.brp.sheet.story`, а не `flags.brp-sheet.story`.
- В первой реализации не тратить фичу на технический rename current part `background` -> `story`, если это не даст прямой пользы UI/логике. User-facing Story остаётся Story, internal rename — отдельный cleanup.
- Existing `contact` и `faction` из Social rebase переиспользуются как story links; не вводится вторая пара story-specific contact/faction сущностей.
- Текстовая story-spec по quests требует shared behavior, но хранить один и тот же link одновременно и на актёре, и на item нельзя. Каноническая модель для `10`:
  - `quest` — world/shared `Item` type;
  - привязка quest к персонажу — actor-level link record в `system.story.questLinks[]`;
  - shared quest получается естественно, если один и тот же world item привязан к нескольким персонажам.
- У `quest` не вводится competing custom rich-text pair `description/gm_notes`; используется existing project contract:
  - `system.description`;
  - `system.gmDescription`.
- Legacy story fields считаются migration sources, а не актуальной source of truth:
  - `system.background`;
  - `system.backstory`;
  - `system.stories`.
- Legacy `system.stories[]` мигрируется в новый story-domain как journal entries типа `note`, без отдельного “legacy block” в UI, чтобы новый Story tab оставался 1 в 1 по мокапу.
- Journal feed не хранит квесты как дублированные inline entries. Каноническое поведение:
  - `entries[]` хранит только actor-local journal entries;
  - non-active quests синтетически рендерятся в Journal как story rows типа `quest`, оставаясь quest items;
  - active quests показываются только в `Active Quests`.
- Timeline overlay реализуется внутри character sheet DOM по композиции mockup, а не отдельным Foundry `Application`.
- Entry editor — modal/dialog flow; не возвращаться к always-open inline rich editors из старого background UI.

## Разрешённые production-адаптации мока

- Production CSS классы должны быть префиксованы `brp-story-refresh-*`, а не копировать standalone mock classes `section`, `icon-btn`, `journal-entry`, `timeline-overlay` и т.д. без namespace.
- Нельзя использовать Google Fonts и standalone inline theme из mockup. Typography, цвета и elevation должны лечь на текущую refresh-тему из [css/brp.css](../css/brp.css).
- Demo JS из mockup не считается source of truth. Он помогает понять composition и intended micro-interactions, но не фиксирует production storage contract.

Mock audit result:

- Блокирующих визуальных ошибок в [BRP Story Tab Mockup](./uirefresh/brp-story-tab-mockup.html) на planning pass не найдено.
- Найдены логические расхождения между demo JS и текстовой spec:
  - demo JS не уводит completed/failed/abandoned quests в Journal автоматически;
  - demo data содержит quest-like journal row независимо от active quest card.
- Для production `10` это разрешается в пользу текстовой story-spec и подтверждённой feature-логики:
  - `Active Quests` показывает только `status=active`;
  - Journal hybrid-feed рендерит actor entries + non-active quests;
  - Timeline строится из journal events и quest events без дублирования source data.

## Когда нужно остановиться и уточнить

- Если в существующих мирах `system.stories[]` используется не как набор narrative notes, а как структура с особыми зависимостями, которые нельзя безопасно отмапить в `note` entries.
- Если в ходе реализации выяснится, что статус quest должен быть actor-specific, а не shared item-level.
- Если linked references должны использовать не UUID-formats, а локальные actor item ids или другой тип идентификатора.
- Если old campaign data неожиданно продолжает опираться на прямое редактирование `background/backstory/stories` вне current sheet.
- Если для journal editor потребуется richer document flow, чем modal/dialog, и это начнёт ломать последовательность этапов ниже.

## Не входит в этот план

- Отдельный technical cleanup с полным rename `background` -> `story` по файлам, part ids и legacy localization keys.
- Timeline pan/zoom, type filters внутри timeline и other long-campaign navigation extras.
- Продвинутый quest browser для массовой привязки одного quest к нескольким персонажам.
- Отдельная сущность `Session` с централизованным campaign scheduler.
- Полное удаление deprecated legacy story-полей в рамках этой же итерации rebase.

## Текущая точка

Сейчас Story tab находится в старом состоянии и не соответствует ни мокапу, ни story-spec:

- [character.background.hbs](../templates/actor/character.background.hbs) рендерит только список rich-text sections из `system.stories[]`.
- [prepare/background.mjs](../module/actor/sheets/character/prepare/background.mjs) готовит только `backgroundView` и `storySections`, без journal/feed/timeline/quest model.
- [base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs) содержит специальный `_updateObject` path и CRUD для `.bio-section-*`, что привязывает story UI к legacy DOM-классам.
- [character-sheet-render.mjs](../module/actor/sheets/character/character-sheet-render.mjs) вручную биндит `.addNewSection`, `.move-section-up`, `.move-section-down`, `.delete-section` на общешитовый рендер, а не через dedicated story controller.
- В [template.json](../template.json) до сих пор есть `background`, `backstory`, `stories`, но нет `system.story.entries`, `system.story.questLinks` и `Item.quest`.
- В [register-sheets.mjs](../module/setup/register-sheets.mjs) и [item-defaults.mjs](../module/item/item-defaults.mjs) пока нет `quest`.
- В [character-items.mjs](../module/actor/sheets/character/character-items.mjs) нет story-domain state и нет prepare route для `quest`.
- В проекте уже есть refresh-pattern для сложных tabs через отдельные controllers:
  - [social-sheet.mjs](../module/actor/sheets/character/social-sheet.mjs);
  - [pers-sheet.mjs](../module/actor/sheets/character/pers-sheet.mjs).
  Story такого controller currently не имеет.
- [update.mjs](../module/setup/update.mjs) уже знает старую миграцию `background/backstory -> stories`, значит новая миграция должна учитывать, что в живых мирах могут существовать все три слоя legacy-данных сразу.

Значит `10` — это не template rewrite. Нужны новый story-domain, migration-safe storage, quest item foundation, refresh template, dedicated tab controller и финальная зачистка legacy entry points.

## Целевая структура UI

Target template:

```hbs
<section class="actor tab background {{tab.cssClass}}" data-group="primary" data-tab="background">
  <section class="brp-story-refresh">
    <header class="brp-story-refresh-titlebar">...</header>

    <section class="brp-story-refresh-section" data-story-section="quests">...</section>
    <section class="brp-story-refresh-section" data-story-section="journal">...</section>

    <div class="brp-story-refresh-timeline-overlay" hidden>...</div>
    <div class="brp-story-refresh-context-menu-anchor"></div>
  </section>
</section>
```

Target section order:

1. `Active Quests`
2. `Journal`

Timeline:

- открывается кнопкой в titlebar;
- повторяет mockup composition 1 в 1;
- содержит `Sessions` и `Parallel lanes`;
- закрывается без навигации на другой sheet/app.

Section rules:

- обе секции сворачиваемые;
- count badge и actions живут в header, как в мокапе;
- `Active Quests` показывает только активные quest links;
- `Journal` содержит toolbar `type chips + search` и hybrid-feed.

## Модель данных и UI state

### Actor story data

Канонический actor-level namespace:

```json
{
  "system": {
    "story": {
      "entries": [
        {
          "id": "story-entry-id",
          "type": "decision",
          "title": "Chose civilians over mission",
          "content": "<p>rich text</p>",
          "session": "Session 12",
          "inGameDate": "2294-08-14",
          "realDate": "2026-04-18T14:20:00Z",
          "pinned": true,
          "linked": ["contact:Actor.a.Item.b", "quest:Item.c"],
          "gmOnly": false,
          "sortIndex": 120
        }
      ],
      "questLinks": [
        {
          "uuid": "Item.questUuid",
          "sortOrder": 10
        }
      ]
    }
  }
}
```

Решения:

- `entries[]` хранит только actor-local journal entries;
- `questLinks[]` хранит только связь персонажа с world quest items;
- `sortIndex` нужен как fallback для migration/import cases, когда нет нормальной даты и нужно сохранить старый порядок;
- linked references остаются в string-format `"{kind}:{uuid}"`, но canonical payload после `:` — именно UUID, а не локальный id.

### Actor UI state

```json
{
  "flags": {
    "brp": {
      "sheet": {
        "story": {
          "stateInitialized": true,
          "collapsedSections": {
            "quests": true
          },
          "filters": {
            "types": ["session-log", "quest", "npc-encounter", "discovery", "decision", "milestone", "note"],
            "search": ""
          },
          "timelineView": "horizontal"
        }
      }
    }
  }
}
```

Правила:

- `collapsedSections` хранит только `true` entries;
- фильтры и `timelineView` persistятся;
- overlay open/close state и живой context/menu state остаются transient, а не actor data;
- namespace должен совпадать со style остальных refreshed tabs: `flags.brp.sheet.story`.

### Quest item

Канонический quest contract для `10`:

```json
{
  "type": "quest",
  "name": "Silver Hand Initiation",
  "system": {
    "status": "active",
    "objective": "Complete three acts of valor...",
    "sessionGiven": "Session 7",
    "updates": [
      {
        "id": "quest-update-id",
        "session": "Session 8",
        "inGameDate": "2294-08-09",
        "realDate": "2026-04-10T18:00:00Z",
        "text": "First act: defended the convoy."
      }
    ],
    "linked": ["faction:Item.silverHand"],
    "description": "<p>Rich description</p>",
    "gmDescription": "<p>GM-only notes</p>"
  }
}
```

Решения:

- `status` хранится на item и therefore shared между всеми актёрами, ссылающимися на этот quest;
- `sessionGiven` и `updates[]` используются для карточки и timeline event stream;
- rich fields не дублируются в custom story-specific names;
- unlink quest from actor не удаляет world item.

### Legacy / deprecated story fields

Source paths, которые после stage 1 считаются deprecated:

- `actor.system.background`
- `actor.system.backstory`
- `actor.system.stories`
- legacy DOM/action flow:
  - `.addNewSection`
  - `.move-section-up`
  - `.move-section-down`
  - `.delete-section`
  - `.bio-section-*`
  - `BRPActorSheetV2.createBioSection`
  - `BRPActorSheetV2.updateBioValue`
  - `BRPActorSheetV2.updateBioTitle`
  - `BRPActorSheetV2.deleteBioSection`
  - `BRPActorSheetV2.moveBioSectionUp`
  - `BRPActorSheetV2.moveBioSectionDown`

Они не должны быть source of truth после rebase. В коде нужен явный deprecated-marker/comment и clear migration note о будущем removal.

## Целевая view-model логика

Recommended target:

```js
context.storyRefresh = {
  sections: {
    quests: {
      visible: true,
      collapsed,
      count,
      rows
    },
    journal: {
      visible: true,
      collapsed,
      count,
      filters,
      rows
    }
  },
  timeline: {
    view: 'horizontal',
    sessions,
    lanes
  }
}
```

Required derived datasets:

- `activeQuestRows` — только `status=active`;
- `journalEntryRows` — actor `entries[]` + synthetic quest rows для `status!=active`;
- `journalTypeCounts` — counters по всем feed row types;
- `allStoryEvents` — для timeline: journal entries + quest events;
- `storyLinkedIndex` — resolved references для chips, orphan styling и open actions.

Recommended rules:

- Journal sort:
  1. `pinned=true`
  2. `realDate desc`
  3. `sortIndex desc` fallback when `realDate` missing
  4. stable name/id fallback
- Active quests sort:
  1. `sortOrder` из actor quest link, если появится
  2. иначе `sessionGiven`
  3. иначе name
- Non-active quests рендерятся в Journal как feed rows типа `quest`, не теряя связи с исходным item sheet.

## Этапы реализации

Legend:

- `[ ]` not started
- `[~]` in progress
- `[x]` completed
- `[!]` blocked / needs user decision

Общее правило: не начинать следующий этап, пока acceptance предыдущего не закрыт. Если поздний этап вскрывает ошибку раннего, работа ставится на паузу, конфликт фиксируется явно, и только потом принимается новое решение.

### Этап 0. Baseline, source of truth и закрытие конфликтов

Статус: [x] completed for planning pass

Файлы-якоря:

- [templates/actor/character.background.hbs](../templates/actor/character.background.hbs)
- [module/actor/sheets/character/prepare/background.mjs](../module/actor/sheets/character/prepare/background.mjs)
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs)
- [module/actor/sheets/character/character-sheet-render.mjs](../module/actor/sheets/character/character-sheet-render.mjs)
- [module/actor/sheets/character/character-context.mjs](../module/actor/sheets/character/character-context.mjs)
- [module/actor/sheets/character/character-tabs.mjs](../module/actor/sheets/character/character-tabs.mjs)
- [template.json](../template.json)
- [module/setup/update.mjs](../module/setup/update.mjs)
- [spec/uirefresh/brp-story-tab-mockup.html](./uirefresh/brp-story-tab-mockup.html)
- [spec/uirefresh/brp-story-tab-spec.md](./uirefresh/brp-story-tab-spec.md)

Что уже зафиксировано:

- UI source of truth — mock HTML.
- Logic source of truth — text spec, если mock не покрывает поведение.
- Story becomes fully working, not decorative.
- Migration required.
- Deprecated legacy story fields stay until follow-up cleanup.
- No `dnd5e`.
- Canonical quest model = world item + actor link records.
- Journal stores only actor entries; non-active quest rows are synthetic.
- Production namespace = `flags.brp.sheet.story`.
- Technical rename `background` is out of scope unless trivial and strictly helpful.

Acceptance:

- Нет незакрытых data-model ambiguities, которые заставят переделывать foundation после начала template/UI work.
- Ясно определено, что source of truth для Story после rebase больше не `system.stories[]`.

### Этап 1. Story foundation: schema, quest type, migration и deprecation markers

Статус: [ ]

Файлы:

- [template.json](../template.json)
- [module/setup/register-sheets.mjs](../module/setup/register-sheets.mjs)
- [module/item/item-defaults.mjs](../module/item/item-defaults.mjs)
- [module/setup/update.mjs](../module/setup/update.mjs)
- new suggested files:
  - `module/item/sheets/quest.mjs`
  - `templates/item/quest.detail.hbs`
- [lang/en.json](../lang/en.json), [lang/es.json](../lang/es.json), [lang/fr.json](../lang/fr.json)

Работы:

- Расширить actor schema новым namespace `system.story`:
  - `entries: []`
  - `questLinks: []`
- Добавить `Item` type `quest`.
- Зарегистрировать `quest` sheet и default icon.
- Ввести migration-safe quest sheet, использующий existing item description/gm notes contract:
  - `system.description`
  - `system.gmDescription`
- Реализовать миграцию legacy story data:
  - `system.background`
  - `system.backstory`
  - `system.stories[]`
  -> в `system.story.entries[]` как `note` entries с сохранением title/content/order.
- Если `system.story.entries[]` уже существует, миграция не должна дублировать старый контент.
- В коде явно отметить deprecated story sources и handlers:
  - schema comments / inline comments / dedicated helper constants;
  - update/migration note о будущем removal.
- Добавить localization для:
  - `quest`
  - story section labels
  - journal entry type labels
  - story actions
  - migration/deprecation warnings

Acceptance:

- Новый `quest` можно создать, открыть и сохранить.
- `system.story.entries[]` и `system.story.questLinks[]` существуют как canonical storage.
- Старый контент из `background/backstory/stories` может быть перенесён без потери текста.
- После завершения этапа foundation больше не нужен второй redesign storage contract.

Implementation notes to keep stable:

- Не удалять legacy fields в этом этапе.
- Не продолжать строить новую UI-логику поверх `system.stories[]`.
- Не дублировать quest links одновременно в actor и item custom field списках.

### Этап 2. Story domain и view-model preparation

Статус: [ ]

Файлы:

- [module/actor/sheets/character/character-context.mjs](../module/actor/sheets/character/character-context.mjs)
- [module/actor/sheets/character/character-items.mjs](../module/actor/sheets/character/character-items.mjs)
- [module/actor/sheets/character/character-sheet-config.mjs](../module/actor/sheets/character/character-sheet-config.mjs)
- [module/actor/sheets/character/character-tabs.mjs](../module/actor/sheets/character/character-tabs.mjs)
- [module/actor/sheets/character/prepare/background.mjs](../module/actor/sheets/character/prepare/background.mjs)
- [module/actor/sheets/character/character-sheet-utils.mjs](../module/actor/sheets/character/character-sheet-utils.mjs)
- new suggested files:
  - `module/actor/sheets/character/prepare/story.mjs`
  - `module/actor/sheets/character/prepare/story/shared.mjs`

Обоснование refactor:

Текущая story/background логика размазана между `prepare/background.mjs`, общим render-binder и `base-actor-sheet`. Для полноценного rebase Story нужен отдельный story-domain, иначе поздние этапы будут возвращать нас в legacy flow.

Работы:

- Вынести новую Story preparation в dedicated module (`prepare/story.mjs`), даже если current part/template временно остаются `background`.
- Добавить new preparation state для `quest` в [character-items.mjs](../module/actor/sheets/character/character-items.mjs).
- Построить `context.storyRefresh` и сохранить temporary compatibility `backgroundView` only if это нужно для safe transition during stage 3.
- Подготовить `activeQuestRows` из actor `system.story.questLinks[]` + world `quest` items.
- Подготовить hybrid `journalRows`:
  - actor inline entries;
  - synthetic quest rows для non-active quests.
- Подготовить timeline datasets:
  - grouped by session;
  - grouped by type;
  - resolved linked docs;
  - orphan link markers.
- Нормализовать story flags:
  - `collapsedSections`
  - `filters`
  - `timelineView`
  - `stateInitialized`
- Решить lock/read-only semantics на уровне view-model:
  - open/timeline/filter allowed;
  - create/edit/delete/pin/status mutations blocked in locked mode.
- Подготовить count badges, empty states, toolbar chip counts и current filter state.

Acceptance:

- Новый Story template можно полностью рендерить из `context.storyRefresh`, без прямого копания в raw `system.stories[]`.
- `quest` preparation встроен в current character sheet item routing.
- Journal, Active Quests и Timeline datasets не требуют ещё одного redesign перед template work.

### Этап 3. Story template и CSS rebase по мокапу

Статус: [ ]

Файлы:

- [templates/actor/character.background.hbs](../templates/actor/character.background.hbs)
- [css/brp.css](../css/brp.css)

Работы:

- Полностью переписать [character.background.hbs](../templates/actor/character.background.hbs) под новый Story UI, сохранив current part hook `background`, если это дешевле технически.
- Собрать titlebar по mockup:
  - book icon
  - `Story`
  - `Open timeline`
  - lock indicator
- Реализовать section headers 1 в 1 по mockup:
  - chevron
  - title
  - count badge
  - divider line
  - add button
- Реализовать `Active Quests` cards:
  - status badge
  - objective
  - meta row
  - recent updates
  - action buttons
- Реализовать `Journal`:
  - toolbar with type chips + search
  - feed cards with icon, type badge, dates, pin, menu, linked chips
  - empty state
- Реализовать fullscreen timeline overlay:
  - header
  - view switcher
  - close button
  - body for `Sessions` и `Parallel lanes`
- Все story-specific classes префиксовать `brp-story-refresh-*`.
- Визуально копировать composition из mockup максимально близко, адаптируя only to current refresh theme infrastructure.

Acceptance:

- Статический Story layout считывается как mockup почти 1 в 1.
- В production markup нет generic mock-only class leakage без namespace.
- Следующий этап может только навесить логику, не переписывая структуру заново.

### Этап 4. Story controller, dialogs, context menus и финальная проверка

Статус: [ ]

Файлы:

- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs)
- [module/actor/sheets/character/character-sheet-actions.mjs](../module/actor/sheets/character/character-sheet-actions.mjs)
- [module/actor/sheets/character/character-sheet-render.mjs](../module/actor/sheets/character/character-sheet-render.mjs)
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs)
- [module/actor/sheets/character/social-sheet.mjs](../module/actor/sheets/character/social-sheet.mjs)
- [module/actor/sheets/character/pers-sheet.mjs](../module/actor/sheets/character/pers-sheet.mjs)
- new suggested file:
  - `module/actor/sheets/character/story-sheet.mjs`
- [BACKLOG.md](../BACKLOG.md)
- [lang/en.json](../lang/en.json), [lang/es.json](../lang/es.json), [lang/fr.json](../lang/fr.json)

Работы:

- Добавить dedicated story-sheet controller по аналогии с `social-sheet` / `pers-sheet`.
- Перевести Story tab с legacy event binding на action-driven flow:
  - section collapse
  - add quest
  - add journal entry
  - edit entry
  - pin toggle
  - quest status change
  - open linked docs
  - open/unlink quest
  - timeline open/close
  - timeline view switch
- Реализовать story context menus:
  - quest: open, add update, mark completed/failed/abandoned, unlink from character
  - journal entry: edit, pin/unpin, duplicate, delete
- Сделать modal/dialog flows:
  - create/edit journal entry
  - add quest update
  - link existing quest, если нужен first-pass attach flow
- Снять или изолировать legacy story handlers из [base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs) и общего render binder, чтобы новый tab не зависел от `.bio-section-*`.
- Обеспечить transient UI preservation:
  - workspace scroll
  - overlay state, если пользователь не сделал persist-changing action
  - safe rerender после flag/item updates
- Финализировать localization.
- Зафиксировать все consciously deferred follow-ups в [BACKLOG.md](../BACKLOG.md).

Acceptance:

- Каждый видимый control Story tab wired к реальному действию или осознанно disabled-state.
- Новый Story tab больше не опирается на legacy `.bio-section-*` flow как на primary interaction path.
- Migration-safe behavior сохранён и не требует возвращения к этапам 1-3.

Required manual checks:

- Открыть Story tab на персонаже с пустыми данными.
- Открыть Story tab на персонаже после миграции legacy `stories[]`.
- Проверить locked/unlocked режимы.
- Создать новый journal entry.
- Отредактировать, продублировать, закрепить и удалить journal entry.
- Проверить type filters и search persistence.
- Создать новый quest, открыть его sheet и привязать к персонажу.
- Проверить, что `active` quest виден только в `Active Quests`.
- Переключить quest в `completed` / `failed` / `abandoned` и убедиться, что карточка ушла из `Active Quests` и появилась в Journal hybrid-feed.
- Проверить linked chips для `contact`, `faction`, `quest`, `item`.
- Проверить orphan link rendering.
- Открыть timeline overlay, переключить `Sessions` / `Parallel lanes`, закрыть overlay.
- Проверить, что timeline собирается из journal events и quest events.
- Проверить, что old `system.background/backstory/stories` после migration больше не являются live source of truth.

## Финальный критерий готовности `10`

Спека считается пригодной для последовательной реализации, если одновременно выполнено следующее:

- UI-source, logic-source и resolved model conflicts зафиксированы заранее.
- Этапы крупные и последовательные, без необходимости возвращаться к storage decision после начала template rework.
- Migration и deprecation не оставлены “на потом”, а включены в foundation.
- Story UI после реализации сможет стать рабочим без сохранения старого `system.stories[]`-editor path в качестве fallback UX.

## Completion checklist

Отмечать только после фактической проверки, а не во время кодинга.

- [x] Planning audit completed.
- [ ] Story storage contract (`system.story`) added.
- [ ] `quest` item type registered.
- [ ] Legacy story migration implemented.
- [ ] Deprecated story fields/handlers marked in code.
- [ ] `storyRefresh` view-model prepared.
- [ ] Story template rebuilt to mock.
- [ ] Active Quests section matched to mock.
- [ ] Journal toolbar/feed matched to mock.
- [ ] Timeline overlay matched to mock.
- [ ] Dedicated story controller wired.
- [ ] Legacy `.bio-section-*` path no longer primary.
- [ ] Localization updated.
- [ ] Manual verification completed.

## Backlog links

Out-of-scope follow-ups are tracked in [BACKLOG.md](../BACKLOG.md).

Expected Story-specific follow-ups after first rebase:

- final removal of deprecated legacy story fields/handlers after migration proves safe;
- richer timeline navigation for long campaigns;
- advanced quest linking/sharing UX beyond first-pass create/link flow.
