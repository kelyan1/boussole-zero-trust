import results from './engine.test.js';

const list = document.getElementById('results');
for (const r of results) {
  const li = document.createElement('li');
  li.className = r.ok ? 'ok' : 'ko';
  li.textContent = `${r.ok ? '✔' : '✘'} ${r.name}${r.ok ? '' : ` — ${r.error}`}`;
  list.append(li);
}
const failed = results.filter((r) => !r.ok).length;
const summary = document.getElementById('summary');
summary.textContent = `${results.length - failed}/${results.length} tests réussis`;
summary.className = failed ? 'ko' : 'ok';
document.body.dataset.status = failed ? 'failed' : 'passed';
