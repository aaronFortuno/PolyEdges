// Platonic solid definitions
// All vertices normalized to unit circumradius (distance from center to vertex = 1)
// Solids are built via convex hull from vertices (no manual face definitions needed)

const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio

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

// --- TETRAHEDRON ---
const tetraVerts = normalizeToUnit([
  [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]
]);

// --- CUBE ---
const cubeVerts = normalizeToUnit([
  [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
  [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1]
]);

// --- OCTAHEDRON ---
const octaVerts = normalizeToUnit([
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
]);

// --- DODECAHEDRON ---
const dodecaVerts = normalizeToUnit([
  // Cube vertices
  [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
  [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1],
  // Golden rectangles
  [0, -1 / PHI, -PHI], [0, -1 / PHI, PHI], [0, 1 / PHI, -PHI], [0, 1 / PHI, PHI],
  [-1 / PHI, -PHI, 0], [-1 / PHI, PHI, 0], [1 / PHI, -PHI, 0], [1 / PHI, PHI, 0],
  [-PHI, 0, -1 / PHI], [-PHI, 0, 1 / PHI], [PHI, 0, -1 / PHI], [PHI, 0, 1 / PHI]
]);

// --- ICOSAHEDRON ---
const icosaVerts = normalizeToUnit([
  [0, -1, -PHI], [0, -1, PHI], [0, 1, -PHI], [0, 1, PHI],
  [-1, -PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [1, PHI, 0],
  [-PHI, 0, -1], [-PHI, 0, 1], [PHI, 0, -1], [PHI, 0, 1]
]);

// Build edge lists using distance thresholds
function getEdgeLength(verts) {
  // Find minimum distance between any two vertices = edge length
  let minDist = Infinity;
  for (let i = 0; i < verts.length; i++) {
    for (let j = i + 1; j < verts.length; j++) {
      const d = vecDist(verts[i], verts[j]);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

export const POLYHEDRA = {
  tetrahedron: {
    label: 'Tetraedre',
    vertices: tetraVerts,
    edges: buildEdges(tetraVerts, getEdgeLength(tetraVerts)),
    numFaces: 4,
    vertexDegree: 3
  },
  cube: {
    label: 'Cub',
    vertices: cubeVerts,
    edges: buildEdges(cubeVerts, getEdgeLength(cubeVerts)),
    numFaces: 6,
    vertexDegree: 3
  },
  octahedron: {
    label: 'Octaedre',
    vertices: octaVerts,
    edges: buildEdges(octaVerts, getEdgeLength(octaVerts)),
    numFaces: 8,
    vertexDegree: 4
  },
  dodecahedron: {
    label: 'Dodecaedre',
    vertices: dodecaVerts,
    edges: buildEdges(dodecaVerts, getEdgeLength(dodecaVerts)),
    numFaces: 12,
    vertexDegree: 3
  },
  icosahedron: {
    label: 'Icosaedre',
    vertices: icosaVerts,
    edges: buildEdges(icosaVerts, getEdgeLength(icosaVerts)),
    numFaces: 20,
    vertexDegree: 5
  }
};

// Euler path analysis
export function analyzeEuler(polyKey) {
  const poly = POLYHEDRA[polyKey];
  const V = poly.vertices.length;
  const E = poly.edges.length;
  const F = poly.numFaces;

  // Count degree of each vertex from actual edge list
  const degree = new Array(V).fill(0);
  for (const [i, j] of poly.edges) {
    degree[i]++;
    degree[j]++;
  }
  const oddCount = degree.filter(d => d % 2 !== 0).length;

  let eulerPath, eulerCircuit;
  if (oddCount === 0) {
    eulerCircuit = true;
    eulerPath = true;
  } else if (oddCount === 2) {
    eulerCircuit = false;
    eulerPath = true;
  } else {
    eulerCircuit = false;
    eulerPath = false;
  }

  return {
    V, E, F,
    degree: degree[0], // all vertices have same degree in Platonic solids
    oddCount,
    eulerPath,
    eulerCircuit,
    eulerFormula: V - E + F
  };
}
