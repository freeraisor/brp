# 04 Refresh combat tab

Дата фиксации: 2026-04-21

Статус: план-предложение для реализации интерфейса Combat после refresh shell, Skills и первичного Health split. Документ описывает порядок работ и решения по UX/data model, но сам по себе не меняет поведение.

## Цель

Сделать полноценный rebase вкладки `Combat` под новый visual shell:

- сверху отдельный блок `Defense`;
- ниже список активного оружия;
- убрать из Combat health/armour summary;
- оставить текущие BRP roll-механики там, где они уже работают;
- добавить новую модель ammo/reload сразу в рамках Combat rebase;
- не тащить в Combat редактирование ран, брони и health-показателей.

Главный принцип: мокап задаёт целевой UX, но не заменяет BRP-модель один-в-один. Если в системе уже есть поле или механика, используем её вместо дублирующего нового поля.

## Источники

HTML и целевой UX:

- [BRP Combat Tab Specification](./uirefresh/brp-combat-tab-spec.md)
- [BRP Combat Tab Mockup](./uirefresh/brp-combat-tab-mockup.html)

Предыдущий refresh-план:

- [03 refresh sheet + skill tab.md](./03%20refresh%20sheet%20+%20skill%20tab.md)

Текущая реализация BRP:

- [templates/actor/character.combat.hbs](../templates/actor/character.combat.hbs) - текущий Combat template: список оружия, add weapon, rolls, inline HP/PP/ammo, equip status, non-HPL summary.
- [module/actor/sheets/character/prepare/combat.mjs](../module/actor/sheets/character/prepare/combat.mjs) - текущая подготовка `combatView`, weapon skill resolver, damage/range labels, summary.
- [module/actor/sheets/character/prepare/health.mjs](../module/actor/sheets/character/prepare/health.mjs) - текущий Health view поверх legacy combat data.
- [templates/actor/character.health.hbs](../templates/actor/character.health.hbs) - целевой дом для wounds, hit locations, healing, AP/BAP.
- [module/actor/sheets/character/character-items.mjs](../module/actor/sheets/character/character-items.mjs) - routing items через preparers.
- [module/actor/sheets/character.mjs](../module/actor/sheets/character.mjs) - sheet actions, render containers, tab context, skill interactions.
- [module/actor/sheets/base-actor-sheet.mjs](../module/actor/sheets/base-actor-sheet.mjs) - существующие actions `createDoc`, `viewDoc`, `itemToggle`, `skillRoll`, `weaponRoll`, `damageRoll`, `armourRoll`, inline edits.
- [module/apps/rollType.mjs](../module/apps/rollType.mjs) - entry points для `weaponRoll` и `damageRoll`.
- [module/apps/check.mjs](../module/apps/check.mjs) - сборка roll config для combat/quick combat/damage.
- [module/combat/combat-roll.mjs](../module/combat/combat-roll.mjs) - damage formula, range/hand dialogs, damage bonus.
- [templates/item/weapon.detail.hbs](../templates/item/weapon.detail.hbs) - текущая форма оружия.
- [module/item/sheets/weapon.mjs](../module/item/sheets/weapon.mjs) - контекст item sheet для оружия.
- [template.json](../template.json) - текущая schema/defaults оружия.
- [css/brp.css](../css/brp.css) - текущие combat/health styles.

Ориентиры dnd5e в локальной копии:

- [dnd5e/dnd5e.mjs](../dnd5e/dnd5e.mjs) - ApplicationV2 parts/container pattern.
- [dnd5e/templates/actors/character-sidebar.hbs](../dnd5e/templates/actors/character-sidebar.hbs) - persistent sidebar/resource patterns.
- [dnd5e/templates/actors/tabs/character-inventory.hbs](../dnd5e/templates/actors/tabs/character-inventory.hbs) - разделение inventory tab и actor shell.
- [dnd5e/dnd5e.css](../dnd5e/dnd5e.css) - list controls, stacked names, item list patterns.

## Подтверждённые решения

