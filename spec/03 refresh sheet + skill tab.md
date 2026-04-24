# 03 Refresh sheet + skill tab

Дата фиксации: 2026-04-21

Статус: план-предложение для реализации интерфейса. Документ не меняет поведение сам по себе и описывает порядок работ для полноценного visual rebase листа персонажа BRP после уже выполненного архитектурного рефакторинга.

## Цель

Пересобрать лист персонажа вокруг новой композиции:

- слева постоянный sidebar с аватаром, именем/подзаголовком и барами состояния;
- по центру workspace активной вкладки;
- справа вертикальный icon rail для навигации;
- первым полностью готовым разделом сделать `Skills`, включая навыки от характеристик и обычные навыки.

Главный принцип: не переписывать BRP-логику ради мокапа. Новый UI должен опираться на уже подготовленные view models и стабильные actions, а новые состояния интерфейса добавлять маленькими, явно ограниченными шагами.

## Источники

HTML и целевой UX:

- [BRP Character Sheet — Layout Specification](./uirefresh/brp-character-sheet-spec.md)
- [BRP Character Sheet — Layout Mockup](./uirefresh/brp-character-sheet-mockup.html)

Предыдущие спецификации:

- [00 character-sheet-ui-comparison.md](./00%20character-sheet-ui-comparison.md)
- [01 character-sheet-ui-implementation-plan.md](./01%20character-sheet-ui-implementation-plan.md)
- [02 character-sheet-ui-recommendations.md](./02%20character-sheet-ui-recommendations.md)

Текущая реализация BRP:

- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs) — orchestration листа, render parts, tab context.
- [module/actor/sheets/character/character-context.mjs](../module/actor/sheets/character/character-context.mjs) — общий context builder.
- [module/actor/sheets/character/character-tabs.mjs](../module/actor/sheets/character/character-tabs.mjs) — текущие parts/tabs и optional tabs.
- [module/actor/sheets/character/character-theme.mjs](../module/actor/sheets/character/character-theme.mjs) — применение темы и CSS variables.
- [templates/actor/character.header.hbs](../templates/actor/character.header.hbs) — текущий первый экран, identity, characteristics, portrait/resources.
- [templates/actor/character.skills.hbs](../templates/actor/character.skills.hbs) — текущий play/dev layout навыков.
- [module/actor/sheets/character/prepare/skills.mjs](../module/actor/sheets/character/prepare/skills.mjs) — `skillsView.play` и `skillsView.development`.
- [module/actor/sheets/character/prepare/characteristics.mjs](../module/actor/sheets/character/prepare/characteristics.mjs) — текущая модель характеристик и derived values.
- [module/actor/sheets/character/prepare/resources.mjs](../module/actor/sheets/character/prepare/resources.mjs) — текущая модель ресурсов.
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs) — существующие actions, inline edit, item create/delete, roll actions, drag/drop.
- [css/brp.css](../css/brp.css) — текущие visual primitives и стили листа.

Ориентиры dnd5e в локальной копии:

- [dnd5e/dnd5e.mjs](../dnd5e/dnd5e.mjs) — `CharacterActorSheet.PARTS`: `header`, `sidebar`, tab body parts, `abilityScores`, `tabs`.
- [dnd5e/dnd5e.css](../dnd5e/dnd5e.css) — patterns для `meter`, `meter-group`, `name-stacked`, `ability-scores`, `item-list-controls search`, `sidebar-tabs`.

## Подтверждённые решения

- Sidebar новой версии содержит только аватар, имя/подзаголовок и бары состояния. Навыки от характеристик не уходят в sidebar.
- `Skills` должен стать полноценным рабочим табом: derived characteristic skills, обычные skills, поиск, сортировки, collapse категорий, favorites, контекстное меню, duplicate/delete, drag/drop, hover-подсказка.
- Characteristic skills обязательно находятся во вкладке `Skills`.
- `skillcat` остаётся частью текущей модели данных. Мокап трактуется как UX, а не как требование убрать сущность `skillcat`.
- `Health` выделяется из `Combat` как новая вкладка для ран, лечения и будущей переработки механики здоровья.
- `Character` — вкладка для распределения очков характеристик и связанных stat/development controls.
- `Story` — identity-поля вроде имени, роста, веса и динамические story/background sections.
- Статусы мержатся из мокапа и текущей системы. Существующие поля сохраняются, мокаповые состояния можно добавить как UX/TODO для будущего расширения.
- Новая палитра и типографика должны быть базовой темой/preset, а не жёстким хардкодом поверх текущих theme settings.
- Hover/long-hover по skill row должен показывать описание навыка. MVP-источник: `description`; в плане оставить пометку, что формат подсказки может измениться.

## Не входит в этот план

- Не переписывать механику ран в рамках самого UI rebase. `Health` сначала получает текущие wounds/hit locations/healing actions, а новая механика проектируется отдельно.
- Не менять формулы BRP totals, skill category modifiers, weapon skill linkage и resource calculations.
- Не удалять optional tabs и optional settings, даже если они не представлены в HTML-мокапе.
- Не копировать dnd5e data model. dnd5e используется как источник композиционных и визуальных паттернов.
- Не подключать CDN-зависимости в Foundry без отдельного решения. Если понадобится SortableJS, его надо vendoring/bundle локально или заменить нативной Foundry-сортировкой.

