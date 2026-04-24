# BRP Character Sheet — Effects Tab Specification

Спецификация таба Effects. Содержит список всех активных модификаторов на персонаже, сгруппированных по источнику, с фильтрами, конструктором ручных эффектов и интеграцией с Foundry Active Effects.

Вкладка **GM-only** — игрок её не видит. Игрок видит только накопленные итоги в скиллах, характеристиках и derived stats.

---

## 1. Назначение и философия

### 1.1. Что такое эффект

Эффект — это активный модификатор, применяемый к полям актёра в Foundry. Может изменять:
- значение скилла (напр. `-5` к Physical skills)
- значение характеристики (`-2` к STR)
- derived stat (`-3` к MOV)
- resource pool (`+10` к HP max, `-1 HP/round` для bleeding)
- armor points
- любое другое поле системы

Эффект имеет **источник возникновения** (откуда пришёл) и **модификатор** (что и как меняет).

### 1.2. Foundry Active Effects

**Ключевое архитектурное решение:** все эффекты реализованы через стандартный механизм Foundry **Active Effects**. Это значит:

- У актёра есть коллекция `actor.effects` (в Foundry v12+ — `actor.effects` или `actor.appliedEffects`)
- Каждый effect имеет `changes[]` — массив изменений вида `{key, mode, value, priority}`
- Foundry автоматически применяет их при вычислении значений
- Система BRP уже интегрирована с этим механизмом (судя по `system.brpidFlagItems.*.skillcat.physical.system.mod` в текущем UI)
- Новый конструктор эффектов **должен использовать существующий механизм**, а не создавать параллельный

**Агент, работающий с кодом:** если найдёшь в системе кастомные расчёты скиллов которые обходят Active Effects — это баг. Эффекты должны работать через стандартный pipeline, и все cумма/расчёт должны идти через Foundry mechanism. Надо удостовериться что все пути полей (skills, characteristics, derived) покрываются через effects — так что созданный вручную эффект с `mode: ADD, value: -5` к `system.skills.physical.mod` реально срабатывает при броске скилла.

### 1.3. Доступ

- **GM-only:** таб Effects виден только GM'у. В рейле иконки таба отображается только для GM user'ов
- Игроки могут видеть применённые эффекты только через их impact (у скилла `55% (-5)` или computed через другой debug-view)
- **Toggle active** — GM может временно отключить эффект без удаления. Foundry поддерживает это поле `disabled` на ActiveEffect
- **Hidden from player** — дополнительный флаг. При `hidden: true` эффект не отображается в status bar токена (стандартный иконочный ряд Foundry), не виден в token HUD
  - В Foundry это реализуется через `effect.flags.brp-sheet.hidden = true`
  - В рендере token status icons — фильтр пропускает hidden эффекты
  - Для player персонажей — UI таба просто не виден, но если бы был, hidden ещё раз фильтровались из отображения

---

## 2. Источники эффектов (группировка)

Эффекты группируются по типу источника:

| Group | Source type | Описание |
|---|---|---|
| **From items** | `items` | Автоматически применяются при equip/carry предмета (weapon, armor, tool, magic item). Реализуется через Foundry item transfer |
| **From status conditions** | `status` | Stunned, bleeding, prone, unconscious, grappled, etc. Статус-эффекты которые отражаются в sidebar'е status icons |
| **From wounds** | `wounds` | Привязаны к конкретной ране (§Health tab). Например, MOV -3 пока нога в статусе disabled |
| **From magic / powers** | `magic` | От заклинаний, спеллов, superpower'ов. Обычно временные с таймером или условием |
| **From injuries (permanent)** | `injuries` | Последствия Major Wound (RAW p. 135). Перманентная потеря характеристики |
| **Manual / GM-applied** | `manual` | Созданные вручную через конструктор. Narrative эффекты, plot devices, debug |

### 2.1. Как определять source_type

Для Foundry Active Effects — через `effect.origin` (uuid origin документа) и флаги:

- `effect.origin` содержит `Item.XXX` → `items` (дополнительно проверить `item.type` для деталей — armor/weapon/tool)
- `effect.origin` содержит `Item.XXX` и `item.type === 'wound'` → `wounds`
- `effect.statuses` (стандартный Foundry массив status IDs) непустой → `status`
- `effect.origin` указывает на spell/power item → `magic`
- Custom flag `effect.flags.brp-sheet.category === 'injuries'` → `injuries`
- Остальные без origin → `manual`

Рекомендуется ввести `effect.flags.brp-sheet.source_type` для явного указания при создании через конструктор — это избавит от heuristics при отображении.

### 2.2. UI группы

- Collapsible section на каждый непустой тип группы
- Header с иконкой типа, заголовком, counter
- Пустые группы не отображаются
- Порядок секций фиксирован как в таблице выше

---

## 3. Фильтры

Toolbar над списком эффектов с filter-chips:

| Chip | Filter |
|---|---|
| **All** | все эффекты (включая disabled и hidden) |
| **Active only** | `effect.disabled === false` |
| **Temporary** | `duration === 'timed'` (те что надо вручную снять) |
| **Hidden from player** | `effect.flags.brp-sheet.hidden === true` |

Chip'ы — single-select (один активен за раз). Counter на chip'е показывает количество эффектов под этот фильтр.

Состояние активного фильтра сохраняется в `actor.flags.brp-sheet.effects.filter`.

---

## 4. Duration (длительность)

Три типа длительности:

### 4.1. Permanent

Действует до ручного удаления. Используется для:
- Major Wound permanent injuries (`-1 CHA` после шрама)
- Long-term boons/curses
- GM narrative эффектов

Foundry ActiveEffect `duration.type === 'none'`.

### 4.2. Timed

Ограничен по времени. **В этой итерации таймер не автоматический** — это пометка для GM что эффект временный и его **надо будет снять руками**.

Поля:
- `flags.brp-sheet.timer_note` — текстовая заметка ("3 rounds", "until end of scene", "1 day")

**Backlog:** интеграция с Combat Tracker / Time of Foundry для автоматического decrement и remove при истечении. Это отдельная задача, требующая интеграции с round-based combat system.

### 4.3. Conditional

Связан с активностью source объекта. Работает пока source активен/надет/carried:
- Броня: эффект работает пока `item.carried && item.equipped`
- Статус: пока status active
- Wound: пока `wound.damage_remaining > 0`

Реализуется через **Foundry item transfer mechanism**: при `equipped/carried = true` эффект автоматически появляется у актёра, при `false` — исчезает.

Для статусов: при добавлении status effect через `token.toggleEffect()` автоматически добавляется на актёра, при удалении — исчезает.

### 4.4. Визуализация

Duration badge на карточке эффекта:

- Permanent — нейтральный цвет, иконка замка
- Timed — amber, иконка таймера, рядом текстовая заметка
- Conditional — мятный, иконка звена цепи

---

## 5. Состав эффекта (модель данных)

Стандартный Foundry ActiveEffect + custom flags:

```json
{
  "_id": "effectId",
  "name": "Combat helmet: Perception -5",
  "icon": "icons/equipment/head/helmet-barbute-iron.webp",
  "description": "Heavy helmet restricts peripheral vision.",
  "origin": "Actor.a1.Item.a1",
  "disabled": false,
  "statuses": [],
  "duration": {
    "type": "none"
  },
  "changes": [
    {
      "key": "system.skills.perception.mod",
      "mode": 2,
      "value": "-5",
      "priority": 20
    }
  ],
  "flags": {
    "brp-sheet": {
      "source_type": "items",
      "source_display_name": "Combat helmet",
      "source_link": "item:a1",
      "target_category": "Skill category",
      "target_display_name": "Perception",
      "duration_type": "conditional",
      "timer_note": null,
      "hidden": false
    }
  }
}
```

### 5.1. Critical fields (Foundry-стандарт)

