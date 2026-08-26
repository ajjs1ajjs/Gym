<div align="center">

# Gym Tracker

### Offline-first workout and body progress tracker

<p align="center">
  <img src="docs/banner.svg" width="100%" alt="Gym Tracker">
</p>

Приватний PWA-застосунок для тренувань у залі. Ведення ваг, плани тренувань та заміри тіла. Працює офлайн і встановлюється на телефон як звичайний застосунок.

<p align="center">
  <img src="https://img.shields.io/badge/Svelte-5-orange?logo=svelte&logoColor=white" alt="Svelte 5">
  <img src="https://img.shields.io/badge/TypeScript-typed-blue?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/PWA-offline-cyan" alt="PWA">
  <img src="https://img.shields.io/badge/tests-23%20passing-green" alt="Tests">
  <img src="https://img.shields.io/badge/bundle-23KB%20gzip-00d4aa" alt="Bundle">
</p>

</div>

---

## 🖼️ Screenshots

<p align="center">
  <img src="docs/screenshots/main.png" width="28%" alt="Головна — тренування дня">
  <img src="docs/screenshots/weights.png" width="28%" alt="Контроль ваги">
  <img src="docs/screenshots/history.png" width="28%" alt="Історія тренувань">
</p>

---

## ✨ Features

- 💪 Ведення планів тренувань
- 📊 Графіки ваги та зміни тіла
- 🏋️ Заміри тіла + фото тіла
- 🔒 Офлайн-режим — застосунок працює без інтернету (PWA)
- 💾 Локальне зберігання даних у `localStorage` (оновлення у v2)
- 📱 Встановлення на телефон та планшет як рідний застосунок

## Структура тренувань

| День | Фокус |
|------|-------|
| **Верхня частина тіла** | Груди, біцепси/трицепси, плечі, спина, жим, тяга |
| **Нижня частина тіла** | Ноги (3–4×10) |
| **М'язи для тіла** | Ноги (3×20), ягодиці (3×45–60с) |
| **Тіло** | Прес та розтяжка (20–30 хв, пульс 110–130) |

## Технології

- **Svelte 5** — реактивність із мінімальним DOM, без runtime-бібліотек
- **TypeScript** — повна типізація
- **Vite** — швидкий білд, максимальна швидкість
- **vite-plugin-pwa** — автоматичний service worker (precache + cache-first)
- **Vitest** + **@testing-library/svelte** — 23 тести
- **ESLint** + **svelte-check** — якість коду

## 🚀 Getting started

### Ubuntu / Debian (WSL теж підходить)

```bash
sudo apt update && sudo apt install -y nodejs npm   # або через nvm
npm install        # встановлення залежностей
npm run dev        # dev-сервер
npm test           # тести
npm run check      # type-check (svelte-check)
npm run lint       # eslint
npm run build      # продакшн-білд у dist/
npm run preview    # перегляд білд-результату
```

### Windows (PowerShell)

```powershell
winget install OpenJS.NodeJS.LTS   # Node.js 20+ (потрібен для engines >=20)
npm install                        # встановлення залежностей
npm run dev                        # dev-сервер
npm test                           # тести
npm run check                      # type-check (svelte-check)
npm run lint                       # eslint
npm run build                      # продакшн-білд у dist\
npm run preview                    # перегляд білд-результату
```

> Проєкт повністю кросплатформний: усі скрипти (`npm`, `vite`) працюють однаково на Linux і Windows. CI перевіряє збірку та тести одночасно на `ubuntu-latest` і `windows-latest`.

### Локальний запуск продакшн-білда

```bash
npx serve dist     # Linux / macOS / Windows — будь-яка ОС з Node.js
```

## Деплой

При кожному пуші у гілку `main` запускається GitHub Actions (`.github/workflows/deploy.yml`): lint → type-check → тести → build → деплой `dist/` у гілку `gh-pages`.

> **Цільові середовища:** проєкт сумісний з **Ubuntu / Debian** та **Windows** — CI (`deploy.yml`) запускає lint → type-check → тести → build на обох ОС (матриця `ubuntu-latest` + `windows-latest`). Деплой `dist/` у GitHub Pages виконується з Ubuntu. Застосунок статичний (PWA), для самостійного розгортання `dist/` достатньо будь-якого веб-сервера: **nginx / Caddy** на Linux або **IIS / Caddy / npx serve** на Windows.

## Посилання

Жива версія: [https://ajjs1ajjs.github.io/Gym/](https://ajjs1ajjs.github.io/Gym/)

## Історія версій

Див. [CHANGELOG.md](CHANGELOG.md).
