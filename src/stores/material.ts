import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MaterialPack, Batch, Area, UserRole, ExportData, ExceptionRecord, ExceptionType, ExceptionStatus, BatchStatus, HandoverRecord } from '@/types';
import {
  getAllMaterialPacks,
  addMaterialPack,
  updateMaterialPack,
  deleteMaterialPack,
  getAllBatches,
  addBatch,
  updateBatch,
  deleteBatch,
  getAllAreas,
  addArea,
  updateArea,
  deleteArea,
  bulkUpdateMaterialPacks,
  exportAllData,
  importAllData,
} from '@/composables/useIndexedDB';
import { generateId, formatDateTime, downloadJSON, readJSONFile } from '@/utils/helpers';

export const useMaterialStore = defineStore('material', () => {
  const materialPacks = ref<MaterialPack[]>([]);
  const batches = ref<Batch[]>([]);
  const areas = ref<Area[]>([]);
  const currentRole = ref<UserRole>(null);
  const isLoading = ref(false);
  const initialized = ref(false);

  const batchMap = computed(() => {
    const map = new Map<string, Batch>();
    batches.value.forEach(b => map.set(b.id, b));
    return map;
  });

  const areaMap = computed(() => {
    const map = new Map<string, Area>();
    areas.value.forEach(a => map.set(a.id, a));
    return map;
  });

  const materialPacksByBatch = computed(() => {
    const grouped = new Map<string, MaterialPack[]>();
    materialPacks.value.forEach(pack => {
      if (!grouped.has(pack.batchId)) {
        grouped.set(pack.batchId, []);
      }
      grouped.get(pack.batchId)!.push(pack);
    });
    return grouped;
  });

  function getBatchStats(batchId: string) {
    const packs = materialPacksByBatch.value.get(batchId) || [];
    const total = packs.length;
    const reviewed = packs.filter(p => p.reviewed).length;
    const unresolvedExceptions = packs.filter(p => p.exception && p.exception.status !== 'resolved').length;
    return { total, reviewed, unresolvedExceptions, unreviewed: total - reviewed };
  }

  const batchStatsMap = computed(() => {
    const map = new Map<string, ReturnType<typeof getBatchStats>>();
    batches.value.forEach(b => {
      map.set(b.id, getBatchStats(b.id));
    });
    return map;
  });

  async function init() {
    if (initialized.value) return;
    isLoading.value = true;
    try {
      const [packs, batchList, areaList] = await Promise.all([
        getAllMaterialPacks(),
        getAllBatches(),
        getAllAreas(),
      ]);
      materialPacks.value = packs;
      batches.value = batchList;
      areas.value = areaList;
      
      if (batchList.length === 0 && areaList.length === 0 && packs.length === 0) {
        await seedDemoData();
      }
      
      initialized.value = true;
    } catch (error) {
      console.error('初始化数据失败:', error);
    } finally {
      isLoading.value = false;
    }
  }

  async function seedDemoData() {
    const now = new Date().toISOString();
    
    const demoBatches: Batch[] = [
      { id: 'batch-1', name: '第一批次', deliveryTime: '2024-06-08 09:00', priority: 1, status: 'in_progress', createdAt: now },
      { id: 'batch-2', name: '第二批次', deliveryTime: '2024-06-08 14:00', priority: 2, status: 'in_progress', createdAt: now },
      { id: 'batch-3', name: '第三批次', deliveryTime: '2024-06-09 09:00', priority: 3, status: 'in_progress', createdAt: now },
    ];

    const demoAreas: Area[] = [
      { id: 'area-1', name: 'A区', priority: 1, createdAt: now },
      { id: 'area-2', name: 'B区', priority: 2, createdAt: now },
      { id: 'area-3', name: 'C区', priority: 3, createdAt: now },
      { id: 'area-4', name: 'D区', priority: 4, createdAt: now },
    ];

    const demoPacks: MaterialPack[] = [
      { id: 'pack-1', name: '爱心物资包A', items: ['大米10kg', '食用油5L', '面条2kg'], priority: 1, batchId: 'batch-1', areaId: 'area-1', order: 0, reviewed: false, createdAt: now, updatedAt: now },
      { id: 'pack-2', name: '爱心物资包B', items: ['牛奶2箱', '面包1箱', '饼干2包'], priority: 2, batchId: 'batch-1', areaId: 'area-2', order: 1, reviewed: false, exception: { type: 'shortage', priority: 1, remark: '牛奶库存不足，需补充采购', status: 'pending', createdAt: now, updatedAt: now }, createdAt: now, updatedAt: now },
      { id: 'pack-3', name: '爱心物资包C', items: ['洗衣粉', '香皂', '毛巾'], priority: 3, batchId: 'batch-1', areaId: 'area-1', order: 2, reviewed: false, exception: { type: 'area_pending', priority: 2, remark: '该区域具体配送地址待确认', status: 'processing', handler: '张执行', createdAt: now, updatedAt: now }, createdAt: now, updatedAt: now },
      { id: 'pack-4', name: '爱心物资包A', items: ['大米10kg', '食用油5L', '面条2kg'], priority: 1, batchId: 'batch-2', areaId: 'area-3', order: 3, reviewed: false, createdAt: now, updatedAt: now },
      { id: 'pack-5', name: '爱心物资包B', items: ['牛奶2箱', '面包1箱', '饼干2包'], priority: 2, batchId: 'batch-2', areaId: 'area-4', order: 4, reviewed: false, createdAt: now, updatedAt: now },
      { id: 'pack-6', name: '爱心物资包C', items: ['洗衣粉', '香皂', '毛巾'], priority: 3, batchId: 'batch-3', areaId: 'area-2', order: 5, reviewed: false, createdAt: now, updatedAt: now },
    ];

    await Promise.all([
      ...demoBatches.map(b => addBatch(b)),
      ...demoAreas.map(a => addArea(a)),
      ...demoPacks.map(p => addMaterialPack(p)),
    ]);

    batches.value = demoBatches;
    areas.value = demoAreas;
    materialPacks.value = demoPacks;
  }

  function setRole(role: UserRole) {
    currentRole.value = role;
  }

  // MaterialPack 操作
  async function createMaterialPack(data: Omit<MaterialPack, 'id' | 'order' | 'reviewed' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    const newPack: MaterialPack = {
      ...data,
      id: generateId(),
      order: materialPacks.value.length,
      reviewed: false,
      createdAt: now,
      updatedAt: now,
    };
    await addMaterialPack(newPack);
    materialPacks.value.push(newPack);
    return newPack;
  }

  async function updateMaterialPackData(id: string, data: Partial<MaterialPack>) {
    const index = materialPacks.value.findIndex(p => p.id === id);
    if (index === -1) return;
    
    const updated = {
      ...materialPacks.value[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await updateMaterialPack(updated);
    materialPacks.value[index] = updated;
  }

  async function removeMaterialPack(id: string) {
    await deleteMaterialPack(id);
    materialPacks.value = materialPacks.value.filter(p => p.id !== id);
    await reorderMaterialPacks();
  }

  async function reorderMaterialPacks() {
    const updated = materialPacks.value.map((pack, index) => ({
      ...pack,
      order: index,
      updatedAt: new Date().toISOString(),
    }));
    await bulkUpdateMaterialPacks(updated);
    materialPacks.value = updated;
  }

  async function moveMaterialPack(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    
    const newPacks = [...materialPacks.value];
    const [removed] = newPacks.splice(fromIndex, 1);
    newPacks.splice(toIndex, 0, removed);
    
    const updated = newPacks.map((pack, index) => ({
      ...pack,
      order: index,
      updatedAt: new Date().toISOString(),
    }));
    
    await bulkUpdateMaterialPacks(updated);
    materialPacks.value = updated;
  }

  // Batch 操作
  async function createBatch(data: Omit<Batch, 'id' | 'status' | 'createdAt'>) {
    const newBatch: Batch = {
      ...data,
      id: generateId(),
      status: 'in_progress',
      createdAt: new Date().toISOString(),
    };
    await addBatch(newBatch);
    batches.value.push(newBatch);
    batches.value.sort((a, b) => a.priority - b.priority);
    return newBatch;
  }

  async function updateBatchData(id: string, data: Partial<Batch>) {
    const index = batches.value.findIndex(b => b.id === id);
    if (index === -1) return;
    
    const updated = { ...batches.value[index], ...data };
    await updateBatch(updated);
    batches.value[index] = updated;
    batches.value.sort((a, b) => a.priority - b.priority);
  }

  async function removeBatch(id: string) {
    await deleteBatch(id);
    batches.value = batches.value.filter(b => b.id !== id);
  }

  async function updateBatchStatus(batchId: string, status: BatchStatus, closedBy?: string) {
    const index = batches.value.findIndex(b => b.id === batchId);
    if (index === -1) return;

    const updated: Batch = {
      ...batches.value[index],
      status,
      completedAt: status === 'completed' ? new Date().toISOString() : undefined,
      closedBy: status === 'completed' ? closedBy : undefined,
    };
    await updateBatch(updated);
    batches.value[index] = updated;
    batches.value.sort((a, b) => a.priority - b.priority);
  }

  function canCloseBatch(batchId: string): { canClose: boolean; reasons: string[] } {
    const stats = getBatchStats(batchId);
    const reasons: string[] = [];

    if (stats.unreviewed > 0) {
      reasons.push(`还有 ${stats.unreviewed} 个物资包未复核`);
    }
    if (stats.unresolvedExceptions > 0) {
      reasons.push(`还有 ${stats.unresolvedExceptions} 个未解决的异常`);
    }

    return { canClose: reasons.length === 0, reasons };
  }

  async function closeBatch(batchId: string, closedBy?: string) {
    const { canClose, reasons } = canCloseBatch(batchId);
    if (!canClose) {
      throw new Error(reasons.join('；'));
    }
    await updateBatchStatus(batchId, 'completed', closedBy);
  }

  async function autoUpdateBatchStatus(batchId: string) {
    const batch = batches.value.find(b => b.id === batchId);
    if (!batch || batch.status === 'completed') return;

    const stats = getBatchStats(batchId);
    
    if (stats.total > 0 && stats.reviewed > 0) {
      if (batch.status === 'in_progress') {
        await updateBatchStatus(batchId, 'pending_review');
      }
    } else if (stats.reviewed === 0) {
      if (batch.status === 'pending_review') {
        await updateBatchStatus(batchId, 'in_progress');
      }
    }
  }

  // Area 操作
  async function createArea(data: Omit<Area, 'id' | 'createdAt'>) {
    const newArea: Area = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    await addArea(newArea);
    areas.value.push(newArea);
    areas.value.sort((a, b) => a.priority - b.priority);
    return newArea;
  }

  async function updateAreaData(id: string, data: Partial<Area>) {
    const index = areas.value.findIndex(a => a.id === id);
    if (index === -1) return;
    
    const updated = { ...areas.value[index], ...data };
    await updateArea(updated);
    areas.value[index] = updated;
    areas.value.sort((a, b) => a.priority - b.priority);
  }

  async function removeArea(id: string) {
    await deleteArea(id);
    areas.value = areas.value.filter(a => a.id !== id);
  }

  // 复核操作
  async function toggleReview(id: string, reviewer?: string) {
    const pack = materialPacks.value.find(p => p.id === id);
    if (!pack) return;
    
    const reviewed = !pack.reviewed;
    await updateMaterialPackData(id, {
      reviewed,
      reviewer: reviewed ? reviewer : undefined,
      reviewTime: reviewed ? new Date().toISOString() : undefined,
    });

    await autoUpdateBatchStatus(pack.batchId);
  }

  // 异常处理操作
  async function setException(packId: string, data: {
    type: ExceptionType;
    priority: number;
    remark: string;
  }) {
    const now = new Date().toISOString();
    const existingPack = materialPacks.value.find(p => p.id === packId);
    const existingException = existingPack?.exception;
    
    const exception: ExceptionRecord = {
      type: data.type,
      priority: data.priority,
      remark: data.remark,
      status: existingException?.status || 'pending',
      handler: existingException?.handler,
      result: existingException?.result,
      createdAt: existingException?.createdAt || now,
      updatedAt: now,
    };
    await updateMaterialPackData(packId, { exception });
    
    if (existingPack) {
      await autoUpdateBatchStatus(existingPack.batchId);
    }
  }

  async function updateExceptionStatus(packId: string, status: ExceptionStatus, handler?: string) {
    const pack = materialPacks.value.find(p => p.id === packId);
    if (!pack?.exception) return;

    const exception: ExceptionRecord = {
      ...pack.exception,
      status,
      handler: handler || pack.exception.handler,
      updatedAt: new Date().toISOString(),
    };
    await updateMaterialPackData(packId, { exception });
    await autoUpdateBatchStatus(pack.batchId);
  }

  async function updateExceptionResult(packId: string, result: string) {
    const pack = materialPacks.value.find(p => p.id === packId);
    if (!pack?.exception) return;

    const exception: ExceptionRecord = {
      ...pack.exception,
      result,
      status: 'resolved',
      updatedAt: new Date().toISOString(),
    };
    await updateMaterialPackData(packId, { exception });
    await autoUpdateBatchStatus(pack.batchId);
  }

  async function clearException(packId: string) {
    const pack = materialPacks.value.find(p => p.id === packId);
    await updateMaterialPackData(packId, { exception: null });
    if (pack) {
      await autoUpdateBatchStatus(pack.batchId);
    }
  }

  function canEditHandover(batchId: string): boolean {
    const batch = batches.value.find(b => b.id === batchId);
    if (!batch) return false;
    return batch.status === 'pending_review' || batch.status === 'completed';
  }

  function isHandoverAbnormal(batchId: string): boolean {
    const batch = batches.value.find(b => b.id === batchId);
    if (!batch) return false;
    if (batch.status !== 'completed') return false;
    return !batch.handover;
  }

  async function setHandover(batchId: string, data: Omit<HandoverRecord, 'createdAt' | 'updatedAt'>) {
    const index = batches.value.findIndex(b => b.id === batchId);
    if (index === -1) return;

    const batch = batches.value[index];
    const now = new Date().toISOString();
    
    const handover: HandoverRecord = {
      ...data,
      createdAt: batch.handover?.createdAt || now,
      updatedAt: now,
    };

    await updateBatchData(batchId, { handover });
  }

  async function clearHandover(batchId: string) {
    await updateBatchData(batchId, { handover: null });
  }

  const exceptionPacks = computed(() => {
    return materialPacks.value.filter(p => p.exception && p.exception.status !== 'resolved');
  });

  const resolvedExceptionPacks = computed(() => {
    return materialPacks.value.filter(p => p.exception && p.exception.status === 'resolved');
  });

  // 导出
  async function exportDraft() {
    const data = await exportAllData();
    const exportData: ExportData = {
      exportedAt: formatDateTime(new Date()),
      ...data,
    };
    const filename = `公益物资草稿_${formatDateTime(new Date()).replace(/[:\s]/g, '-')}.json`;
    downloadJSON(exportData, filename);
  }

  // 导入
  async function importDraft(file: File) {
    const data = await readJSONFile(file);
    if (!data.materialPacks || !data.batches || !data.areas) {
      throw new Error('无效的导入文件格式');
    }
    await importAllData(data);
    materialPacks.value = data.materialPacks.sort((a: MaterialPack, b: MaterialPack) => a.order - b.order);
    batches.value = data.batches.sort((a: Batch, b: Batch) => a.priority - b.priority);
    areas.value = data.areas.sort((a: Area, b: Area) => a.priority - b.priority);
  }

  // 排序辅助
  function sortByPriority() {
    materialPacks.value.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.order - b.order;
    });
    reorderMaterialPacks();
  }

  function sortByBatch() {
    materialPacks.value.sort((a, b) => {
      const batchA = batchMap.value.get(a.batchId)?.priority || 999;
      const batchB = batchMap.value.get(b.batchId)?.priority || 999;
      if (batchA !== batchB) return batchA - batchB;
      return a.order - b.order;
    });
    reorderMaterialPacks();
  }

  function sortByArea() {
    materialPacks.value.sort((a, b) => {
      const areaA = areaMap.value.get(a.areaId)?.priority || 999;
      const areaB = areaMap.value.get(b.areaId)?.priority || 999;
      if (areaA !== areaB) return areaA - areaB;
      return a.order - b.order;
    });
    reorderMaterialPacks();
  }

  return {
    materialPacks,
    batches,
    areas,
    currentRole,
    isLoading,
    initialized,
    batchMap,
    areaMap,
    materialPacksByBatch,
    batchStatsMap,
    exceptionPacks,
    resolvedExceptionPacks,
    init,
    setRole,
    createMaterialPack,
    updateMaterialPackData,
    removeMaterialPack,
    moveMaterialPack,
    reorderMaterialPacks,
    createBatch,
    updateBatchData,
    removeBatch,
    updateBatchStatus,
    canCloseBatch,
    closeBatch,
    getBatchStats,
    createArea,
    updateAreaData,
    removeArea,
    toggleReview,
    setException,
    updateExceptionStatus,
    updateExceptionResult,
    clearException,
    canEditHandover,
    isHandoverAbnormal,
    setHandover,
    clearHandover,
    exportDraft,
    importDraft,
    sortByPriority,
    sortByBatch,
    sortByArea,
  };
});
