<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { useMaterialStore } from '@/stores/material';
import { getPriorityLabel, getPriorityColor, getExceptionTypeLabel, getExceptionTypeColor, getExceptionStatusLabel, getExceptionStatusColor, getExceptionPriorityLabel, formatDateTime, getBatchStatusLabel, getBatchStatusColor, getBatchStatusIcon } from '@/utils/helpers';
import type { MaterialPack } from '@/types';
import Modal from '@/components/Modal.vue';

const store = useMaterialStore();

const filterBatch = ref<string>('all');
const filterArea = ref<string>('all');
const draggedIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

const touchDragIndex = ref<number | null>(null);
const touchOverIndex = ref<number | null>(null);
const touchStartPos = ref({ x: 0, y: 0 });
const touchCurrentPos = ref({ x: 0, y: 0 });
const isTouchDragging = ref(false);
const touchGhostEl = ref<HTMLElement | null>(null);
const cardRefs = ref<HTMLElement[]>([]);

const showExceptionModal = ref(false);
const selectedExceptionPackId = ref<string | null>(null);
const handlerName = ref('');
const resultText = ref('');
const showHandlerInput = ref(false);

const selectedExceptionPack = computed(() => {
  if (!selectedExceptionPackId.value) return null;
  return store.materialPacks.find((p: MaterialPack) => p.id === selectedExceptionPackId.value) || null;
});

const filteredPacks = computed(() => {
  let packs = [...store.materialPacks];
  
  if (filterBatch.value !== 'all') {
    packs = packs.filter((p: MaterialPack) => p.batchId === filterBatch.value);
  }
  if (filterArea.value !== 'all') {
    packs = packs.filter((p: MaterialPack) => p.areaId === filterArea.value);
  }
  
  return packs;
});

const selectedBatchInfo = computed(() => {
  if (filterBatch.value === 'all') return null;
  const batch = store.batches.find(b => b.id === filterBatch.value);
  if (!batch) return null;
  const stats = store.getBatchStats(filterBatch.value);
  return { ...batch, stats };
});

function isBatchCompleted(batchId: string): boolean {
  const batch = store.batches.find(b => b.id === batchId);
  return batch?.status === 'completed';
}

function isCurrentBatchCompleted(): boolean {
  if (filterBatch.value === 'all') return false;
  return isBatchCompleted(filterBatch.value);
}

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

function onTouchStart(e: TouchEvent, index: number) {
  const touch = e.touches[0];
  touchDragIndex.value = index;
  touchStartPos.value = { x: touch.clientX, y: touch.clientY };
  touchCurrentPos.value = { x: touch.clientX, y: touch.clientY };
  
  setTimeout(() => {
    if (touchDragIndex.value === index) {
      isTouchDragging.value = true;
      createTouchGhost(index);
    }
  }, 200);
}

function createTouchGhost(index: number) {
  const cardEl = cardRefs.value[index];
  if (!cardEl) return;
  
  const rect = cardEl.getBoundingClientRect();
  const ghost = cardEl.cloneNode(true) as HTMLElement;
  ghost.style.position = 'fixed';
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.zIndex = '9999';
  ghost.style.opacity = '0.8';
  ghost.style.pointerEvents = 'none';
  ghost.style.transform = 'scale(1.05)';
  ghost.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
  ghost.style.transition = 'none';
  
  document.body.appendChild(ghost);
  touchGhostEl.value = ghost;
}

