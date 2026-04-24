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

    <!-- 各模块：大类横幅 + 叶子模块卡片 -->
    <template v-for="mod in enabledModules" :key="mod.moduleKey">

      <!-- ══ 一级大类横幅 ══ -->
      <template v-if="mod.isLeaf === false">
        <div
          :class="['cat-banner', `cat-banner--${catColorKey(mod.moduleKey)}`]"
          @click="toggleModule(mod.moduleKey)"
        >
          <div class="cat-banner-left">
            <el-icon :class="['toggle-icon', 'toggle-icon--cat', { 'is-collapsed': isCollapsed(mod.moduleKey) }]"><ArrowDown /></el-icon>
            <span class="cat-banner-name">{{ mod.moduleName }}</span>
          </div>
          <div class="cat-banner-right">
            <span v-if="mod.scoreMax != null" class="cat-score-badge">
              <span class="cat-score-label">满分</span>
              <span class="cat-score-val">{{ mod.scoreMax }}</span>
              <span class="cat-score-unit">分</span>
            </span>
          </div>
        </div>
      </template>

      <!-- ══ 二级叶子模块卡片 ══ -->
      <template v-else>
      <div v-show="!mod.parentModuleKey || !isCollapsed(mod.parentModuleKey)" class="leaf-card-wrap">
      <el-card
        shadow="never"
        :class="['module-card', 'module-card--leaf', `module-card--${leafAccentKey(mod.moduleKey)}`]"
      >
        <template #header>
          <div class="module-header-admin" @click="toggleModule(mod.moduleKey)" style="cursor:pointer">
            <div class="module-header-left">
              <el-icon :class="['toggle-icon', { 'is-collapsed': isCollapsed(mod.moduleKey) }]"><ArrowDown /></el-icon>
              <span class="module-name-admin">{{ mod.moduleName }}</span>
              <!-- 折叠：满分 · 自评分 · 实际得分 -->
              <div v-if="mod.scoreMax != null && isCollapsed(mod.moduleKey)" class="score-strip score-strip--header">
                <span class="score-field"><span class="score-field-label">满分</span><span class="score-field-val score-field-val--max">{{ mod.scoreMax }}</span></span>
                <span class="score-field"><span class="score-field-label">自评分</span><span class="score-field-val score-field-val--self">{{ moduleSelfScoreText(mod) }}</span></span>
                <span class="score-field" v-if="!isListModule(mod.moduleKey)"><span class="score-field-label">实际得分</span><span class="score-field-val score-field-val--act">{{ moduleScores[mod.moduleKey]?.score ?? '—' }}</span></span>
              </div>
            </div>
            <div class="module-meta">
              <div v-if="mod.scoreDesc" class="meta-box meta-box--desc">
                <span class="meta-box-label">考核说明</span>
                <span class="meta-box-text">{{ mod.scoreDesc }}</span>
              </div>
              <div v-if="mod.scoreRule" class="meta-box meta-box--rule">
                <span class="meta-box-label">评分规则</span>
                <span class="meta-box-text">{{ mod.scoreRule }}</span>
              </div>
            </div>
          </div>
        </template>

        <div v-show="!isCollapsed(mod.moduleKey)">

        <!-- 评分行：所有有 scoreMax 的模块均在此处统一打分 -->
        <div v-if="mod.scoreMax != null" class="score-input-bar">
          <div class="score-strip score-strip--bar">
            <span class="score-field"><span class="score-field-label">满分</span><span class="score-field-val score-field-val--max">{{ mod.scoreMax }}</span></span>
            <span class="score-field"><span class="score-field-label">自评分</span><span class="score-field-val score-field-val--self">{{ moduleSelfScoreText(mod) }}</span></span>
            <span class="score-field score-field--input">
              <span class="score-field-label">实际得分</span>
              <el-input-number
                v-model="moduleScores[mod.moduleKey].score"
                :min="0"
                :max="mod.scoreMax"
                :precision="1"
                :step="0.5"
                size="small"
                class="score-actual-input"
                controls-position="right"
              />
            </span>
          </div>
          <el-button
            type="primary"
            size="small"
            :loading="savingKey === mod.moduleKey"
            @click="saveModuleScore(mod)"
          >保存评分</el-button>
        </div>

        <!-- 多条记录型 -->
        <template v-if="isListModule(mod.moduleKey)">
          <div v-if="listItemsSortedForModule(mod.moduleKey).length" class="collapse-scroll-wrap">
          <el-collapse>
            <el-collapse-item
              v-for="item in listItemsSortedForModule(mod.moduleKey)"
              :key="String(item.id)"
              :name="String(item.id)"
              :class="['dw-admin-quarter-row', { 'dw-admin-readonly-row': item._readOnly }]"
              :style="dwQuarterRowStyle(item)"
            >
              <template #title>
                <span class="admin-collapse-title">
                  <span class="admin-title-main">
                    <span>{{ itemTitle(mod.moduleKey, item) }}</span>
                    <el-tag v-if="item.startYearQuarter && item._fromQuarter == null" size="small" type="info" effect="plain">{{ item.startYearQuarter }}</el-tag>
                  </span>
                  <span class="admin-title-right">
                    <span v-if="itemDateRange(mod.moduleKey, item)" class="admin-title-date">{{ itemDateRange(mod.moduleKey, item) }}</span>
                    <el-tag
                      v-if="item._fromQuarter != null"
                      size="small"
                      :type="['','primary','success','warning','danger'][item._fromQuarter] || 'info'"
                      effect="dark"
                      class="admin-q-badge"
                    >Q{{ item._fromQuarter }} 季度上报</el-tag>
                  </span>
                </span>
              </template>
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

        <!-- 三级质控网络完善（只读展示） -->
        <template v-else-if="mod.moduleKey === 'network_build'">
          <template v-if="detail.networkBuild">
            <el-descriptions border :column="2" size="small">
              <el-descriptions-item label="市级质控中心数">
                {{ detail.networkBuild.cityCenterCount ?? 0 }} 家
              </el-descriptions-item>
              <el-descriptions-item label="区县级质控中心数">
                {{ detail.networkBuild.countyCenterCount ?? 0 }} 家
              </el-descriptions-item>
              <el-descriptions-item label="已覆盖市级" :span="2">
                <span v-if="detail.networkBuild.cityCenterNames?.length">
                  {{ detail.networkBuild.cityCenterNames.join('、') }}
                </span>
                <span v-else style="color:#c0c4cc">—</span>
              </el-descriptions-item>
              <el-descriptions-item label="已覆盖区县" :span="2">
                <template v-if="detail.networkBuild.countyCenterGroups?.length">
                  <div v-for="g in detail.networkBuild.countyCenterGroups" :key="g.cityName" class="county-group-row">
                    <span class="county-city-label">{{ g.cityName }}：</span>
                    <span class="county-names">{{ g.counties.join('、') }}</span>
                  </div>
                </template>
                <span v-else-if="detail.networkBuild.countyCenterNames?.length">
                  {{ detail.networkBuild.countyCenterNames.join('、') }}
                </span>
                <span v-else style="color:#c0c4cc">—</span>
              </el-descriptions-item>
            </el-descriptions>
            <el-divider content-position="left" style="margin:12px 0 6px">证明材料</el-divider>
            <DwReadonlyFileModule module-key="network_build" :record="detail" @preview="(u,n) => previewRef.show(u,n)" />
          </template>
          <el-empty v-else description="机构未填写网络完善信息" :image-size="50" />
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
            <el-descriptions-item label="财政专项拨款（万元）">{{ detail.funding?.fiscalAppropriationWan ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="财政执行率">{{ detail.funding?.fiscalExecutionRate ?? '—' }}%</el-descriptions-item>
            <el-descriptions-item label="医院自筹拨款（万元）">{{ detail.funding?.hospitalAppropriationWan ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="医院执行率">{{ detail.funding?.hospitalExecutionRate ?? '—' }}%</el-descriptions-item>
          </el-descriptions>
        </template>

        <!-- 纯上传模块 -->
        <template v-else>
          <DwReadonlyFileModule :module-key="mod.moduleKey" :record="detail" @preview="(u,n) => previewRef.show(u,n)" />
        </template>

        </div><!-- /v-show collapse body -->
      </el-card>
      </div><!-- /leaf-card-wrap -->
      </template><!-- /isLeaf -->

    </template><!-- /enabledModules loop -->

    <!-- 总分汇总 -->
    <div class="score-summary-bar" style="margin-top:20px">
      <div class="score-summary-title">评分汇总</div>
      <div class="score-summary-cells">
        <div class="score-summary-cell score-summary-cell--max">
          <div class="score-summary-label">满分上限</div>
          <div class="score-summary-val">
            <span class="score-summary-num">{{ totalMaxScore }}</span>
            <span class="score-summary-unit">分</span>
          </div>
        </div>
        <div class="score-summary-sep"></div>
        <div class="score-summary-cell score-summary-cell--self">
          <div class="score-summary-label">机构自评分</div>
          <div class="score-summary-val">
            <span class="score-summary-num">{{ totalSelfScore ?? '—' }}</span>
            <span v-if="totalSelfScore != null" class="score-summary-unit">分</span>
          </div>
        </div>
        <div class="score-summary-sep"></div>
        <div class="score-summary-cell score-summary-cell--actual">
          <div class="score-summary-label">实际总得分</div>
          <div class="score-summary-val">
            <span class="score-summary-num">{{ totalActualScore ?? '—' }}</span>
            <span v-if="totalActualScore != null" class="score-summary-unit">分</span>
          </div>
          <div v-if="totalActualScore == null" class="score-summary-hint">请逐模块完成评分</div>
        </div>
      </div>
    </div>

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
import { sortDwSubRecordsByStartDesc, dwQuarterRowStyle } from '@/utils/dwQuarter'
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
const DETAIL_KEY   = { meeting: 'meetings', training: 'trainings', guidance: 'guidances', survey: 'surveys' }
const enabledModules = computed(() => {
  const all = (modules.value || []).filter(m => m.isEnabled)
  const keys = detail.value.enabledModuleKeys
  if (Array.isArray(keys) && keys.length) {
    const set = new Set(keys)
    // 大类节点（isLeaf=false）始终保留，叶子节点按 enabledModuleKeys 过滤
    return all.filter(m => !m.isLeaf || set.has(m.moduleKey))
  }
  return all
})

/** 年度任务：statQuarter=null + taskType=daily_work */
const isAnnualTask = computed(() =>
  detail.value.taskType === 'daily_work' && detail.value.statQuarter == null && !!detail.value.statYear
)

// 模块折叠状态
const collapsedKeys = ref(new Set())
function toggleModule(key) {
  const s = new Set(collapsedKeys.value)
  s.has(key) ? s.delete(key) : s.add(key)
  collapsedKeys.value = s
}
function isCollapsed(key) { return collapsedKeys.value.has(key) }

/** 机构填报的模块自评分（详情顶层 moduleSelfScores） */
function moduleSelfScoreText(mod) {
  const v = detail.value.moduleSelfScores?.[mod.moduleKey]
  if (v === null || v === undefined || v === '') return '—'
  return v
}

// 模块级评分状态（非列表型：纯上传 / network_build / funding / bonus_admin）
const moduleScores = ref({})   // { [moduleKey]: { score } }
const savingKey    = ref(null)

// 子记录评分状态（列表型：meeting / training / guidance / survey 等）
const subRecordScores = ref({})  // { [subRecordId]: score }
const savingSubId     = ref(null)

function initModuleScores(mods) {
  const s = {}
  mods.forEach(m => {
    if (m.scoreMax != null) {
      s[m.moduleKey] = { score: null }
    }
  })
  moduleScores.value = s
}

/** 非列表型模块：模块级评分（subRecordId = null） */
async function saveModuleScore(mod) {
  const entry = moduleScores.value[mod.moduleKey]
  if (!entry) return
  if (entry.score === null || entry.score === undefined) {
    ElMessage.warning('请输入分值')
    return
  }
  savingKey.value = mod.moduleKey
  try {
    await saveDwModuleScore({
      recordId:    recordId,
      moduleKey:   mod.moduleKey,
      subRecordId: null,
      score:       entry.score,
    })
    ElMessage.success(`${mod.moduleName} 评分已保存`)
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    savingKey.value = null
  }
}

/** 列表型模块：子记录级评分（subRecordId 必填） */
async function saveSubRecordScore(moduleKey, item) {
  const score = subRecordScores.value[String(item.id)]
  if (score === null || score === undefined) {
    ElMessage.warning('请输入分值')
    return
  }
  savingSubId.value = String(item.id)
  try {
    await saveDwModuleScore({
      recordId:    recordId,
      moduleKey:   moduleKey,
      subRecordId: String(item.id),
      score:       score,
    })
    ElMessage.success('评分已保存')
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    savingSubId.value = null
  }
}

// ── 总分汇总 ──────────────────────────────
/** 所有叶子模块满分合计 */
const totalMaxScore = computed(() =>
  enabledModules.value
    .filter(m => m.isLeaf !== false && m.scoreMax != null)
    .reduce((acc, m) => acc + Number(m.scoreMax), 0)
)

/** 机构总自评分（detail.moduleSelfScores 按叶子模块 key 求和） */
const totalSelfScore = computed(() => {
  const selfMap = detail.value.moduleSelfScores || {}
  const leafKeys = new Set(
    enabledModules.value.filter(m => m.isLeaf !== false).map(m => m.moduleKey)
  )
  const vals = Object.entries(selfMap)
    .filter(([k]) => leafKeys.has(k))
    .map(([, v]) => Number(v))
    .filter(v => !isNaN(v))
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null
})

/** 实际总得分（所有模块级 moduleScores 之和） */
const totalActualScore = computed(() => {
  let total = 0
  let hasAny = false
  Object.values(moduleScores.value).forEach(entry => {
    if (entry?.score != null) { total += Number(entry.score); hasAny = true }
  })
  return hasAny ? Math.round(total * 10) / 10 : null
})

// 大类横幅颜色
const CAT_COLOR_MAP = {
  cat_plan:       'blue',
  cat_network:    'teal',
  cat_training:   'purple',
  cat_report:     'orange',
  cat_compliance: 'green',
  cat_bonus:      'gold',
}
function catColorKey(key) { return CAT_COLOR_MAP[key] || 'blue' }

// 叶子左侧竖条颜色（跟随所属大类）
const LEAF_ACCENT_MAP = {
  work_plan: 'blue', annual_work: 'blue', indicator_db: 'blue',
  network_build: 'teal', meeting: 'teal',
  training: 'purple', survey: 'purple', guidance: 'purple',
  indicator_monitor: 'orange', national_report: 'orange', prov_report: 'orange',
  activity_report: 'green', funding: 'green',
  bonus_pub: 'gold', bonus_comp: 'gold', bonus_admin: 'gold',
}
function leafAccentKey(key) { return LEAF_ACCENT_MAP[key] || 'blue' }

function isListModule(key) { return LIST_MODULES.includes(key) }
function isBonusModule(key) { return key === 'bonus' || key === 'bonus_pub' || key === 'bonus_comp' }

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

function listItemsSortedForModule(moduleKey) {
  return getListItems(moduleKey)
}

function getBonusItems(bonusType) {
  return (detail.value.bonuses || []).filter(b => b.bonusType === bonusType)
}

const ITEM_NAME_KEY = { meeting: 'meetingName', training: 'trainingName', guidance: 'guidanceContent', survey: 'surveyTarget' }
function itemTitle(moduleKey, item) { return item[ITEM_NAME_KEY[moduleKey]] || `记录 ${item.id}` }

const DATE_PAIRS = {
  meeting:  { s: 'meetingStartDate',  sh: 'meetingStartHalf',  e: 'meetingEndDate',  eh: 'meetingEndHalf'  },
  training: { s: 'trainingStartDate', sh: 'trainingStartHalf', e: 'trainingEndDate', eh: 'trainingEndHalf' },
  guidance: { s: 'guidanceStartDate', sh: 'guidanceStartHalf', e: 'guidanceEndDate', eh: 'guidanceEndHalf' },
  survey:   { s: 'surveyStartDate',   sh: 'surveyStartHalf',   e: 'surveyEndDate',   eh: 'surveyEndHalf'   },
}
function itemDateRange(moduleKey, item) {
  const p = DATE_PAIRS[moduleKey]
  if (!p) return ''
  const sD = item[p.s], sH = item[p.sh], eD = item[p.e], eH = item[p.eh]
  if (sD && eD) return `${sD} ${adminHalfLabel(sH)} → ${eD} ${adminHalfLabel(eH)}`
  if (sD) return sD
  return ''
}

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
    'startYearQuarter', 'quarterIndex',
    // 前端内部 flag，不展示
    '_readOnly', '_fromQuarter',
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

function initSubRecordScores(detailData) {
  const s = {}
  const keys = ['meetings', 'trainings', 'guidances', 'surveys', 'bonuses']
  keys.forEach(k => {
    ;(detailData[k] || []).forEach(item => {
      const existing = item.extraValues?.module_self_score
      s[String(item.id)] = existing != null ? Number(existing) : null
    })
  })
  subRecordScores.value = s
}

async function loadAll() {
  loading.value = true
  try {
    const [modRes, detailRes] = await Promise.all([getDwModules(), getDwRecord(recordId)])
    modules.value = modRes.data    || []
    detail.value  = detailRes.data || {}
    initModuleScores(modules.value)
    initSubRecordScores(detail.value)
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
/* ══════════════════════════════════════
   一级大类横幅（浅色专业风格）
══════════════════════════════════════ */
.cat-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 18px;
  border-radius: 8px;
  margin-bottom: 10px;
  margin-top: 28px;
  cursor: pointer;
  user-select: none;
  border-left: 5px solid;
  box-shadow: 0 1px 5px rgba(0,0,0,0.06);
  transition: box-shadow 0.2s;
}
.cat-banner:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.10); }

.cat-banner--blue   { background: #f0f7ff; border-left-color: #2d8fdc; }
.cat-banner--teal   { background: #edf9f8; border-left-color: #1aa89d; }
.cat-banner--purple { background: #f5f0ff; border-left-color: #9254de; }
.cat-banner--orange { background: #fff6ed; border-left-color: #e07a1a; }
.cat-banner--green  { background: #edf7ef; border-left-color: #3daa5c; }
.cat-banner--gold   { background: #fdf8e8; border-left-color: #c89a0e; }

.cat-banner-left  { display: flex; align-items: center; gap: 10px; }
.cat-banner-right { display: flex; align-items: center; gap: 10px; }

.cat-banner-name  { font-size: 15px; font-weight: 700; letter-spacing: 0.3px; }
.cat-banner--blue   .cat-banner-name { color: #1565a8; }
.cat-banner--teal   .cat-banner-name { color: #0b6b65; }
.cat-banner--purple .cat-banner-name { color: #5b2d9e; }
.cat-banner--orange .cat-banner-name { color: #8c4800; }
.cat-banner--green  .cat-banner-name { color: #1d6b35; }
.cat-banner--gold   .cat-banner-name { color: #7a5600; }

.toggle-icon--cat { font-size: 16px; transition: transform 0.25s; }
.cat-banner--blue   .toggle-icon--cat { color: #2d8fdc; }
.cat-banner--teal   .toggle-icon--cat { color: #1aa89d; }
.cat-banner--purple .toggle-icon--cat { color: #9254de; }
.cat-banner--orange .toggle-icon--cat { color: #e07a1a; }
.cat-banner--green  .toggle-icon--cat { color: #3daa5c; }
.cat-banner--gold   .toggle-icon--cat { color: #c89a0e; }

.cat-score-badge { display: inline-flex; align-items: baseline; gap: 3px; border-radius: 20px; padding: 3px 12px; border: 1px solid; }
.cat-banner--blue   .cat-score-badge { background: #daeeff; border-color: #aed4f5; }
.cat-banner--teal   .cat-score-badge { background: #d5f3f1; border-color: #9de0da; }
.cat-banner--purple .cat-score-badge { background: #ecdeff; border-color: #c9a7f0; }
.cat-banner--orange .cat-score-badge { background: #fde8d0; border-color: #f5bf8a; }
.cat-banner--green  .cat-score-badge { background: #d4f0dc; border-color: #99d8af; }
.cat-banner--gold   .cat-score-badge { background: #faedc5; border-color: #e0c46a; }

.cat-score-label  { font-size: 11px; color: #666; }
.cat-score-val    { font-size: 18px; font-weight: 800; line-height: 1; }
.cat-banner--blue   .cat-score-val { color: #1565a8; }
.cat-banner--teal   .cat-score-val { color: #0b6b65; }
.cat-banner--purple .cat-score-val { color: #5b2d9e; }
.cat-banner--orange .cat-score-val { color: #8c4800; }
.cat-banner--green  .cat-score-val { color: #1d6b35; }
.cat-banner--gold   .cat-score-val { color: #7a5600; }
.cat-score-unit   { font-size: 11px; color: #666; }

/* ══════════════════════════════════════
   总分汇总条
══════════════════════════════════════ */
.score-summary-bar {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  padding: 16px 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.score-summary-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 14px;
  letter-spacing: 0.5px;
}
.score-summary-cells {
  display: flex;
  align-items: center;
  gap: 0;
}
.score-summary-cell {
  flex: 1;
  text-align: center;
  padding: 4px 0;
}
.score-summary-sep {
  width: 1px;
  height: 52px;
  background: #ebeef5;
  flex-shrink: 0;
}
.score-summary-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}
.score-summary-val {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
}
.score-summary-num {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}
.score-summary-unit {
  font-size: 13px;
  font-weight: 500;
}
.score-summary-hint {
  font-size: 11px;
  margin-top: 4px;
}
.score-summary-cell--max .score-summary-num  { color: #909399; }
.score-summary-cell--max .score-summary-unit { color: #909399; }
.score-summary-cell--self .score-summary-num  { color: #409eff; }
.score-summary-cell--self .score-summary-unit { color: #409eff; }
.score-summary-cell--actual .score-summary-num  { color: #e6a23c; }
.score-summary-cell--actual .score-summary-unit { color: #e6a23c; }
.score-summary-cell--actual .score-summary-hint { color: #c0c4cc; }

/* ══════════════════════════════════════
   二级叶子模块卡片
══════════════════════════════════════ */
.leaf-card-wrap { margin-bottom: 12px; margin-left: 12px; }
.module-card--leaf {
  border-left-width: 4px !important;
  border-left-style: solid !important;
}
.module-card--blue   { border-left-color: #2d8fdc !important; }
.module-card--teal   { border-left-color: #1aa89d !important; }
.module-card--purple { border-left-color: #9254de !important; }
.module-card--orange { border-left-color: #e07a1a !important; }
.module-card--green  { border-left-color: #4caf6a !important; }
.module-card--gold   { border-left-color: #d4a017 !important; }

.module-card   { margin-bottom: 12px; }
.bonus-type-label { font-size: 13px; font-weight: 600; color: #606266; margin: 0 0 10px; }
.module-header-admin { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; user-select: none; }
.module-header-left  { display: flex; align-items: center; gap: 6px; flex-shrink: 0; padding-top: 4px; }
.module-name-admin   { font-size: 14px; font-weight: 600; color: #303133; }
.module-meta         { display: flex; flex-direction: column; gap: 6px; min-width: 320px; max-width: 460px; }
.toggle-icon {
  font-size: 14px;
  color: #909399;
  transition: transform 0.25s;
  flex-shrink: 0;
}
.toggle-icon.is-collapsed { transform: rotate(-90deg); }
/* 满分 · 自评分 · 实际得分：横排字段，无分式样式 */
.score-strip {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 18px;
}
.score-strip--header {
  margin-left: 8px;
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
.score-field-val--act { color: #e6a23c; }
.score-field--input {
  gap: 6px;
}
.score-actual-input { width: 110px; }

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
  gap: 10px 12px;
  padding: 10px 14px;
  margin-bottom: 12px;
  background: #f0f7ff;
  border: 1px solid #d0e8ff;
  border-radius: 6px;
  font-size: 13px;
}
.score-input-bar--readonly {
  background: #f9fafb;
  border-color: #ebeef5;
}
.score-bar-sep  { width: 1px; height: 18px; background: #dcdfe6; flex-shrink: 0; }
.score-bar-sep--after { margin: 0 2px; }
.score-bar-label { color: #606266; white-space: nowrap; }
.sub-score-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0 4px;
}

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

.admin-collapse-title {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding-right: 8px;
}
.admin-title-main  { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; flex-wrap: wrap; }
.admin-title-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.admin-title-date  { font-size: 13px; color: #909399; white-space: nowrap; }
.admin-q-badge     { font-weight: 700; flex-shrink: 0; }
.dw-admin-quarter-row :deep(.el-collapse-item__header) {
  background-color: var(--quarter-bg, transparent) !important;
}
.dw-admin-quarter-row :deep(.el-collapse-item__wrap) {
  background-color: rgba(255, 255, 255, 0.65);
}
.dw-admin-readonly-row { opacity: 0.72; filter: grayscale(0.15); }
.dw-admin-readonly-row :deep(.el-collapse-item__header) { cursor: default; }


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
