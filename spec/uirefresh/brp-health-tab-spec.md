# BRP Character Sheet — Health Tab Specification

Спецификация таба Health с описанием логики лечения, ран, брони и структуры тела. Охватывает два режима: HPL (hit points per location) и non-HPL (единый HP pool). Реализация опирается на RAW BRP Core Rulebook v1.03.

---

## 1. Режимы системы

### 1.1. HPL (Hit Points per Location)

Применяется в детальной боёвке. HP распределены по локациям, сохраняется общий HP pool.

- Локации определяются шаблоном composition type (humanoid, quadruped, etc.)
- При уроне HP вычитается И из локации, И из общего пула
- При `location.hp <= 0` срабатывают специфические эффекты (§4)
- При `location.hp <= -location.hp_max` (т.е. damage ≥ 2× HP) — конечность уничтожается
- **Major wound механика отсутствует** (несовместима с HPL по RAW)

### 1.2. Non-HPL

Упрощённый режим. Единый HP pool. Major wound threshold применяется.

- Одна псевдо-локация `general`
- `major_wound_threshold = floor(max_hp / 2)` — при одной ране ≥ threshold срабатывает major wound
- Major wound → Luck roll, shock, эффекты из Major Wound Table (RAW p. 135)
- Сумма minor wounds достигающая threshold = Luck roll ИЛИ unconscious, но **не** major wound

### 1.3. Переключение

Режим задаётся на уровне системы (не персонажа). В мокапе добавлен toggle для демо; в финальной версии — системная настройка.

---

## 2. Структура тела (body composition)

### 2.1. Гибридная система

Каждый персонаж имеет composition type (`humanoid`, `quadruped`, `avian`, `general`, `custom`, ...). Каждый type даёт:

1. **SVG template** — силуэт с именованными `<path id="sil-{location}">`
2. **Default locations list** — массив локаций с range для броска d20 и формулой HP

Но локации у персонажа — **отдельный список объектов**. Template только задаёт дефолты и визуализацию.

Матчинг при рендере:
- Взять все локации персонажа
- Для каждой попытаться найти `path[data-loc="{id}"]` в SVG template
- Совпавшие — отрисовать с подсветкой
- Не совпавшие — показать как строки списка под силуэтом (с пометкой "not shown on silhouette")

Это даёт:
- Стандартных гуманоидов — красивая визуализация out-of-box
- Кастомных существ — работают, хоть и без силуэта для уникальных частей
- Возможность добавить `path` в template для расширения

### 2.2. Базовые шаблоны для подготовки

| Type | Локации | HP формулы |
|---|---|---|
| `general` | General (1) | Total HP |
| `humanoid` | Head, Chest, Abdomen, L/R Arm, L/R Leg (7) | см. RAW p. 21 |
| `humanoid-tailed` | + Tail | +1/5 total |
| `quadruped` | Head, Chest, Abdomen, 4× Leg, Tail | см. RAW p. 247 |
| `avian` | Head, Chest, 2× Wing, 2× Leg, Tail | — |

### 2.3. HP формулы BRP (humanoid, RAW)

| Location | HP |
|---|---|
| Head, Abdomen, Leg | `⌈total_hp / 3⌉` |
| Chest | `⌈total_hp × 0.4⌉` |
| Arm | `⌈total_hp / 4⌉` |

---

## 3. Визуализация тела (silhouette)

Силуэт в центре body-viz панели, слева от summary-блока.

### 3.1. Режимы подсветки (переключатель над силуэтом)

**Health** (дефолт) — градиент по `hp_current / hp_max` локации:
- 100% — зелёный
- 75-100% — зелёно-жёлтый
- 50-75% — жёлтый
- 25-50% — оранжевый
- 0-25% — красный
- ≤0% — тёмно-красный

**Armor** — градиент по среднему AP локации:
- 0 AP — тёмный (неокрашенный)
- 1-3 — приглушённый синий
- 4-7 — синий
- 8-12 — яркий синий
- 13+ — насыщенный синий