function onTouchMove(e: TouchEvent) {
  if (touchDragIndex.value === null) return;
  
  const touch = e.touches[0];
  const dx = touch.clientX - touchStartPos.value.x;
  const dy = touch.clientY - touchStartPos.value.y;
  
  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
    if (!isTouchDragging.value) {
      isTouchDragging.value = true;
      createTouchGhost(touchDragIndex.value);
    }
  }
  
  if (isTouchDragging.value && touchGhostEl.value) {
    e.preventDefault();
    touchCurrentPos.value = { x: touch.clientX, y: touch.clientY };
    
    const ghost = touchGhostEl.value;
    const startLeft = parseFloat(ghost.style.left) || 0;
    const startTop = parseFloat(ghost.style.top) || 0;
    
    ghost.style.left = `${startLeft + dx}px`;
    ghost.style.top = `${startTop + dy}px`;
    
    let overIndex = -1;
    cardRefs.value.forEach((el, idx) => {
      if (idx === touchDragIndex.value) return;
      const rect = el.getBoundingClientRect();
      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        overIndex = idx;
      }
    });
    
    touchOverIndex.value = overIndex >= 0 ? overIndex : null;
  }
}

async function onTouchEnd() {
  if (touchGhostEl.value) {
    document.body.removeChild(touchGhostEl.value);
    touchGhostEl.value = null;
  }
  
  if (isTouchDragging.value && touchDragIndex.value !== null && touchOverIndex.value !== null) {
    if (touchDragIndex.value !== touchOverIndex.value) {
      const actualFromIndex = store.materialPacks.findIndex(
        (p: MaterialPack) => p.id === filteredPacks.value[touchDragIndex.value!].id
      );
      const actualToIndex = store.materialPacks.findIndex(
        (p: MaterialPack) => p.id === filteredPacks.value[touchOverIndex.value!].id
      );
      
      await store.moveMaterialPack(actualFromIndex, actualToIndex);
    }
  }
  
  touchDragIndex.value = null;
  touchOverIndex.value = null;
  isTouchDragging.value = false;
}

function setCardRef(el: any, index: number) {
  if (el) {
    cardRefs.value[index] = el;
  }
}

onUnmounted(() => {
  if (touchGhostEl.value) {
    document.body.removeChild(touchGhostEl.value);
  }
});

function isDragging(pack: MaterialPack): boolean {
  if (draggedIndex.value !== null) {
    return filteredPacks.value[draggedIndex.value]?.id === pack.id;
  }
  if (touchDragIndex.value !== null && isTouchDragging.value) {
    return filteredPacks.value[touchDragIndex.value]?.id === pack.id;
  }
  return false;
}

function isDragOver(pack: MaterialPack): boolean {
  if (dragOverIndex.value !== null) {
    return filteredPacks.value[dragOverIndex.value]?.id === pack.id;
  }
  if (touchOverIndex.value !== null) {
    return filteredPacks.value[touchOverIndex.value]?.id === pack.id;
  }
  return false;
}

function openExceptionModal(pack: MaterialPack) {
  selectedExceptionPackId.value = pack.id;
  resultText.value = pack.exception?.result || '';
  handlerName.value = pack.exception?.handler || '';
  showHandlerInput.value = false;
  showExceptionModal.value = true;
}

async function handleStartProcessing() {
  if (!selectedExceptionPack.value) return;
  if (!handlerName.value.trim()) {
    showHandlerInput.value = true;
    return;
  }
  await store.updateExceptionStatus(
    selectedExceptionPack.value.id,
    'processing',
    handlerName.value.trim()
  );
  showHandlerInput.value = false;
}

function confirmStartProcessing() {
  if (handlerName.value.trim() && selectedExceptionPack.value) {
    store.updateExceptionStatus(
      selectedExceptionPack.value.id,
      'processing',
      handlerName.value.trim()
    );
    showHandlerInput.value = false;
  }
}

async function handleResolveException() {
  if (!selectedExceptionPack.value || !resultText.value.trim()) return;
  await store.updateExceptionResult(
    selectedExceptionPack.value.id,
    resultText.value.trim()
  );
  showExceptionModal.value = false;
}

