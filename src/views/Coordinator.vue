<script setup lang="ts">
import { ref, reactive } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import Modal from '@/components/Modal.vue';
import { useMaterialStore } from '@/stores/material';
import { getPriorityLabel, getPriorityColor, getExceptionTypeLabel, getExceptionTypeColor, getExceptionStatusLabel, getExceptionStatusColor, getExceptionPriorityLabel, getExceptionPriorityColor } from '@/utils/helpers';
import type { MaterialPack, Batch, Area } from '@/types';

const store = useMaterialStore();

type TabType = 'packs' | 'batches' | 'areas' | 'exceptions';
const activeTab = ref<TabType>('packs');

const tabs = [
  { id: 'packs' as const, label: '物资包管理', icon: '📦' },
  { id: 'exceptions' as const, label: '异常处理', icon: '⚠️' },
  { id: 'batches' as const, label: '配送批次', icon: '🚚' },
  { id: 'areas' as const, label: '配送区域', icon: '📍' },
];

// 弹窗状态
const showPackModal = ref(false);
const showBatchModal = ref(false);
const showAreaModal = ref(false);
const showExceptionModal = ref(false);
const editingId = ref<string | null>(null);
const exceptionPackId = ref<string | null>(null);

// 表单数据
const packForm = reactive({
  name: '',
  items: '',
  priority: 3,
  batchId: '',
  areaId: '',
});

const batchForm = reactive({
  name: '',
  deliveryTime: '',
  priority: 1,
});

const areaForm = reactive({
  name: '',
  priority: 1,
});

const exceptionForm = reactive({
  type: 'shortage' as 'shortage' | 'incomplete' | 'area_pending' | 'cancelled',
  priority: 2,
  remark: '',
});

function resetPackForm() {
  packForm.name = '';
  packForm.items = '';
  packForm.priority = 3;
  packForm.batchId = store.batches[0]?.id || '';
  packForm.areaId = store.areas[0]?.id || '';
  editingId.value = null;
}

function resetBatchForm() {
  batchForm.name = '';
  batchForm.deliveryTime = '';
  batchForm.priority = 1;
  editingId.value = null;
}

function resetAreaForm() {
  areaForm.name = '';
  areaForm.priority = 1;
  editingId.value = null;
}

function openAddPack() {
  resetPackForm();
  showPackModal.value = true;
}

function openEditPack(pack: MaterialPack) {
  editingId.value = pack.id;
  packForm.name = pack.name;
  packForm.items = pack.items.join('\n');
  packForm.priority = pack.priority;
  packForm.batchId = pack.batchId;
  packForm.areaId = pack.areaId;
  showPackModal.value = true;
}

async function savePack() {
  const items = packForm.items.split('\n').filter(i => i.trim());
  
  if (editingId.value) {
    await store.updateMaterialPackData(editingId.value, {
      name: packForm.name,
      items,
      priority: packForm.priority,
      batchId: packForm.batchId,
      areaId: packForm.areaId,
    });
  } else {
    await store.createMaterialPack({
      name: packForm.name,
      items,
      priority: packForm.priority,
      batchId: packForm.batchId,
      areaId: packForm.areaId,
    });
  }
  showPackModal.value = false;
  resetPackForm();
}

function openAddBatch() {
  resetBatchForm();
  showBatchModal.value = true;
}

function openEditBatch(batch: Batch) {
  editingId.value = batch.id;
  batchForm.name = batch.name;
  batchForm.deliveryTime = batch.deliveryTime;
  batchForm.priority = batch.priority;
  showBatchModal.value = true;
}

async function saveBatch() {
  if (editingId.value) {
    await store.updateBatchData(editingId.value, {
      name: batchForm.name,
      deliveryTime: batchForm.deliveryTime,
      priority: batchForm.priority,
    });
  } else {
    await store.createBatch({
      name: batchForm.name,
      deliveryTime: batchForm.deliveryTime,
      priority: batchForm.priority,
    });
  }
  showBatchModal.value = false;
  resetBatchForm();
}

