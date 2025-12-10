<template>
  <div class="all-commands-container">
    <!-- 左侧：来源列表 -->
    <div class="sources-panel">
      <div class="panel-header">
        <h3>指令来源</h3>
      </div>
      <div class="sources-list">
        <!-- 系统应用 -->
        <div 
          :class="['source-item', { active: selectedSource?.subType === 'app' }]"
          @click="selectSource({ subType: 'app', name: '系统应用' })"
        >
          <span class="source-icon">💻</span>
          <span class="source-name">系统应用</span>
          <span class="source-badge">{{ appCount }}</span>
        </div>

        <!-- 系统设置 -->
        <div 
          v-if="settingCount > 0"
          :class="['source-item', { active: selectedSource?.subType === 'system-setting' }]"
          @click="selectSource({ subType: 'system-setting', name: '系统设置' })"
        >
          <span class="source-icon">⚙️</span>
          <span class="source-name">系统设置</span>
          <span class="source-badge">{{ settingCount }}</span>
        </div>

        <!-- 插件分组标题 -->
        <div v-if="plugins.length > 0" class="section-divider">
          <span>插件</span>
        </div>

        <!-- 插件列表 -->
        <div
          v-for="plugin in plugins"
          :key="plugin.path"
          :class="['source-item', { active: selectedSource?.path === plugin.path }]"
          @click="selectSource(plugin)"
        >
          <img v-if="plugin.logo" :src="plugin.logo" class="source-icon plugin-icon" />
          <span v-else class="source-icon">🧩</span>
          <span class="source-name">{{ plugin.name }}</span>
          <span class="source-badge">{{ getPluginCommandCount(plugin) }}</span>
        </div>
      </div>
    </div>

    <!-- 右侧：指令详情 -->
    <div class="commands-panel">
      <!-- 头部 -->
      <div class="panel-header">
        <h3>{{ selectedSource?.name || '选择一个来源查看指令' }}</h3>
        
        <!-- Tab 切换 -->
        <div v-if="hasCommands" class="tab-group">
          <button
            :class="['tab-btn', { active: activeTab === 'text' }]"
            @click="activeTab = 'text'"
          >
            功能指令
            <span class="tab-count">{{ textCommands.length }}</span>
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'match' }]"
            @click="activeTab = 'match'"
          >
            匹配指令
            <span class="tab-count">{{ matchCommands.length }}</span>
          </button>
        </div>
      </div>

      <!-- 指令列表 -->
      <div class="commands-content">
        <!-- 未选择来源 -->
        <div v-if="!selectedSource" class="empty-state">
          <span class="empty-icon">📋</span>
          <p>从左侧选择一个来源查看指令</p>
        </div>

        <!-- 功能指令 Tab -->
        <div v-else-if="activeTab === 'text'" class="command-list">
          <div v-if="textCommands.length === 0" class="empty-state">
            <span class="empty-icon">🔍</span>
            <p>暂无功能指令</p>
          </div>
          <div
            v-for="(cmd, index) in textCommands"
            :key="index"
            class="card command-card"
          >
            <div class="command-icon">
              <img 
                v-if="cmd.icon && !cmd.icon.match(/^[^\w]/)" 
                :src="cmd.icon"
                :class="{ 'system-setting-icon': cmd.subType === 'system-setting' }"
                @error="() => console.error('图标加载失败:', cmd.name, cmd.icon)"
              />
              <span v-else class="icon-emoji">{{ cmd.icon || '📄' }}</span>
            </div>
            <div class="command-details">
              <div class="command-title">{{ cmd.name }}</div>
              <div class="command-meta">
                <!-- 插件指令：显示 featureCode 和说明 -->
                <template v-if="cmd.type === 'plugin'">
                  <span v-if="cmd.featureCode" class="meta-tag">{{ cmd.featureCode }}</span>
                  <span v-if="cmd.pluginExplain" class="meta-desc">{{ cmd.pluginExplain }}</span>
                </template>
                <!-- 系统应用：显示路径 -->
                <template v-else-if="cmd.subType === 'app'">
                  <span class="meta-path">{{ cmd.path }}</span>
                </template>
                <!-- 系统设置：显示 URI 和分类 -->
                <template v-else-if="cmd.subType === 'system-setting'">
                  <span v-if="cmd.category" class="meta-tag">{{ cmd.category }}</span>
                  <span class="meta-path">{{ cmd.settingUri || cmd.path }}</span>
                </template>
              </div>
            </div>
            <span class="type-badge badge-text">功能</span>
          </div>
        </div>

        <!-- 匹配指令 Tab -->
        <div v-else-if="activeTab === 'match'" class="command-list">
          <div v-if="matchCommands.length === 0" class="empty-state">
            <span class="empty-icon">🔍</span>
            <p>暂无匹配指令</p>
          </div>
          <div
            v-for="(cmd, index) in matchCommands"
            :key="index"
            class="card command-card"
          >
            <div class="command-icon">
              <img v-if="cmd.icon && !cmd.icon.match(/^[^\w]/)" :src="cmd.icon" />
              <span v-else class="icon-emoji">{{ cmd.icon || '🔍' }}</span>
            </div>
            <div class="command-details">
              <div class="command-title">{{ cmd.name }}</div>
              <div class="command-meta">
                <span v-if="cmd.featureCode" class="meta-tag">{{ cmd.featureCode }}</span>
                <span v-if="cmd.matchCmd" class="match-rule">
                  <template v-if="cmd.matchCmd.type === 'regex'">
                    正则: <code>{{ cmd.matchCmd.match }}</code>
                  </template>
                  <template v-else-if="cmd.matchCmd.type === 'over'">
                    任意文本 (长度: {{ cmd.matchCmd.minLength }}-{{ cmd.matchCmd.maxLength || 10000 }})
                  </template>
                </span>
              </div>
            </div>
            <span :class="['type-badge', `badge-${cmd.cmdType}`]">
              {{ cmd.cmdType === 'regex' ? '正则' : '任意' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAppDataStore } from '../stores/appDataStore'

const appDataStore = useAppDataStore()

interface Source {
  type?: string
  subType?: string
  name: string
  path?: string
  logo?: string
}

const plugins = ref<any[]>([])
const selectedSource = ref<Source | null>(null)
const activeTab = ref<'text' | 'match'>('text')

// 所有指令
const allCommands = computed(() => appDataStore.apps)
const allRegexCommands = computed(() => appDataStore.regexApps)

// 统计
const appCount = computed(() => 
  allCommands.value.filter(c => c.type === 'direct' && c.subType === 'app').length
)

const settingCount = computed(() => 
  allCommands.value.filter(c => c.type === 'direct' && c.subType === 'system-setting').length
)

// 当前选中来源的指令
const textCommands = computed(() => {
  if (!selectedSource.value) return []
  
  const source = selectedSource.value
  
  if (source.subType === 'app') {
    return allCommands.value.filter(c => c.type === 'direct' && c.subType === 'app')
  }
  
  if (source.subType === 'system-setting') {
    return allCommands.value.filter(c => c.type === 'direct' && c.subType === 'system-setting')
  }
  
  // 插件：只显示有 featureCode 的指令（排除插件名本身）
  if (source.path) {
    return allCommands.value.filter(c => 
      c.type === 'plugin' && c.path === source.path && c.cmdType === 'text' && c.featureCode
    )
  }
  
  return []
})

const matchCommands = computed(() => {
  if (!selectedSource.value) return []
  
  const source = selectedSource.value
  
  // 系统应用和系统设置没有匹配指令
  if (source.subType === 'app' || source.subType === 'system-setting') {
    return []
  }
  
  // 插件的匹配指令
  if (source.path) {
    return allRegexCommands.value.filter(c => 
      c.path === source.path
    )
  }
  
  return []
})

const hasCommands = computed(() => 
  textCommands.value.length > 0 || matchCommands.value.length > 0
)

// 获取插件指令数量（排除插件名本身）
function getPluginCommandCount(plugin: any): number {
  const textCount = allCommands.value.filter(c => 
    c.type === 'plugin' && c.path === plugin.path && c.featureCode // 只统计有 featureCode 的指令
  ).length
  const matchCount = allRegexCommands.value.filter(c => 
    c.path === plugin.path
  ).length
  return textCount + matchCount
}

// 选择来源
function selectSource(source: Source): void {
  selectedSource.value = source
  activeTab.value = 'text'
}

// 初始化
onMounted(async () => {
  plugins.value = await window.ztools.getPlugins()
  // 默认选中系统应用
  if (appCount.value > 0) {
    selectSource({ subType: 'app', name: '系统应用' })
  }
})
</script>

<style scoped>
.all-commands-container {
  display: flex;
  height: 100%;
  background: var(--bg-color);
}

/* === 左侧面板 === */
.sources-panel {
  width: 220px;
  border-right: 1px solid var(--divider-color);
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--divider-color);
}

