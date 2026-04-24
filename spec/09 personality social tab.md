# 09 Personality social tab

Дата фиксации: 2026-04-23

Статус: план-предложение для полного visual/data rebase отдельного rail-tab `pers` (`social-personality`). Документ описывает порядок работ так, чтобы идти последовательно, фиксировать решения заранее и не возвращаться к уже закрытым пунктам без нового явного согласования.

## Цель

Сделать полноценный rebase отдельного tab `pers` в стиле нового shell и целевого мока:

- визуально привести вкладку к [BRP Personality Tab Mockup](./uirefresh/brp-personality-tab-mockup.html);
- сохранить вкладку отдельной от обновлённого `Social` tab;
- заменить старый table/list UI в [character.pers.hbs](../templates/actor/character.pers.hbs) на refresh-layout с двумя секциями: `Personality Traits` и `Passions`;
- заложить все нужные изменения schema, item sheets, prepare/view-model, actor actions и CSS, чтобы новый UI работал без временных follow-up решений;
- сохранить существующие roll-entry points для `passion` и `persTrait`, но перестроить их вокруг нового карточного UI;
- сделать результат максимально 1 в 1 по мокапу, а любые ошибки или конфликтующие места фиксировать явно до кода.

## Источники

HTML и целевой UX:

- [BRP Personality Tab Mockup](./uirefresh/brp-personality-tab-mockup.html) - главный источник по layout, секциям, композиции карточек, visual hierarchy и expected interactions.
- [BRP Personality Tab Specification](./uirefresh/brp-personality-tab-spec.md) - базовое текстовое описание; использовать как пояснение, но при расхождении с HTML приоритет у мока и этой `09`-спеки.

Текущая реализация BRP:

- [templates/actor/character.pers.hbs](../templates/actor/character.pers.hbs) - текущий legacy-tab для `passion` и `persTrait`.
- [module/actor/sheets/character/character-sheet-config.mjs](../module/actor/sheets/character/character-sheet-config.mjs) - part `pers`, tab config и current sheet structure.
- [module/actor/sheets/character/character-tabs.mjs](../module/actor/sheets/character/character-tabs.mjs) - rail metadata для `pers` / `social-personality`.
- [module/actor/sheets/character/character-items.mjs](../module/actor/sheets/character/character-items.mjs) - текущая маршрутизация item preparation; сейчас `passion` и `persTrait` живут внутри social-prep.
- [module/actor/sheets/character/prepare/social.mjs](../module/actor/sheets/character/prepare/social.mjs) - текущее накопление `passions` и `persTraits`, плюс legacy improve-prep.
- [module/actor/sheets/character/prepare/sheet-settings.mjs](../module/actor/sheets/character/prepare/sheet-settings.mjs) - `usePassion`, `usePersTrait`, `usePersTab`.
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs) - existing actor actions `passionRoll`, `personalityRoll`, `viewDoc`, `createDoc`.
- [module/apps/rollType.mjs](../module/apps/rollType.mjs) - текущие roll entry points для `PA` и `PT`.
- [module/actor/actor.mjs](../module/actor/actor.mjs) - canonical derived totals для `passion` (`base + xp`) и `persTrait` (`clamped total`, `opptotal = 100 - total`), плюс `starterTraits`.
- [template.json](../template.json) - текущая item schema для `passion`, `persTrait`, `contact`, `faction`.
- [module/item/sheets/passion.mjs](../module/item/sheets/passion.mjs) и [templates/item/passion.detail.hbs](../templates/item/passion.detail.hbs) - текущий item sheet `passion`.
- [module/item/sheets/persTrait.mjs](../module/item/sheets/persTrait.mjs) и [templates/item/persTrait.detail.hbs](../templates/item/persTrait.detail.hbs) - текущий item sheet `persTrait`.
- [module/item/sheets/contact.mjs](../module/item/sheets/contact.mjs) и [module/item/sheets/faction.mjs](../module/item/sheets/faction.mjs) - уже готовые reference points для linked focus behavior у `passion`.
- [module/actor/sheets/character/character-core-sheet.mjs](../module/actor/sheets/character/character-core-sheet.mjs) - refresh-pattern для double click, context menu и section-state.
- [module/actor/sheets/character/social-sheet.mjs](../module/actor/sheets/character/social-sheet.mjs) - refresh-pattern для menu/toggle/context actions и actor flags.
- [css/brp.css](../css/brp.css) - refresh theme variables и уже существующие patterns для social/character refresh blocks.
- [BACKLOG.md](../BACKLOG.md) - место для задач, сознательно не входящих в `09`.

