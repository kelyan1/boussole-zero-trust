/**
 * Moteur de calcul : scores de maturité, écarts et feuille de route.
 * Fonctions pures, sans accès au DOM, pour pouvoir être testées isolément.
 */

export const SCHEMA = 'boussole-zt/1';

export const SIZE_FACTORS = {
  pme: { label: 'PME (< 250 salariés)', factor: 0.5 },
  eti: { label: 'ETI (250 à 5 000 salariés)', factor: 1 },
  ge: { label: 'Grande entreprise (> 5 000 salariés)', factor: 2 },
};

export const WEIGHTS = {
  1: 'Faible',
  2: 'Normale',
  3: 'Élevée',
};

/** Charge de base (jours/homme) pour atteindre un niveau, multipliée par l'effort de la fonction. */
export const BASE_DAYS = { 2: 15, 3: 30, 4: 60 };

/** TJM maximal accepté, à la saisie comme à l'import. */
export const MAX_TJM = 10000;

export const PHASES = [
  { id: 1, name: 'Fondations', horizon: '0 à 6 mois' },
  { id: 2, name: 'Consolidation', horizon: '6 à 18 mois' },
  { id: 3, name: 'Optimisation', horizon: '18 à 36 mois' },
];

/**
 * Initiative déjà engagée sur une fonction : elle couvre la prochaine marche,
 * en totalité (projet en cours ou planifié et budgété) ou à moitié (existant à adapter).
 */
export const INITIATIVES = {
  none: { label: 'Aucune initiative', short: 'Nouveau chantier', covered: 0 },
  adapt: { label: 'Existant à adapter', short: 'Existant à adapter', covered: 0.5 },
  planned: { label: 'Projet planifié et budgété', short: 'Déjà planifié', covered: 1 },
  running: { label: 'Projet en cours', short: 'Déjà en cours', covered: 1 },
};

const STAGE_NAMES = ['Traditionnel', 'Initial', 'Avancé', 'Optimal'];

export function createEmptyState(pillars) {
  const weights = {};
  const answers = {};
  for (const p of pillars) {
    weights[p.id] = 2;
    for (const f of p.functions) answers[f.id] = { current: null, target: null, note: '', initiative: 'none' };
  }
  return {
    schema: SCHEMA,
    context: { organisation: '', secteur: '', perimetre: '', evaluateur: '', date: '', taille: 'eti', tjm: 800 },
    weights,
    answers,
  };
}

/** Cible effective : si aucune cible n'est saisie, on considère qu'elle égale le niveau actuel. */
function effectiveTarget(answer) {
  if (!answer || answer.current == null) return null;
  return answer.target == null ? answer.current : Math.max(answer.target, answer.current);
}