- В Combat показываем только активное оружие: `weapon.system.equipStatus === "carried"`.
- Для брони целевой активный статус остаётся `armour.system.equipStatus === "worn"`, но броня живёт в `Health`/`Items`, не в Combat.
- Не вводим отдельный `equipped` boolean для оружия. Используем существующий `equipStatus`.
- Dodge берём через существующий skill по BRPID. Не используем формулу `DEX x 2` из мокапа как источник истины.
- Если exact BRPID для Dodge не обнаруживается в данных при реализации, нужно остановиться и уточнить, а не подставлять формулу.
- Parry/Shield опираются на существующую механику оружия: `weapon.system.parry`, `weaponType`, `skill1/skill2`, текущий weapon skill resolver.
- По клику на Parry/Shield игрок выбирает, чем парировать или защищаться.
- Shield - это оружие типа `shield`, связанное со skill Shield через обычные поля оружия.
- Ammo/reload делаем как новую модель сразу в рамках Combat rebase. Отдельную миграцию старых данных не планируем.
- `majorWound`, `AP`, `BAP` не показываем в целевом Combat tab.
- `majorWound`, `AP`, `BAP`, локации, раны, лечение и броня принадлежат `Health` tab.
- Транзитный compact summary в Combat не делаем. Если playtest покажет, что переход `Combat -> Health -> Combat` мешает, compact summary можно добавить отдельным маленьким срезом.
- Add weapon пока оставляем как раньше: кнопка в Combat вызывает `createDoc` для `Item` type `weapon`.

## Не входит в этот план

- Не переписывать систему wounds/hit locations за пределами переноса ownership в `Health`.
- Не менять формулы skill totals, category bonuses, combat success levels и damage success logic.
- Не копировать мокаповую data model буквально, если текущее поле уже покрывает смысл.
- Не вводить `equipped`, `can_parry` или `applies_db` как новые поля, пока существующие `equipStatus`, `parry`, `db` покрывают задачу.
- Не делать migration script для старых weapon items.
- Не подключать CDN или SortableJS без отдельного решения. Для custom order сначала использовать native drag/drop или простой sheet-specific reorder.
- Не делать полноценный add weapon wizard. Кнопка Add сохраняет текущее поведение.
- Не менять NPC sheet в рамках первого Combat rebase, если изменение не требуется общей roll-механикой.

## Текущая точка

Combat сейчас уже отделён от большей части Health UI, но данные ещё сцеплены:

- `character.combat.hbs` рендерит weapons и non-HPL summary.
- `prepare/combat.mjs` собирает `weapons`, `hitlocs`, `wounds`, `summary`, `healingActions`.
- `prepare/health.mjs` строит `healthView` из `combatView`.
- `character.health.hbs` уже является отдельным render part и показывает HPL/non-HPL wounds/healing.

Перед полной переработкой Combat нужно аккуратно провести границу ownership:

```text
combatView
  defense
  weapons
  sort

healthView
  summary
  hitLocations
  wounds
  healingActions
  armour/armourSummary
```

Иначе при удалении summary из Combat есть риск сломать Health, потому что сейчас Health читает часть данных через `combatView`.

## Целевая структура Combat tab

```text
Combat
  title / lock indicator
  Defense
    Dodge
    Parry
    Shield
  Weapons
    header: title, sort, add
    carried weapon rows
      compact row
      collapsible details
```

В целевом Combat нет:

- major wound;
- AP/BAP;
- wounds;
- hit locations;
- armour management;
- equip status cycle.

Переключение `carried/packed/stored` остаётся в `Items`. Если оружие перестало быть `carried`, оно исчезает из Combat при следующем render.

## Целевая модель оружия

Текущие поля сохраняем как источник истины:

| Смысл | Текущее поле |
|---|---|
| активное оружие | `system.equipStatus === "carried"` |
| тип оружия | `system.weaponType` |
| skill linkage | `system.skill1`, `system.skill2` |
| skill score | resolver в `prepare/combat.mjs` |
| damage | `system.dmg1`, `system.dmg2`, `system.dmg3` |
| damage bonus | `system.db` |
| attacks | `system.att` |
| range | `system.range1`, `system.range2`, `system.range3` |
| hands | `system.hands`, `system.crew` |
| HP | `system.hp`, `system.hpCurr` |
| power store | `system.pSMax`, `system.pSCurr` |
| ammo current | `system.ammoCurr` |
| ammo capacity | `system.ammo` |
| ammo label/source | `system.ammoType` |
| count for stack/thrown | `system.quantity` |
| parry | `system.parry` |

