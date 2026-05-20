import { createRouter, createWebHashHistory } from 'vue-router'
import Landing from '@/views/Landing.vue'
import Camera from '@/views/Camera.vue'
import Analyzing from '@/views/Analyzing.vue'
import Result from '@/views/Result.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Landing },
    { path: '/camera', component: Camera },
    { path: '/analyzing', component: Analyzing },
    { path: '/result', component: Result },
  ],
})
