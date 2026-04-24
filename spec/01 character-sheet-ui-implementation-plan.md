# План работ по UI refresh листа персонажа BRP

Дата фиксации: 2026-04-21

Этот документ описывает конкретный порядок маленьких шагов. Цель: сначала наладить данные и архитектуру листа, затем постепенно менять отображение.

## Текущий статус

Обновлено: 2026-04-21.

- Общий прогресс плана: 100%.
- Архитектурная подготовка перед visual refresh: примерно 100%.
- Выполнено: этапы 0-20.
- В работе: нет.
- Не начато: нет.
- Следующий логичный шаг: ручная проверка листа в Foundry.

## Связанные документы

- [Сравнение UI листов персонажа BRP и dnd5e](./character-sheet-ui-comparison.md)
- [Рекомендации по улучшению листа персонажа BRP](./character-sheet-ui-recommendations.md)

Перед началом каждого этапа сверяться с этими документами:

- comparison отвечает на вопрос: что сейчас есть в BRP и dnd5e;
- recommendations отвечает на вопрос: к какой архитектуре и визуальным паттернам идем;
- этот plan отвечает на вопрос: в каком порядке идти.

## Правила выполнения

- Одна задача за раз.
- Не смешивать архитектурный рефакторинг и заметный визуальный redesign в одном шаге.
- Каждый шаг должен оставлять проект в рабочем состоянии.
- По возможности сохранять текущий внешний вид до этапов визуального refresh.
- Если нужно рефакторить старый код, сначала кратко объяснять зачем.
- Не менять BRP-данные ради внешнего сходства с dnd5e.
- Не переносить логику расчетов в `.hbs`.
- Не делать крупные абстракции заранее, если следующий шаг их не использует.

## Основной маршрут

1. [x] Зафиксировать архитектурную основу листа.
2. [x] Вынести подготовку вкладок.
3. [x] Вынести настройки и тему.
4. [x] Вынести identity/resources/characteristics.
5. [x] Вынести skills.
6. [x] Вынести combat.
7. [x] Вынести inventory.
8. [x] Упростить шаблоны через view model.
9. [x] Добавить базовые visual primitives.
10. [x] Пересобрать первый экран.
11. [ ] Обновлять основные вкладки по одной.

## Этап 0. Базовая проверка перед работой [выполнено]

Цель: понять текущее состояние проекта перед первой реальной правкой.

Файлы:

- `module/actor/sheets/character.mjs`
- `module/actor/sheets/base-actor-sheet.mjs`
- `templates/actor/character.*.hbs`
- `templates/global/parts/actor-tab-navigation.hbs`
- `css/brp.css`
- `system.json`
- `template.json`

Действия:

- Проверить текущую регистрацию actor sheet.
- Проверить, какие настройки влияют на лист.
- Проверить, какие optional tabs реально включаются через settings/system fields.
- Найти, есть ли локальный способ запускать Foundry или хотя бы проверять синтаксис.

Результат:

- Понятно, как безопасно проверять изменения.
- Не сделано функциональных изменений.

## Этап 1. Выделить структуру папки character sheet [выполнено]

Цель: подготовить место для новых модулей без изменения поведения.

Создать структуру:

```text
module/actor/sheets/character/
  character-tabs.mjs
  character-theme.mjs
  character-context.mjs
  prepare/
  view-model/
```

Первый минимальный шаг:

- создать папки;
- добавить пустые или почти пустые модули только там, где они сразу будут импортированы;
- не переносить весь код сразу.

Ожидаемые изменения:

- новый каталог `module/actor/sheets/character/`;
- `character.mjs` пока почти не меняется.

Готово, когда:

- проект импортирует новые файлы без ошибок;
- поведение листа не изменилось.

## Этап 2. Вынести подготовку вкладок [выполнено]

Цель: отделить tab metadata от основного класса листа.

Текущая точка:

- `_configureRenderOptions` собирает `options.parts`;
- `_getTabs` собирает labels/tooltips/active state;
- логика optional tabs смешана с логикой render parts.

