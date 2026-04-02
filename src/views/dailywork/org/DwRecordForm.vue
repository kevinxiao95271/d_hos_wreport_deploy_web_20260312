<template>
  <div class="dw-form-page" v-loading="pageLoading">

    <!-- 顶部信息栏 -->
    <el-page-header @back="$router.back()" style="margin-bottom:16px">
      <template #content>
        <span>{{ detail.taskName }}</span>
        <el-tag :type="statusType(detail.status)" size="small" style="margin-left:10px">
          {{ statusLabel(detail.status) }}
        </el-tag>
      </template>
    </el-page-header>

    <!-- 驳回原因 -->
    <el-alert
      v-if="detail.status === 3 && detail.auditRemark"
      type="error" :closable="false" show-icon style="margin-bottom:16px"
      :title="`驳回原因：${detail.auditRemark}`"
    />

    <!-- 各模块卡片 -->
    <template v-for="mod in enabledModules" :key="mod.moduleKey">
      <el-card shadow="never" class="module-card">
        <template #header>
          <div class="module-header" @click="toggleModule(mod.moduleKey)" style="cursor:pointer">
            <div class="module-header-left">
              <el-icon :class="['toggle-icon', { 'is-collapsed': isCollapsed(mod.moduleKey) }]"><ArrowDown /></el-icon>
              <span class="module-name">{{ mod.moduleName }}</span>
              <div v-if="mod.scoreMax" class="score-strip score-strip--header">
                <span class="score-field"><span class="score-field-label">满分</span><span class="score-field-val score-field-val--max">{{ mod.scoreMax }}</span></span>
                <span class="score-field"><span class="score-field-label">自评分</span><span class="score-field-val score-field-val--self">{{ moduleSelfScores[mod.moduleKey] ?? '—' }}</span></span>
              </div>
            </div>
            <div v-if="mod.scoreDesc" class="module-score-desc">
              <span class="score-desc-label">考核说明</span>
              <span class="score-desc-text">{{ mod.scoreDesc }}</span>
            </div>
          </div>
        </template>

        <div v-show="!isCollapsed(mod.moduleKey)">

        <!-- 模块自评分输入行 -->
        <div v-if="editable && mod.scoreMax" class="module-self-score-editor" @click.stop>
          <div class="score-strip score-strip--bar">
            <span class="score-field"><span class="score-field-label">满分</span><span class="score-field-val score-field-val--max">{{ mod.scoreMax }}</span></span>
            <span class="score-field score-field--input">
              <span class="score-field-label">自评分</span>
              <el-input-number
                v-model="moduleSelfScores[mod.moduleKey]"
                :min="0" :max="mod.scoreMax" :precision="1" :step="0.5"
                size="small"
                class="self-score-input"
                controls-position="right"
              />
            </span>
          </div>
          <el-button
            size="small" type="primary"
            :loading="savingSelfScoreKey === mod.moduleKey"
            @click.stop="saveModuleSelfScore(mod)"
          >保存自评分</el-button>
        </div>

        <!-- ① 多条记录型：meeting / training / guidance / survey -->
        <template v-if="isListModule(mod.moduleKey)">
          <DwSubList
            :module-key="mod.moduleKey"
            :module-config="mod"
            :items="getListItems(mod.moduleKey)"
            :record-id="detail.recordId"
            :editable="editable"
            @saved="reloadDetail"
            @deleted="reloadDetail"
          />
        </template>

        <!-- ② 加分项：支持 bonus / bonus_pub / bonus_comp 三种 key -->
        <template v-else-if="isBonusModule(mod.moduleKey)">
          <template v-if="mod.moduleKey !== 'bonus_comp'">
            <div class="bonus-section">
              <p v-if="mod.moduleKey === 'bonus'" class="bonus-type-label">丛书 / 指南 / 共识出版</p>
              <DwBonusList
                bonus-type="publication"
                :module-config="mod"
                :items="getBonusItems('publication')"
                :record-id="detail.recordId"
                :editable="editable"
                @saved="reloadDetail"
                @deleted="reloadDetail"
              />
            </div>
          </template>
          <el-divider v-if="mod.moduleKey === 'bonus'" style="margin:16px 0" />
          <template v-if="mod.moduleKey !== 'bonus_pub'">
            <div class="bonus-section">
              <p v-if="mod.moduleKey === 'bonus'" class="bonus-type-label">竞赛组织与主办</p>
              <DwBonusList
                bonus-type="competition"
                :module-config="mod"
                :items="getBonusItems('competition')"
                :record-id="detail.recordId"
                :editable="editable"
                @saved="reloadDetail"
                @deleted="reloadDetail"
              />
            </div>
          </template>
        </template>

        <!-- ③ 经费执行（特殊表单） -->
        <template v-else-if="mod.moduleKey === 'funding'">
          <DwFundingForm
            :module-config="mod"
            :funding="detail.funding"
            :extra-values="detail.fundingExtra"
            :record-id="detail.recordId"
            :editable="editable"
            @saved="reloadDetail"
          />
        </template>

        <!-- ④ 纯上传模块 -->
        <template v-else>
          <DwFileModule
            :module-key="mod.moduleKey"
            :module-config="mod"
            :record="detail"
            :record-id="detail.recordId"
            :editable="editable"
            @uploaded="reloadDetail"
            @deleted="reloadDetail"
          />
        </template>
        </div><!-- /v-show collapse body -->
      </el-card>
    </template>

    <!-- 提交栏 -->
    <div v-if="editable" class="submit-bar">
      <el-button size="large" @click="showDraftTip">保存草稿</el-button>
      <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
        提交上报
      </el-button>
      <span class="submit-hint">各模块数据保存后自动留存，提交前可随时修改</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { getDwModules, initDwRecord, getDwRecord, submitDwRecord, saveDwFieldValues, getDwYearSummary } from '@/api/dailywork'
