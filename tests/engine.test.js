import { PILLARS } from '../js/data/ztmm.js';
import {
  createEmptyState,
  stageFor,
  pillarStats,
  globalStats,
  phaseFor,
  buildRoadmap,
  sanitizeState,
  SCHEMA,
  MAX_TJM,
} from '../js/engine.js';

const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
  }
}

function eq(actual, expected, msg = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg} attendu ${b}, obtenu ${a}`);
}

function near(actual, expected, msg = '') {
  if (Math.abs(actual - expected) > 1e-9) throw new Error(`${msg} attendu ${expected}, obtenu ${actual}`);
}

function throws(fn, msg = '') {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(`${msg} une erreur était attendue`);
}

// Petit référentiel fictif pour des calculs vérifiables à la main.
const MINI = [
  {
    id: 'a',
    name: 'A',
    functions: [
      { id: 'a1', name: 'A1', effort: 1, nist: [], nis2: ['a'], levels: ['1', '2', '3', '4'] },
      { id: 'a2', name: 'A2', effort: 3, nist: [], nis2: ['b'], levels: ['1', '2', '3', '4'] },
    ],
  },
  {
    id: 'b',
    name: 'B',
    functions: [{ id: 'b1', name: 'B1', effort: 2, nist: [], nis2: ['a'], levels: ['1', '2', '3', '4'] }],
  },
];

function mini(answers, weights = {}) {
  const s = createEmptyState(MINI);
  Object.assign(s.weights, weights);
  for (const [id, [current, target]] of Object.entries(answers)) s.answers[id] = { current, target, note: '' };
  return s;
}

test('le référentiel est complet (6 piliers, 4 niveaux par fonction, identifiants uniques)', () => {
  eq(PILLARS.length, 6);
  const ids = PILLARS.flatMap((p) => p.functions.map((f) => f.id));
  eq(new Set(ids).size, ids.length, 'identifiants uniques :');
  for (const p of PILLARS)
    for (const f of p.functions) {
      eq(f.levels.length, 4, `${f.id} :`);
      if (![1, 2, 3].includes(f.effort)) throw new Error(`${f.id} : effort invalide`);
    }
});

test('stageFor arrondit au niveau pleinement atteint', () => {
  eq(stageFor(null), null);
  eq(stageFor(1).name, 'Traditionnel');
  eq(stageFor(2.99).name, 'Initial');
  eq(stageFor(3).name, 'Avancé');
  eq(stageFor(4).name, 'Optimal');
});

test('état vide : aucun score, couverture nulle', () => {
  const g = globalStats(MINI, createEmptyState(MINI));
  eq(g.current, null);
  eq(g.coverage, 0);
  eq(buildRoadmap(MINI, createEmptyState(MINI)).totalActions, 0);
});

test('score de pilier = moyenne des fonctions renseignées', () => {
  const st = pillarStats(MINI, mini({ a1: [1, 3], a2: [2, 2] }));
  near(st[0].current, 1.5);
  near(st[0].target, 2.5);
  eq(st[1].current, null);
});

test('une cible absente vaut le niveau actuel (pas d\'écart)', () => {
  const st = pillarStats(MINI, mini({ b1: [2, null] }));
  near(st[1].gap, 0);
});

test('une cible inférieure à l\'actuel est ramenée à l\'actuel', () => {
  const st = pillarStats(MINI, mini({ b1: [3, 1] }));
  near(st[1].target, 3);
});

test('le score global est pondéré par l\'importance métier des piliers', () => {
  const g = globalStats(MINI, mini({ a1: [1, 1], a2: [1, 1], b1: [4, 4] }, { a: 1, b: 3 }));
  near(g.current, (1 * 1 + 4 * 3) / 4);
  near(g.coverage, 1);
});

test('phaseFor : Initial → P1, Avancé → P2, Optimal → P3 (importance normale)', () => {
  eq(phaseFor(1, 2), 1);
  eq(phaseFor(1, 3), 2);
  eq(phaseFor(1, 4), 3);
  eq(phaseFor(2, 3), 2);
});

test('phaseFor : importance élevée = une phase plus tôt, mais jamais Optimal en P1', () => {
  eq(phaseFor(1, 2, 3), 1);
  eq(phaseFor(1, 3, 3), 1);
  eq(phaseFor(1, 4, 3), 2);
  eq(phaseFor(3, 4, 3), 3, 'la 3e marche reste en phase 3 :');
});

test('feuille de route : une action par marche à franchir', () => {
  const r = buildRoadmap(MINI, mini({ a1: [1, 4], b1: [2, 3] }));
  eq(r.totalActions, 4);
  eq(r.phases[0].actions.map((a) => a.id), ['a1-2']);
  eq(r.phases[1].actions.map((a) => a.id), ['a1-3', 'b1-3'], 'tri par écart décroissant :');
  eq(r.phases[2].actions.map((a) => a.id), ['a1-4']);
});

test('charge et coût : base × effort × taille, puis × TJM', () => {
  const s = mini({ a2: [1, 2] });
  s.context.taille = 'ge';
  s.context.tjm = 1000;
  const r = buildRoadmap(MINI, s);
  eq(r.totalDays, 15 * 3 * 2);
  eq(r.totalCost, 15 * 3 * 2 * 1000);
});

test('tri : à phase égale, le pilier le plus important passe en premier', () => {
  const r = buildRoadmap(MINI, mini({ a1: [1, 2], b1: [1, 2] }, { a: 1, b: 3 }));
  eq(r.phases[0].actions[0].functionId, 'b1');
});

test('import : un fichier étranger est refusé', () => {
  throws(() => sanitizeState({ foo: 1 }, MINI));
  throws(() => sanitizeState(null, MINI));
});

test('import : champs inconnus ignorés, valeurs hors bornes neutralisées', () => {
  const s = sanitizeState(
    {
      schema: SCHEMA,
      context: { organisation: 'x'.repeat(500), taille: 'enorme', tjm: -5, evil: '<script>' },
      weights: { a: 99 },
      answers: { a1: { current: 7, target: 2, note: 42 }, inconnu: { current: 2 } },
      __proto__: { pollue: true },
    },
    MINI,
  );
  eq(s.context.organisation.length, 200);
  eq(s.context.taille, 'eti');
  eq(s.context.tjm, 800);
  eq('evil' in s.context, false);
  eq(s.weights.a, 2);
  eq(s.answers.a1, { current: null, target: 2, note: '', initiative: 'none' });
  eq('inconnu' in s.answers, false);
});

test('import : statut d\'initiative inconnu ramené à « aucune »', () => {
  const s = sanitizeState({ schema: SCHEMA, answers: { a1: { current: 1, initiative: 'hack' }, a2: { current: 1, initiative: 'adapt' } } }, MINI);
  eq(s.answers.a1.initiative, 'none');
  eq(s.answers.a2.initiative, 'adapt');
});

test('guide : chaque fonction a un enjeu, 3 questions et des prérequis valides sans cycle', () => {
  const ids = new Set(PILLARS.flatMap((p) => p.functions.map((f) => f.id)));
  const requires = {};
  for (const p of PILLARS)
    for (const f of p.functions) {
      if (!f.why) throw new Error(`${f.id} : enjeu manquant`);
      eq(f.questions.length, 3, `${f.id} questions :`);
      for (const r of f.requires) if (!ids.has(r) || r === f.id) throw new Error(`${f.id} : prérequis invalide ${r}`);
      requires[f.id] = f.requires;
    }
  const visiting = new Set();
  const done = new Set();
  const visit = (id) => {
    if (done.has(id)) return;
    if (visiting.has(id)) throw new Error(`cycle de prérequis via ${id}`);
    visiting.add(id);
    requires[id].forEach(visit);
    visiting.delete(id);
    done.add(id);
  };
  Object.keys(requires).forEach(visit);
});

// Référentiel fictif avec un prérequis : b1 dépend de a1.
const DEP = [
  { id: 'a', name: 'A', functions: [{ id: 'a1', name: 'A1', effort: 1, nist: [], nis2: [], requires: [], levels: ['1', '2', '3', '4'] }] },
  { id: 'b', name: 'B', functions: [{ id: 'b1', name: 'B1', effort: 1, nist: [], nis2: [], requires: ['a1'], levels: ['1', '2', '3', '4'] }] },
];

function dep(answers, weights = {}) {
  const s = createEmptyState(DEP);
  Object.assign(s.weights, weights);
  for (const [id, v] of Object.entries(answers)) Object.assign(s.answers[id], v);
  return s;
}

const find = (r, id) => r.phases.flatMap((p) => p.actions).find((a) => a.id === id);

test('prérequis : une fonction prioritaire attend son prérequis', () => {
  // b1 est prioritaire (Avancé en phase 1) mais a1 n'atteint Avancé qu'en phase 2.
  const r = buildRoadmap(DEP, dep({ a1: { current: 2, target: 3 }, b1: { current: 2, target: 3 } }, { b: 3 }));
  eq(find(r, 'a1-3').phase, 2);
  eq(find(r, 'b1-3').phase, 2, 'b1 repoussé :');
  eq(find(r, 'b1-3').after, [{ functionId: 'a1', functionName: 'A1', to: 3, phase: 2 }]);
});

test('prérequis : le report se propage aux marches suivantes de la fonction', () => {
  const r = buildRoadmap(DEP, dep({ a1: { current: 1, target: 4 }, b1: { current: 1, target: 3 } }, { b: 3 }));
  eq(find(r, 'b1-2').phase, 1);
  eq(find(r, 'b1-3').phase, 2);
  eq(find(r, 'a1-4').phase, 3);
});

test('prérequis : alerte si la cible du prérequis est trop basse ou non évaluée', () => {
  const low = buildRoadmap(DEP, dep({ a1: { current: 1, target: 2 }, b1: { current: 1, target: 3 } }));
  eq(find(low, 'b1-2').warnings.length, 0);
  eq(find(low, 'b1-3').warnings.length, 1);
  const missing = buildRoadmap(DEP, dep({ b1: { current: 1, target: 2 } }));
  eq(missing.warnings, 1);
});

test('existant : couvre seulement la prochaine marche (100 % ou 50 %)', () => {
  const s = dep({ a1: { current: 1, target: 3, initiative: 'running' }, b1: { current: 3, target: 4, initiative: 'adapt' } });
  s.context.tjm = 1000;
  const r = buildRoadmap(DEP, s);
  const a2 = find(r, 'a1-2');
  const a3 = find(r, 'a1-3');
  const b4 = find(r, 'b1-4');
  eq([a2.initiative, a2.coveredCost, a2.newCost], ['running', 15000, 0]);
  eq([a3.initiative, a3.coveredCost, a3.newCost], ['none', 0, 30000]);
  eq([b4.coveredCost, b4.newCost], [30000, 30000]);
  eq(r.newCost, 60000);
  eq(r.coveredCost, 45000);
  eq(r.totalCost, 105000);
  eq(r.existing, 2);
});

test('affichage : dans une phase, un prérequis est listé avant l\'action qui en dépend', () => {
  // b1 est prioritaire et passerait devant a1 au tri, alors qu'il en dépend.
  const r = buildRoadmap(DEP, dep({ a1: { current: 1, target: 2 }, b1: { current: 1, target: 2 } }, { b: 3 }));
  eq(r.phases[0].actions.map((a) => a.id), ['a1-2', 'b1-2']);
});

test('import : date invalide ignorée, date valide conservée', () => {
  const date = (value) => sanitizeState({ schema: SCHEMA, context: { date: value } }, MINI).context.date;
  eq(date('2026-11-12'), '2026-11-12');
  eq(date('demain'), '');
  eq(date('2026-99-99'), '');
  eq(date(20261112), '');
});

test('import : TJM accepté jusqu\'au plafond, valeur par défaut au-delà', () => {
  const tjm = (value) => sanitizeState({ schema: SCHEMA, context: { tjm: value } }, MINI).context.tjm;
  eq(tjm(MAX_TJM), MAX_TJM);
  eq(tjm(MAX_TJM + 1), 800);
});

export default results;
