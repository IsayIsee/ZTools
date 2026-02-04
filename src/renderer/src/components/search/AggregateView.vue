<template>
  <div class="aggregate-view">
    <!-- 无搜索时：历史记录 + 固定列表 + 访达 -->
    <div v-if="!hasSearchContent" class="content-section">
      <!-- 最近使用 -->
      <CollapsibleList
        v-if="showRecentInSearch"
        :expanded="recentExpanded"
        title="最近使用"
        :apps="displayApps"
        :selected-index="getAbsoluteIndexForSection('apps')"
        :empty-text="loading ? '正在加载应用...' : '未找到应用'"
        :default-visible-rows="recentRows"
        :draggable="false"
        @select="$emit('select', $event)"
        @contextmenu="(app) => $emit('contextmenu', app, false, false)"
        @update:expanded="$emit('update:recent-expanded', $event)"
      />

      <!-- 固定栏 -->
      <CollapsibleList
        :expanded="pinnedExpanded"
        title="已固定"
        :apps="pinnedApps"
        :selected-index="getAbsoluteIndexForSection('pinned')"
        :default-visible-rows="pinnedRows"
        :draggable="true"
        @select="$emit('select', $event)"
        @contextmenu="(app) => $emit('contextmenu', app, false, true)"
        @update:apps="$emit('update:pinned-order', $event)"
        @update:expanded="$emit('update:pinned-expanded', $event)"
      />

      <!-- 访达 -->
      <CollapsibleList
        v-if="finderActions.length > 0"
        title="访达"
        :apps="finderActions"
        :selected-index="getAbsoluteIndexForSection('finder')"
        :empty-text="''"
        :draggable="false"
        @select="$emit('select-finder', $event)"
      />
    </div>

    <!-- 有搜索时：搜索结果 -->
    <div v-if="hasSearchContent" class="search-results">
      <!-- 最佳搜索结果（模糊搜索） -->
      <CollapsibleList
        v-if="bestSearchResults.length > 0"
        :expanded="searchResultsExpanded"
        title="最佳搜索结果"
        :apps="bestSearchResults"
        :selected-index="getAbsoluteIndexForSection('bestSearch')"
        :empty-text="'未找到应用'"
        :default-visible-rows="2"
        :draggable="false"
        :search-query="searchQuery"
        @select="$emit('select', $event)"
        @contextmenu="(app) => $emit('contextmenu', app, true, false)"
        @update:expanded="$emit('update:search-results-expanded', $event)"
      />

      <!-- 最佳匹配（匹配指令：regex/img/files） -->
      <CollapsibleList
        v-if="bestMatches.length > 0"
        :expanded="bestMatchesExpanded"
        title="最佳匹配"
        :apps="bestMatches"
        :selected-index="getAbsoluteIndexForSection('bestMatch')"
        :empty-text="''"
        :default-visible-rows="2"
        :draggable="false"
        :search-query="searchQuery"
        @select="$emit('select', $event)"
        @contextmenu="(app) => $emit('contextmenu', app, true, false)"
        @update:expanded="$emit('update:best-matches-expanded', $event)"
      />

      <!-- 匹配推荐（over 类型） -->
      <CollapsibleList
        :expanded="recommendationsExpanded"
        title="匹配推荐"
        :apps="recommendations"
        :selected-index="getAbsoluteIndexForSection('recommendation')"
        :empty-text="''"
        :default-visible-rows="2"
        :draggable="false"
        :search-query="searchQuery"
        @select="$emit('select-recommendation', $event)"
        @update:expanded="$emit('update:recommendations-expanded', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CollapsibleList from '../common/CollapsibleList.vue'

interface Props {
  searchQuery: string
  pastedImage?: string | null
  pastedFiles?: any[] | null
  pastedText?: string | null
  bestSearchResults: any[]
  bestMatches: any[]
  recommendations: any[]
  displayApps: any[]
  pinnedApps: any[]
  finderActions: any[]
  navigationGrid: any[]
  selectedRow: number
  selectedCol: number
  loading: boolean
  showRecentInSearch: boolean
  recentRows: number
  pinnedRows: number
  recentExpanded?: boolean
  pinnedExpanded?: boolean
  searchResultsExpanded?: boolean
  bestMatchesExpanded?: boolean
  recommendationsExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  recentExpanded: false,
  pinnedExpanded: false,
  searchResultsExpanded: false,
  bestMatchesExpanded: false,
  recommendationsExpanded: false
})

defineEmits<{
  select: [app: any]
  'select-finder': [item: any]
  'select-recommendation': [item: any]
  contextmenu: [app: any, fromSearch: boolean, fromPinned: boolean]
  'update:pinned-order': [apps: any[]]
  'height-changed': []
  'update:recent-expanded': [value: boolean]
  'update:pinned-expanded': [value: boolean]
  'update:search-results-expanded': [value: boolean]
  'update:best-matches-expanded': [value: boolean]
  'update:recommendations-expanded': [value: boolean]
}>()

// 是否有搜索内容
const hasSearchContent = computed(() => {
  return !!(props.searchQuery.trim() || props.pastedImage || props.pastedText || props.pastedFiles)
})

// 计算指定类型在列表中的绝对索引
function getAbsoluteIndexForSection(sectionType: string): number {
  const grid = props.navigationGrid
  if (grid.length === 0 || props.selectedRow >= grid.length) {
    return -1
  }

  const currentRow = grid[props.selectedRow]
  if (currentRow.type !== sectionType) {
    return -1
  }

  // 找到该类型的起始行
  let startRow = 0
  for (let i = 0; i < grid.length; i++) {
    if (grid[i].type === sectionType) {
      startRow = i
      break
    }
  }

  // 计算相对于起始行的索引
  return (props.selectedRow - startRow) * 9 + props.selectedCol
}
</script>

<style scoped>
.aggregate-view {
  display: flex;
  flex-direction: column;
}

.content-section {
  flex: 1;
}

.search-results {
  display: flex;
  flex-direction: column;
}
</style>
