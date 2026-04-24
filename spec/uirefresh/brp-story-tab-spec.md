# BRP Character Sheet — Story Tab Specification

Спецификация таба Story. Персональный журнал игрока — «что происходит с моим персонажем в кампании». Содержит активные квесты, хронологический feed записей с фильтрами по типам, и отдельное окно Timeline с двумя видами отображения.

---

## 1. Структура таба

```
┌─ STORY tab ────────────────────────────┐
│  Title + [Open timeline] button         │
│                                         │
│  ▼ ACTIVE QUESTS                        │
│    [quest cards]                        │
│                                         │
│  ▼ JOURNAL                              │
│    [filter chips + search]              │
│    [journal feed]                       │
│                                         │
└─────────────────────────────────────────┘
```

Две секции, обе сворачиваемые:
1. **Active Quests** — pinned-блок с активными квестами (completed/failed не показываются здесь)
2. **Journal** — хронологический feed со всеми записями (включая завершённые квесты)

В заголовке таба — кнопка `Open timeline` для открытия отдельного окна с таймлайном.

---

## 2. Гибридная модель хранения

**Ключевое решение:**
- **Quests** — Foundry items (shared across party by default, можно делать personal)
- **Journal entries** остальных типов — inline blocks на актёре (`actor.system.story.entries[]`)

Обоснование: quests часто общие (GM выдаёт всей группе, статус отслеживается централизованно). Остальные типы записей (observations, decisions, notes) персональны для каждого игрока.

### 2.1. Quest as Foundry item

- Тип объекта: `quest`
- Имеет sheet для rich content
- Можно привязать к нескольким персонажам (shared)
- Опционально — personal (только для одного актёра)
- Изменение статуса GM'ом виден всем привязанным игрокам

### 2.2. Journal entries как inline structure

Массив объектов внутри `actor.system.story.entries`:

```json
{
  "entries": [
    {
      "id": "uuid",
      "type": "session-log" | "npc-encounter" | "discovery" | "decision" | "milestone" | "note",
      "title": "Chose civilians over mission",
      "content": "multiline rich text",
      "session": "Session 12",
      "in_game_date": "2294-08-14",
      "real_date": "2026-04-18",
      "pinned": false,
      "linked": ["contact:dorn", "quest:q1"]
    }
  ]
}
```

**Quests не попадают в этот массив** — они отдельные items. Но при рендере feed собираются все вместе для хронологии.

---

## 3. Типы записей

| Type | Назначение | Визуал |
|---|---|---|
| `session-log` | Общая запись итогов сессии | blue icon |
| `quest` | Квест (особый подтип, Foundry item) | amber icon |
| `npc-encounter` | Встреча с NPC | pink icon |
| `discovery` | Находка, улика, тайна | mint icon |
| `decision` | Важный выбор | red icon |
| `milestone` | Узловой момент, достижение | purple icon |
| `note` | Свободная заметка, теория | neutral icon |

Все типы имеют одну и ту же базовую структуру (title, content, timestamps, linked), отличаются только иконкой и цветовым акцентом.

---

## 4. Active Quests section

### 4.1. Поля quest объекта

- **name** — короткое имя квеста
- **status**: `active` / `completed` / `failed` / `abandoned`
- **objective** — основная цель (1-3 предложения)
- **session_given** — когда получен
- **updates[]** — массив апдейтов: `{date, text}` (развёрнутая история квеста)
- **linked[]** — ссылки на Contacts, Factions, другие Quests, Items
- **description** — полный rich text в sheet
- **gm_notes** — rich text в sheet

### 4.2. UI карточка

```
┌─ Silver Hand Initiation ─────── active ─── [⋯]┐
│  Complete three acts of valor...              │
│  Given: Session 7 · Linked: 1 · Updates: 1    │
│  ── Recent updates ──                         │
│   Session 8  First act: defended convoy...    │
└────────────────────────────────────────────────┘
```

- Левый border 2px amber (или цвет по статусу)
- Name в Cinzel uppercase
- Status badge (active amber, completed green, failed red, abandoned gray)
- Objective строкой курсивом
- Meta line с session_given, linked count, updates count
- Recent updates (последние 2) — разворачиваются в nested list

### 4.3. Visibility по статусу

- `active` → в Active Quests section
- `completed`, `failed`, `abandoned` → автоматически уходят в Journal feed как entries типа `quest`

Это ключевое поведение: section показывает только то что сейчас актуально, остальное архивируется в журнал.

### 4.4. Контекстное меню quest

- Open quest (sheet)
- Add update
- Mark completed / failed / abandoned
- Remove from character

### 4.5. Quest sharing mechanics

По умолчанию новый quest — **shared** (персонаж + GM могут привязать других персонажей). GM может изменить на personal в sheet квеста.

