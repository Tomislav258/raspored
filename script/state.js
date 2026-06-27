import { DEFAULT_PROFESORI, DEFAULT_RAZREDI_CONFIG } from './config.js';

export let profesori = [];
export let razredeConfig = [];
export let schedule = {};
export let is4ProEnabled = true;

// Verzije rasporeda
export let versions = [];
export let currentVersionId = null;

// Funkcija za potpuno pražnjenje objekta rasporeda (koristi se kod brisanja svega)
export function isprazniSchedule() {
  for (let kljuc in schedule) {
    delete schedule[kljuc];
  }
}

// Funkcija za ažuriranje profesora (kod brisanja/filtriranja)
export function postaviProfesore(noviNiz) {
  profesori = noviNiz;
}

export function toggle4Pro(vrijednost) {
  is4ProEnabled = vrijednost;
}

export function save() {
  localStorage.setItem('rn_profesori', JSON.stringify(profesori));
  localStorage.setItem('rn_razredi', JSON.stringify(razredeConfig));
  localStorage.setItem('rn_schedule', JSON.stringify(schedule));
  localStorage.setItem('rn_4pro_enabled', JSON.stringify(is4ProEnabled));
  localStorage.setItem('rn_versions', JSON.stringify(versions));
  localStorage.setItem('rn_currentVersionId', JSON.stringify(currentVersionId));
}

export function load() {
  try {
    const p = localStorage.getItem('rn_profesori');
    profesori = p ? JSON.parse(p) : JSON.parse(JSON.stringify(DEFAULT_PROFESORI));
    const r = localStorage.getItem('rn_razredi');
    razredeConfig = r ? JSON.parse(r) : JSON.parse(JSON.stringify(DEFAULT_RAZREDI_CONFIG));
    const s = localStorage.getItem('rn_schedule');
    schedule = s ? JSON.parse(s) : {};
    const pro = localStorage.getItem('rn_4pro_enabled');
    is4ProEnabled = pro ? JSON.parse(pro) : true;
    
    // Učitaj verzije
    const v = localStorage.getItem('rn_versions');
    versions = v ? JSON.parse(v) : [];
    
    // Ako nema verzija, kreiraj default verziju
    if (versions.length === 0) {
      const defaultVersion = {
        id: uid(),
        name: 'Verzija 1',
        schedule: schedule,
        profesorRazredi: {} // Mapiranje: profesorId -> [razredi koje može učiti]
      };
      versions.push(defaultVersion);
      currentVersionId = defaultVersion.id;
    } else {
      const cv = localStorage.getItem('rn_currentVersionId');
      currentVersionId = cv ? JSON.parse(cv) : versions[0].id;
    }
  } catch(e) {
    profesori = JSON.parse(JSON.stringify(DEFAULT_PROFESORI));
    razredeConfig = JSON.parse(JSON.stringify(DEFAULT_RAZREDI_CONFIG));
    schedule = {};
    const defaultVersion = {
      id: uid(),
      name: 'Verzija 1',
      schedule: {},
      profesorRazredi: {}
    };
    versions = [defaultVersion];
    currentVersionId = defaultVersion.id;
  }
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Funkcije za verzije
export function getCurrentVersion() {
  return versions.find(v => v.id === currentVersionId);
}

export function setCurrentVersion(versionId) {
  const version = versions.find(v => v.id === versionId);
  if (version) {
    currentVersionId = versionId;
    schedule = version.schedule;
    save();
  }
}

export function createNewVersion(name, copyFromVersionId = null) {
  let scheduleData = {};
  let profesorRazredi = {};

  if (copyFromVersionId) {
    const sourceVersion = versions.find(v => v.id === copyFromVersionId);
    if (sourceVersion) {
      scheduleData = JSON.parse(JSON.stringify(sourceVersion.schedule || {}));
      profesorRazredi = JSON.parse(JSON.stringify(sourceVersion.profesorRazredi || {}));
    }
  }

  const newVersion = {
    id: uid(),
    name: name || `Verzija ${versions.length + 1}`,
    schedule: scheduleData,
    profesorRazredi
  };
  versions.push(newVersion);
  currentVersionId = newVersion.id;
  schedule = newVersion.schedule;
  save();
  return newVersion;
}

export function deleteVersion(versionId) {
  if (versions.length === 1) {
    return false; // Ne mogu obrisati jedinu verziju
  }
  const idx = versions.findIndex(v => v.id === versionId);
  if (idx !== -1) {
    versions.splice(idx, 1);
    if (currentVersionId === versionId) {
      currentVersionId = versions[0].id;
      schedule = versions[0].schedule;
    }
    save();
    return true;
  }
  return false;
}

export function renameVersion(versionId, newName) {
  const version = versions.find(v => v.id === versionId);
  if (version) {
    version.name = newName;
    save();
  }
}

export function getProfessorRazrediForVersion(versionId, profesorId) {
  const version = versions.find(v => v.id === versionId);
  if (!version) return [];
  return version.profesorRazredi[profesorId] || [];
}

export function setProfessorRazrediForVersion(versionId, profesorId, razredi) {
  const version = versions.find(v => v.id === versionId);
  if (version) {
    version.profesorRazredi[profesorId] = razredi;
    save();
  }
}

let toastTimer = null;
export function showToast(msg, type = 'error') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast hidden'; }, 3200);
}
