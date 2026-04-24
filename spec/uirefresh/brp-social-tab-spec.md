# BRP Character Sheet — Social Tab Specification

Спецификация таба Social. Содержит Allegiance, унифицированные социальные скоры (Reputation/Honor/Status), Contacts, Factions. Все блоки работают на основе Foundry item объектов (по аналогии с оружием, бронёй, классом).

---

## 1. Структура таба

Два обязательных блока и два опциональных:

1. **Allegiance** — обязательный
2. **Reputation & Status** — обязательный (унифицированный контейнер для reputation/honor/status)
3. **Contacts** — опциональный (включается toggle-чипом в header)
4. **Factions** — опциональный

### 1.1. Переключатель блоков

В header таба (до секций) — горизонтальный ряд chip-тумблеров:

```
Show sections: [✓ Allegiance] [✓ Reputation] [✓ Contacts] [✓ Factions]
```

- Allegiance / Reputation — forced active (нельзя выключить)
- Contacts / Factions — opt-in, включаются/выключаются кликом
- Состояние сохраняется на уровне актора (`actor.flags.brp-sheet.social-sections`)

### 1.2. Секции внутри

Каждая секция имеет заголовок, счётчик, кнопку `+` для добавления. Сворачиваются кликом по заголовку. Состояние collapse сохраняется.

---

## 2. Общий принцип: всё через Foundry objects

**Key decision:** Allegiance, Reputation, Contacts, Factions — все реализуются как **Foundry items** с соответствующими типами (`allegiance`, `reputation`, `contact`, `faction`). У каждого свой ID, свой sheet, свои поля, хранятся в world / compendium, могут быть переиспользованы между персонажами.

### 2.1. Поведение объектов (по аналогии с Items, Class, Background)

На карточке в UI отображается **компактная сводка** объекта. Полные данные редактируются в отдельной sheet, которая открывается:

- **Double click** по карточке → `object.sheet.render(true)` (сквозная механика)
- **Кнопка Open** (иконка стрелки) в углу карточки → то же
- **Right click** / кнопка Menu → контекстное меню

### 2.2. Контекстное меню (сквозное для всех типов)

| Item | Действие |
|---|---|
| Open object | `object.sheet.render(true)` |
| (type-specific действия) | см. разделы ниже |
| Remove from character | открепить от персонажа, не удаляет сам объект |

### 2.3. Персонажа → объекты

На уровне актора хранится массив ссылок для каждого типа:

```json
{
  "allegiances": ["Item.UUID_1", "Item.UUID_2"],
  "reputations": ["Item.UUID_3"],
  "contacts": ["Item.UUID_4"],
  "factions": ["Item.UUID_5"]
}
```

Можно использовать Foundry embedded items (каждый персонаж имеет свои копии) или references (общие для мира). Рекомендуется **embedded** для allegiance/reputation (значения персональные), **references** для factions (общий для кампании), **embedded** для contacts (текущая значимость уникальна).

---

## 3. Allegiance

### 3.1. Суть механики (BRP RAW p. 298-299)

Привязка персонажа к идее, фракции, божеству. Универсальный механизм — может обозначать моральные оси (Law vs Chaos), пантеоны, политические идеологии, принадлежность к организации.

- Процент 0-100%
- Несколько allegiance одновременно
- Могут быть связаны как enemy (противоположные)
- При 75%+ — `transcendent`, персонаж получает title/rank от покровителя

### 3.2. Поля объекта Allegiance (внутри Foundry sheet)

По скрину старого интерфейса:

- Name
- Total (current %)
- Base points (стартовое значение)
- Improvement points (накопленные рост)
- Title (ручное текстовое поле)
- Rank (ручное текстовое поле)
- Enemy allegiance (ссылка на другой allegiance объект)
- Allegiance Improvement (чекбокс — рос ли в этой сессии)
- Description (rich text)
- Benefits (rich text)
- GM notes (rich text)

### 3.3. UI карточка на листе

Компактная карточка с:

