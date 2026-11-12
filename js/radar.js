import { svg } from './dom.js';

/**
 * Graphique radar en SVG pur (aucune bibliothèque).
 * axes   : [{ label }]
 * series : [{ name, values: [nombre|null], className }]
 */
export function radarChart({ axes, series, max = 4, size = 420, label = 'Graphique radar' }) {
  const center = size / 2;
  const radius = center - 92;
  const angle = (i) => -Math.PI / 2 + (2 * Math.PI * i) / axes.length;
  const point = (i, v) => [
    center + Math.cos(angle(i)) * radius * (v / max),
    center + Math.sin(angle(i)) * radius * (v / max),
  ];
  const toPoints = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const root = svg('svg', { viewBox: `0 0 ${size} ${size}`, class: 'radar', role: 'img', 'aria-label': label });

  for (let level = 1; level <= max; level++) {
    root.append(svg('polygon', { class: 'radar-ring', points: toPoints(axes.map((_, i) => point(i, level))) }));
    const [x, y] = point(0, level);
    root.append(svg('text', { class: 'radar-tick', x: x + 5, y: y + 4 }, String(level)));
  }

  axes.forEach((_, i) => {
    const [x, y] = point(i, max);
    root.append(svg('line', { class: 'radar-spoke', x1: center, y1: center, x2: x, y2: y }));
  });

  for (const s of series) {
    const pts = s.values.map((v, i) => point(i, v ?? 0));
    root.append(svg('polygon', { class: `radar-area ${s.className}`, points: toPoints(pts) }));
    pts.forEach(([x, y]) => root.append(svg('circle', { class: `radar-dot ${s.className}`, cx: x, cy: y, r: 3.5 })));
  }

  axes.forEach((axis, i) => {
    const [x, y] = point(i, max + 0.42);
    const cos = Math.cos(angle(i));
    const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
    const words = axis.label.split(' ');
    const lines = axis.label.length > 12 && words.length > 1 ? [words[0], words.slice(1).join(' ')] : [axis.label];
    const text = svg('text', { class: 'radar-label', x, y: y - ((lines.length - 1) * 8) + 4, 'text-anchor': anchor });
    lines.forEach((line, n) => text.append(svg('tspan', { x, dy: n === 0 ? 0 : 16 }, line)));
    root.append(text);
  });

  return root;
}
