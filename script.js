import { JUTARNJI, POPODNEVNI, DAYS, SMJENE, MAX_PER_CELL, MAX_HOURS_WEEK, GRADE_TIME_RULES } from './script/config.js';
import { 
  profesori, razredeConfig, schedule, isprazniSchedule, postaviProfesore,
  load, save, uid, showToast, is4ProEnabled, toggle4Pro,
  versions, currentVersionId, getCurrentVersion, setCurrentVersion, createNewVersion, deleteVersion, renameVersion,
  getProfessorRazrediForVersion, setProfessorRazrediForVersion
} from './script/state.js';

// Varijabla za potvrdu dijaloga ostaje lokalna ovdje gdje se izvršavaju eventi
let confirmCallback = null;

// ── HELPERS (ovisni o konfiguraciji) ─────────────────
function getProfesor(id) { return profesori.find(p => p.id === id); }

function getAllRazredi() {
  const list = [];
  if (is4ProEnabled) {
    list.push('4.PRO');
  }
  razredeConfig.forEach(({ grade, count }) => {
    for (let i = 0; i < count; i++) {
      const letter = String.fromCharCode(65 + i);
      list.push(`${grade}${letter}`);
    }
  });
  return list;
}

function getWeeklyHoursForRazred(smjena, razredId) {
  let count = 0;
  const currentVersion = getCurrentVersion();
  const scheduleToUse = currentVersion ? currentVersion.schedule : schedule;
  const smjenaData = scheduleToUse[smjena] || {};
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
  const currentVersion = getCurrentVersion();
  const scheduleToUse = currentVersion ? currentVersion.schedule : schedule;
  if (!scheduleToUse[smjena]) scheduleToUse[smjena] = {};
  if (!scheduleToUse[smjena][day]) scheduleToUse[smjena][day] = {};
  if (!scheduleToUse[smjena][day][cellKey]) scheduleToUse[smjena][day][cellKey] = [];
  return scheduleToUse[smjena][day][cellKey];
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Provjeri je li razred dozvoljeno postaviti u određeno vrijeme
function isRazredAllowedInTimeSlot(razredId, smjena, type) {
  // Izvuci redni broj razreda (npr. "5A" -> 5, "4.PRO" -> null)
  const gradeMatch = razredId.match(/^(\d+)/);
  if (!gradeMatch) return true; // 4.PRO i drugi specijalni razredi - dozvoljeni svugdje
  
  const grade = parseInt(gradeMatch[1]);
  
  // Ako nema posebnog pravila, razred je dozvoljeno postaviti svugdje
  if (!GRADE_TIME_RULES[grade]) return true;
  
  const allowedTypes = GRADE_TIME_RULES[grade][smjena];
  if (!allowedTypes) return true;
  
  return allowedTypes.includes(type);
}

// ── NAVIGATION ───────────────────────────────────
function handleRouting() {
  // Uzimamo riječ iza '#' (npr. 'raspored'), a ako nema ničega, default je 'raspored'
  const hash = window.location.hash.replace('#', '') || 'raspored';
  
  // Provjeravamo postoji li uopće ta stranica u HTML-u da ne baci grešku
  const targetPage = document.getElementById(`page-${hash}`);
  const targetNav = document.querySelector(`.nav-item[data-page="${hash}"]`);
  
  if (!targetPage) {
    // Ako netko upiše krivi #link, vrati ga na početni raspored
    window.location.hash = '#raspored';
    return;
  }

  // Sakrij sve stranice i makni aktivne klase s navigacije
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Prikaži aktivnu stranicu i označi gumb u navigaciji
  targetPage.classList.add('active');
  if (targetNav) targetNav.classList.add('active');

  // Pokreni crtanje ovisno o tome na kojoj smo stranici
  if (hash === 'raspored') renderSchedule();
  if (hash === 'profesori') renderProfesori();
  if (hash === 'razredi') renderRazredi();
  if (hash === 'statistika') renderStatistika();
}

// ── RENDER SCHEDULE ───────────────────────────────
function renderSchedule() {
  const container = document.getElementById('schedule-container');
  container.innerHTML = '';
  
  const currentVersion = getCurrentVersion();
  const versionName = currentVersion ? currentVersion.name : 'Nepoznata verzija';
  
  // Ažuriraj heading s nazivom verzije
  const heading = document.querySelector('.page-header h1');
  if (heading) {
    heading.innerHTML = `Tjedni Raspored <span style="font-size: 14px; font-weight: 500; color: #64748b; margin-left: 8px;">(${escHtml(versionName)})</span>`;
  }
  
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

  const row1 = document.createElement('tr');
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

  DAYS.forEach(({ key }) => {
    const tr = document.createElement('tr');
    const tdDay = document.createElement('td');
    tdDay.className = 'td-day';
    tdDay.textContent = key;
    tr.appendChild(tdDay);

    JUTARNJI.forEach(({ num }) => { tr.appendChild(buildCell(smjena, key, 'j', num)); });
    POPODNEVNI.forEach(({ num }) => { tr.appendChild(buildCell(smjena, key, 'p', num)); });
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
let modalCtx = null;
let selectedRazred = null;

function openModal(smjena, day, type, num) {
  const cellKey = getCellKey(type, num);
  const entries = getCell(smjena, day, cellKey);
  const dayObj = DAYS.find(d => d.key === day);
  const slots = type === 'j' ? JUTARNJI : POPODNEVNI;
  const slot = slots.find(s => s.num === num);

  modalCtx = { smjena, day, type, num, cellKey };
  selectedRazred = null;

  document.getElementById('modal-title').textContent = `${smjena} smjena — ${dayObj.name}, ${num}. sat (${slot.time})`;

  const razredList = document.getElementById('modal-razred-list');
  razredList.innerHTML = '';
  const allRazredi = getAllRazredi();

  // Prvo procijeni status svakog razreda
  const razrediWithStatus = allRazredi.map(rId => {
    const alreadyInCell = entries.some(e => e.razredId === rId);
    const weeklyHours = getWeeklyHoursForRazred(smjena, rId);
    const atLimit = weeklyHours >= MAX_HOURS_WEEK;
    const isAllowed = isRazredAllowedInTimeSlot(rId, smjena, type);
    const isEnabled = !atLimit && !alreadyInCell && isAllowed;
    
    return { rId, alreadyInCell, weeklyHours, atLimit, isAllowed, isEnabled };
  });

  // Sortiraj: omogućeni razredi prvi, zatim disabled
  razrediWithStatus.sort((a, b) => b.isEnabled - a.isEnabled);

  razrediWithStatus.forEach(({ rId, alreadyInCell, weeklyHours, atLimit, isAllowed, isEnabled }) => {
    const div = document.createElement('div');
    div.className = 'razred-option' + (!isEnabled ? ' disabled' : '');
    
    let statusText = '';
    if (alreadyInCell) {
      statusText = ' (već dodan)';
    } else if (atLimit) {
      statusText = ` (${weeklyHours}/${MAX_HOURS_WEEK} sati)`;
    } else if (!isAllowed) {
      const gradeMatch = rId.match(/^(\d+)/);
      if (gradeMatch) {
        const grade = parseInt(gradeMatch[1]);
        if (GRADE_TIME_RULES[grade] && GRADE_TIME_RULES[grade][smjena]) {
          const timeDesc = GRADE_TIME_RULES[grade][smjena].includes('j') ? 'samo ujutro' : 'samo popodne';
          statusText = ` (${timeDesc})`;
        }
      }
    }
    
    div.textContent = rId + statusText;
    
    if (isEnabled) {
      div.addEventListener('click', () => {
        document.querySelectorAll('.razred-option').forEach(o => o.classList.remove('selected'));
        div.classList.add('selected');
        selectedRazred = rId;
      });
    }
    razredList.appendChild(div);
  });

  const sel = document.getElementById('modal-profesor-select');
  sel.innerHTML = '<option value="">Odaberi profesora...</option>';
  profesori.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });

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
        openModal(smjena, day, type, num);
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

  const { smjena, day, cellKey, type, num } = modalCtx;
  const entries = getCell(smjena, day, cellKey);

  if (entries.length >= MAX_PER_CELL) { showToast(`Maksimalno ${MAX_PER_CELL} razreda po slotu!`); return; }
  if (entries.some(e => e.razredId === selectedRazred)) { showToast('Ovaj razred je već u ovom slotu!'); return; }
  
  // Provjera vremenske ograničenja
  if (!isRazredAllowedInTimeSlot(selectedRazred, smjena, type)) {
    const gradeMatch = selectedRazred.match(/^(\d+)/);
    if (gradeMatch) {
      const grade = parseInt(gradeMatch[1]);
      if (GRADE_TIME_RULES[grade] && GRADE_TIME_RULES[grade][smjena]) {
        const timeDesc = GRADE_TIME_RULES[grade][smjena].includes('j') ? 'samo ujutro' : 'samo popodne';
        showToast(`${selectedRazred} može imati nastavu ${timeDesc} u ${smjena} smjeni!`);
      }
    }
    return;
  }
  
  const weekly = getWeeklyHoursForRazred(smjena, selectedRazred);
  if (weekly >= MAX_HOURS_WEEK) { showToast(`${selectedRazred} već ima ${MAX_HOURS_WEEK} sata tjedno u ${smjena} smjeni!`); return; }
  
  // --- ISPRAVLJENI DIO ZA PROVJERU PROFESORA ---
  let profesorZauzet = false;
  
  // Gledamo samo podatke za TRENUTNU smjenu (npr. samo A ili samo B)
  const currentVersion = getCurrentVersion();
  const scheduleToUse = currentVersion ? currentVersion.schedule : schedule;
  const smjenaData = scheduleToUse[smjena] || {}; 
  const dayData = smjenaData[day] || {};
  const trenutniSlotEntries = dayData[cellKey] || [];
  
  if (trenutniSlotEntries.some(e => e.profesorId === profesorId)) {
    profesorZauzet = true;
  }
  // ----------------------------------------------

  if (profesorZauzet) {
    const prof = getProfesor(profesorId);
    showToast(`Profesor ${prof ? prof.name : ''} je već zauzet u ovom terminu!`);
    return;
  }

  entries.push({ razredId: selectedRazred, profesorId });
  save();
  renderSchedule();
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
        <button class="btn-icon" data-edit="${p.id}" title="Uredi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="btn-icon danger" data-del="${p.id}" title="Obriši"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2 2 0 0 1-2,2H8a2 2 0 0 1-2-2L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1,1v2"/></svg></button>
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
    nameEl.value = p.name; colorEl.value = p.color; hexEl.textContent = p.color;
  } else {
    titleEl.textContent = 'Novi profesor';
    nameEl.value = ''; colorEl.value = '#3b82f6'; hexEl.textContent = '#3b82f6';
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

function confirmDeleteProfesor(id) {
  const p = getProfesor(id);
  document.getElementById('confirm-title').textContent = 'Obriši profesora';
  document.getElementById('confirm-message').textContent = `Sigurno želite obrisati profesora "${p.name}"? Unosi u rasporedu s ovim profesorom ostat će bez profesora.`;
  confirmCallback = () => {
    postaviProfesore(profesori.filter(x => x.id !== id));
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
    for (let i = 0; i < count; i++) { odjeljenja.push(`${grade}${String.fromCharCode(65 + i)}`); }
    const card = document.createElement('div');
    card.className = 'razred-card';
    card.innerHTML = `
      <div class="razred-badge">${grade}.</div>
      <div class="razred-info">
        <div class="razred-name">${grade}. razred</div>
        <div class="razred-odjeljenja">${odjeljenja.map(o => `<span class="odjeljenje-chip">${o}</span>`).join('')}</div>
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
  const proCard = document.createElement('div');
  proCard.className = 'razred-card';
  proCard.style.borderLeft = '4px solid #10b981'; // Zeleni rub da se istakne
  proCard.innerHTML = `
    <div class="razred-badge" style="background:#e6f4ea; color:#10b981;">PRO</div>
    <div class="razred-info">
      <div class="razred-name">4.PRO razred</div>
      <div class="razred-odjeljenja">
        <span class="odjeljenje-chip" style="${is4ProEnabled ? '' : 'background:#e2e8f0; color:#94a3b8; text-line-through'}">
          4.PRO (${is4ProEnabled ? 'Uključen' : 'Isključen'})
        </span>
      </div>
    </div>
    <div class="razred-counter">
      <label class="switch" style="position:relative; display:inline-block; width:44px; height:24px;">
        <input type="checkbox" id="toggle-4pro" ${is4ProEnabled ? 'checked' : ''} style="opacity:0; width:0; height:0;">
        <span class="slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${is4ProEnabled ? '#10b981' : '#cbd5e1'}; transition:.3s; border-radius:24px;"></span>
      </label>
    </div>
  `;

  // Slušač događaja za On/Off sklopku
  proCard.querySelector('#toggle-4pro').addEventListener('change', (e) => {
    toggle4Pro(e.target.checked);
    save();
    renderRazredi(); // Ponovno iscrtaj stranicu razreda da se ažurira izgled
    showToast(e.target.checked ? '4.PRO razred aktiviran!' : '4.PRO razred deaktiviran!', 'success');
  });

  list.appendChild(proCard);
  const total = razredeConfig.reduce((s, r) => s + r.count, 0) + (is4ProEnabled ? 1 : 0);
  document.getElementById('razredi-total').textContent = `Ukupno odjeljenja: ${total}`;
}

// ── RENDER STATISTIKA ─────────────────────────────
function renderStatistika() {
  const container = document.getElementById('statistika-container');
  container.innerHTML = '';

  const razredHours = {};
  const profesorHours = {};

  const currentVersion = getCurrentVersion();
  const scheduleToUse = currentVersion ? currentVersion.schedule : schedule;

  SMJENE.forEach(smjena => {
    const smjenaData = scheduleToUse[smjena] || {};
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
  tableP.appendChild(tbodyP);
  secP.appendChild(tableP);
  container.appendChild(secP);
}

function obrisiCijeliRaspored() {
  const currentVersion = getCurrentVersion();
  if (currentVersion) {
    for (let kljuc in currentVersion.schedule) {
      delete currentVersion.schedule[kljuc];
    }
  }
  save();
  renderSchedule();
  showToast('Raspored je uspješno očišćen!', 'success');
  closeConfirm();
}

// ── VERZIJE ─────────────────────────────────
function openVerzijModal() {
  renderVerzije();
  document.getElementById('modal-verzije-overlay').classList.remove('hidden');
}

function closeVerzijModal() {
  document.getElementById('modal-verzije-overlay').classList.add('hidden');
}

function renderVerzije() {
  const list = document.getElementById('verzije-list');
  list.innerHTML = '';
  
  versions.forEach(v => {
    const isActive = v.id === currentVersionId;
    const card = document.createElement('div');
    card.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      margin-bottom: 8px;
      border-radius: 8px;
      cursor: pointer;
      background: ${isActive ? '#eff6ff' : '#f8fafc'};
      border: 1px solid ${isActive ? '#bfdbfe' : '#e2e8f0'};
      transition: all 0.15s;
    `;
    card.innerHTML = `
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #1e293b; font-size: 14px;">${escHtml(v.name)}</div>
        <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Sati: ${Object.values(v.schedule).flat().flat().length} unosa</div>
      </div>
      ${isActive ? '<span style="color: #2563eb; font-weight: 700; font-size: 12px;">AKTIVNA</span>' : ''}
      <button class="btn-icon" data-verzija-edit="${v.id}" title="Uredi" style="margin-left: 8px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      ${versions.length > 1 ? `<button class="btn-icon danger" data-verzija-del="${v.id}" title="Obriši"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2 2 0 0 1-2,2H8a2 2 0 0 1-2-2L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1,1v2"/></svg></button>` : ''}
    `;
    
    if (!isActive) {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          setCurrentVersion(v.id);
          renderSchedule();
          renderVerzije();
          closeVerzijModal();
          showToast(`Verzija "${v.name}" je sada aktivna`, 'success');
        }
      });
    }
    
    const editBtn = card.querySelector(`[data-verzija-edit="${v.id}"]`);
    if (editBtn) {
      editBtn.addEventListener('click', () => openRenameVerzijModal(v.id, v.name));
    }
    
    const delBtn = card.querySelector(`[data-verzija-del="${v.id}"]`);
    if (delBtn) {
      delBtn.addEventListener('click', () => confirmDeleteVersion(v.id, v.name));
    }
    
    list.appendChild(card);
  });
}

function openRenameVerzijModal(versionId, currentName) {
  const newName = prompt('Novo ime verzije:', currentName);
  if (newName && newName.trim()) {
    renameVersion(versionId, newName.trim());
    renderVerzije();
    showToast('Verzija preimenovana!', 'success');
  }
}

function confirmDeleteVersion(versionId, versionName) {
  document.getElementById('confirm-title').textContent = 'Obriši verziju';
  document.getElementById('confirm-message').textContent = `Sigurno želite obrisati verziju "${versionName}"? Ova akcija se ne može poništiti.`;
  confirmCallback = () => {
    if (deleteVersion(versionId)) {
      renderSchedule();
      renderVerzije();
      closeVerzijModal();
      showToast('Verzija obrisana!', 'success');
      closeConfirm();
    } else {
      showToast('Nije moguće obrisati jedinu verziju!', 'error');
    }
  };
  document.getElementById('confirm-overlay').classList.remove('hidden');
}

function createAndSelectNewVersion() {
  const name = prompt('Ime nove verzije:');
  if (name && name.trim()) {
    createNewVersion(name.trim());
    renderSchedule();
    closeVerzijModal();
    showToast('Nova verzija kreirana!', 'success');
  }
}

// ── EVENT LISTENERS ───────────────────────────────
function initEvents() {
  // Navigacija: Klik na gumb sada samo mijenja URL Hash
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      window.location.hash = `#${item.dataset.page}`;
    });
  });

  // Slušaj promjene u URL-u (ako korisnik klikne Back/Forward ili ručno promijeni #)
  window.addEventListener('hashchange', handleRouting);

  // Verzije
  document.getElementById('btn-verzije').addEventListener('click', openVerzijModal);
  document.getElementById('btn-modal-verzije-close').addEventListener('click', closeVerzijModal);
  document.getElementById('modal-verzije-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-verzije-overlay')) closeVerzijModal();
  });
  document.getElementById('btn-nova-verzija').addEventListener('click', createAndSelectNewVersion);

  // --- Ostatak tvojih modal i confirm evenata ostaje ISTI ---
  document.getElementById('btn-obrisi-sve').addEventListener('click', () => {
    document.getElementById('confirm-title').textContent = 'Obriši cijeli raspored';
    document.getElementById('confirm-message').textContent = 'Ova akcija će trajno obrisati sve upisane sate u tablici i morat ćete krenuti ispočetka.';
    confirmCallback = obrisiCijeliRaspored;
    document.getElementById('confirm-overlay').classList.remove('hidden');
  });

  document.getElementById('btn-modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.getElementById('btn-modal-add').addEventListener('click', addToSchedule);

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

  document.getElementById('btn-confirm-close').addEventListener('click', closeConfirm);
  document.getElementById('btn-confirm-cancel').addEventListener('click', closeConfirm);
  document.getElementById('btn-confirm-ok').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
  });
  document.getElementById('confirm-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirm-overlay')) closeConfirm();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); closeProfesorModal(); closeConfirm(); }
  });
}

// ── INIT ──────────────────────────────────────────
load();
initEvents();
handleRouting();