function mean(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function stageFor(score) {
  if (score == null) return null;
  const idx = Math.min(4, Math.max(1, Math.floor(score + 1e-9)));
  return { value: idx, name: STAGE_NAMES[idx - 1] };
}

export function pillarStats(pillars, state) {
  return pillars.map((p) => {
    const answered = p.functions.filter((f) => state.answers[f.id]?.current != null);
    const current = mean(answered.map((f) => state.answers[f.id].current));
    const target = mean(answered.map((f) => effectiveTarget(state.answers[f.id])));
    return {
      id: p.id,
      name: p.name,
      weight: state.weights[p.id] ?? 2,
      answered: answered.length,
      total: p.functions.length,
      current,
      target,
      gap: current == null ? null : target - current,
    };
  });
}

export function globalStats(pillars, state) {
  const stats = pillarStats(pillars, state);
  const scored = stats.filter((s) => s.current != null);
  const totalWeight = scored.reduce((a, s) => a + s.weight, 0);
  const weighted = (key) =>
    totalWeight ? scored.reduce((a, s) => a + s[key] * s.weight, 0) / totalWeight : null;
  const answered = stats.reduce((a, s) => a + s.answered, 0);
  const total = stats.reduce((a, s) => a + s.total, 0);
  const current = weighted('current');
  const target = weighted('target');
  return {
    current,
    target,
    gap: current == null ? null : target - current,
    stage: stageFor(current),
    targetStage: stageFor(target),
    answered,
    total,
    coverage: total ? answered / total : 0,
    pillars: stats,
  };
}

/**
 * Phase d'une étape :
 *  - la n-ième marche d'une fonction ne peut pas arriver avant la phase n ;
 *  - Initial est visé en phase 1, Avancé en phase 2, Optimal en phase 3 ;
 *  - un pilier d'importance élevée avance d'une phase (sans jamais viser Optimal en phase 1).
 */
export function phaseFor(stepIndex, toLevel, weight = 2) {
  const byLevel = toLevel - 1 - (weight === 3 && toLevel > 2 ? 1 : 0);
  return Math.min(3, Math.max(stepIndex, byLevel, 1));
}

export function buildRoadmap(pillars, state) {
  const size = SIZE_FACTORS[state.context.taille] ?? SIZE_FACTORS.eti;
  const tjm = Number(state.context.tjm) > 0 ? Number(state.context.tjm) : 0;
  const actions = [];

  const names = {};
  for (const p of pillars) for (const f of p.functions) names[f.id] = f.name;

  pillars.forEach((p, pillarIndex) => {
    const weight = state.weights[p.id] ?? 2;
    for (const f of p.functions) {
      const a = state.answers[f.id];
      const target = effectiveTarget(a);
      if (target == null || target <= a.current) continue;
      for (let to = a.current + 1, step = 1; to <= target; to++, step++) {
        const days = Math.round(BASE_DAYS[to] * f.effort * size.factor);
        // L'initiative existante ne couvre que la prochaine marche.
        const initiative = step === 1 ? (INITIATIVES[a.initiative] ? a.initiative : 'none') : 'none';
        const cost = days * tjm;
        const coveredCost = Math.round(cost * INITIATIVES[initiative].covered);
        actions.push({
          id: `${f.id}-${to}`,
          functionId: f.id,
          functionName: f.name,
          pillarId: p.id,
          pillarName: p.name,
          pillarIndex,
          from: to - 1,
          to,
          toName: STAGE_NAMES[to - 1],
          description: f.levels[to - 1],
          phase: phaseFor(step, to, weight),
          weight,
          gap: target - a.current,
          step,
          days,
          cost,
          initiative,
          coveredCost,
          newCost: cost - coveredCost,
          quickWin: to === 2 && f.effort <= 2,
          nist: f.nist,
          nis2: f.nis2,
          requires: f.requires ?? [],
          after: [],
          warnings: [],
        });
      }
    }
  });

  applyPrerequisites(actions, pillars, state, names);

  actions.sort(
    (x, y) =>
      x.phase - y.phase ||
      y.weight - x.weight ||
      Number(y.quickWin) - Number(x.quickWin) ||
      y.gap - x.gap ||
      x.pillarIndex - y.pillarIndex,
  );

  const phases = PHASES.map((ph) => {
    const list = orderByPrerequisites(actions.filter((a) => a.phase === ph.id));
    return {
      ...ph,
      actions: list,
      days: list.reduce((s, a) => s + a.days, 0),
      cost: list.reduce((s, a) => s + a.cost, 0),
      newCost: list.reduce((s, a) => s + a.newCost, 0),
    };
  });

  return {
    phases,
    totalActions: actions.length,
    totalDays: phases.reduce((s, p) => s + p.days, 0),
    totalCost: phases.reduce((s, p) => s + p.cost, 0),
    newCost: phases.reduce((s, p) => s + p.newCost, 0),
    coveredCost: actions.reduce((s, a) => s + a.coveredCost, 0),
    quickWins: actions.filter((a) => a.quickWin).length,
    existing: actions.filter((a) => a.initiative !== 'none').length,
    warnings: actions.reduce((s, a) => s + a.warnings.length, 0),
  };
}

/**
 * Prérequis : la marche vers le niveau N d'une fonction ne peut pas être planifiée
 * avant la marche de chaque prérequis vers un niveau ≤ N. Les marches d'une même
 * fonction restent dans l'ordre. On propage jusqu'à stabilité (graphe sans cycle).
 * Si la cible d'un prérequis est inférieure au niveau visé, on lève une alerte de cohérence.
 */
function applyPrerequisites(actions, pillars, state, names) {
  const byFunction = {};
  for (const a of actions) (byFunction[a.functionId] ??= []).push(a);

  for (const a of actions) {
    for (const req of a.requires) {
      const ra = state.answers[req];
      const reqTarget = effectiveTarget(ra);
      if (reqTarget == null) {
        a.warnings.push(`Prérequis non évalué : ${names[req]}.`);
      } else if (reqTarget < a.to) {
        a.warnings.push(`La cible de « ${names[req]} » (niveau ${reqTarget}) est inférieure au niveau visé ici (${a.to}).`);
      }
    }
  }

  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    for (const a of actions) {
      let min = a.phase;
      const previous = byFunction[a.functionId].find((x) => x.to === a.to - 1);
      if (previous) min = Math.max(min, previous.phase);
      for (const req of a.requires) {
        const steps = (byFunction[req] ?? []).filter((x) => x.to <= a.to);
        const last = steps[steps.length - 1];
        if (last) min = Math.max(min, last.phase);
      }
      if (min !== a.phase) {
        a.phase = min;
        changed = true;
      }
    }
    if (!changed) break;
  }

  for (const a of actions) {
    a.after = a.requires
      .map((req) => (byFunction[req] ?? []).filter((x) => x.to <= a.to).pop())
      .filter(Boolean)
      .map((x) => ({ functionId: x.functionId, functionName: x.functionName, to: x.to, phase: x.phase }));
  }
}

