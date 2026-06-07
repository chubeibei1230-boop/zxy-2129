<script setup lang="ts">
import { onMounted } from 'vue';
import { useMaterialStore } from '@/stores/material';

const store = useMaterialStore();

onMounted(() => {
  store.init();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <router-view />
  </div>
</template>