## Текущая точка

Архитектурная подготовка уже в основном сделана:

- `character.mjs` вызывает `getCharacterParts`, `prepareCharacterSheetContext` и `applyCharacterSheetTheme`.
- `character-context.mjs` вызывает отдельные preparers для settings, identity, resources, characteristics, items/effects.
- `skills.mjs` готовит `skillsView.play.activeRows` и `skillsView.development.rows`.
- `character.header.hbs` уже использует prepared `identity`, `characteristics`, `resources`.
- `character.skills.hbs` уже отделяет locked/play mode от unlocked/development mode.
- `base-actor-sheet.mjs` уже содержит большинство gameplay actions: `statRoll`, `skillRoll`, `itemToggle`, `actorToggle`, `createDoc`, `viewDoc`, `deleteDoc`, inline edit.

Значит новая работа должна быть не повтором этапов `01`, а вторым visual rebase поверх текущего состояния.

## Целевая карта вкладок

| Rail tab | Источник сейчас | Что должно стать |
|---|---|---|
| `Skills` | `character.skills.hbs`, `skillsView`, `characteristics` | Полноценный skill workspace: characteristic skills + grouped skills |
| `Combat` | `character.combat.hbs`, `combatView.weapons`, часть summary | Бой без ран как основной фокус: weapons, armour/combat summary, быстрые боевые actions |
| `Health` | часть `character.combat.hbs`: hit locations, wounds, healing | Новый таб ран/лечения, сначала перенос текущей логики, потом отдельная переработка механики |
| `Items` | `character.items.hbs`, `inventoryView` | Inventory в новом visual shell |
| `Character` | `character.statistics.hbs`, часть `character.dev.hbs`, stat redistribution actions | Распределение характеристик, stat rolls/dev controls |
| `Social` | `character.social.hbs`, `character.pers.hbs` | Социальные и personality/passion данные. Если обе группы включены, использовать общий rail tab с внутренним разделением |
| `Story` | identity из `character.header.hbs`, `character.background.hbs` | Identity-поля и динамические notes/story sections |
| `Effects` | `character.effects.hbs`, `effectsView` | Текущий effects list в новом shell |
| `Dev` | `character.dev.hbs`, development settings | Служебный development tab, виден по текущей setting-логике |

Optional power tabs (`magic`, `mutations`, `psychics`, `sorcery`, `super`) нельзя потерять. Перед реализацией rail нужно выбрать UX:

- либо показывать их отдельными icon rail items только когда включены;
- либо собрать в один `Powers` rail item с внутренними sub-tabs.

Без подтверждения UX не удалять и не прятать эти части.

## Целевая структура листа

Новая разметка должна прийти к такой логике:

```text
brp sheet
  brp-refresh-shell
    brp-refresh-sidebar
      avatar
      name/subtitle
      status/resource meters
    brp-refresh-workspace
      active tab content
    brp-refresh-rail
      icon tab buttons
```

В Foundry ApplicationV2 стоит сначала проверить вариант через `PARTS.container` по примеру dnd5e:

- `sidebar` part в общем container с tab body;
- tab content parts в workspace container;
- `tabs` part с `classes: ["tabs-right"]` или BRP-аналогом.

Если container-подход окажется неудобным для трёх колонок, допустим fallback: один shell/header part, который рисует sidebar и rail, а workspace остаётся стандартным набором tab parts. Этот fallback нужно отдельно проверить, чтобы не сломать переключение tabs.

## Состояния и ресурсы sidebar

Sidebar должен строиться из prepared view model, а не напрямую из `actor.system` в шаблоне.

Рекомендуемый новый preparer:

```text
module/actor/sheets/character/prepare/statuses.mjs
```

Минимальная модель:

```js
context.statuses = [
  {
    id,
    label,
    icon,
    active,
    source,
    action,
    property,
    toggleable,
    tooltip,
    todo
  }
]
```

Маппинг MVP:

| UI status | Текущая система | Поведение MVP |
|---|---|---|
| Bleeding | `system.bleeding`, hit-location `system.bleeding` | показывать активность; toggle только там, где есть безопасный source |
| Injured | `system.injured`, hit-location `system.injured` | показывать как текущий BRP status |
| Incapacitated | `system.incapacitated`, hit-location `system.incapacitated` | показывать как текущий BRP status |
| Severed | `system.severed`, hit-location `system.severed` | показывать как текущий BRP status |
| Unconscious | `system.unconscious`, hit-location `system.unconscious` | показывать как текущий BRP status |
| Dead/Dying | `system.dead` | показывать как `Dying/Dead` |
| Minor wound | `system.minorWnd` | non-HPL mode toggle через `actorToggle` |
| Major wound | `system.majorWnd` | non-HPL mode toggle через `actorToggle` |
| Stunned | нет поля | TODO/disabled placeholder до правил |
| Prone | сейчас только текстово связано с wounds | TODO/disabled placeholder до правил |
| Grappled | нет поля | TODO/disabled placeholder до правил |

Важно: aggregate HPL-статусы сейчас вычисляются из hit locations. Не добавлять массовый toggle по aggregate icon без отдельного решения, какой hit location должен измениться.

## Тема

Новая тема должна быть default preset, а не набор inline-цветов в шаблонах.

Предлагаемый слой:

- добавить в `character-theme.mjs` concept `refresh` preset;
- подготовить CSS variables с префиксом вроде `--brp-refresh-*`;
- старые user settings продолжать применять через текущие `--brp-colour-*`, `--actor-*`;
- новый CSS сначала читает `--brp-refresh-*`, но значения preset могут быть переопределены настройками позже.

Минимальные переменные из мокапа:

```css
--brp-refresh-bg-base;
--brp-refresh-bg-card;
--brp-refresh-bg-elevated;
--brp-refresh-bg-hover;
--brp-refresh-border;
--brp-refresh-border-soft;
--brp-refresh-red;
--brp-refresh-red-bright;
--brp-refresh-mint;
--brp-refresh-mint-dim;
--brp-refresh-blue;
--brp-refresh-amber;
--brp-refresh-green;
--brp-refresh-text;
--brp-refresh-text-dim;
--brp-refresh-text-muted;
--brp-refresh-font-display;
--brp-refresh-font-body;
```

Fonts из мокапа (`Cinzel`, `Inter`) должны быть default preference/preset. Не ломать существующие custom font settings.

## Skill tab MVP

Skill tab считается готовым к использованию, когда реализованы все пункты ниже.

### 1. Characteristic skills block

Добавить prepared view model поверх `context.characteristics`:

```js
context.skillsView.characteristics = [
  {
    id,
    characteristicKey,
    title,
    value,
    valueDisplay,
    baseLabel,
    baseValue,
    formulaLabel,
    action,
    rollable,
    tooltip
  }
]
```

Источник данных:

- `prepare/characteristics.mjs` уже готовит `shortLabel`, `total`, `derivedLabel`, `derivedDisplay`, `actions.roll`.
- Не хардкодить Effort/Stamina/Idea/Luck в шаблоне, если текущие labels уже есть в system data.
- Для `SIZ` показывать damage bonus как особый derived display. Если при реализации не будет понятного roll target, оставить явный TODO и не выдумывать новую механику.

Разметка:

- блок находится в `Skills`, над обычными skills;
- не является `skillcat`;
- не collapse'ится;
- locked/play mode: карточки 4x2 или responsive grid;
- unlocked/dev mode: не обязательно дублировать, если development spreadsheet остаётся отдельным edit mode.

### 2. Skill groups из текущих `skillcat`

Сохранить `skillcat` как источник категорий.

`skillsView.play` нужно расширить от плоского `activeRows` к grouped model:

```js
context.skillsView.play.groups = [
  {
    id,
    categoryId,
    title,
    count,
    collapsed,
    rows,
    order
  }
]
```

При этом compatibility fields можно временно оставить:

- `rows`;
- `alphaRows`;
- `activeRows`;
- текущий `system.skillOrder`.

Шаблон skill tab должен постепенно перейти на `groups`, но не ломать существующие rolls.

### 3. Toolbar

Обязательные controls:

- search input;
- sort button с режимами `A-Z`, `Z-A`, `%↓`, `%↑`;
- add skill button.

Состояния:

- search query client-side, без записи в actor;
- sort mode хранить в actor flag или sheet state;
- add skill использовать существующий `createDoc` для `Item` type `skill`, если этого достаточно.

Рекомендуемые flags:

```js
flags.brp.sheet.skillSortMode
flags.brp.sheet.collapsedSkillCategories
flags.brp.sheet.skillCategoryOrder
```

Если при реализации `flags.brp.sheet` конфликтует с существующим namespace/pattern, выбрать ближайший проектный стандарт и зафиксировать в комментарии.

### 4. Search behavior

Поиск должен:

- фильтровать по основному имени skill;
- фильтровать по specialization/specName;
- раскрывать категории с совпадениями;
- скрывать категории без совпадений;
- не менять сохранённое collapse-состояние при очистке поиска.

MVP можно сделать DOM-фильтром в `_onRender`, чтобы не ререндерить лист при каждом вводе. Если сортировка и фильтр начнут конфликтовать, переносить query в локальное состояние sheet-класса.

### 5. Sort behavior

Режимы:

- `A-Z`: сначала main/base name, затем specialization;
- `Z-A`: обратный порядок;
- `%↓`: по убыванию `grandTotal`;
- `%↑`: по возрастанию `grandTotal`.

Сортировка применяется внутри каждой категории. Favorite не влияет на сортировку и не всплывает наверх.

Текущий `system.skillOrder` — бинарный category/alpha toggle. Для нового UX его нельзя использовать как единственный источник правды. План:

1. Ввести новый sort mode.
2. На первом render мигрировать старое `system.skillOrder` в default mode только для отображения.
3. Не удалять старое поле без отдельной миграции.

### 6. Skill row

Строка MVP:

```text
[drag] [name · spec · star] [exp-check] [percent]
```

Поведение:

- left click по строке или percent — `skillRoll`;
- click по имени может открыть item sheet через `viewDoc`, если roll target вынесен на percent;
- click по exp-check — `itemToggle improve`, обязательно без срабатывания roll;
- right click — context menu;
- hover — visual highlight;
- long-hover — description tooltip/popover.

Нужно аккуратно развести hit targets: строка rollable, имя/doc action, checkbox, context menu и drag handle не должны стрелять друг в друга.

### 7. Hover description

Новая обязательная интеракция: при задержке hover показывать подсказку по skill.

MVP:

