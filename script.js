// ── TIME SLOTS ──────────────────────────────────
const JUTARNJI = [
  { num: 1, time: '8:00–8:45' },
  { num: 2, time: '8:50–9:35' },
  { num: 3, time: '9:45–10:30' },
  { num: 4, time: '10:40–11:25' },
  { num: 5, time: '11:30–12:15' },
  { num: 6, time: '12:20–13:05' },
  { num: 7, time: '13:10–13:55' },
];
const POPODNEVNI = [
  { num: 1, time: '14:00–14:45' },
  { num: 2, time: '14:50–15:35' },
  { num: 3, time: '15:45–16:30' },
  { num: 4, time: '16:40–17:25' },
  { num: 5, time: '17:30–18:15' },
  { num: 6, time: '18:20–19:05' },
];
const DAYS = [
  { key: 'Po', name: 'Ponedjeljak' },
  { key: 'Ut', name: 'Utorak' },
  { key: 'Sr', name: 'Srijeda' },
  { key: 'Če', name: 'Četvrtak' },
  { key: 'Pe', name: 'Petak' },
];
const SMJENE = ['A', 'B'];
const MAX_PER_CELL = 3;
const MAX_HOURS_WEEK = 2;

// ── DEFAULT DATA ─────────────────────────────────
const DEFAULT_PROFESORI = [
  { id: 'p1', name: 'Ana', color: '#ef4444' },
  { id: 'p2', name: 'Vanja', color: '#8b5cf6' },
  { id: 'p3', name: 'Andrea', color: '#ec4899' },
  { id: 'p4', name: 'Tomislav', color: '#3b82f6' },
];
const DEFAULT_RAZREDI_CONFIG = [
  { grade: 1, count: 5 },
  { grade: 2, count: 5 },
  { grade: 3, count: 5 },
  { grade: 4, count: 6 },
  { grade: 5, count: 6 },
  { grade: 6, count: 5 },
  { grade: 7, count: 4 },
  { grade: 8, count: 2 },
];

// ── STATE ────────────────────────────────────────
let profesori = [];
let razredeConfig = [];  // [{grade, count}]
// schedule: { [smjena]: { [day]: { [period_type_num]: [{razredId, profesorId}] } } }
let schedule = {};

// ── PERSIST ──────────────────────────────────────
function save() {
  localStorage.setItem('rn_profesori', JSON.stringify(profesori));
  localStorage.setItem('rn_razredi', JSON.stringify(razredeConfig));
  localStorage.setItem('rn_schedule', JSON.stringify(schedule));
}
function load() {
  try {
    const p = localStorage.getItem('rn_profesori');
    profesori = p ? JSON.parse(p) : JSON.parse(JSON.stringify(DEFAULT_PROFESORI));
    const r = localStorage.getItem('rn_razredi');
    razredeConfig = r ? JSON.parse(r) : JSON.parse(JSON.stringify(DEFAULT_RAZREDI_CONFIG));
    const s = localStorage.getItem('rn_schedule');
    schedule = s ? JSON.parse(s) : {};
  } catch(e) {
    profesori = JSON.parse(JSON.stringify(DEFAULT_PROFESORI));
    razredeConfig = JSON.parse(JSON.stringify(DEFAULT_RAZREDI_CONFIG));
    schedule = {};
  }
}

// ── HELPERS ──────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function getProfesor(id) { return profesori.find(p => p.id === id); }

function getAllRazredi() {
  // Returns array of class IDs like "1A", "1B", "2A" etc.
  const list = [];
  razredeConfig.forEach(({ grade, count }) => {
    for (let i = 0; i < count; i++) {
      const letter = String.fromCharCode(65 + i); // A, B, C...
      list.push(`${grade}${letter}`);
    }
  });
  return list;
}

// Get all entries in a smjena for a given razredId
function getWeeklyHoursForRazred(smjena, razredId) {
  let count = 0;
  const smjenaData = schedule[smjena] || {};
  DAYS.forEach(({ key }) => {
    const dayData = smjenaData[key] || {};
    ['j', 'p'].forEach(type => {
      const slots = type === 'j' ? JUTARNJI : POPODNEVNI;
      slots.forEach(({ num }) => {
        const cellKey = `${type}${num}`;
        const entries = dayData[cellKey] || [];
        entries.forEach(e => { if (e.razredId === razredId) count++; });
      });
    });
  });
  return count;
}

