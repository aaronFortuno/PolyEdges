// Manifold-3D WASM bridge
// Handles initialization, geometry conversion, and CSG operations

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { POLYHEDRA } from './polyhedra.js';

let wasm = null;
let ManifoldClass = null;
let MeshClass = null;

export async function initManifold() {
  const Module = await import('https://cdn.jsdelivr.net/npm/manifold-3d@3.0.0/manifold.js');
  wasm = await Module.default();
  wasm.setup();
  ManifoldClass = wasm.Manifold;
  MeshClass = wasm.Mesh;

  if (!ManifoldClass) {
    throw new Error('Failed to initialize Manifold WASM module');
  }

  console.log('Manifold WASM initialized successfully');
  return wasm;
}

// --- Three.js geometry helpers ---

function createBaseThreeGeometry(solidType, size) {
  let geom;
  const poly = POLYHEDRA[solidType];

  if (!poly) throw new Error(`Unknown solid type: ${solidType}`);

  // Scale so that size = edge length in mm (not circumradius)
  const scale = size / poly.edgeLength;
  const points = poly.vertices.map(v =>
    new THREE.Vector3(v[0] * scale, v[1] * scale, v[2] * scale)
  );
  geom = new ConvexGeometry(points);

  geom.deleteAttribute('normal');
  if (geom.hasAttribute('uv')) geom.deleteAttribute('uv');

  const merged = mergeVertices(geom, 0.001);
  geom.dispose();
  return merged;
}

function getVertices(geometry) {
  const posAttr = geometry.getAttribute('position');
  const verts = [];
  for (let i = 0; i < posAttr.count; i++) {
    verts.push([posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)]);
  }
  return verts;
}

// --- Manifold <-> Three.js conversions ---

function threeGeomToManifold(geometry) {
  const posAttr = geometry.getAttribute('position');
  const index = geometry.getIndex();
  if (!index) throw new Error('Geometry must be indexed');

  const mesh = new MeshClass({
    numProp: 3,
    vertProperties: new Float32Array(posAttr.array),
    triVerts: new Uint32Array(index.array)
  });

  return new ManifoldClass(mesh);
}

function manifoldToThreeGeom(manifold) {
  const mesh = manifold.getMesh();
  const geometry = new THREE.BufferGeometry();

  const numVert = mesh.numVert;
  const numProp = mesh.numProp;

  const positions = new Float32Array(numVert * 3);
  for (let i = 0; i < numVert; i++) {
    positions[i * 3] = mesh.vertProperties[i * numProp];
    positions[i * 3 + 1] = mesh.vertProperties[i * numProp + 1];
    positions[i * 3 + 2] = mesh.vertProperties[i * numProp + 2];
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.triVerts), 1));
  geometry.computeVertexNormals();
  return geometry;
}

// --- Edge detection ---

export function detectEdges(vertices) {
  let minDist = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const d = vecDist(vertices[i], vertices[j]);
      if (d < minDist) minDist = d;
    }
  }

  const tolerance = minDist * 0.01;
  const edges = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      if (Math.abs(vecDist(vertices[i], vertices[j]) - minDist) < tolerance) {
        edges.push([i, j]);
      }
    }
  }
  return edges;
}

// --- CSG: build cutting shape (all cylinders + spheres unioned) ---

function buildCuttingShape(vertices, edges, radius, segments) {
  const RAD2DEG = 180 / Math.PI;
  const isSquare = segments <= 4;
  const parts = [];

  for (const [i, j] of edges) {
    const a = vertices[i];
    const b = vertices[j];

    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const nx = dx / len, ny = dy / len, nz = dz / len;

    // Create shape along Z axis, centered
    // Square: box (prism), Round: cylinder
    const side = radius * 2;
    let shape = isSquare
      ? ManifoldClass.cube([side, side, len], true)
      : ManifoldClass.cylinder(len, radius, radius, segments, true);

    // Euler angles to rotate Z-axis to edge direction (Manifold order: X then Y then Z)
    const horiz = Math.sqrt(nx * nx + nz * nz);
    let rx, ry;
    if (horiz < 0.0001) {
      rx = ny > 0 ? -90 : 90;
      ry = 0;
    } else {
      rx = -Math.asin(ny) * RAD2DEG;
      ry = Math.atan2(nx, nz) * RAD2DEG;
    }

    const rotated = shape.rotate([rx, ry, 0]);
    shape.delete();

    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const mz = (a[2] + b[2]) / 2;
    const translated = rotated.translate([mx, my, mz]);
    rotated.delete();

    parts.push(translated);
  }

  // Caps at each vertex: sphere (round) or cube (square)
  const usedVerts = new Set();
  for (const [i, j] of edges) {
    usedVerts.add(i);
    usedVerts.add(j);
  }

  const capSize = radius * 2;
  for (const vi of usedVerts) {
    let cap = isSquare
      ? ManifoldClass.cube([capSize, capSize, capSize], true)
      : ManifoldClass.sphere(radius, segments);
    const translated = cap.translate(vertices[vi]);
    parts.push(translated);
    cap.delete();
  }

  // Union all parts
  let result = parts[0];
  for (let k = 1; k < parts.length; k++) {
    const merged = result.add(parts[k]);
    result.delete();
    parts[k].delete();
    result = merged;
  }

  return result;
}