Предыдущие refresh-планы:

- [07 refresh character tab.md](./07%20refresh%20character%20tab.md) - формат staged-спеки, section-state, core-card context menu patterns.
- [08 refresh social tab.md](./08%20refresh%20social%20tab.md) - refresh-паттерны секций, action wiring, actor-flag UI state и social domain split.

## Подтверждённые решения

- `09` покрывает только отдельный tab `pers`. Merge `pers` в `Social` не входит в эту задачу.
- Главный UI-источник - [BRP Personality Tab Mockup](./uirefresh/brp-personality-tab-mockup.html).
- В `09` можно и нужно закладывать все нужные изменения кода и schema, если без них новый UI не сможет работать честно.
- Ссылки на `dnd5e` в этой спеки не используются по прямому решению пользователя.
- `passion` и `persTrait` остаются отдельными item types и отдельной вкладкой, а не subsection внутри `socialRefresh`.
- Для `persTrait` фиксируется одно canonical impCheck-состояние на всю пару:
  - в UI, view-model и новой логике это один `impCheck`;
  - migration-safe storage для первой реализации остаётся на базе `system.improve`;
  - `system.oppimprove` больше не является отдельной актуальной механикой и используется только как legacy fallback на чтение;
  - при старых данных item считается отмеченным, если `system.improve || system.oppimprove`;
  - новая запись идёт только в один общий флаг.
- `system.basic` у `persTrait` сохраняется и не выносится в новый actor-tab UI, потому что сейчас участвует в `starterTraits` на уровне [actor.mjs](../module/actor/actor.mjs).
- `passion` получает structured focus-link на `contact` или `faction`, но свободный текст `focus` остаётся основным display source и не должен пропадать при поломанной ссылке.
- Sort defaults фиксируются как в мокапе:
  - `traits`: `A-Z`;
  - `passions`: `Value ↓`.

## Одобренные production-адаптации мока

- В production нельзя копировать standalone class names из мока. Все новые actor-tab классы должны быть префиксованы `brp-pers-refresh-*`.
- В production нельзя использовать Google Fonts и inline standalone theme из HTML-мока; typography и colors должны лечь на существующую refresh theme в [css/brp.css](../css/brp.css).
- Для passion type icons можно использовать Font Awesome внутри фиксированных icon containers, если размер, акцент и hover-state визуально совпадают с мокапом.
- Roll affordance не добавляется отдельной кнопкой, которой нет в мокапе:
  - у `persTrait` rollable остаётся сам value cluster;
  - у `passion` rollable остаётся value/bar zone.
  Это production-адаптация для сохранения существующей логики без визуального отхода от мока.

Mock audit result:

- Блокирующих визуальных ошибок в [BRP Personality Tab Mockup](./uirefresh/brp-personality-tab-mockup.html) на planning pass не найдено.
- Главная логическая неоднозначность мока была в `persTrait` impCheck. Она закрыта решением про один canonical impCheck на пару.

## Когда нужно остановиться и уточнить

- Если в старых мирах реально используется сценарий, где `improve` и `oppimprove` означают два независимых future-growth трека, а не просто legacy checkbox-состояния.
- Если `passion` должен ссылаться не на `contact`/`faction` item UUID, а на membership record, actor UUID или другой тип документа.
- Если окажется, что существующие кампании массово используют world/compendium `passion` items без actor owner и structured focus-link должен работать там так же полноценно, как и у embedded item.
- Если в ходе реализации обнаружится ещё один скрытый gameplay-смысл у `persTrait.system.basic`, кроме `starterTraits`.