Для роллимой брони используется `avg = среднее формулы` (например `1D4+1` → 3.5). Это только для визуализации; фактический AP бросается при нанесении раны.

**Wounds** — цвет по количеству активных ран:
- 0 — нейтральный
- 1 — приглушённо-красный
- 2 — красный
- 3+ — яркий красный
- На локации рендерится текст с количеством ран

### 3.2. Интеракции с силуэтом

- Click на локацию — открывает модалку `Apply damage / Add wound` с префилом локации
- Hover — tooltip с быстрой сводкой (HP, AP, wounds)
- Silhouette — read-only при locked, редактирование — через модалки

### 3.3. Non-HPL режим

Силуэт отрисовывается как единый общий контур (в мокапе — через `#sil-general` path со всеми частями объединёнными). Клик открывает модалку с префилом `general`.

---

## 4. Модель локации

```json
{
  "id": "left-leg",
  "name": "Left Leg",
  "range": "5-8",
  "hp_max": 8,
  "hp_current": 0,
  "armor_formula": null,
  "armor_avg": 0,
  "sort_order": 5
}
```

`hp_current` — агрегат: `hp_max - sum(active_wounds.damage_remaining)` для этой локации. НЕ хранится независимо, вычисляется при чтении. Минимум не ограничен (может быть отрицательным).

**Status effects при `hp_current ≤ 0`:**

| Location | Effect |
|---|---|
| Head | Unconscious. Смерть через 5 минут без помощи |
| Chest | Cannot act, coughing blood. Смерть через 10 минут |
| Abdomen | Both legs useless, prone. Смерть через 10 минут |
| Arm | Useless, dropped items |
| Leg | Useless, Prone |

Эти эффекты:
- Вычисляются автоматически при обновлении HP
- Показываются на локации бейджем
- Показываются в summary-панели как active conditions
- Могут генерировать status-icon в sidebar (с флагом `auto: true`)

При `hp_current ≤ -hp_max` (т.е. damage ≥ 2× HP_max) — конечность уничтожена (`severed`, `crushed`). Стоит отдельный бейдж.

---

## 5. Модель раны

```json
{
  "id": "wound-uuid",
  "name": "Gunshot wound",
  "location": "left-leg",
  "damage": 8,
  "damage_remaining": 8,
  "type": "piercing",
  "status": "bleeding",
  "description": "Пуля крупного калибра...",
  "first_aid_used": false,
  "created": "Session 12",
  "date_received_iso": "2026-04-20T18:00:00Z",
  "history": [
    {
      "date": "Session 13",
      "date_iso": "2026-04-21T18:00:00Z",
      "action": "Medicine",
      "result": "special",
      "hp": 4,
      "note": "Зашита и перевязана"
    }
  ]
}
```

### 5.1. Поля

- **damage** — исходный урон после брони (фиксируется при создании)
- **damage_remaining** — оставшийся урон. Уменьшается при healing. `0` = зажила.
- **status** — `fresh` / `bleeding` / `treated` / `healing` / `infected` / `healed` / `scarred`
- **type** — `piercing` / `slashing` / `blunt` / `burn` / `cold` / `energy` / `poison` / `disease` / `other`
- **first_aid_used** — boolean. First Aid применяется **раз на рану** (RAW).
- **history** — массив записей, новые в начале. Показывается последняя, остальные за кнопкой «Show older».

### 5.2. Жизненный цикл status

- `fresh` — создана, лечения не было
- `bleeding` — свежая + bleeding special (ручная установка)
- `treated` — применено хоть одно лечение, `damage_remaining > 0`
- `healing` — идёт natural healing (ставится при первом natural-lечении)
- `infected` — GM-ставит вручную при плохих условиях
- `healed` — `damage_remaining == 0`, автоматически
- `scarred` — `healed` + был major wound (для non-HPL)

### 5.3. Связь с HP

`hp_current` локации (или общий HP в non-HPL) = `hp_max - sum(wounds где damage_remaining > 0 и location совпадает).damage_remaining`.