import DwSubList    from './components/DwSubList.vue'
import DwBonusList  from './components/DwBonusList.vue'
import DwFundingForm from './components/DwFundingForm.vue'
import DwFileModule from './components/DwFileModule.vue'

const route      = useRoute()
const taskId     = route.params.taskId
const pageLoading = ref(true)
const submitting  = ref(false)
const modules     = ref([])
const detail      = ref({ status: 0, meetings: [], trainings: [], guidances: [], surveys: [], bonuses: [], funding: null, fundingExtra: {} })
const moduleSelfScores   = ref({})
const savingSelfScoreKey = ref(null)

const LIST_MODULES      = ['meeting', 'training', 'guidance', 'survey']
const FILE_MODULES      = ['annual_work', 'it_construction', 'work_plan', 'admin_response', 'activity_report']
const QUARTERLY_MODULES = ['meeting', 'training', 'guidance', 'survey']
const DETAIL_KEY        = { meeting: 'meetings', training: 'trainings', guidance: 'guidances', survey: 'surveys' }

const yearSummaryRows = ref([])

const enabledModules = computed(() => {
  const all = (modules.value || []).filter(m => m.isEnabled)
  const keys = detail.value.enabledModuleKeys
  if (Array.isArray(keys) && keys.length) {
    const set = new Set(keys)
    return all.filter(m => set.has(m.moduleKey))
  }
  return all
})

/** 年度任务（statQuarter=null）：旁挂季度参考面板 */
const isAnnualTask = computed(() => detail.value.taskType === 'daily_work' && detail.value.statQuarter == null && !!detail.value.statYear)

const editable       = computed(() => detail.value.status === 0 || detail.value.status === 3)

// 模块折叠状态
const collapsedKeys = ref(new Set())
function toggleModule(key) {
  const s = new Set(collapsedKeys.value)
  s.has(key) ? s.delete(key) : s.add(key)
  collapsedKeys.value = s
}
function isCollapsed(key) { return collapsedKeys.value.has(key) }

function isListModule(key) { return LIST_MODULES.includes(key) }
function isBonusModule(key) {
  return key === 'bonus' || key === 'bonus_pub' || key === 'bonus_comp'
}

function getListItems(key) {
  const own = (detail.value[DETAIL_KEY[key]] || []).map(i => ({
    ...i, _readOnly: detail.value.readOnly === true, _fromQuarter: null,
  }))
  // 年度任务：把 Q1-Q4 已通过条目混入前方（灰态）
  if (isAnnualTask.value && QUARTERLY_MODULES.includes(key)) {
    const sk = { meeting: 'meetingStartDate', training: 'trainingStartDate', guidance: 'guidanceStartDate', survey: 'surveyStartDate' }[key]
    const quarterly = yearSummaryRows.value.flatMap(row =>
      (row.detail?.[DETAIL_KEY[key]] ?? []).map(i => ({ ...i, _readOnly: true, _fromQuarter: row.statQuarter }))
    )
    const sortedQ = sk ? [...quarterly].sort((a, b) => (b[sk] || '').localeCompare(a[sk] || '')) : quarterly
    return [...sortedQ, ...own]
  }
  return own
}

function getBonusItems(bonusType) {
  return (detail.value.bonuses || []).filter(b => b.bonusType === bonusType)
}

function initModuleSelfScores(scores) {
  moduleSelfScores.value = scores ? { ...scores } : {}
}

