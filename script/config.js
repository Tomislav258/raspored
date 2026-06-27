export const JUTARNJI = [
  { num: 1, time: '8:00–8:45' },
  { num: 2, time: '8:50–9:35' },
  { num: 3, time: '9:45–10:30' },
  { num: 4, time: '10:40–11:25' },
  { num: 5, time: '11:30–12:15' },
  { num: 6, time: '12:20–13:05' },
  { num: 7, time: '13:10–13:55' },
];

export const POPODNEVNI = [
  { num: 1, time: '14:00–14:45' },
  { num: 2, time: '14:50–15:35' },
  { num: 3, time: '15:45–16:30' },
  { num: 4, time: '16:40–17:25' },
  { num: 5, time: '17:30–18:15' },
  { num: 6, time: '18:20–19:05' },
];

export const DAYS = [
  { key: 'Pon', name: 'Ponedjeljak' },
  { key: 'Ut', name: 'Utorak' },
  { key: 'Sr', name: 'Srijeda' },
  { key: 'Če', name: 'Četvrtak' },
  { key: 'Pe', name: 'Petak' },
];

export const SMJENE = ['A', 'B'];
export const MAX_PER_CELL = 3;
export const MAX_HOURS_WEEK = 2;
export const DOPUNSKA_MAX_HOURS = 1;

export const DEFAULT_PROFESORI = [
  { id: 'p1', name: 'Ana', color: '#ef4444' },
  { id: 'p2', name: 'Vanja', color: '#8b5cf6' },
  { id: 'p3', name: 'Andrea', color: '#ec4899' },
  { id: 'p4', name: 'Tomislav', color: '#3b82f6' },
];

export const DEFAULT_RAZREDI_CONFIG = [
  { grade: 1, count: 5 },
  { grade: 2, count: 5 },
  { grade: 3, count: 5 },
  { grade: 4, count: 6 },
  { grade: 5, count: 6 },
  { grade: 6, count: 5 },
  { grade: 7, count: 4 },
  { grade: 8, count: 2 },
];

// Pravila za satove po razredu i smjeni
// Format: { grade: broj razreda, allowedInShift: { 'A': ['j', 'p'], 'B': ['j', 'p'] } }
// 'j' = jutarnji, 'p' = popodnevni
export const GRADE_TIME_RULES = {
  5: {
    'A': ['j'], // 5. razred A smjena: samo jutarnji
    'B': ['p']  // 5. razred B smjena: samo popodnevni
  },
  6: {
    'A': ['p'], // 6. razred A smjena: samo popodnevni
    'B': ['j']  // 6. razred B smjena: samo jutarnji
  },
  7: {
    'A': ['p'], // 7. razred A smjena: samo popodnevni
    'B': ['j']  // 7. razred B smjena: samo jutarnji
  },
  8: {
    'A': ['j'], // 8. razred A smjena: samo jutarnji
    'B': ['p']  // 8. razred B smjena: samo popodnevni
  }
  // Ostali razredi mogu imati oba vremenske perioda po defaultu
};
