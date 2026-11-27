import type { ElementShape, ElementVisualKind } from '../data/galaxies';

const spriteCache = new Map<string, HTMLCanvasElement>();

function drawGrid(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  palette: Record<string, string>,
): void {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const color = palette[ch];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

const SHAPE_GRIDS: Record<ElementShape, string[]> = {
  // Soft airy gas clouds (D = soft bottom shade, M = airy body, L = bright highlight)
  'cloud-puff': [
    '...LLL.....',
    '..LLLLML...',
    '.LLMMMMMML.',
    'LMMMMMMMMMD',
    'MMMMMMMMDDD',
    '.DDDDDDDDD.',
    '..DDDDDDD..',
  ],
  'cloud-wisp': [
    '....LLL.....',
    '..LLLLMM....',
    'LLLMMMMMMLL.',
    '.MMMMMMMMMMD',
    '..DDDDDDDD..',
    '............',
  ],
  'cloud-billow': [
    '....LLL....',
    '..LLLLLLL..',
    '.LLMMMMMML.',
    'LLMMMMMMMMD',
    'MMMMMMMMDDD',
    '.DDDDDDDDD.',
    '..DDDDDDD..',
  ],
  // Liquid droplet
  droplet: [
    '...O....',
    '..OLO...',
    '..OLMO..',
    '.OLMMMO.',
    '.OMMMDO.',
    'OMMMMDD0'.replace('0', 'O'),
    'OMDDDDO.',
    '.ODDDDO.',
    '..OOOO..',
  ],
  // Discharge tubes
  'tube-tall': [
    '..CCC..',
    '..CCC..',
    '.GDDDG.',
    '.GDMDG.',
    '.GDLMG.',
    '.GMLMG.',
    '.GLLMG.',
    '.GMLMG.',
    '.GDLMG.',
    '.GDMDG.',
    '.GDDDG.',
    '..GGG..',
  ],
  'tube-bulb': [
    '..CCC..',
    '.GDDDG.',
    'GDLLMDG',
    'GDLMLDG',
    'GDMLMDG',
    '.GDDDG.',
    '..GMG..',
    '..GMG..',
    '.GDDDG.',
    '.GDMDG.',
    '..GGG..',
  ],
  // Atomic nuclei
  'nucleus-a': [
    '...OOOO...',
    '..OPNNPO..',
    '.OPNPNPPO.',
    '.ONPPNNPO.',
    '.OPNNPPNO.',
    '.ONPNPNPO.',
    '..ONPPNO..',
    '...OOOO...',
  ],
  'nucleus-b': [
    '..OOOO....',
    '.ONPPNOO..',
    'OPNNPPNPO.',
    'ONPPNNPPO.',
    '.OPNPNPNO.',
    '.ONPPNNPO.',
    '..OOPPNO..',
    '....OOOO..',
  ],
  // Isometric cube (e.g. NaCl, Pb, Zr)
  cube: [
    '..OOOOO..',
    '.OLLLLMO.',
    'OLLLLMMMO',
    'OMMMDDDD0'.replace('0', 'O'),
    'OMMDDDDDO',
    'OMDDDDDDO',
    'OMDDDDDDO',
    '.ODDDDDO.',
    '..OOOOO..',
  ],
  // Hexagonal prism column (Be, Hf, Se, Th)
  'hex-prism': [
    '..OOOO..',
    '.OLLLL0.'.replace('0', 'O'),
    '.OLMMDO.',
    'OOLMMDOO',
    'OLMMMDDD',
    'OMMMMDDD',
    'OMMMDDDO',
    'OMMMDDDO',
    '.OMMDDO.',
    '..OOOO..',
  ],
  // Twin asymmetric crystals (K, As, Re, Ln)
  'twin-crystal': [
    '......OO...',
    '.....OLLO..',
    '..OO.OLMO..',
    '.OLLOOMMDO.',
    '.OLMOMMDDO.',
    'OOMMOMDDDO.',
    'OLMMDDDDDO.',
    '.ODDDDDDO..',
    '..OOOOOO...',
  ],
  // Sharp crystal spire (Li, Si, W, Ir, Nd)
  spire: [
    '...OO...',
    '..OLLO..',
    '..OLMO..',
    '.OLLMMO.',
    '.OLMMDO.',
    'OLMMMDO.',
    'OMMMMDDO',
    'OMDDDDDO',
    '.ODDDDO.',
    '..OOOO..',
  ],
  // Rough jagged geode / ore chunk (Cs, P, Mn, Ac)
  geode: [
    '..OOOOOO..',
    '.OLLMDDMO.',
    'OLMMLLDDMO',
    'OMLLLMDDDO',
    'OMMDDDDDDO',
    '.ODDDDDDO.',
    '..OOOOOO..',
  ],
  // Diamond octahedron (Sr, Ge, Ta, Rh, Eu)
  octahedron: [
    '....O....',
    '...OLO...',
    '..OLLMOO.',
    '.OLLMMDO.',
    'OLLMDDDDO',
    '.OMDDDDO.',
    '..ODDDO..',
    '...ODO...',
    '....O....',
  ],
  // Metallic ingot / bar (Al, Nb, Te, Fe, Pt)
  ingot: [
    '...OOOOOO..',
    '..OLLLLLMO.',
    '.OLLLLMMMO.',
    'OLLLLMMMDO.',
    'OMMMMDDDDO.',
    'ODDDDDDDO..',
    '.OOOOOOO...',
  ],
  // Organic lumpy nugget (In, Ni, Pd, Au)
  nugget: [
    '..OOOO....',
    '.OLLLLOO..',
    'OLLMMMLLO.',
    'OMMMMMDDMO',
    'OMMDDDDDDO',
    '.ODDDDDDO.',
    '..OOOOOO..',
  ],
  // Diagonal sharp shard (Ra, B, Ti, Cr, Os, Gd)
  shard: [
    '......OO.',
    '....OOLLO',
    '...OLLLMO',
    '..OLLMMDO',
    '.OLMMMDO.',
    'OOMMDDO..',
    'OMDDDO...',
    '.OOOO....',
  ],
  // Flat hexagonal plate (Ba, Sb, Y, Mo, Co, Ru, Ce)
  'hex-plate': [
    '..OOOOOO..',
    '.OLLLLMMO.',
    'OLLLLMMMDO',
    'OMMMMDDDDO',
    '.ODDDDDDO.',
    '..OOOOOO..',
  ],
  // Branching dendrite crystal (Ga, Sn, V, Cu, Ag)
  dendrite: [
    '.OO....OO.',
    'OLLO..OLLO',
    '.OLMOOLMO.',
    '..OMMMMO..',
    '.OLLMMDO..',
    'OLLO.OMDO.',
    '.OO...ODO.',
    '......OO..',
  ],
  // Rounded dense pebble (Mg, Tl, Sc, Tc, Pa)
  pebble: [
    '..OOOOO..',
    '.OLLLLMO.',
    'OLLMMMDD0'.replace('0', 'O'),
    'OMMMMMDDO',
    'OMDDDDDDO',
    '.ODDDDDO.',
    '..OOOOO..',
  ],
  // Layered flake (Rb, C, I, Zn)
  flake: [
    '..OOOOOO..',
    '.OLLLLMMO.',
    'OOMMMMDDDO',
    '.OLLLLMMO.',
    'OOMDDDDDDO',
    '.OOOOOOOO.',
  ],
  // Rhombic cluster (Ca, S, U)
  rhombic: [
    '...OOO....',
    '..OLLO.OO.',
    '.OLMMOOLLO',
    'OLMMMDMMDO',
    'OMMDDDDDDO',
    '.ODDDDDDO.',
    '..OOOOOO..',
  ],
  // Stepped hopper crystal (Bi)
  hopper: [
    '.OOOOOOOO.',
    'OLLMMMMDDO',
    'OLOOOOOMDO',
    'OLOLMMOMDO',
    'OLOMDDOMDO',
    'OMOOOOODDO',
    'OMDDDDDDDO',
    '.OOOOOOOO.',
  ],
};

export function getElementPixelSprite(
  kind: ElementVisualKind,
  shape: ElementShape,
  colors: [string, string, string],
): HTMLCanvasElement {
  const key = `${kind}:${shape}:${colors.join(',')}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const [cDark, cMid, cLight] = colors;
  const canvas = document.createElement('canvas');
  const rows = SHAPE_GRIDS[shape] ?? SHAPE_GRIDS.geode;
  canvas.width = rows[0]?.length ?? 9;
  canvas.height = rows.length;
  const ctx = canvas.getContext('2d')!;

  if (kind === 'gas-tube') {
    drawGrid(ctx, rows, {
      C: '#64748b',
      G: '#94a3b8',
      D: cDark,
      M: cMid,
      L: cLight,
    });
  } else if (kind === 'nucleus') {
    drawGrid(ctx, rows, {
      O: '#0f172a',
      P: cMid,
      N: cLight,
    });
  } else if (kind === 'gas-cloud') {
    drawGrid(ctx, rows, {
      D: cDark,
      M: cMid,
      L: cLight,
    });
  } else {
    drawGrid(ctx, rows, {
      O: cDark,
      D: cDark,
      M: cMid,
      L: cLight,
    });
  }

  spriteCache.set(key, canvas);
  return canvas;
}