- **Primary toggle** — звёздочка-кружок слева, primary только одна
- **Name** — Cinzel, крупно
- **Badge `Primary`** — если primary
- **Badge `★ 75%+`** — если transcendent (total ≥ 75)
- **Total %** — крупно, справа
- **Action buttons** — Open sheet, Context menu
- **Bar** — визуализация % с маркером на 75% (amber tick, подпись `75%`)
- **Detail grid** (2×2):
  - Title
  - Rank
  - Enemy allegiance (имя + иконка черепа)
  - Enemy points (% противника, подтягивается автоматически)

### 3.4. Primary toggle

Только одна allegiance может быть primary. Примерный бейдж + визуальная подсветка (amber left-border, subtle gradient).

Primary — это "основная лояльность персонажа". Одна из механик BRP: primary allegiance даёт персонажу его титул/роль в обществе.

### 3.5. Transcendent (75%+)

Когда total ≥ 75%:
- Появляется бейдж `★ 75%+` рядом с именем
- Если Title пустой — в поле Title появляется suggested-текст `INSERT TITLE (75%+ earned)` амбером курсивом
- Title заполняется вручную игроком/GM (например, `Knight-Commander`, `High Priest`, `Arch-Heretic`)

### 3.6. Enemy auto-link

Поле `enemy_id` — ссылка на другой allegiance объект этого же персонажа. При выборе enemy:
- На карточке показывается его имя + иконка skull
- Enemy points подтягивается автоматически из связанного объекта
- Изменения процента противника обновляют отображение

Editing `enemy_id` — через dropdown в sheet редактирования (все allegiance персонажа, кроме самого себя).

Это **двусторонняя** ли связь? Решение: **одностороннее** назначение. Law может указать Chaos как enemy, но Chaos не обязан указывать Law (даже если по смыслу). Автоматическая синхронизация опасна — игрок может хотеть разные значения для разных сеттингов.

### 3.7. Контекстное меню allegiance

- Open allegiance object (sheet)
- Set/Unset as primary
- Remove from character

### 3.8. Визуальная градация total

Цвет ac-total:
- 0-24% — приглушённый (текст muted)
- 25-49% — обычный
- 50-74% — мятный (значительная приверженность)
- 75-100% — амбер (transcendent)

### 3.9. Порядок

По умолчанию primary сверху, остальные по total desc. Можно перетаскивать (custom order) — на будущее.

---

## 4. Reputation & Status (унифицированный)

### 4.1. Суть

**Key decision:** Reputation, Honor и Status — **одна механика с разными категориями**. Секция называется `Reputation & Status` и содержит все социальные scores.

Вместо трёх отдельных секций — одна с **category badge** на каждой карточке:
- `reputation` (синий) — общая известность
- `honor` (амбер) — личная честь, кодекс
- `status` (пурпурный) — формальный ранг, членство

Создание нового — игрок выбирает категорию и scope. Можно иметь:
- Общий Reputation
- Локальный `Pilot renown (Kassia sector)`
- Личный Honor
- Guild Standing (status в гильдии)
- Military rank (статус)

### 4.2. Поля объекта Reputation

- Name
- Category (`reputation` / `honor` / `status`)
- Scope (freeform — `Global`, `Kassia sector`, `Personal`, `Pilots Guild`)
- Total %
- Description (rich text)
- GM notes

### 4.3. UI карточка

Компактный ряд grid:

```
[Name + badge(category)] [bar 140px] [value 15px] [actions]
[scope mini-text]
```

- **Name** — plain text
- **Category badge** — цветной pill рядом с именем
- **Scope** — мелким шрифтом под именем (e.g. `Kassia sector`)
- **Bar** — 140px ширина, цвет по категории (синий/амбер/пурпурный)
- **Value** — `35%`, крупно
- **Actions** — Open, Menu

### 4.4. Порядок

По умолчанию группируется по категории (reputation → honor → status), внутри по value desc. Можно переопределить.

### 4.5. Контекстное меню

- Open sheet
- Change category
- Remove from character

---

## 5. Contacts

### 5.1. Суть

NPC-связи персонажа. Люди, которых он знает и может использовать как ресурс. Может быть подлинковано к NPC-актору в Foundry (если NPC существует в кампании).