function openAddArea() {
  resetAreaForm();
  showAreaModal.value = true;
}

function openEditArea(area: Area) {
  editingId.value = area.id;
  areaForm.name = area.name;
  areaForm.priority = area.priority;
  showAreaModal.value = true;
}

async function saveArea() {
  if (editingId.value) {
    await store.updateAreaData(editingId.value, {
      name: areaForm.name,
      priority: areaForm.priority,
    });
  } else {
    await store.createArea({
      name: areaForm.name,
      priority: areaForm.priority,
    });
  }
  showAreaModal.value = false;
  resetAreaForm();
}

async function deletePack(id: string) {
  if (confirm('确定要删除这个物资包吗？')) {
    await store.removeMaterialPack(id);
  }
}

async function deleteBatch(id: string) {
  if (confirm('确定要删除这个批次吗？相关物资包将不受影响。')) {
    await store.removeBatch(id);
  }
}

async function deleteArea(id: string) {
  if (confirm('确定要删除这个区域吗？相关物资包将不受影响。')) {
    await store.removeArea(id);
  }
}

function resetExceptionForm() {
  exceptionForm.type = 'shortage';
  exceptionForm.priority = 2;
  exceptionForm.remark = '';
  exceptionPackId.value = null;
}

function openAddException(packId: string) {
  resetExceptionForm();
  exceptionPackId.value = packId;
  const pack = store.materialPacks.find(p => p.id === packId);
  if (pack?.exception) {
    exceptionForm.type = pack.exception.type || 'shortage';
    exceptionForm.priority = pack.exception.priority;
    exceptionForm.remark = pack.exception.remark;
  }
  showExceptionModal.value = true;
}

async function saveException() {
  if (!exceptionPackId.value) return;
  await store.setException(exceptionPackId.value, {
    type: exceptionForm.type,
    priority: exceptionForm.priority,
    remark: exceptionForm.remark,
  });
  showExceptionModal.value = false;
  resetExceptionForm();
}

async function removeException(packId: string) {
  if (confirm('确定要清除这个物资包的异常记录吗？')) {
    await store.clearException(packId);
  }
}

function getBatchName(id: string) {
  return store.batchMap.get(id)?.name || '未分配';
}

