<script setup lang="ts">
import { ref, computed } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { useMaterialStore } from '@/stores/material';
import { formatDateTime, getPriorityLabel, getPriorityColor } from '@/utils/helpers';
import type { MaterialPack, Batch } from '@/types';

const store = useMaterialStore();
const reviewerName = ref('');
const showReviewerInput = ref(false);
const selectedReviewer = ref<string>('');

const batchesWithPacks = computed(() => {
  const batchIds = new Set(store.batches.map(b => b.id));
  const unassignedPacks = store.materialPacks.filter(
    (p: MaterialPack) => !p.batchId || !batchIds.has(p.batchId)
  );

  const result = store.batches.map((batch: Batch) => ({
    ...batch,
    packs: store.materialPacks.filter((p: MaterialPack) => p.batchId === batch.id),
  })).filter((b: { packs: MaterialPack[] }) => b.packs.length > 0);

  if (unassignedPacks.length > 0) {
    result.unshift({
      id: 'unassigned',
      name: '未分配批次',
      deliveryTime: '',
      priority: 999,
      createdAt: '',
      packs: unassignedPacks,
    });
  }

  return result;
});

const reviewedCount = computed(() => {
  return store.materialPacks.filter((p: MaterialPack) => p.reviewed).length;
});

const totalCount = computed(() => store.materialPacks.length);

function getAreaName(id: string) {
  return store.areaMap.get(id)?.name || '未分配';
}

function toggleReview(pack: MaterialPack) {
  store.toggleReview(pack.id, selectedReviewer.value || undefined);
}

function handlePrint() {
  if (!reviewerName.value.trim()) {
    showReviewerInput.value = true;
    return;
  }
  selectedReviewer.value = reviewerName.value.trim();
  window.print();
}

function confirmPrint() {
  if (reviewerName.value.trim()) {
    selectedReviewer.value = reviewerName.value.trim();
    showReviewerInput.value = false;
    window.print();
  }
}

