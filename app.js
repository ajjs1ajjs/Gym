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
const WEIGHT_KEY = 'gym-tracker-weights';
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

function loadWeights() {
  try {
    const data = localStorage.getItem(WEIGHT_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveWeights(weights) {
  localStorage.setItem(WEIGHT_KEY, JSON.stringify(weights));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(str) {
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
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

// Weight tracking
function renderWeight() {
  const container = document.getElementById('weight-section');
  const weights = loadWeights();
  const sorted = [...weights].sort((a, b) => b.date.localeCompare(a.date));
  const current = sorted.length > 0 ? sorted[0].weight : null;
  const prev = sorted.length > 1 ? sorted[1].weight : null;
  const diff = current !== null && prev !== null ? (current - prev) : null;
  const min = sorted.length > 0 ? Math.min(...sorted.map(w => w.weight)) : null;
  const max = sorted.length > 0 ? Math.max(...sorted.map(w => w.weight)) : null;

  let html = '<div class="weight-summary">';
  if (current !== null) {
    html += `<div class="weight-stat"><div class="val">${current}</div><div class="label">Поточна вага</div></div>`;
    if (diff !== null) {
      const sign = diff > 0 ? '+' : '';
      const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : '';
      html += `<div class="weight-stat ${cls}"><div class="val">${sign}${diff.toFixed(1)}</div><div class="label">Зміна</div></div>`;
    }
    html += `<div class="weight-stat"><div class="val">${min}</div><div class="label">Мінімум</div></div>`;
    html += `<div class="weight-stat"><div class="val">${max}</div><div class="label">Максимум</div></div>`;
  } else {
    html += '<div class="weight-stat" style="flex:2"><div class="val" style="font-size:0.9rem">—</div><div class="label">Додайте перше вимірювання</div></div>';
  }
  html += '</div>';

  html += `
    <div class="weight-form">
      <input type="number" id="w-input" placeholder="Вага (кг)" step="0.1" min="20" max="300">
      <input type="date" id="w-date" value="${todayStr()}">
      <button class="btn-add" id="w-add">+ Додати</button>
    </div>
  `;

  if (sorted.length > 0) {
    sorted.forEach(w => {
      const idx = weights.findIndex(x => x.id === w.id);
      const wDiff = idx < weights.length - 1 ? (w.weight - weights[idx + 1].weight) : null;
      let diffHtml = '';
      if (wDiff !== null) {
        const sign = wDiff > 0 ? '+' : '';
        const cls = wDiff > 0 ? 'pos' : wDiff < 0 ? 'neg' : 'zero';
        diffHtml = `<span class="w-diff ${cls}">${sign}${wDiff.toFixed(1)}</span>`;
      }
      html += `
        <div class="weight-entry" data-id="${w.id}">
          <span class="w-date">${formatDate(w.date)}</span>
          <span class="w-val">${w.weight} кг</span>
          ${diffHtml}
          <div class="w-actions">
            <button class="w-btn w-btn-edit">✎</button>
            <button class="w-btn w-btn-del">✕</button>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = html;

  document.getElementById('w-add')?.addEventListener('click', addWeight);
  document.getElementById('w-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') addWeight(); });
  container.querySelectorAll('.w-btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const entry = btn.closest('.weight-entry');
      const id = Number(entry.dataset.id);
      const weights = loadWeights();
      const w = weights.find(x => x.id === id);
      if (!w) return;
      const input = document.getElementById('w-input');
      const dateInput = document.getElementById('w-date');
      input.value = w.weight;
      dateInput.value = w.date;
      document.getElementById('w-add').textContent = '✎ Зберегти';
      document.getElementById('w-add').dataset.editId = id;
    });
  });
  container.querySelectorAll('.w-btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const entry = btn.closest('.weight-entry');
      const id = Number(entry.dataset.id);
      if (!confirm('Видалити запис?')) return;
      let weights = loadWeights();
      weights = weights.filter(w => w.id !== id);
      saveWeights(weights);
      renderWeight();
      showToast('Запис видалено');
    });
  });
}

function addWeight() {
  const input = document.getElementById('w-input');
  const dateInput = document.getElementById('w-date');
  const btn = document.getElementById('w-add');
  const weight = parseFloat(input.value);
  const date = dateInput.value;
  if (!weight || weight <= 0) { showToast('Введіть коректну вагу'); return; }
  if (!date) { showToast('Виберіть дату'); return; }

  const weights = loadWeights();
  const editId = btn.dataset.editId;

  if (editId) {
    const idx = weights.findIndex(w => w.id === Number(editId));
    if (idx !== -1) {
      weights[idx].weight = weight;
      weights[idx].date = date;
    }
    delete btn.dataset.editId;
    btn.textContent = '+ Додати';
  } else {
    weights.push({ id: Date.now(), date, weight });
  }

  weights.sort((a, b) => b.date.localeCompare(a.date));
  saveWeights(weights);
  input.value = '';
  dateInput.value = todayStr();
  renderWeight();
  showToast(editId ? 'Оновлено' : 'Додано');
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

// Weight block toggle
document.querySelector('.block-weight .block-header')?.addEventListener('click', () => {
  const body = document.getElementById('weight-section');
  const arrow = document.querySelector('.block-weight .arrow');
  const isOpen = body.classList.toggle('open');
  arrow.classList.toggle('open', isOpen);
});

render();
renderWeight();
