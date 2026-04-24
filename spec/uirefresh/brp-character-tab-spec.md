# BRP Character Sheet — Character Tab Specification

Спецификация таба Character. Содержит биографию, класс и бэкграунд как системные объекты, компактные характеристики с детальным breakdown, derived stats с skill points, список power-систем, кастомные блоки-заметки.

---

## 1. Структура таба

Шесть секций сверху вниз, все сворачиваемые кликом по заголовку:

1. **Biography** — личностные/демографические данные
2. **Class & Background** — два системных объекта
3. **Characteristics** — восемь карточек с раскрытием
4. **Derived stats** — вычисляемые параметры + skill points
5. **Powers** — список power-систем
6. **Custom fields** — пользовательские блоки-заметки

В sidebar между identity и ресурсами добавлена строка **MOV** (compact metric, не bar).

---

## 2. Biography

Структурирована по группам. Каждая группа — отдельная collapsible карточка (pre-header + grid полей).

### 2.1. Группы и поля

**Demographics:**
- Name, Age, Gender, Pronouns
- Date of birth, Place of birth
- Nationality / Culture, Religion, Native language

**Physical:**
- Height, Weight, Build
- Eye color, Hair color, Skin tone
- Handed (left / right / ambi)
- Distinctive marks (freeform, покрывает аналог Distinctive features из RAW p. 25)

**Social:**
- Profession, Employer / Faction, Rank / Title
- Marital status, Social class
- Known languages

**About** — отдельный textarea-блок со свободным описанием персонажа (one-paragraph summary).

### 2.2. Поведение

- В locked-режиме — read-only текст, поля без рамок, как статическая карточка
- В unlock-режиме — inputs появляются на всех полях
- Пустые поля в locked — отображаются приглушённо "—" или "Not specified"

### 2.3. Что заложено

- Все поля считаются опциональными (кроме Name)
- Поле `Pronouns` — добавил, часто нужно, хорошая практика
- `Distinctive marks` заменяет отдельную механику Distinctive features из RAW (той там d10 таблица — не реализуем, только текст)
- `Date of birth` и `Place of birth` можно считать флейвором, но помогают игроку формировать образ

---

## 3. Class & Background

Два системных объекта Foundry. В BRP это items специальных типов (`profession` / `background` или аналог). Каждый при применении даёт стартовые скиллы и бонусы.

### 3.1. Class

Профессия персонажа. Pilot, Soldier, Scholar, etc. При создании персонажа выбирается из compendium'а профессий. Даёт professional skill distribution.

### 3.2. Background

Социально-культурный бэкграунд. "Skilled", "Noble-born", "Street kid" — в зависимости от сеттинга. Даёт стартовые бонусы к нескольким скиллам и иногда дополнительные очки.

**НЕ путать с personality** — это отдельная механика, которую будем обсуждать позже в Social-табе.

### 3.3. UI

Две карточки рядом, equal-width. Каждая:

- Label (Class / Background)
- Имя объекта (крупный Cinzel header, мятный)
- Краткое описание (1-3 строки)
- Action icons в углу:
  - **Open** — открыть Foundry sheet объекта
  - **Menu** — контекстное меню

### 3.4. Интеракции

- **Click по карточке** (не на action buttons) → показать детальный tooltip или ничего
- **Double click** → открыть Foundry sheet объекта (сквозная механика)
- **Right click** → контекстное меню
- **Action "Open"** → открыть Foundry sheet
- **Action "Menu"** → контекстное меню с кнопки

### 3.5. Контекстное меню

| Item | Действие |
|---|---|
| Open class/background object | `object.sheet.render(true)` |
| Replace | drop-zone для нового объекта (drag из compendium) |
| Remove | убрать с персонажа (не удаляет объект, только открепляет) |

### 3.6. Пустое состояние

При отсутствии объекта — карточка с dashed border и текстом `[Assign class]` / `[Assign background]`. Click открывает compendium browser для выбора.

### 3.7. Бэкенд

- Связь: `actor.system.class_id` и `actor.system.background_id` — ссылки на Foundry items
- При assign — copy объекта в actor (чтобы можно было изменять персонально) или ссылка на compendium (обновится при правках глобально) — на выбор реализации, моё мнение: копия
- При assign — автоматическое применение стартовых скиллов из объекта