- источник: `item.system.description` или текущий description field, который реально используется item sheet;
- формат: plain rendered description или безопасно подготовленный enriched HTML, если это уже принято в проекте;
- задержка: 500-800ms, точное значение выбрать при реализации;
- tooltip закрывается при mouseleave, scroll, context menu, tab change;
- длинное описание ограничить по высоте и скроллить внутри tooltip/popover.

TODO в плане реализации:

- проверить фактическое поле description у skill item;
- решить, нужны ли в подсказке формула/base/category/XP помимо description;
- решить, должен ли hover tooltip работать на touch devices.

### 8. Context menu

Пункты:

- Mark as favorite / Unmark favorite;
- Duplicate;
- Delete.

Рекомендуемые actions:

```js
skillFavorite
skillDuplicate
skillDelete
```

Favorite:

- лучше хранить как item flag `flags.brp.sheet.favorite`, потому что состояние относится к конкретному owned item;
- если выбрана actor flag map, нужно очищать stale ids при delete;
- duplicate не должен переносить favorite.

Duplicate:

- создать копию skill ниже текущего item;
- сохранить category;
- не переносить favorite;
- после создания открыть item sheet только если это принято для `createDoc`, иначе оставить в списке.

Delete:

- требовать confirmation;
- не использовать double click для context menu delete;
- после удаления закрыть меню и rerender.

### 9. Collapse categories

Collapse state:

- сохранять на actor flag;
- ключ лучше строить от `skillcat` id или BRPID, если id может меняться;
- search временно раскрывает matched categories, но не перезаписывает flag.

UI:

- chevron;
- count visible/all skills;
- drag handle появляется на hover;
- клик по header, кроме drag handle и action buttons, toggle collapse.

### 10. Drag & drop

Обязательное поведение:

- перестановка skills внутри категории;
- перенос skill между категориями;
- перестановка категорий;
- после drop порядок сохраняется.

Технический spike перед реализацией:

1. Проверить, достаточно ли Foundry `DragDrop` и `_onSortItem` для owned item sorting.
2. Если нет, подключать SortableJS локально, без CDN.
3. Для skill order выбрать источник: `item.sort`, actor flag order map или dedicated system field.
4. Для переноса между категориями обновлять `item.system.category`.

Риск: текущая сортировка строится по category/name/alpha. Если ручной порядок включён, он должен иметь приоритет только в том режиме, где пользователь явно перетаскивал строки.

## Последовательность работ

### Этап 0. Baseline и страховка

Файлы:

- `module/actor/sheets/character.mjs`
- `module/actor/sheets/character/character-tabs.mjs`
- `templates/actor/character.header.hbs`
- `templates/actor/character.skills.hbs`
- `css/brp.css`

Действия:

- зафиксировать текущие render parts и active tab behavior;
- проверить текущий locked/unlocked mode;
- проверить текущие actions: `statRoll`, `skillRoll`, `itemToggle`, `createDoc`, `viewDoc`;
- отдельно проверить optional settings: HPL/non-HPL, FP, SAN, RES5, social/pers, powers, development.

Готово, когда понятно, какие ручные проверки повторять после каждого этапа.

**Статус 2026-04-21: готово.**

Зафиксирован baseline текущей сборки:

- render parts собираются через `getCharacterParts(actor, game.settings)`;
- постоянные старые parts: `header`, `tabs`, `skills`, `combat`, `items`, затем `statistics`, `background`, `effects`;
- optional parts добавляются только по текущим setting/system условиям: `magic`, `mutations`, `psychics`, `sorcery`, `super`, `social`, `pers`, `dev`;
- active tab хранится в `tabGroups.primary`, default сейчас `combat`;
- locked/unlocked mode идёт от `system.lock`, текущий `Skills` уже разделяет play/dev layout;
- gameplay actions остаются в `base-actor-sheet.mjs`: `statRoll`, `skillRoll`, `itemToggle`, `actorToggle`, `createDoc`, `viewDoc`, `deleteDoc`;
- обязательный повторный smoke-check после этапов: открыть лист, переключить вкладки, проверить lock/unlock, avatar edit, stat roll, skill roll, improve toggle, create/view/delete item, optional tabs при включённых settings, HPL/non-HPL статусы.

### Этап 1. Target tab model и rail metadata

Файлы:

- `character-tabs.mjs`
- `actor-tab-navigation.hbs` или новый `character.rail.hbs`
- `css/brp.css`

Действия:

- расширить tab metadata: `icon`, `railLabel`, `targetGroup`, возможно `subtabs`;
- добавить новые conceptual tabs: `health`, `character`, `story`;
- сохранить optional tabs и old parts до реального split;
- подготовить rail order из мокапа;
- не менять визуал радикально, пока shell не готов.

Готово, когда context.tabs умеет описать будущий rail без потери существующих частей.

**Статус 2026-04-21: готово.**

Реализовано маленьким совместимым слоем:

- `character-tabs.mjs` получил metadata для будущего rail: `icon`, `railId`, `railLabel`, `targetGroup`, `order`;
- добавлен conceptual `health` в metadata и `CHARACTER_RAIL_ORDER`, но отдельный render part пока не включён;
- legacy tabs не переименованы: `statistics` остаётся текущим part для будущего `Character`, `background` остаётся текущим part для будущего `Story`;
- optional power tabs сохраняются отдельными parts и получают `targetGroup: powers`; решение separate vs grouped `Powers` остаётся для этапа 10;
- `actor-tab-navigation.hbs` пробрасывает rail metadata в `data-*`, чтобы будущий rail мог использовать те же prepared tabs без смены старой навигации.

