# Сравнение UI листов персонажа BRP и dnd5e

Дата фиксации: 2026-04-21

Цель документа: зафиксировать текущее состояние листов персонажей BRP и dnd5e для будущего UI refresh. Документ только сравнивает существующую реализацию и не содержит предложений по переделке.

## Контекст

- Мы делаем систему BRP.
- По стилю интерфейса и набору фич ориентируемся на dnd5e-реализацию, которая лежит в проекте в папке `dnd5e`.
- Текущая проблема BRP-листа: он выглядит и ощущается слишком табличным, плотным и устаревшим.
- dnd5e-лист воспринимается более свежим за счет визуальных блоков, иконок, карточек, бейджей, meters, pills и sidebar-композиции.

## Общая структура

### BRP

BRP-лист персонажа реализован в `module/actor/sheets/character.mjs`.

Основные части:

- `header`
- `tabs`
- `skills`
- `combat`
- `items`
- опциональные вкладки `magic`, `mutations`, `psychics`, `sorcery`, `super`
- опциональные социальные вкладки `social`, `pers`
- служебные и дополнительные вкладки `statistics`, `background`, `effects`, `dev`

Порядок вкладок собирается вручную в `_configureRenderOptions`. По умолчанию активируется вкладка `combat`.

### dnd5e

dnd5e-лист персонажа реализован как `CharacterActorSheet` в `dnd5e/dnd5e.mjs`.

Основные части:

- `header`
- `sidebar`
- `details`
- `inventory`
- `features`
- `spells`
- `effects`
- `biography`
- `bastion`
- `specialTraits`
- `abilityScores`
- `tabs`

dnd5e разделяет постоянные зоны листа и содержимое вкладок. По умолчанию активируется вкладка `details`.

## Первый экран и шапка

### BRP

BRP-шапка находится в `templates/actor/character.header.hbs`.

Она построена как широкая форма из трех колонок:

- personal
- characteristics
- portrait

В этой зоне находятся:

- логотипы и lock-кнопка;
- имя;
- культура;
- возраст;
- пол;
- ведущая рука;
- рост;
- вес;
- профессия;
- личность;
- религия;
- wealth/move;
- характеристики;
- портрет;
- статусные иконки;
- ресурсы HP/Power/Fatigue/SAN/RES.

Характеристики и ресурсы визуально встроены в плотные grid-сетки.

### dnd5e

dnd5e-шапка находится в `dnd5e/templates/actors/character-header.hbs`.

Она короче и больше похожа на обложку персонажа:

- имя;
- класс;
- уровень;
- вдохновение;
- epic boons;
- кнопки отдыха;
- XP label;
- XP bar.

Большая часть боевых и жизненных показателей вынесена не в шапку, а в постоянный sidebar.

## Навигация

### BRP

Навигация находится в `templates/global/parts/actor-tab-navigation.hbs`.

Особенности:

- горизонтальная строка табов;
- видимый текст вкладок;
- uppercase-подписи;
- фон через `--brp-labelback`;
- активность задается через `tab.cssClass`.

CSS-точки:

- `.brp .sheet-tabs`
- `.brp nav.sheet-tabs .item`
- `.brp.character .sheet-tabs`

### dnd5e

Навигация находится в `dnd5e/templates/shared/sidebar-tabs.hbs`.

Особенности:

- боковая навигация;
- видимые иконки вместо текстовых табов;
- текст вкладки уходит в tooltip/aria-label;
- табы описаны в `CharacterActorSheet.TABS`;
- вкладки могут использовать Font Awesome icons или SVG.

## Характеристики и ресурсы

### BRP

Характеристики находятся прямо в `character.header.hbs`.

Формат:

- короткое имя характеристики;
- rollable total;
- optional POW improve checkbox;
- derived label;
- derived value.

CSS использует фиксированную сетку:

- `.brp .stats-grid`
- `grid-template-columns: 40px 35px 20px 10px 90px 40px`

Ресурсы HP/Power/Fatigue/SAN/RES находятся ниже основной шапки, в `.resources`.

### dnd5e

Характеристики вынесены в отдельный part `abilityScores`:

- `dnd5e/templates/actors/character-ability-scores.hbs`

Формат:

- отдельные визуальные ability tabs;
- label;
- modifier или config button;
- score;
- декоративная подложка через CSS `::before`.

CSS-точки:

- `.dnd5e2.sheet.actor.character .ability-scores`
- `.dnd5e2.sheet.actor.character .ability-scores .ability-score`
- `.dnd5e2.sheet.actor.character .ability-scores .ability-score::before`

## Sidebar

### BRP

Отдельного постоянного sidebar в BRP-листе нет.

Портрет находится в верхней шапке. Жизненные и боевые данные распределены между:

- шапкой;
- `combat`;
- `items`;
- статусными иконками;
- таблицами hit locations/wounds.

### dnd5e

Sidebar находится в `dnd5e/templates/actors/character-sidebar.hbs`.

Состав sidebar:

- collapsible card;
- portrait/token view toggle;
- AC badge;
- exhaustion pips;
- initiative/speed/proficiency lozenges;
- HP meter;
- Hit Dice meter;
- death saves tray;
- favorites.

CSS оформляет sidebar как отдельную визуальную карточку:

- `.dnd5e2.sheet.actor.character .sheet-body .sidebar`
- `.dnd5e2.sheet.actor.character .sheet-body .sidebar .card`
- `.dnd5e2.sheet.actor.character .sheet-body .sidebar .card .portrait`
- `.dnd5e2.sheet.actor.character .sheet-body .sidebar .card .stats .lozenges`
- `.dnd5e2.sheet.actor.character .sheet-body .sidebar .card .meter-group`