function getCellKey(type, num) { return `${type}${num}`; }

function getCell(smjena, day, cellKey) {
  if (!schedule[smjena]) schedule[smjena] = {};
  if (!schedule[smjena][day]) schedule[smjena][day] = {};
  if (!schedule[smjena][day][cellKey]) schedule[smjena][day][cellKey] = [];
  return schedule[smjena][day][cellKey];
}

// ── TOAST ────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'error') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast hidden'; }, 3200);
}

// ── NAVIGATION ───────────────────────────────────
function setPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${pageId}`).classList.add('active');
  document.querySelector(`.nav-item[data-page="${pageId}"]`).classList.add('active');
  if (pageId === 'raspored') renderSchedule();
  if (pageId === 'profesori') renderProfesori();
  if (pageId === 'razredi') renderRazredi();
  if (pageId === 'statistika') renderStatistika();
}

// ── RENDER SCHEDULE ───────────────────────────────
function renderSchedule() {
  const container = document.getElementById('schedule-container');
  container.innerHTML = '';
  SMJENE.forEach(smjena => {
    const block = document.createElement('div');
    block.className = 'smjena-block';
    block.innerHTML = `<div class="smjena-label">${smjena} SMJENA</div>`;
    const wrapper = document.createElement('div');
    wrapper.className = 'schedule-wrapper';
    wrapper.appendChild(buildScheduleTable(smjena));
    block.appendChild(wrapper);
    container.appendChild(block);
  });
}

function buildScheduleTable(smjena) {
  const table = document.createElement('table');
  table.className = 'schedule-table';

  // Row 1: group headers
  const row1 = document.createElement('tr');
  // empty corner cell spanning day column
  const corner = document.createElement('th');
  corner.rowSpan = 2;
  corner.style.cssText = 'width:36px;background:#f8fafc;border-right:2px solid #e2e8f0;';
  row1.appendChild(corner);

  const thJ = document.createElement('th');
  thJ.colSpan = JUTARNJI.length;
  thJ.className = 'th-group jutarnji';
  thJ.textContent = 'JUTARNJI SATI';
  row1.appendChild(thJ);

  const thP = document.createElement('th');
  thP.colSpan = POPODNEVNI.length;
  thP.className = 'th-group popodnevni';
  thP.textContent = 'POPODNEVNI SATI';
  row1.appendChild(thP);

  table.appendChild(row1);

  // Row 2: individual hour headers
  const row2 = document.createElement('tr');
  JUTARNJI.forEach(({ num, time }) => {
    const th = document.createElement('th');
    th.className = 'th-sat';
    th.innerHTML = `<span class="sat-num">${num}.</span><span class="sat-time">${time}</span>`;
    row2.appendChild(th);
  });
  POPODNEVNI.forEach(({ num, time }) => {
    const th = document.createElement('th');
    th.className = 'th-sat';
    th.innerHTML = `<span class="sat-num">${num}.</span><span class="sat-time">${time}</span>`;
    row2.appendChild(th);
  });
  table.appendChild(row2);

  // Data rows
  DAYS.forEach(({ key, name }) => {
    const tr = document.createElement('tr');
    const tdDay = document.createElement('td');
    tdDay.className = 'td-day';
    tdDay.textContent = key;
    tr.appendChild(tdDay);

    // Jutarnji cells
    JUTARNJI.forEach(({ num }) => {
      tr.appendChild(buildCell(smjena, key, 'j', num));
    });
    // Popodnevni cells
    POPODNEVNI.forEach(({ num }) => {
      tr.appendChild(buildCell(smjena, key, 'p', num));
    });
    table.appendChild(tr);
  });

  return table;
}

function buildCell(smjena, day, type, num) {
  const cellKey = getCellKey(type, num);
  const entries = getCell(smjena, day, cellKey);
  const td = document.createElement('td');
  td.className = 'td-cell';
  const inner = document.createElement('div');
  inner.className = 'cell-inner';

  if (entries.length === 0) {
    inner.innerHTML = `<span class="cell-plus">+</span>`;
  } else {
    entries.forEach((entry, idx) => {
      const prof = getProfesor(entry.profesorId);
      const color = prof ? prof.color : '#94a3b8';
      const wrap = document.createElement('div');
      wrap.className = 'cell-entry-wrap';
      const chip = document.createElement('span');
      chip.className = 'cell-entry';
      chip.style.background = color;
      chip.title = `${entry.razredId}${prof ? ' – ' + prof.name : ''}\nKlikni za uklanjanje`;
      chip.textContent = entry.razredId;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        removeEntry(smjena, day, cellKey, idx);
      });
      wrap.appendChild(chip);
      inner.appendChild(wrap);
    });
    if (entries.length < MAX_PER_CELL) {
      const plus = document.createElement('span');
      plus.className = 'cell-plus';
      plus.textContent = '+';
      inner.appendChild(plus);
    }
  }

  td.appendChild(inner);
  td.addEventListener('click', () => openModal(smjena, day, type, num));
  return td;
}

function removeEntry(smjena, day, cellKey, idx) {
  const entries = getCell(smjena, day, cellKey);
  entries.splice(idx, 1);
  save();
  renderSchedule();
}

// ── MODAL: Schedule ───────────────────────────────
let modalCtx = null; // {smjena, day, type, num, cellKey, dayName, slotLabel}
let selectedRazred = null;

function openModal(smjena, day, type, num) {
  const cellKey = getCellKey(type, num);
  const entries = getCell(smjena, day, cellKey);
  const dayObj = DAYS.find(d => d.key === day);
  const slots = type === 'j' ? JUTARNJI : POPODNEVNI;
  const slot = slots.find(s => s.num === num);

  modalCtx = { smjena, day, type, num, cellKey };
  selectedRazred = null;

  document.getElementById('modal-title').textContent =
    `${smjena} smjena — ${dayObj.name}, ${num}. sat (${slot.time})`;

  // Populate razred list
  const razredList = document.getElementById('modal-razred-list');
  razredList.innerHTML = '';
  const allRazredi = getAllRazredi();

  allRazredi.forEach(rId => {
    const alreadyInCell = entries.some(e => e.razredId === rId);
    const weeklyHours = getWeeklyHoursForRazred(smjena, rId);
    const atLimit = weeklyHours >= MAX_HOURS_WEEK;
    const div = document.createElement('div');
    div.className = 'razred-option' + (atLimit ? ' disabled' : '');
    div.textContent = rId + (atLimit ? ` (${weeklyHours}/${MAX_HOURS_WEEK} sati)` : '');
    if (alreadyInCell) {
      div.classList.add('disabled');
      div.textContent = rId + ' (već dodan)';
    }
    if (!atLimit && !alreadyInCell) {
      div.addEventListener('click', () => {
        document.querySelectorAll('.razred-option').forEach(o => o.classList.remove('selected'));
        div.classList.add('selected');
        selectedRazred = rId;
      });
    }
    razredList.appendChild(div);
  });

  // Populate profesor dropdown
  const sel = document.getElementById('modal-profesor-select');
  sel.innerHTML = '<option value="">Odaberi profesora...</option>';
  profesori.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });

  // Show existing entries
  const existingEl = document.getElementById('modal-existing');
  existingEl.innerHTML = '';
  if (entries.length > 0) {
    const label = document.createElement('div');
    label.style.cssText = 'font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.8px;margin-bottom:6px;';
    label.textContent = 'TRENUTNI UNOSI';
    existingEl.appendChild(label);
    entries.forEach((entry, idx) => {
      const prof = getProfesor(entry.profesorId);
      const div = document.createElement('div');
      div.className = 'existing-entry';
      div.innerHTML = `
        <span class="existing-entry-dot" style="background:${prof ? prof.color : '#94a3b8'}"></span>
        <div class="existing-entry-info">
          <div class="existing-entry-class">${entry.razredId}</div>
          <div class="existing-entry-profesor">${prof ? prof.name : 'Nepoznat profesor'}</div>
        </div>
        <button class="btn-remove-entry" title="Ukloni">✕</button>
      `;
      div.querySelector('.btn-remove-entry').addEventListener('click', () => {
        removeEntry(smjena, day, cellKey, idx);
        openModal(smjena, day, type, num); // re-open to refresh
      });
      existingEl.appendChild(div);
    });
  }

  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  modalCtx = null;
  selectedRazred = null;
}

function addToSchedule() {
  if (!modalCtx) return;
  if (!selectedRazred) { showToast('Odaberite razred!'); return; }
  const profesorId = document.getElementById('modal-profesor-select').value;
  if (!profesorId) { showToast('Odaberite profesora!'); return; }

  const { smjena, day, cellKey } = modalCtx;
  const entries = getCell(smjena, day, cellKey);

  // Max per cell check
  if (entries.length >= MAX_PER_CELL) {
    showToast(`Maksimalno ${MAX_PER_CELL} razreda po slotu!`); return;
  }
  // Already in cell
  if (entries.some(e => e.razredId === selectedRazred)) {
    showToast('Ovaj razred je već u ovom slotu!'); return;
  }
  // Weekly hours check
  const weekly = getWeeklyHoursForRazred(smjena, selectedRazred);
  if (weekly >= MAX_HOURS_WEEK) {
    showToast(`${selectedRazred} već ima ${MAX_HOURS_WEEK} sata tjedno u ${smjena} smjeni!`); return;
  }

  entries.push({ razredId: selectedRazred, profesorId });
  save();
  renderSchedule();
  // Re-open to show updated state
  const { type, num } = modalCtx;
  openModal(smjena, day, type, num);
  showToast(`${selectedRazred} dodan u raspored!`, 'success');
}

// ── RENDER PROFESORI ──────────────────────────────
function renderProfesori() {
  const list = document.getElementById('profesori-list');
  list.innerHTML = '';
  if (profesori.length === 0) {
    list.innerHTML = '<div class="empty-state">Nema profesora. Dodajte prvog profesora.</div>';
    return;
  }
  profesori.forEach(p => {
    const card = document.createElement('div');
    card.className = 'profesor-card';
    card.innerHTML = `
      <div class="profesor-avatar" style="background:${p.color}"></div>
      <div class="profesor-info">
        <div class="profesor-name">${escHtml(p.name)}</div>
        <div class="profesor-color-code">${p.color}</div>
      </div>
      <div class="profesor-actions">
        <button class="btn-icon" data-edit="${p.id}" title="Uredi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon danger" data-del="${p.id}" title="Obriši">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2 2 0 0 1-2,2H8a2 2 0 0 1-2-2L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1,1v2"/></svg>
        </button>
      </div>
    `;
    card.querySelector('[data-edit]').addEventListener('click', () => openProfesorModal(p.id));
    card.querySelector('[data-del]').addEventListener('click', () => confirmDeleteProfesor(p.id));
    list.appendChild(card);
  });
}

let editingProfesorId = null;
function openProfesorModal(id = null) {
  editingProfesorId = id;
  const titleEl = document.getElementById('modal-profesor-title');
  const nameEl = document.getElementById('modal-profesor-name');
  const colorEl = document.getElementById('modal-profesor-color');
  const hexEl = document.getElementById('modal-profesor-color-hex');

  if (id) {
    const p = getProfesor(id);
    titleEl.textContent = 'Uredi profesora';
    nameEl.value = p.name;
    colorEl.value = p.color;
    hexEl.textContent = p.color;
  } else {
    titleEl.textContent = 'Novi profesor';
    nameEl.value = '';
    colorEl.value = '#3b82f6';
    hexEl.textContent = '#3b82f6';
  }
  document.getElementById('modal-profesor-overlay').classList.remove('hidden');
  setTimeout(() => nameEl.focus(), 60);
}
function closeProfesorModal() {
  document.getElementById('modal-profesor-overlay').classList.add('hidden');
  editingProfesorId = null;
}
function saveProfesor() {
  const name = document.getElementById('modal-profesor-name').value.trim();
  const color = document.getElementById('modal-profesor-color').value;
  if (!name) { showToast('Unesite ime profesora!'); return; }
  if (editingProfesorId) {
    const p = getProfesor(editingProfesorId);
    p.name = name; p.color = color;
  } else {
    profesori.push({ id: uid(), name, color });
  }
  save();
  closeProfesorModal();
  renderProfesori();
  showToast('Profesor spremljen!', 'success');
}

let confirmCallback = null;
function confirmDeleteProfesor(id) {
  const p = getProfesor(id);
  document.getElementById('confirm-title').textContent = 'Obriši profesora';
  document.getElementById('confirm-message').textContent =
    `Sigurno želite obrisati profesora "${p.name}"? Unosi u rasporedu s ovim profesorom ostat će bez profesora.`;
  confirmCallback = () => {
    profesori = profesori.filter(x => x.id !== id);
    save();
    closeConfirm();
    renderProfesori();
    showToast('Profesor obrisan.', 'success');
  };
  document.getElementById('confirm-overlay').classList.remove('hidden');
}
function closeConfirm() {
  document.getElementById('confirm-overlay').classList.add('hidden');
  confirmCallback = null;
}

// ── RENDER RAZREDI ────────────────────────────────
function renderRazredi() {
  const list = document.getElementById('razredi-list');
  list.innerHTML = '';
  razredeConfig.forEach(({ grade, count }, idx) => {
    const odjeljenja = [];
    for (let i = 0; i < count; i++) {
      odjeljenja.push(`${grade}${String.fromCharCode(65 + i)}`);
    }
    const card = document.createElement('div');
    card.className = 'razred-card';
    card.innerHTML = `
      <div class="razred-badge">${grade}.</div>
      <div class="razred-info">
        <div class="razred-name">${grade}. razred</div>
        <div class="razred-odjeljenja">
          ${odjeljenja.map(o => `<span class="odjeljenje-chip">${o}</span>`).join('')}
        </div>
      </div>
      <div class="razred-counter">
        <button class="counter-btn" data-idx="${idx}" data-dir="-1">−</button>
        <span class="counter-val">${count}</span>
        <button class="counter-btn" data-idx="${idx}" data-dir="1">+</button>
      </div>
    `;
    card.querySelectorAll('.counter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = parseInt(btn.dataset.dir);
        const i = parseInt(btn.dataset.idx);
        razredeConfig[i].count = Math.max(1, Math.min(8, razredeConfig[i].count + dir));
        save();
        renderRazredi();
      });
    });
    list.appendChild(card);
  });

  const total = razredeConfig.reduce((s, r) => s + r.count, 0);
  document.getElementById('razredi-total').textContent = `Ukupno odjeljenja: ${total}`;
}

// ── RENDER STATISTIKA ─────────────────────────────
function renderStatistika() {
  const container = document.getElementById('statistika-container');
  container.innerHTML = '';

  // Count hours per razred per smjena
  const razredHours = {}; // {razredId: {A: n, B: n}}
  const profesorHours = {}; // {profesorId: {A: n, B: n}}

  SMJENE.forEach(smjena => {
    const smjenaData = schedule[smjena] || {};
    DAYS.forEach(({ key }) => {
      const dayData = smjenaData[key] || {};
      ['j', 'p'].forEach(type => {
        const slots = type === 'j' ? JUTARNJI : POPODNEVNI;
        slots.forEach(({ num }) => {
          const cellKey = `${type}${num}`;
          const entries = dayData[cellKey] || [];
          entries.forEach(e => {
            if (!razredHours[e.razredId]) razredHours[e.razredId] = { A: 0, B: 0 };
            razredHours[e.razredId][smjena]++;
            if (!profesorHours[e.profesorId]) profesorHours[e.profesorId] = { A: 0, B: 0 };
            profesorHours[e.profesorId][smjena]++;
          });
        });
      });
    });
  });

  // Razredi table
  const allRazredi = getAllRazredi();
  const secR = document.createElement('div');
  secR.className = 'stats-section';
  secR.innerHTML = `<h2>Sati po razredu (tjedno)</h2>`;
  const maxHoursR = Math.max(1, ...allRazredi.map(r => (razredHours[r]?.A || 0) + (razredHours[r]?.B || 0)));

  const tableR = document.createElement('table');
  tableR.className = 'stat-table';
  tableR.innerHTML = `<thead><tr><th>Razred</th><th>A smjena</th><th>B smjena</th><th>Ukupno</th></tr></thead>`;
  const tbodyR = document.createElement('tbody');

  allRazredi.forEach(rId => {
    const a = razredHours[rId]?.A || 0;
    const b = razredHours[rId]?.B || 0;
    const total = a + b;
    if (total === 0 && Object.keys(razredHours).length === 0) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${rId}</strong></td>
      <td>${a}</td>
      <td>${b}</td>
      <td>
        <div class="stat-bar-wrap">
          <span style="min-width:28px">${total}</span>
          <div class="stat-bar-bg"><div class="stat-bar" style="width:${(total/maxHoursR*100)}%"></div></div>
        </div>
      </td>
    `;
    tbodyR.appendChild(tr);
  });
  if (tbodyR.children.length === 0) {
    tbodyR.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px;">Nema podataka u rasporedu.</td></tr>';
  }
  tableR.appendChild(tbodyR);
  secR.appendChild(tableR);
  container.appendChild(secR);

  // Profesori table
  const secP = document.createElement('div');
  secP.className = 'stats-section';
  secP.innerHTML = `<h2>Sati po profesoru (tjedno)</h2>`;
  const maxHoursP = Math.max(1, ...profesori.map(p => (profesorHours[p.id]?.A || 0) + (profesorHours[p.id]?.B || 0)));

  const tableP = document.createElement('table');
  tableP.className = 'stat-table';
  tableP.innerHTML = `<thead><tr><th>Profesor</th><th>A smjena</th><th>B smjena</th><th>Ukupno</th></tr></thead>`;
  const tbodyP = document.createElement('tbody');

  profesori.forEach(p => {
    const a = profesorHours[p.id]?.A || 0;
    const b = profesorHours[p.id]?.B || 0;
    const total = a + b;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};flex-shrink:0;"></span>
          <strong>${escHtml(p.name)}</strong>
        </div>
      </td>
      <td>${a}</td>
      <td>${b}</td>
      <td>
        <div class="stat-bar-wrap">
          <span style="min-width:28px">${total}</span>
          <div class="stat-bar-bg"><div class="stat-bar" style="width:${(total/maxHoursP*100)}%;background:${p.color}"></div></div>
        </div>
      </td>
    `;
    tbodyP.appendChild(tr);
  });
  if (tbodyP.children.length === 0) {
    tbodyP.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px;">Nema profesora.</td></tr>';
  }
  tableP.appendChild(tbodyP);
  secP.appendChild(tableP);
  container.appendChild(secP);
}

// ── UTILS ─────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Funkcija koja briše sve unose iz rasporeda
function obrisiCijeliRaspored() {
  schedule = {};       // Potpuno praznimo raspored prema tvojoj varijabli
  save();              // Spremamo prazno stanje u localStorage
  renderSchedule();    // Ponovno iscrtavamo tvoju tablicu
  showToast('Raspored je uspješno očišćen!', 'success');
  closeConfirm();      // Zatvaramo potvrdni prozor
}

// Povezivanje gumba "Obriši sve" s tvojim ugrađenim potvrdnim prozorom
// Možeš ovo ostaviti na samom dnu datoteke
document.getElementById('btn-obrisi-sve').addEventListener('click', () => {
  document.getElementById('confirm-title').textContent = 'Obriši cijeli raspored';
  document.getElementById('confirm-message').textContent = 'Ova akcija će trajno obrisati sve upisane sate u tablici i morat ćete krenuti ispočetka.';
  confirmCallback = obrisiCijeliRaspored;
  document.getElementById('confirm-overlay').classList.remove('hidden');
});

// ── EVENT LISTENERS ───────────────────────────────
function initEvents() {
  // Nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => setPage(item.dataset.page));
  });

  // Schedule modal
  document.getElementById('btn-modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.getElementById('btn-modal-add').addEventListener('click', addToSchedule);

  // Profesor modal
  document.getElementById('btn-add-profesor').addEventListener('click', () => openProfesorModal(null));
  document.getElementById('btn-modal-profesor-close').addEventListener('click', closeProfesorModal);
  document.getElementById('modal-profesor-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-profesor-overlay')) closeProfesorModal();
  });
  document.getElementById('btn-modal-profesor-save').addEventListener('click', saveProfesor);
  document.getElementById('modal-profesor-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveProfesor();
  });
  document.getElementById('modal-profesor-color').addEventListener('input', (e) => {
    document.getElementById('modal-profesor-color-hex').textContent = e.target.value;
  });

  // Confirm dialog
  document.getElementById('btn-confirm-close').addEventListener('click', closeConfirm);
  document.getElementById('btn-confirm-cancel').addEventListener('click', closeConfirm);
  document.getElementById('btn-confirm-ok').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
  });
  document.getElementById('confirm-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirm-overlay')) closeConfirm();
  });

  // Escape key closes any open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeProfesorModal();
      closeConfirm();
    }
  });
}

// ── INIT ──────────────────────────────────────────
load();
initEvents();
renderSchedule();