- `name` — имя эффекта
- `icon` — путь к иконке (для token status icons и сайта)
- `description` — текст описания
- `disabled` — boolean, выключен ли эффект (toggle active)
- `origin` — UUID источника (item, token, etc.)
- `statuses` — массив status IDs (для статусных эффектов)
- `duration` — объект с `type`, `rounds`, `seconds` (Foundry auto-timer)
- `changes` — массив изменений

### 5.2. Changes entry

```json
{
  "key": "system.skills.perception.mod",
  "mode": 2,
  "value": "-5",
  "priority": 20
}
```

- `key` — dot-path к полю актёра
- `mode` — число (0=CUSTOM, 1=MULTIPLY, 2=ADD, 3=DOWNGRADE, 4=UPGRADE, 5=OVERRIDE)
- `value` — строковое значение
- `priority` — порядок применения (по умолчанию `mode * 10`)

**Один эффект может иметь несколько changes.** Например, спелл "Heroic" может одновременно давать `+10 STR mod` и `+5 combat skills mod` — два changes в одном effect.

В мокапе для простоты — один change на эффект. Backend должен поддерживать массив.

### 5.3. Custom flags (`flags.brp-sheet`)

Для UI и отображения:

- `source_type` — явная метка группы (`items` / `status` / `wounds` / `magic` / `injuries` / `manual`)
- `source_display_name` — человекочитаемое имя источника (для когда origin link orphan'ится)
- `source_link` — кликабельная ссылка в UI (`item:id`, `wound:id`, `status:id`, etc.)
- `target_category` — категория таргета для display (`Skill category` / `Specific skill` / `Characteristic` / `Derived` / `Armor` / `Resource` / `Other`)
- `target_display_name` — человекочитаемое имя цели (`Perception`, `STR`, `MOV`)
- `duration_type` — `permanent` / `timed` / `conditional` (отдельно от Foundry `duration.type` для упрощения)
- `timer_note` — текстовая пометка для timed
- `hidden` — bool, скрыт ли от игрока

Эти флаги — для **отображения и группировки**. Само применение эффекта — через стандартный Foundry mechanism (`changes[]`).

---

## 6. Целевой picker (target selection)

В конструкторе эффектов — две модели выбора цели:

### 6.1. Simple mode (дефолт)

Два связанных dropdown:

**Category → Target:**

| Category | Target options |
|---|---|
| Skill category | Physical, Mental, Communication, Perception, Combat, All skills |
| Specific skill | Список всех скиллов персонажа (First Aid, Medicine, Dodge, Pilot, etc.) |
| Characteristic | STR, CON, INT, SIZ, POW, DEX, CHA, EDU |
| Derived | MOV, Damage Mod, XP Bonus, Total ENC, HP Bonus, PP Bonus, FP Bonus |
| Armor | All locations, Head, Chest, Abdomen, Arms, Legs |
| Resource | HP max, HP current, PP max, FP max, Sanity max, HP per round, PP per round |
| Other | (переключает в advanced mode) |

Backend должен поддерживать mapping `(category, target_name) → attribute_path`. Например:
- `Skill category: Physical` → `system.skills.physical.mod`
- `Characteristic: STR` → `system.characteristics.str.total`
- `Derived: MOV` → `system.derived.mov`
- `Resource: HP max` → `system.resources.hp.max`

**Список скиллов для Specific skill:** подтягивается из `actor.items.filter(i => i.type === 'skill')` или `actor.system.skills` в зависимости от реализации. Dropdown должен обновляться динамически.

### 6.2. Advanced mode

Текстовое поле для raw attribute path. Используется для:
- Нестандартных полей, не покрытых picker'ом
- Полей от модов/расширений
- Технических флагов системы

Пример: `system.flags.brpid.custom.combatStance.value`

UI toggle `Advanced mode` рядом с заголовком блока Target & modifier. При включении — скрывает category/target dropdown'ы, показывает текстовое поле.

### 6.3. Mapping implementation

Бэкенд нужно иметь функцию `resolveTargetPath(category, target_name) → string`. При создании эффекта через конструктор:

1. UI пишет `target_category` и `target_display_name` в flags
2. `resolveTargetPath` даёт `key` для `changes[0].key`
3. При редактировании — обратное resolve из `key` в category+name (если возможно)

Если `category === 'Other'` — сохраняется только raw path, UI при render показывает raw key как target name.

---

## 7. Modifier modes

Foundry предоставляет 6 modes для ActiveEffect change:

| Mode | ID | Описание |
|---|---|---|
| CUSTOM | 0 | Кастомный hook — редко используется |
| MULTIPLY | 1 | `value *= N` |
| ADD | 2 | `value += N` (самый частый) |
| DOWNGRADE | 3 | `value = min(value, N)` |
| UPGRADE | 4 | `value = max(value, N)` |
| OVERRIDE | 5 | `value = N` |

В UI:
- **Add** — дефолт, 90% случаев (+/- N к скиллу)
- **Multiply** — редко (×2 damage от berserk)
- **Override** — "set to" (при некоторых статусах фиксирующих значение)
- **Upgrade / Downgrade** — "не меньше/не больше N"

CUSTOM в UI не предлагается — только через код при необходимости.

### 7.1. Priority

Priority определяет порядок применения. Foundry default: `mode * 10`.

Если у одного target есть несколько эффектов — высокий priority применяется позже (т.е. "поверх" остальных). Важно для:
- OVERRIDE с высоким priority "перебивает" ADD
- Стек ADD'ов применяется в порядке priority, результат один и тот же
- UPGRADE/DOWNGRADE может зависеть от порядка

В UI в конструкторе — поле `priority` с дефолтом `20` (соответствует ADD). GM может изменить для редких случаев. Валидация не делается — даже одинаковые priorities работают.

---

## 8. UI — структура карточки эффекта

```
┌──────────────────────────────────────────────────────────────────────┐
│  [icon]  Effect name                Target badge    Mod     [⏱] [⚙][⋯]│
│          Source: link · timer note                                    │
└──────────────────────────────────────────────────────────────────────┘
```

Grid layout (6 колонок):
1. **Icon** — 28px, цвет по source_type
2. **Name + source** block — имя эффекта + строка с источником (кликабельный link на source object)
3. **Target badge** — `Category` (мелко) над `Target name`
4. **Mod badge** — mode label + value (цвет: red для negative, mint для positive)
5. **Duration badge** — тип длительности с иконкой + `timer_note` если есть
6. **Actions** — toggle active switch + menu button

### 8.1. States карточки

- **Active normal** — обычный рендер
- **Inactive** (`disabled: true`) — opacity 45%
- **Hidden from player** — dashed border + фиолетовый фон tint + badge `Hidden`

### 8.2. Interactions

- **Toggle active button** — immediate toggle `effect.disabled`, rerender
- **Double click** — open edit modal
- **Right click / Menu button** — context menu:
  - Edit effect
  - Hide/Unhide from player
  - Duplicate
  - Open source (если есть source_link)
  - Remove effect
- **Source link click** — открывает source object (item sheet, wound detail, status info)

---

## 9. Конструктор эффектов (modal)

Открывается кнопкой `+ New Effect` в toolbar или action Edit на существующем.

### 9.1. Разделы modal

**Identification:**
- Name (required)
- Icon path (optional)
- Description

**Target & modifier:**
- Advanced mode toggle
- Simple: Category dropdown → Target dropdown
- Advanced: raw path input
- Mode dropdown
- Value input
- Priority input
- Preview (live) — показывает итоговую формулу

**Duration:**
- Type dropdown (permanent / timed / conditional)
- Timer note (показывается только для timed)

**Visibility:**
- Hidden from player (checkbox)
- Active (checkbox)

### 9.2. Preview

Live-обновляемая строка с форматом:
```
<target category: target name> <mod value> (<mode>)
```

Пример: `Skill category: Physical −5 (ADD)`

### 9.3. Save

- При `New` — создаёт новый ActiveEffect на актёре с `origin = actor.uuid` и `flags.brp-sheet.source_type = 'manual'`
- При `Edit` — обновляет существующий

**Изменение target через edit:**
- Пересчитывается `changes[0].key` через `resolveTargetPath`
- Старые значения `target_category` / `target_display_name` перезаписываются

### 9.4. Новый эффект vs импорт из compendium

В этой итерации — только ручное создание через конструктор. На будущее — compendium готовых эффектов (стандартные debuff'ы для status conditions) с одним кликом применения.

---

## 10. Status conditions — отдельная механика

Status conditions (bleeding, stunned, prone, etc.) — это комбинация:
1. **Icon в status bar** токена/sidebar (стандартный Foundry visual)
2. **ActiveEffect на актёре** с соответствующими changes

В BRP system уже должна быть регистрация базовых status effects (`CONFIG.statusEffects`). Когда GM нажимает status icon в token HUD — применяется связанный ActiveEffect.

В таб Effects такие status-based эффекты отображаются в группе `From status conditions`. Source link может вести на описание условия в journal / compendium.

**Для Story tab / Journal** — при триггере status эффекта опционально создавать journal entry (`npc-encounter` или `decision` типа). Это на будущее.

---

## 11. Интеграция с Skills расчётом

Текущая система уже считает скиллы с учётом эффектов (видно из `system.brpidFlagItems.*.skillcat.*.system.mod` в UI старого эффекта). Проверить что:

- Скиллы при rolling учитывают `skill.mod` из ActiveEffect
- UI Skills tab показывает current % с учётом mod'ов
- Characteristic rolls учитывают `characteristic.mod` из ActiveEffect
- Derived stats (Damage Mod, MOV) пересчитываются при изменении базовых характеристик через effects

**Если в системе есть кастомная логика расчёта скиллов/характеристик — агенту нужно проверить что она совместима с новым конструктором эффектов.** То есть эффект с `key: system.skills.X.mod, mode: ADD, value: -5`, созданный через конструктор, должен применяться так же как эффект от брони.

---

## 12. Интеракции — сводная таблица

| Элемент | Действие | Эффект |
|---|---|---|
| Filter chip | click | сменить filter mode, перерендер |
| Group header | click | expand/collapse группа |
| Effect card | double click | open edit modal |
| Effect card | right click | context menu |
| Toggle switch | click | toggle `effect.disabled` |
| Source link | click | open source object |
| `+ New Effect` button | click | open create modal |
| Menu button | click | context menu |
| Category dropdown change | | обновить options в Target dropdown |
| Duration type change | | show/hide timer note field |
| Advanced toggle | click | swap simple/advanced target picker |
| Save effect | click | create/update ActiveEffect on actor |

---

## 13. Модель данных — итоговая

### 13.1. Actor-level

Эффекты хранятся в стандартной Foundry коллекции `actor.effects`. Никакого отдельного хранилища не требуется.

### 13.2. ActiveEffect object

```json
{
  "_id": "...",
  "name": "...",
  "icon": "...",
  "description": "...",
  "origin": "Actor.X.Item.Y",
  "disabled": false,
  "statuses": [],
  "duration": { "type": "none" },
  "changes": [{ "key": "...", "mode": 2, "value": "-5", "priority": 20 }],
  "flags": {
    "brp-sheet": {
      "source_type": "items|status|wounds|magic|injuries|manual",
      "source_display_name": "...",
      "source_link": "item:uuid",
      "target_category": "Skill category|Specific skill|Characteristic|Derived|Armor|Resource|Other",
      "target_display_name": "...",
      "duration_type": "permanent|timed|conditional",
      "timer_note": "...",
      "hidden": false
    }
  }
}
```

### 13.3. Filter state

```json
{
  "actor.flags.brp-sheet.effects.filter": "all|active-only|temporary|hidden"
}
```

---

## 14. Бэкенд-задачи

1. **Регистрация GM-only permissions** для таба Effects (иконка в rail только для GM; role check при рендере)
2. **Source type detection** — функция `detectSourceType(effect) → string`. Использует origin, item.type, statuses, custom flags
3. **`resolveTargetPath(category, target_name) → string`** — мапинг из picker выбора в Foundry attribute path
4. **`reverseTargetPath(key) → {category, target_name}`** — обратный мапинг для edit mode
5. **Dynamic skill list** — подтягивать список скиллов актёра для Specific skill dropdown
6. **`createEffectFromBuilder(actor, formData)`** — создание нового ActiveEffect через стандартный Foundry API (`actor.createEmbeddedDocuments('ActiveEffect', [data])`)
7. **`updateEffectFromBuilder(effect, formData)`** — update существующего
8. **Toggle active** — `effect.update({disabled: !effect.disabled})`
9. **Toggle hidden** — `effect.update({flags.brp-sheet.hidden: ...})`
10. **Hidden filter in token status icons** — hook в render token HUD/status, фильтрация hidden effects
11. **Player visibility check** — role check при рендере таба; фильтрация hidden для игрока даже если каким-то образом открыт
12. **Effect card rendering** с учётом всех флагов
13. **Backwards compatibility** — миграция существующих эффектов (`system.brpidFlagItems.*`) в новую схему с flags. Автомиграция при открытии таба или одноразово через world setup
14. **Проверка что skill / characteristic / derived рассчёты используют Foundry Active Effects pipeline** — не обходят через кастомную логику

---

## 15. Backlog (на будущее)

Эти задачи не входят в текущую итерацию, но должны быть учтены в архитектуре:

1. **Automatic timer countdown** — интеграция с Combat Tracker / Game Time. Duration `rounds` / `seconds` / `turns`. Auto-disable/remove при истечении. Требует hook'ов на world time advance и combat turn change.

2. **Impact debug view** — отдельный блок "Computed modifiers" показывающий кумулятивный impact по скиллам и характеристикам. GM-only. Пример:
   - `Perception: -5 (armor) + -10 (stunned) = -15`
   - `First Aid: +20 (medkit) + +10 (training) = +30`
   - `STR: -2 (injury) + +1 (buff) = -1`

3. **Effect compendium** — готовые эффекты для частых статусов (bleeding, poisoned, fatigued, drunk). Одним кликом применение с дефолтными параметрами.

4. **Conditional rules** — усложнённые эффекты вида "только когда HP < 25%" или "только ночью". Требует expression engine.

5. **Effect chains** — цепочки эффектов, где один триггерит другой. Например, "когда выпил зелье → получаешь buff на 5 раундов → когда buff истекает → penalty на 1 раунд".

6. **Visual effect application** — анимация при применении/снятии эффекта на токене (particle effects, etc.).

7. **Player view of own effects** — опциональный режим, когда игрок видит свои эффекты (без hidden) в read-only. Сейчас игрок не видит таб вовсе.

---

## 16. Что НЕ входит в мокап

- Полная реализация таймеров (timer_note только текстовый)
- Compendium готовых эффектов
- Impact debug view (computed modifiers по скиллам)
- Миграция старых эффектов (`system.brpidFlagItems.*` → новая схема)
- Expression engine для conditional rules
- Multiple changes per effect (мокап показывает один change per effect, но модель поддерживает массив)
- Animation / visual feedback
- Import/export эффектов между актёрами

---

## 17. Отличия от старого UI

| Аспект | Было | Стало |
|---|---|---|
| Эффекты отображались | плоский список с raw attribute key | сгруппированные карточки с человекочитаемыми labels |
| Source | скрыт за raw path | отдельная строка с ссылкой на объект |
| Target | raw attribute path в заголовке | category + target display name в badge |
| Modifier mode | не отображается | badge с mode label и типизированным значением |
| Duration | отсутствовала | permanent/timed/conditional с иконкой и заметкой |
| Создание | только от предметов | конструктор с простым и advanced режимом |
| Toggle active | отсутствовал | отдельный switch на каждом эффекте |
| Hidden from player | отсутствовал | dashed-border рендер, filter, respect при рендере token status icons |
| Фильтры | отсутствовали | All / Active only / Temporary / Hidden |
| GM-only | не ограничивалось | таб виден только GM (игроки видят только impact через скиллы) |
| Context menu | отсутствовал | Edit / Hide-Unhide / Duplicate / Open source / Remove |
| Group by source | отсутствовало | 6 групп с collapsible headers и counters |
