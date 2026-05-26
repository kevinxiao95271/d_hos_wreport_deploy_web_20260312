<template>
  <div class="data-dashboard-page">
    <el-card shadow="never" class="filter-card">
      <el-form inline :model="filter" label-width="72px">
        <el-form-item label="任务">
          <el-select
            v-model="filter.taskId"
            placeholder="请选择日常工作任务"
            style="width:360px"
            :loading="taskLoading"
            filterable
            @change="onTaskChange"
          >
            <el-option
              v-for="t in taskList"
              :key="t.id"
              :label="taskOptionLabel(t)"
              :value="t.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="机构维度">
          <el-radio-group v-model="filter.orgCategory" @change="onOrgCategoryChange">
            <el-radio :label="0">所有</el-radio>
            <el-radio :label="1">质控中心</el-radio>
            <el-radio :label="2">技术指导中心</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            :disabled="!filter.taskId"
            @click="loadStats"
          >查 询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="result-card" v-loading="loading">
      <template v-if="stats">
        <div class="summary-bar">
          <div class="summary-card summary-card--period">
            <div class="summary-card-label">任务周期</div>
            <div class="summary-card-value">{{ stats.taskPeriodLabel || stats.taskName }}</div>
          </div>
          <div class="summary-card summary-card--scope">
            <div class="summary-card-label">机构维度</div>
            <div class="summary-card-value">{{ stats.orgCategoryLabel || '所有' }}</div>
          </div>
          <div class="summary-card summary-card--count">
            <div class="summary-card-label">机构数量</div>
            <div class="summary-card-value">{{ stats.orgs?.length || 0 }} 家</div>
          </div>
          <div v-if="showCategoryLegend" class="summary-legend">
            <span class="legend-item">
              <i class="legend-dot legend-dot--qc" />质控中心
            </span>
            <span class="legend-item">
              <i class="legend-dot legend-dot--tech" />技术指导中心
            </span>
          </div>
        </div>

        <el-empty
          v-if="!stats.modules?.length"
          description="当前任务未启用任何统计模块"
          style="margin:40px 0"
        />

        <div v-else class="module-list">
          <template v-for="(mod, idx) in stats.modules" :key="mod.moduleKey">
            <!-- 季度四模块 + 年度任务中同名四模块：柱状图 -->
            <div
              v-if="isBarChartModule(mod.moduleKey)"
              class="chart-card"
              :style="{ '--module-accent': moduleAccentColor(mod.moduleKey, idx) }"
            >
              <div class="chart-card-header">
                <div class="chart-card-title">
                  <span class="chart-card-index">{{ idx + 1 }}</span>
                  <span class="chart-card-name">{{ mod.moduleName }}</span>
                </div>
                <div class="chart-card-meta">
                  <span>合计 <strong>{{ moduleTotal(mod.moduleKey) }}</strong></span>
                  <span>最高 <strong>{{ moduleMax(mod.moduleKey) }}</strong></span>
                  <span>有数据机构 <strong>{{ moduleNonZeroCount(mod.moduleKey) }}</strong> 家</span>
                  <span class="chart-drill-hint">点击柱状图查看明细</span>
                </div>
              </div>
              <div
                :ref="el => setChartRef(mod.moduleKey, el)"
                class="chart-box"
                :style="{ height: `${chartHeights[mod.moduleKey] || 420}px` }"
              />
            </div>

            <!-- 其他模块：有/无展示 -->
            <DashboardPresenceModulePanel
              v-else
              :module="mod"
              :orgs="stats.orgs || []"
              :index="idx"
              :accent-color="moduleAccentColor(mod.moduleKey, idx)"
              :show-category-dot="showCategoryLegend"
              @drill="ctx => openDrilldown(ctx)"
            />
          </template>
        </div>
      </template>

      <el-empty
        v-else-if="!loading"
        description="请选择任务并点击查询"
        style="margin:60px 0"
      />
    </el-card>

    <DashboardModuleDrilldownDrawer ref="drilldownRef" />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { getTaskPage } from '@/api/task'
import { getDwDashboardModuleStats } from '@/api/dailywork'
import { DW_QUARTER_MODULES } from '@/utils/dwTaskModules'
import DashboardModuleDrilldownDrawer from './components/DashboardModuleDrilldownDrawer.vue'
import DashboardPresenceModulePanel from './components/DashboardPresenceModulePanel.vue'

const ORG_COLOR_QC = '#409EFF'
const ORG_COLOR_TECH = '#E6A23C'

const MODULE_PALETTE = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#6e7074'
]

const filter = reactive({
  taskId: null,
  orgCategory: 0
})

const taskList = ref([])
const taskLoading = ref(false)
const loading = ref(false)
const stats = ref(null)
const chartHeights = reactive({})

const chartRefs = new Map()
const chartInstances = new Map()
const drilldownRef = ref(null)

