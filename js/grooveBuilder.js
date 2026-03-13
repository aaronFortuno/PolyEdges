import { POLYHEDRA } from './polyhedra.js';
import { buildGroovedSolid } from './manifoldBridge.js';

/**
 * Build a grooved solid from UI parameters
 * @param {Object} params - { solidType, size, grooveDiameter, grooveSegments }
 * @returns {THREE.BufferGeometry}
 */
export function rebuildMesh(params) {
  const poly = POLYHEDRA[params.solidType];
  if (!poly) throw new Error(`Unknown solid type: ${params.solidType}`);

  const grooveRadius = params.grooveDiameter / 2;

  // Pass solidType (for Three.js geometry creation) and edges (for groove placement)
  return buildGroovedSolid(
    params.solidType,
    poly.edges,
    params.size,
    grooveRadius,
    params.grooveSegments
  );
}
