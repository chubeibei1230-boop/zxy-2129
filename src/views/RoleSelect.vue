<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useMaterialStore } from '@/stores/material';

const router = useRouter();
const store = useMaterialStore();

const roles = [
  {
    id: 'coordinator' as const,
    title: '协调员',
    description: '配置物资包类型、管理批次和配送区域',
    icon: '📋',
    color: 'from-primary-500 to-primary-700',
    bgLight: 'bg-primary-50',
    borderLight: 'border-primary-200',
  },
  {
    id: 'executor' as const,
    title: '执行人员',
    description: '拖拽调整装袋顺序、按批次和区域排序',
    icon: '📦',
    color: 'from-accent-500 to-accent-700',
    bgLight: 'bg-accent-50',
    borderLight: 'border-accent-200',
  },
  {
    id: 'reviewer' as const,
    title: '复核人员',
    description: '查看物资清单、打印复核名单、确认复核',
    icon: '✅',
    color: 'from-info-500 to-info-700',
    bgLight: 'bg-info-50',
    borderLight: 'border-info-200',
  },
];

function selectRole(roleId: typeof roles[number]['id']) {
  store.setRole(roleId);
  router.push(`/${roleId}`);
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-50 via-primary-50/30 to-gray-100">
    <div class="text-center mb-12 animate-fade-in">
      <div class="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-3xl mb-6">
        <span class="text-5xl">💝</span>
      </div>
      <h1 class="text-4xl font-bold text-gray-800 mb-3">
        公益物资管理工具
      </h1>
      <p class="text-lg text-gray-500 max-w-md">
        高效管理公益物资的装袋顺序、配送批次和复核流程
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
      <div
        v-for="(role, index) in roles"
        :key="role.id"
        @click="selectRole(role.id)"
        class="card cursor-pointer group hover:-translate-y-2 animate-slide-up"
        :style="{ animationDelay: `${index * 100}ms` }"
      >
        <div class="flex flex-col items-center text-center">
          <div
            :class="[
              'w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 bg-gradient-to-br transition-transform duration-300 group-hover:scale-110',
              role.color,
            ]"
          >
            <span class="text-white">{{ role.icon }}</span>
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">
            {{ role.title }}
          </h3>
          <p class="text-gray-500 text-sm leading-relaxed">
            {{ role.description }}
          </p>
          <div class="mt-6 flex items-center gap-2 text-primary-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            <span>进入</span>
            <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-12 text-center text-gray-400 text-sm no-print">
      <p>数据保存在本地浏览器中，支持导出备份</p>
    </div>
  </div>
</template>
