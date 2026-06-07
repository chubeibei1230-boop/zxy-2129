<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useMaterialStore } from '@/stores/material';

interface Props {
  title: string;
  subtitle?: string;
  role: 'coordinator' | 'executor' | 'reviewer';
}

defineProps<Props>();

const router = useRouter();
const store = useMaterialStore();

const roleInfo = {
  coordinator: { icon: '📋', label: '协调员', color: 'bg-primary-100 text-primary-700' },
  executor: { icon: '📦', label: '执行人员', color: 'bg-accent-100 text-accent-700' },
  reviewer: { icon: '✅', label: '复核人员', color: 'bg-info-100 text-info-700' },
};

function goBack() {
  store.setRole(null);
  router.push('/');
}
</script>

<template>
  <header class="bg-white border-b border-gray-200 no-print sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            @click="goBack"
            class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-xl font-bold text-gray-800">{{ title }}</h1>
              <span :class="['tag', roleInfo[role].color]">
                <span class="mr-1">{{ roleInfo[role].icon }}</span>
                {{ roleInfo[role].label }}
              </span>
            </div>
            <p v-if="subtitle" class="text-sm text-gray-500 mt-1">{{ subtitle }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </header>
</template>
