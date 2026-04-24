# BRP Character Sheet — Items Tab Specification

Спецификация таба Items. Описание структуры, типов предметов, логики ношения/надевания, контейнеров, валют, encumbrance и USE-эффектов.

---

## 1. Структура таба

Шапка → тулбар → три секции:

```
┌─ HEADER ──────────────────────────────────────────┐
│  [Encumbrance bar]  [Currency pills + add btn]    │
├─ TOOLBAR ─────────────────────────────────────────┤
│  [Search] [Filters btn] [Add item btn]            │
│  [Filter panel — раскрывается по кнопке]          │
├─ WEAPONS ─────────────────────────────────────────┤
│  (только type='weapon', top-level)                │
├─ ARMOR ───────────────────────────────────────────┤
│  (только type='armor', top-level)                 │
└─ OTHER ───────────────────────────────────────────┘
   (все остальные типы, включая containers)         
```

Секции можно сворачивать кликом по заголовку.

---

## 2. Типы предметов

Семь типов: `weapon`, `armor`, `container`, `consumable`, `tool`, `equipment`, `loot`.

| Type | Назначение | Секция | Особые поля |
|---|---|---|---|
| `weapon` | Оружие для атак | Weapons | damage, skill, ammo, equipped |
| `armor` | Броня для защиты | Armor | ap_formula, locations, equipped |
| `container` | Вмещает другие предметы | Other | contents[], capacity, enc_reduction_pct |
| `consumable` | Расходник с эффектом USE | Other | stackable, quantity, use_effect |
| `tool` | Инструмент (постоянный) | Other | bonuses[] (см. §5.5) |
| `equipment` | Обычное носимое барахло | Other | — |
| `loot` | Ценности, квестовые, валюта неликвид | Other | value |

Типы имеют цветовую кодировку в иконке:
- Weapon — амбер
- Armor — синий
- Container — мятный
- Consumable — зелёный
- Tool — пурпурный
- Equipment — приглушённый
- Loot — амбер (как ценность)

### 2.1. Equipment vs Loot

Различие концептуальное, не механическое. Equipment — «я ношу, потому что полезно». Loot — «трофей / ценность». Механически одинаковы, но типы разные для сортировки и фильтрации. Можно менять тип (например, после продажи артефакта он может перестать быть Loot).

---

## 3. Состояния предмета

Два сквозных свойства, применимых ко всем типам:

### 3.1. `carried: boolean`

Универсальный флаг «предмет у персонажа при себе».

- `carried: true` — предмет учитывается в ENC (если не внутри контейнера)
- `carried: false` — предмет где-то лежит (в лагере, в сейфе, в машине). НЕ учитывается в ENC. Видим в списке, но приглушён (opacity 55%).

**Важно:** логика ношения должна быть единой для всех предметов (weapon, armor, container, consumable, etc.). Она уже существует в системе — нужно подружить новый UI с текущей реализацией. Контейнеры подчиняются той же логике, что и обычные предметы.

### 3.2. `equipped: boolean`

Применим только к `weapon` и `armor`. Для остальных типов поле игнорируется.

- Weapon `equipped: true` → отображается в Combat tab, доступен для атаки
- Armor `equipped: true` → AP учитывается на покрываемых локациях, отображается в Health tab

Equipped автоматически подразумевает carried (нельзя надеть то, чего нет при себе). При unequip — carried сохраняется.

### 3.3. Визуальная индикация

- `equipped` — левый мятный бордер 2px, иконка-тумблер equip активна (мятный)
- `!carried` — opacity 55%, иконка carry неактивна
- `quantity === 0` — text-decoration: line-through на имени, opacity 40%

### 3.4. Правила изменения состояния

- Toggle `carried` — кнопка в item-actions
- Toggle `equipped` — кнопка в item-actions (только для weapon/armor)
- При `equipped: true` → автоматически `carried: true`
- При `carried: false` → автоматически `equipped: false`

---

## 4. Контейнеры

### 4.1. Контейнер = предмет + папка

Контейнер — это item типа `container`. Имеет все свойства предмета (enc, carried, можно надеть на пояс, etc.) и дополнительно:

- `contents: string[]` — массив id предметов внутри
- `capacity_enc: number` — максимальный ENC содержимого
- `enc_reduction_pct: number` — процент снижения веса содержимого при носке (0-99)

Предметы внутри контейнера имеют флаг `container_id: string` — указывает, где они лежат. Top-level предмет — `container_id: null | undefined`.

### 4.2. Расчёт ENC контейнера

Эффективный ENC контейнера при ношении:

```
effective_enc = container.enc + sum(contents.enc * quantity) * (1 - enc_reduction_pct / 100)
```

Содержимое считается по обычному весу умноженному на количество (для stackable — × quantity).

Примеры:
- Рюкзак weight 1, reduction 20%, содержит 15 ENC барахла → вносит в общий ENC: 1 + 15 × 0.8 = **13 ENC**
- Сумка weight 0.2, reduction 0%, содержит 3 ENC → вносит: 0.2 + 3 = **3.2 ENC**

### 4.3. Reduction только при ношении

Ключевое правило: `enc_reduction_pct` применяется ТОЛЬКО если `container.carried === true`. Если контейнер не при персонаже — его ENC равен нулю для персонажа (вместе с содержимым).

Это синхронизировано с общей логикой `carried`: нет переноса — нет веса.

### 4.4. Вложенность

- Максимальная глубина вложенности: **3 уровня** (top-level = уровень 0, container в container = уровень 1, и т.д.)
- При попытке вложить контейнер 3-го уровня в ещё один — показать ошибку: `"Max nesting depth reached (3 levels)"`
- **Reduction не каскадируется** — рюкзак с 20% reduction внутри рюкзака с 30% reduction даёт 20% для своего содержимого, не суммарно. Внешний рюкзак применяет свой reduction к вложенному рюкзаку как к целому предмету (с уже посчитанным внутренним ENC).

Формула для nested:
```
level_0_effective = container.enc + sum(contents.compute_enc()) * (1 - container.enc_reduction_pct / 100)
```
где `contents.compute_enc()` рекурсивно считает для каждого контейнера внутри.

### 4.5. UI контейнера

Contain-body раскрывается/сворачивается по клику на строку контейнера. Внутри:

- **Info-bar** — capacity usage, reduction %, nesting depth
- **Contents list** — item rows с depth > 0 (nested style)
- **Drop zone** — область внизу для drag-drop добавления

### 4.6. Примеры контейнеров

- **Рюкзак** — enc 1, reduction 20%, capacity 25 (большой)
- **Side pouch** — enc 0.2, reduction 0%, capacity 3 (маленькая сумка)
- **Weapon case** — enc 2, reduction 0%, capacity 5 (обычно не носится)

### 4.7. Drop scenarios

- Item на drop-zone контейнера → `contents.push(item.id)`, `item.container_id = container.id`
- Item из контейнера наружу (drag в section-body) → убрать из `contents`, `container_id = null`
- Item из одного контейнера в другой → move
- Drag запрещён между разными секциями (weapon не может стать loot перемещением; для смены типа — редактирование в unlock-режиме)

---

## 5. USE для consumables

### 5.1. Базовая механика

В этой версии — **только кнопка USE с минимальной логикой**:

1. Click по USE кнопке
2. `quantity -= 1` (если stackable)
3. Если `quantity === 0`: предмет остаётся в инвентаре со статусом empty (приглушённый, line-through, filter "hide empty" может его скрыть)
4. В chat публикуется сообщение: `"{character} used {item.name}"` с припиской об эффекте

### 5.2. Поле `use_effect`

Запасное поле под будущую логику. Может принимать значения:

- `heal` — лечение
- `restore_fatigue` — FP restore
- `restore_sanity` — SAN restore
- `restore_power` — PP restore
- `cure_status` — снять состояние
- `apply_status` — наложить состояние
- `apply_wound` — нанести урон (яд)
- `buff_skill` — бонус к скиллу
- `custom` — ручное применение

Сейчас логика эффектов НЕ реализована. В UI отображается только лейбл эффекта. Полная механика применения будет реализована отдельно по запросу.

### 5.3. Non-stackable consumables

Могут быть non-stackable consumables с несколькими зарядами. Обрабатывается отдельно в модели (в мокапе не показано). Пример: flare gun с 3 зарядами — non-stackable, у каждого экземпляра поле `uses_remaining`.

