import type { CatalogItem, CatalogManifest, ChemBitmap, SequenceModel } from '../types/models';
import { unpackSequence, unpackTargetPreview } from './cbydDecoder';

class LruCache<K, V> {
  private map = new Map<K, V>();
  constructor(private readonly maxSize: number) {}

  get(key: K): V | undefined {
    const val = this.map.get(key);
    if (val === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  set(key: K, val: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, val);
    if (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }
}

class CbydRepository {
  private manifest: CatalogManifest | null = null;
  private items: CatalogItem[] = [];
  private itemsByPath = new Map<string, CatalogItem>();

  private blobCache = new LruCache<string, Uint8Array>(48);
  private sequenceCache = new LruCache<string, SequenceModel>(8);
  private previewCache = new LruCache<string, ChemBitmap>(220);

  private inflightBlobs = new Map<string, Promise<Uint8Array | null>>();
  private inflightPreviews = new Map<string, Promise<ChemBitmap | null>>();

  // Limit concurrent Range requests for previews so mobile Safari / Telegram stays snappy
  private activePreviewCount = 0;
  private previewQueue: Array<() => void> = [];
  private readonly maxPreviewConcurrency = 4;

  async loadCatalog(): Promise<CatalogItem[]> {
    if (this.items.length > 0) return this.items;

    const resp = await fetch('./data/catalog.json', { cache: 'no-cache' });
    if (!resp.ok) {
      throw new Error(`Не удалось загрузить каталог (${resp.status})`);
    }
    const manifest: CatalogManifest = await resp.json();
    this.manifest = manifest;

    this.items = manifest.items.map((raw) => {
      const displayTitle = raw.n.trim() ? raw.n : raw.f;
      const yearInt = parseInt(raw.y, 10) || 0;
      return {
        path: raw.p,
        full: raw.f,
        name: raw.n,
        author: raw.a,
        year: raw.y,
        drug: raw.d,
        chunkIndex: raw.c,
        offset: raw.o,
        length: raw.l,
        isDrug: raw.d.trim().length > 0,
        yearInt,
        displayTitle,
        searchBlob: `${raw.f} ${raw.n} ${raw.a} ${raw.y} ${raw.d}`.toLowerCase(),
      };
    });

    this.itemsByPath.clear();
    for (const item of this.items) {
      this.itemsByPath.set(item.path, item);
    }

    return this.items;
  }

  getItem(path: string): CatalogItem | undefined {
    return this.itemsByPath.get(path);
  }

  getCachedPreview(path: string): ChemBitmap | undefined {
    return this.previewCache.get(path);
  }

  private async fetchBlob(item: CatalogItem): Promise<Uint8Array | null> {
    const cached = this.blobCache.get(item.path);
    if (cached) return cached;

    if (item.chunkIndex < 0 || item.length <= 0 || !this.manifest) {
      return null;
    }

    const inflight = this.inflightBlobs.get(item.path);
    if (inflight) return inflight;

    const chunkName = this.manifest.chunks[item.chunkIndex];
    if (!chunkName) return null;

    const start = item.offset;
    const end = item.offset + item.length - 1;

    const promise = (async () => {
      const resp = await fetch(`./data/${chunkName}`, {
        headers: { Range: `bytes=${start}-${end}` },
      });

      if (resp.status === 206) {
        const buf = await resp.arrayBuffer();
        const bytes = new Uint8Array(buf);
        this.blobCache.set(item.path, bytes);
        return bytes;
      }

      if (resp.status === 200) {
        // Fallback if a dev proxy ignores Range and returns the whole chunk
        const fullBuf = await resp.arrayBuffer();
        const slice = new Uint8Array(fullBuf, start, item.length);
        const copy = new Uint8Array(slice.byteLength);
        copy.set(slice);
        this.blobCache.set(item.path, copy);
        return copy;
      }

      throw new Error(`HTTP ${resp.status} при загрузке данных синтеза`);
    })();

    this.inflightBlobs.set(item.path, promise);
    try {
      return await promise;
    } finally {
      this.inflightBlobs.delete(item.path);
    }
  }

  async loadSequence(path: string): Promise<SequenceModel | null> {
    const cached = this.sequenceCache.get(path);
    if (cached) return cached;

    const item = this.itemsByPath.get(path);
    if (!item) return null;

    const blob = await this.fetchBlob(item);
    if (!blob) return null;

    const seq = await unpackSequence(blob);
    this.sequenceCache.set(path, seq);
    return seq;
  }

  private acquirePreviewSlot(): Promise<void> {
    if (this.activePreviewCount < this.maxPreviewConcurrency) {
      this.activePreviewCount++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.previewQueue.push(() => {
        this.activePreviewCount++;
        resolve();
      });
    });
  }

  private releasePreviewSlot(): void {
    this.activePreviewCount = Math.max(0, this.activePreviewCount - 1);
    const next = this.previewQueue.shift();
    if (next) next();
  }

  async loadTargetPreview(path: string): Promise<ChemBitmap | null> {
    const cached = this.previewCache.get(path);
    if (cached) return cached;

    const inflight = this.inflightPreviews.get(path);
    if (inflight) return inflight;

    const item = this.itemsByPath.get(path);
    if (!item || item.chunkIndex < 0) return null;

    const promise = (async () => {
      await this.acquirePreviewSlot();
      try {
        const again = this.previewCache.get(path);
        if (again) return again;

        const blob = await this.fetchBlob(item);
        if (!blob) return null;

        const preview = await unpackTargetPreview(blob, 220);
        if (preview) {
          this.previewCache.set(path, preview);
        }
        return preview;
      } catch {
        return null;
      } finally {
        this.releasePreviewSlot();
      }
    })();

    this.inflightPreviews.set(path, promise);
    try {
      return await promise;
    } finally {
      this.inflightPreviews.delete(path);
    }
  }
}

export const repository = new CbydRepository();
