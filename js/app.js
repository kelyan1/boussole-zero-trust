import { PILLARS, LEVELS, NIS2_MEASURES, NIST_CSF } from './data/ztmm.js';
import {
  createEmptyState,
  globalStats,
  buildRoadmap,
  nis2Coverage,
  sanitizeState,
  SIZE_FACTORS,
  WEIGHTS,
  BASE_DAYS,
  INITIATIVES,
  MAX_TJM,
} from './engine.js';
import { h, mount } from './dom.js';
import { radarChart } from './radar.js';
import { DEMO_STATE } from './data/demo.js';

const STORAGE_KEY = 'boussole-zt:state';
const VIEWS = ['contexte', 'evaluation', 'resultats', 'feuille-de-route'];

let state = loadState();
let activePillar = PILLARS[0].id;

/* ---------- Persistance (navigateur uniquement) ---------- */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitizeState(JSON.parse(raw), PILLARS);
  } catch {
    /* stockage indisponible ou corrompu : on repart d'un état vide */
  }
  return createEmptyState(PILLARS);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* navigation privée : l'évaluation reste en mémoire */
  }
}

/* ---------- Formats ---------- */

const fmtScore = (v) => (v == null ? '–' : v.toFixed(1).replace('.', ','));
const fmtInt = new Intl.NumberFormat('fr-FR');
const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmtEurCompact = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const levelName = (v) => LEVELS[v - 1]?.name ?? '–';
const FUNCTION_NAMES = Object.fromEntries(PILLARS.flatMap((p) => p.functions.map((f) => [f.id, f.name])));
const functionName = (id) => FUNCTION_NAMES[id] ?? id;

/* ---------- Composants ---------- */

function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
}

/** Groupe de boutons à choix unique. Un second clic sur l'option active la désélectionne si allowClear. */
function segmented({ label, options, value, onChange, allowClear = false }) {
  let current = value;
  const buttons = options.map((o) =>
    h(
      'button',
      {
        type: 'button',
        class: 'seg',
        title: o.title ?? null,
        'aria-pressed': String(o.value === current),
        onclick: () => {
          current = allowClear && o.value === current ? null : o.value;
          buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].value === current)));
          onChange(current);
        },
      },
      o.label,
    ),
  );
  return h('div', { class: 'segmented', role: 'group', 'aria-label': label }, buttons);
}

function tags(f) {
  return h(
    'div',
    { class: 'tags' },
    f.nis2.map((m) => h('span', { class: 'tag tag-nis2', title: `NIS2 art. 21.2 (${m}) — ${NIS2_MEASURES[m]}` }, `NIS2 ${m}`)),
    f.nist.map((c) => h('span', { class: 'tag tag-nist', title: `NIST CSF 2.0 — ${NIST_CSF[c]}` }, c)),
  );
}

function tile(label, value, sub, modifier = '') {
  return h('div', { class: `tile ${modifier}` }, h('div', { class: 'tile-label' }, label), h('div', { class: 'tile-value' }, value), sub && h('div', { class: 'tile-sub' }, sub));
}

function emptyState(title, text, actionLabel, actionHref) {
  return h(
    'div',
    { class: 'card empty' },
    h('h2', {}, title),
    h('p', {}, text),
    h('div', { class: 'empty-actions' }, h('a', { class: 'btn btn-primary', href: actionHref }, actionLabel), h('button', { type: 'button', class: 'btn', onclick: loadDemo }, "Charger l'exemple")),
  );
}

/* ---------- Vue 1 : contexte ---------- */