---

## 5A. Бонусы от инструментов (tool bonuses)

Применимо к типу `tool`, но поле `bonuses` универсальное — может появляться и на других типах (armor с бонусом к Intimidate, equipment вроде goggles с +10% к Spot, etc.). Реализовать как общее поле, не специфичное для tool.

### 5A.1. Модель

```json
{
  "bonuses": [
    {
      "mode": "flat",
      "skill_id": "repair",
      "skill_name": "Repair",
      "value": 10,
      "conditions": "mechanical devices",
      "requires_carried": true
    },
    {
      "mode": "difficulty",
      "skill_id": "first-aid",
      "skill_name": "First Aid",
      "difficulty": "easy",
      "conditions": "standard wounds",
      "requires_carried": true
    },
    {
      "mode": "text",
      "text": "Можно заменить ключ при взломе замков низкого уровня",
      "requires_carried": true
    }
  ]
}
```

### 5A.2. Режимы модификатора (`mode`)

- **`flat`** — плоский процентный бонус: `+N%` или `-N%`. Используется самое частое (med-kit +20%).
- **`difficulty`** — изменение сложности броска: `easy` / `difficult` / `automatic` / `impossible`. По RAW BRP категории сложности меняют базу (Easy = двойной шанс, Difficult = половина).
- **`text`** — свободная заметка, если лень структурировать. Не учитывается автоматически, просто отображается в списке бонусов.

Все автоматической логики нет — бонусы применяются руками GM. Поля — справочные для GM, чтобы не лезть в описание предмета.

### 5A.3. Общие поля бонуса

- **`skill_id`** — если известен. Нужен если в будущем делать автоматическое применение.
- **`skill_name`** — отображаемое имя скилла (для UI). Для `text`-режима может отсутствовать.
- **`conditions`** — текст, когда применяется бонус. Опционально. Не автоматизируется.
- **`requires_carried`** — `true` по умолчанию. Если предмет не carried — бонус не применяется. Для редких случаев (предмет-наблюдатель, стационарный) — `false`.

### 5A.4. Отображение в UI

**В row предмета (компактно):**

- 1 бонус → `+10% Repair`
- 2 бонуса → `+10% Repair · +5% Craft`
- 3+ бонусов → `+10% Repair · +5% Craft · +1 more`

Conditions в row НЕ показываются — там только skill + значение. Для `difficulty`-режима формат: `Easy · First Aid` или `Difficult · Perception`. Для `text`-режима — усечённый до 30 символов текст с многоточием.

**В раскрытых details (полный список):**

```
BONUSES
  +10% Repair
    ── mechanical devices
  Easy · First Aid
    ── standard wounds
  Text note
    ── Можно заменить ключ при взломе...
```

Каждый бонус — отдельный блок. Основная строка крупнее (skill + value), conditions/text — мельче, приглушённее.

### 5A.5. Примеры

**Multi-tool:**
```json
{ "bonuses": [
  { "mode": "flat", "skill_id": "repair", "skill_name": "Repair", "value": 10, "conditions": "mechanical devices" }
]}
```

**Medical kit (basic):**
```json
{ "bonuses": [
  { "mode": "flat", "skill_id": "first-aid", "skill_name": "First Aid", "value": 20 }
]}
```

**Medi-kit (advanced):**
```json
{ "bonuses": [
  { "mode": "difficulty", "skill_id": "first-aid", "skill_name": "First Aid", "difficulty": "easy" },
  { "mode": "flat", "skill_id": "first-aid", "skill_name": "First Aid bonus HP", "value": 0, "conditions": "doubles HP restored" }
]}
```

**Lockpicks:**
```json
{ "bonuses": [
  { "mode": "text", "text": "Позволяет взламывать замки. Без них Pick Lock невозможен." }
]}
```

### 5A.6. Автоматизация — на будущее

Автоматическое применение `flat` и `difficulty` бонусов к броскам возможно, если:
- `skill_id` заполнен
- `requires_carried` учитывается при проверке
- `conditions` игнорируется (слишком вариативно)
- Текст-бонусы пропускаются