Реализуется через стандартный Foundry mechanism ownership + custom поле `shared_with: [actor_ids]`.

---

## 5. Journal section

### 5.1. Toolbar

Горизонтальная панель над feed:

- **Type chips** — toggles по типам (7 штук). Click выключает/включает.
- **Search** — живой поиск по title + content
- Каждый chip с counter (сколько записей этого типа)

Состояние фильтров сохраняется в `actor.flags.brp-sheet.story.filters`.

### 5.2. Feed

Вертикальный список записей. Сортировка:
1. Сначала pinned (starred) записи
2. Потом по real_date desc (самые свежие)

### 5.3. UI записи

```
┌─ [icon] Chose civilians over mission  [decision]  S12 · 2294-08-14  [★][⋯]┐
│                                                                           │
│        Во время атаки на шахтёрскую станцию выбрал эвакуировать          │
│        рабочих, хотя это стоило двух часов задержки...                   │
│                                                                           │
│        [🔗 contact:dorn]                                                  │
└───────────────────────────────────────────────────────────────────────────┘
```

- Type icon слева (по цвету типа)
- Title жирным
- Pin-звёздочка (если pinned)
- Type badge справа
- Date pair: session mint + in-game date dimmed
- Actions: Pin toggle, Menu
- Content (12 px, text-dim, line-height 1.6, preserve whitespace)
- Linked chips внизу — кликабельные pill'ы с типом связи и ID

### 5.4. Linked references

Ссылки в `linked[]` имеют формат `"{kind}:{id}"`:
- `contact:uuid` → открывает Contact sheet
- `faction:uuid` → открывает Faction sheet
- `quest:uuid` → открывает Quest sheet
- `item:uuid` → открывает Item sheet
- `entry:uuid` → переход к другой journal entry

Ссылки цветовые по типу, click открывает целевой объект. Если объект удалён — отображается orphan-стилем (перечёркнуто, не кликабельно).

### 5.5. Интеракции

- **Double click** по записи → open editor modal (или sheet для quest)
- **Right click** → context menu (Edit / Pin / Duplicate / Delete)
- **Pin button** → toggle pinned, rerender с перестановкой
- **Click по linked chip** → open linked object

### 5.6. Sorting

В feed — жёсткая сортировка (pinned → real_date desc). Нет переключателя сортировок в отличие от других табов. Причина: journal — хронологический по смыслу. Pin — способ "поднять" запись при необходимости.

---

## 6. Timeline overlay

Открывается кнопкой `Open timeline` в header таба. Overlay на весь экран с прозрачным фоном.

### 6.1. Header timeline окна

- Title `Story Timeline`
- **View switcher** — два режима: `Sessions` / `Parallel lanes`
- **Close button**

### 6.2. View 1 — Sessions (горизонтальная лента)

Колонки по сессиям слева-направо. Под общей осью времени. Каждая сессия — вертикальная стопка событий этой сессии.

```
──●──────●──────●──────●──●──
  S7     S8     S9    S10 S12
  │      │      │      │   │
  ┌─┐    ┌─┐    ┌─┐    ┌─┐ ┌─┐
  │ │    │ │    │ │    │ │ │ │
  └─┘    └─┘    └─┘    └─┘ └─┘
  Silver Convoy  Ship  Milestone Decision
```

Структура:
- Вертикальная линия с dots для каждой сессии
- Под dot — session label + in-game date
- Под header'ом — stack карточек-событий, относящихся к этой сессии
- Каждая карточка: иконка типа + title + truncated content (2 строки max)

Включает **все** события: journal entries + quest updates.

### 6.3. View 2 — Parallel lanes

N горизонтальных дорожек по типам событий. Каждая дорожка — одна ось времени, события на ней как точки.

```
Session logs  ─────●─────●─────────●───
Quests        ──●──────●─────●─────────
NPCs          ────●───────────●────────
Discoveries   ──────────●──────●───────
Decisions     ──────────────●──────────
Milestones    ───────●────────────────
Notes         ─────────────────●───────
```

Структура:
- Левая колонка 140px — label типа с иконкой и counter
- Правая часть — track с session markers (вертикальные тонкие линии с подписями сессий) и events (dots)
- Event-dot hover показывает tooltip с title + session

Включает все события независимо от типа, каждый в свою дорожку.

### 6.4. Переключение view

View switcher вверху overlay. Клик сохраняет `filterState.timelineView` и перерисовывает. Можно сохранить выбранный режим в `actor.flags.brp-sheet.story.timeline-view`.

### 6.5. Интеракции с event'ами в timeline