Новые поля для ammo/sort:

```json
{
  "ammoMode": "none",
  "magazineCount": 0,
  "sortOrder": 0
}
```

Допустимые `ammoMode`:

| Mode | Используемые поля | UI |
|---|---|---|
| `none` | нет ammo fields | пустая ammo колонка |
| `count` | `quantity` | `x N`, для thrown/explosive stacks |
| `single` | `ammoCurr`, optional `ammoType` | одно число, без reload |
| `magazine` | `ammoCurr`, `ammo`, `magazineCount`, optional `ammoType` | `AMMO current / ammo`, `MAG magazineCount`, reload |

Важно:

- `system.ammo` остаётся capacity/magazine size, чтобы не ломать текущий смысл поля.
- `system.ammoCurr` остаётся current ammo.
- `system.quantity` остаётся inventory count и используется для `ammoMode: "count"`.
- `system.ammoType` можно использовать как label (`ARROWS`, `BOLTS`, `SHELLS`), если поле заполнено.
- `system.db` остаётся источником того, применяется ли damage bonus. Для UI `+DB` показывается только если `db !== "none"` и значение не пустое/нулевое.
- Для старых items без новых полей preparer должен быть null-safe, но migration script не нужен.

## Weapon type mapping

Для view model нужен нормализованный `combatKind`, потому что `weaponType` шире мокапа:

| `weaponType` | `combatKind` | Ammo default |
|---|---|---|
| `melee` | `melee` | `none` |
| `shield` | `shield` | `none` |
| `firearm` | `ranged` | `magazine` или ручной выбор |
| `energy` | `ranged` | `magazine` или `single` |
| `heavy` | `ranged` | `magazine` |
| `artillery` | `ranged` | `magazine` или `none`, по предмету |
| `missile` | `bow`/`ranged` | `single` |
| `explosive` | `thrown` | `count` |

Не надо делать этот mapping магическим источником правил. `ammoMode` должен иметь приоритет над default по типу, чтобы необычные предметы настраивались вручную.

## Defense view model

Добавить в `combatView`:

```js
combatView.defense = [
  {
    id: 'dodge',
    label,
    subtitle,
    icon,
    available,
    percent,
    skillId,
    action: 'combatDefenseRoll'
  },
  {
    id: 'parry',
    label,
    subtitle,
    icon,
    available,
    candidates,
    defaultItemId,
    action: 'combatDefenseSelect'
  },
  {
    id: 'shield',
    label,
    subtitle,
    icon,
    available,
    candidates,
    defaultItemId,
    action: 'combatDefenseSelect'
  }
]
```

### Dodge

Источник:

- найти skill item персонажа по BRPID Dodge;
- percent = `skill.system.total + actor.system.skillcategory[skill.system.category]`;
- roll через существующий `skillRoll` или новый wrapper, который передаёт `data-skill-id`.

Fallback:

- если skill не найден, card disabled;
- не использовать DEX formula;
- не создавать skill автоматически без отдельного подтверждения.

### Parry

Candidates:

```js
item.type === 'weapon'
&& item.system.equipStatus === 'carried'
&& item.system.parry
&& item.system.weaponType !== 'shield'
```

Поведение:

- клик открывает selector с кандидатами;
- выбор вызывает обычный weapon/skill roll под skill выбранного weapon;
- если кандидат один, допустимо сразу roll без selector, но это лучше оставить вторым срезом после базового selector;
- последний выбор можно сохранить в `flags.brp.sheet.lastParryWeaponId`, но это не обязательно для MVP.

### Shield

Candidates:

```js
item.type === 'weapon'
&& item.system.equipStatus === 'carried'
&& item.system.weaponType === 'shield'
```

Поведение:

- клик открывает selector щитов;
- выбор вызывает roll по skill, связанному с shield weapon;
- subtitle card: `not equipped`, если shield candidates пустой.

## Weapons view model

`combatView.weapons` должен стать list model, а не прямым отражением старых fields:

```js
{
  id,
  name,
  item,
  sourceID,
  skillName,
  skillScore,
  combatKind,
  icon,
  iconClass,
  rowClass,
  searchText,
  sort: {
    type,
    name,
    percent,
    custom
  },
  meta: {
    attacks,
    hands,
    encumbrance
  },
  damage: {
    label,
    tooltip,
    rollable,
    bonusLabel,
    showBonus
  },
  range: {
    label,
    tooltip
  },
  ammo: {
    mode,
    label,
    current,
    max,
    magazineCount,
    quantity,
    low,
    critical,
    disabled,
    emptyMessage
  },
  details: [
    { label, value, className }
  ],
  notes
}
```

Details должны включать:

- Hand;
- ENC;
- Malf, если relevant;
- HP current/max, если `hp > 0`;
- Power store current/max, если `pSMax > 0`;
- Radius для explosive;
- Parry yes/no для melee/shield;
- Notes/description в безопасном plain/enriched формате по отдельному решению.

Старый `damageRoll` не терять: damage cell остаётся rollable, если `weapon.damage.rollable`.

## Sort model

Использовать namespace, уже применённый в Skills:

```js
flags.brp.sheet.weaponSortMode
```

Значения:

- `type`
- `name`
- `percent`
- `custom`

Custom order:

```js
system.sortOrder
```

Правила:

- default sort mode: `type`;
- `type`: `ranged -> bow -> thrown -> melee -> shield`, внутри группы `sortOrder`, затем name;
- `name`: A-Z;
- `percent`: high to low;
- `custom`: только `sortOrder`, затем name;
- drag handle активен только в `custom` mode или переводит список в `custom` mode перед сохранением.

## Ammo/reload behavior

### Attack availability

Перед `weaponRoll` новый Combat handler должен проверить ammo:

| Mode | Условие roll | Расход |
|---|---|---|
| `none` | всегда | нет |
| `count` | `quantity > 0` | `quantity -= 1` |
| `single` | `ammoCurr > 0` | `ammoCurr -= 1` |
| `magazine` | `ammoCurr > 0` | `ammoCurr -= 1` |

Если ammo нет:

- не запускать roll;
- показать Foundry notification или chat action;
- row/pill получает disabled state.

Порядок расхода:

- для MVP можно списывать ammo до roll, чтобы состояние не зависело от результата;
- если playtest покажет, что расход нужен только после подтверждения quick combat card, это отдельная корректировка.

### Reload

Reload показывается только для `ammoMode === "magazine"`.

Условия:

- если `magazineCount > 0`, открыть `BRPDialog.confirm`;
- на подтверждение: `ammoCurr = ammo`, `magazineCount -= 1`;
- если `magazineCount <= 0`, без dialog создать action message `<weapon>: No magazines remaining.`;
- если `ammoCurr >= ammo`, button можно disabled или показывать confirm как harmless action. Для MVP лучше disabled.

Chat:

- использовать `ChatMessage.create()`;
- сообщение не roll;
- speaker от actor;
- content простой и локализуемый.

## Template refresh

Целевой template: [templates/actor/character.combat.hbs](../templates/actor/character.combat.hbs)

Рекомендуемая структура:

```hbs
<section class="actor tab combat {{tab.cssClass}}" data-group="primary" data-tab="combat">
  <section class="brp-combat-refresh">
    <header class="brp-refresh-tab-title">...</header>

    <section class="brp-combat-defense">...</section>

    <section class="brp-combat-weapons">
      <header>...</header>
      <ol class="brp-combat-weapon-list">...</ol>
    </section>
  </section>
</section>
```

CSS:

- новые классы лучше вести через `brp-combat-refresh-*`, чтобы не ломать `Health`, который ещё переиспользует `brp-combat-section`, `brp-hitloc-row`, `brp-wound-row`;
- не переиспользовать `.weapon`, `.modal`, `.sort-menu` из HTML-мокапа без BRP prefix;
- сохранить responsive поведение: при узкой ширине row становится vertical stack;
- не делать nested cards;
- details collapsed по умолчанию;
- expanded state не сохраняется между открытиями листа.