Но в этой версии автоматика не требуется — только UI и структурированное хранение.

---

## 6. Stackable items

### 6.1. Принцип

Свойство `stackable: boolean` на предмете, задаётся при создании типа.

- Stackable — хранится как единственный item с полем `quantity`. Все экземпляры идентичны.
- Non-stackable — каждый экземпляр = отдельный item, может иметь уникальные свойства (HP, charges, custom name).

### 6.2. Split stack

Контекстное меню → `Split stack` (только если `stackable && quantity > 1`).

Модалка со слайдером: выбрать `n` (от 1 до `quantity-1`). Результат: исходный item имеет `quantity -= n`, создаётся новый item-клон с `quantity = n`, favorite не переносится.

Также split может случаться автоматически при drag части стека (например, зажатый Shift при перетаскивании).

### 6.3. Merge stack

При drop stackable предмета на другой с идентичным type, name и базовыми свойствами — предложить merge. В текущей версии не реализовано.

### 6.4. Empty items

При `quantity = 0`:
- Визуально: opacity 40%, text-decoration: line-through на имени
- По дефолту фильтр `hide empty = true` скрывает такие
- GM может оставить для учёта (например, чтобы знать, что раньше был этот предмет)
- Пункт меню `Delete` полностью удаляет

---

## 7. Encumbrance

### 7.1. Формула

По RAW BRP:
- `light_max = STR` (без штрафа)
- `medium_max = STR × 1.5` (штраф −1 per to Physical skills)
- `heavy_max = STR × 2` (штраф −2 per, уменьшение MOV)
- Свыше `heavy_max` — движение невозможно/затруднено

Системно max = `STR × 2`. Три зоны делят шкалу на 50% / 25% / 25%.

### 7.2. UI

Progress bar со шкалой, маркеры на 50% (medium) и 75% (heavy):

```
[████████░░░░░░░░░░░░]
  ↑ light   ↑ medium  ↑ heavy  ↑ overload
```

Цвет fill меняется по зоне:
- Light — зелёный
- Medium — амбер
- Heavy — красный
- Overload — ярко-красный, бордер

Рядом zone tag с текущим штрафом: `Light · 0`, `Medium · -1p`, `Heavy · -2p`, `Overload · Impossible`.

### 7.3. Что учитывается в ENC

- Все `carried: true` предметы на top-level
- Для контейнеров: `container.enc + contents_enc * (1 - reduction_pct / 100)` (только если контейнер carried)
- Stackable: `item.enc × quantity`
- Non-carried — не учитывается совсем

---

## 8. Currency (валюты)

### 8.1. Модель

Валюты — отдельная сущность на уровне персонажа, **не item**. Массив:

```json
[
  { "id": "credits", "name": "Credits", "icon": "coin", "amount": 1240 },
  { "id": "card", "name": "Card balance", "icon": "card", "amount": 4500 },
  { "id": "crystals", "name": "Crystals", "icon": "gem", "amount": 3 }
]
```

### 8.2. UI

В шапке Items tab, справа от Encumbrance bar. Pill-карточки: иконка + название + количество. Кнопка `+` в конце для добавления нового типа.

### 8.3. Icon picker

Фиксированный набор иконок в системе:
- `coin` — монета
- `bill` — банкнота
- `card` — кредитная/электронная карта
- `crypto` — криптовалюта
- `gem` — камень/кристалл
- `token` — жетон

При создании/редактировании валюты — picker из этих 6 иконок. Загрузка собственной иконки не поддерживается в этой версии (на будущее).

### 8.4. Интеракции

- Click по pill — открыть редактор amount (только amount, не name/icon)
- Right click или unlock-режим — delete/rename/change icon
- Add currency → модалка с полями name, amount, icon picker

### 8.5. Будущее: курсы обмена

Поле `exchange_rate_to_base` можно добавить для автоматического конвертирования. В этой версии не реализовано.

---

## 9. Фильтры и поиск

### 9.1. Search

Текстовый поиск по имени и notes. Живой фильтр (на каждый ввод). Case-insensitive.

### 9.2. Filter panel (разворачивается кнопкой)

Три группы фильтров:

**By type** (чекбоксы, все включены по умолчанию):
- Weapons, Armor, Containers, Consumables, Tools, Equipment, Loot

**By state**:
- `Equipped only` — только `equipped: true` (применимо к weapon/armor)
- `Carried only` — только `carried: true`
- `Favorites only` — только `favorite: true`
- `Hide empty (qty = 0)` — по дефолту включено

### 9.3. Индикатор активных фильтров

На кнопке Filters — бейдж с количеством активных нетипичных фильтров (то есть отклонений от дефолта). Чекбоксы типов — если сняты — увеличивают счётчик.

---

## 10. Сортировка

### 10.1. Режимы (per section)

Каждая секция имеет свой sort state:

- **Custom** — ручной порядок (drag-drop)
- **A-Z** — по имени
- **Z-A** — по имени обратно
- **By type** — по типу (только для Other)
- **ENC ↓** — по убыванию веса
- **ENC ↑** — по возрастанию

Click по sort-pill циклически переключает режим.

### 10.2. Custom сортировка

При первом переходе в Custom — сохраняется текущий порядок (как был при последнем режиме сортировки). Новые предметы добавляются в конец. Drag-drop работает только в Custom.

При переключении на другой режим и обратно на Custom — сохранённый порядок восстанавливается, новые предметы (добавленные за это время) попадают в конец.

Сохраняется в `actor.flags.brp-sheet.custom-order.{section}` как массив id.

### 10.3. Drag-drop и сортировка

Drag-drop для переупорядочивания работает **только в Custom** режиме. В других режимах drag внутри секции запрещён (сортировка не позволит сохранить порядок).

Drag **в контейнер** работает всегда — это смысловое действие (положить предмет в рюкзак), не сортировка.

---

## 11. Интеракции — сводная таблица

| Элемент | Действие | Эффект |
|---|---|---|
| Item row | click | expand/collapse details (chevron) |
| Item row | double click | open Foundry item window (sheet) |
| Item row | right click | context menu |
| Item row | drag | reorder (если Custom) или перемещение в container |
| Equip button | click | toggle equipped (auto-carries) |
| Use button | click | use consumable, quantity -= 1, chat message |
| Carry button | click | toggle carried (auto-unequips если false) |
| Container row | click | expand/collapse contents |
| Container drop zone | drop item | add item to container |
| Section header | click | collapse/expand section |
| Sort pill | click | cycle through sort modes |
| Context menu: Favorite | click | toggle favorite |
| Context menu: Duplicate | click | create clone |
| Context menu: Split stack | click | open split modal |
| Context menu: Edit | click | open unlock-mode editor |
| Context menu: Delete | click | remove item |
| Currency pill | click | edit amount |
| Currency +button | click | open Add currency modal |
| Filter button | click | toggle filter panel |

---

## 12. Сквозной механизм: double-click → item sheet

В системе Foundry у каждого item-объекта есть sheet (окно редактирования и детального просмотра). Нужно сохранить эту механику на всех интерактивных объектах в кастомном UI:

- Double click по item row → `item.sheet.render(true)`
- Double click по weapon/armor → тот же item.sheet
- Double click по currency pill → опционально (если решим сделать валюты items — тогда да; пока — нет)

Это сквозная механика, применимая ко всем элементам, представляющим Foundry documents. Реализовано уже в текущей системе — нужно пробросить в новые компоненты.

---

## 13. Модель данных

### 13.1. Item (базовая структура)

```json
{
  "id": "item-uuid",
  "name": "Pistol, Laser",
  "type": "weapon",
  "carried": true,
  "equipped": true,
  "container_id": null,
  "enc": 1,
  "stackable": false,
  "quantity": 1,
  "favorite": true,
  "notes": "Standard sidearm.",
  "hp": { "current": 14, "max": 14 },
  "sort_order": 0,

  // type-specific fields:
  // weapon: damage, skill_id, skill_pct, ammo{mode,...}, applies_db, atk_per_round, can_parry, range_m
  // armor: ap_formula, locations[], skill_mods
  // container: contents[], capacity_enc, enc_reduction_pct
  // consumable: use_effect, uses_remaining
  // tool: bonuses[] (см. §5A)
  // loot: value
  // universal optional: bonuses[] (может быть на любом типе, не только tool)
}
```

