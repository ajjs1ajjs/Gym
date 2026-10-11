# Changelog

## [Unreleased] - 2026-10-01

### Added

- **Облік підходів**: замість булевого чекбокса — крапки-підходи (клік по крапці =
  виконано N підходів, повторний клік знімає; чекбокс — «все/нічого»); картка
  підсвічується при частковому виконанні. Старі дані (boolean) автоматично
  мігрують у повну кількість підходів, прогрес дня враховує лише повністю
  виконані вправи.
- **Історія ваг вправ**: вага зберігається по днях у новому ключі
  `gym-tracker-ex-weights-v2` (одна точка на дату); під вагою видно підказку
  «перед цим / останнє: X кг · дата». Стара мапа мігрує при першому читанні,
  старий ключ лишається (безпечний відкат).
- **Undo замість `confirm()`**: видалення вимірювання та скидання прогресу
  виконуються миттєво, тост із кнопкою «Скасувати» (6 с) повертає стан.
- **Wake Lock**: під час таймера відпочинку екран не гасне (де API доступне).
- **Quality-воркфлоу** (тільки ручний запуск): Playwright E2E (7 сценаріїв:
  прогрес, підходи, таймер, вага, експорт, undo) + Lighthouse CI
  (Perf 99 / A11y 91 / BP 100 на білді). LHCI викликається через npx із піном,
  щоб не тягнути вразливі транзитивні залежності в lockfile.
- **Бекап v2**: конверт версії 2 (історія ваг вправ); імпорт бекапів v1
  продовжує працювати — значення датуються днем експорту файла.

- **Таймер відпочинку**: кнопка на кожній вправі (пресети 90/60/45 с), зворотний
  відлік від абсолютного часу (не «замерзає» у фонових вкладках), +15 с/стоп,
  вібрація на старті й фініші, сповіщення через Notification API.
- **Бекап**: експорт усіх даних у JSON (`gym-tracker-<дата>.json`) та імпорт із
  версійним конвертом (`app`/`v`), ті самі валідатори, що й у localStorage,
  підтвердження перед перезаписом наявних даних.
- **Графік ваги**: SVG-спарклайн останніх 30 вимірювань (без залежностей), мін/макс.
- **Вправи**: +9 нових (присідання з гантеллю, тяга нижнього блоку, розведення
  рук, махи гантелями, скакалка, підйом ніг у висі, російський твіст,
  гіперекстензія, велотренажер) — разом 19; для кожної — час відпочинку.
- **Іконки**: усі 19 іконок вправ перемальовано в єдиному стилі (фігура + акцент
  обладнання за кольором блоку).
- **Тести**: 39 → 68 (бекап-конверт і валідація, таймер і компонент, математика
  спарклайна, сценарії App: експорт/імпорт/таймер), далі ще +27 (підходи/клемпи,
  історія ваг вправ, undo-сценарії, v1→v2 бекап) — разом **95**.
- **CI/CD**: CI-воркфлоу (`lint → type-check → tests → build`) повернуто в репозиторій.
- **Deferred release**: `Release` воркфлоу публікує PWA в `ajjs1ajjs/dist` за розкладом
  **1 жовтня** (`cron: 0 6 1 10 *`, після скидання місячного ліміту GitHub Actions) та
  (`workflow_dispatch` — тільки ручний запуск; cron не додано свідомо: жодних авторелізів). Версія обчислюється як `max(package.json, latest dist)`
  + bump — монотонна навіть якщо `dist` відстає.

### Fixed

- **Release**: сайт більше не «загублюється» — реліз дзеркалить білд напряму в
  `dist/gym/` (як Sales), замість архіву `gym-site.tar.gz`, який ніхто не розпаковував
  (живий сайт був від 22.09, релізи 3.5.1–3.5.3 у нього не потрапили). Якщо білд не
  змінився — ні тега, ні бампа (ідемпотентно). Оновлено: `scripts/Release-Local.ps1`,
  `.github/workflows/release.yml`, README.
- **CI**: виправлено пін `actions/setup-node@…` — SHA не резолвився, тож усі рани
  (CI/Release/Quality) падали на setup з 7 жовтня; тепер коректний v5-SHA, як у Sales.