Мокаповые визуальные элементы, которые переносим:

- defense grid;
- percent pill;
- damage pill;
- ammo block;
- reload icon button;
- chevron details;
- sort menu;
- drag handle.

Мокаповые элементы, которые адаптируем:

- `Dodge` source меняется на skill BRPID;
- `can_parry` меняется на существующий `system.parry`;
- `equipped` меняется на `equipStatus === "carried"`;
- `applies_db` меняется на `system.db`;
- `ammo.magazine_size` меняется на `system.ammo`;
- `ammo.mag_count` меняется на `system.magazineCount`.

## Item sheet changes

Файлы:

- [templates/item/weapon.detail.hbs](../templates/item/weapon.detail.hbs)
- [module/item/sheets/weapon.mjs](../module/item/sheets/weapon.mjs)
- [module/apps/select-lists.mjs](../module/apps/select-lists.mjs)
- [lang/en.json](../lang/en.json), [lang/es.json](../lang/es.json), [lang/fr.json](../lang/fr.json)

Нужно добавить редактирование:

- `ammoMode`;
- `magazineCount`;
- `sortOrder`, если решаем показывать его в item sheet;
- возможно label/help text для `ammo`, `ammoCurr`, `ammoType`, чтобы было ясно, как они работают в каждом mode.

Для locked/player display в item sheet достаточно показывать итоговые значения.

## Этапы реализации

### Этап 0. Baseline

Файлы:

- `templates/actor/character.combat.hbs`
- `module/actor/sheets/character/prepare/combat.mjs`
- `module/actor/sheets/character/prepare/health.mjs`
- `templates/actor/character.health.hbs`
- `template.json`

Действия:

- сделать snapshot текущего поведения: какие weapons видны, как работает attack roll, damage roll, equip toggle, HP/ammo inline edit;
- проверить, что `Health` открывается и показывает summary/hit locations/wounds;
- зафиксировать, что `majorWound/AP/BAP` будут удалены из Combat только после переноса ownership в Health.

Готово, когда понятно, какие рабочие actions нельзя потерять.

### Этап 1. Health ownership cleanup

Файлы:

- `module/actor/sheets/character-items.mjs`
- `module/actor/sheets/character/prepare/combat.mjs`
- `module/actor/sheets/character/prepare/health.mjs`
- `templates/actor/character.health.hbs`
- `templates/actor/character.combat.hbs`

Действия:

- перестать строить `healthView` из `combatView`;
- вынести `hitlocs`, `wounds`, `summary`, `healingActions` в health-specific state/preparer;
- оставить `combatView` только для `defense`, `weapons`, `sort`;
- убрать non-HPL `brp-combat-summary` из `character.combat.hbs`;
- убедиться, что `Health` продолжает показывать `majorWound`, `AP/BAP`, HPL zones, wounds и healing actions.

Готово, когда Combat можно менять без риска сломать Health.

### Этап 2. Weapon data model

Файлы:

- `template.json`
- `templates/item/weapon.detail.hbs`
- `module/item/sheets/weapon.mjs`
- `module/apps/select-lists.mjs`
- `lang/*.json`

Действия:

- добавить defaults: `ammoMode`, `magazineCount`, `sortOrder`;
- добавить select options для ammo mode;
- добавить поля в weapon item sheet;
- обновить локализации;
- не писать migration script;
- в item sheet и preparer учитывать undefined на старых items.

Готово, когда новое оружие можно настроить под `none/count/single/magazine`.

### Этап 3. Combat weapon view model

Файлы:

- `module/actor/sheets/character/prepare/combat.mjs`

Действия:

- фильтровать weapons до `equipStatus === "carried"`;
- сохранить текущий resolver `skill1/skill2`;
- добавить `combatKind`, icon metadata, ammo view, details view, sort keys;
- hidden/disabled states готовить в JS, не в HBS;
- DB label показывать только когда `system.db` реально применим;
- HP/PP store перенести из main row в details model;
- damage rollability сохранить.

