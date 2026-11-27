import type { GalaxyId } from '../types/models';

export type ElementVisualKind =
  | 'solid'
  | 'metal'
  | 'mineral'
  | 'gas-cloud'
  | 'gas-tube'
  | 'liquid'
  | 'nucleus';

export type ElementShape =
  | 'cube'
  | 'hex-prism'
  | 'twin-crystal'
  | 'spire'
  | 'geode'
  | 'octahedron'
  | 'ingot'
  | 'nugget'
  | 'shard'
  | 'hex-plate'
  | 'dendrite'
  | 'pebble'
  | 'flake'
  | 'rhombic'
  | 'hopper'
  | 'droplet'
  | 'cloud-puff'
  | 'cloud-wisp'
  | 'cloud-billow'
  | 'tube-tall'
  | 'tube-bulb'
  | 'nucleus-a'
  | 'nucleus-b';

export interface GalaxyElementStar {
  symbol: string;
  nameRu: string;
  atomicNumber: number | string;
  chainId?: string;
  visualKind: ElementVisualKind;
  shape: ElementShape;
  visualLabel: string;
  /** [outline/shadow, midtone, highlight/glow] */
  colors: [string, string, string];
}

export interface ElementGalaxyConfig {
  id: GalaxyId;
  label: string;
  shortLabel: string;
  description: string;
  spinSpeed: number;
  color: string;
  lightColor: string;
  stars: GalaxyElementStar[];
}