---

## 4. Characteristics

### 4.1. Компактный режим

Grid 4×2 (8 карточек). Каждая карточка:
- Code (STR, CON, INT, SIZ, POW, DEX, CHA, EDU) — Cinzel, мелко, красный
- Total value — крупно, white

На hover — подсветка бордера и появление chevron. Click раскрывает breakdown-панель.

### 4.2. Breakdown (раскрытие)

Панель на всю ширину grid'а, появляется под строкой с активной карточкой. Содержит таблицу 2 колонки:

| Компонент | Значение |
|---|---|
| Initial | базовый бросок |
| Redistribute | ручная подстройка игроком при creation |
| Cultural | бонус от культуры (может применяться к конкретным чарам) |
| Age | модификатор по возрасту |
| Experience | рост через тренировку в игре (редко) |
| Effects | модификаторы от major wound, магии, болезней |
| **Total** | сумма (выделено) |

Под таблицей — строка с формулой броска для генерации: `Dice formula: 3D6` или `6 + 2D6`.

### 4.3. Одновременно раскрыта только одна

Click по другой карточке — закрывает предыдущую, открывает новую. Click по той же — закрывает.

### 4.4. Cultural для CON vs INT

В BRP cultural применяется не ко всем чарам одинаково — конкретные культуры дают бонусы к конкретным характеристикам. Поле `cultural` на уровне каждой характеристики.

### 4.5. Effects — откуда берутся

- Major wound permanent effects (RAW p. 135) — снижает CON, STR, DEX, CHA, INT по таблице
- Magic / tech модификаторы
- Temporary powers (Size Change, etc.)

Поле `effects` может быть вычисляемым (из активных эффектов) или ручным (GM правит при применении). В мокапе — ручное поле в breakdown.

### 4.6. Total формула

`total = initial + redistribute + cultural + age + experience + effects`

Все компоненты могут быть negative.

### 4.7. Важно: MOV — базовый для humanoid

MOV — отдельный derived параметр (§5), не характеристика. По RAW обычно 10 для humanoids, может модифицироваться от DEX loss (major wound), SIZ (size change).

---

## 5. Derived stats

Восемь метрик в grid 4×2, каждая — карточка с label / value / формулой.

### 5.1. Список derived stats

| Stat | Формула / источник | Notes |
|---|---|---|
| XP Bonus | `½ INT, floor` | для skill improvement rolls |
| HP Bonus | опциональное правило | CON+SIZ без деления на 2 |
| PP Bonus | опциональное | POW+X |
| FP Bonus | опциональное | STR+CON бонус |
| Damage Mod | `STR+SIZ → таблица RAW p. 21` | для melee/thrown |
| Total ENC | `STR × 2` | max carry capacity |
| **MOV** | `10 base for humanoid` | модификаторы от DEX loss |
| Total XP | накопленные очки опыта | как используется системой — зависит от реализации |

### 5.2. MOV в sidebar

Дополнительно к карточке в Derived stats — compact-строка в sidebar (под именем, над ресурсами):

```
MOV 10  ·  Run 30m/rd
```

Это постоянно видимый lookup — MOV важен для позиционирования в бою. Run speed (MOV × 3) тоже удобен.

### 5.3. Skill Points

Two cards, отдельный блок ниже derived grid:

**Personal Skill Points**
- Label
- Процент от бюджета (`used / total × 100`), крупно
- Детали: `formula (INT × 10 = 130)` + `Used 88 / 130`

**Professional Skill Points**
- Аналогично, `EDU × 20`

### 5.4. Индикация переполнения

- Процент ≤ 100% → мятный цвет
- Процент > 100% → красный цвет (overflow, игрок превысил бюджет)

Overflow в игре НЕ ошибка — персонаж может расти через experience checks сверх изначального бюджета. Просто справочная индикация.

### 5.5. Формулы skill points

По RAW BRP:
- Personal = `INT × 10`
- Professional = `EDU × 20`

**Считается от `initial + cultural`** — т.е. cultural учитывается, но не age/experience/effects. Это потому что skill points распределяются при creation, а к этому моменту культурные бонусы уже применены, а другие — нет.