### 5.2. Поля объекта Contact

- Name
- Role / description (бывший командир, бармен, брат)
- Location (где найти)
- Relation (перечисление: `ally`, `friend`, `neutral`, `suspect`, `enemy`)
- Linked NPC actor (optional reference на Foundry Actor)
- Notes (freeform)

### 5.3. UI карточка

Grid row:

```
[avatar initials 32px] [name + role] [relation badge] [location] [actions]
```

- **Avatar** — круглая иконка с инициалами (или portrait, если contact подлинкован к актору с изображением)
- **Name** — главный текст
- **Role** — подпись под именем
- **Relation badge** — pill с цветом по типу:
  - `ally` — зелёный
  - `friend` — мятный
  - `neutral` — серый
  - `suspect` — амбер
  - `enemy` — красный
- **Location** — справа, приглушённо, uppercase
- **Actions** — Menu button

### 5.4. Linked NPC

Если `linked_actor_id` заполнен:
- Avatar использует аватар NPC
- Double click → открывает NPC sheet (вместо contact sheet)
- В контекстном меню появляется `Unlink from NPC` / `Open NPC`

Позволяет GM'у держать синхронизированными "что игрок знает об NPC" и "сам NPC".

### 5.5. Порядок

По умолчанию — по relation (ally → friend → neutral → suspect → enemy). Можно drag-drop для custom order.

### 5.6. Контекстное меню

- Open contact object (sheet)
- Open linked NPC (если есть)
- Change relation
- Remove from character

---

## 6. Factions

### 6.1. Суть

Организации / гильдии / ордена, в которых состоит персонаж. Может совпадать с allegiance по названию, но концептуально отличается: allegiance — привязка, faction — членство.

Пример: персонаж может иметь `Free Stars Alliance` и как allegiance (верен идеологии), и как faction (формально член), с разными %.

### 6.2. Поля объекта Faction

- Name
- Description
- Role (моя роль: `Member`, `Sympathizer`, `Certified`, `Infiltrator`)
- Rank (формальный ранг: `Senior`, `Lieutenant`, `—`)
- Reputation within (% внутренней репутации)
- Notes (личная роль GM notes)

### 6.3. UI карточка

Раскрывающаяся карточка:

- Header: name (Cinzel) + rank inline справа amber
- Grid 3-колоночный с Role / Reputation within / Notes (усечённые)

### 6.4. Factions vs Allegiance — когда что

| | Allegiance | Faction |
|---|---|---|
| Суть | Моральная/идеологическая привязка | Членство в организации |
| Масштаб | Абстрактный (Law, Chaos, Gods) | Конкретная организация |
| Enemy mechanic | Да (прямой антагонист) | Нет |
| Transcendent at 75% | Да | Нет |
| Примеры | Law, Chaos, Order of Cthulhu | Pilots Guild, City Watch |

Игрок может иметь оба — это нормально. Например `Allegiance: Free Stars Alliance 48%` + `Faction: Free Stars Alliance (Sympathizer)` — означает идеологическую симпатию плюс формальное членство.

### 6.5. Контекстное меню

- Open faction object
- Remove from character

---

## 7. Интеракции — сводная таблица

| Элемент | Действие | Эффект |
|---|---|---|
| Section toggle chip | click | включить/выключить показ секции |
| Section header | click | collapse/expand |
| Add button (`+`) | click | создать новый объект типа (открывает creation flow) |
| Any card | double click | open Foundry sheet объекта |
| Any card | right click | context menu |
| Open icon | click | open sheet |
| Menu icon | click | show context menu |
| Primary toggle | click | переключить primary allegiance |

---

## 8. Модель данных

### 8.1. Actor-level

```json
{
  "allegiances": ["Item.aaa", "Item.bbb"],
  "reputations": ["Item.ccc", "Item.ddd"],
  "contacts": ["Item.eee"],
  "factions": ["Item.fff"],
  "flags": {
    "brp-sheet": {
      "social-sections": { "contacts": true, "factions": true },
      "primary_allegiance": "Item.aaa"
    }
  }
}
```

