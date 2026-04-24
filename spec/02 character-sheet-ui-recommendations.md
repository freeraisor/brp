# Рекомендации по улучшению листа персонажа BRP

Дата фиксации: 2026-04-21

Цель документа: описать направление для будущего UI refresh листа персонажа BRP с точки зрения организации кода и отображения. Основная идея: сначала привести в порядок данные и архитектуру подготовки контекста, затем менять визуальное представление.

## Основная цель

Сделать лист персонажа BRP более современным, удобным и поддерживаемым, сохранив BRP как целевую систему.

Ориентир по стилю и UX: dnd5e-реализация в этом проекте.

Ключевая архитектурная цель: отвязать визуал от данных.

Текущая проблема не только в CSS. Сейчас лист во многом устроен как набор таблиц, а подготовка данных, display-лейблы, сортировки, UI-состояния и шаблоны тесно связаны между собой. Перед визуальным refresh стоит стабилизировать слой данных, чтобы новые шаблоны могли переиспользовать чистый и предсказуемый контекст.

## Принципы

- Двигаться по одной фиче за раз.
- Не менять визуал до тех пор, пока соответствующий участок данных не приведен к понятной структуре.
- Не переносить бизнес-логику в `.hbs`-шаблоны.
- Шаблоны должны в основном отображать уже подготовленную view model.
- Старые BRP-данные не ломать ради внешнего сходства с dnd5e.
- dnd5e использовать как источник UX-паттернов, а не как модель данных.
- Каждый нетривиальный рефакторинг должен иметь понятное практическое основание.

## Желаемое разделение слоев

Рекомендуемая цепочка:

1. Actor / Items / Settings
2. Domain preparation
3. Sheet view model
4. Templates
5. Styles and visual components
6. Actions and interactions

### Actor / Items / Settings

Это исходные данные Foundry:

- `actor.system`
- embedded `actor.items`
- `game.settings`
- flags
- active effects

Этот слой не должен знать, как именно данные будут нарисованы.

### Domain preparation

Этот слой считает BRP-значения:

- totals;
- skill category modifiers;
- weapon skill source;
- weapon damage labels;
- hit location state;
- armour state;
- improvement flags;
- optional system rules.

На этом уровне допустима BRP-логика, но не должно быть CSS-классов, layout-решений и HTML-специфики.

### Sheet view model

Этот слой готовит данные специально для листа:

- секции;
- строки списков;
- заголовки;
- краткие подписи;
- tooltip text;
- action ids;
- editability flags;
- empty states;
- display groups.

View model может знать, что листу нужны секции `skills`, `combat`, `inventory`, `identity`, но не должна быть завязана на конкретную таблицу или конкретную сетку колонок.

### Templates

Шаблоны должны:

- отображать готовые секции;
- делать простые `each` и `if`;
- не считать totals;
- не искать связанные items;
- не собирать строки вроде damage/range labels;
- не содержать длинные inline style;
- минимально знать о форме данных.

### Styles and visual components

CSS должен отвечать за внешний вид:

- cards;
- meters;
- badges;
- pills;
- list rows;
- sidebar;
- icon tabs;
- empty states;
- responsive behavior.

CSS не должен компенсировать плохую структуру данных.

### Actions and interactions

Actions должны быть стабильными и переиспользуемыми:

- roll;
- view document;
- create document;
- toggle state;
- edit value;
- restore resource;
- add wound;
- heal wound.

Разметка может менять внешний вид, но action API листа должен оставаться понятным и предсказуемым.

## Организация кода

### Текущая точка

Сейчас `module/actor/sheets/character.mjs` содержит слишком много ответственности:

- выбор частей листа;
- подготовку настроек;
- подготовку identity labels;
- подготовку story sections;
- раскладку всех items по массивам;
- сортировки;
- вычисление display-значений;
- подготовку active effects;
- wiring событий;
- установку CSS-переменных из настроек.

Это делает UI refresh рискованным: визуальное изменение быстро начинает цеплять данные, сортировки и поведение.

### Рекомендуемое направление

Разделить подготовку контекста на небольшие независимые модули.

