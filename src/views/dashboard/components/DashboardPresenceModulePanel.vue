<template>
  <div
    class="presence-card"
    :style="{ '--module-accent': accentColor }"
  >
    <div class="presence-card-header">
      <div class="presence-card-title">
        <span class="presence-card-index">{{ index + 1 }}</span>
        <span class="presence-card-name">{{ module.moduleName }}</span>
      </div>
      <div class="presence-card-meta">
        <span>已填报 <strong>{{ yesCount }}</strong> 家</span>
        <span>未填报 <strong>{{ noCount }}</strong> 家</span>
        <span class="presence-drill-hint">点击「有」查看明细</span>
      </div>
    </div>

    <div class="presence-toolbar">
      <el-radio-group v-model="viewFilter" size="small">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="yes">仅有</el-radio-button>
        <el-radio-button label="no">仅无</el-radio-button>
      </el-radio-group>
      <el-input
        v-model="keyword"
        clearable
        size="small"
        placeholder="搜索机构"
        class="presence-search"
      />
    </div>

    <div class="presence-grid">
      <div
        v-for="org in filteredOrgs"
        :key="org.orgId"
        :class="[
          'presence-org',
          orgHasData(org) ? 'presence-org--yes' : 'presence-org--no',
          orgHasData(org) ? 'presence-org--clickable' : ''
        ]"
        @click="onOrgClick(org)"
      >
        <span
          v-if="showCategoryDot"
          :class="['presence-org-dot', org.orgCategory === 2 ? 'presence-org-dot--tech' : 'presence-org-dot--qc']"
        />
        <span class="presence-org-name" :title="org.orgName">{{ org.orgName }}</span>
        <el-tag
          :type="orgHasData(org) ? 'success' : 'info'"
          size="small"
          effect="plain"
          class="presence-org-tag"
        >{{ orgHasData(org) ? '有' : '无' }}</el-tag>
      </div>
    </div>

    <el-empty
      v-if="!filteredOrgs.length"
      description="无匹配机构"
      :image-size="64"
      style="padding:24px 0"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  module: { type: Object, required: true },
  orgs: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
  accentColor: { type: String, default: '#5470c6' },
  showCategoryDot: { type: Boolean, default: false }
})

const emit = defineEmits(['drill'])

const viewFilter = ref('all')
const keyword = ref('')

function orgHasData(org) {
  return (org.moduleCounts?.[props.module.moduleKey] ?? 0) > 0
}

const sortedOrgs = computed(() => {
  return [...(props.orgs || [])].sort((a, b) => {
    const aHas = orgHasData(a) ? 1 : 0
    const bHas = orgHasData(b) ? 1 : 0
    if (aHas !== bHas) return bHas - aHas
    return String(a.orgName || '').localeCompare(String(b.orgName || ''), 'zh-CN')
  })
})

const filteredOrgs = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return sortedOrgs.value.filter(org => {
    if (viewFilter.value === 'yes' && !orgHasData(org)) return false
    if (viewFilter.value === 'no' && orgHasData(org)) return false
    if (kw && !String(org.orgName || '').toLowerCase().includes(kw)) return false
    return true
  })
})

const yesCount = computed(() => sortedOrgs.value.filter(orgHasData).length)
const noCount = computed(() => sortedOrgs.value.length - yesCount.value)

function onOrgClick(org) {
  if (!orgHasData(org)) {
    ElMessage.info('该机构暂无该模块数据')
    return
  }
  if (!org.recordId) {
    ElMessage.warning('该机构尚未创建上报记录')
    return
  }
  emit('drill', {
    recordId: String(org.recordId),
    orgName: org.orgName,
    moduleKey: props.module.moduleKey,
    moduleName: props.module.moduleName,
    count: org.moduleCounts?.[props.module.moduleKey] ?? 1
  })
}
</script>

<style scoped>
.presence-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.presence-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--module-accent) 10%, white), #fff 42%);
  border-bottom: 1px solid #f0f2f5;
  border-left: 4px solid var(--module-accent);
}

.presence-card-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.presence-card-index {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--module-accent);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.presence-card-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.presence-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: #909399;
}

.presence-card-meta strong {
  color: var(--module-accent);
  font-weight: 700;
}

.presence-drill-hint {
  color: #909399;
  font-size: 12px;
}

.presence-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid #f5f7fa;
  background: #fafbfc;
}

.presence-search {
  width: 220px;
  margin-left: auto;
}

.presence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  padding: 16px 18px 18px;
}

.presence-org {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  background: #fafafa;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

.presence-org--yes {
  background: #f6ffed;
  border-color: #d9f7be;
}

.presence-org--no {
  background: #fafafa;
  border-color: #ebeef5;
}

.presence-org--clickable {
  cursor: pointer;
}

.presence-org--clickable:hover {
  border-color: #95de64;
  box-shadow: 0 2px 8px rgba(82, 196, 26, 0.12);
}

.presence-org-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.presence-org-dot--qc {
  background: #409EFF;
}

.presence-org-dot--tech {
  background: #E6A23C;
}

.presence-org-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.presence-org-tag {
  flex-shrink: 0;
}
</style>
