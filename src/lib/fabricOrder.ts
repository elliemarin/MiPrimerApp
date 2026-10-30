import type { Fabric } from '../store/types';

/** The newest saved sample stays first, including after IndexedDB reorders its keys.
 * Editing an older sample does not displace a newly photographed fabric. */
export function newestFabrics(fabrics: Record<string, Fabric> | readonly Fabric[]): Fabric[] {
  return Object.values(fabrics).sort((a, b) =>
    (b.createdAt || b.updatedAt).localeCompare(a.createdAt || a.updatedAt)
    || b.id.localeCompare(a.id));
}

export function matchesOwnFabric(fabric: Fabric, query: string): boolean {
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const haystack = normalize(`${fabric.name} ${fabric.composition}`);
  return normalize(query).trim().split(/\s+/).every(word => haystack.includes(word));
}
