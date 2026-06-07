export interface MaterialPack {
  id: string;
  name: string;
  items: string[];
  priority: number;
  batchId: string;
  areaId: string;
  order: number;
  reviewed: boolean;
  reviewer?: string;
  reviewTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  name: string;
  deliveryTime: string;
  priority: number;
  createdAt: string;
}

export interface Area {
  id: string;
  name: string;
  priority: number;
  createdAt: string;
}

export type UserRole = 'coordinator' | 'executor' | 'reviewer' | null;

export interface DragItem {
  id: string;
  type: 'material-pack';
}

export interface ExportData {
  exportedAt: string;
  materialPacks: MaterialPack[];
  batches: Batch[];
  areas: Area[];
}