### 13.2. Currency

```json
[
  { "id": "credits", "name": "Credits", "icon": "coin", "amount": 1240, "sort_order": 0 }
]
```

Хранится в `actor.system.currencies` или `actor.flags.brp-sheet.currencies` (на выбор реализации).

### 13.3. Character encumbrance

Не хранится — вычисляется live из carried items + containers с reduction.

---

## 14. Бэкенд-задачи

1. **`computeEncumbrance(actor)`** — проходит по carried items, рекурсивно считает контейнеры с их reduction'ами, возвращает total ENC.
2. **`getEncumbranceZone(total, str)`** — возвращает `{zone: 'light'|'medium'|'heavy'|'overload', penalty}`.
3. **`moveItemToContainer(item, container)`** — проверяет capacity, nesting depth, обновляет `container_id` и `contents`.
4. **`removeFromContainer(item)`** — обратная операция.
5. **`splitStack(item, amount)`** — делит на два.
6. **`mergeStacks(source, target)`** — объединяет (если идентичны).
7. **`setEquipped(item, equipped)`** — с каскадом по carried.
8. **`setCarried(item, carried)`** — с каскадом по equipped + пересчёт ENC + отписка от Combat/Health если weapon/armor.
9. **`useConsumable(item)`** — quantity--, публикация в chat, (позже) применение use_effect.
10. **`applyFiltersAndSort(items, filters, sort)`** — utility для рендера.
11. **Currency CRUD** — add/edit/delete/reorder валют.
12. **Persistence** — сохранение filters, sort modes, expanded states, favorite'ов в actor flags.
13. **Nesting depth guard** — при drop проверять `3 > current_depth + item_depth`.
14. **Chat messages** — стандартизированный формат для actions (use, equip, split, etc.).
15. **Bonuses rendering** — универсальное поле `bonuses[]` на item, три режима (`flat` / `difficulty` / `text`), авто-применение НЕ требуется в этой итерации.

---

## 15. Что НЕ входит в мокап

- Полноценная логика USE-эффектов (heal, cure_status, apply_status и т.д.) — реализуется отдельно по запросу
- Drag-drop реализация — заложены hooks (`.handle`, drop zones), фактическая логика через SortableJS или Foundry drag/drop API
- Currency exchange rates / conversion
- Custom currency icons upload
- Starting inventory / profession kits
- Merge stacks (автоматическое объединение одинаковых)
- Пакетные действия (select multiple, bulk delete, etc.)
- Trading between characters
- Weight/ENC зависящий от size категории предмета (bulk)

---

## 16. Изменения относительно старого UI

| Аспект | Было | Стало |
|---|---|---|
| Секции | Armor, Equipment (смешанно) | Weapons / Armor / Other |
| Типы предметов | 3 (equipment, armor, weapon) | 7 (weapon, armor, container, consumable, tool, equipment, loot) |
| Контейнеры | отсутствовали | type + nested up to 3 levels, с ENC reduction |
| Encumbrance | строка в параметрах | отдельный bar с зонами и штрафами |
| Currency | отсутствовала отдельно | расширяемый список с иконками |
| Carried/Equipped | смешанная логика | два независимых флага, carried — универсальный, equipped — weapon/armor |
| USE для consumables | отсутствовал | кнопка USE, quantity--, chat message |
| Поиск и фильтры | отсутствовали | живой поиск, панель фильтров по типам и состояниям |
| Сортировка | фиксированная | Custom + 5 режимов per section |
| Contextual menu | отсутствовало | Favorite / Duplicate / Split / Edit / Delete |
| Split stack | отсутствовал | модалка с ползунком |
| Double-click → sheet | работал | сохранён как сквозная механика |
| Med. префиксы в именах | костыль | категория consumable + тип use_effect |
| Quantity 0 | оставался как обычный | визуально empty, скрывается фильтром |
| Nested поля (AP, BAP, ENC, SKILL MODS equal weight) | все равноразмерные | иерархия: главные stats крупно, детали в раскрытии |
| Tool bonuses | текстовое поле в notes | структурированный `bonuses[]` с тремя режимами (flat / difficulty / text), отображение inline + в details |