## Навыки

### BRP

Навыки находятся в `templates/actor/character.skills.hbs`.

Есть два режима:

1. Locked / normal layout

- компактный список;
- сортировка по категории или алфавиту;
- category headers;
- improve checkbox;
- rollable итоговый процент.

2. Unlocked / development layout

- плотная таблица;
- колонки `base`, `personality`, `profession`, `culture`, `personal`, `xp`, `effects`, `category`, `total`;
- inline editing;
- totals по profession/personal.

CSS-точка:

- `.brp .skill-listitem`

### dnd5e

Навыки и инструменты находятся во вкладке `details`:

- `dnd5e/templates/actors/tabs/character-details.hbs`

Особенности:

- skills и tools находятся в `filigree-box`;
- строки используют `proficiency-cycle`;
- есть ability abbreviation или selector;
- rollable name;
- bonus;
- config button или passive score;
- визуально это не отдельная широкая таблица, а компактный блок внутри вкладки.

## Предметы, бой и списки

### BRP

BRP разделяет боевую и вещевую вкладки.

`templates/actor/character.combat.hbs` содержит:

- таблицу оружия;
- шанс;
- урон;
- damage bonus;
- range;
- attacks;
- hands/crew;
- power store;
- HP/AP;
- encumbrance;
- ammo;
- equip status;
- hit locations или wounds;
- healing actions.

`templates/actor/character.items.hbs` содержит:

- armour table;
- gear table.

CSS использует длинные фиксированные grid-сетки:

- `.brp .weapon-tab-grid`
- `.brp .armour-tab-grid`
- `.brp .gear-tab-grid`

### dnd5e

dnd5e использует общий inventory-компонент:

- `dnd5e/templates/inventory/inventory.hbs`
- `dnd5e/templates/inventory/activity.hbs`

Этот компонент используется для:

- inventory;
- features;
- spells;
- actor inventory-like lists.

Особенности:

- currency block;
- item-list-controls;
- фильтры;
- сортировка;
- группировка;
- секции-карточки `items-section card`;
- item row;
- item icon;
- stacked title/subtitle;
- tags;
- columns;
- collapsible description;
- activities under item.

Контекст секций готовится через inventory element:

- `Inventory.prepareSections`
- `Inventory.mapColumns`
- `Inventory.unionColumns`

## Идентичность и биография

### BRP

Identity-данные частично находятся в шапке:

- culture;
- profession;
- personality;
- religion;
- wealth;
- move.

Culture/profession/personality могут быть строками или связанными Item-документами.

Background находится во вкладке:

- `templates/actor/character.background.hbs`

Формат background:

- пользовательские story sections;
- заголовок секции;
- `prose-mirror`;
- кнопки move up/down/delete;
- кнопка добавления новой секции.

### dnd5e

Identity разделен между `details` и `biography`.

`details` содержит:

- creature type;
- species;
- background;
- traits;
- senses;
- resistances;
- immunities;
- vulnerabilities;
- armor/weapon/language proficiencies.

Species/background/creature type выводятся как крупные pills с иконками и текстурами.

`biography` содержит:

- characteristics;
- ideals;
- bonds;
- flaws;
- personality traits;
- appearance;
- biography editor.

## Подготовка данных

### BRP

BRP вручную раскладывает items по массивам в `_prepareItems`:

- `gears`
- `skills`
- `skillsDev`
- `skillsAlpha`
- `hitlocs`
- `magics`
- `mutations`
- `psychics`
- `sorceries`
- `superpowers`
- `failings`
- `armours`
- `weapons`
- `wounds`
- `allegiances`
- `passions`
- `persTraits`
- `reputations`
- `improve`

В `_prepareItems` также готовятся display-значения:

- `grandTotal`;
- sorted skills;
- skill categories;
- weapon range label;
- weapon damage label;
- selected weapon skill;
- armour hit location label;
- equipped label;
- improve list.

### dnd5e

dnd5e готовит контекст по частям:

- `_prepareAbilityScoresContext`
- `_prepareBiographyContext`
- `_prepareDetailsContext`
- `_prepareFeaturesContext`
- `_prepareHeaderContext`
- `_prepareInventoryContext`
- `_prepareSidebarContext`
- `_prepareSpellsContext`

Sidebar-данные готовятся отдельно:

- portrait;
- death saves;
- exhaustion;
- favorites;
- speed.

Inventory/features/spells используют общий механизм секций и колонок.

## Визуальные паттерны

### BRP

Преобладающие паттерны:

- таблицы;
- фиксированные CSS grid columns;
- текстовые заголовки;
- inline inputs;
- компактные числовые колонки;
- горизонтальные вкладки;
- локальные списки под каждый тип сущности.

### dnd5e

Преобладающие паттерны:

- sidebar card;
- badges;
- meters;
- lozenges;
- pills;
- gold icons;
- `name-stacked`;
- `filigree-box`;
- icon tabs;
- collapsible item rows;
- common inventory sections;
- list controls;
- favorites.

## Краткий итог сравнения

BRP-лист сейчас в основном построен как форма и набор специализированных таблиц. Это дает высокую плотность данных, но делает интерфейс визуально тяжелым и табличным.

dnd5e-лист тоже использует списки и колонки, но помещает их в более богатую визуальную систему: постоянный sidebar, карточки, иконки, meters, pills, stacked names, collapsible rows, фильтры и общие list controls.

Ключевое отличие не только в CSS, а в композиции листа: BRP распределяет данные по табличным вкладкам, а dnd5e сначала формирует визуальные зоны персонажа, затем размещает в них списки и интерактивные элементы.