Возможная структура:

```text
module/actor/sheets/character/
  character-sheet.mjs
  character-context.mjs
  character-tabs.mjs
  character-theme.mjs
  prepare/
    identity.mjs
    characteristics.mjs
    resources.mjs
    skills.mjs
    combat.mjs
    inventory.mjs
    powers.mjs
    social.mjs
    background.mjs
    effects.mjs
    development.mjs
  view-model/
    sections.mjs
    list-row.mjs
    list-column.mjs
```

Это не обязательные имена файлов, а целевая форма разделения ответственности.

### `character-sheet.mjs`

Должен остаться тонким orchestration-классом.

Ответственность:

- объявить Foundry sheet options;
- объявить parts;
- вызвать подготовку контекста;
- связать actions;
- делегировать сложную подготовку в отдельные функции.

### `character-context.mjs`

Должен собирать общий context листа.

Ответственность:

- взять actor/settings;
- вызвать preparers;
- вернуть готовую view model;
- не содержать HTML/CSS решений.

### `character-tabs.mjs`

Должен отвечать за вкладки.

Ответственность:

- базовый список вкладок;
- условия видимости вкладок;
- label/icon/tooltip;
- active tab;
- порядок вкладок.

Это позволит уйти от ручного смешивания `options.parts` и tab metadata внутри одного метода.

### `character-theme.mjs`

Должен отвечать за visual settings.

Ответственность:

- настройки цветов;
- настройки шрифтов;
- background image;
- CSS custom properties;
- применение темы на render.

Это отделит тему от данных персонажа.

## Подготовка данных

### Общий формат секций

Для списков стоит ввести единый формат section/list view model.

Пример целевой формы:

```js
{
  id: "weapons",
  label: "BRP.weapon",
  icon: "fas fa-sword",
  actions: [{ id: "createDoc", type: "weapon" }],
  columns: [
    { id: "chance", label: "BRP.chance", align: "center" },
    { id: "damage", label: "BRP.damage", align: "center" }
  ],
  rows: [
    {
      id: "item-id",
      documentType: "Item",
      title: "Longsword",
      subtitle: "Sword 65%",
      img: "icons/...",
      rollAction: "weaponRoll",
      cells: {
        chance: { value: 65, rollable: true },
        damage: { value: "1d8+db", rollable: true }
      },
      flags: {
        equipped: true,
        hasEffects: false
      }
    }
  ],
  empty: {
    label: "BRP.emptyWeapons"
  }
}
```

Такой формат позволит сначала привести данные к стабильной форме, а потом отображать их как таблицу, карточки или компактный список.

### Skills

Сейчас skills имеют два разных режима отображения:

- normal;
- development.

Рекомендуется подготовить две отдельные view model:

- `skills.play`
- `skills.development`

Обе должны использовать одни и те же исходные prepared skill objects.

Для каждого skill стоит заранее готовить:

- `id`;
- `name`;
- `displayName`;
- `mainName`;
- `specialismName`;
- `categoryId`;
- `categoryName`;
- `categoryBonus`;
- `base`;
- `personal`;
- `profession`;
- `culture`;
- `xp`;
- `effects`;
- `total`;
- `grandTotal`;
- `canImprove`;
- `isImproving`;
- `rollable`;
- `sortKeys`.

Шаблон не должен решать, как называется specialism и как считать grand total.

### Combat

Combat стоит разделить на несколько подготовленных секций:

- `combat.weapons`
- `combat.hitLocations`
- `combat.wounds`
- `combat.healing`
- `combat.summary`

Для weapon row заранее готовить:

- linked skill id;
- skill label;
- skill score;
- damage label;
- damage tooltip;
- range label;
- attacks;
- hands/crew;
- HP state;
- ammo state;
- power store state;
- encumbrance;
- equip status;
- available actions.

Шаблон не должен собирать `rangeName`, `dmgName`, `dbName`.

### Inventory

Inventory стоит привести к секциям:

- `inventory.armour`
- `inventory.gear`
- возможно позже `inventory.containers` или `inventory.carried`

Armour row заранее должен знать:

- является ли строка hit location summary;
- скрыта ли строка;
- hit location label;
- AP/BAP;
- energy;
- power store;
- encumbrance;
- skill modifiers;
- equip status;
- expand/collapse state.

Gear row заранее должен знать:

- quantity;
- encumbrance;
- power store;
- equip status;
- editable fields;
- display actions.

### Identity

Identity стоит вынести из header в отдельную prepared-модель:

- `identity.name`
- `identity.culture`
- `identity.profession`
- `identity.personality`
- `identity.age`
- `identity.gender`
- `identity.hand`
- `identity.height`
- `identity.weight`
- `identity.religion`
- `identity.wealth`
- `identity.move`

Для связанных Item-документов готовить единый формат:

```js
{
  label: "BRP.profession",
  value: "Warrior",
  itemId: "...",
  isLinked: true,
  canDelete: true,
  deleteAction: "deleteProfession"
}
```

### Resources

Resources стоит привести к единому формату:

```js
{
  id: "health",
  label: "Hit Points",
  value: 8,
  max: 12,
  editableValue: true,
  editableMax: false,
  meter: {
    current: 8,
    max: 12,
    percentage: 67
  },
  actions: {
    decrease: "addDamage",
    increase: "healWound"
  }
}
```

Даже если первое отображение останется прежним, такая модель позволит позже сделать meters без изменения BRP-логики.

### Powers and optional rule tabs

Magic, mutations, psychics, sorcery и super стоит приводить к одному семейству моделей:

- `powerType`;
- `label`;
- `rows`;
- `columns`;
- `createAction`;
- `rollAction`;
- `improvement`;
- `resourceCost`;
- `status`.

Это поможет не плодить отдельную визуальную логику для каждой похожей вкладки.

## Отображение

### Общий визуальный подход

BRP-лист может сохранить плотность данных, но уйти от ощущения spreadsheet UI.

Для этого dnd5e показывает полезные паттерны:

- постоянная sidebar-зона;
- крупный портрет;
- визуальные ресурсы через meters;
- важные числа через badges/lozenges;
- identity через pills/cards;
- списки через item rows с иконкой, названием и subtitle;
- подробности через collapsible areas;
- навигация через иконки и tooltips.

### Header

Текущая BRP-шапка перегружена: в ней одновременно identity, characteristics, portrait, statuses и resources.

Для будущего отображения стоит рассматривать header как место для:

- имени;
- системной роли/архетипа персонажа;
- ключевого статуса;
- кратких действий;
- возможно lock/edit mode.

Подробные identity поля могут быть вынесены в отдельную visual section или вкладку.

### Sidebar

Sidebar может стать постоянной зоной персонажа.

В него логически попадают:

- portrait;
- HP;
- Power;
- Fatigue;
- Sanity;
- Move;
- Damage bonus;
- armour summary;
- wound/status indicators;
- быстрые действия восстановления/лечения;
- избранные roll actions.

Это не значит, что все нужно делать первой задачей. Но именно sidebar может стать основой нового визуального языка листа.

### Characteristics

Характеристики можно отображать как отдельные score blocks, а не как строки таблицы.

Для BRP важно показывать:

- short label;
- total;
- derived value;
- rollability;
- optional POW improve.

Визуально это может быть ближе к dnd5e ability tabs, но с BRP-смыслом: percent-based rolls и derived stat рядом.

### Skills

Skills остаются плотным разделом, но их можно отделить от табличного ощущения.

Возможные visual primitives:

- category sections;
- compact skill rows;
- highlighted total;
- improve marker;
- roll affordance;
- development mode как отдельный edit view.

Главное отличие будущего UI: play mode не должен выглядеть как development spreadsheet.

### Combat

Combat сейчас самый табличный участок.

Его можно мыслить как набор секций:

- weapons;
- wounds;
- hit locations;
- healing;
- armour summary.

Weapons могут оставаться списком с колонками, но row должен иметь визуальную иерархию:

- weapon name as primary;
- linked skill/chance as secondary;
- damage/range as compact chips/cells;
- equip/ammo/status as icons.