- **Docs**: README більше не називає репозиторій приватним (він публічний).

- **Deploy base**: усі згадки застарілого шляху `/Gym/` оновлено на актуальний `/dist/gym/`
  (`sitemap.xml`, `robots.txt`, `MIGRATION_PLAN.md`).
- **Docs**: бейдж і текст кількості тестів виправлено на 39; розмір бандла — 25 KB gzip.
- **Release**: прибрано тригер `push` (реліз більше не запускається на кожен коміт).
- **Repo**: `.freebuff/` додано до `.gitignore`.

## [3.5.0] - 2026-09-15

### Security (audit round, all findings closed, re-audit 19/19 PASS)

- **Storage**: validators hardened — date keys must match `YYYY-MM-DD`, exercise keys allowlisted, weights finite `0.5–999`, entries exactly `{id,date,weight}` shape-capped (`MAX_DAYS=3700`, `MAX_WEIGHT_ENTRIES=5000`); legacy migration validated (no blind casts), numeric ids normalized to strings.
- **Input**: `toWeight` strict decimal shape + `0.5–999` domain; central `isRealCalendarDate`/`isUsableDateStr` guards on all date entries (picker, form, history, add/update); progress bars clamped via `progressPct`.
- **IDs**: `crypto.randomUUID()` entry ids (ms-timestamp collisions fixed).
- **Components**: image `src` allowlist + base-aware URLs + error fallback; accent allowlist; index-based block ids; min/max via seeded reduce (no spread-DoS); date `max` attrs aligned with domain.
- **CSP**: `object-src 'none'`, `base-uri/form-action/worker/manifest-src 'self'`; emoji data-URI favicon replaced by `icon.svg` (dropped `img-src data:`); theme colors aligned; `apple-touch-icon` added; manifest `id` + SVG `purpose: any`.
- **PWA**: `navigateFallback: /Gym/index.html` (base-aware); Vitest config split to `vitest.config.ts`.
- **Supply chain**: exact dep pins + synced lock (`npm audit fix` cleared the high `fast-uri`; 2 moderate dev-only `vitest` remain upstream); `engines: 22.x` + `packageManager`; Dependabot (npm + actions); `npm audit` gate in CI.
- **CI**: least-privilege permissions, SHA-pinned actions (incl. peaceiris `v4.1.0` @ `84c30a8`), `ubuntu-24.04`, timeouts, `npm run check`; deferred-release derives version from `package.json` + `--ff-only`.
- **Site**: root `.nojekyll` removed (kept `public/`); `robots.txt` + `sitemap.xml` added.
- **install.sh**: `serve@14.2.5 --single`, `http.server` fallback warns about SPA/SW limits, NodeSource downloaded-to-temp (sha pin placeholder documented), `22+` message, `--help`, unknown flags rejected. Known accepted risk: NodeSource sha256 not yet pinned to a verified value.

### Tests

- 39 passing (was ~29): validator rejection suites, id normalization, date guards, `progressPct`, `newWeightId` uniqueness. `eslint` clean, `svelte-check` clean, `vite build` ok.

## [3.4.0] - 2026-10-01

### Fixed

- PWA: manifest linked via relative path (./manifest.json) so it works under base /Gym/ on GitHub Pages
- UX: removed blocking alert() calls from global error handlers, errors now surface through the app toast
- Storage: removed dead gym-tracker-version counter that caused an extra localStorage write on every change
- Tests: merged duplicated describe blocks for isValidDateEntry

### Changed

- Platforms: dropped Windows support (install.ps1, Windows README section), Ubuntu / Debian only
- Docs: badges updated to actual values (30 tests, 24KB gzip)

## [3.3.0] - 2026-09-09

### Виправлено

- **CI/CD**: виправлено `actions/checkout@v5` → `actions/checkout@v4` (v5 ще не існує)
- **Безпека**: додано CSP meta-тег у `index.html` для defense-in-depth
- **Надійність**: додано глобальні error handlers (`window.onerror`, `unhandledrejection`) для запобігання white screen
- **Цілісність даних**: додано схему валідацію localStorage (storage.ts) — захист від пошкоджених/невалідних даних
- **Cross-tab sync**: додано версіонування сховища + `storage` event listener для синхронізації між вкладками
- **DST bug**: виправлено `shiftDate()` — використовує `new Date(y, m, d)` замість парсингу рядка
- **Performance**: оптимізовано оновлення ваг — вставка замість повного сортування (O(n) замість O(n log n))
- **Lint**: виправлено unused variable в storage event handler

