/**
 * Petits utilitaires DOM. Tout le texte passe par des nœuds texte :
 * aucun innerHTML, donc aucune injection possible depuis un fichier importé.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function applyAttrs(el, attrs) {
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value == null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2), value);
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key === 'style') {
      // Propriétés via le CSSOM : compatible avec la CSP (pas d'attribut style inline).
      for (const [prop, v] of Object.entries(value)) el.style.setProperty(prop, String(v));
    } else if (key === 'value' || key === 'checked') {
      continue; // appliqué après les enfants (cas du <select>)
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
}

function appendChildren(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  applyAttrs(el, attrs);
  appendChildren(el, children);
  if (attrs?.value != null) el.value = attrs.value;
  if (attrs?.checked != null) el.checked = attrs.checked;
  return el;
}

/** Remplace le contenu d'un élément ; les valeurs null/false sont ignorées. */
export function mount(el, ...children) {
  el.replaceChildren();
  appendChildren(el, children);
}

export function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  applyAttrs(el, attrs);
  appendChildren(el, children);
  return el;
}
