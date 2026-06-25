import { DEFAULT_PROFESORI, DEFAULT_RAZREDI_CONFIG } from './config.js';

export let profesori = [];
export let razredeConfig = [];
export let schedule = {};
export let is4ProEnabled = true;

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
  } catch(e) {
    profesori = JSON.parse(JSON.stringify(DEFAULT_PROFESORI));
    razredeConfig = JSON.parse(JSON.stringify(DEFAULT_RAZREDI_CONFIG));
    schedule = {};
  }
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

let toastTimer = null;
export function showToast(msg, type = 'error') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast hidden'; }, 3200);
}