### Этап 2. Theme preset для refresh

Файлы:

- `character-theme.mjs`
- `css/brp.css`
- settings files только если нужен явный selector preset.

Действия:

- добавить refresh variables;
- задать default values из мокапа;
- сохранить existing custom theme behavior;
- убрать будущие цвета из inline styles.

Готово, когда новый CSS может включаться классом/preset и не ломает старую тему.

**Статус 2026-04-21: готово.**

Добавлен безопасный foundation без смены текущего визуала:

- `character-theme.mjs` возвращает `preset: refresh` и базовые `--brp-refresh-*` variables из HTML-мокапа;
- `css/brp.css` содержит те же `--brp-refresh-*` defaults на `:root`;
- добавлены неиспользуемые пока shell primitives `.brp-refresh-shell`, `.brp-refresh-sidebar`, `.brp-refresh-workspace`, `.brp-refresh-rail`;
- существующие user theme settings продолжают писать старые `--brp-colour-*`, `--actor-*` variables и не перетираются refresh preset.

### Этап 3. Sheet shell

Файлы:

- `character.mjs`
- новый `templates/actor/character.sidebar.hbs` или переработанный `character.header.hbs`
- новый/обновлённый rail template
- `css/brp.css`

Действия:

- собрать трёхколоночную композицию;
- вынести sidebar в отдельный part или логический блок;
- workspace должен содержать только active tab content;
- rail должен работать через Foundry tab action;
- проверить независимый scroll sidebar/workspace.

Готово, когда лист визуально имеет левую постоянную панель, центральный workspace и правый rail, но основные табы ещё могут использовать старый контент.

**Статус 2026-04-21: реализовано, требуется ручной smoke-check в Foundry.**

Сделан shell prototype:

- добавлен `templates/actor/character.shell.hbs` с контейнерами `brp-refresh-sidebar`, `brp-refresh-workspace`, `brp-refresh-rail`;
- добавлен `templates/actor/character.sidebar.hbs` с аватаром, именем, подзаголовком `Profession · Age`, lock toggle, текущими статусами и ресурсами;
- `character.mjs` получил локальную `_renderRefreshContainers()`, которая раскладывает parts по контейнерам только для character sheet;
- `getCharacterParts()` теперь включает `shell`, `sidebar`, `tabs`, затем старые tab parts; legacy `header` оставлен в `PARTS`, но больше не включается в render parts;
- все tab parts получили workspace container, а navigation part — rail container;
- `context.tabs` сортируется по metadata `order`, чтобы rail не зависел от legacy-порядка parts;
- CSS оформляет три колонки, независимый scroll sidebar/workspace и правый icon rail.

Проверено кодом:

- `node --check module/actor/sheets/character.mjs`;
- `node --check module/actor/sheets/character/character-tabs.mjs`;
- `git diff --check`.

Ограничение: из текущей среды не выполнена визуальная проверка открытия листа в Foundry. Первым smoke-check в приложении проверить: лист открывается, rail переключает вкладки, lock/avatar/resource actions работают, workspace скроллится отдельно от sidebar.

### Этап 4. Sidebar data model

Файлы:

- новый `prepare/statuses.mjs`
- `prepare/resources.mjs`
- `prepare/identity.mjs`
- sidebar template

Действия:

- подготовить `context.sidebar`;
- `context.sidebar.identity`: avatar, name, subtitle `Profession · Age`;
- `context.sidebar.resources`: HP/Power крупные, Fatigue/Sanity/RES компактные;
- `context.sidebar.statuses`: merge current statuses + TODO placeholders.

Готово, когда sidebar не читает raw `system.*` напрямую кроме уже prepared fields.

**Статус 2026-04-21: готово.**

Sidebar переведён на prepared model:

- добавлен `prepare/statuses.mjs` с `context.statuses`: текущие HPL/non-HPL статусы, dead/unconscious и TODO placeholders `stunned`, `prone`, `grappled`;
- добавлен `prepare/sidebar.mjs` с `context.sidebar.identity`, `context.sidebar.resources`, `context.sidebar.statuses`, `context.sidebar.lock`;
- `character-context.mjs` готовит `statuses` и `sidebar` после `identity/resources`;
- `character.sidebar.hbs` больше не читает `system.*`, `actor.*`, `resources` напрямую для sidebar UI, кроме системного пути к BRP logo asset;
- non-HPL `minorWnd/majorWnd` остаются toggleable через существующий `actorToggle`; aggregate HPL statuses остаются display-only;
- добавлены локализации TODO-статусов в `lang/en.json`, `lang/es.json`, `lang/fr.json`;
- status strip допускает перенос строк, чтобы TODO placeholders не ломали sidebar до финального UX-решения.

Проверено кодом:

- `node --check module/actor/sheets/character.mjs`;
- `node --check module/actor/sheets/character/character-context.mjs`;
- `node --check module/actor/sheets/character/prepare/sidebar.mjs`;
- `node --check module/actor/sheets/character/prepare/statuses.mjs`;
- JSON parse для `lang/en.json`, `lang/es.json`, `lang/fr.json`;
- `git diff --check`.

