# BRP Character Sheet — Personality Tab Specification

Спецификация таба Personality. Содержит парные черты характера (Personality Traits) и односторонние эмоциональные привязанности (Passions). Обе подсистемы реализованы как Foundry item объекты.

---

## 1. Структура таба

Две секции сверху вниз:

1. **Personality Traits** — парные черты характера
2. **Passions** — эмоциональные привязанности

Обе секции:
- Сворачиваются кликом по заголовку
- Имеют счётчик (текущее количество)
- Кнопка сортировки (pill) — циклически переключает режимы
- Кнопка `+` для добавления нового объекта

---

## 2. Общий принцип

По аналогии с Items, Allegiance, Class — каждый trait и passion это отдельный Foundry item объект (`personality-trait` и `passion`). Имеют sheet, ID, могут лежать в compendium и быть переиспользованы между персонажами.

**Сквозные механики:**
- Double click по карточке → `object.sheet.render(true)`
- Right click → контекстное меню
- Кнопка Open (иконка стрелки) → открыть sheet
- Кнопка Menu → контекстное меню

---

## 3. Personality Traits

### 3.1. Суть (BRP RAW p. 304+)

Парные моральные черты. Каждая черта имеет противоположность, в сумме всегда **ровно 100%**:

| Trait (left) | Opposed (right) |
|---|---|
| Brave | Cowardly |
| Honest | Deceitful |
| Just | Arbitrary |
| Pious | Worldly |
| Chaste | Lustful |
| Generous | Greedy |

Использование: бросок `D100 ≤ trait %` — персонаж действует согласно этой черте. Провал → действует по противоположной.

**Пара хранится как один объект** — у объекта есть поля `left_name`, `right_name`, `value` (0-100). `opposed_value` автоматически вычисляется как `100 - value`.

### 3.2. Compendium с предустановленными парами

В системе — compendium `personality-traits-pack` с классическими парами BRP. При создании нового trait игрок:
- Либо выбирает из compendium (dropdown или drag-drop)
- Либо создаёт custom pair (freeform `left_name` и `right_name`)

Это ложится на механизм Foundry items: compendium — общий, персонаж получает локальную копию.

### 3.3. Поля объекта Personality Trait

- **left_name** — имя основной стороны (`Brave`)
- **right_name** — имя оппозита (`Cowardly`)
- **value** — 0-100, процент left
- **notes** — freeform описание, контекст
- **exp_check** — boolean, отмечен experience check в этой сессии
- **description** — rich text в sheet
- **gm_notes** — rich text в sheet

### 3.4. UI карточка

Горизонтальный компактный блок:

```
┌──────────────────────────────────────────────────┐
│ [☐] Brave ↔ Cowardly           70 / 30  [⋯] [↗] │
│ [████████████████░░░░░░░░]                       │
│                       50                         │
│ Notes: Выковано на службе в разведке...         │
└──────────────────────────────────────────────────┘
```

**Строка заголовка:**
- Exp checkbox слева
- `left_name ↔ right_name` — оба имени в одну строку, левый акцентный цвет, правый dimmed
- Values `left_value / right_value` справа — доминирующая сторона выделена цветом/размером
- Actions (Open, Menu)

**Dual bar:**
- Левая часть — fill мятным (основная сторона)
- Правая часть — fill приглушённым красным (opposed)
- Середина (50%) — тонкая вертикальная метка с подписью `50`
- Когда value > 50 — left доминирует, бар "наклонён" влево и мятный
- Когда value < 50 — right доминирует, бар визуально смещён вправо, красный шире

**Notes (если есть):**
- Мелким шрифтом под баром с label `Notes`

### 3.5. Fixated state

Крайние значения `value = 0` или `value = 100` — персонаж "fixated" (полностью зациклен на одной стороне, по RAW действует автоматически без броска).

**Визуализация:**
- Badge `Fixated` рядом со значениями (amber)
- Левая или правая граница карточки (2px amber) в зависимости от стороны
- `value = 0` → fixated right (полная противоположность), amber border справа
- `value = 100` → fixated left, amber border слева

### 3.6. Experience check

- Checkbox слева от имен
- Click toggle — без срабатывания броска
- При успешном использовании trait в игре — GM отмечает (или автомат при успешном броске — отдельная задача)
- Сбрасывается вручную или при experience rolls в конце сессии