function renderContext(el) {
  const field = (key, label, attrs = {}) =>
    h(
      'label',
      { class: 'field' },
      h('span', {}, label),
      h('input', {
        type: 'text',
        maxlength: 200,
        value: state.context[key],
        ...attrs,
        oninput: (e) => {
          state.context[key] = key === 'tjm' ? Math.min(MAX_TJM, Math.max(0, Math.round(Number(e.target.value) || 0))) : e.target.value;
          // Au-delà du plafond, le champ affiche la valeur réellement retenue.
          if (key === 'tjm' && Number(e.target.value) > MAX_TJM) e.target.value = MAX_TJM;
          saveState();
        },
      }),
    );

  mount(el, 
    h(
      'div',
      { class: 'card intro' },
      h('h2', {}, 'Comment ça marche'),
      h(
        'p',
        {},
        "Cet outil évalue la maturité Zero Trust d'une organisation sur les 5 piliers du modèle de la CISA (identités, terminaux, réseaux, applications, données) et ses 3 capacités transverses. Chaque fonction est positionnée sur 4 niveaux : Traditionnel, Initial, Avancé, Optimal.",
      ),
      h(
        'ol',
        { class: 'steps' },
        h('li', {}, h('strong', {}, 'Contexte'), ' : décrivez l\'organisation et pondérez les piliers selon les enjeux métier.'),
        h('li', {}, h('strong', {}, 'Évaluation'), ' : pour chaque fonction, choisissez le niveau actuel et le niveau cible, notez vos constats.'),
        h('li', {}, h('strong', {}, 'Résultats'), ' : radar, scores par pilier et carte des écarts.'),
        h('li', {}, h('strong', {}, 'Feuille de route'), ' : actions phasées sur 36 mois, charge et budget estimés, rattachées à NIS2 et au NIST CSF 2.0.'),
      ),
      h(
        'div',
        { class: 'guide-cta' },
        h('p', { class: 'muted small' }, "Avant les entretiens, imprimez le guide : enjeux et questions à poser pour chacune des 25 fonctions."),
        h('button', { type: 'button', class: 'btn', onclick: printGuide }, "Imprimer le guide d'entretien"),
      ),
    ),
    h(
      'div',
      { class: 'card' },
      h('h2', {}, 'Organisation évaluée'),
      h(
        'div',
        { class: 'form-grid' },
        field('organisation', 'Organisation', { placeholder: 'ex. Groupe Exemple' }),
        field('secteur', 'Secteur', { placeholder: 'ex. Services financiers' }),
        field('perimetre', 'Périmètre évalué', { placeholder: 'ex. SI groupe — France' }),
        field('evaluateur', 'Évaluateur', { placeholder: 'ex. Équipe Cyber Strategy' }),
        field('date', "Date de l'évaluation", { type: 'date' }),
        h(
          'label',
          { class: 'field' },
          h('span', {}, "Taille de l'organisation"),
          h(
            'select',
            {
              value: state.context.taille,
              onchange: (e) => {
                state.context.taille = e.target.value;
                saveState();
              },
            },
            Object.entries(SIZE_FACTORS).map(([k, v]) => h('option', { value: k }, v.label)),
          ),
        ),
        field('tjm', `Taux journalier moyen (€ HT, ${fmtInt.format(MAX_TJM)} maximum)`, { type: 'number', min: 0, max: MAX_TJM, step: 50 }),
      ),
    ),
    h(
      'div',
      { class: 'card' },
      h('h2', {}, 'Importance métier des piliers'),
      h('p', { class: 'muted' }, "La pondération influence le score global et l'ordre de priorité des actions dans la feuille de route."),
      h(
        'div',
        { class: 'weights' },
        PILLARS.map((p) =>
          h(
            'div',
            { class: 'weight-row' },
            h('div', {}, h('strong', {}, p.name), h('p', { class: 'muted small' }, p.description)),
            segmented({
              label: `Importance du pilier ${p.name}`,
              value: state.weights[p.id],
              options: Object.entries(WEIGHTS).map(([v, l]) => ({ value: Number(v), label: l })),
              onChange: (v) => {
                state.weights[p.id] = v;
                saveState();
              },
            }),
          ),
        ),
      ),
    ),
    h('div', { class: 'next' }, h('a', { class: 'btn btn-primary', href: '#evaluation' }, "Commencer l'évaluation →")),
  );
}

/* ---------- Vue 2 : évaluation ---------- */

function pillarProgress(p) {
  const done = p.functions.filter((f) => state.answers[f.id].current != null).length;
  return { done, total: p.functions.length };
}

