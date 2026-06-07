<script setup lang="ts">
import { ref, computed } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { useMaterialStore } from '@/stores/material';
import { formatDateTime, getPriorityLabel, getPriorityColor, getExceptionTypeLabel, getExceptionTypeColor, getExceptionStatusLabel, getExceptionStatusColor, getBatchStatusLabel, getBatchStatusColor, getBatchStatusIcon, getHandoverStatusLabel, getHandoverStatusColor, getHandoverStatusIcon } from '@/utils/helpers';
import type { MaterialPack, Batch } from '@/types';

const store = useMaterialStore();
const reviewerName = ref('');
const showReviewerInput = ref(false);
const selectedReviewer = ref<string>('');
const filterHandoverStatus = ref<string>('all');

const batchesWithPacks = computed(() => {
  const batchIds = new Set(store.batches.map(b => b.id));
  const unassignedPacks = store.materialPacks.filter(
    (p: MaterialPack) => !p.batchId || !batchIds.has(p.batchId)
  );

  let result = store.batches.map((batch: Batch) => {
    const packs = store.materialPacks.filter((p: MaterialPack) => p.batchId === batch.id);
    const stats = store.getBatchStats(batch.id);
    return {
      ...batch,
      packs,
      stats,
    };
  }).filter((b: { packs: MaterialPack[] }) => b.packs.length > 0);

  if (filterHandoverStatus.value === 'handed') {
    result = result.filter(b => b.handover);
  } else if (filterHandoverStatus.value === 'unhanded') {
    result = result.filter(b => !b.handover);
  } else if (filterHandoverStatus.value === 'abnormal') {
    result = result.filter(b => store.isHandoverAbnormal(b.id));
  }

  if (unassignedPacks.length > 0 && filterHandoverStatus.value === 'all') {
    result.unshift({
      id: 'unassigned',
      name: '未分配批次',
      deliveryTime: '',
      priority: 999,
      status: 'in_progress' as const,
      createdAt: '',
      packs: unassignedPacks,
      stats: { total: unassignedPacks.length, reviewed: unassignedPacks.filter(p => p.reviewed).length, unresolvedExceptions: 0, unreviewed: unassignedPacks.filter(p => !p.reviewed).length },
    });
  }

  return result;
});

function isBatchCompleted(batch: any): boolean {
  return batch?.status === 'completed';
}

const reviewedCount = computed(() => {
  return store.materialPacks.filter((p: MaterialPack) => p.reviewed).length;
});

const totalCount = computed(() => store.materialPacks.length);

const exceptionCount = computed(() => store.exceptionPacks.length);

