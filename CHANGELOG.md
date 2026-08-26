# Changelog

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