function functionCard(f) {
  const a = state.answers[f.id];
  const levelEls = LEVELS.map((lv, i) =>
    h(
      'div',
      { class: 'level', dataset: { level: lv.value } },
      h('div', { class: 'level-head' }, h('span', { class: 'level-num' }, lv.value), h('span', { class: 'level-name' }, lv.name), h('span', { class: 'level-badge' })),
      h('p', {}, f.levels[i]),
    ),
  );
  const status = h('span', { class: 'status' });
  const hint = h('p', { class: 'hint' });

  function refresh() {
    const target = a.current == null ? null : Math.max(a.target ?? a.current, a.current);
    levelEls.forEach((el, i) => {
      const v = i + 1;
      el.classList.toggle('is-current', v === a.current);
      el.classList.toggle('is-target', target != null && v === target && target !== a.current);
      el.classList.toggle('is-reached', a.current != null && v < a.current);
      el.classList.toggle('in-gap', a.current != null && v > a.current && v < target);
      el.querySelector('.level-badge').textContent =
        v === a.current ? (target === a.current ? 'Actuel = cible' : 'Actuel') : v === target ? 'Cible' : '';
    });
    if (a.current == null) {
      status.textContent = 'Non évaluée';
      status.className = 'status status-todo';
    } else if (target > a.current) {
      const gap = target - a.current;
      status.textContent = `Écart : ${gap} niveau${gap > 1 ? 'x' : ''}`;
      status.className = 'status status-gap';
    } else {
      status.textContent = 'Cible atteinte';
      status.className = 'status status-ok';
    }
    hint.textContent =
      a.current != null && a.target != null && a.target < a.current
        ? 'La cible choisie est inférieure au niveau actuel : elle est ramenée au niveau actuel.'
        : a.current != null && a.target == null
          ? 'Aucune cible choisie : le niveau actuel est conservé.'
          : '';
    updateEvalProgress();
  }

  const levelOptions = LEVELS.map((lv) => ({ value: lv.value, label: lv.name, title: `Niveau ${lv.value}` }));
  const card = h(
    'article',
    { class: 'card fn-card', id: `fn-${f.id}` },
    h('header', { class: 'fn-head' }, h('div', {}, h('h3', {}, f.name), h('p', { class: 'muted' }, f.description)), status),
    h('p', { class: 'why' }, h('strong', {}, 'Enjeu Zero Trust : '), f.why),
    h(
      'details',
      { class: 'questions' },
      h('summary', {}, `Questions d'entretien (${f.questions.length})`),
      h('ol', {}, f.questions.map((q) => h('li', {}, q))),
      f.requires.length
        ? h('p', { class: 'muted small' }, `Prérequis : ${f.requires.map(functionName).join(', ')}.`)
        : null,
    ),
    h('div', { class: 'levels' }, levelEls),
    h(
      'div',
      { class: 'fn-controls' },
      h(
        'div',
        { class: 'control' },
        h('span', { class: 'control-label' }, 'Niveau actuel'),
        segmented({ label: `Niveau actuel — ${f.name}`, options: levelOptions, value: a.current, allowClear: true, onChange: (v) => { a.current = v; saveState(); refresh(); } }),
      ),
      h(
        'div',
        { class: 'control' },
        h('span', { class: 'control-label' }, 'Niveau cible'),
        segmented({ label: `Niveau cible — ${f.name}`, options: levelOptions, value: a.target, allowClear: true, onChange: (v) => { a.target = v; saveState(); refresh(); } }),
      ),
    ),
    hint,
    h(
      'label',
      { class: 'field field-inline' },
      h('span', {}, 'Initiative existante'),
      h(
        'select',
        {
          value: a.initiative,
          onchange: (e) => {
            a.initiative = e.target.value;
            saveState();
          },
        },
        Object.entries(INITIATIVES).map(([k, v]) => h('option', { value: k }, v.label)),
      ),
      h('span', { class: 'muted small' }, 'Un projet déjà lancé ou budgété couvre la prochaine marche dans le chiffrage.'),
    ),
    h(
      'label',
      { class: 'field' },
      h('span', {}, 'Constats et éléments de preuve'),
      h('textarea', {
        rows: 2,
        maxlength: 2000,
        placeholder: 'ex. MFA déployé pour 80 % des utilisateurs, hors prestataires.',
        value: a.note,
        oninput: (e) => {
          a.note = e.target.value;
          saveState();
        },
      }),
    ),
    tags(f),
  );
  refresh();
  return card;
}