- Hover — tooltip с title и session
- Click — (заложено на будущее) прокрутка в feed к соответствующей entry, или open sheet/editor напрямую. В мокапе — только tooltip.

---

## 7. Временные метки (timestamps)

Каждая запись имеет три поля времени:

| Поле | Назначение | Формат |
|---|---|---|
| `real_date` | Реальная дата создания записи | ISO `2026-04-18` |
| `in_game_date` | Дата в мире игры | freeform text |
| `session` | Номер/имя сессии | freeform (`Session 12`, `Prologue`) |

- **real_date** — автоматически при создании (editable)
- **in_game_date** — ручной ввод игроком/GM
- **session** — ручной, подставляется из активной сессии (если есть, или по last entry)

Для сортировки в feed используется `real_date` (с pinned поверх). Для группировки в timeline — `session`.

---

## 8. Permissions

Стандартный Foundry mechanism:
- Owner актёра (игрок) может CRUD записи
- GM может всё
- Other players — read-only (если sheet shared)

Поле `gm_only: boolean` на записи — видна только GM'у (для GM notes внутри персонажа). В мокапе не реализовано, на будущее.

---

## 9. Модель данных

### 9.1. Actor-level

```json
{
  "system": {
    "story": {
      "entries": [
        { "id": "j1", "type": "decision", ... }
      ]
    }
  },
  "quests": ["Item.q1", "Item.q2"],
  "flags": {
    "brp-sheet": {
      "story": {
        "filters": { "types": ["session-log", "quest", ...], "search": "" },
        "collapsed": { "quests": false, "journal": false },
        "timeline-view": "horizontal"
      }
    }
  }
}
```

### 9.2. Quest object (Foundry item)

```json
{
  "type": "quest",
  "name": "Silver Hand Initiation",
  "system": {
    "status": "active",
    "objective": "Complete three acts of valor...",
    "session_given": "Session 7",
    "updates": [
      { "date": "Session 8", "text": "First act: defended the convoy..." }
    ],
    "linked": ["faction:silver-hand"],
    "description": "...",
    "gm_notes": "...",
    "shared_with": ["Actor.a1", "Actor.a2"]
  }
}
```

### 9.3. Journal entry (inline)

```json
{
  "id": "j1",
  "type": "decision",
  "title": "Chose civilians over mission",
  "content": "rich text content...",
  "session": "Session 12",
  "in_game_date": "2294-08-14",
  "real_date": "2026-04-18T14:20:00Z",
  "pinned": true,
  "linked": ["contact:dorn"],
  "gm_only": false
}
```

---

## 10. Бэкенд-задачи

1. **Регистрация Foundry item type `quest`** с sheet template
2. **`addJournalEntry(actor, entry)`** — CRUD для inline entries
3. **`editJournalEntry(actor, id, fields)`**
4. **`deleteJournalEntry(actor, id)`**
5. **`togglePinned(actor, id)`**
6. **`addQuestUpdate(quest, {date, text})`**
7. **`setQuestStatus(quest, status)`** — при смене на completed/failed/abandoned автоматически мигрирует в journal feed как `quest` entry (или оставляем в items и просто не показываем в Active section — второй вариант проще, выбран в мокапе)
8. **`resolveLinked(link)`** — по `"contact:id"` находит реальный объект
9. **`renderOrphanLink(link)`** — обработка случая когда целевой объект удалён
10. **`getAllStoryEvents(actor)`** — объединяет journal entries + quest updates в единый поток (для timeline)
11. **`groupBySession(events)`** — для horizontal view
12. **`groupByType(events)`** — для lanes view
13. **Persistence** — фильтры, состояния collapse, выбранный timeline view

---

## 11. Что НЕ входит в мокап

- Автоматическое определение активной сессии (нужна интеграция с системой Foundry combat/session management)
- Реал-тайм синхронизация изменений quest между игроками одной party (Foundry делает автоматом, нужно проверить)
- Rich text editing прямо в карточке — editor через модалку
- Image embedding в entries
- Export journal в PDF / markdown
- Search по linked objects (только по тексту)
- Timeline pan & zoom для длинных кампаний
- Filter timeline по типам (сейчас timeline показывает все типы)
- Session management — отдельной сущности `Session` нет, сессия это просто string в полях

---

## 12. Что отличается от старого UI

На момент начала проектирования этой вкладки её просто не было в системе. Всё что здесь описано — новый функционал.

Если сравнивать с типичной реализацией story/journal в других TTRPG-системах Foundry:
- Обычно всё сваливается в free-text textarea на странице — здесь типизированный feed
- Обычно quests отдельным модулем, не связаны с персонажем — здесь привязаны к actor
- Timeline view — редкость в стандартных реализациях, здесь есть два вида
- Pin и linked references — редко встречается в готовых системах
