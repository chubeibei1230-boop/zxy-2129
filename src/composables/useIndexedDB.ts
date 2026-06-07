import { openDB, IDBPDatabase } from 'idb';
import type { MaterialPack, Batch, Area } from '@/types';

const DB_NAME = 'charity-material-db';
const DB_VERSION = 2;

export interface DBSchema {
  materialPacks: {
    key: string;
    value: MaterialPack;
    indexes: { 'by-batch': string; 'by-area': string; 'by-order': number };
  };
  batches: {
    key: string;
    value: Batch;
  };
  areas: {
    key: string;
    value: Area;
  };
  settings: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<DBSchema>> | null = null;

export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<DBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db: IDBPDatabase<DBSchema>) {
        if (!db.objectStoreNames.contains('materialPacks')) {
          const packStore = db.createObjectStore('materialPacks', { keyPath: 'id' });
          packStore.createIndex('by-batch', 'batchId');
          packStore.createIndex('by-area', 'areaId');
          packStore.createIndex('by-order', 'order');
        }

        if (!db.objectStoreNames.contains('batches')) {
          db.createObjectStore('batches', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('areas')) {
          db.createObjectStore('areas', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllMaterialPacks(): Promise<MaterialPack[]> {
  const db = await initDB();
  const packs = await db.getAll('materialPacks');
  return packs.sort((a: MaterialPack, b: MaterialPack) => a.order - b.order);
}

export async function addMaterialPack(pack: MaterialPack): Promise<void> {
  const db = await initDB();
  await db.add('materialPacks', pack);
}

export async function updateMaterialPack(pack: MaterialPack): Promise<void> {
  const db = await initDB();
  await db.put('materialPacks', pack);
}

export async function deleteMaterialPack(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('materialPacks', id);
}

export async function clearMaterialPacks(): Promise<void> {
  const db = await initDB();
  await db.clear('materialPacks');
}

export async function getAllBatches(): Promise<Batch[]> {
  const db = await initDB();
  const batches = await db.getAll('batches');
  return batches.sort((a: Batch, b: Batch) => a.priority - b.priority);
}

export async function addBatch(batch: Batch): Promise<void> {
  const db = await initDB();
  await db.add('batches', batch);
}

export async function updateBatch(batch: Batch): Promise<void> {
  const db = await initDB();
  await db.put('batches', batch);
}

export async function deleteBatch(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('batches', id);
}

export async function getAllAreas(): Promise<Area[]> {
  const db = await initDB();
  const areas = await db.getAll('areas');
  return areas.sort((a: Area, b: Area) => a.priority - b.priority);
}

export async function addArea(area: Area): Promise<void> {
  const db = await initDB();
  await db.add('areas', area);
}

export async function updateArea(area: Area): Promise<void> {
  const db = await initDB();
  await db.put('areas', area);
}

export async function deleteArea(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('areas', id);
}

export async function bulkUpdateMaterialPacks(packs: MaterialPack[]): Promise<void> {
  const db = await initDB();
  const tx = db.transaction('materialPacks', 'readwrite');
  await Promise.all([
    ...packs.map(pack => tx.store.put(pack)),
    tx.done,
  ]);
}

export async function exportAllData() {
  const db = await initDB();
  const [materialPacks, batches, areas] = await Promise.all([
    db.getAll('materialPacks'),
    db.getAll('batches'),
    db.getAll('areas'),
  ]);
  return { materialPacks, batches, areas };
}

export async function importAllData(data: {
  materialPacks: MaterialPack[];
  batches: Batch[];
  areas: Area[];
}): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(
    ['materialPacks', 'batches', 'areas'],
    'readwrite'
  );

  await tx.objectStore('materialPacks').clear();
  await tx.objectStore('batches').clear();
  await tx.objectStore('areas').clear();

  await Promise.all([
    ...data.materialPacks.map(p => tx.objectStore('materialPacks').put(p)),
    ...data.batches.map(b => tx.objectStore('batches').put(b)),
    ...data.areas.map(a => tx.objectStore('areas').put(a)),
    tx.done,
  ]);
}
