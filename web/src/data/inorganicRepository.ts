import type { InorganicChainDetail, InorganicChainMeta } from '../types/models';

class InorganicRepository {
  private indexItems: InorganicChainMeta[] = [];
  private chainCache = new Map<string, InorganicChainDetail>();
  private inflightChains = new Map<string, Promise<InorganicChainDetail>>();

  async loadIndex(): Promise<InorganicChainMeta[]> {
    if (this.indexItems.length > 0) return this.indexItems;
    const resp = await fetch('./data/inorganic/index.json', { cache: 'no-cache' });
    if (!resp.ok) {
      throw new Error(`Не удалось загрузить каталог неорганики (${resp.status})`);
    }
    const data = (await resp.json()) as { version: number; items: InorganicChainMeta[] };
    this.indexItems = data.items || [];
    return this.indexItems;
  }

  async loadChain(id: string): Promise<InorganicChainDetail> {
    const cached = this.chainCache.get(id);
    if (cached) return cached;

    const inflight = this.inflightChains.get(id);
    if (inflight) return inflight;

    const promise = (async () => {
      const resp = await fetch(`./data/inorganic/chains/${encodeURIComponent(id)}.json`, {
        cache: 'no-cache',
      });
      if (!resp.ok) {
        throw new Error(`Не удалось загрузить цепочку ${id} (${resp.status})`);
      }
      const detail = (await resp.json()) as InorganicChainDetail;
      if (this.chainCache.size >= 24) {
        const oldestKey = this.chainCache.keys().next().value;
        if (oldestKey !== undefined) this.chainCache.delete(oldestKey);
      }
      this.chainCache.set(id, detail);
      return detail;
    })();

    this.inflightChains.set(id, promise);
    try {
      return await promise;
    } finally {
      this.inflightChains.delete(id);
    }
  }
}

export const inorganicRepository = new InorganicRepository();