Готово, когда template может быть почти тупым renderer prepared data.

### Этап 4. Defense view model

Файлы:

- `module/actor/sheets/character/prepare/combat.mjs`
- возможно новый `module/actor/sheets/character/prepare/combat-defense.mjs`

Действия:

- найти Dodge skill по BRPID;
- построить Dodge card через existing skill data;
- построить Parry candidates из carried parry weapons;
- построить Shield candidates из carried shield weapons;
- подготовить disabled subtitles для отсутствующих options.

Готово, когда `combatView.defense` полностью описывает три defense cards.

### Этап 5. Combat template refresh

Файлы:

- `templates/actor/character.combat.hbs`
- `css/brp.css`

Действия:

- добавить refresh tab title;
- добавить Defense section;
- заменить старую weapon row на compact row + details;
- сохранить Add weapon action `createDoc`;
- добавить sort button/menu markup;
- добавить chevron/details markup;
- не добавлять health summary;
- не показывать equip status toggle.

Готово, когда locked Combat визуально соответствует направлению мокапа и не содержит Health summary.

### Этап 5.5. Weapon row mockup alignment

Файлы:

- `templates/actor/character.combat.hbs`
- `css/brp.css`
- `module/actor/sheets/character/prepare/combat.mjs`, только если не хватает готовых labels/classes в view model

Действия:

- привести compact weapon row к сетке мокапа: `[handle] [icon] [name+meta] [%] [damage] [range] [ammo] [chevron]`;
- сделать row плотнее: меньше высота, тоньше borders, меньше визуальный вес range/ammo/chevron;
- handle держать почти невидимым до hover, `cursor: grab`;
- meta под именем показывать как `ATK ×N`, `1H/2H`, `ENC N`, без лишнего `HAND`;
- damage cell сделать компактной красной pill: damage сверху, маленький `+DB`/secondary label снизу только когда применимо;
- range cell сделать plain text (`80 M`, `Thrown`, `Melee`), без отдельного тяжёлого bordered box;
- ammo states привести к мокапу:
  - `none`: сохраняет место в grid, но визуально пустой placeholder;
  - `count`: `× N` count-pill;
  - `single`: ammo pill с label слева (`ARROWS`, `BOLTS`, etc.) и числом справа, без `/ max` и без reload;
  - `magazine`: `AMMO current / max` + `MAG count` + reload button;
- low/critical styling применять к числу текущих ammo, а не ко всему ammo block;
- chevron сделать flat 22px control с лёгким hover и поворотом при раскрытии;
- details block выровнять под row как в мокапе: отступ от icon/name, 4 compact колонки, notes внутри details, без отдельных card-like ячеек;
- иконки weapon type можно пока оставить текущими, без отдельного добора pistol/rifle/bow/grenade/knife variants.

Готово, когда строка оружия визуально совпадает с мокапом по композиции, плотности и ammo-представлению, без изменения roll/ammo/reload поведения.

### Этап 6. Combat interactions

Файлы:

- `module/actor/sheets/character.mjs`
- возможно новый `module/actor/sheets/character/character-combat-actions.mjs`
- `module/actor/sheets/base-actor-sheet.mjs`, только если действие нужно всем sheets
- новый/существующий dialog template для выбора defense weapon

Действия:

- chevron toggle без persistence;
- sort menu open/close;
- sort mode update в `flags.brp.sheet.weaponSortMode`;
- custom drag reorder с записью `system.sortOrder`;
- `combatDefenseRoll` для Dodge;
- `combatDefenseSelect` для Parry/Shield selector;
- `combatWeaponRoll` wrapper: проверить ammo, списать ammo, вызвать existing `weaponRoll`;
- `combatWeaponReload`: confirm, update ammo, chat action;
- сохранять scroll position workspace после item updates, по образцу skill interactions.

Готово, когда вкладкой можно пользоваться в бою без возврата к старому списку.

### Этап 7. Weapon sheet polish

Файлы:

- `templates/item/weapon.detail.hbs`
- `css/brp.css`