export const ELEMENT_GALAXIES: ElementGalaxyConfig[] = [
  {
    id: 's',
    label: 's-элементы',
    shortLabel: 's-блок',
    description: 'Щелочные и щелочноземельные металлы.',
    spinSpeed: 0.085,
    color: '#38bdf8',
    lightColor: '#0284c7',
    stars: [
      { symbol: 'Li', nameRu: 'Литий', atomicNumber: 3, chainId: 'li', visualKind: 'mineral', shape: 'spire', visualLabel: 'Минерал: сподумен', colors: ['#4c1d95', '#a78bfa', '#ede9fe'] },
      { symbol: 'Na', nameRu: 'Натрий', atomicNumber: 11, chainId: 'na', visualKind: 'mineral', shape: 'cube', visualLabel: 'Минерал: галит (каменная соль)', colors: ['#64748b', '#e2e8f0', '#ffffff'] },
      { symbol: 'K', nameRu: 'Калий', atomicNumber: 19, chainId: 'k', visualKind: 'mineral', shape: 'twin-crystal', visualLabel: 'Минерал: сильвин', colors: ['#9a3412', '#fb923c', '#ffedd5'] },
      { symbol: 'Rb', nameRu: 'Рубидий', atomicNumber: 37, chainId: 'rb', visualKind: 'mineral', shape: 'flake', visualLabel: 'Минерал: лепидолит', colors: ['#701a75', '#d946ef', '#fae8ff'] },
      { symbol: 'Cs', nameRu: 'Цезий', atomicNumber: 55, chainId: 'cs', visualKind: 'mineral', shape: 'geode', visualLabel: 'Минерал: поллуцит', colors: ['#475569', '#cbd5e1', '#f8fafc'] },
      { symbol: 'Be', nameRu: 'Бериллий', atomicNumber: 4, chainId: 'be', visualKind: 'mineral', shape: 'hex-prism', visualLabel: 'Минерал: берилл (изумруд)', colors: ['#064e3b', '#10b981', '#a7f3d0'] },
      { symbol: 'Mg', nameRu: 'Магний', atomicNumber: 12, chainId: 'mg', visualKind: 'mineral', shape: 'pebble', visualLabel: 'Минерал: оливин', colors: ['#365314', '#84cc16', '#ecfccb'] },
      { symbol: 'Ca', nameRu: 'Кальций', atomicNumber: 20, chainId: 'ca', visualKind: 'mineral', shape: 'rhombic', visualLabel: 'Минерал: кальцит', colors: ['#78716c', '#f5f5f4', '#ffffff'] },
      { symbol: 'Sr', nameRu: 'Стронций', atomicNumber: 38, chainId: 'sr', visualKind: 'mineral', shape: 'octahedron', visualLabel: 'Минерал: целестин', colors: ['#0c4a6e', '#38bdf8', '#e0f2fe'] },
      { symbol: 'Ba', nameRu: 'Барий', atomicNumber: 56, chainId: 'ba', visualKind: 'mineral', shape: 'hex-plate', visualLabel: 'Минерал: барит', colors: ['#78350f', '#f59e0b', '#fef3c7'] },
      { symbol: 'H', nameRu: 'Водород', atomicNumber: 1, visualKind: 'gas-cloud', shape: 'cloud-wisp', visualLabel: 'Газ H₂ (лёгкое облачко)', colors: ['#38bdf8', '#e0f2fe', '#ffffff'] },
      { symbol: 'Fr', nameRu: 'Франций', atomicNumber: 87, visualKind: 'nucleus', shape: 'nucleus-a', visualLabel: 'Атомное ядро (радиоактивный)', colors: ['#7f1d1d', '#ef4444', '#93c5fd'] },
      { symbol: 'Ra', nameRu: 'Радий', atomicNumber: 88, visualKind: 'mineral', shape: 'shard', visualLabel: 'Радиевая руда', colors: ['#14532d', '#4ade80', '#dcfce7'] },
    ],
  },
  {
    id: 'p',
    label: 'p-элементы',
    shortLabel: 'p-блок',
    description: 'От бора и углерода до халькогенов и галогенов.',
    spinSpeed: -0.072,
    color: '#22c55e',
    lightColor: '#15803d',
    stars: [
      { symbol: 'B', nameRu: 'Бор', atomicNumber: 5, chainId: 'b', visualKind: 'solid', shape: 'shard', visualLabel: 'Кристаллический бор (тёмно-серый)', colors: ['#1e293b', '#475569', '#94a3b8'] },
      { symbol: 'Al', nameRu: 'Алюминий', atomicNumber: 13, chainId: 'al', visualKind: 'metal', shape: 'ingot', visualLabel: 'Алюминий (светлый металл)', colors: ['#64748b', '#cbd5e1', '#f8fafc'] },
      { symbol: 'Ga', nameRu: 'Галлий', atomicNumber: 31, chainId: 'ga', visualKind: 'metal', shape: 'dendrite', visualLabel: 'Галлий (серебристо-синеватый)', colors: ['#475569', '#94a3b8', '#e0f2fe'] },
      { symbol: 'In', nameRu: 'Индий', atomicNumber: 49, chainId: 'in', visualKind: 'metal', shape: 'nugget', visualLabel: 'Индий (мягкий серебристый)', colors: ['#475569', '#cbd5e1', '#f1f5f9'] },
      { symbol: 'Tl', nameRu: 'Таллий', atomicNumber: 81, chainId: 'tl', visualKind: 'metal', shape: 'pebble', visualLabel: 'Таллий (сизовато-серый металл)', colors: ['#334155', '#64748b', '#cbd5e1'] },
      { symbol: 'C', nameRu: 'Углерод', atomicNumber: 6, chainId: 'c', visualKind: 'solid', shape: 'flake', visualLabel: 'Графит (чёрно-серый)', colors: ['#090d16', '#27272a', '#52525b'] },
      { symbol: 'Si', nameRu: 'Кремний', atomicNumber: 14, chainId: 'si', visualKind: 'solid', shape: 'spire', visualLabel: 'Кристаллический кремний', colors: ['#1e293b', '#475569', '#93c5fd'] },
      { symbol: 'Ge', nameRu: 'Германий', atomicNumber: 32, chainId: 'ge', visualKind: 'solid', shape: 'octahedron', visualLabel: 'Германий (серо-серебристый)', colors: ['#334155', '#64748b', '#e2e8f0'] },
      { symbol: 'Sn', nameRu: 'Олово', atomicNumber: 50, chainId: 'sn', visualKind: 'metal', shape: 'dendrite', visualLabel: 'Белое олово', colors: ['#64748b', '#cbd5e1', '#ffffff'] },
      { symbol: 'Pb', nameRu: 'Свинец', atomicNumber: 82, chainId: 'pb', visualKind: 'metal', shape: 'cube', visualLabel: 'Свинец (тускло-синеватый)', colors: ['#1e293b', '#475569', '#94a3b8'] },
      { symbol: 'N', nameRu: 'Азот', atomicNumber: 7, chainId: 'n', visualKind: 'gas-cloud', shape: 'cloud-puff', visualLabel: 'Газ N₂ (бесцветное облачко)', colors: ['#64748b', '#cbd5e1', '#f8fafc'] },
      { symbol: 'P', nameRu: 'Фосфор', atomicNumber: 15, chainId: 'p', visualKind: 'solid', shape: 'geode', visualLabel: 'Красный фосфор', colors: ['#7f1d1d', '#dc2626', '#fca5a5'] },
      { symbol: 'As', nameRu: 'Мышьяк', atomicNumber: 33, chainId: 'as', visualKind: 'solid', shape: 'twin-crystal', visualLabel: 'Серый мышьяк', colors: ['#18181b', '#52525b', '#a1a1aa'] },
      { symbol: 'Sb', nameRu: 'Сурьма', atomicNumber: 51, chainId: 'sb', visualKind: 'solid', shape: 'hex-plate', visualLabel: 'Сурьма (серебристо-белая)', colors: ['#475569', '#94a3b8', '#f1f5f9'] },
      { symbol: 'Bi', nameRu: 'Висмут', atomicNumber: 83, chainId: 'bi', visualKind: 'solid', shape: 'hopper', visualLabel: 'Висмут (розовато-радужный)', colors: ['#581c87', '#e879f9', '#fde047'] },
      { symbol: 'O', nameRu: 'Кислород', atomicNumber: 8, chainId: 'o', visualKind: 'gas-cloud', shape: 'cloud-billow', visualLabel: 'Газ O₂ (слабо-голубое облачко)', colors: ['#0284c7', '#7dd3fc', '#f0f9ff'] },
      { symbol: 'S', nameRu: 'Сера', atomicNumber: 16, chainId: 's', visualKind: 'solid', shape: 'rhombic', visualLabel: 'Ромбическая сера (жёлтая)', colors: ['#a16207', '#facc15', '#fef9c3'] },
      { symbol: 'Se', nameRu: 'Селен', atomicNumber: 34, chainId: 'se', visualKind: 'solid', shape: 'hex-prism', visualLabel: 'Серый селен', colors: ['#27272a', '#71717a', '#d4d4d8'] },
      { symbol: 'Te', nameRu: 'Теллур', atomicNumber: 52, chainId: 'te', visualKind: 'solid', shape: 'ingot', visualLabel: 'Серебристо-белый теллур', colors: ['#475569', '#94a3b8', '#f8fafc'] },
      { symbol: 'F', nameRu: 'Фтор', atomicNumber: 9, chainId: 'f', visualKind: 'gas-cloud', shape: 'cloud-wisp', visualLabel: 'Газ F₂ (бледно-жёлтое облачко)', colors: ['#a16207', '#fef08a', '#fefce8'] },
      { symbol: 'Cl', nameRu: 'Хлор', atomicNumber: 17, chainId: 'cl', visualKind: 'gas-cloud', shape: 'cloud-billow', visualLabel: 'Газ Cl₂ (жёлто-зелёное облачко)', colors: ['#4d7c0f', '#bef264', '#ecfccb'] },
      { symbol: 'Br', nameRu: 'Бром', atomicNumber: 35, chainId: 'br', visualKind: 'liquid', shape: 'droplet', visualLabel: 'Жидкий бром (тёмно-бурый)', colors: ['#450a0a', '#991b1b', '#f87171'] },
      { symbol: 'I', nameRu: 'Иод', atomicNumber: 53, chainId: 'i', visualKind: 'solid', shape: 'flake', visualLabel: 'Кристаллы иода (фиолетово-чёрный)', colors: ['#1e1b4b', '#581c87', '#c084fc'] },
    ],
  },
  {
    id: 'noble-gases',
    label: 'Благородные газы',
    shortLabel: '18 группа',
    description: 'Инертные газы в газоразрядных трубках.',
    spinSpeed: 0.075,
    color: '#22d3ee',
    lightColor: '#0e7490',
    stars: [
      { symbol: 'He', nameRu: 'Гелий', atomicNumber: 2, visualKind: 'gas-tube', shape: 'tube-tall', visualLabel: 'Разряд: персиково-оранжевый', colors: ['#9a3412', '#fb923c', '#ffedd5'] },
      { symbol: 'Ne', nameRu: 'Неон', atomicNumber: 10, visualKind: 'gas-tube', shape: 'tube-bulb', visualLabel: 'Разряд: огненно-красный', colors: ['#991b1b', '#ef4444', '#fecaca'] },
      { symbol: 'Ar', nameRu: 'Аргон', atomicNumber: 18, visualKind: 'gas-tube', shape: 'tube-tall', visualLabel: 'Разряд: фиолетово-сиреневый', colors: ['#4c1d95', '#a855f7', '#f3e8ff'] },
      { symbol: 'Kr', nameRu: 'Криптон', atomicNumber: 36, chainId: 'kr', visualKind: 'gas-tube', shape: 'tube-bulb', visualLabel: 'Разряд: бледно-голубовато-белый', colors: ['#0369a1', '#bae6fd', '#ffffff'] },
      { symbol: 'Xe', nameRu: 'Ксенон', atomicNumber: 54, chainId: 'xe', visualKind: 'gas-tube', shape: 'tube-tall', visualLabel: 'Разряд: ярко-синий', colors: ['#1e40af', '#60a5fa', '#e0f2fe'] },
      { symbol: 'Rn', nameRu: 'Радон', atomicNumber: 86, visualKind: 'gas-tube', shape: 'tube-bulb', visualLabel: 'Разряд: ало-оранжевый', colors: ['#7f1d1d', '#f97316', '#fed7aa'] },
    ],
  },
  {
    id: 'd',
    label: 'd-элементы',
    shortLabel: 'd-блок',
    description: 'Переходные металлы.',
    spinSpeed: 0.08,
    color: '#94a3b8',
    lightColor: '#334155',
    stars: [
      { symbol: 'Sc', nameRu: 'Скандий', atomicNumber: 21, chainId: 'sc', visualKind: 'metal', shape: 'pebble', visualLabel: 'Серебристо-белый металл', colors: ['#475569', '#cbd5e1', '#f8fafc'] },
      { symbol: 'Y', nameRu: 'Иттрий', atomicNumber: 39, chainId: 'y', visualKind: 'metal', shape: 'hex-plate', visualLabel: 'Светло-серый металл', colors: ['#475569', '#94a3b8', '#f1f5f9'] },
      { symbol: 'Ti', nameRu: 'Титан', atomicNumber: 22, chainId: 'ti', visualKind: 'metal', shape: 'shard', visualLabel: 'Серебристо-серый титан', colors: ['#334155', '#94a3b8', '#e2e8f0'] },
      { symbol: 'Zr', nameRu: 'Цирконий', atomicNumber: 40, chainId: 'zr', visualKind: 'metal', shape: 'cube', visualLabel: 'Серый блестящий металл', colors: ['#475569', '#94a3b8', '#f1f5f9'] },
      { symbol: 'Hf', nameRu: 'Гафний', atomicNumber: 72, chainId: 'hf', visualKind: 'metal', shape: 'hex-prism', visualLabel: 'Тугоплавкий серый металл', colors: ['#334155', '#64748b', '#cbd5e1'] },
      { symbol: 'V', nameRu: 'Ванадий', atomicNumber: 23, chainId: 'v', visualKind: 'metal', shape: 'dendrite', visualLabel: 'Сталь-серый металл', colors: ['#334155', '#64748b', '#e2e8f0'] },
      { symbol: 'Nb', nameRu: 'Ниобий', atomicNumber: 41, chainId: 'nb', visualKind: 'metal', shape: 'ingot', visualLabel: 'Светло-стальной металл', colors: ['#475569', '#94a3b8', '#f8fafc'] },
      { symbol: 'Ta', nameRu: 'Тантал', atomicNumber: 73, chainId: 'ta', visualKind: 'metal', shape: 'octahedron', visualLabel: 'Синевато-серый тантал', colors: ['#1e293b', '#64748b', '#bfdbfe'] },
      { symbol: 'Cr', nameRu: 'Хром', atomicNumber: 24, chainId: 'cr', visualKind: 'metal', shape: 'shard', visualLabel: 'Зеркальный голубовато-белый хром', colors: ['#334155', '#cbd5e1', '#ffffff'] },
      { symbol: 'Mo', nameRu: 'Молибден', atomicNumber: 42, chainId: 'mo', visualKind: 'metal', shape: 'hex-plate', visualLabel: 'Серебристо-серый молибден', colors: ['#334155', '#64748b', '#cbd5e1'] },
      { symbol: 'W', nameRu: 'Вольфрам', atomicNumber: 74, chainId: 'w', visualKind: 'metal', shape: 'spire', visualLabel: 'Тёмно-стальной вольфрам', colors: ['#1e293b', '#475569', '#94a3b8'] },
      { symbol: 'Mn', nameRu: 'Марганец', atomicNumber: 25, chainId: 'mn', visualKind: 'metal', shape: 'geode', visualLabel: 'Серебристо-белый хрупкий металл', colors: ['#334155', '#94a3b8', '#e2e8f0'] },
      { symbol: 'Tc', nameRu: 'Технеций', atomicNumber: 43, chainId: 'tc', visualKind: 'metal', shape: 'pebble', visualLabel: 'Серебристо-серый технеций', colors: ['#475569', '#94a3b8', '#e2e8f0'] },
      { symbol: 'Re', nameRu: 'Рений', atomicNumber: 75, chainId: 're', visualKind: 'metal', shape: 'twin-crystal', visualLabel: 'Тяжёлый серебристый металл', colors: ['#334155', '#cbd5e1', '#f8fafc'] },
      { symbol: 'Fe', nameRu: 'Железо', atomicNumber: 26, chainId: 'fe', visualKind: 'metal', shape: 'ingot', visualLabel: 'Железо (серо-стальное)', colors: ['#1e293b', '#64748b', '#cbd5e1'] },
      { symbol: 'Co', nameRu: 'Кобальт', atomicNumber: 27, chainId: 'co', visualKind: 'metal', shape: 'hex-plate', visualLabel: 'Кобальт (слегка розовато-стальной)', colors: ['#334155', '#94a3b8', '#fce7f3'] },
      { symbol: 'Ni', nameRu: 'Никель', atomicNumber: 28, chainId: 'ni', visualKind: 'metal', shape: 'nugget', visualLabel: 'Никель (тёплый серебристый)', colors: ['#475569', '#cbd5e1', '#fef3c7'] },
      { symbol: 'Cu', nameRu: 'Медь', atomicNumber: 29, chainId: 'cu', visualKind: 'metal', shape: 'dendrite', visualLabel: 'Медь (золотисто-розовая)', colors: ['#7c2d12', '#ea580c', '#fed7aa'] },
      { symbol: 'Zn', nameRu: 'Цинк', atomicNumber: 30, chainId: 'zn', visualKind: 'metal', shape: 'flake', visualLabel: 'Цинк (голубовато-белый)', colors: ['#475569', '#94a3b8', '#e0f2fe'] },
      { symbol: 'Cd', nameRu: 'Кадмий', atomicNumber: 48, chainId: 'cd', visualKind: 'metal', shape: 'cube', visualLabel: 'Мягкий серебристый кадмий', colors: ['#475569', '#cbd5e1', '#f8fafc'] },
      { symbol: 'Hg', nameRu: 'Ртуть', atomicNumber: 80, chainId: 'hg', visualKind: 'liquid', shape: 'droplet', visualLabel: 'Жидкая зеркальная ртуть', colors: ['#475569', '#e2e8f0', '#ffffff'] },
    ],
  },
  {
    id: 'platinum-noble',
    label: 'Платиноиды и Au/Ag',
    shortLabel: 'Благородные металлы',
    description: 'Ru, Rh, Pd, Os, Ir, Pt, Ag и Au.',
    spinSpeed: 0.055,
    color: '#7dd3fc',
    lightColor: '#0369a1',
    stars: [
      { symbol: 'Ru', nameRu: 'Рутений', atomicNumber: 44, chainId: 'ru', visualKind: 'metal', shape: 'hex-plate', visualLabel: 'Рутений (тёмно-стальной блестящий)', colors: ['#1e293b', '#64748b', '#e2e8f0'] },
      { symbol: 'Rh', nameRu: 'Родий', atomicNumber: 45, chainId: 'rh', visualKind: 'metal', shape: 'octahedron', visualLabel: 'Родий (холодно-зеркальный)', colors: ['#475569', '#e2e8f0', '#ffffff'] },
      { symbol: 'Pd', nameRu: 'Палладий', atomicNumber: 46, chainId: 'pd', visualKind: 'metal', shape: 'nugget', visualLabel: 'Палладий (мягкий серебристо-белый)', colors: ['#64748b', '#cbd5e1', '#f8fafc'] },
      { symbol: 'Os', nameRu: 'Осмий', atomicNumber: 76, chainId: 'os', visualKind: 'metal', shape: 'shard', visualLabel: 'Осмий (синевато-серебристый)', colors: ['#1e3a8a', '#60a5fa', '#e0f2fe'] },
      { symbol: 'Ir', nameRu: 'Иридий', atomicNumber: 77, chainId: 'ir', visualKind: 'metal', shape: 'spire', visualLabel: 'Иридий (серебристый с желтоватым оттенком)', colors: ['#57534e', '#d6d3d1', '#fef9c3'] },
      { symbol: 'Pt', nameRu: 'Платина', atomicNumber: 78, chainId: 'pt', visualKind: 'metal', shape: 'ingot', visualLabel: 'Платина (благородно-серая)', colors: ['#475569', '#cbd5e1', '#f8fafc'] },
      { symbol: 'Ag', nameRu: 'Серебро', atomicNumber: 47, chainId: 'ag', visualKind: 'metal', shape: 'dendrite', visualLabel: 'Серебро (яркий зеркальный блеск)', colors: ['#64748b', '#f1f5f9', '#ffffff'] },
      { symbol: 'Au', nameRu: 'Золото', atomicNumber: 79, chainId: 'au', visualKind: 'metal', shape: 'nugget', visualLabel: 'Золото (тёплое жёлтое)', colors: ['#92400e', '#facc15', '#fef9c3'] },
    ],
  },
  {
    id: 'f',
    label: 'f-элементы',
    shortLabel: 'f-блок',
    description: 'Лантаноиды и актиноиды.',
    spinSpeed: -0.085,
    color: '#f59e0b',
    lightColor: '#b45309',
    stars: [
      { symbol: 'Ln', nameRu: 'Лантаноиды', atomicNumber: '57–71', chainId: 'ln', visualKind: 'mineral', shape: 'twin-crystal', visualLabel: 'Минерал: монацит', colors: ['#78350f', '#d97706', '#fde68a'] },
      { symbol: 'Ac', nameRu: 'Актиний', atomicNumber: 89, chainId: 'ac', visualKind: 'mineral', shape: 'geode', visualLabel: 'Минерал: уранинит (смоляная руда)', colors: ['#18181b', '#3f3f46', '#67e8f9'] },
      { symbol: 'Th', nameRu: 'Торий', atomicNumber: 90, chainId: 'th', visualKind: 'mineral', shape: 'hex-prism', visualLabel: 'Минерал: торит', colors: ['#451a03', '#b45309', '#fed7aa'] },
      { symbol: 'Pa', nameRu: 'Протактиний', atomicNumber: 91, chainId: 'pa', visualKind: 'mineral', shape: 'pebble', visualLabel: 'Минерал: урановая смолка', colors: ['#0f172a', '#334155', '#94a3b8'] },
      { symbol: 'U', nameRu: 'Уран', atomicNumber: 92, chainId: 'u', visualKind: 'mineral', shape: 'rhombic', visualLabel: 'Минерал: карнотит', colors: ['#3f6212', '#bef264', '#fef08a'] },
      { symbol: 'Np', nameRu: 'Нептуний', atomicNumber: 93, chainId: 'np', visualKind: 'nucleus', shape: 'nucleus-a', visualLabel: 'Атомное ядро (трансурановый)', colors: ['#7f1d1d', '#ef4444', '#60a5fa'] },
      { symbol: 'Pu', nameRu: 'Плутоний', atomicNumber: 94, chainId: 'pu', visualKind: 'nucleus', shape: 'nucleus-b', visualLabel: 'Атомное ядро (трансурановый)', colors: ['#7f1d1d', '#ef4444', '#60a5fa'] },
      { symbol: 'Am', nameRu: 'Америций', atomicNumber: 95, chainId: 'am', visualKind: 'nucleus', shape: 'nucleus-a', visualLabel: 'Атомное ядро (трансурановый)', colors: ['#7f1d1d', '#ef4444', '#60a5fa'] },
      { symbol: 'Ce', nameRu: 'Церий', atomicNumber: 58, visualKind: 'mineral', shape: 'hex-plate', visualLabel: 'Минерал: бастнезит', colors: ['#7c2d12', '#ea580c', '#fed7aa'] },
      { symbol: 'Nd', nameRu: 'Неодим', atomicNumber: 60, visualKind: 'mineral', shape: 'spire', visualLabel: 'Минерал: монацит-(Nd)', colors: ['#581c87', '#c084fc', '#f3e8ff'] },
      { symbol: 'Eu', nameRu: 'Европий', atomicNumber: 63, visualKind: 'mineral', shape: 'octahedron', visualLabel: 'Минерал: ксенотим', colors: ['#713f12', '#eab308', '#fef08a'] },
      { symbol: 'Gd', nameRu: 'Гадолиний', atomicNumber: 64, visualKind: 'mineral', shape: 'shard', visualLabel: 'Минерал: гадолинит', colors: ['#064e3b', '#059669', '#6ee7b7'] },
      { symbol: 'Yb', nameRu: 'Иттербий', atomicNumber: 70, visualKind: 'mineral', shape: 'cube', visualLabel: 'Минерал: эвксенит', colors: ['#292524', '#78716c', '#d6d3d1'] },
      { symbol: 'Cm', nameRu: 'Кюрий', atomicNumber: 96, visualKind: 'nucleus', shape: 'nucleus-b', visualLabel: 'Атомное ядро (трансурановый)', colors: ['#7f1d1d', '#ef4444', '#60a5fa'] },
    ],
  },
];

const SYMBOL_TO_GALAXY = new Map<string, GalaxyId>();
for (const galaxy of ELEMENT_GALAXIES) {
  for (const star of galaxy.stars) {
    SYMBOL_TO_GALAXY.set(star.symbol.toLowerCase(), galaxy.id);
  }
}

export function getGalaxyForElement(element: string): GalaxyId {
  return SYMBOL_TO_GALAXY.get(element.trim().toLowerCase()) ?? 'd';
}

export function getGalaxyById(id: GalaxyId): ElementGalaxyConfig {
  return ELEMENT_GALAXIES.find((g) => g.id === id) ?? ELEMENT_GALAXIES[0];
}