Хранится в актере:
- `actor.system.skill_points.personal.total` — вычисляемое
- `actor.system.skill_points.personal.used` — вычисляемое (сумма всех `skill.percent - skill.base_percent`)

### 5.6. Used calculation

`used = sum over all skills of (skill.current_percent - skill.base_percent)`

Базовая реализация уже есть в системе — использовать существующую.

---

## 6. Powers

### 6.1. UI

Горизонтальный список карточек power-систем. Каждая:
- Иконка (пурпурный акцент)
- Название системы (Magic / Sorcery / Superpowers / Psionics / etc.)
- Count (количество заклинаний/способностей в этой системе)

### 6.2. Взаимодействие

- **Click** — открывает отдельное окно с полным списком способностей этой power-системы. UI этих окон в рамках текущего мокапа не проработан — обсудим отдельно.
- **Кнопка `+`** в header секции — добавить power-систему персонажу
- Пустое состояние — плейсхолдер `No power systems assigned`

### 6.3. Что НЕ в этой спеке

Структура отдельных power-окон (заклинания, costs, cooldowns, параметры конкретных систем) — обсуждается отдельно позже. Здесь только entry point.

---

## 7. Custom fields

Пользовательские блоки-заметки. Используются для любых атипичных полей, которые не покрываются стандартной биографией (phobias, relationships, secrets, GM notes, backstory fragments).

### 7.1. Структура блока

- Title (обязательно)
- Content (freeform text, supports multi-line)
- Icon-handle слева для drag reorder
- Actions in top-right (при hover): Edit / Delete

### 7.2. Intents и примеры

- "Phobias & Quirks" — особенности психики
- "Связи и контакты" — список NPC-знакомых с короткими описаниями
- "Backstory" — развёрнутая история персонажа
- "GM secrets" — скрытая информация (если sheet общий с игроком — можно скрывать такие блоки)
- "Languages detail" — уточнения по языкам
- "Character goals" — краткосрочные / долгосрочные цели

### 7.3. UI действия

- **Add** — кнопка `+ Add custom field` внизу секции
  - Открывает модалку с полями Title / Content
  - При save — блок добавляется в конец списка
- **Edit** — icon в углу блока, открывает ту же модалку с pre-filled значениями
- **Delete** — icon, удаление (можно без подтверждения — тривиальная операция)
- **Drag** — перетаскивание handle для реордеринга

### 7.4. Storage

`actor.system.custom_fields: [{ id, title, content, sort_order }]`

Порядок сохраняется между сессиями.

### 7.5. Будущее развитие (не в этой итерации)

- Типы блоков (text, checklist, timeline)
- Markdown rendering
- Hide from player (для GM notes)
- Tags для фильтрации

---

## 8. Sidebar changes

Добавлена MOV-строка между Identity и status icons:

```
[Avatar]
[Name / Profession · Age]
─────────
MOV 10  ·  Run 30m/rd
─────────
[Status icons]
[Resources]
```

Compact, не bar. Мятный цвет на цифрах.

---

## 9. Интеракции — сводная таблица

| Элемент | Действие | Эффект |
|---|---|---|
| Section header | click | expand/collapse section |
| Biography field | click (unlock) | редактирование поля |
| Class/Background card | double click | open Foundry sheet |
| Class/Background card | right click | context menu |
| Class/Background card | click on Open icon | open Foundry sheet |
| Class/Background card | click on Menu icon | show context menu |
| Characteristic card | click | toggle breakdown |
| Power card | click | open power system window |
| Custom block | click on Edit | open edit modal |
| Custom block | click on Delete | remove block |
| Custom block handle | drag | reorder blocks |
| Add custom field button | click | open create modal |

---

## 10. Модель данных

### 10.1. Biography

```json
{
  "biography": {
    "name": "Арсэн Кримс",
    "age": 27,
    "gender": "Male",
    "pronouns": "he / him",
    "date_of_birth": "2269-03-14",
    "place_of_birth": "Тарсис-4",
    "culture": "Colony-born",
    "religion": null,
    "native_language": "Russian",
    "height_cm": 182,
    "weight_kg": 78,
    "build": "Lean",
    "eye_color": "Dark grey",
    "hair_color": "Black",
    "skin_tone": "Pale",
    "handed": "right",
    "distinctive_marks": "Шрам через левую бровь...",
    "profession": "Pilot",
    "employer": "Free agent",
    "rank": null,
    "marital_status": "Single",
    "social_class": "Working",
    "known_languages": ["Russian", "English", "Trade"],
    "about": "Бывший разведчик-пилот..."
  }
}
```

