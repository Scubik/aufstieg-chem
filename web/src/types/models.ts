export type AppThemeMode = 'system' | 'light' | 'dark';
export type ViewMode = 'feed' | 'canvas';
export type CatalogFilter = 'all' | 'drugs' | 'natural';
export type SortOption = 'name_asc' | 'year_desc' | 'year_asc' | 'author_asc';

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
