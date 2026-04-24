# BRP Character Sheet — Combat Tab Specification

Спецификация таба Combat. HTML-мокап показывает locked-режим (отображение и игровые интеракции без редактирования). Режим unlock для редактирования значений — отдельная реализация.

---

## 1. Структура таба

Две секции сверху вниз:

1. **Defense** — Dodge, Parry, Shield (сверху, компактные карточки)
2. **Weapons** — только надетое / активное оружие

Биография, характеристики и прочее в этот таб не входят. Оружие, не находящееся в активном слоте (не надето), отображается только в табе Items.

---

## 2. Секция Defense

### 2.1. Визуал

Горизонтальная сетка из трёх компактных карточек. Каждая карточка:

- Иконка типа защиты слева (мятный цвет, 28×28)
- Название (Cinzel, uppercase, 12px) + подпись мелким шрифтом (11px, muted)
- Процент в пилюле справа (мятный, 13px)

### 2.2. Типы защиты

| Тип | Источник % | Подпись |
|---|---|---|
| Dodge | навык персонажа (`DEX × 2` в BRP) | `DEX-based` |
| Parry | навык выбранного оружия | `select weapon` |
| Shield | навык щита | `not equipped` если нет щита |

### 2.3. Интеракции

- **Dodge** — клик = бросок под %, результат в чат
- **Parry** — клик открывает селектор оружия:
  1. Показать список надетого оружия с флагом `can_parry = true` (melee + shields)
  2. Игрок выбирает оружие
  3. Бросок под skill% этого оружия
  4. Запомнить последний выбор как default для повторного клика (опционально — сделать `Parry (Combat Knife)` вместо пустого)
- **Shield** — активен, только если щит в надетых; клик = бросок под skill% щита

### 2.4. Бэкенд (задачи для реализации)

- Flag `weapon.can_parry` — boolean, определяется типом оружия (все melee = true, у ranged = false, у shield = true)
- Resolver для Parry: при клике собрать все `equipped && can_parry` предметы, передать в UI
- Default Dodge formula — `DEX × 2`, рассчитывается системой
- Shield skill — отдельный навык (Shield Parry) или тянется с предмета щита (на твоё решение; в BRP RAW — навык Shield с привязкой к конкретному типу)

---

## 3. Секция Weapons

### 3.1. Header

Заголовок `WEAPONS` + линия-разделитель + две кнопки справа:
- **Sort** — открывает меню сортировок
- **Add** — открывает диалог добавления оружия (переход в Items, или прямо тут — на твоё решение)

### 3.2. Сортировки

Меню sort:

| Режим | Описание |
|---|---|
| By type | ranged → thrown → melee (порядок внутри типа — текущий кастомный) |
| By name (A–Z) | алфавитный |
| By skill % | по убыванию процента |
| Custom | возврат к ручному порядку (drag-drop) |

Текущий режим запоминается во флагах актора (`flags.brp-sheet.weapon-sort`).

### 3.3. Карточка оружия — структура

Двухсекционная: компактный `weapon-row` сверху, раскрываемый `weapon-details` снизу.

#### Компоновка weapon-row (grid)

```
[handle] [icon] [name+meta] [%] [damage] [range] [ammo-block] [chevron]
  12px    36px    flex      56  78       84      120           22
```

#### Колонки

1. **Handle** — drag-handle, появляется на hover, `cursor: grab`
2. **Icon** — тип оружия (pistol / rifle / bow / grenade / knife / etc.), цвет по типу:
   - Melee — красный
   - Ranged (firearm) — амбер
   - Bow — мятный
   - Thrown — зелёный
3. **Name block** — название + мета-строка (ATK, HAND, ENC)
   - `ATK ×N` — крупнее, янтарный цвет (критичная инфа для боя)
   - `1H / 2H` — one-handed / two-handed
   - `ENC N` — вес
4. **Percent pill** — skill% попадания, мятный, кликабельный → бросок
5. **Damage cell** — красная пилюля с уроном
   - Верхняя строка — `XDY+Z`
   - Нижняя — пометка `+DB` если оружие получает damage bonus, `stun` для нелетальных и т.п.
6. **Range cell** — дистанция:
   - Ranged — `XX m`
   - Thrown — `Thrown`
   - Melee — `Melee`
7. **Ammo block** — зависит от типа (см. §4)
8. **Chevron** — раскрытие деталей

