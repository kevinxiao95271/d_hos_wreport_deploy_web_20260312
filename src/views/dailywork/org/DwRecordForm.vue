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

    <!-- 各模块渲染：大类（isLeaf=false）用横幅标题，填报模块（isLeaf=true）用卡片 -->
    <template v-for="mod in enabledModules" :key="mod.moduleKey">

      <!-- ══ 一级大类横幅 ══ -->
      <template v-if="mod.isLeaf === false && catHasLeafChildren(mod.moduleKey)">
        <div
          :class="['cat-banner', 'dw-level-1-banner', `cat-banner--${catColorKey(mod.moduleKey)}`]"
          @click="toggleModule(mod.moduleKey)"
        >
          <div class="cat-banner-left">
            <el-icon :class="['toggle-icon', 'toggle-icon--cat', { 'is-collapsed': isCollapsed(mod.moduleKey) }]"><ArrowDown /></el-icon>
            <span class="cat-banner-name">{{ mod.moduleName }}</span>
          </div>
          <div class="cat-banner-right">
            <span v-if="mod.scoreMax && !isQuarterlyTask" class="cat-score-badge">
              <span class="cat-score-label">满分</span>
              <span class="cat-score-val">{{ mod.scoreMax }}</span>
              <span class="cat-score-unit">分</span>
            </span>
            <el-icon class="cat-banner-arrow" :class="{ 'is-collapsed': isCollapsed(mod.moduleKey) }"><ArrowDown /></el-icon>
          </div>
        </div>
        <!-- 大类无内容体，子模块紧随其后 -->
      </template>

      <!-- ══ 二级填报模块卡片（排除 isLeaf=false 且无子的孤儿大类节点） ══ -->
      <template v-else-if="mod.isLeaf !== false">
      <div
        v-show="!mod.parentModuleKey || !isCollapsed(mod.parentModuleKey)"
        :class="['leaf-card-wrap', mod.parentModuleKey ? 'dw-level-2-indent' : 'dw-level-0-leaf']"
      >
      <el-card
        shadow="never"
        :class="['module-card', 'module-card--leaf', `module-card--${leafAccentKey(mod.moduleKey)}`]"
      >
        <template #header>
          <div class="module-header" @click="toggleModule(mod.moduleKey)" style="cursor:pointer">
            <div class="module-header-left">
              <el-icon :class="['toggle-icon', { 'is-collapsed': isCollapsed(mod.moduleKey) }]"><ArrowDown /></el-icon>
              <span class="module-name">{{ mod.moduleName }}</span>
              <div v-if="mod.scoreMax && !isQuarterlyTask" class="score-strip score-strip--header">
                <span class="score-field"><span class="score-field-label">满分</span><span class="score-field-val score-field-val--max">{{ mod.scoreMax }}</span></span>
                <span class="score-field"><span class="score-field-label">自评分</span><span class="score-field-val score-field-val--self">{{ moduleSelfScores[mod.moduleKey] ?? '—' }}</span></span>
              </div>
            </div>
            <div v-if="mod.scoreDesc" class="module-score-desc">
              <span class="score-desc-label">填写说明</span>
              <span class="score-desc-text">{{ mod.scoreDesc }}</span>
            </div>
          </div>
        </template>

        <div v-show="!isCollapsed(mod.moduleKey)">

        <!-- 模块自评分输入行 -->
        <div v-if="editable && mod.scoreMax && !isQuarterlyTask" class="module-self-score-editor" @click.stop>
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

        <!-- ③ 三级质控网络完善（树选择+单记录） -->
        <template v-else-if="isNetworkBuildModule(mod.moduleKey)">
          <DwNetworkBuildForm
            :module-config="mod"
            :network-build="detail.networkBuild"
            :record="detail"
            :record-id="detail.recordId"
            :editable="editable"
            @saved="reloadDetail"
            @deleted="reloadDetail"
          />
        </template>

        <!-- ④ 经费执行（特殊表单） -->
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

        <!-- ⑤ 纯上传模块（含 bonus_admin 双槽） -->
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
      </div><!-- /leaf-card-wrap -->
      </template><!-- /isLeaf -->

    </template><!-- /enabledModules loop -->

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
import { getDwModules, initDwRecord, submitDwRecord, saveDwFieldValues } from '@/api/dailywork'
import { sortDwSubRecordsByStartDesc } from '@/utils/dwQuarter'
import DwSubList          from './components/DwSubList.vue'
import DwBonusList        from './components/DwBonusList.vue'
import DwFundingForm      from './components/DwFundingForm.vue'
import DwFileModule       from './components/DwFileModule.vue'
import DwNetworkBuildForm from './components/DwNetworkBuildForm.vue'

const route      = useRoute()
const taskId     = route.params.taskId
const pageLoading = ref(true)
const submitting  = ref(false)
const modules     = ref([])
const detail      = ref({ status: 0, meetings: [], trainings: [], guidances: [], surveys: [], dataAnalysisReports: [], bonuses: [], funding: null, fundingExtra: {} })
const moduleSelfScores   = ref({})
const savingSelfScoreKey = ref(null)

