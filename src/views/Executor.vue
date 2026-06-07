<script setup lang="ts">
import { ref, computed } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { useMaterialStore } from '@/stores/material';
import { getPriorityLabel, getPriorityColor } from '@/utils/helpers';
import type { MaterialPack } from '@/types';

const store = useMaterialStore();

const filterBatch = ref<string>('all');
const filterArea = ref<string>('all');
const draggedIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

const filteredPacks = computed(() => {
  let packs = [...store.materialPacks];
  
  if (filterBatch.value !== 'all') {
    packs = packs.filter(p => p.batchId === filterBatch.value);
  }
  if (filterArea.value !== 'all') {
    packs = packs.filter(p => p.areaId === filterArea.value);
  }
  
  return packs;
});

function getBatchName(id: string) {
  return store.batchMap.get(id)?.name || '未分配';
}

function getAreaName(id: string) {
  return store.areaMap.get(id)?.name || '未分配';
}

function onDragStart(e: DragEvent, index: number) {
  draggedIndex.value = index;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }
}

function onDragOver(e: DragEvent, index: number) {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  dragOverIndex.value = index;
}

function onDragLeave() {
  dragOverIndex.value = null;
}

async function onDrop(e: DragEvent, targetIndex: number) {
  e.preventDefault();
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
    draggedIndex.value = null;
    dragOverIndex.value = null;
    return;
  }
  
  const actualFromIndex = store.materialPacks.findIndex(
    (p: MaterialPack) => p.id === filteredPacks.value[draggedIndex.value!].id
  );
  const actualToIndex = store.materialPacks.findIndex(
    (p: MaterialPack) => p.id === filteredPacks.value[targetIndex].id
  );
  
  await store.moveMaterialPack(actualFromIndex, actualToIndex);
  draggedIndex.value = null;
  dragOverIndex.value = null;
}

function onDragEnd() {
  draggedIndex.value = null;
  dragOverIndex.value = null;
}

function isDragging(pack: MaterialPack): boolean {
  if (draggedIndex.value === null) return false;
  return filteredPacks.value[draggedIndex.value]?.id === pack.id;
}

function isDragOver(pack: MaterialPack): boolean {
  if (dragOverIndex.value === null) return false;
  return filteredPacks.value[dragOverIndex.value]?.id === pack.id;
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <PageHeader title="执行人员" subtitle="拖拽调整物资包装袋顺序" role="executor">
      <template #actions>
        <button @click="store.exportDraft()" class="btn btn-outline">
          <span class="mr-2">📤</span>导出草稿
        </button>
      </template>
    </PageHeader>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <!-- 筛选和排序工具栏 -->
      <div class="bg-white rounded-xl shadow-sm p-4 mb-8 no-print">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">批次筛选:</span>
            <select v-model="filterBatch" class="select w-40">
              <option value="all">全部批次</option>
              <option v-for="b in store.batches" :key="b.id" :value="b.id">
                {{ b.name }}
              </option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">区域筛选:</span>
            <select v-model="filterArea" class="select w-40">
              <option value="all">全部区域</option>
              <option v-for="a in store.areas" :key="a.id" :value="a.id">
                {{ a.name }}
              </option>
            </select>
          </div>
          <div class="flex-1" />
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">快速排序:</span>
            <button @click="store.sortByPriority()" class="btn btn-outline text-sm px-3 py-1.5">
              按优先级
            </button>
            <button @click="store.sortByBatch()" class="btn btn-outline text-sm px-3 py-1.5">
              按批次
            </button>
            <button @click="store.sortByArea()" class="btn btn-outline text-sm px-3 py-1.5">
              按区域
            </button>
          </div>
        </div>
      </div>

      <!-- 提示信息 -->
      <div class="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-8 no-print">
        <div class="flex items-start gap-3">
          <span class="text-2xl">💡</span>
          <div>
            <p class="text-primary-800 font-medium">拖拽排序提示</p>
            <p class="text-primary-600 text-sm mt-1">
              按住物资卡片拖动可以调整装袋顺序，也可以使用上方的快速排序按钮。当前顺序将作为装袋和配送的依据。
            </p>
          </div>
        </div>
      </div>

      <!-- 物资卡片列表 -->
      <div v-if="filteredPacks.length === 0" class="bg-white rounded-xl p-16 text-center">
        <div class="text-6xl mb-4">📦</div>
        <p class="text-gray-500 text-lg">暂无符合条件的物资包</p>
        <p class="text-gray-400 text-sm mt-2">请联系协调员添加物资包或调整筛选条件</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="(pack, index) in filteredPacks"
          :key="pack.id"
          draggable="true"
          @dragstart="onDragStart($event, index)"
          @dragover="onDragOver($event, index)"
          @dragleave="onDragLeave"
          @drop="onDrop($event, index)"
          @dragend="onDragEnd"
          :class="[
            'bg-white rounded-xl shadow-sm p-5 cursor-grab active:cursor-grabbing transition-all duration-200 relative group',
            isDragging(pack) ? 'opacity-50 scale-105 shadow-lg z-10' : '',
            isDragOver(pack) ? 'ring-2 ring-primary-500 ring-offset-2' : '',
            'hover:shadow-md',
          ]"
        >
          <!-- 序号 -->
          <div class="absolute -top-2 -left-2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
            {{ store.materialPacks.findIndex((p: MaterialPack) => p.id === pack.id) + 1 }}
          </div>

          <!-- 拖拽手柄 -->
          <div class="absolute top-3 right-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          </div>

          <!-- 内容 -->
          <div class="pt-4">
            <h3 class="font-bold text-gray-800 text-lg mb-3">{{ pack.name }}</h3>
            
            <!-- 标签 -->
            <div class="flex flex-wrap gap-2 mb-4">
              <span class="tag tag-info">{{ getBatchName(pack.batchId) }}</span>
              <span class="tag tag-accent">{{ getAreaName(pack.areaId) }}</span>
              <span :class="['tag', getPriorityColor(pack.priority)]">
                {{ getPriorityLabel(pack.priority) }}
              </span>
            </div>

            <!-- 物品清单 -->
            <div class="border-t border-gray-100 pt-3">
              <p class="text-xs text-gray-500 mb-2">包含物品:</p>
              <ul class="text-sm text-gray-600 space-y-1">
                <li v-for="(item, idx) in pack.items.slice(0, 4)" :key="idx" class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 bg-primary-500 rounded-full" />
                  {{ item }}
                </li>
                <li v-if="pack.items.length > 4" class="text-gray-400">
                  还有 {{ pack.items.length - 4 }} 项物品...
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部统计 -->
      <div class="mt-8 bg-white rounded-xl shadow-sm p-4 no-print">
        <div class="flex items-center justify-between text-sm text-gray-500">
          <span>共 {{ filteredPacks.length }} 个物资包</span>
          <span>
            已筛选: 
            <span v-if="filterBatch !== 'all'" class="text-primary-600 font-medium">{{ getBatchName(filterBatch) }}</span>
            <span v-else>全部批次</span>
             / 
            <span v-if="filterArea !== 'all'" class="text-primary-600 font-medium">{{ getAreaName(filterArea) }}</span>
            <span v-else>全部区域</span>
          </span>
        </div>
      </div>
    </main>
  </div>
</template>