### 3.4. Раскрытые детали (weapon-details)

Раскрываются по клику на chevron. Показывают:

- Hand (полное название One-handed / Two-handed)
- ENC (вес)
- Malf (диапазон malfunction для огнестрела)
- HP — прочность оружия `current / max`, красным
- Notes — произвольные заметки курсивом
- Для специфичных типов — дополнительные поля:
  - Grenade — `Radius`
  - Bow — `DB applies (Strength bow)`
  - Melee — `Parry: Yes/No`

Раскрытие только по chevron (не по клику в любое место ряда). Состояние раскрытия НЕ сохраняется между открытиями листа (сброс в collapsed при reopen).

---

## 4. Логика боеприпасов по типам оружия

### 4.1. Melee

```
Поля: —
UI: колонка ammo пустая (placeholder в сетке сохраняется для выравнивания)
```

### 4.2. Thrown (гранаты, метательные ножи)

```
Поле: count — количество предметов в инвентаре
UI: count-pill `× N` в колонке ammo
```

Трата: при атаке `count -= 1`. При `count = 0` атака невозможна (UI disabled).

### 4.3. Ranged — single-shot / bulk ammo (лук, арбалет, дробовик-одностволка)

Флаг на оружии: `single_shot = true` (или `magazine_size <= 1`).

```
Поля: ammo_current — количество снарядов в запасе
UI: ammo-mag без "/ max" (одно число)
Магазинов и кнопки reload НЕТ.
```

Лейбл в UI может быть кастомный: `ARROWS`, `BOLTS`, `SHELLS` — зависит от типа боеприпаса (опционально).

### 4.4. Ranged с обоймой (пистолеты, винтовки, пулемёты)

Флаг: `single_shot = false`, `magazine_size > 1`.

```
Поля:
- ammo_current — патронов в текущей обойме (0..magazine_size)
- magazine_size — максимум в обойме
- mag_count — количество запасных магазинов

UI:
- ammo-mag: `AMMO N / M`
- mag-row: mag-count `MAG K` + reload-btn рядом
```

**Индикация низкого запаса в обойме:**
- `.ammo-mag.low` — амбер, когда `ammo_current <= 25%` от магазина
- `.ammo-mag.critical` — красный, когда `ammo_current <= 10%` или `<= 1`

### 4.5. DB-флаг для дальнобойных

Поле `applies_db` на оружии — boolean.

| Случай | `applies_db` |
|---|---|
| Firearm (pistol, rifle, laser) | false |
| Energy weapon | false |
| Grenade (thrown) | true (вес броска зависит от силы) |
| Bow / Crossbow (обычные) | false по умолчанию, но true для strength bow (специально подогнанных луков) |
| Thrown knife / javelin | true |
| Melee | true (всегда) |

UI для ranged без DB: подпись `+DB` в damage-cell не показывается. Для melee/thrown с DB — показывается.

---

## 5. Reload-логика

### 5.1. Триггер

Клик по reload-btn рядом с mag-count.

### 5.2. Условия выполнения

| Условие | Действие |
|---|---|
| `mag_count > 0` | показать модалку подтверждения |
| `mag_count == 0` | без модалки, сразу чат-сообщение `<weapon>: No magazines remaining.` |
| Оружие не ranged-with-magazine | reload-btn не отображается вообще |

### 5.3. Модалка

```
Reload <weapon.name>? You have N magazine(s) left.
[Cancel]  [Reload]
```

### 5.4. На подтверждение

```js
ammo_current = magazine_size
mag_count -= 1
chat: "{character.name} reloaded {weapon.name}. Ammo: {magazine_size}/{magazine_size}. Magazines left: {mag_count}."
```

Пример:  
`Mikki reloaded Pistol, Laser. Ammo: 20/20. Magazines left: 1.`

### 5.5. Chat action

Сообщение публикуется в Foundry chat через `ChatMessage.create()`. Стиль — action-сообщение (не roll), видимое всем участникам сессии. Опционально — добавить иконку перезарядки в chat.

---

## 6. Модель данных оружия (предлагаемая)