При создании раны HP автоматически падает. При healing HP автоматически растёт. Нет независимого тайма для HP — всё вычисляется из ран.

**Следствие:** потерять HP без раны нельзя. Эффекты типа яда, усталости, магии — должны создавать раны (типа `poison`, `burn`, `energy`).

---

## 6. Применение урона (apply damage)

### 6.1. Функция `applyDamage(params)`

Изолированная логика, будет использоваться и из UI модалки, и из атак оружия:

```ts
applyDamage({
  target: Actor,
  location: string | null,   // null в non-HPL
  raw_damage: number,
  damage_type: string,
  applies_armor: boolean,    // учитывать ли броню
  armor_override: number | null,   // если уже бросок сделан снаружи
  wound_name: string | null,
  description: string | null,
  source: string | null      // 'manual' | weapon.id | 'poison' | ...
})
```

### 6.2. Алгоритм

1. Если `applies_armor == true` и `armor_override == null`:
   - Собрать предметы брони, покрывающие локацию
   - Для каждого предмета бросить его формулу AP
   - Суммировать `final_ap = sum(rolls)`
2. `final_damage = max(0, raw_damage - final_ap)`
3. Если `final_damage == 0` — рана не создаётся, в чат: `"Armor absorbed all damage on {location}"`
4. Иначе: создать `Wound`:
   - `damage = final_damage`
   - `damage_remaining = final_damage`
   - `name`: если задано — использовать; иначе — автоген `"{type capitalized} wound"`
5. HP локации автоматически обновляется (cascade)
6. Пересчитать status effects локации
7. В non-HPL: проверить major wound (§7)
8. В чат: лог создания раны с брошенной бронёй

### 6.3. Random armor rolling

BRP поддерживает рандомную броню (`1D4+1`, `2D6-2`, etc.). При apply damage:
- Бросить формулу один раз
- Запомнить в лог (для прозрачности)
- RAW рекомендует не использовать random armor с hit locations для упрощения, но у нас — поддерживаем оба

Если у одной локации несколько предметов брони (layering, RAW p. 176-177) — формулы складываются (бросаются все, сумма вычитается из damage).

---

## 7. Major Wound (только non-HPL)

### 7.1. Правила (RAW p. 134-136)

- `threshold = ceil(max_hp / 2)`
- При одной ране `damage >= threshold` → **major wound**:
  1. Roll на Major Wound Table (d100)
  2. Luck roll — если успех, нет permanent loss характеристик; если провал — применяются эффекты таблицы
  3. Character goes into shock: сражается столько раундов, сколько `current_hp`, потом unconscious
  4. Если после раны `current_hp <= 2` — немедленно unconscious на час
- Сумма minor wounds достигающая threshold → Luck roll, провал = unconscious. **Major wound не триггерится**.
- `current_hp <= 0` — fatal wound, возможна смерть без медпомощи в тот же раунд или следующий

### 7.2. UI для major wound

При создании раны с `damage >= threshold`:
- Рана помечается `is_major: true`
- В чат автоматически: `"MAJOR WOUND! Roll d100 on Major Wound Table. Roll Luck (current {luck}%)"`
- Status effect `Shock` добавляется на персонажа
- В Health summary-панели — бейдж `Major wound active`

### 7.3. В HPL не применяется

В HPL сумма повреждений на конкретной локации (≥ hp_max) даёт специфический эффект (§4). Major wound не моделируется. По RAW major wound system disabled в HPL.

---

## 8. Лечение (healing)

### 8.1. Четыре метода (кнопки в Healing секции)

| Method | Formula | Restriction | Skill |
|---|---|---|---|
| First Aid | 1D3 (spec 2D3, crit 3+1D3) | раз на рану (`first_aid_used` флаг) | First Aid |
| Medicine | 2D3 (spec 3+1D3, crit 4+1D3) | раз в день на рану | Medicine |
| Natural | 1D3 / game week | автоматически, требует environment | — |
| Other | custom formula | по вкусу (магия, медитехника) | — |