### 10.2. Characteristic

```json
{
  "str": {
    "initial": 13,
    "redistribute": -2,
    "cultural": 0,
    "age": 0,
    "experience": 0,
    "effects": 0,
    "dice": "3D6"
  }
}
```

Total вычисляется: `sum(all components)`.

### 10.3. Class / Background references

```json
{
  "class_id": "Item.XXX",
  "background_id": "Item.YYY"
}
```

### 10.4. Derived (computed, not stored)

```js
{
  xp_bonus: Math.floor(chars.int.total / 2),
  hp_bonus: 0,
  pp_bonus: 0,
  fp_bonus: 0,
  damage_mod: damageMod(chars.str.total + chars.siz.total),
  total_enc: chars.str.total * 2,
  mov: 10 + (chars.dex.age_dex_loss || 0),
  total_xp: actor.system.total_xp
}
```

### 10.5. Skill Points

```js
{
  personal: {
    total: (chars.int.initial + chars.int.cultural) * 10,
    used: sumOverSkills(s => s.current_percent - s.base_percent, category='personal')
  },
  professional: {
    total: (chars.edu.initial + chars.edu.cultural) * 20,
    used: sumOverSkills(..., category='professional')
  }
}
```

### 10.6. Custom fields

```json
{
  "custom_fields": [
    { "id": "uuid", "title": "Phobias", "content": "Клаустрофобия...", "sort_order": 0 }
  ]
}
```

---

## 11. Бэкенд-задачи

1. **`computeCharTotal(char)`** — сумма всех компонентов.
2. **`computeDerivedStats(actor)`** — все derived stats в одном объекте.
3. **`computeSkillPoints(actor)`** — total + used для personal / professional.
4. **`damageModifier(strPlusSiz)`** — по таблице RAW p. 21.
5. **`applyClass(actor, classItem)`** — при assignment применить стартовые скиллы.
6. **`applyBackground(actor, backgroundItem)`** — аналогично.
7. **`removeClass(actor)` / `removeBackground(actor)`** — отпин, без удаления объекта.
8. **`addCustomField(actor, {title, content})`**.
9. **`editCustomField(actor, id, {title, content})`**.
10. **`deleteCustomField(actor, id)`**.
11. **`reorderCustomFields(actor, new_order_ids[])`**.
12. **Persistence** — состояние collapsed-секций, раскрытого характеристического breakdown сохраняется в actor flags.

---

## 12. Что НЕ входит в мокап

- Полная реализация power-систем (отдельная задача)
- Class/Background compendium browser (используется стандартный Foundry UI)
- Unlock-режим для редактирования biography/characteristics (общая механика листа)
- Distinctive features как механика RAW (d10 таблица) — вместо этого freeform поле
- Automatic application of major wound effects на characteristics (ручное поле `effects`)
- XP spending UI — отдельная задача
- Aging rules (RAW не описаны детально, опционально)
- Personality / Social механики — будут в Social tab

---

## 13. Изменения относительно старого UI

| Аспект | Было | Стало |
|---|---|---|
| Biography | в шапке листа (обрезанные лейблы) | отдельная секция, структурированные группы |
| Characteristics | 7 колонок на все чары (плотная таблица) | компактные карточки с раскрытием breakdown |
| Class | отсутствовал визуально | отдельная карточка с actions |
| Background | не выделен | отдельная карточка |
| Dice formula | колонка в таблице | строка в breakdown при раскрытии |
| XP Bonus, HP Bonus, etc. | разбросаны в двух местах | единый grid derived stats |
| Skill points | проценты без объяснения | Total + Used, формула, overflow indicator |
| Powers | три кнопки без контекста | карточки с количеством способностей |
| MOV | отсутствовал в UI | отдельная строка в sidebar + derived card |
| Custom notes | отсутствовали | система custom fields с CRUD |
| Empty space снизу | много | заполнено custom fields |
| Redistribute UI | колонка в таблице | в breakdown раскрытия |
| Cultural bonus | колонка в таблице | в breakdown раскрытия |