function updateEvalProgress() {
  for (const p of PILLARS) {
    const { done, total } = pillarProgress(p);
    document.querySelectorAll(`[data-progress="${p.id}"]`).forEach((el) => {
      el.textContent = `${done}/${total}`;
      el.classList.toggle('complete', done === total);
    });
  }
}

function renderEvaluation(el) {
  const index = PILLARS.findIndex((p) => p.id === activePillar);
  const pillar = PILLARS[index];
  const go = (id) => {
    activePillar = id;
    renderEvaluation(el);
    el.scrollIntoView({ block: 'start' });
  };

  const sidebar = h(
    'nav',
    { class: 'pillar-nav', 'aria-label': 'Piliers' },
    PILLARS.map((p) =>
      h(
        'button',
        { type: 'button', class: 'pillar-link', 'aria-current': p.id === activePillar ? 'true' : null, onclick: () => go(p.id) },
        h('span', {}, p.name),
        h('span', { class: 'progress', dataset: { progress: p.id } }),
      ),
    ),
  );

  const prev = PILLARS[index - 1];
  const next = PILLARS[index + 1];
  mount(el, 
    h(
      'div',
      { class: 'eval-layout' },
      sidebar,
      h(
        'div',
        { class: 'eval-main' },
        h(
          'div',
          { class: 'pillar-head' },
          h('div', {}, h('p', { class: 'eyebrow' }, `Pilier ${index + 1} sur ${PILLARS.length}`), h('h2', {}, pillar.name), h('p', { class: 'muted' }, pillar.description)),
          h('div', { class: 'pillar-meta' }, h('span', { class: 'progress', dataset: { progress: pillar.id } }), h('span', { class: 'muted small' }, `Importance : ${WEIGHTS[state.weights[pillar.id]]}`)),
        ),
        pillar.functions.map(functionCard),
        h(
          'div',
          { class: 'pager' },
          prev ? h('button', { type: 'button', class: 'btn', onclick: () => go(prev.id) }, `← ${prev.name}`) : h('span'),
          next
            ? h('button', { type: 'button', class: 'btn btn-primary', onclick: () => go(next.id) }, `${next.name} →`)
            : h('a', { class: 'btn btn-primary', href: '#resultats' }, 'Voir les résultats →'),
        ),
      ),
    ),
  );
  updateEvalProgress();
}

/* ---------- Vue 3 : résultats ---------- */

