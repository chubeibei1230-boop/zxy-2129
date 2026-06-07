<script setup lang="ts">
import { watch } from 'vue';

interface Props {
  visible: boolean;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
});

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
}>();

function close() {
  emit('update:visible', false);
  emit('close');
}

function onOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    close();
  }
}

watch(() => props.visible, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click="onOverlayClick">
        <div class="modal-content animate-slide-up">
          <div class="flex items-center justify-between p-6 border-b border-gray-100">
            <h3 class="text-lg font-bold text-gray-800">{{ title }}</h3>
            <button
              @click="close"
              class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="p-6">
            <slot />
          </div>
          <div class="flex items-center justify-end gap-3 p-6 pt-0">
            <slot name="footer">
              <button @click="close" class="btn btn-outline">
                取消
              </button>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: translateY(20px) scale(0.95);
}
</style>
