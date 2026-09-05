<div align="center">

# Gym Tracker — Source Code

[![Deployed to](https://img.shields.io/badge/Deployed_to-Gym-blue)](https://github.com/ajjs1ajjs/Gym)
[![Website](https://img.shields.io/badge/Website-ajjs1ajjs.github.io%2FGym-green)](https://ajjs1ajjs.github.io/Gym/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/ajjs1ajjs/Gym/deploy.yml?label=CI)](https://github.com/ajjs1ajjs/Gym/actions/workflows/deploy.yml)

> **Це репозиторій з вихідним кодом Gym workout tracker PWA.**
> Готовий продукт деплоїться в: **https://github.com/ajjs1ajjs/Gym**
> Офіційний сайт: **https://ajjs1ajjs.github.io/Gym/**

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
  <img src="https://img.shields.io/badge/tests-25%20passing-green" alt="Tests">
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
- **Vitest** + **@testing-library/svelte** — 25 тестів
- **ESLint** + **svelte-check** — якість коду

## 🚀 Getting started

### Ubuntu / Debian (WSL теж підходить)

Автоматичний встановлювач (сам ставить Node.js 22, залежності, білдить і піднімає локальний сервер на `http://localhost:8080`):

```bash
curl -fsSL https://raw.githubusercontent.com/ajjs1ajjs/Gym/main/install.sh | bash
# або dev-сервер (Vite, http://localhost:5173):
curl -fsSL https://raw.githubusercontent.com/ajjs1ajjs/Gym/main/install.sh | bash -s -- --dev
```

Вручну:

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

### Windows

Автоматичний встановлювач (PowerShell; перевіряє/встановлює Node.js 20+ через winget, білдить і піднімає локальний сервер на `http://localhost:8080`):

```powershell
irm https://raw.githubusercontent.com/ajjs1ajjs/Gym/main/install.ps1 | iex
# або dev-сервер (Vite, http://localhost:5173):
$env:GYM_DEV = "1"; irm https://raw.githubusercontent.com/ajjs1ajjs/Gym/main/install.ps1 | iex
```

Вручну (Node.js 20+ з [nodejs.org](https://nodejs.org) або `winget install --id OpenJS.NodeJS.LTS -e`):

```powershell
git clone https://github.com/ajjs1ajjs/Gym.git
cd Gym
npm install
npm run dev        # dev-сервер
npm run build      # продакшн-білд у dist/
```

### Локальний запуск продакшн-білда

```bash
npx serve dist     # Linux/Windows/macOS — будь-де, де є Node.js
```

## Деплой

При кожному пуші у гілку `main` (окрім змін лише в `README.md`/`CHANGELOG.md`) запускається GitHub Actions (`.github/workflows/deploy.yml`): lint → type-check → тести → build → публікація `dist/` через `peaceiris/actions-gh-pages`.

> **Локальна розробка:** проєкт сумісний з **Ubuntu / Debian** (`install.sh`) та **Windows** (`install.ps1`) — див. розділ [🚀 Getting started](#-getting-started). CI (`deploy.yml`) запускає lint → type-check → тести → build на `ubuntu-latest`. Застосунок статичний (PWA), для самостійного розгортання `dist/` достатньо будь-якого веб-сервера: **nginx / Caddy** на Linux або IIS/будь-який статичний хостинг на Windows.

## Посилання

Жива версія: [https://ajjs1ajjs.github.io/Gym/](https://ajjs1ajjs.github.io/Gym/)

## Історія версій

Див. [CHANGELOG.md](CHANGELOG.md).