### Inventory

Inventory стоит делать похожим на общий item list:

- section cards;
- rows with icon/name/subtitle;
- compact numeric columns;
- collapsible details;
- controls grouped on the right.

Это приблизит BRP к dnd5e-паттерну, не копируя dnd5e-данные.

### Background

Background уже ближе к современному подходу, потому что использует секции и `prose-mirror`.

Его можно сохранить как отдельный content-focused area.

## Порядок работ

### Фаза 1. Зафиксировать данные и контекст

Цель: не менять внешний вид существенно, но подготовить чистые view model.

Работы:

- выделить settings/context preparation;
- выделить tabs preparation;
- выделить `_prepareItems` на отдельные preparers;
- ввести единый формат list sections;
- подготовить view model для skills;
- подготовить view model для combat;
- подготовить view model для inventory;
- покрыть рискованные вычисления ручной проверкой или тестами, если в проекте появится тестовый контур.

Результат фазы: старый UI может выглядеть почти так же, но шаблоны получают более чистые данные.

### Фаза 2. Упростить шаблоны

Цель: убрать из `.hbs` вычисления и ручное ветвление, которое относится к подготовке данных.

Работы:

- заменить повторяющиеся таблицы на шаблонные partials;
- вынести common list row;
- вынести common section header;
- убрать inline style там, где это возможно;
- оставить в шаблонах только отображение view model.

Результат фазы: разметка становится проще, а будущий refresh меньше рискует сломать расчеты.

### Фаза 3. Ввести визуальные primitives

Цель: создать базовый UI toolkit внутри BRP-листа.

Возможные primitives:

- `brp-card`
- `brp-section`
- `brp-meter`
- `brp-badge`
- `brp-pill`
- `brp-score`
- `brp-item-row`
- `brp-icon-tab`

Это могут быть обычные CSS-классы и partials, не обязательно web components.

Результат фазы: появляется единый визуальный язык.

### Фаза 4. Пересобрать первый экран

Цель: изменить композицию листа без переписывания BRP-логики.

Работы:

- облегчить header;
- вынести portrait/resources/statuses в sidebar или отдельную постоянную зону;
- отобразить characteristics как score blocks;
- оставить вкладки для детальных списков.

Результат фазы: лист начинает восприниматься как новый UI, а не как перекрашенная таблица.

### Фаза 5. Обновить ключевые вкладки

Рекомендуемый порядок:

1. Skills play mode
2. Combat weapons/wounds
3. Inventory armour/gear
4. Identity/background
5. Powers tabs
6. Development mode
7. Effects

Причина такого порядка: skills/combat/inventory формируют основное ежедневное использование листа.

## Риски

- BRP имеет много optional settings, поэтому visual model должна поддерживать отсутствующие ресурсы и вкладки.
- Слишком ранний CSS refresh может закрепить старые табличные структуры.
- Копирование dnd5e-компонентов без адаптации может плохо лечь на BRP-логику.
- `_prepareItems` сейчас мутирует item/system display fields; при рефакторинге нужно аккуратно отделить derived display data от persisted actor/item data.
- Development mode для навыков требует отдельного UX, потому что он действительно похож на таблицу редактирования.

## Критерии готовности архитектурного этапа

Перед большим визуальным refresh желательно, чтобы:

- шаблоны не считали BRP totals;
- weapon labels готовились вне шаблонов;
- skills имели единую prepared-модель;
- combat/inventory были представлены как sections/rows;
- tabs готовились отдельно от render parts;
- theme settings применялись отдельно от данных персонажа;
- можно было поменять отображение одной секции без изменения расчетов другой.

## Краткий итог

Первый шаг UI refresh должен быть не в CSS, а в архитектуре данных листа.

Нужно постепенно превратить текущий `character.mjs` из большого класса, который одновременно считает данные и обслуживает UI, в тонкий sheet-класс с отдельными preparers и стабильной view model.

После этого визуальный refresh можно делать безопаснее: менять header, sidebar, skills, combat и inventory как отображение уже подготовленных данных, а не как одновременную переделку логики, шаблонов и CSS.