## Текущая точка

Сейчас `pers`-вкладка находится в промежуточном состоянии:

- actor shell уже refresh-совместимый, но сам [character.pers.hbs](../templates/actor/character.pers.hbs) остался legacy list/table;
- `passion` и `persTrait` пока готовятся внутри [prepare/social.mjs](../module/actor/sheets/character/prepare/social.mjs), хотя обновлённый `Social` tab их уже не рендерит;
- у `pers` нет собственного refresh-controller модуля по аналогии с [social-sheet.mjs](../module/actor/sheets/character/social-sheet.mjs) или [character-core-sheet.mjs](../module/actor/sheets/character/character-core-sheet.mjs);
- current `passion` item schema не содержит type/focus/link contract, который нужен мокапу;
- current `persTrait` item schema не содержит короткого notes field для карточки;
- старый UI и old sheet всё ещё опираются на два отдельных improve checkboxes (`improve`, `oppimprove`), а новый мок этого не допускает.

Значит `09` - это не просто template rewrite. Нужны foundation, domain split, item sheet update, actor-tab rewrite и новые UI actions.

## Целевая структура UI

Target template:

```hbs
<section class="actor tab pers {{tab.cssClass}}" data-group="primary" data-tab="pers">
  <section class="brp-pers-refresh">
    <header class="brp-pers-refresh-titlebar">...</header>

    {{#if persRefresh.sections.traits.visible}}
      <section class="brp-pers-refresh-section" data-pers-section="traits">...</section>
    {{/if}}

    {{#if persRefresh.sections.passions.visible}}
      <section class="brp-pers-refresh-section" data-pers-section="passions">...</section>
    {{/if}}
  </section>
</section>
```

Target section order:

1. `Personality Traits`
2. `Passions`

Section rules:

- если `usePersTrait = false`, секция `traits` не рендерится;
- если `usePassion = false`, секция `passions` не рендерится;
- если обе optional rules выключены, tab `pers` не появляется вообще, как и сейчас через `usePersTab`;
- collapse и sort state сохраняются на actor flags;
- lock state не должен ломать чтение, open-sheet и rolls, но должен блокировать add / impCheck toggle / remove.

## Модель данных и UI state

### Actor UI state

Новый namespace для tab-only state:

```json
{
  "flags": {
    "brp": {
      "sheet": {
        "pers": {
          "collapsedSections": {
            "traits": true
          },
          "sortModes": {
            "traits": "name",
            "passions": "value-desc"
          }
        }
      }
    }
  }
}
```

Правила:

- `collapsedSections` хранит только `true` entries;
- `sortModes` хранит строку режима для каждой видимой секции;
- UI-only state живёт здесь, а не в `system`;
- add/remove/impCheck не должны зависеть от этих flags.

### Passion

Нужный canonical contract для `09`:

```json
{
  "type": "passion",
  "name": "Revenge",
  "system": {
    "base": 0,
    "xp": 0,
    "improve": false,
    "type": "hate",
    "focus": "Captain Koss",
    "focusLinkType": "contact",
    "focusLinkUuid": "Item.xxx",
    "notes": ""
  }
}
```

Правила:

- numeric source истины остаётся текущим: `total = base + xp`;
- `type` enum: `love`, `hate`, `loyalty`, `fear`, `devotion`, `other`;
- `focus` всегда хранит отображаемый текст и не очищается при пропаже ссылки;
- `focusLinkUuid` - optional link на embedded `contact` item или shared `faction` item;
- `focusLinkType` нужен для стабильного resolve и orphan behavior;
- `notes` можно не показывать в карточке `09`, но field полезен для sheet и future summary use.

### Personality Trait

Нужный canonical contract для `09`:

```json
{
  "type": "persTrait",
  "name": "Brave",
  "system": {
    "oppName": "Cowardly",
    "base": 0,
    "xp": 0,
    "improve": false,
    "oppimprove": false,
    "basic": false,
    "notes": ""
  }
}
```

Правила:

- `item.name` остаётся левой стороной пары;
- `system.total` и `system.opptotal` остаются derived values, а не stored source of truth;
- canonical impCheck для `09` - один pair-level flag на базе `system.improve`;
- `system.oppimprove` сохраняется только как legacy read fallback;
- `notes` - короткий plain-text field для строки под dual bar;
- `basic` не показывается в actor-tab, но сохраняется для starter trait flow.

### View-model

Рекомендуемый target:

```js
context.persRefresh = {
  sections: {
    traits: {
      visible,
      collapsed,
      sortMode,
      count,
      createAction,
      rows
    },
    passions: {
      visible,
      collapsed,
      sortMode,
      count,
      createAction,
      rows
    }
  }
}
```

Trait row minimum:

- `itemId`
- `leftName`
- `rightName`
- `leftValue`
- `rightValue`
- `dominantSide`
- `fixatedSide`
- `impCheck`
- `displayNotes`
- `actions`

Passion row minimum:

- `itemId`
- `name`
- `type`
- `typeIcon`
- `value`
- `fixated`
- `impCheck`
- `focusText`
- `focusLink`
- `focusResolved`
- `actions`

## Этапы реализации

Legend:

- `[ ]` not started
- `[~]` in progress
- `[x]` completed
- `[!]` blocked / needs user decision

Общее правило: не начинать следующий этап, пока acceptance предыдущего не закрыт. Если поздний этап вскрывает ошибку раннего, работа ставится на паузу и конфликт поднимается явно, а не переписывается молча.

### Этап 0. Baseline и зафиксированные решения

Статус: [x] completed for planning pass

Файлы-якоря:

- [templates/actor/character.pers.hbs](../templates/actor/character.pers.hbs)
- [module/actor/sheets/character/character-items.mjs](../module/actor/sheets/character/character-items.mjs)
- [module/actor/sheets/character/prepare/social.mjs](../module/actor/sheets/character/prepare/social.mjs)
- [module/actor/actor.mjs](../module/actor/actor.mjs)
- [module/apps/rollType.mjs](../module/apps/rollType.mjs)
- [module/item/sheets/passion.mjs](../module/item/sheets/passion.mjs)
- [module/item/sheets/persTrait.mjs](../module/item/sheets/persTrait.mjs)
- [template.json](../template.json)
- [spec/uirefresh/brp-personality-tab-mockup.html](./uirefresh/brp-personality-tab-mockup.html)
- [spec/uirefresh/brp-personality-tab-spec.md](./uirefresh/brp-personality-tab-spec.md)

Что уже зафиксировано:

- tab остаётся отдельным;
- mock HTML - главный UI source;
- impCheck у `persTrait` становится единым;
- structured focus link для `passion` нужен;
- `basic` и `starterTraits` не ломаем;
- `dnd5e` не используется как reference.

Acceptance:

- Нет незакрытых UI- или data-model ambiguities, которые гарантированно сломают реализацию.
- Все дальнейшие этапы опираются на один и тот же contract, без повторного выбора между merge/split или one/two impChecks.

### Этап 1. Item foundation и contract item sheets

Статус: [ ]

Файлы:

- [template.json](../template.json)
- [module/item/sheets/passion.mjs](../module/item/sheets/passion.mjs)
- [templates/item/passion.detail.hbs](../templates/item/passion.detail.hbs)
- [module/item/sheets/persTrait.mjs](../module/item/sheets/persTrait.mjs)
- [templates/item/persTrait.detail.hbs](../templates/item/persTrait.detail.hbs)
- [module/item/sheets/contact.mjs](../module/item/sheets/contact.mjs)
- [module/item/sheets/faction.mjs](../module/item/sheets/faction.mjs)
- [lang/en.json](../lang/en.json), [lang/es.json](../lang/es.json), [lang/fr.json](../lang/fr.json)

Работы:

- Расширить schema `passion` полями `type`, `focus`, `focusLinkType`, `focusLinkUuid`, `notes`.
- Расширить schema `persTrait` полем `notes`.
- Зафиксировать migration-safe impCheck semantics:
  - canonical write/read через pair-level `system.improve`;
  - `system.oppimprove` больше не редактируется как отдельный live field;
  - old data читаются через `improve || oppimprove`.
