export type AppThemeMode = 'system' | 'light' | 'dark';
export type ViewMode = 'feed' | 'canvas';
export type CatalogFilter = 'all' | 'drugs' | 'natural';
export type SortOption = 'name_asc' | 'year_desc' | 'year_asc' | 'author_asc';
export type AppSection = 'overview' | 'organic' | 'inorganic' | 'collection' | 'contacts';
export type GalaxyId = 's' | 'p' | 'noble-gases' | 'd' | 'platinum-noble' | 'f';

export interface RawCatalogEntry {
  p: string; // path
  f: string; // full
  n: string; // name
  a: string; // author
  y: string; // year
  d: string; // drug
  c: number; // chunk index (-1 if missing)
  o: number; // byte offset
  l: number; // byte length
}

export interface CatalogManifest {
  version: number;
  chunks: string[];
  chunkSizes: number[];
  items: RawCatalogEntry[];
}

export interface CatalogItem {
  path: string;
  full: string;
  name: string;
  author: string;
  year: string;
  drug: string;
  chunkIndex: number;
  offset: number;
  length: number;
  isDrug: boolean;
  yearInt: number;
  displayTitle: string;
  searchBlob: string;
}

export interface ChemBitmap {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  isColored: boolean;
  /** Cached data URL for <img> rendering (light or original colored) */
  dataUrl?: string;
}

export interface ReactionParts {
  reagent: ChemBitmap | null;
  conditions: ChemBitmap | null;
  combined: ChemBitmap;
}

export interface StepModel {
  stepIndex: number;
  reagentNum: number;
  substrate: ChemBitmap;
  reaction: ReactionParts;
  product: ChemBitmap;
  namedReaction: ChemBitmap | null;
  subsequence: SequenceModel | null;
}

export interface SequenceModel {
  name: string;
  path: string;
  doi: string;
  start: ChemBitmap | null;
  citation: ChemBitmap | null;
  steps: StepModel[];
}

export interface HistoryEntry {
  path: string;
  lastStep: number;
  totalSteps: number;
  timestamp: number;
}

export interface InorganicChainMeta {
  id: string;
  element: string;
  title: string;
  groupNum: number;
  groupTitle: string;
  galaxyId: GalaxyId;
  bookPage: number | null;
  xCount: number;
}

export interface InorganicCompoundBox {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
}

export interface InorganicCompound {
  formulaHtml: string;
  formulaPlain: string;
  color: string;
  omega: string;
  sources: string;
  trivial: string;
  boxes: InorganicCompoundBox[];
}

export interface InorganicChainDetail {
  id: string;
  element: string;
  title: string;
  groupNum: number;
  groupTitle: string;
  galaxyId: GalaxyId;
  bookPage: number | null;
  viewbox: string;
  omegaLabel: string;
  notes: string;
  svg: string;
  compounds: Record<string, InorganicCompound>;
}