async function handleDeferException() {
  if (!selectedExceptionPack.value) return;
  if (!handlerName.value.trim()) {
    showHandlerInput.value = true;
    return;
  }
  await store.updateExceptionStatus(
    selectedExceptionPack.value.id,
    'pending',
    handlerName.value.trim()
  );
  showExceptionModal.value = false;
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
            <button 
              @click="store.sortByPriority()" 
              :disabled="isCurrentBatchCompleted()"
              :class="['btn text-sm px-3 py-1.5', isCurrentBatchCompleted() ? 'btn-outline opacity-50 cursor-not-allowed' : 'btn-outline']"
            >
              按优先级
            </button>
            <button 
              @click="store.sortByBatch()" 
              :disabled="isCurrentBatchCompleted()"
              :class="['btn text-sm px-3 py-1.5', isCurrentBatchCompleted() ? 'btn-outline opacity-50 cursor-not-allowed' : 'btn-outline']"
            >
              按批次
            </button>
            <button 
              @click="store.sortByArea()" 
              :disabled="isCurrentBatchCompleted()"
              :class="['btn text-sm px-3 py-1.5', isCurrentBatchCompleted() ? 'btn-outline opacity-50 cursor-not-allowed' : 'btn-outline']"
            >
              按区域
            </button>
          </div>
        </div>
      </div>

      <div v-if="selectedBatchInfo" :class="['rounded-xl p-4 mb-8 no-print', selectedBatchInfo.status === 'completed' ? 'bg-green-50 border border-green-200' : 'bg-primary-50 border border-primary-200']">
        <div class="flex items-start gap-3">
          <span class="text-2xl">{{ selectedBatchInfo.status === 'completed' ? '✅' : '💡' }}</span>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <p :class="['font-medium', selectedBatchInfo.status === 'completed' ? 'text-green-800' : 'text-primary-800']">
                {{ selectedBatchInfo.name }} - 批次进度
              </p>
              <span :class="['tag', getBatchStatusColor(selectedBatchInfo.status)]">
                {{ getBatchStatusIcon(selectedBatchInfo.status) }} {{ getBatchStatusLabel(selectedBatchInfo.status) }}
              </span>
            </div>
            <div class="flex items-center gap-4 text-sm mb-2">
              <span>
                <span class="font-medium">{{ selectedBatchInfo.stats.reviewed }}</span>
                <span class="text-gray-500">/{{ selectedBatchInfo.stats.total }} 已复核</span>
              </span>
              <span v-if="selectedBatchInfo.stats.unresolvedExceptions > 0" class="text-red-500">
                ⚠️ {{ selectedBatchInfo.stats.unresolvedExceptions }} 个未解决异常
              </span>
              <span v-else class="text-green-600">
                ✅ 无待处理异常
              </span>
              <span v-if="selectedBatchInfo.status === 'completed' && selectedBatchInfo.completedAt" class="text-green-600">
                完成时间: {{ formatDateTime(selectedBatchInfo.completedAt) }}
              </span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                :class="['h-2.5 rounded-full transition-all', selectedBatchInfo.status === 'completed' ? 'bg-green-500' : 'bg-primary-600']"
                :style="{ width: `${selectedBatchInfo.stats.total > 0 ? selectedBatchInfo.stats.reviewed / selectedBatchInfo.stats.total * 100 : 0}%` }"
              ></div>
            </div>
            <p v-if="selectedBatchInfo.status === 'completed'" class="text-green-600 text-sm mt-2">
              该批次已正式交接完成，内容只读，不可调整顺序或修改异常。
            </p>
          </div>
        </div>
      </div>

      <div v-if="!selectedBatchInfo" class="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-8 no-print">
        <div class="flex items-start gap-3">
          <span class="text-2xl">💡</span>
          <div>
            <p class="text-primary-800 font-medium">拖拽排序提示</p>
            <p class="text-primary-600 text-sm mt-1">
              按住物资卡片拖动可以调整装袋顺序，也可以使用上方的快速排序按钮。手机端请长按卡片后拖动。
            </p>
          </div>
        </div>
      </div>

      <div v-if="filteredPacks.length === 0" class="bg-white rounded-xl p-16 text-center">
        <div class="text-6xl mb-4">📦</div>
        <p class="text-gray-500 text-lg">暂无符合条件的物资包</p>
        <p class="text-gray-400 text-sm mt-2">请联系协调员添加物资包或调整筛选条件</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="(pack, index) in filteredPacks"
          :key="pack.id"
          :ref="(el) => setCardRef(el, index)"
          :draggable="!isBatchCompleted(pack.batchId)"
          @dragstart="!isBatchCompleted(pack.batchId) && onDragStart($event, index)"
          @dragover="!isBatchCompleted(pack.batchId) && onDragOver($event, index)"
          @dragleave="onDragLeave"
          @drop="!isBatchCompleted(pack.batchId) && onDrop($event, index)"
          @dragend="onDragEnd"
          @touchstart="!isBatchCompleted(pack.batchId) && onTouchStart($event, index)"
          @touchmove="!isBatchCompleted(pack.batchId) && onTouchMove($event)"
          @touchend="onTouchEnd"
          :class="[
            'rounded-xl shadow-sm p-5 transition-all duration-200 relative group select-none',
            isBatchCompleted(pack.batchId) ? 'cursor-default bg-gray-50 border-2 border-gray-200' : 'cursor-grab active:cursor-grabbing touch-none',
            pack.exception && !isBatchCompleted(pack.batchId) ? 'bg-amber-50 border-2 border-amber-300' : '',
            isDragging(pack) ? 'opacity-50 scale-105 shadow-lg z-10' : '',
            isDragOver(pack) ? 'ring-2 ring-primary-500 ring-offset-2' : '',
            !isBatchCompleted(pack.batchId) ? 'hover:shadow-md' : '',
          ]"
        >
          <div class="absolute -top-2 -left-2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
            {{ store.materialPacks.findIndex((p: MaterialPack) => p.id === pack.id) + 1 }}
          </div>

          <div v-if="pack.exception" class="absolute -top-2 -right-2">
            <span :class="['tag', getExceptionStatusColor(pack.exception.status), 'shadow-md']">
              ⚠️ {{ getExceptionStatusLabel(pack.exception.status) }}
            </span>
          </div>

          <div class="absolute top-3 right-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          </div>

          <div class="pt-4">
            <h3 class="font-bold text-gray-800 text-lg mb-3">{{ pack.name }}</h3>
            
            <div class="flex flex-wrap gap-2 mb-3">
              <span class="tag tag-info">{{ getBatchName(pack.batchId) }}</span>
              <span class="tag tag-accent">{{ getAreaName(pack.areaId) }}</span>
              <span :class="['tag', getPriorityColor(pack.priority)]">
                {{ getPriorityLabel(pack.priority) }}
              </span>
            </div>

            <div v-if="pack.exception" class="mb-3 p-3 bg-white/70 rounded-lg border border-amber-200">
              <div class="flex items-center gap-2 mb-2">
                <span :class="['tag text-xs', getExceptionTypeColor(pack.exception.type)]">
                  {{ getExceptionTypeLabel(pack.exception.type) }}
                </span>
                <span :class="['tag text-xs', getExceptionPriorityColor(pack.exception.priority)]">
                  {{ getExceptionPriorityLabel(pack.exception.priority) }}
                </span>
              </div>
              <p class="text-xs text-gray-600 line-clamp-2">{{ pack.exception.remark }}</p>
            </div>

            <div class="border-t border-gray-100 pt-3">
              <p class="text-xs text-gray-500 mb-2">包含物品:</p>
              <ul class="text-sm text-gray-600 space-y-1">
                <li v-for="(item, idx) in pack.items.slice(0, 3)" :key="idx" class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 bg-primary-500 rounded-full" />
                  {{ item }}
                </li>
                <li v-if="pack.items.length > 3" class="text-gray-400">
                  还有 {{ pack.items.length - 3 }} 项物品...
                </li>
              </ul>
            </div>

            <div v-if="pack.exception" class="mt-3 pt-3 border-t border-gray-100">
              <button
                v-if="!isBatchCompleted(pack.batchId)"
                @click.stop="openExceptionModal(pack)"
                class="w-full btn btn-outline text-sm py-1.5"
              >
                处理异常
              </button>
              <span v-else class="w-full text-center text-sm text-gray-400">
                只读 - 已完成批次
              </span>
            </div>
          </div>
        </div>
      </div>

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

    <!-- 异常处理弹窗 -->
    <Modal v-model:visible="showExceptionModal" title="处理异常">
      <div v-if="selectedExceptionPack" class="space-y-4">
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 class="font-bold text-gray-800 mb-2">{{ selectedExceptionPack.name }}</h4>
          <div class="flex flex-wrap gap-2 mb-3">
            <span :class="['tag', getExceptionTypeColor(selectedExceptionPack.exception?.type)]">
              {{ getExceptionTypeLabel(selectedExceptionPack.exception?.type || null) }}
            </span>
            <span :class="['tag', getExceptionStatusColor(selectedExceptionPack.exception?.status)]">
              {{ getExceptionStatusLabel(selectedExceptionPack.exception?.status || null) }}
            </span>
          </div>
          <p class="text-sm text-gray-600">{{ selectedExceptionPack.exception?.remark }}</p>
          <div class="mt-3 text-xs text-gray-500">
            <p>登记时间: {{ formatDateTime(selectedExceptionPack.exception?.createdAt || '') }}</p>
            <p v-if="selectedExceptionPack.exception?.handler">处理人员: {{ selectedExceptionPack.exception.handler }}</p>
          </div>
        </div>

        <div v-if="selectedExceptionPack.exception?.result">
          <label class="block text-sm font-medium text-gray-700 mb-1">处理结果</label>
          <div class="input bg-green-50 border-green-200 text-green-800">
            {{ selectedExceptionPack.exception.result }}
          </div>
        </div>

        <div v-else-if="selectedExceptionPack.exception?.status === 'resolved'">
          <div class="text-center py-4 text-green-600">
            <span class="text-4xl">✅</span>
            <p class="mt-2 font-medium">该异常已解决</p>
          </div>
        </div>

        <div v-else>
          <label class="block text-sm font-medium text-gray-700 mb-1">处理结果</label>
          <textarea
            v-model="resultText"
            class="input min-h-[100px]"
            placeholder="请填写处理结果..."
          />
        </div>
      </div>
      <template #footer>
        <button @click="showExceptionModal = false" class="btn btn-outline">关闭</button>
        <template v-if="selectedExceptionPack && selectedExceptionPack.exception?.status !== 'resolved'">
          <button
            v-if="selectedExceptionPack.exception?.status === 'pending'"
            @click="handleStartProcessing"
            class="btn btn-outline text-blue-600"
          >
            开始处理
          </button>
          <button
            v-if="selectedExceptionPack.exception?.status === 'processing'"
            @click="handleDeferException"
            class="btn btn-outline text-gray-600"
          >
            暂缓处理
          </button>
          <button
            @click="handleResolveException"
            :disabled="!resultText.trim()"
            class="btn btn-primary"
          >
            标记已解决
          </button>
        </template>
      </template>
    </Modal>

    <!-- 处理人员输入弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showHandlerInput" class="modal-overlay" @click.self="showHandlerInput = false">
          <div class="modal-content animate-slide-up max-w-sm">
            <div class="p-6">
              <h3 class="text-lg font-bold text-gray-800 mb-4">输入处理人员姓名</h3>
              <input
                v-model="handlerName"
                type="text"
                class="input"
                placeholder="请输入您的姓名"
                @keyup.enter="confirmStartProcessing"
              />
            </div>
            <div class="flex items-center justify-end gap-3 p-6 pt-0">
              <button @click="showHandlerInput = false" class="btn btn-outline">
                取消
              </button>
              <button @click="confirmStartProcessing" class="btn btn-primary">
                确认
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
