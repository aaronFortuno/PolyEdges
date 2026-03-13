// Platonic and Archimedean solid definitions
// All vertices normalized to unit circumradius (distance from center to vertex = 1)

const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio ≈ 1.618
const SQRT2 = Math.sqrt(2);

// --- Vertex generation helpers ---

function vecDist(a, b) {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function buildEdges(vertices, targetLen, tolerance = 0.01) {
  const edges = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      if (Math.abs(vecDist(vertices[i], vertices[j]) - targetLen) < tolerance) {
        edges.push([i, j]);
      }
    }
  }
  return edges;
}

function normalizeToUnit(vertices) {
  const maxR = Math.max(...vertices.map(v => Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)));
  return vertices.map(v => [v[0] / maxR, v[1] / maxR, v[2] / maxR]);
}

function getEdgeLength(verts) {
  let minDist = Infinity;
  for (let i = 0; i < verts.length; i++) {
    for (let j = i + 1; j < verts.length; j++) {
      const d = vecDist(verts[i], verts[j]);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

// Generate all permutations of [a,b,c] with all sign combinations, deduplicated
function allPermsSigns(a, b, c) {
  const perms = [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]];
  const result = [];
  for (const p of perms) {
    for (let sx = -1; sx <= 1; sx += 2) {
      for (let sy = -1; sy <= 1; sy += 2) {
        for (let sz = -1; sz <= 1; sz += 2) {
          result.push([sx * p[0], sy * p[1], sz * p[2]]);
        }
      }
    }
  }
  return uniqueVerts(result);
}

// Even (cyclic) permutations of [a,b,c] with all sign combinations
function evenPermsSigns(a, b, c) {
  const perms = [[a, b, c], [b, c, a], [c, a, b]];
  const result = [];
  for (const p of perms) {
    for (let sx = -1; sx <= 1; sx += 2) {
      for (let sy = -1; sy <= 1; sy += 2) {
        for (let sz = -1; sz <= 1; sz += 2) {
          result.push([sx * p[0], sy * p[1], sz * p[2]]);
        }
      }
    }
  }
  return uniqueVerts(result);
}

function uniqueVerts(verts) {
  const seen = new Set();
  return verts.filter(v => {
    const key = v.map(x => x.toFixed(8)).join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Chiral permutations: even perms with even minus signs + odd perms with odd minus signs
function chiralPermsSigns(a, b, c) {
  const evenPerms = [[a, b, c], [b, c, a], [c, a, b]];
  const oddPerms = [[a, c, b], [c, b, a], [b, a, c]];
  const result = [];
  for (const p of evenPerms) {
    result.push([p[0], p[1], p[2]]);
    result.push([-p[0], -p[1], p[2]]);
    result.push([-p[0], p[1], -p[2]]);
    result.push([p[0], -p[1], -p[2]]);
  }
  for (const p of oddPerms) {
    result.push([-p[0], p[1], p[2]]);
    result.push([p[0], -p[1], p[2]]);
    result.push([p[0], p[1], -p[2]]);
    result.push([-p[0], -p[1], -p[2]]);
  }
  return uniqueVerts(result);
}

// Even permutations with even number of minus signs (12 vertices per triple)
function chiralEvenPermsSigns(a, b, c) {
  const evenPerms = [[a, b, c], [b, c, a], [c, a, b]];
  const result = [];
  for (const p of evenPerms) {
    result.push([p[0], p[1], p[2]]);
    result.push([-p[0], -p[1], p[2]]);
    result.push([-p[0], p[1], -p[2]]);
    result.push([p[0], -p[1], -p[2]]);
  }
  return result;
}

// Odd permutations with odd number of minus signs (12 vertices per triple)
function chiralOddPermsSigns(a, b, c) {
  const oddPerms = [[a, c, b], [c, b, a], [b, a, c]];
  const result = [];
  for (const p of oddPerms) {
    result.push([-p[0], p[1], p[2]]);
    result.push([p[0], -p[1], p[2]]);
    result.push([p[0], p[1], -p[2]]);
    result.push([-p[0], -p[1], -p[2]]);
  }
  return result;
}

function makeSolid(verts, numFaces, group) {
  const nv = normalizeToUnit(verts);
  const el = getEdgeLength(nv);
  return {
    group,
    vertices: nv,
    edges: buildEdges(nv, el),
    numFaces
  };
}

// --- PLATONIC SOLIDS ---

const tetraVerts = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
const cubeVerts = [
  [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
  [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1]
];
const octaVerts = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const dodecaVerts = [
  ...cubeVerts,
  [0, -1 / PHI, -PHI], [0, -1 / PHI, PHI], [0, 1 / PHI, -PHI], [0, 1 / PHI, PHI],
  [-1 / PHI, -PHI, 0], [-1 / PHI, PHI, 0], [1 / PHI, -PHI, 0], [1 / PHI, PHI, 0],
  [-PHI, 0, -1 / PHI], [-PHI, 0, 1 / PHI], [PHI, 0, -1 / PHI], [PHI, 0, 1 / PHI]
];
const icosaVerts = [
  [0, -1, -PHI], [0, -1, PHI], [0, 1, -PHI], [0, 1, PHI],
  [-1, -PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [1, PHI, 0],
  [-PHI, 0, -1], [-PHI, 0, 1], [PHI, 0, -1], [PHI, 0, 1]
];

// --- ARCHIMEDEAN SOLIDS ---

// Truncated tetrahedron (12V, 18E, 8F)
const truncTetraVerts = uniqueVerts([
  [1, 1, 3], [1, 3, 1], [3, 1, 1],
  [-1, -1, 3], [-1, -3, 1], [-3, -1, 1],
  [-1, 1, -3], [-1, 3, -1], [-3, 1, -1],
  [1, -1, -3], [1, -3, -1], [3, -1, -1]
]);

// Cuboctahedron (12V, 24E, 14F)
const cuboctaVerts = allPermsSigns(1, 1, 0);

// Truncated cube (24V, 36E, 14F)
const xi = SQRT2 - 1;
const truncCubeVerts = allPermsSigns(xi, 1, 1);

// Truncated octahedron (24V, 36E, 14F)
const truncOctaVerts = allPermsSigns(0, 1, 2);

// Rhombicuboctahedron (24V, 48E, 26F)
const rhombicuboctaVerts = allPermsSigns(1, 1, 1 + SQRT2);

// Truncated cuboctahedron (48V, 72E, 26F)
const truncCuboctaVerts = allPermsSigns(1, 1 + SQRT2, 1 + 2 * SQRT2);

// Snub cube (24V, 60E, 38F) — chiral, uses tribonacci constant
const t_snub = 1.8392867552141612;
const snubCubeVerts = chiralPermsSigns(1, 1 / t_snub, t_snub);

// Icosidodecahedron (30V, 60E, 32F)
const icosidodecaVerts = uniqueVerts([
  ...allPermsSigns(PHI, 0, 0),
  ...evenPermsSigns(0.5, PHI / 2, (1 + PHI) / 2)
]);

// Truncated dodecahedron (60V, 90E, 32F)
const truncDodecaVerts = uniqueVerts([
  ...evenPermsSigns(0, 1 / PHI, 2 + PHI),
  ...evenPermsSigns(1 / PHI, PHI, 2 * PHI),
  ...evenPermsSigns(PHI, 2, PHI + 1)
]);

// Truncated icosahedron (60V, 90E, 32F) — soccer ball
const truncIcosaVerts = uniqueVerts([
  ...evenPermsSigns(0, 1, 3 * PHI),
  ...evenPermsSigns(2, 1 + 2 * PHI, PHI),
  ...evenPermsSigns(1, 2 + PHI, 2 * PHI)
]);

// Rhombicosidodecahedron (60V, 120E, 62F)
const rhombicosidodecaVerts = uniqueVerts([
  ...evenPermsSigns(1, 1, PHI * PHI * PHI),
  ...evenPermsSigns(PHI * PHI, PHI, 2 * PHI),
  ...evenPermsSigns(2 + PHI, 0, PHI * PHI)
]);

// Truncated icosidodecahedron (120V, 180E, 62F)
const truncIcosidodecaVerts = uniqueVerts([
  ...evenPermsSigns(1 / PHI, 1 / PHI, 3 + PHI),
  ...evenPermsSigns(2 / PHI, PHI, 1 + 2 * PHI),
  ...evenPermsSigns(1 / PHI, PHI * PHI, 3 * PHI - 1),
  ...evenPermsSigns(2 * PHI - 1, 2, 2 + PHI),
  ...evenPermsSigns(PHI, 3, 2 * PHI)
]);

// Snub dodecahedron (60V, 150E, 92F) — chiral
// 5 base vectors, each generates 12 vertices via even permutations + even sign changes
const snubDodecaVerts = uniqueVerts([
  ...chiralEvenPermsSigns(-0.661842049459688, 0.749643316229125, 4.194107670504176),
  ...chiralEvenPermsSigns(-0.385787422704718, 3.492372881971653, 2.499007576926054),
  ...chiralEvenPermsSigns(1.286059211828145, 1.135430738933843, 3.955677930840437),
  ...chiralEvenPermsSigns(1.456670353914383, 2.830530832511964, 2.908048458676031),
  ...chiralEvenPermsSigns(-1.695100093578122, 2.206313670143508, 3.293835881380749),
]);

// --- Build POLYHEDRA dictionary ---

export const POLYHEDRA = {
  // Platonic solids
  tetrahedron: makeSolid(tetraVerts, 4, 'platonic'),
  cube: makeSolid(cubeVerts, 6, 'platonic'),
  octahedron: makeSolid(octaVerts, 8, 'platonic'),
  dodecahedron: makeSolid(dodecaVerts, 12, 'platonic'),
  icosahedron: makeSolid(icosaVerts, 20, 'platonic'),

  // Archimedean solids
  truncatedTetrahedron: makeSolid(truncTetraVerts, 8, 'archimedean'),
  cuboctahedron: makeSolid(cuboctaVerts, 14, 'archimedean'),
  truncatedCube: makeSolid(truncCubeVerts, 14, 'archimedean'),
  truncatedOctahedron: makeSolid(truncOctaVerts, 14, 'archimedean'),
  rhombicuboctahedron: makeSolid(rhombicuboctaVerts, 26, 'archimedean'),
  truncatedCuboctahedron: makeSolid(truncCuboctaVerts, 26, 'archimedean'),
  snubCube: makeSolid(snubCubeVerts, 38, 'archimedean'),
  icosidodecahedron: makeSolid(icosidodecaVerts, 32, 'archimedean'),
  truncatedDodecahedron: makeSolid(truncDodecaVerts, 32, 'archimedean'),
  truncatedIcosahedron: makeSolid(truncIcosaVerts, 32, 'archimedean'),
  rhombicosidodecahedron: makeSolid(rhombicosidodecaVerts, 62, 'archimedean'),
  truncatedIcosidodecahedron: makeSolid(truncIcosidodecaVerts, 62, 'archimedean'),
  snubDodecahedron: makeSolid(snubDodecaVerts, 92, 'archimedean'),
};

// --- Cord length calculation ---

export function getTotalEdgeLength(polyKey, size) {
  const poly = POLYHEDRA[polyKey];
  if (!poly) return 0;
  let total = 0;
  for (const [i, j] of poly.edges) {
    const a = poly.vertices[i], b = poly.vertices[j];
    total += vecDist(a, b);
  }
  // Vertices are normalized to unit circumradius, scale by size
  return total * size;
}

// --- Graph path analysis (Euler & Hamilton) ---

export function analyzeEuler(polyKey) {
  const poly = POLYHEDRA[polyKey];
  if (!poly) return { V: 0, E: 0, F: 0, degree: 0, degrees: [], isUniformDegree: true, oddCount: 0, eulerPath: false, eulerCircuit: false, hamiltonianCircuit: false, eulerFormula: 0 };

  const V = poly.vertices.length;
  const E = poly.edges.length;
  const F = poly.numFaces;

  const degreeArr = new Array(V).fill(0);
  for (const [i, j] of poly.edges) {
    degreeArr[i]++;
    degreeArr[j]++;
  }
  const oddCount = degreeArr.filter(d => d % 2 !== 0).length;
  const uniqueDegrees = [...new Set(degreeArr)].sort((a, b) => a - b);
  const isUniformDegree = uniqueDegrees.length === 1;

  return {
    V, E, F,
    degree: isUniformDegree ? uniqueDegrees[0] : null,
    degrees: uniqueDegrees,
    isUniformDegree,
    oddCount,
    eulerPath: oddCount === 0 || oddCount === 2,
    eulerCircuit: oddCount === 0,
    // All Platonic and Archimedean solids have Hamiltonian circuits
    hamiltonianCircuit: true,
    eulerFormula: V - E + F
  };
}