### 8.2. Allegiance object

```json
{
  "type": "allegiance",
  "name": "Order of the Silver Hand",
  "system": {
    "total": 82,
    "base": 60,
    "improvement_points": 22,
    "title": "Knight-Commander",
    "rank": "Lieutenant",
    "enemy_id": "Item.bbb",
    "improvement_check": false,
    "is_transcendent": true,
    "description": "...",
    "benefits": "...",
    "gm_notes": "..."
  }
}
```

### 8.3. Reputation object

```json
{
  "type": "reputation",
  "name": "Pilot renown",
  "system": {
    "category": "reputation",
    "scope": "Kassia sector",
    "total": 58,
    "description": "...",
    "gm_notes": "..."
  }
}
```

### 8.4. Contact object

```json
{
  "type": "contact",
  "name": "Дорн Келлер",
  "system": {
    "role": "Бывший командир · Служба безопасности",
    "location": "Port Kassia",
    "relation": "ally",
    "linked_actor_id": "Actor.zzz",
    "notes": "..."
  }
}
```

### 8.5. Faction object

```json
{
  "type": "faction",
  "name": "Pilots Guild",
  "system": {
    "role": "Certified member",
    "rank": "Senior",
    "reputation_within": 68,
    "description": "...",
    "notes": "..."
  }
}
```

---

## 9. Бэкенд-задачи

1. **Регистрация новых Foundry item types:** `allegiance`, `reputation`, `contact`, `faction`
2. **Sheet templates** для каждого типа (по аналогии с существующими class/background)
3. **`setPrimaryAllegiance(actor, allegiance_id)`** — установка primary, снятие со всех остальных
4. **`getEnemyAllegiance(allegiance)`** — resolve по enemy_id, возвращает объект или null
5. **`detectTranscendent(allegiance)`** — `allegiance.total >= 75`
6. **`addSocialObject(actor, type, item_id)`** — добавить ссылку в актор
7. **`removeSocialObject(actor, type, item_id)`** — убрать ссылку (не удалять объект)
8. **`getLinkedActor(contact)`** — resolve для NPC contact
9. **Persistence** — sections toggle, sort order, collapsed states в flags
10. **Context menu handlers** для всех четырёх типов (по аналогии с Class/Background)

---

## 10. Что НЕ входит в мокап

- Full sheets для allegiance / reputation / contact / faction — это отдельные окна Foundry, заложены как существующие (на примере Allegiance sheet который ты уже показал)
- Creation flow новых объектов — клик на `+` должен открывать стандартный Foundry item creation
- Linked NPC mechanic — концептуально заложено, реализация через Foundry actor references
- Improvement rolls для allegiance (RAW p. 299) — отдельная механика "прокачки" лояльности
- Reputation rolls (D100 ≤ reputation % для социальных ситуаций) — не в Social tab, происходит при нужде
- Drag-drop reorder между карточками
- Filters / search — можно добавить на будущее при росте списка
- History для allegiance (когда и за что росла/падала)

---

## 11. Отличия от старого UI

| Аспект | Было | Стало |
|---|---|---|
| Allegiance таблица | 6 колонок плоская таблица | карточки с иерархией |
| Primary allegiance | чекбокс в таблице | звёздочный toggle + визуальная подсветка |
| Enemy | текстовое поле | ссылка на другой allegiance, авто-подтяжка % |
| Enemy points | отдельная колонка с числом | автоматически из связанного объекта |
| 75%+ indicator | отсутствовал | badge + bar threshold + suggested Title placeholder |
| Reputation | плоская таблица одна строка | унифицированная секция с категориями (reputation/honor/status) |
| Honor / Status | отсутствовали | в унифицированной Reputation секции с badges |
| Contacts | отсутствовали | карточки с avatar, relation badges, linked NPC |
| Factions | отсутствовали | секция с role / rank / reputation within |
| Optional sections | всё всегда видно | chip toggles для Contacts / Factions |
| Объекты в системе | частично | все блоки через Foundry items, double click → sheet |