const resolvedExceptionCount = computed(() => store.resolvedExceptionPacks.length);

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
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 no-print">
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
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="text-3xl font-bold text-amber-600">{{ exceptionCount }}</div>
          <div class="text-sm text-gray-500 mt-1">待处理异常</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="text-3xl font-bold text-green-600">{{ resolvedExceptionCount }}</div>
          <div class="text-sm text-gray-500 mt-1">已解决异常</div>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="bg-white rounded-xl shadow-sm p-4 mb-8 no-print">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">交接状态筛选:</span>
            <select v-model="filterHandoverStatus" class="select w-36">
              <option value="all">全部</option>
              <option value="handed">已交接</option>
              <option value="unhanded">未交接</option>
              <option value="abnormal">异常未交接</option>
            </select>
          </div>
          <div v-if="filterHandoverStatus !== 'all'" class="text-sm text-gray-500">
            当前筛选: <span class="text-primary-600 font-medium">{{ filterHandoverStatus === 'handed' ? '已交接' : filterHandoverStatus === 'unhanded' ? '未交接' : '异常未交接' }}</span>
            <button @click="filterHandoverStatus = 'all'" class="ml-2 text-primary-600 hover:text-primary-700 underline">清除筛选</button>
          </div>
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
          <div :class="['mb-4 no-print rounded-xl p-4', isBatchCompleted(batch) ? 'bg-green-50 border-2 border-green-200' : batch.status === 'pending_review' ? 'bg-amber-50 border-2 border-amber-200' : 'bg-blue-50 border-2 border-blue-200', batch.id !== 'unassigned' && store.isHandoverAbnormal(batch.id) ? 'border-2 border-red-300 bg-red-50/30' : '']">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2 flex-wrap">
                <span class="w-8 h-8 bg-info-500 text-white rounded-lg flex items-center justify-center text-sm">
                  {{ batchIndex + 1 }}
                </span>
                {{ batch.name }}
                <span :class="['tag', getBatchStatusColor(batch.status)]">
                  {{ getBatchStatusIcon(batch.status) }} {{ getBatchStatusLabel(batch.status) }}
                </span>
                <span v-if="batch.id !== 'unassigned'" :class="['tag', getHandoverStatusColor(!!batch.handover, store.isHandoverAbnormal(batch.id))]">
                  {{ getHandoverStatusIcon(!!batch.handover, store.isHandoverAbnormal(batch.id)) }} {{ getHandoverStatusLabel(!!batch.handover, store.isHandoverAbnormal(batch.id)) }}
                </span>
              </h2>
              <div class="flex flex-wrap items-center gap-4">
                <div class="text-sm">
                  <span class="text-primary-600 font-bold text-lg">{{ batch.stats.reviewed }}</span>
                  <span class="text-gray-500">/{{ batch.stats.total }} 已复核</span>
                  <span v-if="batch.stats.unresolvedExceptions > 0" class="ml-2 text-red-500 font-medium">
                    ⚠️ {{ batch.stats.unresolvedExceptions }} 个异常
                  </span>
                </div>
                <span v-if="batch.deliveryTime" class="text-sm text-gray-500">
                  配送时间: {{ batch.deliveryTime }}
                </span>
                <span v-if="isBatchCompleted(batch) && batch.completedAt" class="text-sm text-green-600 font-medium">
                  ✅ {{ formatDateTime(batch.completedAt) }}
                </span>
              </div>
            </div>

            <div class="flex items-center justify-between mt-2">
              <div class="flex items-center gap-2 flex-1 max-w-md">
                <div :class="['flex flex-col items-center', batch.status !== 'in_progress' ? 'text-blue-600' : 'text-blue-600']">
                  <div :class="['w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm', batch.status !== 'in_progress' ? 'bg-blue-500' : 'bg-blue-500']">
                    1
                  </div>
                  <span class="text-xs font-medium mt-1">进行中</span>
                </div>
                <div :class="['flex-1 h-1 mx-2 rounded', batch.status !== 'in_progress' ? 'bg-blue-500' : 'bg-gray-300']"></div>
                <div :class="['flex flex-col items-center', batch.status === 'pending_review' || batch.status === 'completed' ? 'text-amber-600' : 'text-gray-400']">
                  <div :class="['w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm', batch.status === 'pending_review' || batch.status === 'completed' ? 'bg-amber-500' : 'bg-gray-300']">
                    2
                  </div>
                  <span class="text-xs font-medium mt-1">待复核</span>
                </div>
                <div :class="['flex-1 h-1 mx-2 rounded', batch.status === 'completed' ? 'bg-green-500' : 'bg-gray-300']"></div>
                <div :class="['flex flex-col items-center', batch.status === 'completed' ? 'text-green-600' : 'text-gray-400']">
                  <div :class="['w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm', batch.status === 'completed' ? 'bg-green-500' : 'bg-gray-300']">
                    3
                  </div>
                  <span class="text-xs font-medium mt-1">已完成</span>
                </div>
              </div>
              <div class="flex items-center gap-2 ml-4">
                <span class="text-xs text-gray-500">复核进度</span>
                <span class="text-sm font-bold text-primary-600">
                  {{ batch.stats.total > 0 ? Math.round(batch.stats.reviewed / batch.stats.total * 100) : 0 }}%
                </span>
                <div class="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    :class="['h-2 rounded-full transition-all', batch.status === 'completed' ? 'bg-green-500' : batch.status === 'pending_review' ? 'bg-amber-500' : 'bg-blue-500']"
                    :style="{ width: `${batch.stats.total > 0 ? batch.stats.reviewed / batch.stats.total * 100 : 0}%` }"
                  ></div>
                </div>
              </div>
            </div>

            <div v-if="batch.id !== 'unassigned' && batch.handover" class="mt-3 p-3 bg-white/80 rounded-lg border border-gray-200">
              <div class="flex items-center gap-1 mb-2">
                <span>🤝</span>
                <span class="text-sm font-medium text-gray-700">交接信息</span>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
                <div><span class="text-gray-400">交接人:</span> {{ batch.handover.handoverPerson }}</div>
                <div><span class="text-gray-400">接收人:</span> {{ batch.handover.receiver }}</div>
                <div><span class="text-gray-400">联系方式:</span> {{ batch.handover.contactInfo || '-' }}</div>
                <div><span class="text-gray-400">交接时间:</span> {{ batch.handover.handoverTime }}</div>
              </div>
              <div v-if="batch.handover.remark" class="mt-2 text-xs text-gray-600">
                <span class="text-gray-400">备注:</span> {{ batch.handover.remark }}
              </div>
            </div>

            <div v-else-if="batch.id !== 'unassigned' && store.isHandoverAbnormal(batch.id)" class="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <div class="flex items-center gap-2 text-sm text-red-700">
                <span>⚠️</span>
                <span class="font-medium">异常：该批次已完成但尚未登记交接信息，请联系协调员补充</span>
              </div>
            </div>

            <p v-if="isBatchCompleted(batch)" class="text-green-700 text-xs mt-3 text-center font-medium bg-green-100 rounded-lg py-1.5">
              🔒 该批次已正式交接完成，内容只读
            </p>
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
            <div v-if="batch.id !== 'unassigned' && batch.handover" class="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
              <h4 class="text-sm font-bold text-gray-800 mb-2">🤝 交接信息</h4>
              <div class="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div><span class="text-gray-500">交接人:</span> {{ batch.handover.handoverPerson }}</div>
                <div><span class="text-gray-500">接收人:</span> {{ batch.handover.receiver }}</div>
                <div><span class="text-gray-500">联系方式:</span> {{ batch.handover.contactInfo || '-' }}</div>
                <div><span class="text-gray-500">交接时间:</span> {{ batch.handover.handoverTime }}</div>
              </div>
              <div v-if="batch.handover.remark" class="mt-2 text-sm text-gray-600">
                <span class="text-gray-500">备注:</span> {{ batch.handover.remark }}
              </div>
            </div>
          </div>

          <!-- 表格 -->
          <div class="bg-white rounded-xl shadow-sm overflow-hidden no-print">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="w-16 text-center">序号</th>
                  <th class="w-24 text-center">勾选</th>
                  <th>物资包名称</th>
                  <th class="w-28">配送区域</th>
                  <th class="w-24">优先级</th>
                  <th class="w-32">异常类型</th>
                  <th class="w-28">异常状态</th>
                  <th>异常备注/处理结果</th>
                  <th class="w-28">复核状态</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(pack, idx) in batch.packs"
                  :key="pack.id"
                  :class="[
                    pack.reviewed ? 'bg-primary-50/50' : '',
                    pack.exception ? 'bg-amber-50/30' : '',
                  ]"
                >
                  <td class="text-center font-medium">{{ idx + 1 }}</td>
                  <td class="text-center">
                    <input
                      type="checkbox"
                      :checked="pack.reviewed"
                      @change="toggleReview(pack)"
                      :disabled="isBatchCompleted(batch)"
                      :class="[
                        'w-5 h-5 rounded border-gray-300 focus:ring-primary-500',
                        isBatchCompleted(batch) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer text-primary-600'
                      ]"
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
                    <span v-if="pack.exception" :class="['tag', getExceptionTypeColor(pack.exception.type)]">
                      {{ getExceptionTypeLabel(pack.exception.type) }}
                    </span>
                    <span v-else class="text-gray-400 text-sm">-</span>
                  </td>
                  <td>
                    <span v-if="pack.exception" :class="['tag', getExceptionStatusColor(pack.exception.status)]">
                      {{ getExceptionStatusLabel(pack.exception.status) }}
                    </span>
                    <span v-else class="text-gray-400 text-sm">正常</span>
                  </td>
                  <td class="text-sm text-gray-600 max-w-xs">
                    <template v-if="pack.exception">
                      <div v-if="pack.exception.result" class="text-green-700">
                        ✓ {{ pack.exception.result }}
                      </div>
                      <div v-else class="text-amber-700">
                        {{ pack.exception.remark }}
                      </div>
                      <div v-if="pack.exception.handler" class="text-xs text-gray-400 mt-1">
                        处理人: {{ pack.exception.handler }}
                      </div>
                    </template>
                    <span v-else class="text-gray-400">-</span>
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
                  <th class="border border-gray-400 px-3 py-2 text-center w-10">序号</th>
                  <th class="border border-gray-400 px-3 py-2 text-center w-10">勾选</th>
                  <th class="border border-gray-400 px-3 py-2 text-left">物资包名称</th>
                  <th class="border border-gray-400 px-3 py-2 text-left w-20">区域</th>
                  <th class="border border-gray-400 px-3 py-2 text-left w-24">异常情况</th>
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
                    <template v-if="pack.exception">
                      <div class="font-medium">{{ getExceptionTypeLabel(pack.exception.type) }}</div>
                      <div class="text-gray-600">{{ pack.exception.result || pack.exception.remark }}</div>
                    </template>
                    <span v-else class="text-gray-400">-</span>
                  </td>
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
