# PolyEdges — Generador de sòlids amb ranures per explorar camins d'Euler i Hamilton

[![Llicència: GPL v3](https://img.shields.io/badge/Llicència-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

**PolyEdges** és una eina educativa interactiva que genera models STL de sòlids geomètrics (platònics i arquimedians) amb ranures al llarg de cada aresta. Els estudiants passen un cordill per les ranures per verificar experimentalment les propietats dels camins d'Euler (arestes) i Hamilton (vèrtexs).

<!-- CAPTURA DE PANTALLA: afegir una imatge de l'aplicació aquí -->
<!-- ![Captura de PolyEdges](screenshot.png) -->

## Característiques

- Genera models STL de tots els **5 sòlids platònics** i els **13 sòlids arquimedians**
- **Ranures** al llarg de cada aresta perquè els estudiants hi puguin passar un cordill
- **Anàlisi euleriana i hamiltoniana** automàtica: indica si el sòlid admet camí/circuit d'Euler (arestes) i de Hamilton (vèrtexs)
- **Estimació de la longitud del cordill** necessari
- **Forat per xinxeta** opcional per fixar el sòlid a un tauler
- Exportació directa a **STL** per a impressió 3D
- Vista en **filferro** per visualitzar les arestes
- **Mode clar / fosc**
- **Internacionalització** en català, castellà, euskera, gallec i anglès (ca / es / eu / gl / en)

## Com utilitzar-lo

**Opció 1 — En línia:**
Visita la versió publicada a: [https://aaronfortuno.github.io/PolyEdges](https://aaronfortuno.github.io/PolyEdges)

**Opció 2 — En local:**
1. Clona o descarrega el repositori.
2. Obre el fitxer `index.html` directament al navegador (no cal cap servidor ni eina de compilació).

## Tecnologies

| Tecnologia | Versió | Ús |
|---|---|---|
| [Three.js](https://threejs.org/) | v0.169.0 | Renderització 3D i visualització |
| [Manifold-3D](https://github.com/elalish/manifold) (WASM) | v3.0.0 | Geometria CSG per generar les ranures |
| JavaScript (Vanilla) | — | Lògica de l'aplicació, sense eines de compilació |

## Llicència

Distribuït sota la **Llicència Pública General GNU v3.0**. Vegeu el fitxer [LICENSE](LICENSE) per a més detalls.

© [Aaron Fortunó](https://github.com/aaronFortuno)

---

# PolyEdges — Solid generator with grooves to explore Euler and Hamilton paths

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

**PolyEdges** is an interactive educational tool that generates STL models of geometric solids (Platonic and Archimedean) with grooves running along each edge. Students thread cord through the grooves to experimentally verify the properties of Euler paths (edges) and Hamilton paths (vertices).

<!-- SCREENSHOT: add an image of the application here -->
<!-- ![PolyEdges screenshot](screenshot.png) -->

## Features

- Generates STL models of all **5 Platonic solids** and all **13 Archimedean solids**
- **Grooves** along every edge so students can thread cord through them
- Automatic **Eulerian and Hamiltonian analysis**: indicates whether the solid supports an Euler path/circuit (edges) and Hamilton circuit (vertices)
- **Cord length estimate** for the required amount of cord
- Optional **pin hole** to attach the solid to a board with a thumbtack
- One-click **STL export** for 3D printing
- **Wireframe view** to visualise edges clearly
- **Light / dark mode**
- **Internationalisation** in Catalan, Spanish, Basque, Galician and English (ca / es / eu / gl / en)

## How to use

**Option 1 — Online:**
Visit the live version at: [https://aaronfortuno.github.io/PolyEdges](https://aaronfortuno.github.io/PolyEdges)

**Option 2 — Locally:**
1. Clone or download the repository.
2. Open `index.html` directly in your browser — no server or build tools required.

## Tech stack

| Technology | Version | Purpose |
|---|---|---|
| [Three.js](https://threejs.org/) | v0.169.0 | 3D rendering and visualisation |
| [Manifold-3D](https://github.com/elalish/manifold) (WASM) | v3.0.0 | CSG geometry for generating grooves |
| JavaScript (Vanilla) | — | Application logic, no build tools |

## License

Distributed under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for details.

© [Aaron Fortunó](https://github.com/aaronFortuno)