### 3.7. Сортировка

Sort pill циклически переключает:
- **A-Z** (по left_name)
- **Z-A**
- **Value ↓** (по убыванию left value)
- **Value ↑**

Сохраняется в `actor.flags.brp-sheet.personality.sort-traits`.

### 3.8. Контекстное меню

- Open trait object
- Reset exp check
- Remove from character

---

## 4. Passions

### 4.1. Суть (BRP RAW p. 306)

Односторонние эмоциональные привязанности. В отличие от traits — **без пары**, без "opposed". Показывают одержимость персонажа конкретной темой/целью.

Примеры:
- `Love (Family)`
- `Hate (Caesar)`
- `Loyalty (Free Stars Alliance)`
- `Fear (Confined spaces)`
- `Devotion (Saint Mirra)`

Использование: `D100 ≤ passion %` — получить `+20%` augment к связанному скиллу, или впасть в эмоциональный транс.

### 4.2. Типы passion (enum)

Минимальный набор с дефолтными иконками:

| Type | Иконка | Цвет |
|---|---|---|
| love | сердце | pink |
| hate | огонь/кинжал | red |
| loyalty | щит | blue |
| fear | глаз/круг | purple |
| devotion | звезда | amber |
| other | часы/дефолт | mint |

Для кастомных passions — тип `other` с дефолтной иконкой. Тип нужен только для визуала (иконка + цветовой акцент бара), механически passions ведут себя одинаково.

### 4.3. Поля объекта Passion

- **name** — основное имя (`Revenge`, `Love`, `Loyalty`)
- **focus** — freeform текст на ком/чём фокусируется (`Captain Koss`, `Младшая сестра Лена`)
- **focus_link** — optional ссылка на Contact или Faction объект (`contact:UUID`, `faction:UUID`)
- **type** — `love` / `hate` / `loyalty` / `fear` / `devotion` / `other`
- **value** — 0-100
- **notes** — freeform
- **exp_check** — boolean
- **description** — rich text в sheet
- **gm_notes** — rich text в sheet

### 4.4. UI карточка

Компактный row в grid:

```
┌────────────────────────────────────────────────────────────┐
│ ❤  [☐] Revenge  [hate]              [███████░░░]   88%  [⋯]│
│       → Captain Koss                                        │
└────────────────────────────────────────────────────────────┘
```

Grid columns: `[icon 28] [name-block flex] [bar 140] [value 14px] [actions]`

**Name block:**
- Exp checkbox
- Name (plain)
- Type badge (цвет по типу)
- Fixated badge (если value = 100)
- Focus под именем мелким шрифтом:
  - Если `focus_link` пуст — просто текст dimmed
  - Если `focus_link` задан — мятный цвет с префиксом `→`

**Bar:**
- Цвет bar'а по типу passion
- Width = value%

**Fixated:**
- Когда value = 100 — левый бордер 2px amber + badge `Fixated`
- По BRP fixated passion означает полную одержимость, бросок автоматически успешен

### 4.5. Focus linking

При задании focus можно опционально подлинковать к Contact или Faction объекту:

- В sheet passion при создании/редактировании — dropdown выбора
- Варианты: `None (freeform text only)`, `Contact: [выбор из существующих]`, `Faction: [выбор]`
- Если привязка установлена — в карточке focus отображается как мятная ссылка
- В контекстном меню появляется пункт `Open contact: ...` / `Open faction: ...`

**При удалении целевого объекта** (contact или faction) — ссылка "орфанится", focus становится plain text (сохраняется имя на момент удаления).

### 4.6. Сортировка

Sort pill циклически переключает:
- **A-Z** (по name)
- **Z-A**
- **Value ↓**
- **Value ↑**

Дефолт — **Value ↓** (самые важные сверху).

### 4.7. Контекстное меню

- Open passion object
- Open linked focus (если focus_link задан)
- Reset exp check
- Remove from character

---

## 5. Сравнение с другими social-like механиками

| | Allegiance | Personality Trait | Passion |
|---|---|---|---|
| Парный | ❌ (есть enemy link) | ✅ (всегда пара 100/0) | ❌ |
| Opposed % | отдельное значение | `100 - value` автоматом | ❌ |
| Transcendent threshold | 75% (title/rank) | ❌ | ❌ |
| Fixated threshold | ❌ | 0% или 100% | 100% |
| Exp check | отдельно (improvement roll) | ✅ | ✅ |
| Focus linking | ❌ | ❌ | ✅ (Contact / Faction) |
| Множественные | ✅ | ✅ | ✅ |
| Один primary | ✅ (один primary) | ❌ | ❌ |