const showCategoryLegend = computed(() => filter.orgCategory === 0 && (stats.value?.orgs?.length || 0) > 0)

function isBarChartModule(moduleKey) {
  return DW_QUARTER_MODULES.includes(moduleKey)
}

function taskOptionLabel(task) {
  const period = task.statQuarter == null
    ? `${task.statYear || ''}年度任务`
    : `${task.statYear || ''}年Q${task.statQuarter}`
  return `${task.taskName}（${period}）`
}

function moduleAccentColor(moduleKey, idx) {
  const modIdx = stats.value?.modules?.findIndex(m => m.moduleKey === moduleKey) ?? idx
  return MODULE_PALETTE[modIdx % MODULE_PALETTE.length]
}

function moduleValues(moduleKey) {
  return (stats.value?.orgs || []).map(o => o.moduleCounts?.[moduleKey] ?? 0)
}

function moduleTotal(moduleKey) {
  return moduleValues(moduleKey).reduce((sum, n) => sum + n, 0)
}

function moduleMax(moduleKey) {
  const vals = moduleValues(moduleKey)
  return vals.length ? Math.max(...vals) : 0
}

function moduleNonZeroCount(moduleKey) {
  return moduleValues(moduleKey).filter(n => n > 0).length
}

function setChartRef(moduleKey, el) {
  if (el) {
    chartRefs.set(moduleKey, el)
  } else {
    chartRefs.delete(moduleKey)
  }
}

function disposeCharts() {
  chartInstances.forEach(inst => inst.dispose())
  chartInstances.clear()
  Object.keys(chartHeights).forEach(k => delete chartHeights[k])
}

function handleBarClick(mod, sortedOrgs, dataIndex) {
  const org = sortedOrgs[dataIndex]
  if (!org) return
  openDrilldown({
    org,
    moduleKey: mod.moduleKey,
    moduleName: mod.moduleName
  })
}

function openDrilldown({ org, moduleKey, moduleName, recordId, orgName, count }) {
  const targetOrg = org || { recordId, orgName, moduleCounts: { [moduleKey]: count } }
  const value = targetOrg.moduleCounts?.[moduleKey] ?? count ?? 0
  if (value <= 0) {
    ElMessage.info('该机构暂无该模块数据')
    return
  }
  const rid = targetOrg.recordId || recordId
  if (!rid) {
    ElMessage.warning('该机构尚未创建上报记录')
    return
  }
  drilldownRef.value?.open({
    recordId: String(rid),
    orgName: targetOrg.orgName || orgName,
    moduleKey,
    moduleName,
    taskPeriodLabel: stats.value?.taskPeriodLabel || stats.value?.taskName || '',
    count: value
  })
}

function resolveBarColor(org, moduleKey, moduleIdx) {
  if (filter.orgCategory === 1 || filter.orgCategory === 2) {
    return moduleAccentColor(moduleKey, moduleIdx)
  }
  return org.orgCategory === 2 ? ORG_COLOR_TECH : ORG_COLOR_QC
}

function calcChartHeight(orgCount) {
  const visibleRows = Math.min(orgCount, 18)
  return Math.max(420, visibleRows * 32 + 120)
}

function buildChartOption(moduleKey, moduleName, orgs, moduleIdx) {
  const sorted = [...(orgs || [])].sort((a, b) => {
    const diff = (b.moduleCounts?.[moduleKey] ?? 0) - (a.moduleCounts?.[moduleKey] ?? 0)
    if (diff !== 0) return diff
    return String(a.orgName || '').localeCompare(String(b.orgName || ''), 'zh-CN')
  })

  const orgNames = sorted.map(o => o.orgName)
  const values = sorted.map(o => ({
    value: o.moduleCounts?.[moduleKey] ?? 0,
    itemStyle: {
      color: resolveBarColor(o, moduleKey, moduleIdx),
      borderRadius: [0, 4, 4, 0]
    }
  }))
  const orgCount = orgNames.length
  const useZoom = orgCount > 18
  const endPercent = useZoom ? Math.round((18 / orgCount) * 100) : 100

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter(params) {
        const p = params?.[0]
        if (!p) return ''
        const org = sorted[p.dataIndex]
        const categoryLabel = org?.orgCategory === 2 ? '技术指导中心' : org?.orgCategory === 1 ? '质控中心' : ''
        const prefix = categoryLabel && filter.orgCategory === 0 ? `[${categoryLabel}] ` : ''
        return `${prefix}${p.name}<br/>${moduleName}：${p.value}<br/><span style="color:#909399;font-size:12px">点击查看明细</span>`
      }
    },
    grid: {
      left: 210,
      right: useZoom ? 56 : 32,
      top: 16,
      bottom: 16,
      containLabel: false
    },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { type: 'dashed', color: '#ebeef5' } },
      axisLabel: { color: '#909399' }
    },
    yAxis: {
      type: 'category',
      data: orgNames,
      inverse: true,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: {
        width: 190,
        overflow: 'truncate',
        fontSize: 14,
        color: '#303133',
        lineHeight: 18
      }
    },
    dataZoom: useZoom ? [
      {
        type: 'slider',
        yAxisIndex: 0,
        orient: 'vertical',
        right: 8,
        width: 14,
        start: 0,
        end: endPercent,
        brushSelect: false,
        showDetail: false
      },
      {
        type: 'inside',
        yAxisIndex: 0,
        start: 0,
        end: endPercent
      }
    ] : [],
    series: [{
      name: moduleName,
      type: 'bar',
      data: values,
      barMaxWidth: 16,
      cursor: 'pointer',
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(64, 158, 255, 0.35)'
        }
      },
      label: {
        show: true,
        position: 'right',
        fontSize: 11,
        color: '#606266',
        formatter: ({ value }) => (value > 0 ? value : '')
      }
    }]
  }
}