function renderResults(el) {
  const g = globalStats(PILLARS, state);
  if (g.answered === 0) {
    mount(el, emptyState('Aucun résultat pour le moment', "Évaluez au moins une fonction pour obtenir vos scores de maturité.", "Aller à l'évaluation", '#evaluation'));
    return;
  }

  const radar = radarChart({
    axes: g.pillars.map((p) => ({ label: p.name })),
    series: [
      { name: 'Cible', values: g.pillars.map((p) => p.target), className: 'is-target' },
      { name: 'Actuel', values: g.pillars.map((p) => p.current), className: 'is-current' },
    ],
    label: `Radar de maturité : ${g.pillars.map((p) => `${p.name} ${fmtScore(p.current)} sur 4, cible ${fmtScore(p.target)}`).join(' ; ')}`,
  });

  const pillarRows = g.pillars.map((p) =>
    h(
      'tr',
      {},
      h('th', { scope: 'row' }, p.name, h('span', { class: 'muted small block' }, `${p.answered}/${p.total} évaluées`)),
      h('td', {}, WEIGHTS[p.weight]),
      h(
        'td',
        { class: 'bar-cell' },
        h(
          'div',
          { class: 'bar', style: { '--cur': (p.current ?? 0) / 4, '--tgt': (p.target ?? 0) / 4 }, 'aria-hidden': 'true' },
          h('span', { class: 'bar-fill' }),
          h('span', { class: 'bar-target' }),
        ),
      ),
      h('td', { class: 'num' }, fmtScore(p.current)),
      h('td', { class: 'num' }, fmtScore(p.target)),
      h('td', { class: 'num' }, p.gap ? `+${fmtScore(p.gap)}` : '–'),
    ),
  );

  const heatRows = PILLARS.flatMap((p) => [
    h('tr', { class: 'group' }, h('th', { colspan: 5, scope: 'rowgroup' }, p.name)),
    ...p.functions.map((f) => {
      const a = state.answers[f.id];
      const target = a.current == null ? null : Math.max(a.target ?? a.current, a.current);
      return h(
        'tr',
        {},
        h('th', { scope: 'row' }, f.name),
        LEVELS.map((lv) => {
          const v = lv.value;
          let cls = 'cell';
          let label = '';
          if (a.current != null && v <= a.current) {
            cls += ' cell-reached';
            label = v === a.current ? 'Actuel' : 'Atteint';
          } else if (target != null && v <= target) {
            cls += ' cell-gap';
            label = v === target ? 'Cible' : 'À franchir';
          }
          return h('td', { class: cls, title: label || null }, h('span', { class: 'sr-only' }, label || 'Non visé'));
        }),
      );
    }),
  ]);

  mount(el, 
    h(
      'div',
      { class: 'tiles' },
      tile('Maturité actuelle', `${fmtScore(g.current)} / 4`, `Niveau atteint : ${g.stage.name}`, 'tile-accent'),
      tile('Maturité cible', `${fmtScore(g.target)} / 4`, `Niveau visé : ${g.targetStage.name}`),
      tile('Écart moyen', g.gap ? `+${fmtScore(g.gap)}` : '0', 'Pondéré par l\'importance métier'),
      tile('Couverture', `${g.answered} / ${g.total}`, `${Math.round(g.coverage * 100)} % des fonctions évaluées`),
    ),
    g.coverage < 1
      ? h('p', { class: 'notice' }, `${g.total - g.answered} fonction(s) non évaluée(s) : les scores ne portent que sur les fonctions renseignées.`)
      : null,
    h(
      'div',
      { class: 'grid-2' },
      h(
        'div',
        { class: 'card' },
        h('h2', {}, 'Radar de maturité'),
        radar,
        h('div', { class: 'legend' }, h('span', { class: 'key key-current' }, 'Actuel'), h('span', { class: 'key key-target' }, 'Cible')),
      ),
      h(
        'div',
        { class: 'card' },
        h('h2', {}, 'Scores par pilier'),
        h(
          'table',
          { class: 'table' },
          h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Pilier'), h('th', { scope: 'col' }, 'Importance'), h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, 'Barre')), h('th', { scope: 'col', class: 'num' }, 'Actuel'), h('th', { scope: 'col', class: 'num' }, 'Cible'), h('th', { scope: 'col', class: 'num' }, 'Écart'))),
          h('tbody', {}, pillarRows),
        ),
        h('p', { class: 'muted small' }, 'Le niveau atteint est le niveau entier pleinement atteint (ex. 2,8 → Initial).'),
      ),
    ),
    h(
      'div',
      { class: 'card' },
      h('h2', {}, 'Carte des écarts'),
      h('div', { class: 'legend' }, h('span', { class: 'key key-reached' }, 'Niveau atteint'), h('span', { class: 'key key-gap' }, 'À franchir pour atteindre la cible')),
      h(
        'div',
        { class: 'table-scroll' },
        h(
          'table',
          { class: 'table heatmap' },
          h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Fonction'), LEVELS.map((lv) => h('th', { scope: 'col', class: 'center' }, lv.name)))),
          h('tbody', {}, heatRows),
        ),
      ),
    ),
  );
}