async function loadAll() {
  pageLoading.value = true
  try {
    const [modRes, initRes] = await Promise.all([getDwModules(), initDwRecord(taskId)])
    modules.value = modRes.data || []
    const initData = initRes.data || {}
    detail.value = initData
    if (initData.recordId) {
      const recRes = await getDwRecord(initData.recordId)
      const rec = recRes.data || {}
      detail.value = { ...initData, ...rec }
      initModuleSelfScores(rec.moduleSelfScores)
    } else {
      initModuleSelfScores(initData.moduleSelfScores)
    }
    // 年度任务：加载已通过季度数据，供各模块混入展示（灰态只读）
    if (isAnnualTask.value && detail.value.statYear) {
      const res = await getDwYearSummary({ statYear: detail.value.statYear, approvedOnly: true }).catch(() => ({ data: [] }))
      yearSummaryRows.value = (res.data || []).filter(r => r.statQuarter != null && r.detail)
    }
  } finally {
    pageLoading.value = false
  }
}

async function reloadDetail() {
  try {
    const initRes = await initDwRecord(taskId)
    const initData = initRes.data || {}
    detail.value = initData
    if (initData.recordId) {
      const recRes = await getDwRecord(initData.recordId)
      const rec = recRes.data || {}
      detail.value = { ...initData, ...rec }
      initModuleSelfScores(rec.moduleSelfScores)
    } else {
      initModuleSelfScores(initData.moduleSelfScores)
    }
  } catch { /* ignore */ }
}


async function saveModuleSelfScore(mod) {
  const score = moduleSelfScores.value[mod.moduleKey]
  if (score === null || score === undefined || score === '') {
    ElMessage.warning('请输入自评分')
    return
  }
  if (score < 0 || score > mod.scoreMax) {
    ElMessage.warning(`自评分须在 0 ~ ${mod.scoreMax} 之间`)
    return
  }
  savingSelfScoreKey.value = mod.moduleKey
  try {
    await saveDwFieldValues({
      recordId: detail.value.recordId,
      moduleKey: mod.moduleKey,
      subRecordId: null,
      values: { module_self_score: String(score) }
    })
    ElMessage.success('自评分已保存')
  } finally {
    savingSelfScoreKey.value = null
  }
}

async function handleSubmit() {
  submitting.value = true
  try {
    await submitDwRecord(detail.value.recordId)
    ElMessage.success('提交成功，等待审核')
    await reloadDetail()
  } finally {
    submitting.value = false }
}

function showDraftTip() {
  ElMessage({ message: '各模块数据已自动保存，提交前可随时修改', type: 'success', duration: 2500 })
}

const statusLabel = s => ({ 0: '草稿', 1: '已提交', 2: '已通过', 3: '已驳回' }[s] ?? '—')
const statusType  = s => ({ 0: 'info',  1: 'warning', 2: 'success', 3: 'danger' }[s] ?? 'info')

onMounted(loadAll)
</script>

<style scoped>
.dw-form-page { max-width: 960px; margin: 0 auto; }
.module-card  { margin-bottom: 16px; }
.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
}
.module-header-left { display: flex; align-items: center; gap: 6px; }
.module-name { font-size: 15px; font-weight: 600; color: #303133; }
.toggle-icon {
  font-size: 14px;
  color: #909399;
  transition: transform 0.25s;
}
.toggle-icon.is-collapsed { transform: rotate(-90deg); }
.submit-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0 32px;
}
.submit-hint { font-size: 13px; color: #909399; }
.bonus-section { }
.bonus-type-label { font-size: 13px; font-weight: 600; color: #606266; margin: 0 0 10px; }
.module-score-desc {
  display: flex;
  align-items: baseline;
  gap: 6px;
  max-width: 460px;
  border: 1px dashed #d0d7de;
  border-radius: 4px;
  padding: 4px 10px;
  background: #f9fafb;
}
.score-desc-label {
  font-size: 11px;
  color: #fff;
  background: #b0b8c1;
  border-radius: 2px;
  padding: 1px 5px;
  white-space: nowrap;
  flex-shrink: 0;
}
.score-desc-text {
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
}
/* 满分 · 自评分：横排（机构端无实际得分） */
.score-strip {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 18px;
}
.score-strip--header {
  margin-left: 8px;
}
.score-strip--bar {
  flex: 1;
  min-width: 0;
}
.score-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.score-field-label {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}
.score-field-val {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  min-width: 1.5em;
}
.score-field-val--max { color: #b88230; }
.score-field-val--self { color: #409eff; }
.score-field--input { gap: 6px; }
.self-score-input { width: 120px; }

.module-self-score-editor {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 12px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}
</style>