- Обновить sheet `passion`, чтобы он редактировал type/focus/link и в owner-context умел выбирать:
  - actor contacts;
  - actor-linked factions.
- Если `passion` открыт вне actor owner, structured focus link должен gracefully деградировать до freeform focus text без поломки sheet.
- Обновить sheet `persTrait`, чтобы он редактировал `oppName`, pair-level impCheck semantics, `notes`, но не ломал `basic`.
- Добавить/обновить локализацию для:
  - personality section labels;
  - passion type labels;
  - focus-link helper text;
  - sort labels;
  - fixated badge;
  - impCheck text.

Acceptance:

- Старые `passion` и `persTrait` items продолжают открываться.
- Новые поля можно редактировать без потери legacy данных.
- `starterTraits` по `system.basic` не ломаются.
- `passion` sheet может сохранить usable focus text даже без owner actor.

### Этап 2. Pers domain, view-model и нужный refactor prep-слоя

Статус: [ ]

Файлы:

- [module/actor/sheets/character/character-items.mjs](../module/actor/sheets/character/character-items.mjs)
- [module/actor/sheets/character/prepare/social.mjs](../module/actor/sheets/character/prepare/social.mjs)
- [module/actor/sheets/character/prepare/sheet-settings.mjs](../module/actor/sheets/character/prepare/sheet-settings.mjs)
- [module/actor/sheets/character/character-sheet-config.mjs](../module/actor/sheets/character/character-sheet-config.mjs)
- new suggested file:
  - `module/actor/sheets/character/prepare/pers.mjs`

Обоснование refactor:

Сейчас `passion` и `persTrait` готовятся внутри social-prep, хотя после `08` это уже отдельная вкладка. Вынос в dedicated pers domain нужен не ради абстракции, а чтобы после `09` social и personality больше не делили один prepare-файл и не заставляли возвращаться к старым решениям.

Работы:

- Вынести `passion` / `persTrait` preparation из `prepare/social.mjs` в отдельный pers-focused prepare module.
- Обновить [character-items.mjs](../module/actor/sheets/character/character-items.mjs), чтобы эти item types шли в `states.pers`, а не в `states.social`.
- Добавить `createPersPreparation` / `finalizePersPreparation`.
- Построить `context.persRefresh` с секциями `traits` и `passions`.
- Добавить actor-flag state `flags.brp.sheet.pers`.
- Реализовать sort/collapse rules:
  - `traits`: `name`, `name-desc`, `value-desc`, `value-asc`;
  - `passions`: те же режимы;
  - default как в мокапе.
- Подготовить trait rows:
  - left/right values;
  - dominant side;
  - fixated side;
  - `displayNotes`;
  - one impCheck state;
  - roll metadata для left/opposed side.
- Подготовить passion rows:
  - type icon/color token;
  - focus link resolve;
  - orphan fallback;
  - fixated state;
  - one impCheck state.
- Сохранить compatibility-level exports `context.passions` / `context.persTraits` только если они ещё нужны в других местах, но шаблон `09` должен рендериться из `context.persRefresh`, а не из raw arrays.

Acceptance:

- Новый `pers` template можно полностью рендерить из `context.persRefresh`.
- `Social` prep после refactor больше не тащит personality-specific row logic.
- Старые optional rules `usePassion`, `usePersTrait`, `usePersTab` продолжают работать без смены внешнего смысла.

### Этап 3. Actor template и CSS rebase под мок

Статус: [ ]

Файлы:

- [templates/actor/character.pers.hbs](../templates/actor/character.pers.hbs)
- [css/brp.css](../css/brp.css)

Работы:

- Полностью переписать [character.pers.hbs](../templates/actor/character.pers.hbs) в refresh-layout.
- Добавить titlebar, визуально совпадающий с mock:
  - heading `Personality`;
  - lock-indicator в стиле current refresh shell.
- Реализовать section headers с:
  - chevron;
  - title;
  - count badge;
  - divider line;
  - sort pill;
  - add button.
