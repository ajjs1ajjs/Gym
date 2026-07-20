const WORKOUT = [
  {
    title: 'Силовий блок',
    icon: '🏋️',
    accent: 'block-0',
    desc: 'Великі м\'язи → Малі м\'язи. Відпочинок 60–90 сек між підходами.',
    exercises: [
      {
        name: 'Жим ногами в тренажері',
        badge: '3×15',
        img: 'images/leg-press.svg',
        desc: 'Ноги на ширині плечей. Плавно опускай платформу до кута 90° в колінах. Витискай без блокування колін.',
        key: 'leg-press'
      },
      {
        name: 'Згинання/розгинання ніг',
        badge: '3×15',
        img: 'images/leg-curl.svg',
        desc: 'Поперемінно: згинання для біцепсу стегна, розгинання для квадрицепсу. Контролюй рух в обох фазах.',
        key: 'leg-curl'
      },
      {
        name: 'Тяга верхнього блоку до грудей',
        badge: '3×15',
        img: 'images/lat-pulldown.svg',
        desc: 'Хват широкий. Зводь лопатки в нижній точці. Корпус трохи відхилений назад.',
        key: 'lat-pulldown'
      },
      {
        name: 'Жим сидячи на груди',
        badge: '3×15',
        img: 'images/chest-press.svg',
        desc: 'Лікті під кутом 45° до корпусу. Витискай на видиху, опускай контрольовано.',
        key: 'chest-press'
      },
      {
        name: 'Згинання на біцепс',
        badge: '3×12–15',
        img: 'images/biceps-curl.svg',
        desc: 'Лікті нерухомо притиснуті. Пік скорочення у верхній точці. Опускай повільно.',
        key: 'biceps-curl'
      },
      {
        name: 'Розгинання на трицепс',
        badge: '3×12–15',
        img: 'images/triceps-pushdown.svg',
        desc: 'За бажанням. Трос/канат. Лікті фіксовані, тільки передпліччя рухаються.',
        key: 'triceps-pushdown'
      }
    ]
  },
  {
    title: 'Інтенсивний фінішер',
    icon: '🔥',
    accent: 'block-1',
    desc: 'Місток між силовим блоком і кардіо. Максимально розганяє метаболізм.',
    exercises: [
      {
        name: 'Бурпі',
        badge: '3–4×10',
        img: 'images/burpee.svg',
        desc: 'Відпочинок 45–60 сек між підходами. З упором лежачи, стрибок угору з бавовною.',
        key: 'burpee'
      }
    ]
  },
  {
    title: 'Блок для кору',
    icon: '💪',
    accent: 'block-2',
    desc: 'Зміцнення м\'язів живота та спини.',
    exercises: [
      {
        name: 'Прес (скручування)',
        badge: '3×20',
        img: 'images/crunch.svg',
        desc: 'На килимку або в тренажері. Скручуй корпус, поперек притиснута до підлоги.',
        key: 'crunch'
      },
      {
        name: 'Планка',
        badge: '3×45–60c',
        img: 'images/plank.svg',
        desc: 'Тіло — пряма лінія. Не прогинай поперек. Тримай прес і сідниці напруженими.',
        key: 'plank'
      }
    ]
  },
  {
    title: 'Кардіо (Заминка)',
    icon: '🏃',
    accent: 'block-3',
    desc: 'Жироспалювальна зона пульсу ~110–130 уд/хв.',
    exercises: [
      {
        name: 'Ходьба з нахилом',
        badge: '20–30хв',
        img: 'images/treadmill.svg',
        desc: 'Швидкість 5–5.5 км/год, нахил 10–12%. Тривалість 20–30 хвилин. Пульс у жироспалювальній зоні.',
        key: 'treadmill'
      }
    ]
  }
];

const STORAGE_KEY = 'gym-tracker-progress';
let deferredPrompt = null;

function loadProgress() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function getAllKeys() {
  const keys = [];
  for (const block of WORKOUT) {
    for (const ex of block.exercises) {
      keys.push(ex.key);
    }
  }
  return keys;
}

function render() {
  const progress = loadProgress();
  const allKeys = getAllKeys();
  const doneCount = allKeys.filter(k => progress[k]).length;
  const totalCount = allKeys.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${doneCount}/${totalCount} · ${pct}%`;

  const container = document.getElementById('blocks');
  container.innerHTML = '';

  for (let bi = 0; bi < WORKOUT.length; bi++) {
    const block = WORKOUT[bi];
    const blockDone = block.exercises.filter(e => progress[e.key]).length;
    const blockTotal = block.exercises.length;

    const blockEl = document.createElement('div');
    blockEl.className = `block ${block.accent}`;

    blockEl.innerHTML = `
      <div class="block-header" data-index="${bi}">
        <div class="icon">${block.icon}</div>
        <div class="title">${block.title}</div>
        <div class="block-progress">${blockDone}/${blockTotal}</div>
        <div class="arrow">▾</div>
      </div>
      <div class="block-body" data-index="${bi}">
        <div class="block-desc">${block.desc}</div>
        ${block.exercises.map(ex => {
          const checked = progress[ex.key] ? 'checked' : '';
          return `
            <div class="exercise ${checked ? 'done' : ''}" data-key="${ex.key}">
              <div class="ex-thumb"><img src="${ex.img}" alt="${ex.name}" loading="lazy"></div>
              <div class="ex-info">
                <div class="ex-info-top">
                  <div class="ex-name">${ex.name}</div>
                  <div class="ex-badge">${ex.badge}</div>
                </div>
                <div class="ex-desc">${ex.desc}</div>
              </div>
              <div class="ex-check">
                <input type="checkbox" id="cb-${ex.key}" ${checked}>
                <label for="cb-${ex.key}">✓</label>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.appendChild(blockEl);
  }

  // Toggle blocks
  document.querySelectorAll('.block-header').forEach(h => {
    h.addEventListener('click', () => {
      const body = h.nextElementSibling;
      const arrow = h.querySelector('.arrow');
      const isOpen = body.classList.toggle('open');
      arrow.classList.toggle('open', isOpen);
    });
  });

  // Checkbox events
  document.querySelectorAll('.exercise input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const exEl = cb.closest('.exercise');
      const key = exEl.dataset.key;
      const progress = loadProgress();
      if (cb.checked) {
        progress[key] = true;
      } else {
        delete progress[key];
      }
      saveProgress(progress);
      exEl.classList.toggle('done', cb.checked);
      render();
    });
  });
}

function resetProgress() {
  if (!confirm('Скинути весь прогрес?')) return;
  localStorage.removeItem(STORAGE_KEY);
  render();
  showToast('Прогрес скинуто');
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

// PWA Install
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('btn-install').style.display = 'inline-flex';
});

document.getElementById('btn-install')?.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      showToast('Додаток встановлено!');
    }
    deferredPrompt = null;
    document.getElementById('btn-install').style.display = 'none';
  }
});

window.addEventListener('appinstalled', () => {
  showToast('Дякуємо за встановлення!');
  document.getElementById('btn-install').style.display = 'none';
});

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(e => {
    console.error('SW registration failed:', e);
  });
}

document.getElementById('btn-reset').addEventListener('click', resetProgress);

render();