/* ---------- Vue 4 : feuille de route ---------- */

function renderRoadmap(el) {
  const g = globalStats(PILLARS, state);
  if (g.answered === 0) {
    mount(el, emptyState('Pas encore de feuille de route', 'La feuille de route est générée à partir des écarts entre niveaux actuels et niveaux cibles.', "Aller à l'évaluation", '#evaluation'));
    return;
  }
  const r = buildRoadmap(PILLARS, state);
  if (r.totalActions === 0) {
    mount(el, emptyState('Aucun écart à combler', 'Toutes les fonctions évaluées ont atteint leur cible. Définissez des niveaux cibles plus élevés pour générer des actions.', "Retour à l'évaluation", '#evaluation'));
    return;
  }
  const size = SIZE_FACTORS[state.context.taille] ?? SIZE_FACTORS.eti;
  const coverage = nis2Coverage(r);
  const maxCount = Math.max(1, ...Object.values(coverage));

  const action = (a) =>
    h(
      'li',
      { class: 'action' },
      h(
        'div',
        { class: 'action-head' },
        h('span', { class: `chip chip-${a.pillarId}` }, a.pillarName),
        h('strong', {}, a.functionName),
        a.quickWin ? h('span', { class: 'badge badge-quick' }, 'Gain rapide') : null,
        a.weight === 3 ? h('span', { class: 'badge badge-prio' }, 'Priorité métier') : null,
        a.initiative !== 'none' ? h('span', { class: 'badge badge-existing' }, INITIATIVES[a.initiative].short) : null,
      ),
      h('p', { class: 'action-level' }, `Niveau ${a.from} ${levelName(a.from)} → ${a.to} ${a.toName}`),
      h('p', {}, a.description),
      a.after.length
        ? h('p', { class: 'action-after' }, `Après : ${a.after.map((x) => `${x.functionName} (niveau ${x.to}, phase ${x.phase})`).join(' ; ')}`)
        : null,
      a.warnings.map((w) => h('p', { class: 'action-warning' }, `⚠ ${w}`)),
      h(
        'div',
        { class: 'action-meta' },
        h('span', {}, `${fmtInt.format(a.days)} j/h`),
        state.context.tjm > 0
          ? h(
              'span',
              {},
              fmtEur.format(a.cost),
              a.coveredCost > 0 ? h('span', { class: 'muted' }, ` dont ${fmtEur.format(a.coveredCost)} déjà couverts`) : null,
            )
          : null,
        tags({ nis2: a.nis2, nist: a.nist }),
      ),
    );

  mount(el, 
    h(
      'div',
      { class: 'tiles' },
      tile('Actions', fmtInt.format(r.totalActions), 'sur 3 phases', 'tile-accent'),
      tile('Gains rapides', fmtInt.format(r.quickWins), 'actions de premier niveau à faible effort'),
      tile('Charge estimée', `${fmtInt.format(r.totalDays)} j/h`, `Facteur taille : ×${String(size.factor).replace('.', ',')}`),
      tile('Budget estimé', state.context.tjm > 0 ? fmtEurCompact.format(r.totalCost) : '–', state.context.tjm > 0 ? `TJM ${fmtEur.format(state.context.tjm)}, hors licences` : 'Renseignez un TJM dans le contexte'),
      state.context.tjm > 0
        ? tile('Budget à engager', fmtEurCompact.format(r.newCost), `${fmtEurCompact.format(r.coveredCost)} déjà couverts par ${r.existing} initiative${r.existing > 1 ? 's' : ''} existante${r.existing > 1 ? 's' : ''}`)
        : null,
    ),
    r.warnings
      ? h('p', { class: 'notice' }, `${r.warnings} alerte(s) de cohérence : certains prérequis ont une cible plus basse que les fonctions qui en dépendent, ou ne sont pas évalués. Voir les actions marquées ⚠.`)
      : null,
    h(
      'div',
      { class: 'timeline' },
      r.phases.map((ph) =>
        h(
          'section',
          { class: 'card phase' },
          h(
            'header',
            { class: 'phase-head' },
            h('div', {}, h('p', { class: 'eyebrow' }, `Phase ${ph.id} · ${ph.horizon}`), h('h2', {}, ph.name)),
            h(
              'div',
              { class: 'phase-stats' },
              h('span', {}, `${ph.actions.length} action${ph.actions.length > 1 ? 's' : ''}`),
              h('span', {}, `${fmtInt.format(ph.days)} j/h`),
              state.context.tjm > 0 ? h('span', {}, fmtEur.format(ph.cost)) : null,
            ),
          ),
          ph.actions.length ? h('ol', { class: 'actions' }, ph.actions.map(action)) : h('p', { class: 'muted' }, 'Aucune action dans cette phase.'),
        ),
      ),
    ),
    h(
      'div',
      { class: 'grid-2' },
      h(
        'div',
        { class: 'card' },
        h('h2', {}, 'Contribution aux exigences NIS2'),
        h('p', { class: 'muted small' }, "Nombre d'actions de la feuille de route contribuant à chaque mesure de l'article 21.2 (correspondance indicative)."),
        h(
          'table',
          { class: 'table' },
          h(
            'tbody',
            {},
            Object.entries(NIS2_MEASURES).map(([k, label]) =>
              h(
                'tr',
                {},
                h('th', { scope: 'row', class: 'nowrap' }, `21.2 ${k})`),
                h('td', {}, label),
                h('td', { class: 'bar-cell' }, h('div', { class: 'bar bar-simple', style: { '--cur': (coverage[k] ?? 0) / maxCount }, 'aria-hidden': 'true' }, h('span', { class: 'bar-fill' }))),
                h('td', { class: 'num' }, coverage[k] ?? 0),
              ),
            ),
          ),
        ),
      ),
      h(
        'div',
        { class: 'card' },
        h('h2', {}, 'Méthode de calcul'),
        h(
          'ul',
          { class: 'method' },
          h('li', {}, "Une action est créée pour chaque niveau à franchir entre l'actuel et la cible."),
          h('li', {}, "Phasage : Initial en phase 1, Avancé en phase 2, Optimal en phase 3. Un pilier d'importance élevée avance d'une phase, sans jamais viser Optimal en phase 1, et les marches d'une même fonction restent dans l'ordre."),
          h('li', {}, "Prérequis : une action ne peut pas être planifiée avant celles dont elle dépend (ex. la micro-segmentation après la cartographie des flux). Le report se propage aux marches suivantes."),
          h('li', {}, 'Dans une phase, les actions sont triées par importance métier du pilier, puis gains rapides, puis taille de l\'écart.'),
          h('li', {}, `Charge = base (${BASE_DAYS[2]} / ${BASE_DAYS[3]} / ${BASE_DAYS[4]} j/h pour Initial / Avancé / Optimal) × effort de la fonction (1 à 3) × facteur de taille.`),
          h('li', {}, 'Budget = charge × TJM. Hors licences, matériel et run : ordre de grandeur à affiner en atelier.'),
          h('li', {}, "Existant : un projet en cours ou planifié et budgété couvre 100 % de la prochaine marche, un existant à adapter 50 %. Le budget à engager exclut cette part."),
        ),
      ),
    ),
  );
}