/**
 * Ordre d'affichage dans une phase : on garde le tri par priorité, mais une action
 * n'est jamais listée avant un prérequis (ou une marche précédente) de la même phase.
 */
function orderByPrerequisites(list) {
  const inPhase = new Set(list.map((a) => a.id));
  const placed = new Set();
  const pending = [...list];
  const ordered = [];
  const ready = (a) =>
    [`${a.functionId}-${a.to - 1}`, ...a.after.map((x) => `${x.functionId}-${x.to}`)].every(
      (id) => !inPhase.has(id) || placed.has(id),
    );
  while (pending.length) {
    const index = Math.max(0, pending.findIndex(ready));
    const [next] = pending.splice(index, 1);
    ordered.push(next);
    placed.add(next.id);
  }
  return ordered;
}

/** Couverture réglementaire : pour chaque mesure NIS2, nombre d'actions de la feuille de route qui y contribuent. */
export function nis2Coverage(roadmap) {
  const counts = {};
  for (const ph of roadmap.phases)
    for (const a of ph.actions) for (const m of a.nis2) counts[m] = (counts[m] ?? 0) + 1;
  return counts;
}

const MAX_TEXT = 2000;

function cleanText(value, max = 200) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

/** Date au format AAAA-MM-JJ, sinon chaîne vide. */
function cleanDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  return Number.isNaN(Date.parse(`${value}T00:00:00`)) ? '' : value;
}

function cleanLevel(value) {
  return Number.isInteger(value) && value >= 1 && value <= 4 ? value : null;
}

/**
 * Valide un fichier importé. On ne fait jamais confiance au contenu :
 * seuls les champs connus sont repris, avec types et bornes vérifiés.
 */
export function sanitizeState(raw, pillars) {
  if (!raw || typeof raw !== 'object' || raw.schema !== SCHEMA) {
    throw new Error("Fichier non reconnu : ce n'est pas une évaluation Boussole Zero Trust.");
  }
  const state = createEmptyState(pillars);
  const ctx = raw.context ?? {};
  for (const key of ['organisation', 'secteur', 'perimetre', 'evaluateur']) {
    state.context[key] = cleanText(ctx[key]);
  }
  state.context.date = cleanDate(ctx.date);
  state.context.taille = Object.hasOwn(SIZE_FACTORS, ctx.taille) ? ctx.taille : 'eti';
  const tjm = Number(ctx.tjm);
  state.context.tjm = Number.isFinite(tjm) && tjm >= 0 && tjm <= MAX_TJM ? Math.round(tjm) : 800;

  for (const p of pillars) {
    const w = raw.weights?.[p.id];
    state.weights[p.id] = [1, 2, 3].includes(w) ? w : 2;
    for (const f of p.functions) {
      const a = raw.answers?.[f.id];
      if (!a || typeof a !== 'object') continue;
      state.answers[f.id] = {
        current: cleanLevel(a.current),
        target: cleanLevel(a.target),
        note: cleanText(a.note, MAX_TEXT),
        initiative: Object.hasOwn(INITIATIVES, a.initiative) ? a.initiative : 'none',
      };
    }
  }
  return state;
}