.panel-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color);
}

.sources-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

/* 自定义滚动条 */
.sources-list::-webkit-scrollbar {
  width: 6px;
}

.sources-list::-webkit-scrollbar-track {
  background: transparent;
}

.sources-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.sources-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.source-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-color);
}

.source-item:hover {
  background: var(--hover-bg);
}

.source-item.active {
  background: var(--active-bg);
  color: var(--primary-color);
  font-weight: 500;
}

.source-icon {
  width: 20px;
  height: 20px;
  margin-right: 10px;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.plugin-icon {
  border-radius: 4px;
  object-fit: contain;
}

.source-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-badge {
  padding: 2px 6px;
  font-size: 11px;
  background: var(--control-bg);
  color: var(--text-secondary);
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.source-item.active .source-badge {
  background: var(--primary-light-bg);
  color: var(--primary-color);
}

.section-divider {
  margin: 12px 0 8px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* === 右侧面板 === */
.commands-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.commands-panel .panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--divider-color);
  background: var(--card-bg);
}

.commands-panel .panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

/* Tab 切换组 */
.tab-group {
  display: flex;
  gap: 6px;
  background: var(--control-bg);
  padding: 3px;
  border-radius: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.tab-btn:hover {
  background: var(--hover-bg);
  color: var(--text-color);
}

.tab-btn.active {
  background: var(--bg-color);
  color: var(--primary-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-count {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--control-bg);
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.tab-btn.active .tab-count {
  background: var(--primary-light-bg);
  color: var(--primary-color);
}

/* === 指令列表 === */
.commands-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.commands-content::-webkit-scrollbar {
  width: 6px;
}

.commands-content::-webkit-scrollbar-track {
  background: transparent;
}

.commands-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.commands-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.command-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.command-card {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  cursor: default;
  transition: all 0.2s;
}

.command-card:hover {
  background: var(--hover-bg);
  transform: translateX(2px);
}

.command-icon {
  width: 36px;
  height: 36px;
  margin-right: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.command-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 6px;
}

/* 系统设置图标在亮色模式下反转颜色 */
.command-icon img.system-setting-icon {
  filter: var(--system-icon-filter);
}

.icon-emoji {
  font-size: 24px;
}

.command-details {
  flex: 1;
  min-width: 0;
}

.command-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 4px;
}

.command-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.meta-tag {
  padding: 2px 8px;
  font-size: 11px;
  font-family: monospace;
  background: var(--control-bg);
  color: var(--text-secondary);
  border-radius: 4px;
}

.meta-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.meta-path {
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', monospace;
  color: var(--text-secondary);
  opacity: 0.7;
  word-break: break-all;
}

.match-rule {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.match-rule code {
  font-family: monospace;
  padding: 2px 6px;
  background: var(--control-bg);
  border-radius: 3px;
  font-size: 11px;
}

.type-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.badge-text {
  background: var(--primary-light-bg);
  color: var(--primary-color);
}

.badge-regex {
  background: var(--warning-light-bg);
  color: var(--warning-color);
}

.badge-over {
  background: var(--purple-light-bg);
  color: var(--purple-color);
}

/* === 空状态 === */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}
</style>