Новый файл:

- `module/actor/sheets/character/character-tabs.mjs`

Что вынести:

- базовый список вкладок;
- порядок вкладок;
- условия видимости `magic/mutations/psychics/sorcery/super/social/pers/dev`;
- label/tooltip;
- active state.

Предлагаемый API:

```js
export function getCharacterParts(actor, settings) {}
export function getCharacterTabs(parts, context, activeTab) {}
```

Ожидаемые изменения:

- `character.mjs` вызывает helper вместо ручной сборки.
- Внешний вид и порядок вкладок не меняются.

Готово, когда:

- все старые вкладки появляются при тех же условиях;
- default tab остается прежним, если не решим отдельно менять его позже;
- `character.mjs` стал меньше и понятнее.

Связанный spec:

- [Рекомендации: `character-tabs.mjs`](./character-sheet-ui-recommendations.md)

## Этап 3. Вынести настройки и тему [выполнено]

Цель: отделить visual settings от данных персонажа.

Текущая точка:

- `_prepareContext` читает много `game.settings`;
- `_onRender` применяет CSS variables, шрифты и background.

Новый файл:

- `module/actor/sheets/character/character-theme.mjs`

Что вынести:

- чтение visual settings;
- применение CSS custom properties;
- загрузку custom fonts;
- background image;
- color variables.

Предлагаемый API:

```js
export function getCharacterSheetThemeSettings() {}
export function applyCharacterSheetTheme(element, theme) {}
```

Ожидаемые изменения:

- `_prepareContext` получает готовый `context.theme` или отдельные значения;
- `_onRender` делегирует применение темы.

Готово, когда:

- настройки цвета/шрифтов/фона работают как раньше;
- логика темы не смешана с `_prepareItems`.

Связанный spec:

- [Рекомендации: `character-theme.mjs`](./character-sheet-ui-recommendations.md)

## Этап 4. Вынести общий context builder [выполнено]

Цель: сделать `character.mjs` тоньше, но еще не дробить все данные.

Новый файл:

- `module/actor/sheets/character/character-context.mjs`

Что вынести:

- сбор общей основы context;
- вызовы будущих preparers;
- настройку `tabs`;
- подготовку `rollData`;
- подготовку active effects.

Предлагаемый API:

```js
export async function prepareCharacterSheetContext(sheet, options) {}
```

На этом этапе можно оставить `_prepareItems` в старом файле, но вызывать его через временный мост.

Ожидаемые изменения:

- `BRPCharacterSheet._prepareContext` становится коротким;
- большая часть orchestration уходит в `character-context.mjs`.

Готово, когда:

- context содержит те же поля, что раньше;
- шаблоны продолжают работать без изменений;
- old UI визуально не меняется.

Связанный spec:

- [Рекомендации: желаемое разделение слоев](./character-sheet-ui-recommendations.md)

## Этап 5. Подготовить identity/resources/characteristics [выполнено]

Цель: начать отвязку шапки от raw actor fields.

Новые файлы:

- `module/actor/sheets/character/prepare/identity.mjs`
- `module/actor/sheets/character/prepare/resources.mjs`
- `module/actor/sheets/character/prepare/characteristics.mjs`

Что подготовить:

- `context.identity`
- `context.resources`
- `context.characteristics`

Важно:

- старые поля context временно оставить, чтобы не переписывать шаблон сразу;
- новые поля использовать позже при refresh шапки;
- не менять `character.header.hbs` крупно на этом этапе.

Минимальная модель identity:

```js
{
  name,
  culture,
  profession,
  personality,
  age,
  gender,
  hand,
  height,
  weight,
  religion,
  wealth,
  move
}
```

Минимальная модель resources:

```js
[
  { id, label, value, max, enabled, editable, actions, meter }
]
```

Минимальная модель characteristics:

```js
[
  { key, label, shortLabel, total, derivedLabel, derivedValue, rollable, improve }
]
```

Готово, когда:

- новые модели есть в context;
- старый header работает как раньше;
- будущий header/sidebar сможет брать данные из новых моделей.

Связанные specs:

- [Сравнение: первый экран и шапка](./character-sheet-ui-comparison.md)
- [Рекомендации: Identity](./character-sheet-ui-recommendations.md)
- [Рекомендации: Resources](./character-sheet-ui-recommendations.md)

## Этап 6. Вынести skills preparation [выполнено]

Цель: сделать skills независимой view model до визуальных изменений.

Новый файл:

- `module/actor/sheets/character/prepare/skills.mjs`

Что вынести из `_prepareItems`:

- сбор `skills`;
- сбор `skillsDev`;
- сбор `skillsAlpha`;
- skill category rows;
- `grandTotal`;
- specialism grouping;
- improve markers;
- totals `totalProf`, `totalPers`, `totalXP`;
- sort keys.

Новая модель:

```js
context.skillsView = {
  play: {
    sortMode,
    groups,
    rows
  },
  development: {
    columns,
    rows,
    totals
  }
}
```

Важно:

- старые `context.skills`, `context.skillsAlpha`, `context.skillsDev` временно оставить;
- шаблон `character.skills.hbs` пока может продолжать использовать старые поля;
- после проверки можно отдельным шагом перевести шаблон на `skillsView`.

Готово, когда:

- порядок skills совпадает со старым;
- improve flags совпадают;
- totals совпадают;
- skill rolls продолжают работать.

Связанные specs:

- [Сравнение: навыки](./character-sheet-ui-comparison.md)
- [Рекомендации: Skills](./character-sheet-ui-recommendations.md)

## Этап 7. Вынести combat preparation [выполнено]

Цель: отделить боевые display-значения от шаблонов и общего `_prepareItems`.

Новый файл:

- `module/actor/sheets/character/prepare/combat.mjs`

Что вынести:

- weapons;
- hit locations;
- wounds;
- weapon skill lookup;
- `rangeName`;
- `dmgName`;
- `damageHint`;
- `dbName`;
- `dbNameHint`;
- `skillScore`;
- `skillName`;
- healing actions metadata.

Новая модель:

```js
context.combatView = {
  weapons,
  hitLocations,
  wounds,
  summary,
  healingActions
}
```

Важно:

- этот этап зависит от skills preparation, потому что weapon skill lookup использует skills;
- старые `context.weapons`, `context.hitlocs`, `context.wounds` временно оставить.

Готово, когда:

- weapons отображаются как раньше;
- weapon roll/damage roll работают;
- hit locations/wounds работают;
- HPL и non-HPL режимы совпадают со старым поведением.

Связанные specs:

- [Сравнение: предметы, бой и списки](./character-sheet-ui-comparison.md)
- [Рекомендации: Combat](./character-sheet-ui-recommendations.md)

## Этап 8. Вынести inventory preparation [выполнено]

Цель: отделить armour/gear view data от общего `_prepareItems`.

Новый файл:

- `module/actor/sheets/character/prepare/inventory.mjs`

Что вынести:

- gears;
- armours;
- armour hit location labels;
- armour collapse/expand state;
- equip status labels;
- power store fields;
- encumbrance fields.

Новая модель:

```js
context.inventoryView = {
  armour,
  gear,
  sections
}
```

Важно:

- HPL armour behavior проверить отдельно;
- старые `context.armours`, `context.gears` временно оставить.

Готово, когда:

- armour table работает как раньше;
- gear table работает как раньше;
- equip status toggle работает;
- collapse/expand armour по hit locations работает.

Связанные specs:

- [Сравнение: предметы, бой и списки](./character-sheet-ui-comparison.md)
- [Рекомендации: Inventory](./character-sheet-ui-recommendations.md)

## Этап 9. Вынести powers/social/background/effects/development [выполнено]

Цель: завершить разбор `_prepareItems` и специальных вкладок.

Новые файлы:

- `module/actor/sheets/character/prepare/powers.mjs`
- `module/actor/sheets/character/prepare/social.mjs`
- `module/actor/sheets/character/prepare/background.mjs`
- `module/actor/sheets/character/prepare/effects.mjs`
- `module/actor/sheets/character/prepare/development.mjs`

Что вынести:

- magic;
- mutations;
- psychics;
- sorcery;
- super;
- failings;
- allegiances;
- passions;
- personality traits;
- reputations;
- improve list;
- story sections;
- active effects.

Готово, когда:

- `_prepareItems` либо исчезает, либо становится тонким compatibility wrapper;
- все вкладки работают как раньше;
- optional settings по-прежнему управляют вкладками.

Связанные specs:

- [Рекомендации: Powers and optional rule tabs](./character-sheet-ui-recommendations.md)

## Этап 10. Ввести общий формат секций и строк [выполнено]

Цель: подготовить единый слой view model для будущих шаблонов.

Новые файлы:

- `module/actor/sheets/character/view-model/sections.mjs`
- `module/actor/sheets/character/view-model/list-row.mjs`
- `module/actor/sheets/character/view-model/list-column.mjs`

Что сделать:

- описать helper для section objects;
- описать helper для row objects;
- описать helper для cell/column objects;
- применить к одной небольшой секции, например gear или wounds.

Важно:

- не переводить все списки сразу;
- выбрать один маленький список как proof of concept.

Готово, когда:

- один существующий список строится через section/row model;
- поведение не изменилось;
- стало понятно, удобно ли масштабировать подход.

Связанный spec:

- [Рекомендации: общий формат секций](./character-sheet-ui-recommendations.md)

## Этап 11. Перевести templates на view model по одному [выполнено]

Цель: убрать табличную бизнес-логику из `.hbs`, не меняя внешний вид резко.

Порядок:

1. [x] `character.items.hbs` gear section
2. [x] `character.combat.hbs` wounds/healing section
3. [x] `character.skills.hbs` play mode
4. [x] `character.combat.hbs` weapons
5. [x] `character.items.hbs` armour
6. [x] powers tabs

Что делать:

- вводить partials только когда есть повторение;
- оставлять CSS прежним, если задача не про visual refresh;
- после каждого перевода проверять actions.

Готово, когда:

- шаблоны меньше считают;
- templates работают от prepared view model;
- old UI еще узнаваем.

Связанный spec:

- [Рекомендации: Templates](./character-sheet-ui-recommendations.md)

## Этап 12. Ввести базовые visual primitives [выполнено]

Цель: создать минимальный набор UI-классов и partials перед большим refresh.

Возможные partials:

```text
templates/actor/parts/brp-section.hbs
templates/actor/parts/brp-item-row.hbs
templates/actor/parts/brp-meter.hbs
templates/actor/parts/brp-score.hbs
templates/actor/parts/brp-pill.hbs
```

Возможные CSS-классы:

- `.brp-card`
- `.brp-section`
- `.brp-meter`
- `.brp-badge`
- `.brp-pill`
- `.brp-score`
- `.brp-item-row`
- `.brp-icon-tab`

Важно:

- начать с 1-2 primitives;
- не строить UI kit целиком заранее;
- первый primitive должен сразу использоваться.

Готово, когда:

- есть минимум один переиспользуемый visual primitive;
- он используется в одном участке листа;
- стиль не конфликтует с существующим листом.

Связанный spec:

- [Рекомендации: визуальные primitives](./character-sheet-ui-recommendations.md)

## Этап 13. Пересобрать первый экран [выполнено]

Цель: первый заметный visual refresh.

Файлы:

- `templates/actor/character.header.hbs`
- возможно новый `templates/actor/character.sidebar.hbs`
- `module/actor/sheets/character.mjs`
- `module/actor/sheets/character/prepare/resources.mjs`
- `module/actor/sheets/character/prepare/characteristics.mjs`
- `css/brp.css`

Возможное новое разбиение parts:

- `header`
- `sidebar`
- `tabs`
- tab content

Что поменять:

- облегчить header;
- вынести portrait/resources/statuses в sidebar или постоянную зону;
- characteristics отобразить как score blocks;
- сохранить BRP-specific data.

Важно:

- это первая большая визуальная правка;
- делать только после того, как `identity/resources/characteristics` уже подготовлены как view model;
- не трогать skills/combat/inventory одновременно.

Готово, когда:

- первый экран перестал быть трехколоночной таблицей;
- данные совпадают со старым листом;
- основные быстрые actions работают;
- лист не ломается при optional settings.

Результат:

- `character.header.hbs` собирает первый экран из подготовленных `identity`, `characteristics` и `resources`.
- Header стал легче; portrait/statuses/resources вынесены в правую постоянную зону первого экрана.
- Characteristics отображаются как score blocks.
- Skills/combat/inventory не менялись в рамках этапа 13.

Связанные specs:

- [Сравнение: первый экран и шапка](./character-sheet-ui-comparison.md)
- [Сравнение: Sidebar](./character-sheet-ui-comparison.md)
- [Рекомендации: Header](./character-sheet-ui-recommendations.md)
- [Рекомендации: Sidebar](./character-sheet-ui-recommendations.md)
- [Рекомендации: Characteristics](./character-sheet-ui-recommendations.md)

## Этап 14. Refresh skills play mode [выполнено]

Цель: сделать ежедневный режим навыков менее табличным.

Файлы:

- `templates/actor/character.skills.hbs`
- `module/actor/sheets/character/prepare/skills.mjs`
- `css/brp.css`
- возможно `templates/actor/parts/brp-section.hbs`
- возможно `templates/actor/parts/brp-item-row.hbs`

Что поменять:

- play mode рисовать из `skillsView.play`;
- оставить development mode отдельно;
- сгруппировать skills по категориям;
- total сделать главным числом строки;
- improve marker сделать понятным визуальным состоянием.

Готово, когда:

- play mode не выглядит как development spreadsheet;
- сортировка категория/алфавит работает;
- skill rolls работают;
- development mode не сломан.

Результат:

- Play mode вкладки skills рисуется из `skillsView.play.activeRows`.
- Toolbar оставил прежние actions сортировки и пересчета базовых значений.
- Skill rows стали компактными карточными строками с главным total, marker improve и сохраненными `viewDoc`/`skillRoll` actions.
- Development mode оставлен без визуального refresh в рамках этого этапа.

Связанные specs:

- [Сравнение: навыки](./character-sheet-ui-comparison.md)
- [Рекомендации: Skills](./character-sheet-ui-recommendations.md)

## Этап 15. Refresh combat [выполнено]

Цель: сделать combat вкладку понятнее и менее похожей на широкую spreadsheet-таблицу.

Файлы:

- `templates/actor/character.combat.hbs`
- `module/actor/sheets/character/prepare/combat.mjs`
- `css/brp.css`
- visual partials, если уже есть.

Что поменять:

- weapons как item rows;
- damage/range/ammo/status как компактные cells или chips;
- wounds/hit locations как отдельные секции;
- healing actions как отдельный action group.

Готово, когда:

- weapon roll/damage roll работают;
- add wound/heal wound работают;
- HPL и non-HPL режимы работают;
- данные легче сканируются.

Результат:

- Weapons отображаются как item rows из `combatView.weapons`, с сохраненными `weaponRoll`, `damageRoll`, inline edit и equip toggle.
- HPL режим отображает hit locations отдельными строками с add wound, status toggles, armour roll и wound chips.
- Non-HPL режим отображает wounds и combat summary отдельными секциями.
- Healing actions вынесены в компактную action group из `combatView.healingActions`.

Связанные specs:

- [Сравнение: предметы, бой и списки](./character-sheet-ui-comparison.md)
- [Рекомендации: Combat](./character-sheet-ui-recommendations.md)

## Этап 16. Refresh inventory [выполнено]

Цель: привести armour/gear к более современному item-list виду.

Файлы:

- `templates/actor/character.items.hbs`
- `module/actor/sheets/character/prepare/inventory.mjs`
- `css/brp.css`
- visual partials, если уже есть.

Что поменять:

- armour section;
- gear section;
- item rows с name/subtitle/cells/actions;
- collapsible details, если будет готова модель.

Готово, когда:

- armour/gear читаются как списки предметов;
- equip status toggle работает;
- quantity inline edit работает;
- HPL armour collapse/expand работает.

Результат:

- Armour и gear вкладки рисуются как item rows из `inventoryView.armour.rows` и `inventoryView.gear.rows`.
- Сохранены `viewDoc`, create actions, equip status toggles и inline edit для quantity/PP/AP.
- HPL armour summary rows сохраняют collapse/expand через `armourToggle` и `armourLocToggle`.
- Gear rows получили компактные cells для quantity, ENC, PP store и status.

Связанные specs:

- [Сравнение: предметы, бой и списки](./character-sheet-ui-comparison.md)
- [Рекомендации: Inventory](./character-sheet-ui-recommendations.md)

## Этап 17. Refresh identity/background [выполнено]

Цель: привести identity и biography/background к более цельной структуре.

Файлы:

- `templates/actor/character.header.hbs`
- `templates/actor/character.background.hbs`
- возможно новый identity tab/partial;
- `prepare/identity.mjs`
- `prepare/background.mjs`
- `css/brp.css`

Что поменять:

- identity fields показывать через prepared model;
- связанные culture/profession/personality можно отображать как pills/cards;
- background оставить content-focused.

Готово, когда:

- identity больше не перегружает header;
- linked items явно отличаются от plain text fields;
- background sections работают как раньше.

Результат:

- Background tab рисуется из `backgroundView.sections`, сохраняя `bio-section-*` классы и существующие handlers.
- Add/move/delete story section actions сохранены через прежние классы и data-index.
- Linked culture/profession/personality в header выделены как кликабельные identity links.
- Header продолжает использовать подготовленную `identity` model без новых расчетов в шаблоне.

Связанные specs:

- [Сравнение: идентичность и биография](./character-sheet-ui-comparison.md)
- [Рекомендации: Identity](./character-sheet-ui-recommendations.md)
- [Рекомендации: Background](./character-sheet-ui-recommendations.md)

## Этап 18. Refresh powers tabs [выполнено]

Цель: унифицировать отображение magic/mutations/psychics/sorcery/super.

Файлы:

- `templates/actor/character.magic.hbs`
- `templates/actor/character.mutations.hbs`
- `templates/actor/character.psychics.hbs`
- `templates/actor/character.sorcery.hbs`
- `templates/actor/character.super.hbs`
- `prepare/powers.mjs`
- `css/brp.css`

Что поменять:

- использовать общее семейство view models;
- по возможности общий partial для power list;
- различия оставить в данных, а не в копипасте шаблонов.

Готово, когда:

- все optional power tabs работают;
- labels из settings сохраняются;
- rolls/actions работают.

Результат:

- `powersView` получил общее семейство секций/строк с `summaryCells` и `actions` для magic/mutations/psychics/sorcery/super.
- Play-режим optional power tabs переведен на единые `brp-power-*` секции, строки, actions и компактные ячейки.
- Labels из settings продолжают идти через `powersView.*.label`.
- Roll/action hooks сохранены через прежние `data-action`: `viewDoc`, `skillRoll`, `impactRoll`, `itemToggle`, `createDoc`.
- Development-layout для magic/psychics оставлен без функциональной переделки до отдельного этапа 19.

Связанный spec:

- [Рекомендации: Powers and optional rule tabs](./character-sheet-ui-recommendations.md)

## Этап 19. Development mode [выполнено]

Цель: отдельно привести режим редактирования/развития навыков.

Файлы:

- `templates/actor/character.skills.hbs`
- `templates/actor/character.dev.hbs`
- `prepare/skills.mjs`
- `prepare/development.mjs`
- `css/brp.css`

Что поменять:

- признать, что development mode может оставаться более табличным;
- сделать его визуально отдельным edit mode;
- не смешивать с play mode.

Готово, когда:

- развитие навыков удобно редактировать;
- play mode не наследует spreadsheet-подход;
- XP/improve workflows работают.

Результат:

- Skill development в unlocked mode отделен от play mode через `brp-skill-dev-*` layout.
- Development rows для skills готовятся в `skillsView.development.rows` с заранее подготовленными editable/read-only cells.
- Improve toggle доступен прямо из skill development row без возврата к play layout.
- XP improve tab переведен на `developmentView.actions` и `developmentView.improve.rows`.
- `xpRolls`, `powImprove`, `itemToggle`, `skillRoll`, `viewDoc` сохранены через прежние `data-action` hooks.

Связанные specs:

- [Рекомендации: Skills](./character-sheet-ui-recommendations.md)
- [Рекомендации: риски](./character-sheet-ui-recommendations.md)

## Этап 20. Effects [выполнено]

Цель: привести effects к общему виду секций/list rows.

Файлы:

- `templates/actor/character.effects.hbs`
- `prepare/effects.mjs`
- `css/brp.css`

Готово, когда:

- active effects читаются как список;
- source/effect/status/control actions понятны;
- текущие действия не сломаны.

Результат:

- Effects tab переведен на `effectsView.sections` с отдельными active/inactive секциями.
- Effects rows теперь явно показывают source item, effect name, amount и status.
- Source item открывается через прежний `viewDoc`/`Item` путь.
- Effect name может открыть сам `ActiveEffect` через `data-document-class="ActiveEffect"`, `data-parent-id` и `data-effect-id`.
- `BRPActiveEffectSheet.getActorEffectsFromSheet` возвращает source/effect ids, не ломая старое поле `id`.

## Проверка после каждого этапа

Минимальный чеклист:

- лист персонажа открывается;
- активная вкладка сохраняется;
- lock/edit mode работает;
- roll по характеристике работает;
- roll по skill работает;
- weapon roll работает;
- view item работает;
- create item работает там, где менялась секция;
- inline edit работает там, где менялась секция;
- optional settings не скрывают нужные данные неожиданно;
- HPL/non-HPL режимы проверены для combat/inventory этапов.

## Рекомендуемые границы первых задач

### Первая задача

Вынести tabs preparation.

Почему:

- небольшой риск;
- хорошо показывает будущий стиль рефакторинга;
- почти не трогает UI;
- сразу уменьшает `character.mjs`.

### Вторая задача

Вынести theme/settings application.

Почему:

- отделяет визуальные настройки от данных;
- подготавливает будущий visual refresh;
- не требует менять шаблоны.

### Третья задача

Подготовить identity/resources/characteristics view model.

Почему:

- это фундамент будущего первого экрана;
- можно сделать без изменения отображения;
- потом проще делать sidebar/header refresh.

### Четвертая задача

Вынести skills preparation.

Почему:

- skills важны для ежедневного использования;
- там уже есть два режима, которые стоит разделить архитектурно;
- это подготовит первый заметный refresh вкладки.

## Крупные решения, которые нужно будет отдельно подтвердить

Перед этими шагами нужно обсуждение:

- делать ли постоянный sidebar;
- какие ресурсы показывать в sidebar первыми;
- оставлять ли default tab `combat` или менять на `skills/details`;
- делать ли icon-only navigation;
- как визуально разделить play mode и development mode;
- насколько близко копировать dnd5e visual language;
- нужен ли общий item-list partial до refresh combat/inventory.

## Краткий итог

Начинаем с безопасного архитектурного слоя:

1. tabs;
2. theme;
3. context;
4. identity/resources/characteristics;
5. skills;
6. combat;
7. inventory.

После этого переходим к визуалу:

1. primitives;
2. первый экран;
3. skills;
4. combat;
5. inventory;
6. остальные вкладки.

Такой порядок позволяет не строить новый UI поверх старой связанной логики, а сначала создать чистую view model и только потом менять отображение.
