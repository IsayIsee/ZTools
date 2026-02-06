<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ConfirmDialog from './components/common/ConfirmDialog.vue'
import Toast from './components/common/Toast.vue'
import Settings from './components/settings/Settings.vue'
import { useToast } from './composables/useToast'

const { toastState, confirmState, handleConfirm, handleCancel } = useToast()

// 当前激活的页面
const activePage = ref<string>('general')

onMounted(() => {
  // 插件进入时根据 feature code 决定显示哪个页面
  window.ztools.onPluginEnter((action) => {
    console.log('设置插件启动:', action)

    // 根据 feature code 设置页面
    const pageMap: Record<string, string> = {
      settings: 'general',
      shortcuts: 'shortcuts',
      plugins: 'plugins',
      'plugin-market': 'market',
      'ai-models': 'ai-models',
      data: 'data',
      'all-commands': 'all-commands',
      sync: 'sync'
    }

    const targetPage = pageMap[action.code] || 'general'
    console.log(`跳转到页面: ${targetPage}`)
    activePage.value = targetPage
  })

  window.ztools.onPluginOut(() => {
    console.log('设置插件退出')
  })

  // 检测操作系统并添加类名
  const userAgent = navigator.userAgent.toLowerCase()
  const platform = navigator.platform.toLowerCase()

  if (platform.includes('win') || userAgent.includes('windows')) {
    document.documentElement.classList.add('os-windows')
  } else if (platform.includes('mac') || userAgent.includes('mac')) {
    document.documentElement.classList.add('os-mac')
  }

  // 初始化时获取当前窗口材质
  if (window.ztools.internal.getWindowMaterial) {
    window.ztools.internal.getWindowMaterial().then((material) => {
      console.log('设置插件初始化材质:', material)
      document.documentElement.setAttribute('data-material', material)
    })
  }

  // 监听窗口材质更新
  if (window.ztools.internal.onUpdateWindowMaterial) {
    window.ztools.internal.onUpdateWindowMaterial((material: 'mica' | 'acrylic' | 'none') => {
      console.log('设置插件收到材质更新:', material)
      document.documentElement.setAttribute('data-material', material)
    })
  }
})
</script>

<template>
  <Settings v-model:active-page="activePage" />
  <!-- 全局Toast组件 -->
  <Toast
    v-model:visible="toastState.visible"
    :message="toastState.message"
    :type="toastState.type"
    :duration="toastState.duration"
  />
  <!-- 全局确认对话框 -->
  <ConfirmDialog
    v-model:visible="confirmState.visible"
    :title="confirmState.title"
    :message="confirmState.message"
    :type="confirmState.type"
    :confirm-text="confirmState.confirmText"
    :cancel-text="confirmState.cancelText"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  />
</template>