const LIST_MODULES = ['meeting', 'training', 'guidance', 'survey', 'data_analysis_report']
const FILE_MODULES = ['annual_work', 'it_construction', 'work_plan', 'admin_response', 'activity_report']
const DETAIL_KEY   = { meeting: 'meetings', training: 'trainings', guidance: 'guidances', survey: 'surveys', data_analysis_report: 'dataAnalysisReports' }

const enabledModules = computed(() => {
  const all = (modules.value || []).filter(m => m.isEnabled)
  const keys = detail.value.enabledModuleKeys
  if (Array.isArray(keys) && keys.length) {
    const set = new Set(keys)
    // 仅 isLeaf===false 为大类；勿用 !m.isLeaf，否则 isLeaf 缺失会被当成大类误留，导致空大类横幅
    return all.filter(m => m.isLeaf === false || set.has(m.moduleKey))
  }
  return all
})

/** 年度任务（statQuarter=null）：旁挂季度参考面板 */
const isAnnualTask = computed(() => detail.value.taskType === 'daily_work' && detail.value.statQuarter == null && !!detail.value.statYear)

/** 季度任务：statQuarter 非空时隐藏分值、自评分 */
const isQuarterlyTask = computed(() => detail.value.statQuarter != null)

/** 大类下是否有已启用的叶子模块（无子则隐藏大类横幅） */
function catHasLeafChildren(catKey) {
  return enabledModules.value.some(
    m => m.isLeaf === true && m.parentModuleKey === catKey
  )
}

const editable       = computed(() => detail.value.status === 0 || detail.value.status === 3)

// 模块折叠状态
const collapsedKeys = ref(new Set())
function toggleModule(key) {
  const s = new Set(collapsedKeys.value)
  s.has(key) ? s.delete(key) : s.add(key)
  collapsedKeys.value = s
}
function isCollapsed(key) { return collapsedKeys.value.has(key) }

// 大类横幅颜色主题（5色循环对应5大类）
const CAT_COLOR_MAP = {
  cat_plan:       'blue',
  cat_network:    'teal',
  cat_training:   'purple',
  cat_report:     'orange',
  cat_compliance: 'green',
  cat_bonus:      'gold',
  cat_analysis:   'teal',
}
function catColorKey(key) { return CAT_COLOR_MAP[key] || 'blue' }

// 叶子卡片左侧竖条颜色跟随所属大类
const LEAF_ACCENT_MAP = {
  work_plan: 'blue', annual_work: 'blue', indicator_db: 'blue',
  network_build: 'teal', meeting: 'teal',
  training: 'purple', survey: 'purple', guidance: 'purple',
  indicator_monitor: 'orange', national_report: 'orange', prov_report: 'orange',
  activity_report: 'green', funding: 'green',
  bonus_pub: 'gold', bonus_comp: 'gold', bonus_admin: 'gold',
  data_analysis_report: 'teal',
}
function leafAccentKey(key) { return LEAF_ACCENT_MAP[key] || 'blue' }

function isListModule(key) { return LIST_MODULES.includes(key) }
function isBonusModule(key) {
  // bonus_admin 是纯上传型，不走 DwBonusList，由 DwFileModule 处理
  return key === 'bonus' || key === 'bonus_pub' || key === 'bonus_comp'
}
function isNetworkBuildModule(key) { return key === 'network_build' }

function getListItems(key) {
  // 年度自填条目：按开始时间倒序
  const own = sortDwSubRecordsByStartDesc(
    (detail.value[DETAIL_KEY[key]] || []).map(i => ({ ...i, _fromQuarter: null, _readOnly: false })),
    key
  )
  // 季度快照：保持后端顺序，只读
  const snapshots = detail.value.quarterlySnapshots || []
  if (snapshots.length) {
    const quarterly = snapshots.flatMap(snap =>
      (snap.detail?.[DETAIL_KEY[key]] ?? []).map(i => ({
        ...i, _fromQuarter: snap.statQuarter, _readOnly: true,
      }))
    )
    return [...own, ...quarterly]
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
    initModuleSelfScores(initData.moduleSelfScores)
  } finally {
    pageLoading.value = false
  }
}

async function reloadDetail() {
  try {
    const initRes = await initDwRecord(taskId)
    const initData = initRes.data || {}
    detail.value = initData
    initModuleSelfScores(initData.moduleSelfScores)
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
.dw-form-page { max-width: 1200px; margin: 0 auto; }

/* ══════════════════════════════════════
   一级大类横幅（通栏 + 粗色带，与二级明显区分）
══════════════════════════════════════ */
.dw-level-1-banner {
  margin-left: 0;
  margin-right: 0;
}
.cat-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 14px 16px;
  border-radius: 8px;
  margin-bottom: 10px;
  margin-top: 28px;
  cursor: pointer;
  user-select: none;
  border-left: 6px solid;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  transition: box-shadow 0.2s, opacity 0.2s;
}
.cat-banner:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.10); }