```json
{
  "name": "Pistol, Laser",
  "type": "ranged",
  "skill": "pistol-laser",
  "skill_percent": 75,

  "damage": "1D8",
  "applies_db": false,

  "hands": 1,
  "enc": 1,
  "atk_per_round": 3,
  "hp": { "current": 14, "max": 14 },
  "malf": "00",

  "range_m": 20,

  "ammo": {
    "mode": "magazine",
    "current": 14,
    "magazine_size": 20,
    "mag_count": 2
  },

  "equipped": true,
  "count_in_inventory": 1,
  "sort_order": 0,
  "can_parry": false,
  "notes": "Standard sidearm. Uses energy cells."
}
```

**ammo.mode** может быть:
- `"none"` — melee
- `"count"` — thrown, count = количество штук
- `"single"` — single-shot ranged, только `current`
- `"magazine"` — full magazine logic

---

## 7. Интеракции — сводная таблица

| Элемент | Действие | Эффект |
|---|---|---|
| Defense card | click | бросок под % (Parry — сначала выбор оружия) |
| Weapon chevron | click | toggle раскрытия details |
| Weapon percent pill | click | бросок атаки под skill% |
| Weapon reload button | click | модалка подтверждения → reload |
| Weapon drag handle | drag | перестановка в Custom-режиме |
| Sort button | click | меню сортировок |
| Sort menu item | click | применение сортировки |
| Add button | click | диалог добавления оружия |

---

## 8. Бэкенд-задачи (отдельно от UI)

Сводный список того, что нужно реализовать или изменить в системе:

1. **Модель оружия** (п. 6) — добавить поля `ammo.mode`, `magazine_size`, `mag_count`, `applies_db`, `atk_per_round`, `can_parry`, `equipped`, `count_in_inventory`.
2. **Фильтр equipped** — в Combat таб попадают только предметы с `equipped: true`. Броня — аналогично в Health таб.
3. **Reload handler** — вычитает из `mag_count`, пополняет `ammo.current` до `magazine_size`, публикует chat-сообщение.
4. **Parry resolver** — при клике по Parry собирает все `equipped && can_parry`, отдаёт в UI для выбора.
5. **Dodge formula** — `DEX × 2` (уже учтено).
6. **Damage roll** — формула из `weapon.damage`, прибавить DB если `applies_db: true`.
7. **Ammo decrement** — при атаке из ranged с magazine: `ammo.current -= 1`. Если `ammo.current == 0` — UI блокирует атаку, показывает пустую обойму. При ranged-single: `ammo.current -= 1`. При thrown: `ammo.current -= 1` (и `count_in_inventory -= 1` если они синхронизированы).
8. **Sort persistence** — запомнить `flags.brp-sheet.weapon-sort` = `"type" | "name" | "percent" | "custom"`.
9. **Custom order** — поле `sort_order` на оружии, меняется при drag.
10. **Drag & drop** — SortableJS на `#weapons-list` с handle `.handle`.

---

## 9. Что НЕ входит в мокап

- Диалог добавления оружия (кнопка Add — заглушка).
- Логика выбора оружия при Parry — показано концептуально в тексте.
- Индикация блокировки атаки при пустой обойме / count=0 — реализуется в бэкенде.
- Таб Items и переключение equipped-статуса.
- Броня (отдельная секция в табе Health).
- Unlock-режим для редактирования значений оружия.
- Chat-сообщения в Foundry API (в мокапе показан стилизованный toast).

---

## 10. Изменения относительно старого UI

| Аспект | Было | Стало |
|---|---|---|
| Dodge в списке оружия | да, как `#ATT 0 HAND NONE` | вынесен в секцию Defense |
| Parry | отсутствовал явно | отдельная карточка в Defense с выбором оружия |
| Shield | отсутствовал явно | карточка в Defense |
| ATK (количество атак) | мелким шрифтом `#ATT N` | янтарный акцент `ATK ×N` в мете |
| AMMO | одно поле `14/20` или некорректное `7/6` | раздельно: `AMMO current/max` + `MAG count` + reload |
| Reload | не было | кнопка с модалкой + chat-сообщение |
| DB | `-` на неприменимых | скрыт для неприменимых |
| HP оружия | всегда видно | только в раскрытых деталях |
| HAND / ENC | в мета-строке под именем | видно в мете + подробно в деталях |
| Иконка типа | отсутствовала | добавлена слева, цвет по типу |
| Сортировка | не было | меню: type / name / % / custom |
| Фильтр надетого | не было | только equipped отображается |
| Всё оружие в одном списке | да | да (деления на подсекции нет, сортировка по типу даёт группировку) |
