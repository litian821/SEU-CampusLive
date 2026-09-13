import { createRouter, createWebHistory } from 'vue-router'
export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', component: () => import('./pages/HomePage.vue'), meta: { title: '东大主场' } },
    { path: '/live', component: () => import('./pages/CatalogPage.vue'), props: { kind: 'live' }, meta: { title: '赛事直播' } },
    { path: '/live/:id', component: () => import('./pages/WatchPage.vue'), props: { kind: 'live' }, meta: { title: '赛事直播' } },
    { path: '/vod', component: () => import('./pages/CatalogPage.vue'), props: { kind: 'vod' }, meta: { title: '精彩回放' } },
    { path: '/vod/:id', component: () => import('./pages/WatchPage.vue'), props: { kind: 'vod' }, meta: { title: '精彩回放' } },
    { path: '/moments', component: () => import('./pages/MomentsPage.vue'), meta: { title: '赛场瞬间' } },
    { path: '/:pathMatch(.*)*', component: () => import('./pages/NotFoundPage.vue'), meta: { title: '页面不存在' } },
  ],
})