/* 浅色背景 + 左边框色 */
.cat-banner--blue   { background: #f0f7ff; border-left-color: #2d8fdc; }
.cat-banner--teal   { background: #edf9f8; border-left-color: #1aa89d; }
.cat-banner--purple { background: #f5f0ff; border-left-color: #9254de; }
.cat-banner--orange { background: #fff6ed; border-left-color: #e07a1a; }
.cat-banner--green  { background: #edf7ef; border-left-color: #3daa5c; }
.cat-banner--gold   { background: #fdf8e8; border-left-color: #c89a0e; }

/* 文字颜色随主题 */
.cat-banner--blue   .cat-banner-name { color: #1565a8; }
.cat-banner--teal   .cat-banner-name { color: #0b6b65; }
.cat-banner--purple .cat-banner-name { color: #5b2d9e; }
.cat-banner--orange .cat-banner-name { color: #8c4800; }
.cat-banner--green  .cat-banner-name { color: #1d6b35; }
.cat-banner--gold   .cat-banner-name { color: #7a5600; }

/* 展开箭头颜色随主题 */
.cat-banner--blue   .toggle-icon--cat { color: #2d8fdc; }
.cat-banner--teal   .toggle-icon--cat { color: #1aa89d; }
.cat-banner--purple .toggle-icon--cat { color: #9254de; }
.cat-banner--orange .toggle-icon--cat { color: #e07a1a; }
.cat-banner--green  .toggle-icon--cat { color: #3daa5c; }
.cat-banner--gold   .toggle-icon--cat { color: #c89a0e; }

.cat-banner-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cat-banner-name {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.4px;
}
.cat-banner-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 满分徽章 */
.cat-score-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  border-radius: 20px;
  padding: 3px 12px;
  border: 1px solid;
}
.cat-banner--blue   .cat-score-badge { background: #daeeff; border-color: #aed4f5; }
.cat-banner--teal   .cat-score-badge { background: #d5f3f1; border-color: #9de0da; }
.cat-banner--purple .cat-score-badge { background: #ecdeff; border-color: #c9a7f0; }
.cat-banner--orange .cat-score-badge { background: #fde8d0; border-color: #f5bf8a; }
.cat-banner--green  .cat-score-badge { background: #d4f0dc; border-color: #99d8af; }
.cat-banner--gold   .cat-score-badge { background: #faedc5; border-color: #e0c46a; }

.cat-score-label { font-size: 11px; color: #666; }
.cat-score-val   { font-size: 18px; font-weight: 800; line-height: 1; }
.cat-score-unit  { font-size: 11px; color: #666; }

.cat-banner--blue   .cat-score-val { color: #1565a8; }
.cat-banner--teal   .cat-score-val { color: #0b6b65; }
.cat-banner--purple .cat-score-val { color: #5b2d9e; }
.cat-banner--orange .cat-score-val { color: #8c4800; }
.cat-banner--green  .cat-score-val { color: #1d6b35; }
.cat-banner--gold   .cat-score-val { color: #7a5600; }

.toggle-icon--cat {
  font-size: 18px;
  transition: transform 0.25s;
}

/* ══════════════════════════════════════
   二级叶子：左廊道对齐 + 卡片头与一级折叠区分
══════════════════════════════════════ */
.leaf-card-wrap.dw-level-2-indent {
  margin-left: 0;
  margin-bottom: 12px;
  padding-left: 22px;
  border-left: 3px solid #dcdfe6;
}
.leaf-card-wrap.dw-level-0-leaf {
  margin-left: 0;
  margin-bottom: 12px;
}
.module-card { }
.module-card--leaf {
  border-left-width: 3px !important;
  border-left-style: solid !important;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.module-card--leaf :deep(.el-card__header) {
  background: linear-gradient(180deg, #fafbfc 0%, #f0f2f5 100%);
  border-bottom: 1px solid #e4e7ed;
  padding: 10px 16px;
}
.module-card--leaf :deep(.el-card__body) {
  background: #fff;
}
/* 左侧竖条颜色 */
.module-card--blue   { border-left-color: #2d8fdc !important; }
.module-card--teal   { border-left-color: #1aa89d !important; }
.module-card--purple { border-left-color: #9254de !important; }
.module-card--orange { border-left-color: #e07a1a !important; }
.module-card--green  { border-left-color: #4caf6a !important; }
.module-card--gold   { border-left-color: #d4a017 !important; }

.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
}
.module-header-left { display: flex; align-items: center; gap: 6px; }
.module-name { font-size: 13px; font-weight: 600; color: #606266; letter-spacing: 0.02em; }
.toggle-icon {
  font-size: 13px;
  color: #a8abb2;
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