function renderCharts() {
  disposeCharts()
  if (!stats.value?.modules?.length) return

  stats.value.modules.forEach((mod, idx) => {
    if (!isBarChartModule(mod.moduleKey)) return
    const el = chartRefs.get(mod.moduleKey)
    if (!el) return
    const sorted = [...(stats.value.orgs || [])].sort((a, b) => {
      const diff = (b.moduleCounts?.[mod.moduleKey] ?? 0) - (a.moduleCounts?.[mod.moduleKey] ?? 0)
      if (diff !== 0) return diff
      return String(a.orgName || '').localeCompare(String(b.orgName || ''), 'zh-CN')
    })
    const orgCount = sorted.length
    chartHeights[mod.moduleKey] = calcChartHeight(orgCount)
    const inst = echarts.init(el)
    inst.setOption(buildChartOption(mod.moduleKey, mod.moduleName, stats.value.orgs, idx))
    inst.off('click')
    inst.on('click', (params) => {
      if (params?.componentType !== 'series') return
      handleBarClick(mod, sorted, params.dataIndex)
    })
    chartInstances.set(mod.moduleKey, inst)
  })
}

function handleResize() {
  chartInstances.forEach(inst => inst.resize())
}

async function loadStats() {
  if (!filter.taskId) {
    ElMessage.warning('请先选择任务')
    return
  }
  loading.value = true
  try {
    const params = { taskId: filter.taskId }
    if (filter.orgCategory === 1 || filter.orgCategory === 2) {
      params.orgCategory = filter.orgCategory
    }
    const res = await getDwDashboardModuleStats(params)
    stats.value = res.data
    await nextTick()
    renderCharts()
  } catch (e) {
    stats.value = null
    disposeCharts()
    ElMessage.error('数据加载失败：' + (e?.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

function onTaskChange() {
  stats.value = null
  disposeCharts()
}

function onOrgCategoryChange() {
  if (filter.taskId) {
    loadStats()
  }
}

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  taskLoading.value = true
  try {
    const res = await getTaskPage({ pageSize: 200 })
    const all = res.data?.records || res.data?.list || []
    taskList.value = all.filter(t => t.taskType === 'daily_work')
  } catch {
    ElMessage.error('任务列表加载失败')
  } finally {
    taskLoading.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  disposeCharts()
})
</script>

<style scoped>
.data-dashboard-page {
  padding-bottom: 40px;
}

.filter-card,
.result-card {
  border-radius: 10px;
}

.result-card {
  margin-top: 12px;
}

.summary-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 20px;
}

.summary-card {
  min-width: 160px;
  padding: 14px 18px;
  border-radius: 10px;
  border: 1px solid transparent;
}

.summary-card-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}

.summary-card-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.summary-card--period {
  background: linear-gradient(135deg, #ecf5ff 0%, #f5f9ff 100%);
  border-color: #d9ecff;
}

.summary-card--scope {
  background: linear-gradient(135deg, #fdf6ec 0%, #fffaf3 100%);
  border-color: #faecd8;
}

.summary-card--count {
  background: linear-gradient(135deg, #f0f9eb 0%, #f8fcf5 100%);
  border-color: #e1f3d8;
}

.summary-legend {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 8px;
  margin-left: auto;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.legend-dot--qc {
  background: #409EFF;
}

.legend-dot--tech {
  background: #E6A23C;
}

.chart-list,
.module-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.chart-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--module-accent) 12%, white), #fff 42%);
  border-bottom: 1px solid #f0f2f5;
  border-left: 4px solid var(--module-accent);
}

.chart-card-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.chart-card-index {
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

.chart-card-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chart-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: #909399;
}

.chart-card-meta strong {
  color: var(--module-accent);
  font-weight: 700;
}

.chart-drill-hint {
  color: #909399;
  font-size: 12px;
}

.chart-box {
  width: 100%;
  min-height: 420px;
  padding: 8px 4px 12px 0;
}
</style>