---

## 6. Интеракции — сводная таблица

| Элемент | Действие | Эффект |
|---|---|---|
| Any card | double click | open Foundry sheet |
| Any card | right click | context menu |
| Exp checkbox | click | toggle exp, без броска |
| Sort pill | click | цикл режимов |
| Section header | click | collapse/expand |
| Add button `+` | click | open creation flow (compendium или custom) |
| Open icon | click | open sheet |
| Menu icon | click | context menu |

---

## 7. Модель данных

### 7.1. Actor-level

```json
{
  "personality_traits": ["Item.trait1", "Item.trait2"],
  "passions": ["Item.passion1"],
  "flags": {
    "brp-sheet": {
      "personality": {
        "sort-traits": "name",
        "sort-passions": "value-desc",
        "collapsed-traits": false,
        "collapsed-passions": false
      }
    }
  }
}
```

### 7.2. Personality Trait object

```json
{
  "type": "personality-trait",
  "name": "Brave ↔ Cowardly",
  "system": {
    "left_name": "Brave",
    "right_name": "Cowardly",
    "value": 70,
    "exp_check": false,
    "notes": "Выковано на службе в разведке...",
    "description": "...",
    "gm_notes": "..."
  }
}
```

### 7.3. Passion object

```json
{
  "type": "passion",
  "name": "Revenge",
  "system": {
    "focus": "Captain Koss",
    "focus_link": null,
    "type": "hate",
    "value": 88,
    "exp_check": true,
    "notes": "Винит капитана в гибели отряда.",
    "description": "...",
    "gm_notes": "..."
  }
}
```

---

## 8. Бэкенд-задачи

1. **Регистрация Foundry item types:** `personality-trait`, `passion`
2. **Sheet templates** для каждого типа (аналог Allegiance sheet, уже существует)
3. **Compendium personality-traits-pack** — предустановленные пары (Brave/Cowardly, Honest/Deceitful, etc.)
4. **`computeOpposedValue(trait)`** — `100 - trait.value`
5. **`isFixated(trait)`** — `value === 0 || value === 100`
6. **`isFixatedPassion(passion)`** — `value === 100`
7. **`rollTrait(trait, side)`** — бросок `D100 ≤ value` для выбранной стороны (left или right)
8. **`rollPassion(passion)`** — аналогично
9. **`resolveFocusLink(passion)`** — получить объект Contact / Faction по `focus_link`
10. **`applyExperienceCheck(object)`** — установить exp_check = true (при успешном использовании в игре)
11. **`resetAllExpChecks(actor)`** — сброс всех (в конце сессии или при experience roll)

---

## 9. Что НЕ входит в мокап

- Полные sheet'ы (реализация по аналогии с Allegiance sheet — есть существующий пример)
- Experience rolls механика (growth в конце сессии) — отдельная задача
- Augment calculation (passion даёт +20% к какому-то скиллу) — отдельная задача
- Automatic application of personality trait effects на NPC reactions (advanced)
- Compendium browser для выбора предустановленных пар (используется стандартный Foundry UI)
- Personality-driven dialogue suggestions
- Trait pair templates per setting (фэнтезийные vs модерн) — можно делать отдельные compendium packs

---

## 10. Отличия от старого UI

| Аспект | Было | Стало |
|---|---|---|
| Personality traits | 2 скрытых total в одной таблице | парная карточка с dual bar |
| Opposed trait | freeform text | автоматом из одного value |
| Traits paired logic | не было явно | одна сторона ↔ другая, 100% сумма |
| Passions | плоская таблица | карточки с type, focus, icon |
| Type of passion | отсутствовало | enum с иконками (love/hate/loyalty/fear/devotion/other) |
| Focus | отсутствовало | freeform или link на Contact/Faction |
| Fixated states | не отображались | badge + border highlight для 0/100 |
| Sort | фиксированный | 4 режима per секцию |
| Experience check | checkbox в таблице | в карточке на строке имени |
| Double click | не реализовано | open Foundry sheet (сквозная механика) |
| Context menu | отсутствовало | Open / Reset exp / Remove |