### Змінено

- **Storage**: експортувані константи ключів (`STORAGE_KEY`, `WEIGHT_KEY`, `EX_WEIGHT_KEY`) для cross-tab sync

## [3.2.1] - 2026-09-08

### Виправлено

- **GitHub Actions помилки**: виправлено тести `pwa-offline.test.ts` та `storage-quota.test.ts` для коректної роби з ESLint
- **TypeScript типи**: додано `vitest/globals` до `tsconfig.json` для підтримки тестів
- **Node.js версія**: оновлено з 20 до 22 у всіх workflow файлах та `package.json`

## [3.1.0] - 2026-09-01

### Додано

- **Крос-платформна установка знову підтримується**: `install.sh` (Ubuntu/Debian, `curl ... | bash`) та `install.ps1` (Windows, `irm ... | iex`) — обидва самостійно перевіряють/встановлюють Node.js, клонують репозиторій за потреби, виконують `npm ci`, білдять `dist/` і піднімають локальний сервер на порту 8075 (прапорець `--dev`/`-Dev` запускає Vite dev-сервер замість цього).

### Виправлено

- `package.json`: поле `description` було збережене з пошкодженим кодуванням (UTF-8 байти прочитані як Windows-1251) — відновлено коректний українській текст.
- README: застарілий CI-бейдж/лінк вказував на неіснуючий (перейменований) репозиторій `ajjs1ajjs/Gym-source` — виправлено на `ajjs1ajjs/Gym`.
- README: бейдж і опис кількості тестів оновлено з 23 до фактичних 25.

## [3.0.3] - 2026-08-31

### Змінено

- **Тільки Ubuntu / Debian**: прибрано Windows-інструкції з README та windows-latest із CI-матриці. Тепер підтримується лише встановлення/розгортання на Ubuntu / Debian.

## [3.0.2] - 2026-08-26

### Додано

- **Windows-підтримка**: CI (`deploy.yml`) тепер збирає та тестує проєкт на `windows-latest` і `ubuntu-latest` (матриця), деплой на GitHub Pages — з Ubuntu.
- README: інструкція встановлення для Windows (PowerShell + winget) та локальний запуск білда через `npx serve dist`.

### Виправлено

- Безпека: оновлено транзитивну залежність `nanoid` (<3.3.18, high) — `npm audit` тепер 0 вразливостей.

## [3.0.0] - 2026-08-06

### Змінено (повне переписування)

- **Vanilla JavaScript → Svelte 5 + TypeScript + Vite**: застосунок тепер збирається через Vite, бандл ~61KB (23KB gzip), нуль runtime-оверхеду.
- **Компонентна архітектура**: `App`, `WorkoutBlock`, `ExerciseCard`, `DateNav`, `WeightSection`, `HistorySection`, `WeightDialog`.
- **Типобезпечність**: строгі типи, `svelte-check` 0 помилок.
- **Тести**: Vitest (23 тести) — логіка дат, ваги, localStorage (з міграцією), компоненти.
- **Lint**: ESLint 10 + eslint-plugin-svelte.
- **PWA**: service worker тепер генерується через `vite-plugin-pwa` (precache + cache-first для зображень).
- **CI/CD**: GitHub Actions — lint → type-check → тести → build → deploy на gh-pages.

### Сумісність

- Дані localStorage зберігаються без змін (ключі `gym-tracker-progress-v2`, `gym-tracker-weights`, `gym-tracker-ex-weights`).
- Міграція старого ключа `gym-tracker-progress` → v2 збережена.

## [2.0.0] - 2026-07-21

- Історія тренувань по днях, навігація датами.
- Збереження ваг для вправ (+/-), діалог введення ваги.

## [1.0.0] - 2026-07-20

- Базовий PWA-трекер: блоки вправ, прогресування, офлайн.
