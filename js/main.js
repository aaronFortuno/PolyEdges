import { initScene, updateMesh, setWireframe, getCurrentGeometry, resetCamera } from './scene.js';
import { initManifold } from './manifoldBridge.js';
import { rebuildMesh } from './grooveBuilder.js';
import { analyzeEuler } from './polyhedra.js';
import { exportSTL } from './exporter.js';

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
    grooveSquare: $('grooveSquare').checked
  };
}

function updateSliderLabels() {
  $('sizeVal').textContent = $('size').value;
  $('grooveDiameterVal').textContent = parseFloat($('grooveDiameter').value).toFixed(1);
}

function updateEulerInfo() {
  const info = analyzeEuler($('solidType').value);
  const box = $('eulerInfo');

  let html = `<strong>${info.V} vèrtexs, ${info.E} arestes, ${info.F} cares</strong><br>`;
  html += `Grau de cada vèrtex: ${info.degree}<br>`;
  html += `Euler: V - E + F = ${info.eulerFormula}<br>`;
  html += `Vèrtexs de grau senar: ${info.oddCount}<br>`;

  if (info.eulerCircuit) {
    html += `<span class="euler-yes">Circuit eulerià possible!</span>`;
  } else if (info.eulerPath) {
    html += `<span class="euler-yes">Camí eulerià possible (no circuit)</span>`;
  } else {
    html += `<span class="euler-no">No existeix camí eulerià</span>`;
  }

  box.innerHTML = html;
}

async function rebuild() {
  showSpinner(true);
  const params = readParams();
  setStatus(params.grooveDiameter > 0 ? 'Calculant CSG...' : 'Generant sòlid...');

  await new Promise(r => setTimeout(r, 30));

  try {
    const { geometry, edges, baseGeometry } = rebuildMesh(params);
    const grooveRadius = params.grooveDiameter / 2;
    const segments = params.grooveSquare ? 4 : 16;
    updateMesh(geometry, edges, baseGeometry, grooveRadius, segments);
    setStatus(`${params.solidType} — ${params.size} mm`);
  } catch (err) {
    console.error('Error building solid:', err);
    setStatus(`Error: ${err.message}`);
  } finally {
    showSpinner(false);
  }
}

function scheduleRebuild() {
  if (rebuildTimeout) clearTimeout(rebuildTimeout);
  rebuildTimeout = setTimeout(rebuild, 200);
}

async function init() {
  setStatus('Inicialitzant motor 3D (WASM)...');

  try {
    const canvas = $('threeCanvas');
    initScene(canvas);

    await initManifold();
    setStatus('Motor 3D inicialitzat.');

    // All controls trigger auto-rebuild
    $('solidType').addEventListener('change', () => {
      updateEulerInfo();
      scheduleRebuild();
      // Reset camera when changing solid type
      setTimeout(resetCamera, 300);
    });

    $('grooveSquare').addEventListener('change', scheduleRebuild);

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

    updateSliderLabels();
    updateEulerInfo();
    await rebuild();

  } catch (err) {
    console.error('Initialization error:', err);
    setStatus(`Error d'inicialització: ${err.message}`);
  }
}

init();
