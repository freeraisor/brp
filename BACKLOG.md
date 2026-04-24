# BACKLOG

## Item tab follow-ups

- Replace raw JSON bonus editing on item sheets with a row-based modal editor that lets users add, remove, and configure bonus rows without writing JSON.
- Improve inventory container drag-and-drop so dropping an item anywhere on a container row targets that container, without requiring the container to be expanded or the drop zone to be hit precisely.
- Audit and fix weight-related modifiers so carried, worn, packed, container reductions, and ENC-derived penalties stay consistent across inventory and rolls.
- Migrate the remaining simple item sheets (`passion`, `persTrait`, and similar detail-first forms) onto the shared `standard-detail-sheet` helper after their unique edge-cases are reviewed.

## Character tab follow-ups

- Define canonical MOV calculation and fallback rules for characters. The `07 Refresh character tab` UI may display current `system.move` or a placeholder, but the gameplay formula, default humanoid value, culture modifiers, DEX loss, SIZ/size-change modifiers, and migration behavior need a separate design before becoming source of truth.

## Social tab follow-ups

- Add drag-sort and persisted custom order for social cards and section rows instead of relying only on default sort rules.
- Expand faction attach UX from the first-pass create/link flow to a richer browser/search flow for existing world and compendium faction objects.

## Story tab follow-ups

- Remove deprecated legacy story fields and handlers (`background`, `backstory`, `stories`, old bio-section flow) after the new Story migration proves safe in live worlds and compendiums.
- Expand timeline UX for long campaigns with pan/zoom and optional timeline-only filters instead of the first-pass fixed overlay views.
- Improve quest sharing/linking UX beyond the initial create/link flow so a GM can more easily attach one shared quest to multiple characters without manual per-actor repetition.

## Personality tab follow-ups

- Unify `impCheck` collection, counting, and review UI across `passion`, `persTrait`, and other future score-like systems behind one API once the dedicated tracker mock/spec is ready.

## Effects tab follow-ups

- Decide canonical registry targets for native armour `mnplmod` and `stealthmod` so they can move from compatibility-only rows into the projected Effects runtime without guessing gameplay semantics.
- Add richer non-item `source_link` support for effects that come from status conditions, journal-driven flows, or orphaned legacy metadata, so `Open source` is not limited to `origin`/item-backed cases.
- Add a repeatable regression harness or smoke checklist for Effects builder/projection flows once we have a Foundry-friendly test path, because the current pass still relies on manual in-app verification.

Документ для задач, которые сознательно не входят в текущую фичу или первую реализацию, но не должны потеряться.

## Health tab / wounds system

### Major Wound RAW automation

В первой реализации Health rebase используем MVP-подход:

- одна рана в non-HPL, достигшая threshold, помечается как major;
- `actor.system.majorWnd` остается синхронизированным рабочим флагом;
- Health summary и chat явно показывают, что нужен Major Wound workflow;
- Luck roll / таблица / shock пока не автоматизируются полностью.

После MVP нужно отдельно спроектировать и реализовать:

- Major Wound Table dialog или RollTable;
- Luck roll entry point и результат в chat;
- shock/unconscious workflow;
- временные и постоянные последствия;
- хранение результата на wound/actor/effect;
- локализацию таблицы и chat-сообщений.

### Body silhouette and SVG support

Первая реализация ориентируется на human/humanoid silhouette как визуальный слой для основных сценариев.

После MVP нужно отдельно подумать о расширении:

- поддержка нескольких SVG templates, не только humanoid;
- документированный контракт для `path[data-loc]`;
- настройка соответствия hit location -> silhouette part;
- импорт/подключение кастомных SVG;
- fallback UI для локаций, которые не матчятся на silhouette;
- UX для редактирования и проверки mapping.

### Body composition editor

Отдельная задача после Health rebase:

- создание и редактирование composition templates;
- дефолтные hit locations по creature/body type;
- HP/ENC fractions по шаблону;
- безопасная миграция существующих hit-location items.

### Advanced healing and conditions

Отложенные механики, которые не стоит смешивать с первым Health rebase:

- Medicine quality/care modifiers;
- автоматический bleeding tick;
- poison/disease progression over time;
- natural healing distribution UI, если простой автоматический вариант окажется неудобным;
- experience checks для treatment skill rolls;
- расширенные magic/tech healing workflows.