Действия:

- визуально сгруппировать ammo fields;
- показать подсказку, что `ammo` значит capacity/magazine size;
- показать подсказку, что `magazineCount` значит запасные магазины;
- для `ammoMode: count` подсказать, что расход идёт из `quantity`;
- проверить, что GM/player locked display остаётся понятным.

Готово, когда новые ammo fields не выглядят как случайно добавленные legacy поля.

### Этап 8. Verification and smoke-check

Минимальные code checks:

- `node --check module/actor/sheets/character.mjs`
- `node --check module/actor/sheets/character/prepare/combat.mjs`
- `node --check module/actor/sheets/character/prepare/health.mjs`
- `node --check module/item/sheets/weapon.mjs`
- JSON parse для `template.json` и `lang/*.json`
- `git diff --check`

Ручной Foundry smoke-check:

- Combat открывается в locked и unlocked sheet state;
- `Health` всё ещё показывает major wound, AP/BAP, HPL zones, wounds, healing;
- Combat не показывает major wound/AP/BAP;
- Combat показывает только carried weapons;
- packed/stored weapon виден в Items, но не в Combat;
- Add weapon из Combat работает как раньше;
- Dodge roll работает через Dodge skill BRPID;
- если Dodge skill отсутствует, card disabled и не roll;
- Parry selector показывает carried parry weapons;
- Shield selector показывает carried shield weapons;
- weapon percent roll работает;
- damage cell roll работает;
- ammo `none` не мешает roll;
- ammo `count` блокирует roll при `quantity <= 0`;
- ammo `single` блокирует roll при `ammoCurr <= 0`;
- ammo `magazine` блокирует roll при `ammoCurr <= 0`;
- reload уменьшает `magazineCount` и пополняет `ammoCurr`;
- reload при `magazineCount <= 0` даёт chat/action message;
- sort modes работают;
- custom drag сохраняет порядок;
- details toggle не сохраняется после reopen;
- mobile/narrow layout не ломает текст и row controls.

## Риски

- Health сейчас частично питается от `combatView`; если сразу удалить summary из Combat без cleanup, можно сломать Health.
- Dodge BRPID может быть неочевиден в данных. Нельзя silently fallback на DEX formula.
- `weaponType` не равен мокаповому `melee/ranged/thrown/bow`; нужен нормализатор.
- Новая ammo model меняет gameplay: attack roll начнёт изменять item data. Это надо делать отдельным wrapper, чтобы не сломать общий `weaponRoll`.
- Старые items без новых fields будут встречаться. Нужны null-safe defaults без migration script.
- Drag/drop оружия может конфликтовать с Foundry item dragging. Handle должен быть узким и явно отделённым.
- Изменение старых `.brp-combat-*` стилей может задеть `Health`, потому что Health сейчас переиспользует часть этих классов.

## Рекомендуемый первый implementation slice

Первый срез после утверждения этого плана:

1. Health ownership cleanup: убрать зависимость `healthView` от `combatView`.
2. Удалить Combat summary из template.
3. Добавить weapon data model fields и item sheet controls.
4. Расширить `combatView.weapons`, но ещё рендерить старым template.

Почему так:

- сначала отделяем Health, чтобы Combat можно было спокойно переписывать;
- data model нужна до UI, иначе ammo/reload будет висеть на мокаповых значениях;
- view model поверх старого template легче проверить, чем template + logic одновременно.

## Критерий готовности `04`

План можно считать выполненным, когда:

- Combat содержит только Defense и carried Weapons;
- Health владеет major wound, AP/BAP, wounds, HPL zones, healing и бронёй;
- Dodge работает через skill BRPID;
- Parry/Shield выбирают carried weapon/shield и используют существующий skill resolver;
- weapons list поддерживает details, sort, custom order и weapon row визуально совпадает с мокапом по композиции;
- ammo modes `none/count/single/magazine` работают;
- reload публикует action chat message и обновляет item;
- old core actions `createDoc`, `weaponRoll`, `damageRoll`, `viewDoc` не потеряны;
- проверка кода и ручной smoke-check в Foundry пройдены.