/* ---------- En-tête du rapport imprimé ---------- */

function renderPrintHeader() {
  const c = state.context;
  const el = document.getElementById('print-header');
  const date = c.date ? new Date(`${c.date}T00:00:00`).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : '';
  mount(el, 
    h('p', { class: 'eyebrow' }, 'Diagnostic de maturité Zero Trust'),
    h('h1', {}, c.organisation || 'Organisation non renseignée'),
    h('p', {}, [c.secteur, c.perimetre, c.evaluateur, date].filter(Boolean).join(' · ')),
  );
}

/* ---------- Guide d'entretien imprimable ---------- */

function renderGuide() {
  const c = state.context;
  mount(
    document.getElementById('guide'),
    h('p', { class: 'eyebrow' }, "Guide d'entretien Zero Trust"),
    h('h1', {}, c.organisation || 'Diagnostic de maturité Zero Trust'),
    h('p', { class: 'muted' }, "Pour chaque fonction : l'enjeu, les questions à poser, puis le niveau constaté. Cochez le niveau et notez les preuves."),
    PILLARS.map((p) =>
      h(
        'section',
        { class: 'guide-pillar' },
        h('h2', {}, p.name),
        p.functions.map((f) =>
          h(
            'article',
            { class: 'guide-fn' },
            h('h3', {}, f.name),
            h('p', { class: 'why' }, f.why),
            h('ol', {}, f.questions.map((q) => h('li', {}, q))),
            h('p', { class: 'guide-levels' }, LEVELS.map((lv) => h('span', {}, `☐ ${lv.value} ${lv.name}`))),
            h('div', { class: 'guide-notes' }, 'Constats et preuves :'),
          ),
        ),
      ),
    ),
  );
}

