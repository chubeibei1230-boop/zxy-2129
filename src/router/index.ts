import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'RoleSelect',
    component: () => import('@/views/RoleSelect.vue'),
  },
  {
    path: '/coordinator',
    name: 'Coordinator',
    component: () => import('@/views/Coordinator.vue'),
  },
  {
    path: '/executor',
    name: 'Executor',
    component: () => import('@/views/Executor.vue'),
  },
  {
    path: '/reviewer',
    name: 'Reviewer',
    component: () => import('@/views/Reviewer.vue'),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
