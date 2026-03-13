import { POLYHEDRA } from './polyhedra.js';
import { buildGroovedSolid } from './manifoldBridge.js';

/**
 * @param {Object} params - { solidType, size, grooveDiameter, grooveShape }
 * @returns {{ geometry, edges, baseGeometry }}
 */
export function rebuildMesh(params) {
  const poly = POLYHEDRA[params.solidType];
  if (!poly) throw new Error(`Unknown solid type: ${params.solidType}`);

  const grooveRadius = params.grooveDiameter / 2;
  const segments = params.grooveSquare ? 4 : 16;

  return buildGroovedSolid(
    params.solidType,
    poly.edges,
    params.size,
    grooveRadius,
    segments
  );
}