### Этап 5. Split Health / Combat / Story / Character

Файлы:

- `character-tabs.mjs`
- `character.combat.hbs`
- новый `character.health.hbs`
- новый или переработанный `character.story.hbs`
- `character.statistics.hbs`
- `character.background.hbs`
- preparers `combat`, `background`, `identity`, возможно новый `health`

Действия:

- перенести wounds/hit locations/healing из Combat в Health без изменения механики;
- оставить weapons/combat summary в Combat;
- перенести identity fields из текущего header в Story;
- Story объединяет identity и динамические background sections;
- Character получает распределение характеристик и stat controls.

Готово, когда старая информация не потеряна, но находится в новой карте вкладок.

**Статус 2026-04-21: частично готово, подэтап Health/Combat split.**

Сделан безопасный перенос без изменения механики:

- добавлен render part `health` в `character.mjs`;
- `getCharacterParts()` теперь включает `health` после `combat`;
- `character.health.hbs` содержит текущие hit locations/wounds/healing actions;
- `character.combat.hbs` оставлен для weapons и non-HPL combat summary;
- все actions перенесённых блоков сохранены: `addDamage`, `viewDoc`, `viewWound`, `itemToggle`, `treatWound`, `healing`, `armourRoll`;
- `brp-health` переиспользует текущие combat visual primitives, чтобы перенос не тащил отдельный редизайн;
- `Story` и `Character` split в рамках этого этапа ещё не выполнены.

Проверено кодом:

- `node --check module/actor/sheets/character.mjs`;
- `node --check module/actor/sheets/character/character-tabs.mjs`;
- `git diff --check`.

**Статус 2026-04-21: готово для initial split Stage 5.**

Дополнительно закрыты `Story` и `Character` на уровне текущей карты вкладок:

- `background` остаётся legacy part id, но по rail metadata и заголовку работает как `Story`;
- `character.background.hbs` теперь содержит identity fields из старого header и текущие dynamic background/story sections;
- имя персонажа, аватар, lock, statuses/resources находятся в постоянном sidebar;
- `statistics` остаётся legacy part id, но по rail metadata работает как `Character` и сохраняет текущие controls распределения/редактирования характеристик;
- отдельного изменения формул, wound mechanics или stat mechanics не было.

Ограничение: это initial split по доступности данных и карте вкладок. Визуальная полировка `Story`, `Character`, `Health` остаётся будущей работой после проверки shell.

### Этап 6. Skill tab data model

Файлы:

- `prepare/skills.mjs`
- `prepare/characteristics.mjs`
- возможно `view-model/sections.mjs`

Действия:

- добавить `skillsView.characteristics`;
- добавить `skillsView.play.groups`;
- добавить sort keys для `A-Z`, `Z-A`, `%↓`, `%↑`;
- добавить favorite/collapse/order state;
- оставить compatibility fields до завершения template rewrite.

Готово, когда все данные для нового skill tab готовы без DOM-логики в шаблоне.

**Статус 2026-04-21: готово.**

Расширена модель `skillsView` без замены текущего шаблона:

- `skillsView.characteristics` строится из prepared `context.characteristics`;
- `SIZ` в characteristic skills отмечен как `todo` и не получает roll action, потому что отображает damage bonus, а не процентный roll target;
- `skillsView.play.groups` теперь содержит `rows`, `count`, `collapsed`, `order`, `title/label`, `categoryId`;
- sort modes подготовлены как `az`, `za`, `percentDesc`, `percentAsc`; сортировка применяется внутри категории;
- старое `system.skillOrder` сохранено как `legacySortMode` и продолжает управлять compatibility `activeRows`;
- новое состояние читается из `flags.brp.sheet`: `skillSortMode`, `collapsedSkillCategories`, `skillCategoryOrder`;
- skill row получил подготовленные поля `isFavorite` и `description` для будущих favorite/context menu/hover interactions;
- compatibility fields `rows`, `alphaRows`, `activeRows` сохранены.

Проверено кодом:

- `node --check module/actor/sheets/character/prepare/skills.mjs`;
- `git diff --check`.

### Этап 7. Skill tab template refresh

Файлы:

- `character.skills.hbs`
- возможно partials `character-skill-card.hbs`, `character-skill-row.hbs`, `character-skill-category.hbs`
- `css/brp.css`

Действия:

- нарисовать title `Skills` и lock indicator;
- добавить characteristic skills block;
- добавить toolbar;
- заменить текущий grid skill list на category containers;
- сохранить unlocked/development mode отдельным блоком;
- все actions должны идти через existing/new action ids.

Готово, когда skill tab визуально соответствует mockup direction и остаётся рабочим.

**Статус 2026-04-21: готово для template refresh.**

Обновлён locked/play шаблон вкладки `Skills` без переноса интерактивной логики из следующего этапа:

- `character.skills.hbs` получил refresh header с заголовком `Skills` и lock indicator;
- добавлен блок characteristic skills из `skillsView.characteristics`, с roll action для rollable характеристик и display-only карточкой для `SIZ`/damage bonus;
- добавлен toolbar с search input, sort control, create skill и skill base calculation;
- старый плоский play list заменён на category containers из `skillsView.play.groups`;
- skill rows сохраняют существующие actions: `viewDoc`, `skillRoll`, `itemToggle`, `createDoc`, `skillCalc`;
- unlocked/development mode оставлен отдельным блоком и продолжает использовать `skillsView.development`.