function printGuide() {
  renderGuide();
  document.body.classList.add('print-guide');
  window.addEventListener('afterprint', () => document.body.classList.remove('print-guide'), { once: true });
  window.print();
}

/* ---------- Routage et rendu ---------- */

function currentView() {
  const id = location.hash.slice(1);
  return VIEWS.includes(id) ? id : 'contexte';
}

function renderAll() {
  const view = currentView();
  document.querySelectorAll('.tabs a').forEach((a) => {
    if (a.dataset.view === view) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.querySelectorAll('.view').forEach((s) => s.classList.toggle('active', s.dataset.view === view));
  renderContext(document.getElementById('view-contexte'));
  renderEvaluation(document.getElementById('view-evaluation'));
  renderResults(document.getElementById('view-resultats'));
  renderRoadmap(document.getElementById('view-feuille-de-route'));
  renderPrintHeader();
}

function replaceState(next, message) {
  state = next;
  activePillar = PILLARS[0].id;
  saveState();
  renderAll();
  if (message) toast(message);
}

function hasData() {
  return Object.values(state.answers).some((a) => a.current != null || a.note) || state.context.organisation;
}

function loadDemo() {
  if (hasData() && !confirm("Remplacer l'évaluation en cours par l'exemple ?")) return;
  replaceState(sanitizeState(structuredClone(DEMO_STATE), PILLARS), 'Exemple chargé : organisation fictive.');
  location.hash = '#resultats';
}

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const slug = (state.context.organisation || 'evaluation')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const url = URL.createObjectURL(blob);
  const link = h('a', { href: url, download: `zero-trust-${slug || 'evaluation'}-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Évaluation exportée.');
}

function importFile(file) {
  if (!file) return;
  if (file.size > 1_000_000) {
    toast('Fichier trop volumineux (1 Mo maximum).');
    return;
  }
  file
    .text()
    .then((text) => {
      const next = sanitizeState(JSON.parse(text), PILLARS);
      if (hasData() && !confirm("Remplacer l'évaluation en cours par le fichier importé ?")) return;
      replaceState(next, 'Évaluation importée.');
    })
    .catch((e) => toast(e instanceof SyntaxError ? 'Fichier JSON invalide.' : e.message));
}

function init() {
  document.getElementById('btn-demo').addEventListener('click', loadDemo);
  document.getElementById('btn-export').addEventListener('click', exportState);
  const input = document.getElementById('file-input');
  document.getElementById('btn-import').addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    importFile(input.files[0]);
    input.value = '';
  });
  document.getElementById('btn-print').addEventListener('click', () => {
    renderAll();
    window.print();
  });
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (!confirm("Effacer toute l'évaluation ? Pensez à l'exporter avant si vous souhaitez la conserver.")) return;
    replaceState(createEmptyState(PILLARS), 'Évaluation réinitialisée.');
    location.hash = '#contexte';
  });
  window.addEventListener('hashchange', () => {
    renderAll();
    window.scrollTo({ top: 0 });
  });
  window.addEventListener('beforeprint', renderAll);
  renderAll();
}

init();
