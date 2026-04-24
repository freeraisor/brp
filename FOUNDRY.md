# Нюансы рендеринга Foundry

Короткий список практических правил по поведению Foundry и BRP, важных при работе с UI. Пополнять по мере нахождения новых граблей.

## DialogV2 / BRPDialog

- `foundry.applications.api.DialogV2` (и наш `BRPDialog`, extending его) рендерит root как `<form>`. Поэтому **нельзя оборачивать `content` ещё в один `<form>`** — по HTML5 парсер игнорирует вложенный `<form>` тег, и его класс/атрибуты теряются в DOM. Использовать `<div class="...">`. Контролы по-прежнему доступны через `button.form.elements.*` — они ассоциируются с внешним `<form>` диалога.
- `BRPDialog.DEFAULT_OPTIONS.classes = ["brp","item"]` означает, что сам window диалога получает классы `brp item`. При написании CSS помнить, что `.brp` есть и снаружи, и на нашем внутреннем `<div class="brp ...">`. Селектор `.brp.brp-xxx-dialog` матчит только элемент с обоими классами, то есть именно наш внутренний `<div>`.
- Паттерн формы диалога: `<label><span>Label</span><input|select|textarea /></label>`. Без своего CSS `<label>` раскладывается inline, и textarea визуально уезжает вбок. Для стекинга подпись-над-полем использовать общий класс **`brp-dialog-form`** — на внутреннем `<div class="brp brp-dialog-form brp-xxx-dialog">`. Он задаёт `flex-direction: column`, ширину полей, типографику и вариант чекбокс-ряда `.brp-dialog-checkboxes`. Per-dialog CSS поверх добавляем только для реально специфичных отличий.
- Handlebars-партиалы (`{{> name }}`) **не резолвятся** внутри JS-строк, передаваемых в `content`. Там Handlebars не запускается — это просто innerHTML. Если нужен «универсальный компонент» для диалога, он должен быть либо хелпер-функцией, собирающей строку, либо вынесенным CSS-классом, а не `.hbs`-партиалом.

## CSS и тема

- CSS системы загружается из `system.json` (`styles: ["css/brp.css", ...]`). После правок файла **нужен hard reload** (Ctrl+Shift+R), иначе Foundry/браузер держит старый CSS в кэше.
- Цвета refresh-темы — в переменных `--brp-refresh-*`, определённых в `css/brp.css` (≈строка 40+). Для новых UI ориентироваться на них, а не на базовые `--brp-colour-*`.
- Есть глобальное правило `.brp textarea { min-height: 200px !important; }`. Оно переопределяется более специфичным селектором с двумя классами (`.brp.brp-xxx-dialog textarea` — specificity выше), `!important` на `!important` работает по specificity.
- Партиал `brpItemDetailTextareaField` (`templates/global/parts/item-detail-textarea.hbs`) рассчитан жить **только внутри `brp-item-detail-grid`** (2-колоночный CSS grid, `brp-item-detail-row-full` = `grid-column: 1 / -1`). Вне grid-контейнера визуал разъезжается. Для item detail страниц использовать его, для диалогов — нет.

## Actor/Item рендер

- Transient UI state (collapsed секции, фильтры, открыт ли overlay) храним во флагах `flags.brp.sheet.<tab>`, не в `system.*`. Запись через `actor.update({ 'flags.brp.sheet.xxx': ... }, { render: false, renderSheet: false })` + восстановление скролла через `captureRefreshWorkspaceScroll` / `restoreRefreshWorkspaceScrollSoon`.
- Root actor sheet уже рендерится как `<form>` и живёт с `submitOnChange`. Поэтому для transient UI внутри табов нельзя добавлять вложенные `<form>` и опасно давать служебным modal/filter полям обычные `name` вроде `name`, `description`, `priority`: они попадут в sheet submit pipeline. Для такого UI использовать `<section>/<div>` и `data-*`/контроллерный сбор значений, а не обычный form-submit.
- **`actor.update()` мержит вложенные объекты флагов**, а не заменяет их. Поэтому `delete settings.foo[key]` + сохранение объекта **не стирает** поле в persisted flags — там остаётся старое значение. Для фиксированного набора ключей (секции и т.п.) писать явное `settings.foo[key] = false`. Для растущих мап (`expandedItems` по itemId и т.п.) удалять через path-операцию: `actor.update({ [`flags.brp.sheet.xxx.foo.-=${key}`]: null })`.
- Если ключи в flag-map содержат точки (`.`), например BRPID вроде `i.skillcat.physical`, **нельзя** писать их через path-синтаксис `flags...map.${key}` или `flags...map.-=${key}`: Foundry распарсит их как вложенный путь. Для таких map helper должен собирать новый объект целиком и заменять весь map-узел за один `update()`.
- **Все шевроны/row-expand на листе должны переживать перезапуск игры.** Состояние писать во flag-map (`flags.brp.sheet.<tab>.<expandedMap>`), читать в соответствующем prepare и класть в view-model (`row.expanded = Boolean(expandedMap[row.id])`), в шаблоне применять класс (`is-expanded`, `is-actions-open`, `is-details-open`, ...) и `hidden` на теле. Для записи использовать **`persistUiMapFlag(actor, path, key, value)`** из `module/actor/sheets/character/character-sheet-utils.mjs` — он пересобирает map целиком и заменяет весь узел, чтобы обойти merge-проблему и безопасно поддерживать ключи с точками. Обязательно откатывать DOM в `catch`-блоке на случай неудачного `update()`.
- Массивы объектов в `system.*` обновлять только целиком (`{ 'system.story.entries': nextEntries }`). Foundry не умеет diff-апдейт элементов массива по id.
- Item sheets регистрируются в `module/setup/register-sheets.mjs`, иконки по умолчанию — в `module/item/item-defaults.mjs`. При добавлении нового item type править оба + `template.json`.

## Миграции

- Миграции идут через `module/setup/update.mjs` по номеру версии `system.json`. При добавлении нового store-поля с legacy-источниками обязательно добавить миграцию и template для update-release-notes (`templates/updates/updateX.Y.Z.hbs`).

## Handlebars-хелперы и партиалы

- Новые shared партиалы регистрируем в `module/setup/handlebar-helper.mjs` через `loadHandlebarsPartials` (см. `SHARED_HANDLEBAR_PARTIALS`) и подключаем из `module/hooks/init.mjs`.
