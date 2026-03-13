// Manifold-3D WASM bridge
// Handles initialization, geometry conversion, and CSG operations

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

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

/**
 * Create a Three.js base geometry for a Platonic solid (merged vertices, no normals/UVs)
 */
function createBaseThreeGeometry(solidType, size) {
  let geom;
  // All Three.js geometries take radius as first param (distance from center to vertex)
  // except BoxGeometry which takes width/height/depth
  switch (solidType) {
    case 'tetrahedron':
      geom = new THREE.TetrahedronGeometry(size, 0);
      break;
    case 'cube': {
      // BoxGeometry takes side lengths. For circumradius = size, side = size * 2 / sqrt(3)
      const side = size * 2 / Math.sqrt(3);
      geom = new THREE.BoxGeometry(side, side, side);
      break;
    }
    case 'octahedron':
      geom = new THREE.OctahedronGeometry(size, 0);
      break;
    case 'dodecahedron':
      geom = new THREE.DodecahedronGeometry(size, 0);
      break;
    case 'icosahedron':
      geom = new THREE.IcosahedronGeometry(size, 0);
      break;
    default:
      throw new Error(`Unknown solid type: ${solidType}`);
  }

  // Remove normals and UVs, then merge vertices at same position
  // This is critical for Manifold which needs shared vertices
  geom.deleteAttribute('normal');
  if (geom.hasAttribute('uv')) geom.deleteAttribute('uv');

  const merged = mergeVertices(geom, 0.001);
  geom.dispose();

  return merged;
}

/**
 * Convert Three.js BufferGeometry to a Manifold object
 */
function threeGeomToManifold(geometry) {
  const posAttr = geometry.getAttribute('position');
  const index = geometry.getIndex();

  if (!index) {
    throw new Error('Geometry must be indexed');
  }

  const vertProperties = new Float32Array(posAttr.array);
  const triVerts = new Uint32Array(index.array);

  const mesh = new MeshClass({
    numProp: 3,
    vertProperties: vertProperties,
    triVerts: triVerts
  });

  return new ManifoldClass(mesh);
}

/**
 * Convert Manifold mesh to Three.js BufferGeometry
 */
function manifoldToThreeGeom(manifold) {
  const mesh = manifold.getMesh();
  const geometry = new THREE.BufferGeometry();

  const numVert = mesh.numVert;
  const numProp = mesh.numProp;
  const vertProperties = mesh.vertProperties;
  const triVerts = mesh.triVerts;

  // Extract positions (first 3 properties per vertex)
  const positions = new Float32Array(numVert * 3);
  for (let i = 0; i < numVert; i++) {
    positions[i * 3] = vertProperties[i * numProp];
    positions[i * 3 + 1] = vertProperties[i * numProp + 1];
    positions[i * 3 + 2] = vertProperties[i * numProp + 2];
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(triVerts), 1));
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Detect polyhedron edges from vertex positions using minimum distance threshold
 */
function detectEdges(vertices) {
  // Find minimum distance between any two vertices = edge length
  let minDist = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const d = vecDist(vertices[i], vertices[j]);
      if (d < minDist) minDist = d;
    }
  }

  // Find all pairs at that distance (with tolerance)
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

/**
 * STEP 1: Build just the base solid (no grooves yet)
 * Returns a clean Three.js BufferGeometry for preview and STL export
 */
export function buildGroovedSolid(solidType, _edges, size, grooveRadius, grooveSegments) {
  // For now, just return the clean base solid
  const baseGeom = createBaseThreeGeometry(solidType, size);
  baseGeom.computeVertexNormals();

  const posAttr = baseGeom.getAttribute('position');
  const index = baseGeom.getIndex();
  console.log(`${solidType}: ${posAttr.count} vertices, ${index.count / 3} triangles`);

  return baseGeom;
}

// --- Vector math utilities ---

function vecDist(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function normalize3(v) {
  const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Compute rotation matrix that maps Z-axis (0,0,1) to direction d
 * Returns 3x3 matrix as [row0, row1, row2]
 */
function rotationZToDir(d) {
  const z = [0, 0, 1];
  const cosA = dot(z, d);

  if (cosA > 0.9999) {
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  }
  if (cosA < -0.9999) {
    return [[-1, 0, 0], [0, 1, 0], [0, 0, -1]];
  }

  const axis = normalize3(cross(z, d));
  const sinA = Math.sqrt(1 - cosA * cosA);
  const [kx, ky, kz] = axis;

  return [
    [
      cosA + kx * kx * (1 - cosA),
      kx * ky * (1 - cosA) - kz * sinA,
      kx * kz * (1 - cosA) + ky * sinA
    ],
    [
      ky * kx * (1 - cosA) + kz * sinA,
      cosA + ky * ky * (1 - cosA),
      ky * kz * (1 - cosA) - kx * sinA
    ],
    [
      kz * kx * (1 - cosA) - ky * sinA,
      kz * ky * (1 - cosA) + kx * sinA,
      cosA + kz * kz * (1 - cosA)
    ]
  ];
}
