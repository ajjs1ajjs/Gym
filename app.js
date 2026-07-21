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
        key: 'leg-press',
        hasWeight: true
      },
      {
        name: 'Згинання/розгинання ніг',
        badge: '3×15',
        img: 'images/leg-curl.svg',
        desc: 'Поперемінно: згинання для біцепсу стегна, розгинання для квадрицепсу. Контролюй рух в обох фазах.',
        key: 'leg-curl',
        hasWeight: true
      },
      {
        name: 'Тяга верхнього блоку до грудей',
        badge: '3×15',
        img: 'images/lat-pulldown.svg',
        desc: 'Хват широкий. Зводь лопатки в нижній точці. Корпус трохи відхилений назад.',
        key: 'lat-pulldown',
        hasWeight: true
      },
      {
        name: 'Жим сидячи на груди',
        badge: '3×15',
        img: 'images/chest-press.svg',
        desc: 'Лікті під кутом 45° до корпусу. Витискай на видиху, опускай контрольовано.',
        key: 'chest-press',
        hasWeight: true
      },
      {
        name: 'Згинання на біцепс',
        badge: '3×12–15',
        img: 'images/biceps-curl.svg',
        desc: 'Лікті нерухомо притиснуті. Пік скорочення у верхній точці. Опускай повільно.',
        key: 'biceps-curl',
        hasWeight: true
      },
      {
        name: 'Розгинання на трицепс',
        badge: '3×12–15',
        img: 'images/triceps-pushdown.svg',
        desc: 'За бажанням. Трос/канат. Лікті фіксовані, тільки передпліччя рухаються.',
        key: 'triceps-pushdown',
        hasWeight: true
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

const STORAGE_KEY = 'gym-tracker-progress-v2';
const WEIGHT_KEY = 'gym-tracker-weights';
const EX_WEIGHT_KEY = 'gym-tracker-ex-weights';
let deferredPrompt = null;
let selectedDate = todayStr();

function loadAllProgress() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
    const old = localStorage.getItem('gym-tracker-progress');
    if (old) {
      const p = JSON.parse(old);
      if (p && typeof p === 'object') {
        const hasDateKeys = Object.keys(p).some(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
        if (!hasDateKeys) {
          const migrated = { [todayStr()]: p };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          localStorage.removeItem('gym-tracker-progress');
          return migrated;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        localStorage.removeItem('gym-tracker-progress');
        return p;
      }
    }
    return {};
  } catch {
    return {};
  }
}

function saveAllProgress(all) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function loadProgress() {
  return loadAllProgress()[selectedDate] || {};
}

function saveProgress(progress) {
  const all = loadAllProgress();
  all[selectedDate] = progress || {};
  saveAllProgress(all);
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

function loadExWeights() {
  try {
    const data = localStorage.getItem(EX_WEIGHT_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveExWeights(weights) {
  localStorage.setItem(EX_WEIGHT_KEY, JSON.stringify(weights));
}

function localDateStr(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function todayStr() {
  return localDateStr(new Date());
}

function formatDate(str) {
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}

function formatDateLabel(str) {
  if (str === todayStr()) return 'Сьогодні';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (str === localDateStr(y)) return 'Вчора';
  return new Date(str + 'T00:00:00').toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getWorkoutDates() {
  const all = loadAllProgress();
  return Object.keys(all).filter(d => {
    const p = all[d];
    return p && typeof p === 'object' && Object.keys(p).length > 0;
  }).sort().reverse();
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
  const exWeights = loadExWeights();
  const allKeys = getAllKeys();
  const doneCount = allKeys.filter(k => progress[k]).length;
  const totalCount = allKeys.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${doneCount}/${totalCount} · ${pct}%`;

  // Date navigation
  const todayLabel = todayStr();
  const dn = document.getElementById('date-nav');
  dn.innerHTML = `
    <button class="dn-btn" data-delta="-1">◀</button>
    <span class="dn-date" id="dn-label">${formatDateLabel(selectedDate)}</span>
    <button class="dn-btn" data-delta="1">▶</button>
    <input type="date" id="dn-picker" class="dn-picker" value="${selectedDate}" max="${todayLabel}">
    ${selectedDate !== todayLabel ? `<button class="dn-btn dn-today" data-delta="today">📅 Сьогодні</button>` : ''}
  `;
  dn.querySelectorAll('.dn-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = btn.dataset.delta;
      if (delta === 'today') goToToday();
      else navigateDate(parseInt(delta));
    });
  });
  const dnLabel = document.getElementById('dn-label');
  const dnPicker = document.getElementById('dn-picker');
  if (dnLabel && dnPicker) {
    dnLabel.addEventListener('click', () => dnPicker.showPicker());
    dnPicker.addEventListener('change', () => {
      selectedDate = dnPicker.value;
      render();
      renderWeight();
    });
  }

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
          const ew = exWeights[ex.key];
          let weightHtml = '';
          if (ex.hasWeight) {
            if (ew) {
              weightHtml = `
                <div class="ex-weight">
                  <button class="ew-btn" data-key="${ex.key}" data-delta="-2.5">−</button>
                  <span class="ew-val" data-key="${ex.key}">${ew} кг</span>
                  <button class="ew-btn" data-key="${ex.key}" data-delta="2.5">+</button>
                </div>
              `;
            } else {
              weightHtml = `<div class="ex-weight"><button class="ew-btn ew-set" data-key="${ex.key}" data-delta="prompt">+ Вага</button></div>`;
            }
          }
          return `
            <div class="exercise ${checked ? 'done' : ''}" data-key="${ex.key}">
              <div class="ex-thumb"><img src="${ex.img}" alt="${ex.name}" loading="lazy"></div>
              <div class="ex-info">
                <div class="ex-info-top">
                  <div class="ex-name">${ex.name}</div>
                  <div class="ex-badge">${ex.badge}</div>
                </div>
                <div class="ex-desc">${ex.desc}</div>
                ${weightHtml}
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

  // Toggle workout blocks
  document.querySelectorAll('#blocks .block-header').forEach(h => {
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

  // Exercise weight events
  document.querySelectorAll('.ew-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const delta = btn.dataset.delta;
      const exWeights = loadExWeights();

      if (delta === 'prompt') {
        const val = prompt('Введіть вагу (кг):');
        if (val === null) return;
        const num = parseFloat(val);
        if (!num || num <= 0) { showToast('Некоректне значення'); return; }
        exWeights[key] = num;
      } else {
        const step = parseFloat(delta);
        const current = exWeights[key] || 0;
        const next = Math.max(0, Math.round((current + step) * 10) / 10);
        if (next <= 0) {
          if (!confirm('Видалити вагу для цієї вправи?')) return;
          delete exWeights[key];
          saveExWeights(exWeights);
          render();
          return;
        }
        exWeights[key] = next;
      }

      saveExWeights(exWeights);
      render();
    });
  });

  // Click on weight value to edit
  document.querySelectorAll('.ew-val').forEach(el => {
    el.addEventListener('click', () => {
      const key = el.dataset.key;
      const exWeights = loadExWeights();
      const current = exWeights[key] || '';
      const val = prompt('Вага (кг):', current);
      if (val === null) return;
      const num = parseFloat(val);
      if (!num || num <= 0) { showToast('Некоректне значення'); return; }
      exWeights[key] = num;
      saveExWeights(exWeights);
      render();
    });
  });

  renderHistory();
}

function resetProgress() {
  const label = selectedDate === todayStr() ? 'сьогодні' : formatDate(selectedDate);
  if (!confirm(`Скинути прогрес на ${label}?`)) return;
  const all = loadAllProgress();
  delete all[selectedDate];
  saveAllProgress(all);
  selectedDate = todayStr();
  render();
  renderWeight();
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

function navigateDate(delta) {
  const d = new Date(selectedDate + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  const newDate = localDateStr(d);
  if (newDate > todayStr()) return;
  selectedDate = newDate;
  render();
  renderWeight();
}

function goToToday() {
  selectedDate = todayStr();
  render();
  renderWeight();
}

function renderHistory() {
  const container = document.getElementById('history-section');
  if (!container) return;
  const all = loadAllProgress();
  const dates = Object.keys(all).filter(d => {
    const p = all[d];
    return p && typeof p === 'object' && Object.keys(p).length > 0;
  }).sort().reverse();
  const allKeys = getAllKeys();
  const total = allKeys.length;
  if (dates.length === 0) {
    container.innerHTML = '<div class="history-empty">Ще немає записів тренувань</div>';
    return;
  }
  container.innerHTML = dates.map(d => {
    const progress = all[d] || {};
    const done = allKeys.filter(k => progress[k]).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const isSel = d === selectedDate;
    return `
      <div class="history-entry ${isSel ? 'history-curr' : ''}" data-date="${d}">
        <span class="h-date">${formatDate(d)}</span>
        <div class="h-bar"><div class="h-fill" style="width:${pct}%"></div></div>
        <span class="h-pct">${done}/${total} · ${pct}%</span>
      </div>
    `;
  }).join('');
  container.querySelectorAll('.history-entry').forEach(el => {
    el.addEventListener('click', () => {
      selectedDate = el.dataset.date;
      render();
      renderWeight();
    });
  });
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

// History block toggle
document.querySelector('.block-history .block-header')?.addEventListener('click', () => {
  const body = document.getElementById('history-section');
  const arrow = document.querySelector('.block-history .arrow');
  if (body && arrow) {
    const isOpen = body.classList.toggle('open');
    arrow.classList.toggle('open', isOpen);
  }
});

render();
renderWeight();
