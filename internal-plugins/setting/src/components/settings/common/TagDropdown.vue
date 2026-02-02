<template>
  <div ref="dropdownRef" class="tag-dropdown" :class="{ open: isOpen }">
    <div class="tag-wrapper" @click="toggleDropdown">
      <slot></slot>
    </div>

    <Transition name="dropdown-menu">
      <div v-if="isOpen" class="dropdown-menu" :style="menuStyle">
        <div
          v-for="item in menuItems"
          :key="item.key"
          class="dropdown-item"
          :class="{ danger: item.danger }"
          @click="handleItemClick(item)"
        >
          <Icon v-if="item.icon" :name="item.icon" :size="14" class="item-icon" />
          <span class="item-label">{{ item.label }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from '../../common/Icon.vue'

export interface MenuItem {
  key: string
  label: string
  icon?: string
  danger?: boolean
}

interface Props {
  menuItems: MenuItem[]
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', key: string): void
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement>()
const menuStyle = ref<Record<string, string>>({})

function toggleDropdown(event: MouseEvent): void {
  event.stopPropagation()
  isOpen.value = !isOpen.value

  if (isOpen.value) {
    // 计算菜单位置，确保不超出视口
    const rect = dropdownRef.value?.getBoundingClientRect()
    if (rect) {
      const viewportWidth = window.innerWidth
      const menuWidth = 120 // 预估菜单宽度

      // 如果右侧空间不足，向左对齐
      if (rect.left + menuWidth > viewportWidth) {
        menuStyle.value = { right: '0', left: 'auto' }
      } else {
        menuStyle.value = { left: '0', right: 'auto' }
      }
    }
  }
}

function handleItemClick(item: MenuItem): void {
  emit('select', item.key)
  isOpen.value = false
}

function handleClickOutside(event: MouseEvent): void {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.tag-dropdown {
  position: relative;
  display: inline-block;
}

.tag-wrapper {
  cursor: pointer;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  min-width: 100px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid var(--control-border);
  border-radius: 6px;
  backdrop-filter: blur(100px) saturate(200%) brightness(110%);
  -webkit-backdrop-filter: blur(100px) saturate(200%) brightness(110%);
  overflow: hidden;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  .dropdown-menu {
    background: rgba(48, 48, 48, 0.98);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  color: var(--text-color);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}

.dropdown-item:hover {
  background: var(--hover-bg);
}

.dropdown-item.danger {
  color: var(--danger-color, #ef4444);
}

.dropdown-item.danger:hover {
  background: var(--danger-light-bg, rgba(239, 68, 68, 0.1));
}

.item-icon {
  flex-shrink: 0;
  opacity: 0.8;
}

.item-label {
  flex: 1;
  white-space: nowrap;
}

/* 下拉菜单动画 */
.dropdown-menu-enter-active {
  animation: dropdown-in 0.15s ease-out;
}

.dropdown-menu-leave-active {
  animation: dropdown-out 0.1s ease-in;
}

@keyframes dropdown-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes dropdown-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-4px);
  }
}
</style>