### 8.2. Модалка Heal wound

1. Select раны (dropdown со всеми активными)
   - Ineligible опции disabled (напр. First Aid уже применена)
2. Skill roll result (selector: success / special / critical / failure / fumble)
3. Roll button — по результату бросает соответствующую формулу, показывает результат
4. Note (optional) — идёт в history
5. Preview: текущий damage → -heal → remaining
6. Apply

### 8.3. Эффекты применения

После apply:
- `wound.damage_remaining -= roll` (но не меньше 0)
- `wound.history.unshift({date, action, result, hp: roll, note})`
- Если `damage_remaining == 0`: status → `healed`
- Если `method == 'first-aid'`: `first_aid_used = true`
- Если fumble: `damage_remaining += 1` (рана ухудшилась, RAW)
- В чат публикуется запись лечения

### 8.4. Natural healing особенности

По RAW: `1D3 per game week`, распределяется по всем активным ранам равномерно.

В UI: кнопка Natural healing → бросок 1D3 → распределить по активным ранам:
- Собрать все wounds с `damage_remaining > 0`
- Если только одна — весь roll ей
- Если несколько — делить `roll // n` с остатком, начиная с самых лёгких (чтобы доступные к закрытию закрылись быстрее) — или по выбору GM
- Каждой ране — history entry

Можно сделать автоматический распределитель ИЛИ показать модалку «Распределите 3 HP между ранами» со слайдерами. В мокапе — пока простой вариант: метод выбирает рану и применяет к ней.

### 8.5. Medicine и First Aid cross-effects

RAW нюансы (можно не реализовывать сразу):
- Medicine doubles natural healing rate to 2D3/week — применяется пассивно, пока персонаж на лечении
- Medicine может вылечить эффекты major wound (возврат характеристик)
- Quality of medical care modifiers (RAW p. 136, табл.) — difficult / normal / easy roll в зависимости от условий

---

## 9. Броня (worn armor section)

### 9.1. Отображение

Отдельная секция ниже Hit Locations. Показываются **только надетые** предметы брони (флаг `equipped: true`). Аналогично тому, как Combat показывает только equipped оружие.

Строка брони:
- Иконка (шлем / жилет / наручи / поножи)
- Название
- Chip-список покрываемых локаций
- AP value (формула или число + среднее)
- Encumbrance

### 9.2. Random armor

Если AP — формула (`1D4+1`, `2D6-2`):
- Показывается формула + "avg X" рядом
- Бросок происходит при применении damage

Если фиксированная — просто число.

### 9.3. Layering

Несколько предметов на одной локации (RAW p. 176) — все AP формулы бросаются независимо при damage, результаты суммируются.

### 9.4. Связь с локацией

`location.armor_formula` и `location.armor_avg` — вычисляются агрегированно из надетой брони, покрывающей локацию:
- `armor_formula`: concat всех формул через `+` (напр. `"1D4+1 + 2D6-2"`)
- `armor_avg`: sum средних

Это показывается в строке локации (колонка AP) и используется для визуализации в Armor-режиме силуэта.

---

## 10. Summary-панель (справа от силуэта)

### 10.1. Overview metrics (сетка 2×N)

- **Total HP** — current/max
- **Active wounds** (HPL) / **Major wound threshold** (non-HPL)
- **Natural heal rate** — 1D3/wk или 2D3/wk в зависимости от condition
- **Disabled locations** (HPL) / **Worst wound** (non-HPL)

Cards с приглушённым фоном. Read-only.

### 10.2. Active conditions

Бейджи всех текущих состояний персонажа:
- Bleeding (с указанием локации)
- Prone (с причиной)
- Unconscious
- Major wound active
- Stunned
- etc.

Бейджи кликабельны (снимают состояние), но авто-состояния (`auto: true`, выведенные из HP локации) нельзя снять вручную — они привязаны к HP.

---

## 11. Взаимосвязь с sidebar status-icons

Статус-иконки в sidebar делятся на:

- **Manual** — игрок/GM переключает (bleeding, stunned, grappled)
- **Auto** — вычисляется из состояния (prone = leg или abdomen disabled; unconscious = head disabled или hp<=2)

Auto-иконки:
- Подсвечены янтарным (не красным) — визуально отличаются от manual
- Нельзя отключить кликом (disabled), только через исправление причины
- Tooltip показывает причину: `"Prone (auto: Left Leg disabled)"`

---

## 12. Интеракции — сводная таблица

| Элемент | Действие | Эффект |
|---|---|---|
| Silhouette location | click | open Add wound modal (location prefilled) |
| Silhouette location | hover | tooltip с HP/AP/wounds |
| Viz tabs | click | переключение режима подсветки |
| Mode toggle HPL/non-HPL | click | переключение режима (системный) |
| Location row | click | expand/collapse wounds |
| Location `+` button | click | open Add wound modal |
| Wound row | click | expand/collapse details |
| Wound Heal button | click | open Heal modal (wound preselected) |
| Wound Delete button | click | delete wound, recompute HP |
| Wound Edit button | click | open editor (unlock mode) |
| Heal action (First Aid/Medicine/Natural/Other) | click | open Heal modal (method preselected) |
| Armor item | click (unlock) | edit armor (в Items tab) |
| History toggle | click | show/hide older entries |

---

## 13. Бэкенд-задачи

Изолированные функции, которые нужно реализовать в системе (независимо от UI):

1. **`applyDamage({...})`** — см. §6.1. Используется из UI модалки и из weapon attacks.
2. **`rollArmorForLocation(location)`** — собирает AP формулы всех надетых предметов, покрывающих локацию, бросает.
3. **`computeLocationHP(location, actor)`** — возвращает `hp_max - sum(active_wounds on location).damage_remaining`.
4. **`computeLocationStatusEffect(location)`** — возвращает объект эффекта или null.
5. **`computeAutoConditions(actor)`** — возвращает массив auto-conditions (prone, unconscious, etc.) на основе состояния локаций и общего HP.
6. **`healWound(wound, method, rollType, note)`** — применяет лечение, обновляет history.
7. **`distributeNaturalHealing(actor, totalHP)`** — распределяет natural HP по активным ранам.
8. **`checkMajorWound(wound, actor)`** — проверяет `damage >= threshold`, маркирует рану, публикует в чат.
9. **`compositionTemplate(type)`** — возвращает SVG template + default locations.
10. **Chat messages** — стандартизированный формат: damage applied, armor rolled, healing applied, major wound triggered.

---

## 14. Что НЕ входит в мокап (требует отдельной реализации)

- Magic / tech healing механики конкретных систем (Cthulhu, Rune Quest, etc.)
- Poison / disease прогрессия во времени
- Autoматические bleeding tick'и (по RAW: 1 HP/round при bleed out) — по требованию реализуется таймером, сейчас ручной статус
- Major wound table (d100) с 15 результатами и permanent characteristic loss — надо отдельный pop-up с таблицей
- Experience check на rolled skills лечения
- Medical conditions modifier для natural healing (difficult при плохих, easy при отличных)
- Custom body composition editor — UI для создания собственных templates
- Editing modes (unlock mode) для брони и локаций

---

## 15. Изменения относительно старого UI

| Аспект | Было | Стало |
|---|---|---|
| Локации | список без визуала | силуэт + список |
| Раны | скалярное число на локации | объекты с описанием, типом, статусом, историей |
| AP | строка в таблице | бросок при damage, показ формулы и среднего |
| Healing | ничего | 4 метода с модалкой выбора раны |
| Major wound | отсутствовал | для non-HPL работает полностью |
| Status effects | ручные иконки | часть авто-вычисляется из HP локаций |
| Armor display | отсутствовал | секция ниже локаций, только equipped |
| Non-HPL поддержка | нет | через toggle и composition `general` |
| Broken limb | отсутствовал | при damage ≥ 2× HP |
| Wound history | отсутствовал | массив записей с последней + раскрытием |
