# Gym Tracker — План міграції (v2 → v3)

## Мета

Переписати трекер тренувань з Vanilla JavaScript на сучасний стек:

| Аспект | Було (v2) | Стало (v3) |
|--------|-----------|------------|
| Мова | Vanilla JS (без типів) | **TypeScript** |
| Фреймворк | Відсутній (innerHTML-рендер) | **Svelte 5** (компілюється в чистий JS, без runtime) |
| Білд | Відсутній (сирці в репо) | **Vite** (збірка, хешування асетів) |
| Тести | Node built-in test runner | **Vitest** |
| Lint/типи | Відсутні | **ESLint 10** + **svelte-check** |
| PWA | Ручний sw.js із зашитим списком асетів | **vite-plugin-pwa** (автогенерація precache) |
| Деплой | GitHub Pages з кореня репо | **gh-pages branch** через GitHub Actions |

## Чому Svelte?

- Найлегший із сучасних фреймворків: компілюється в чистий DOM-JS, **нуль runtime-оверхеду** — ідеально для мобільного PWA.
- Декларативні компоненти, реактивність через руни (`$state`, `$derived`, `$effect`).
- Типобезпечний рендеринг: **XSS-екранування за замовчуванням** (без `innerHTML`).

## Зворотна сумісність даних

Ключі localStorage **зберігаються без змін**, щоб існуючий прогрес користувачів не загубився:

- `gym-tracker-progress-v2` — прогрес по днях
- `gym-tracker-weights` — вимірювання ваги
- `gym-tracker-ex-weights` — ваги для вправ
- Міграція старого ключа `gym-tracker-progress` → `gym-tracker-progress-v2` зберігається

## Етапи

1. **Скафолдінг**: Vite + Svelte 5 + TS, конфіги (vite, tsconfig, svelte, eslint).
2. **Логіка**: портувати `lib.js` → `src/lib/` (dates, format, storage, workout data, compute).
3. **Компоненти**: `App`, `WorkoutBlock`, `Exercise`, `DateNav`, `WeightSection`, `HistorySection`, `WeightDialog`.
4. **PWA**: vite-plugin-pwa (GenerateSW), реєстрація з `virtual:pwa-register`.
5. **Тести**: портувати `tests/lib.test.js` → Vitest, додати тести компонентів.
6. **CI/CD**: GitHub Actions — lint, test, build, deploy на gh-pages.
7. **Документація**: README, CHANGELOG, версія 3.0.0, реліз.
8. **Валідація**: `npm run check`, `npm run lint`, `npm test`, `npm run build`.

## Сумісність з GitHub Pages

- `base: '/Gym/'` — асети завантажуються з піддиректорії `/Gym/`.
- Деплой: `peaceiris/actions-gh-pages` публікує `dist/` у гілку `gh-pages` (як у проєкті Sales).
