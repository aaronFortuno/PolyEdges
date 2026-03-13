import { initScene, updateMesh, setWireframe, getCurrentGeometry, resetCamera, setBackgroundColor } from './scene.js';
import { initManifold } from './manifoldBridge.js';
import { rebuildMesh } from './grooveBuilder.js';
import { analyzeEuler, getTotalEdgeLength, getBoundingDiameter } from './polyhedra.js';
import { exportSTL } from './exporter.js';
import { t, setLang, getLang, applyTranslations, LANGUAGES } from './i18n.js';

const $ = (id) => document.getElementById(id);

const statusEl = $('status');
const spinnerEl = $('spinner');
const exportBtn = $('exportBtn');

let rebuildTimeout = null;

function setStatus(msg) {
  statusEl.textContent = msg;
}

function showSpinner(show) {
  spinnerEl.classList.toggle('hidden', !show);
  exportBtn.disabled = show;
}

function readParams() {
  return {
    solidType: $('solidType').value,
    size: parseFloat($('size').value),
    grooveDiameter: parseFloat($('grooveDiameter').value),
    pinHole: $('pinHole').checked
  };
}

function updateSliderLabels() {
  $('sizeVal').textContent = $('size').value;
  $('grooveDiameterVal').textContent = parseFloat($('grooveDiameter').value).toFixed(1);
  updateSizeInfo();
}

function updateSizeInfo() {
  const solidType = $('solidType').value;
  const size = parseFloat($('size').value);
  const totalLen = getTotalEdgeLength(solidType, size);
  const diameter = getBoundingDiameter(solidType, size);
  $('cordLength').textContent = t('cord.length', { length: Math.round(totalLen) });
  $('boundingSize').textContent = t('bounding.diameter', { diameter: Math.round(diameter) });
}

function updateEulerInfo() {
  const info = analyzeEuler($('solidType').value);
  const box = $('eulerInfo');

  let html = `<strong>${t('euler.vertices', { V: info.V, E: info.E, F: info.F })}</strong><br>`;

  if (info.isUniformDegree) {
    html += `${t('euler.degree', { degree: info.degree })}<br>`;
  } else {
    html += `${t('euler.degrees', { degrees: info.degrees.join(', ') })}<br>`;
  }

  html += `${t('euler.formula', { value: info.eulerFormula })}<br>`;
  html += `${t('euler.oddCount', { count: info.oddCount })}<br>`;

  if (info.eulerCircuit) {
    html += `<span class="euler-yes">${t('euler.circuit')}</span>`;
  } else if (info.eulerPath) {
    html += `<span class="euler-yes">${t('euler.path')}</span>`;
  } else {
    html += `<span class="euler-no">${t('euler.none')}</span>`;
  }

  box.innerHTML = html;
}

async function rebuild() {
  showSpinner(true);
  const params = readParams();
  setStatus(params.grooveDiameter > 0 ? t('status.csg') : t('status.generating'));

  await new Promise(r => setTimeout(r, 30));

  try {
    const { geometry, edges, baseGeometry } = rebuildMesh(params);
    const grooveRadius = params.grooveDiameter / 2;
    updateMesh(geometry, edges, baseGeometry, grooveRadius, 16);
    setStatus(t('status.result', { solidType: params.solidType, size: params.size }));
  } catch (err) {
    console.error('Error building solid:', err);
    setStatus(t('status.buildError', { message: err.message }));
  } finally {
    showSpinner(false);
  }
}

function scheduleRebuild() {
  if (rebuildTimeout) clearTimeout(rebuildTimeout);
  rebuildTimeout = setTimeout(rebuild, 200);
}

// --- Modals ---

function openModal(id) {
  $(id).classList.remove('hidden');
}

function closeModal(id) {
  $(id).classList.add('hidden');
}

function initModals() {
  // Close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    const modalId = btn.getAttribute('data-modal');
    btn.addEventListener('click', () => closeModal(modalId));
  });

  // Click outside to close
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });

  $('changelogLink').addEventListener('click', () => openModal('changelogModal'));
  $('helpBtn').addEventListener('click', () => {
    $('helpBody').innerHTML = t('help.body');
    openModal('helpModal');
  });
}

// --- Theme toggle ---

function initTheme() {
  const saved = localStorage.getItem('polyedges-theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  $('themeBtn').textContent = theme === 'dark' ? '\u263E' : '\u2600';
  setBackgroundColor(theme === 'light' ? 0xf0f0f5 : 0x1a1a2e);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('polyedges-theme', next);
  applyTheme(next);
}

// --- Language selector ---

function initLangSelector() {
  const btn = $('langBtn');
  const menu = $('langMenu');
  btn.textContent = getLang().toUpperCase();

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });

  menu.querySelectorAll('[data-lang]').forEach(el => {
    el.addEventListener('click', () => {
      setLang(el.dataset.lang);
      btn.textContent = el.dataset.lang.toUpperCase();
      menu.classList.add('hidden');
    });
  });

  document.addEventListener('click', () => {
    menu.classList.add('hidden');
  });
}

// --- Init ---

async function init() {
  setStatus(t('status.initEngine'));

  try {
    const canvas = $('threeCanvas');
    initScene(canvas);
    initTheme();

    await initManifold();
    setStatus(t('status.engineReady'));

    // Controls
    $('solidType').addEventListener('change', () => {
      updateEulerInfo();
      updateSizeInfo();
      scheduleRebuild();
      setTimeout(resetCamera, 300);
    });

    $('pinHole').addEventListener('change', scheduleRebuild);

    ['size', 'grooveDiameter'].forEach(id => {
      $(id).addEventListener('input', () => {
        updateSliderLabels();
        scheduleRebuild();
      });
    });

    exportBtn.addEventListener('click', () => {
      const params = readParams();
      const geom = getCurrentGeometry();
      exportSTL(geom, `${params.solidType}-ranures.stl`);
    });

    $('wireframe').addEventListener('change', (e) => {
      setWireframe(e.target.checked);
    });

    // Theme toggle
    $('themeBtn').addEventListener('click', toggleTheme);

    // Language & modals
    initLangSelector();
    initModals();

    // Re-render dynamic content on language change
    window.addEventListener('langchange', () => {
      updateEulerInfo();
      updateSizeInfo();
    });

    // Apply initial state
    applyTranslations();
    updateSliderLabels();
    updateEulerInfo();
    await rebuild();

  } catch (err) {
    console.error('Initialization error:', err);
    setStatus(t('status.initError', { message: err.message }));
  }
}

init();
