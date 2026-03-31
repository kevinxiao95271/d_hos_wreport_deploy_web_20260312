<template>
  <div class="dw-admin-view" v-loading="loading">
    <el-page-header @back="$router.back()" style="margin-bottom:16px">
      <template #content>
        <span>日常工作详情</span>
        <el-tag :type="statusType(detail.status)" size="small" style="margin-left:10px">
          {{ statusLabel(detail.status) }}
        </el-tag>
      </template>
    </el-page-header>

    <el-descriptions border :column="3" size="small" style="margin-bottom:16px">
      <el-descriptions-item label="机构">{{ detail.orgName }}</el-descriptions-item>
      <el-descriptions-item label="任务">{{ detail.taskName }}</el-descriptions-item>
      <el-descriptions-item label="记录ID"><span style="font-family:monospace;font-size:12px">{{ detail.recordId }}</span></el-descriptions-item>
      <el-descriptions-item label="驳回原因" :span="3">{{ detail.auditRemark || '—' }}</el-descriptions-item>
    </el-descriptions>

    <!-- 各模块只读展示 -->
    <template v-for="mod in enabledModules" :key="mod.moduleKey">
      <el-card shadow="never" class="module-card">
        <template #header>
          <div class="module-header-admin" @click="toggleModule(mod.moduleKey)" style="cursor:pointer">
            <div class="module-header-left">
              <el-icon :class="['toggle-icon', { 'is-collapsed': isCollapsed(mod.moduleKey) }]"><ArrowDown /></el-icon>
              <span class="module-name-admin">{{ mod.moduleName }}</span>
              <!-- 折叠时在标题旁显示得分概览 -->
              <span v-if="mod.scoreMax != null && isCollapsed(mod.moduleKey)" class="header-score-badge">
                得分 {{ moduleScores[mod.moduleKey]?.actualScore ?? '—' }} 分 / 总分 {{ mod.scoreMax }} 分
              </span>
            </div>
            <div class="module-meta">
              <!-- 考核说明 -->
              <div v-if="mod.scoreDesc" class="meta-box meta-box--desc">
                <span class="meta-box-label">考核说明</span>
                <span class="meta-box-text">{{ mod.scoreDesc }}</span>
              </div>
              <!-- 评分规则 -->
              <div v-if="mod.scoreRule" class="meta-box meta-box--rule">
                <span class="meta-box-label">评分规则</span>
                <span class="meta-box-text">{{ mod.scoreRule }}</span>
              </div>
            </div>
          </div>
        </template>

        <div v-show="!isCollapsed(mod.moduleKey)">

        <!-- 评分行（有 scoreMax 时显示） -->
        <div v-if="mod.scoreMax != null" class="score-input-bar">
          <span class="score-bar-max">满分 {{ mod.scoreMax }} 分</span>
          <span class="score-bar-sep"></span>
          <span class="score-bar-label">实际得分</span>
          <el-input-number
            v-model="moduleScores[mod.moduleKey].actualScore"
            :min="0"
            :max="mod.scoreMax"
            :precision="1"
            :step="0.5"
            size="small"
            style="width:110px"
            placeholder="得分"
          />
          <span class="score-bar-unit">分</span>
          <span class="score-bar-sep"></span>
          <span class="score-bar-label">备注</span>
          <el-input
            v-model="moduleScores[mod.moduleKey].remark"
            placeholder="说明不足之处（选填）"
            size="small"
            style="flex:1; min-width:160px; max-width:360px"
          />
          <el-button
            type="primary"
            size="small"
            :loading="savingKey === mod.moduleKey"
            @click="saveModuleScore(mod)"
          >保存评分</el-button>
        </div>

        <!-- 多条记录型 -->
        <template v-if="isListModule(mod.moduleKey)">
          <div v-if="getListItems(mod.moduleKey).length" class="collapse-scroll-wrap">
          <el-collapse>
            <el-collapse-item
              v-for="item in getListItems(mod.moduleKey)"
              :key="item.id"
              :name="item.id"
            >
              <template #title>{{ itemTitle(mod.moduleKey, item) }}</template>
              <el-descriptions :column="2" size="small" border>
                <el-descriptions-item
                  v-for="(v, k) in flattenItem(mod.moduleKey, item)"
                  :key="k"
                  :label="k"
                >{{ v }}</el-descriptions-item>
              </el-descriptions>

              <!-- guidance 专属：县级中心按市分组展示 -->
              <template v-if="mod.moduleKey === 'guidance'">
                <div class="county-groups-wrap">
                  <div class="county-groups-title">
                    省→市→县质控中心（{{ item.countyCenterCount ?? 0 }} 家）
                  </div>
                  <template v-if="item.countyCenterGroups?.length">
                    <div
                      v-for="g in item.countyCenterGroups"
                      :key="g.cityName"
                      class="county-group-row"
                    >
                      <span class="county-city-label">{{ g.cityName }}：</span>
                      <span class="county-names">{{ g.counties.join('、') }}</span>
                    </div>
                  </template>
                  <span v-else style="color:#c0c4cc;font-size:13px">—</span>
                </div>
              </template>

              <template v-if="mod.extraFields?.length">
                <el-descriptions :column="2" size="small" border>
                  <el-descriptions-item v-for="ef in mod.extraFields" :key="ef.fieldKey" :label="ef.fieldName">
                    {{ item.extraValues?.[ef.fieldKey] ?? '—' }}
                  </el-descriptions-item>
                </el-descriptions>
              </template>
              <!-- 附件 -->
              <el-divider content-position="left" style="margin:10px 0 6px">附件</el-divider>
              <DwReadonlyAttachments :item="item" :module-key="mod.moduleKey" @preview="(u,n) => previewRef.show(u,n)" />
            </el-collapse-item>
          </el-collapse>
          </div>
          <el-empty v-else description="暂无记录" :image-size="50" />
        </template>

        <!-- 加分项：支持 bonus / bonus_pub / bonus_comp 三种 key -->
        <template v-else-if="isBonusModule(mod.moduleKey)">
          <template v-if="mod.moduleKey !== 'bonus_comp'">
            <div>
              <p v-if="mod.moduleKey === 'bonus'" class="bonus-type-label">丛书 / 指南 / 共识出版</p>
              <DwReadonlyBonuses :items="getBonusItems('publication')" @preview="(u,n) => previewRef.show(u,n)" />
            </div>
          </template>
          <el-divider v-if="mod.moduleKey === 'bonus'" style="margin:12px 0" />
          <template v-if="mod.moduleKey !== 'bonus_pub'">
            <div>
              <p v-if="mod.moduleKey === 'bonus'" class="bonus-type-label">竞赛组织与主办</p>
              <DwReadonlyBonuses :items="getBonusItems('competition')" @preview="(u,n) => previewRef.show(u,n)" />
            </div>
          </template>
        </template>

        <!-- 经费执行 -->
        <template v-else-if="mod.moduleKey === 'funding'">
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item label="财政专项有拨款">{{ detail.funding?.fiscalHasFund ? '是' : '否' }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.funding?.fiscalHasFund" label="财政执行率">{{ detail.funding?.fiscalExecutionRate }}%</el-descriptions-item>
            <el-descriptions-item label="医院自筹有拨款">{{ detail.funding?.hospitalHasFund ? '是' : '否' }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.funding?.hospitalHasFund" label="医院执行率">{{ detail.funding?.hospitalExecutionRate }}%</el-descriptions-item>
          </el-descriptions>
        </template>

        <!-- 纯上传模块 -->
        <template v-else>
          <DwReadonlyFileModule :module-key="mod.moduleKey" :record="detail" @preview="(u,n) => previewRef.show(u,n)" />
        </template>

        </div><!-- /v-show collapse body -->
      </el-card>
    </template>

    <!-- 审核操作（status=1 待审核时显示） -->
    <el-card v-if="detail.status === 1" shadow="never" style="margin-top:12px">
      <template #header><span>审核操作</span></template>
      <el-form label-width="90px" style="max-width:500px">
        <el-form-item label="审核意见">
          <el-input v-model="auditRemark" type="textarea" :rows="3" placeholder="驳回时请填写原因" />
        </el-form-item>
        <el-form-item>
          <el-button type="success" :loading="auditing" @click="doAudit(1)">
            <el-icon><Check /></el-icon> 审核通过
          </el-button>
          <el-button type="danger" :loading="auditing" @click="doAudit(0)" style="margin-left:12px">
            <el-icon><Close /></el-icon> 驳回
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PreviewDialog ref="previewRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Close, ArrowDown } from '@element-plus/icons-vue'
import { getDwModules, getDwRecord, auditDwRecord, saveDwModuleScore } from '@/api/dailywork'
import PreviewDialog from '@/components/PreviewDialog.vue'
import DwReadonlyAttachments from './components/DwReadonlyAttachments.vue'
import DwReadonlyBonuses     from './components/DwReadonlyBonuses.vue'
import DwReadonlyFileModule  from './components/DwReadonlyFileModule.vue'

const route    = useRoute()
const recordId = route.query.recordId
const loading  = ref(true)
const auditing = ref(false)
const modules  = ref([])
const detail   = ref({})
const auditRemark = ref('')
const previewRef  = ref(null)

const LIST_MODULES = ['meeting', 'training', 'guidance', 'survey']
const enabledModules = computed(() => (modules.value || []).filter(m => m.isEnabled))

// 模块折叠状态
const collapsedKeys = ref(new Set())
function toggleModule(key) {
  const s = new Set(collapsedKeys.value)
  s.has(key) ? s.delete(key) : s.add(key)
  collapsedKeys.value = s
}
function isCollapsed(key) { return collapsedKeys.value.has(key) }

// 每模块评分状态
const moduleScores = ref({})   // { [moduleKey]: { actualScore, remark } }
const savingKey    = ref(null)

function initModuleScores(mods) {
  const s = {}
  mods.forEach(m => {
    if (m.scoreMax != null) {
      s[m.moduleKey] = {
        actualScore: m.actualScore ?? null,
        remark:      m.scoreRemark ?? '',
      }
    }
  })
  moduleScores.value = s
}

async function saveModuleScore(mod) {
  const entry = moduleScores.value[mod.moduleKey]
  if (!entry) return
  savingKey.value = mod.moduleKey
  try {
    await saveDwModuleScore({
      recordId:    recordId,
      moduleKey:   mod.moduleKey,
      actualScore: entry.actualScore,
      scoreRemark: entry.remark,
    })
    ElMessage.success(`${mod.moduleName} 评分已保存`)
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    savingKey.value = null
  }
}

function isListModule(key) { return LIST_MODULES.includes(key) }
function isBonusModule(key) { return key === 'bonus' || key === 'bonus_pub' || key === 'bonus_comp' }

function getListItems(key) {
  return { meeting: 'meetings', training: 'trainings', guidance: 'guidances', survey: 'surveys' }[key]
    ? detail.value[{ meeting: 'meetings', training: 'trainings', guidance: 'guidances', survey: 'surveys' }[key]] || []
    : []
}

function getBonusItems(bonusType) {
  return (detail.value.bonuses || []).filter(b => b.bonusType === bonusType)
}

const ITEM_NAME_KEY = { meeting: 'meetingName', training: 'trainingName', guidance: 'guidanceContent', survey: 'surveyTarget' }
function itemTitle(moduleKey, item) { return item[ITEM_NAME_KEY[moduleKey]] || `记录 ${item.id}` }

const ENUM_LABELS = {
  offline: '线下', online: '线上', hybrid: '线上+线下',
  onsite: '现场', baseline: '基线调研', special: '专项调研',
}
const FIELD_NAMES = {
  meetingStartDate: '会议时间', meetingForm: '会议形式',
  attendeeCount: '参会人数', attendanceRate: '出勤率',
  trainingStartDate: '培训时间', trainingForm: '培训形式',
  trainingPeopleCount: '培训人数',
  guidanceStartDate: '指导时间', guidanceForm: '指导形式',
  hospitalCount: '医院数',
  surveyStartDate: '调研时间',
  surveyType: '调研类型', surveyForm: '调研方式', surveyTarget: '调研对象',
  pubDate: '出版日期', compStartDate: '举办时间',
}

// 时间区间字段：startDateKey → [startHalfKey, endDateKey, endHalfKey, label]
const TIME_RANGE_DEFS = {
  meetingStartDate:  ['meetingStartHalf',  'meetingEndDate',  'meetingEndHalf',  '会议时间'],
  trainingStartDate: ['trainingStartHalf', 'trainingEndDate', 'trainingEndHalf', '培训时间'],
  guidanceStartDate: ['guidanceStartHalf', 'guidanceEndDate', 'guidanceEndHalf', '指导时间'],
  surveyStartDate:   ['surveyStartHalf',   'surveyEndDate',   'surveyEndHalf',   '调研时间'],
  compStartDate:     ['compStartHalf',     'compEndDate',     'compEndHalf',     '举办时间'],
}
const adminHalfLabel = h => h === 'AM' ? '上午' : h === 'PM' ? '下午' : ''

function flattenItem(moduleKey, item) {
  const skip = new Set([
    'id', 'recordId', 'delFlag', 'createUser', 'createTime', 'updateTime', 'extraValues',
    'minutes', 'photos', 'signins', 'materials', 'evidences', 'reports',
    'meetingContent', 'trainingContent', 'guidanceContent', 'surveyContent',
    'meetingName', 'trainingName', 'surveyTarget',
    // guidance 机构相关：全部单独渲染，不进 flattenItem
    'cityCenterIds', 'countyCenterIds', 'cityCenterCount', 'countyCenterCount',
    'cityCenterNames', 'countyCenterNames', 'countyCenterGroups',
    // timeRange sub-fields consumed via startDate entry
    'meetingStartHalf', 'meetingEndDate', 'meetingEndHalf',
    'trainingStartHalf', 'trainingEndDate', 'trainingEndHalf',
    'guidanceStartHalf', 'guidanceEndDate', 'guidanceEndHalf',
    'surveyStartHalf', 'surveyEndDate', 'surveyEndHalf',
    'compStartHalf', 'compEndDate', 'compEndHalf',
    'coverageRate',
  ])
  const r = {}

  Object.entries(item).forEach(([k, v]) => {
    if (skip.has(k)) return

    if (v === null || v === undefined || v === '') return

    // Handle timeRange startDate key
    if (TIME_RANGE_DEFS[k]) {
      const [sHKey, eKey, eHKey, label] = TIME_RANGE_DEFS[k]
      const eD = item[eKey]
      if (v && eD) {
        r[label] = `${v} ${adminHalfLabel(item[sHKey])} → ${eD} ${adminHalfLabel(item[eHKey])}`
      } else {
        r[label] = v
      }
      return
    }

    const label = FIELD_NAMES[k] || k
    if (k === 'attendanceRate') { r[label] = `${v}%`; return }
    if (k === 'hospitalCount') { r[label] = `${v} 家`; return }
    r[label] = ENUM_LABELS[v] ?? v
  })

  // guidance：市级中心（平铺）放入 descriptions
  if (moduleKey === 'guidance') {
    const cityNames = item.cityCenterNames
    const cityCount = item.cityCenterCount ?? 0
    r[`省→市质控中心（${cityCount} 家）`] = Array.isArray(cityNames) && cityNames.length ? cityNames.join('、') : '—'
  }

  // 内容字段：最后追加，放 descriptions 末尾
  const contentKey = { meeting: 'meetingContent', training: 'trainingContent', guidance: 'guidanceContent', survey: 'surveyContent' }[moduleKey]
  if (contentKey && item[contentKey]) r['内容'] = item[contentKey]

  return r
}

async function loadAll() {
  loading.value = true
  try {
    const [modRes, detailRes] = await Promise.all([getDwModules(), getDwRecord(recordId)])
    modules.value = modRes.data    || []
    detail.value  = detailRes.data || {}
    initModuleScores(modules.value)
  } finally { loading.value = false }
}

async function doAudit(result) {
  if (result === 0 && !auditRemark.value) { ElMessage.warning('驳回时请填写审核意见'); return }
  const confirmMsg = result === 1 ? '确认审核通过？' : '确认驳回？'
  await ElMessageBox.confirm(confirmMsg, '提示', { type: 'warning' })
  auditing.value = true
  try {
    await auditDwRecord(recordId, result, auditRemark.value)
    ElMessage.success(result === 1 ? '已通过' : '已驳回')
    await loadAll()
  } finally { auditing.value = false }
}

const statusLabel = s => ({ 0: '草稿', 1: '已提交', 2: '已通过', 3: '已驳回' }[s] ?? '—')
const statusType  = s => ({ 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' }[s] ?? 'info')

onMounted(loadAll)
</script>

<style scoped>
.dw-admin-view { max-width: 960px; margin: 0 auto; }
.module-card   { margin-bottom: 12px; }
.bonus-type-label { font-size: 13px; font-weight: 600; color: #606266; margin: 0 0 10px; }
.module-header-admin { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; user-select: none; }
.module-header-left  { display: flex; align-items: center; gap: 6px; flex-shrink: 0; padding-top: 4px; }
.module-name-admin   { font-size: 15px; font-weight: 600; color: #303133; }
.module-meta         { display: flex; flex-direction: column; gap: 6px; min-width: 320px; max-width: 460px; }
.toggle-icon {
  font-size: 14px;
  color: #909399;
  transition: transform 0.25s;
  flex-shrink: 0;
}
.toggle-icon.is-collapsed { transform: rotate(-90deg); }
.header-score-badge {
  font-size: 12px;
  font-weight: 600;
  color: #e6a23c;
  background: #fdf6ec;
  border: 1px solid #f0b86b;
  border-radius: 10px;
  padding: 1px 8px;
  white-space: nowrap;
}

/* 统一信息框：考核说明 + 评分规则共用结构，样式微差 */
.meta-box {
  display: flex;
  align-items: baseline;
  gap: 8px;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 12px;
  line-height: 1.6;
}
.meta-box-label {
  font-size: 11px;
  border-radius: 2px;
  padding: 1px 6px;
  white-space: nowrap;
  flex-shrink: 0;
  color: #fff;
}
.meta-box-text { flex: 1; }

/* 考核说明：灰色调 */
.meta-box--desc {
  border: 1px dashed #c8cdd6;
  background: #f7f8fa;
}
.meta-box--desc .meta-box-label { background: #909399; }
.meta-box--desc .meta-box-text  { color: #606266; }

/* 评分规则：暖橙色调，稍深 */
.meta-box--rule {
  border: 1px dashed #f0b86b;
  background: #fef8ee;
}
.meta-box--rule .meta-box-label { background: #e6a23c; }
.meta-box--rule .meta-box-text  { color: #7d4e00; }

/* 评分输入行 */
.score-input-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 12px;
  background: #f0f7ff;
  border: 1px solid #d0e8ff;
  border-radius: 6px;
  font-size: 13px;
}
.score-bar-max  { font-weight: 600; color: #e6a23c; white-space: nowrap; }
.score-bar-sep  { width: 1px; height: 16px; background: #dcdfe6; flex-shrink: 0; }
.score-bar-label { color: #606266; white-space: nowrap; }
.score-bar-unit  { color: #606266; }

/* 记录列表局部滚动容器 */
.collapse-scroll-wrap {
  max-height: 480px;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  scrollbar-width: thin;
  scrollbar-color: #dcdfe6 transparent;
}
.collapse-scroll-wrap::-webkit-scrollbar { width: 6px; }
.collapse-scroll-wrap::-webkit-scrollbar-track { background: transparent; }
.collapse-scroll-wrap::-webkit-scrollbar-thumb { background: #dcdfe6; border-radius: 3px; }
.collapse-scroll-wrap::-webkit-scrollbar-thumb:hover { background: #c0c4cc; }

/* guidance 县级分组 */
.county-groups-wrap {
  margin-top: 8px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 8px 12px;
  background: #fafafa;
  font-size: 13px;
}
.county-groups-title {
  font-weight: 600;
  color: #606266;
  margin-bottom: 6px;
  font-size: 12px;
}
.county-group-row {
  line-height: 1.8;
  color: #303133;
}
.county-city-label {
  font-weight: 500;
  color: #409eff;
}
.county-names { color: #606266; }
</style>