function printNow() {
  showReviewerInput.value = false;
  window.print();
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <PageHeader title="复核人员" subtitle="查看物资清单、打印复核名单" role="reviewer">
      <template #actions>
        <button @click="store.exportDraft()" class="btn btn-outline">
          <span class="mr-2">📤</span>导出草稿
        </button>
        <button @click="handlePrint" class="btn btn-primary">
          <span class="mr-2">🖨️</span>打印清单
        </button>
      </template>
    </PageHeader>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <!-- 统计概览 -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 no-print">
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="text-3xl font-bold text-gray-800">{{ totalCount }}</div>
          <div class="text-sm text-gray-500 mt-1">物资包总数</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="text-3xl font-bold text-primary-600">{{ reviewedCount }}</div>
          <div class="text-sm text-gray-500 mt-1">已复核</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="text-3xl font-bold text-gray-400">{{ totalCount - reviewedCount }}</div>
          <div class="text-sm text-gray-500 mt-1">待复核</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="text-3xl font-bold text-accent-600">{{ batchesWithPacks.length }}</div>
          <div class="text-sm text-gray-500 mt-1">配送批次</div>
        </div>
      </div>

      <!-- 打印头部 -->
      <div class="print-only mb-8">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-900">公益物资配送复核清单</h1>
          <p class="text-gray-600 mt-2">打印时间: {{ formatDateTime(new Date()) }}</p>
          <p v-if="selectedReviewer" class="text-gray-600 mt-1">复核人员: {{ selectedReviewer }}</p>
        </div>
      </div>

      <!-- 批次分组清单 -->
      <div v-if="batchesWithPacks.length === 0" class="bg-white rounded-xl p-16 text-center">
        <div class="text-6xl mb-4">📋</div>
        <p class="text-gray-500 text-lg">暂无物资清单</p>
        <p class="text-gray-400 text-sm mt-2">请联系协调员添加物资包</p>
      </div>

      <div v-else>
        <div
          v-for="(batch, batchIndex) in batchesWithPacks"
          :key="batch.id"
          :class="['print-page', batchIndex > 0 ? 'pt-8' : '']"
        >
          <!-- 批次标题 -->
          <div class="flex items-center justify-between mb-4 no-print">
            <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span class="w-8 h-8 bg-info-500 text-white rounded-lg flex items-center justify-center text-sm">
                {{ batchIndex + 1 }}
              </span>
              {{ batch.name }}
              <span class="text-sm font-normal text-gray-500">
                ({{ batch.packs.length }} 个物资包)
              </span>
            </h2>
            <span v-if="batch.deliveryTime" class="text-sm text-gray-500">
              配送时间: {{ batch.deliveryTime }}
            </span>
          </div>

          <!-- 打印时的批次标题 -->
          <div class="print-only mb-4 pb-2 border-b-2 border-gray-300">
            <h2 class="text-xl font-bold text-gray-900">
              {{ batch.name }}
              <span class="text-base font-normal text-gray-600 ml-2">
                (共 {{ batch.packs.length }} 个物资包)
              </span>
            </h2>
            <p v-if="batch.deliveryTime" class="text-gray-600 text-sm mt-1">
              配送时间: {{ batch.deliveryTime }}
            </p>
          </div>

          <!-- 表格 -->
          <div class="bg-white rounded-xl shadow-sm overflow-hidden no-print">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="w-16 text-center">序号</th>
                  <th class="w-24 text-center">勾选</th>
                  <th>物资包名称</th>
                  <th class="w-32">配送区域</th>
                  <th class="w-24">优先级</th>
                  <th>包含物品</th>
                  <th class="w-32">复核状态</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(pack, idx) in batch.packs"
                  :key="pack.id"
                  :class="pack.reviewed ? 'bg-primary-50/50' : ''"
                >
                  <td class="text-center font-medium">{{ idx + 1 }}</td>
                  <td class="text-center">
                    <input
                      type="checkbox"
                      :checked="pack.reviewed"
                      @change="toggleReview(pack)"
                      class="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
                    />
                  </td>
                  <td class="font-medium">{{ pack.name }}</td>
                  <td>{{ getAreaName(pack.areaId) }}</td>
                  <td>
                    <span :class="['tag', getPriorityColor(pack.priority)]">
                      {{ getPriorityLabel(pack.priority) }}
                    </span>
                  </td>
                  <td>
                    <div class="flex flex-wrap gap-1">
                      <span v-for="(item, i) in pack.items.slice(0, 2)" :key="i" class="tag tag-gray text-xs">
                        {{ item }}
                      </span>
                      <span v-if="pack.items.length > 2" class="text-gray-400 text-xs">
                        +{{ pack.items.length - 2 }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span v-if="pack.reviewed" class="tag tag-primary">
                      ✓ 已复核
                    </span>
                    <span v-else class="tag tag-gray">
                      待复核
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 打印用表格 -->
          <div class="print-only">
            <table class="w-full border-collapse border border-gray-400 text-sm">
              <thead>
                <tr class="bg-gray-100">
                  <th class="border border-gray-400 px-3 py-2 text-center w-12">序号</th>
                  <th class="border border-gray-400 px-3 py-2 text-center w-12">勾选</th>
                  <th class="border border-gray-400 px-3 py-2 text-left">物资包名称</th>
                  <th class="border border-gray-400 px-3 py-2 text-left w-24">区域</th>
                  <th class="border border-gray-400 px-3 py-2 text-left">包含物品</th>
                  <th class="border border-gray-400 px-3 py-2 text-center w-28">复核签字</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(pack, idx) in batch.packs" :key="pack.id">
                  <td class="border border-gray-400 px-3 py-2 text-center">{{ idx + 1 }}</td>
                  <td class="border border-gray-400 px-3 py-2 text-center">
                    <div class="w-4 h-4 border-2 border-gray-600 inline-block" />
                  </td>
                  <td class="border border-gray-400 px-3 py-2">{{ pack.name }}</td>
                  <td class="border border-gray-400 px-3 py-2">{{ getAreaName(pack.areaId) }}</td>
                  <td class="border border-gray-400 px-3 py-2 text-xs">
                    {{ pack.items.join('、') }}
                  </td>
                  <td class="border border-gray-400 px-3 py-2" style="height: 32px;"></td>
                </tr>
              </tbody>
            </table>

            <!-- 批次复核栏 -->
            <div class="flex items-center justify-between mt-6 text-sm">
              <div class="flex items-center gap-2">
                <span>本批次合计:</span>
                <span class="font-bold">{{ batch.packs.length }}</span>
                <span>个物资包</span>
              </div>
              <div class="flex items-center gap-8">
                <div class="flex items-center gap-2">
                  <span>复核人签字:</span>
                  <span class="inline-block w-32 border-b border-gray-400"></span>
                </div>
                <div class="flex items-center gap-2">
                  <span>日期:</span>
                  <span class="inline-block w-24 border-b border-gray-400"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 页脚说明 -->
      <div class="print-only mt-12 pt-8 border-t border-gray-300 text-sm text-gray-600">
        <div class="flex items-center justify-between">
          <div>
            <p>注: 1. 请在物资装袋完成后勾选确认；2. 复核人员确认无误后签字；3. 本清单一式两份，一份留存，一份随物资配送。</p>
          </div>
          <div class="text-right">
            <p>第 ____ 页 / 共 ____ 页</p>
          </div>
        </div>
      </div>
    </main>

    <!-- 复核人员输入弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showReviewerInput" class="modal-overlay" @click.self="showReviewerInput = false">
          <div class="modal-content animate-slide-up max-w-sm">
            <div class="p-6">
              <h3 class="text-lg font-bold text-gray-800 mb-4">输入复核人员姓名</h3>
              <p class="text-gray-500 text-sm mb-4">请输入您的姓名，将显示在打印清单上</p>
              <input
                v-model="reviewerName"
                type="text"
                class="input"
                placeholder="请输入复核人员姓名"
                @keyup.enter="confirmPrint"
              />
            </div>
            <div class="flex items-center justify-end gap-3 p-6 pt-0">
              <button @click="printNow" class="btn btn-outline">
                不填写直接打印
              </button>
              <button @click="confirmPrint" class="btn btn-primary">
                确认打印
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