Проверено кодом:

- `node --check module/actor/sheets/character/prepare/skills.mjs`;
- `node --check module/actor/sheets/character.mjs`;
- `node --check module/actor/sheets/character/character-tabs.mjs`;
- `git diff --check`.

Ограничение: search/sort/collapse/favorite/context menu/hover/drag-drop interactions остаются задачами этапа 8; в этапе 7 зафиксирована готовая разметка и визуальная структура.

### Этап 8. Skill tab interactions

Файлы:

- `base-actor-sheet.mjs` или `character.mjs` для sheet-specific listeners/actions;
- возможно новый `module/actor/sheets/character/character-skill-actions.mjs`;
- `skills.mjs`;
- `css/brp.css`.

Действия:

- search input;
- sort cycle;
- collapse state;
- favorite toggle;
- duplicate;
- delete with confirmation;
- hover description;
- drag/drop.

Готово, когда skill tab можно реально использовать в игре без возврата к старому списку.

**Статус 2026-04-21: частично готово, подэтап search/sort/collapse/favorite.**

Сделан первый безопасный interaction slice поверх обновлённого шаблона:

- search input работает как локальный DOM-фильтр в `character.mjs`, без записи query в actor;
- поиск фильтрует rendered skill rows по `title/mainName/specName`, скрывает категории без совпадений и временно раскрывает collapsed категории с совпадениями;
- `skillSortCycle` циклически переключает `az`, `za`, `percentDesc`, `percentAsc` и сохраняет режим в `flags.brp.sheet.skillSortMode`;
- sort icon теперь берётся из prepared `skillsView.play.sortIcon`;
- `skillCategoryToggle` сохраняет collapse state в `flags.brp.sheet.collapsedSkillCategories`;
- `skillFavoriteToggle` сохраняет звёздочку в `flags.brp.sheet.favorite` на item;
- rows получили plain-text `descriptionText` для безопасной hover-подсказки без вставки HTML.

Проверено кодом:

- `node --check module/actor/sheets/character.mjs`;
- `node --check module/actor/sheets/character/prepare/skills.mjs`;
- `git diff --check`.

На момент этого подэтапа оставались: duplicate/delete controls с confirmation, context menu, drag/drop ordering, ручной smoke-check в Foundry.

**Статус 2026-04-21: готово кодом, требуется ручной smoke-check в Foundry.**

Закрыты оставшиеся interaction пункты Stage 8:

- добавлены row controls для duplicate/delete обычных skill rows; `skillcat` категории намеренно не получают delete/duplicate controls;
- `skillDuplicate` создаёт embedded Item-копию навыка и сохраняет текущие skill данные;
- `skillDelete` удаляет навык только после `BRPDialog.confirm`;
- добавлен context menu по skill row: view, favorite/unfavorite, duplicate, delete;
- drag/drop порядка категорий реализован отдельным category handle и сохраняет порядок в `flags.brp.sheet.skillCategoryOrder`;
- обычные skill rows остаются Foundry-draggable Item rows через существующий `data-drag`.

Проверено кодом:

- `node --check module/actor/sheets/character.mjs`;
- `node --check module/actor/sheets/character/prepare/skills.mjs`;
- JSON parse для `lang/en.json`, `lang/es.json`, `lang/fr.json`;
- `git diff --check`.

Ограничение: ручной smoke-check в Foundry ещё не выполнялся. Проверить после всего среза: search/sort/collapse/favorite, duplicate/delete confirm, context menu, category reorder, обычный drag skill item, skill roll и improve toggle.

**Smoke-fix 2026-04-21: готово кодом по первым замечаниям Skills.**

По результатам ручной проверки скиллов исправлены первые найденные проблемы:

- collapse категорий теперь сразу меняет DOM-состояние и сохраняется без полного перерендера листа;
- search больше не перебивает сохранённое `is-collapsed` состояние категории;
- favorite toggle обновляет строку и звёздочку на месте, сохраняя scroll position workspace;
- цифры ресурсов в refresh sidebar выровнены по центру и не сбиваются старым hover/line-height стилем;
- зелёная отметка `is-improving` у skill row теперь рисует полную внутреннюю рамку вокруг строки.

Проверено кодом:

- `node --check module/actor/sheets/character.mjs`;
- `git diff --check`.

**Smoke-fix 2026-04-21: готово кодом по scroll и description UX.**

Дополнительно исправлен второй набор замечаний по Skills:

- восстановление scroll position теперь ищет реальный refresh workspace через `.brp-refresh-workspace` / `data-container-id`, а не несуществующий `#brp-refresh-workspace`;
- `skillFavoriteToggle` и новый `skillImproveToggle` обновляют item без общего render sheet и восстанавливают scroll position с несколькими отложенными попытками;
- отметка exp в play skill row больше не идёт через общий `itemToggle`, потому что он вызывает `actor.render(false)` и сбрасывал scroll;
- hover-tooltip с description снят со всей строки skill;
- вместо drag-icon у обычного skill row добавлена info-кнопка, которая по клику раскрывает plain-text `descriptionText` внутри строки.

### Этап 9. Health tab preparation for future mechanics

Файлы:

- `prepare/combat.mjs`
- новый `prepare/health.mjs`, если разделение данных станет достаточно большим;
- `character.health.hbs`