// --- Pin hole for thumbtack ---

function buildSinglePin(v) {
  const RAD2DEG = 180 / Math.PI;
  const PIN_RADIUS = 0.75;  // 1.5mm diameter
  const PIN_LENGTH = 10;    // 10mm deep

  // Direction from vertex toward center (0,0,0)
  const dx = -v[0], dy = -v[1], dz = -v[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const nx = dx / len, ny = dy / len, nz = dz / len;

  let pin = ManifoldClass.cylinder(PIN_LENGTH, PIN_RADIUS, PIN_RADIUS, 16, true);

  const horiz = Math.sqrt(nx * nx + nz * nz);
  let rx, ry;
  if (horiz < 0.0001) {
    rx = ny > 0 ? -90 : 90;
    ry = 0;
  } else {
    rx = -Math.asin(ny) * RAD2DEG;
    ry = Math.atan2(nx, nz) * RAD2DEG;
  }

  const rotated = pin.rotate([rx, ry, 0]);
  pin.delete();

  const mx = v[0] + nx * (PIN_LENGTH / 2);
  const my = v[1] + ny * (PIN_LENGTH / 2);
  const mz = v[2] + nz * (PIN_LENGTH / 2);

  const translated = rotated.translate([mx, my, mz]);
  rotated.delete();

  return translated;
}

function subtractPinHoles(solid, vertices) {
  let result = solid;
  for (const v of vertices) {
    const pin = buildSinglePin(v);
    const next = result.subtract(pin);
    result.delete();
    pin.delete();
    result = next;
  }
  return result;
}

// --- Face hollowing: cut polygonal holes through each face ---

function buildFrameByIntersection(solid, vertices, edges, frameRadius, segments) {
  // Build thickened skeleton: union of cylinders (edges) + spheres (vertices)
  // Same logic as buildCuttingShape but used for intersection, not subtraction
  const skeleton = buildCuttingShape(vertices, edges, frameRadius, segments);

  // Frame = intersection of original solid with thickened skeleton
  // This clips the round cylinders to the polyhedron's flat faces
  try {
    const frame = solid.intersect(skeleton);
    solid.delete();
    skeleton.delete();
    return frame;
  } catch (e) {
    console.warn('Failed to intersect solid with skeleton:', e);
    skeleton.delete();
    return solid;
  }
}

// --- Public API ---

/**
 * Build the grooved solid.
 * Returns { geometry, edges, baseGeometry }
 */
export function buildGroovedSolid(solidType, _edges, size, grooveRadius, grooveSegments, pinHole = false, faceHollow = 0) {
  const baseGeom = createBaseThreeGeometry(solidType, size);
  const vertices = getVertices(baseGeom);
  const edges = detectEdges(vertices);

  console.log(`${solidType}: ${vertices.length} verts, ${edges.length} edges, radius=${grooveRadius}, hollow=${faceHollow}`);

  // No CSG needed: return base solid
  if (grooveRadius <= 0 && !pinHole && faceHollow <= 0) {
    baseGeom.computeVertexNormals();
    return { geometry: baseGeom, edges, baseGeometry: baseGeom };
  }

  // CSG operations
  let result = threeGeomToManifold(baseGeom);

  // Subtract groove cutting shape
  if (grooveRadius > 0) {
    const cutter = buildCuttingShape(vertices, edges, grooveRadius, grooveSegments);
    const afterGrooves = result.subtract(cutter);
    result.delete();
    cutter.delete();
    result = afterGrooves;
  }

  // Frame mode: intersect solid with thickened skeleton (uniform edge thickness)
  if (faceHollow > 0) {
    result = buildFrameByIntersection(result, vertices, edges, faceHollow, grooveSegments);
  }

  // Subtract pin holes at all vertices
  if (pinHole) {
    result = subtractPinHoles(result, vertices);
  }

  const resultGeom = manifoldToThreeGeom(result);
  result.delete();

  // Keep base geometry for wireframe overlay (with normals)
  baseGeom.computeVertexNormals();

  return { geometry: resultGeom, edges, baseGeometry: baseGeom };
}

// --- Vector math ---

function vecDist(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}