function getAreaName(id: string) {
  return store.areaMap.get(id)?.name || '未分配';
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <PageHeader title="协调员配置" subtitle="管理物资包类型、配送批次和配送区域" role="coordinator">
      <template #actions>
        <button @click="store.exportDraft()" class="btn btn-outline">
          <span class="mr-2">📤</span>导出草稿
        </button>
      </template>
    </PageHeader>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <!-- Tab 切换 -->
      <div class="bg-white rounded-xl shadow-sm p-1.5 inline-flex gap-1 mb-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'px-5 py-2.5 rounded-lg font-medium text-sm transition-all',
            activeTab === tab.id
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100',
          ]"
        >
          <span class="mr-2">{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </div>

      <!-- 物资包管理 -->
      <div v-if="activeTab === 'packs'">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-bold text-gray-800">
            物资包列表 ({{ store.materialPacks.length }})
          </h2>
          <button @click="openAddPack" class="btn btn-primary">
            <span class="mr-2">+</span>新增物资包
          </button>
        </div>

        <div v-if="store.materialPacks.length === 0" class="bg-white rounded-xl p-12 text-center">
          <div class="text-5xl mb-4">📦</div>
          <p class="text-gray-500 mb-4">暂无物资包数据</p>
          <button @click="openAddPack" class="btn btn-primary">添加第一个物资包</button>
        </div>

        <div v-else class="bg-white rounded-xl shadow-sm overflow-hidden">
          <table class="data-table">
            <thead>
              <tr>
                <th>物资包名称</th>
                <th>包含物品</th>
                <th>优先级</th>
                <th>所属批次</th>
                <th>配送区域</th>
                <th>异常状态</th>
                <th class="w-44">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pack in store.materialPacks" :key="pack.id" :class="pack.exception ? 'bg-amber-50/50' : ''">
                <td class="font-medium text-gray-800">{{ pack.name }}</td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    <span v-for="(item, idx) in pack.items.slice(0, 3)" :key="idx" class="tag tag-gray">
                      {{ item }}
                    </span>
                    <span v-if="pack.items.length > 3" class="text-gray-400 text-sm">
                      +{{ pack.items.length - 3 }} 项
                    </span>
                  </div>
                </td>
                <td>
                  <span :class="['tag', getPriorityColor(pack.priority)]">
                    {{ getPriorityLabel(pack.priority) }}
                  </span>
                </td>
                <td>{{ getBatchName(pack.batchId) }}</td>
                <td>{{ getAreaName(pack.areaId) }}</td>
                <td>
                  <span v-if="pack.exception" :class="['tag', getExceptionStatusColor(pack.exception.status)]">
                    {{ getExceptionStatusLabel(pack.exception.status) }}
                  </span>
                  <span v-else class="tag tag-gray">正常</span>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <button
                      @click="openEditPack(pack)"
                      class="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      编辑
                    </button>
                    <button
                      @click="openAddException(pack.id)"
                      :class="pack.exception ? 'text-amber-600 hover:text-amber-700' : 'text-blue-600 hover:text-blue-700'"
                      class="text-sm font-medium"
                    >
                      {{ pack.exception ? '修改异常' : '登记异常' }}
                    </button>
                    <button
                      @click="deletePack(pack.id)"
                      class="text-red-500 hover:text-red-600 text-sm font-medium"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 批次管理 -->
      <div v-if="activeTab === 'batches'">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-bold text-gray-800">
            配送批次 ({{ store.batches.length }})
          </h2>
          <button @click="openAddBatch" class="btn btn-primary">
            <span class="mr-2">+</span>新增批次
          </button>
        </div>

        <div v-if="store.batches.length === 0" class="bg-white rounded-xl p-12 text-center">
          <div class="text-5xl mb-4">🚚</div>
          <p class="text-gray-500 mb-4">暂无批次数据</p>
          <button @click="openAddBatch" class="btn btn-primary">添加第一个批次</button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="batch in store.batches" :key="batch.id" class="card">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-bold text-gray-800 text-lg">{{ batch.name }}</h3>
                <p class="text-gray-500 text-sm mt-1">
                  <span class="mr-1">⏰</span>配送时间: {{ batch.deliveryTime || '未设置' }}
                </p>
                <div class="mt-3">
                  <span :class="['tag', getPriorityColor(batch.priority)]">
                    优先级: {{ getPriorityLabel(batch.priority) }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="openEditBatch(batch)"
                  class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="deleteBatch(batch.id)"
                  class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 区域管理 -->
      <div v-if="activeTab === 'areas'">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-bold text-gray-800">
            配送区域 ({{ store.areas.length }})
          </h2>
          <button @click="openAddArea" class="btn btn-primary">
            <span class="mr-2">+</span>新增区域
          </button>
        </div>

        <div v-if="store.areas.length === 0" class="bg-white rounded-xl p-12 text-center">
          <div class="text-5xl mb-4">📍</div>
          <p class="text-gray-500 mb-4">暂无区域数据</p>
          <button @click="openAddArea" class="btn btn-primary">添加第一个区域</button>
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div v-for="area in store.areas" :key="area.id" class="card">
            <div class="text-center">
              <div class="w-12 h-12 mx-auto bg-info-100 rounded-xl flex items-center justify-center text-2xl mb-3">
                📍
              </div>
              <h3 class="font-bold text-gray-800">{{ area.name }}</h3>
              <span :class="['tag mt-2', getPriorityColor(area.priority)]">
                优先级 {{ area.priority }}
              </span>
              <div class="flex items-center justify-center gap-2 mt-4">
                <button
                  @click="openEditArea(area)"
                  class="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  编辑
                </button>
                <button
                  @click="deleteArea(area.id)"
                  class="text-red-500 hover:text-red-600 text-sm font-medium"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 异常处理 -->
      <div v-if="activeTab === 'exceptions'">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-bold text-gray-800">
            异常物资包 ({{ store.exceptionPacks.length }})
          </h2>
        </div>

        <div v-if="store.exceptionPacks.length === 0" class="bg-white rounded-xl p-12 text-center">
          <div class="text-5xl mb-4">✅</div>
          <p class="text-gray-500 mb-4">暂无异常物资包</p>
          <p class="text-gray-400 text-sm">所有物资包状态正常</p>
        </div>

        <div v-else class="bg-white rounded-xl shadow-sm overflow-hidden">
          <table class="data-table">
            <thead>
              <tr>
                <th>物资包名称</th>
                <th>异常类型</th>
                <th>处理优先级</th>
                <th>当前状态</th>
                <th>处理人员</th>
                <th>异常备注</th>
                <th class="w-44">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pack in store.exceptionPacks" :key="pack.id" class="bg-amber-50/50">
                <td class="font-medium text-gray-800">{{ pack.name }}</td>
                <td>
                  <span :class="['tag', getExceptionTypeColor(pack.exception?.type)]">
                    {{ getExceptionTypeLabel(pack.exception?.type || null) }}
                  </span>
                </td>
                <td>
                  <span :class="['tag', getExceptionPriorityColor(pack.exception?.priority || 3)]">
                    {{ getExceptionPriorityLabel(pack.exception?.priority || 3) }}
                  </span>
                </td>
                <td>
                  <span :class="['tag', getExceptionStatusColor(pack.exception?.status)]">
                    {{ getExceptionStatusLabel(pack.exception?.status || null) }}
                  </span>
                </td>
                <td>{{ pack.exception?.handler || '未分配' }}</td>
                <td class="text-sm text-gray-600 max-w-xs truncate">{{ pack.exception?.remark || '-' }}</td>
                <td>
                  <div class="flex items-center gap-2">
                    <button
                      @click="openAddException(pack.id)"
                      class="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      修改
                    </button>
                    <button
                      @click="removeException(pack.id)"
                      class="text-red-500 hover:text-red-600 text-sm font-medium"
                    >
                      清除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="store.resolvedExceptionPacks.length > 0" class="mt-8">
          <h3 class="text-md font-bold text-gray-700 mb-4">已解决的异常 ({{ store.resolvedExceptionPacks.length }})</h3>
          <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <table class="data-table">
              <thead>
                <tr>
                  <th>物资包名称</th>
                  <th>异常类型</th>
                  <th>处理结果</th>
                  <th>处理人员</th>
                  <th class="w-32">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pack in store.resolvedExceptionPacks" :key="pack.id">
                  <td class="font-medium text-gray-800">{{ pack.name }}</td>
                  <td>
                    <span :class="['tag', getExceptionTypeColor(pack.exception?.type)]">
                      {{ getExceptionTypeLabel(pack.exception?.type || null) }}
                    </span>
                  </td>
                  <td class="text-sm text-gray-600 max-w-xs truncate">{{ pack.exception?.result || '-' }}</td>
                  <td>{{ pack.exception?.handler || '-' }}</td>
                  <td>
                    <button
                      @click="removeException(pack.id)"
                      class="text-red-500 hover:text-red-600 text-sm font-medium"
                    >
                      清除记录
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>

    <!-- 物资包弹窗 -->
    <Modal v-model:visible="showPackModal" :title="editingId ? '编辑物资包' : '新增物资包'">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">物资包名称</label>
          <input v-model="packForm.name" type="text" class="input" placeholder="例如：爱心物资包A" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">包含物品（每行一个）</label>
          <textarea
            v-model="packForm.items"
            class="input min-h-[120px]"
            placeholder="大米10kg&#10;食用油5L&#10;面条2kg"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">优先级</label>
            <select v-model.number="packForm.priority" class="select">
              <option :value="1">最高</option>
              <option :value="2">高</option>
              <option :value="3">中</option>
              <option :value="4">低</option>
              <option :value="5">最低</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">所属批次</label>
            <select v-model="packForm.batchId" class="select">
              <option value="" disabled>请先创建批次</option>
              <option v-for="b in store.batches" :key="b.id" :value="b.id">
                {{ b.name }}
              </option>
            </select>
            <p v-if="store.batches.length === 0" class="text-xs text-amber-600 mt-1">
              ⚠️ 暂无批次，请先在"配送批次"标签页创建
            </p>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">配送区域</label>
          <select v-model="packForm.areaId" class="select">
            <option value="" disabled>请先创建区域</option>
            <option v-for="a in store.areas" :key="a.id" :value="a.id">
              {{ a.name }}
            </option>
          </select>
          <p v-if="store.areas.length === 0" class="text-xs text-amber-600 mt-1">
            ⚠️ 暂无区域，请先在"配送区域"标签页创建
          </p>
        </div>
      </div>
      <template #footer>
        <button @click="showPackModal = false" class="btn btn-outline">取消</button>
        <button @click="savePack" class="btn btn-primary">保存</button>
      </template>
    </Modal>

    <!-- 批次弹窗 -->
    <Modal v-model:visible="showBatchModal" :title="editingId ? '编辑批次' : '新增批次'">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">批次名称</label>
          <input v-model="batchForm.name" type="text" class="input" placeholder="例如：第一批次" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">配送时间</label>
          <input v-model="batchForm.deliveryTime" type="text" class="input" placeholder="例如：2024-06-08 09:00" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">优先级</label>
          <select v-model.number="batchForm.priority" class="select">
            <option :value="1">最高</option>
            <option :value="2">高</option>
            <option :value="3">中</option>
            <option :value="4">低</option>
            <option :value="5">最低</option>
          </select>
        </div>
      </div>
      <template #footer>
        <button @click="showBatchModal = false" class="btn btn-outline">取消</button>
        <button @click="saveBatch" class="btn btn-primary">保存</button>
      </template>
    </Modal>

    <!-- 区域弹窗 -->
    <Modal v-model:visible="showAreaModal" :title="editingId ? '编辑区域' : '新增区域'">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">区域名称</label>
          <input v-model="areaForm.name" type="text" class="input" placeholder="例如：A区" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">优先级</label>
          <select v-model.number="areaForm.priority" class="select">
            <option :value="1">最高</option>
            <option :value="2">高</option>
            <option :value="3">中</option>
            <option :value="4">低</option>
            <option :value="5">最低</option>
          </select>
        </div>
      </div>
      <template #footer>
        <button @click="showAreaModal = false" class="btn btn-outline">取消</button>
        <button @click="saveArea" class="btn btn-primary">保存</button>
      </template>
    </Modal>

    <!-- 异常登记弹窗 -->
    <Modal v-model:visible="showExceptionModal" :title="exceptionPackId && store.materialPacks.find(p => p.id === exceptionPackId)?.exception ? '修改异常记录' : '登记异常'">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">物资包</label>
          <div class="input bg-gray-50">
            {{ store.materialPacks.find(p => p.id === exceptionPackId)?.name || '-' }}
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">异常类型</label>
          <select v-model="exceptionForm.type" class="select">
            <option value="shortage">缺货</option>
            <option value="incomplete">信息不完整</option>
            <option value="area_pending">配送区域待确认</option>
            <option value="cancelled">临时取消发放</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">处理优先级</label>
          <select v-model.number="exceptionForm.priority" class="select">
            <option :value="1">紧急</option>
            <option :value="2">高</option>
            <option :value="3">普通</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">异常备注</label>
          <textarea
            v-model="exceptionForm.remark"
            class="input min-h-[100px]"
            placeholder="请详细描述异常情况..."
          />
        </div>
      </div>
      <template #footer>
        <button @click="showExceptionModal = false" class="btn btn-outline">取消</button>
        <button @click="saveException" class="btn btn-primary">保存</button>
      </template>
    </Modal>
  </div>
</template>