- Реализовать trait card 1 в 1 по мокапу:
  - impCheck checkbox слева;
  - `left ↔ right`;
  - value cluster `left / right`;
  - fixated badge;
  - dual bar;
  - center marker `50`;
  - notes line под баром.
- Реализовать passion card 1 в 1 по мокапу:
  - icon box;
  - impCheck checkbox;
  - name;
  - type badge;
  - fixated badge;
  - focus line;
  - value bar;
  - value text;
  - action buttons.
- Сделать empty states и locked visual states.
- Все новые actor-tab классы префиксовать `brp-pers-refresh-*`.
- Не копировать standalone `.trait-card`, `.passion-card`, `.icon-btn`, `.section` из мока без production prefix.

Acceptance:

- Визуальная структура совпадает с mockup без дополнительных “служебных” кнопок, которых там нет.
- Цвета, spacing и hierarchy считываются как мок, но живут на существующей refresh theme.
- Нет CSS leakage в другие tabs.

### Этап 4. Actor-sheet actions, context menus, rolls и финальная acceptance-проверка

Статус: [ ]

Файлы:

- new suggested file:
  - `module/actor/sheets/character/pers-sheet.mjs`
- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs)
- [module/actor/sheets/character/character-sheet-actions.mjs](../module/actor/sheets/character/character-sheet-actions.mjs)
- [module/actor/sheets/character/character-sheet-config.mjs](../module/actor/sheets/character/character-sheet-config.mjs)
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs)
- [module/apps/rollType.mjs](../module/apps/rollType.mjs)

Работы:

- Добавить dedicated pers-sheet controller по аналогии с current refresh modules:
  - section collapse;
  - sort cycle;
  - impCheck toggle;
  - context menu binding;
  - dblclick open;
  - menu button -> context menu dispatch.
- Подключить новый module в [character.mjs](../module/actor/sheets/character.mjs) и [character-sheet-actions.mjs](../module/actor/sheets/character/character-sheet-actions.mjs).
- Добавить в [character-sheet-config.mjs](../module/actor/sheets/character/character-sheet-config.mjs) pers-specific selectors/constants.
- Сохранить current roll backends:
  - `passionRoll` остаётся на `PA`;
  - `personalityRoll` остаётся на `PT`.
- Зафиксировать roll affordance в UI:
  - у `persTrait` clickable left value = normal side, right value = opposed side;
  - у `passion` clickable value/bar cluster = passion roll.
- Реализовать context menus:
  - `trait`: view, add/remove impCheck, remove from character;
  - `passion`: view, open linked focus (если resolve успешен), add/remove impCheck, remove from character.
- Проверить lock semantics:
  - rolls, open sheet, collapse, sort доступны;
  - add/remove/impCheck mutation блокируются.
- Проверить migration-safe поведение старых данных:
  - `oppimprove` legacy items;
  - passions без `type/focus`;
  - traits без `notes`;
  - missing linked focus documents.

Acceptance:

- Every visible control in the new `pers` tab wired to a real action or deliberate inert visual from mock не остаётся “пустышкой”.
- Старые `passion` и `persTrait` items не теряют читаемость.
- `pers` tab больше не требует возвращения в `socialRefresh`, чтобы поддерживать personality UI.
- Ручная проверка покрывает минимум:
  - actor с обоими rules on;
  - actor только с `passion`;
  - actor только с `persTrait`;
  - locked/unlocked mode;
  - trait `0/100`, `50/50`, `>50`, `<50`;
  - passion `100%`, linked focus, orphaned focus;
  - старый `oppimprove=true` item.

## Финальный критерий готовности `09`

Спеку можно считать закрытой и безопасной для последовательной реализации, если одновременно выполнено следующее:

- item contract для `passion` и `persTrait` не оставляет незакрытых конфликтов с моком;
- pers domain отделён от social domain;
- UI шаги разбиты на малое число крупных стадий и не заставляют возвращаться к foundation после начала template work;
- решение по одному canonical impCheck на `persTrait` зафиксировано как обязательное, а не как “можно потом решить”.