Действия:

- сначала перенести текущую wounds/hit location модель;
- явно отметить TODO для новой механики ран;
- не менять расчёты damage/healing без отдельной спеки;
- sidebar statuses должны ссылаться на Health как место детализации.

Готово, когда Health tab существует как UX-место для ран, даже если механика пока старая.

**Статус 2026-04-21: готово кодом, требуется ручной smoke-check в Foundry.**

Health отделён как собственное UX-место без изменения расчётов и wound mechanics:

- добавлен `prepare/health.mjs` с `context.healthView`;
- `healthView` переиспользует текущие `combatView.hitLocations`, `combatView.wounds`, `combatView.healingActions`, чтобы не менять механику ран;
- `character.health.hbs` переведён с прямого `combatView.*` на `healthView.*`;
- в `healthView.futureMechanicsTodo` явно зафиксировано, что новая wound/hit-location mechanics должна идти только после отдельной спеки;
- statuses получили `detailTab: "health"` как место детализации;
- sidebar status icons для display-only статусов могут вести на Health через tab action, toggleable статусы сохраняют текущее поведение `actorToggle`.

Проверено кодом:

- `node --check module/actor/sheets/character/character-items.mjs`;
- `node --check module/actor/sheets/character/prepare/health.mjs`;
- `node --check module/actor/sheets/character/prepare/statuses.mjs`;
- `node --check module/actor/sheets/character.mjs`;
- `git diff --check`.

### Этап 10. Optional tabs и powers

Файлы:

- `character-tabs.mjs`
- power templates
- rail template

Действия:

- не потерять `magic/mutations/psychics/sorcery/super`;
- выбрать separate rail items или grouped `Powers`;
- проверить social/pers объединение;
- проверить development setting.

Готово, когда все optional settings по-прежнему приводят к доступному UI.

**Статус 2026-04-21: готово кодом, требуется ручной smoke-check в Foundry.**

Проверена доступность optional tabs после shell/rail refresh:

- `magic`, `mutations`, `psychics`, `sorcery`, `super` сохраняются отдельными rail items, когда соответствующие actor system fields заполнены;
- power tabs получают `targetGroup: "powers"` и не группируются в общий `Powers`, потому что отдельное UX-решение на grouped powers ещё не принималось;
- `social` показывается при `useAlleg` или `useReputation > 0`;
- `pers` показывается при `usePersTrait` или `usePassion`;
- `dev` показывается по текущей setting-логике `development`;
- `health` metadata очищена от устаревшей `pendingPart`, потому что render part уже существует.

Проверено кодом:

- `node --check module/actor/sheets/character/character-tabs.mjs`;
- `node --check module/actor/sheets/character.mjs`;
- `git diff --check`.

## Проверка после каждого этапа

Минимальный чеклист:

- лист открывается;
- active tab сохраняется;
- locked/unlocked mode работает;
- rail tab switching работает;
- avatar edit работает;
- stat roll работает;
- characteristic skill card roll работает там, где он должен быть rollable;
- skill roll работает;
- exp/improve toggle не запускает roll;
- create skill работает;
- view skill item работает;
- delete/duplicate skill работает после confirmation;
- search не ломает collapse;
- sort не ломает category grouping;
- favorite не меняет порядок;
- HPL и non-HPL статусы отображаются;
- wounds/hit locations доступны в Health;
- optional social/pers/powers/dev tabs доступны при включённых settings;
- тема refresh не ломает existing custom theme settings.

## Риски и контрольные точки

- Новый rail меняет mental model листа. Перед большой правкой нужно сделать маленький prototype shell и проверить ApplicationV2 containers.
- `Health` выделяется из Combat до новой механики ран. Важно не начать переписывать механику внутри UI-задачи.
- Мокаповые statuses не один-в-один совпадают с текущими системными полями. Нужен prepared `statusView` с TODO, а не прямые поля в шаблоне.
- `skillcat` остаётся реальной сущностью. Drag/drop категорий не должен ломать skill category modifiers.
- Search/sort/drag/favorite вводят новое UI-состояние. Хранить его в одном namespace flags и документировать.
- Hover description может потребовать enriched HTML. Не вставлять небезопасный HTML напрямую.
- Новая тема должна быть preset, иначе текущие настройки кастомизации листа станут бесполезными.

## Рекомендуемый первый implementation slice

Первый slice после утверждения плана:

1. Добавить refresh theme variables и CSS shell classes.
2. Расширить tab metadata icon/rail labels без изменения старого UI.
3. Сделать shell prototype с sidebar/workspace/rail, но старым содержимым вкладок.
4. Перенести sidebar на prepared `context.sidebar`.
5. Только после этого начинать Skill tab MVP.

Почему так:

- rail/sidebar — фундамент нового листа;
- skill tab зависит от workspace и theme;
- маленький shell prototype быстро покажет, подходит ли выбранный способ сборки Foundry parts.

## Критерий готовности `03`

План можно считать выполненным, когда:

- новый sheet shell включён и стабилен;
- `Skills` полностью соответствует MVP этого документа;
- `Health`, `Character`, `Story` существуют как отдельные места UI;
- старая BRP-логика rolls/resources/wounds/items не сломана;
- optional tabs не потеряны;
- unresolved TODO по статусам и будущей health mechanics явно видны в коде/следующей спеки.
