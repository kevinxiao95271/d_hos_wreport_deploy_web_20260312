<template>
  <el-card shadow="never" class="qref-panel" v-loading="loading">
    <template #header>
      <div class="qref-header" @click="panelExpanded = !panelExpanded">
        <span class="qref-title">各季度填报参考（只读）</span>
        <span class="qref-chips">
          <el-tag
            v-for="qrow in displayQuarterRows" :key="qrow.statQuarter"
            size="small"
            type="success"
            effect="plain"
            class="qref-chip"
          >Q{{ qrow.statQuarter }}&nbsp;✓</el-tag>
          <span v-if="!loading && !displayQuarterRows.length" class="qref-no-data">暂无已通过季度</span>
        </span>
        <el-icon :class="['qref-toggle', { 'is-collapsed': !panelExpanded }]"><ArrowDown /></el-icon>
      </div>
    </template>

    <div v-show="panelExpanded">
      <el-empty v-if="!loading && !displayQuarterRows.length" description="暂无已通过的季度记录" :image-size="50" />
      <el-collapse v-else v-model="activeQuarters" class="qref-collapse">
        <!-- 仅展示该季度下存在列表/加分/经费或自评分等实质内容的已通过折叠项 -->
        <el-collapse-item v-for="qrow in displayQuarterRows" :key="qrow.statQuarter" :name="qrow.statQuarter">
          <template #title>
            <span class="qref-q-num">Q{{ qrow.statQuarter }}</span>
            <span class="qref-q-name">{{ qrow.taskName || `第${qrow.statQuarter}季度` }}</span>
            <el-tag size="small" type="success" effect="plain" style="margin-left:8px">已通过</el-tag>
          </template>

          <template v-if="qrow.detail">
            <!-- 灰态容器：pointer-events:none -->
            <div class="qref-detail-readonly">
              <template v-for="mk in visibleModules(qrow.detail)" :key="mk">
                <div v-if="moduleHasReferenceContent(qrow.detail, mk)" class="qref-mod-section">
                  <div class="qref-mod-title">{{ MOD_NAMES[mk] }}</div>

                  <!-- 多条列表型 -->
                  <template v-if="LIST_MODULES.includes(mk)">
                    <template v-if="listItems(qrow.detail, mk).length">
                      <el-table
                        :data="listItems(qrow.detail, mk)"
                        size="small"
                        :show-header="true"
                        border
                        class="qref-table"
                      >
                        <template v-if="mk === 'meeting'">
                          <el-table-column prop="meetingName"      label="会议名称" min-width="140" show-overflow-tooltip />
                          <el-table-column prop="meetingStartDate" label="日期"     width="100" />
                          <el-table-column label="形式" width="80">
                            <template #default="{ row: r }">{{ FORM_LABEL[r.meetingForm] || r.meetingForm }}</template>
                          </el-table-column>
                          <el-table-column prop="attendeeCount"    label="参会人数" width="80" align="right" />
                          <el-table-column prop="attendanceRate"   label="出勤率"   width="72" align="right">
                            <template #default="{ row: r }">{{ r.attendanceRate }}%</template>
                          </el-table-column>
                        </template>

                        <template v-else-if="mk === 'training'">
                          <el-table-column prop="trainingName"      label="培训名称" min-width="140" show-overflow-tooltip />
                          <el-table-column prop="trainingStartDate" label="日期"     width="100" />
                          <el-table-column label="形式" width="80">
                            <template #default="{ row: r }">{{ FORM_LABEL[r.trainingForm] || r.trainingForm }}</template>
                          </el-table-column>
                          <el-table-column prop="trainingPeopleCount" label="培训人数" width="80" align="right" />
                        </template>

                        <template v-else-if="mk === 'guidance'">
                          <el-table-column prop="guidanceStartDate" label="时间"     width="100" />
                          <el-table-column label="形式" width="80">
                            <template #default="{ row: r }">{{ FORM_LABEL[r.guidanceForm] || r.guidanceForm }}</template>
                          </el-table-column>
                          <el-table-column prop="cityCenterCount"   label="市级中心" width="80" align="right">
                            <template #default="{ row: r }">{{ r.cityCenterCount ?? 0 }} 家</template>
                          </el-table-column>
                          <el-table-column prop="countyCenterCount" label="县级中心" width="80" align="right">
                            <template #default="{ row: r }">{{ r.countyCenterCount ?? 0 }} 家</template>
                          </el-table-column>
                          <el-table-column prop="hospitalCount"     label="医院"    width="72" align="right">
                            <template #default="{ row: r }">{{ r.hospitalCount ?? 0 }} 家</template>
                          </el-table-column>
                        </template>

                        <template v-else-if="mk === 'survey'">
                          <el-table-column prop="surveyTarget"    label="调研对象" min-width="120" show-overflow-tooltip />
                          <el-table-column prop="surveyStartDate" label="日期"     width="100" />
                          <el-table-column label="类型" width="80">
                            <template #default="{ row: r }">{{ SURVEY_TYPE[r.surveyType] || r.surveyType }}</template>
                          </el-table-column>
                          <el-table-column label="方式" width="80">
                            <template #default="{ row: r }">{{ FORM_LABEL[r.surveyForm] || r.surveyForm }}</template>
                          </el-table-column>
                        </template>

                        <template v-else-if="mk === 'data_analysis_report'">
                          <el-table-column prop="reportName" label="报告名称" min-width="140" show-overflow-tooltip />
                          <el-table-column prop="reportDate" label="报告日期" width="110" />
                        </template>
                      </el-table>
                    </template>
                    <div v-else class="qref-empty">暂无记录</div>
                  </template>

                  <!-- 加分项：出版物 -->
                  <template v-else-if="mk === 'bonus_pub'">
                    <template v-if="getBonuses(qrow.detail, 'publication').length">
                      <el-table :data="getBonuses(qrow.detail, 'publication')" size="small" border class="qref-table">
                        <el-table-column prop="title"   label="作品名称" min-width="160" show-overflow-tooltip />
                        <el-table-column prop="pubDate" label="出版日期" width="110" />
                        <el-table-column prop="role"    label="角色"     width="90" />
                      </el-table>
                    </template>
                    <div v-else class="qref-empty">暂无记录</div>
                  </template>

                  <!-- 加分项：竞赛 -->
                  <template v-else-if="mk === 'bonus_comp'">
                    <template v-if="getBonuses(qrow.detail, 'competition').length">
                      <el-table :data="getBonuses(qrow.detail, 'competition')" size="small" border class="qref-table">
                        <el-table-column prop="title"         label="竞赛名称"   min-width="160" show-overflow-tooltip />
                        <el-table-column prop="compStartDate" label="举办时间"   width="110" />
                        <el-table-column prop="level"         label="级别"       width="80" />
                      </el-table>
                    </template>
                    <div v-else class="qref-empty">暂无记录</div>
                  </template>

                  <!-- 经费执行 -->
                  <template v-else-if="mk === 'funding'">
                    <el-descriptions :column="2" size="small" border>
                      <el-descriptions-item label="财政拨款（万元）">{{ qrow.detail.funding.fiscalAppropriationWan ?? '—' }}</el-descriptions-item>
                      <el-descriptions-item label="财政执行率">{{ qrow.detail.funding.fiscalExecutionRate ?? '—' }}%</el-descriptions-item>
                      <el-descriptions-item label="医院自筹（万元）">{{ qrow.detail.funding.hospitalAppropriationWan ?? '—' }}</el-descriptions-item>
                      <el-descriptions-item label="医院执行率">{{ qrow.detail.funding.hospitalExecutionRate ?? '—' }}%</el-descriptions-item>
                    </el-descriptions>
                  </template>
                </div>
              </template>

              <!-- 自评分汇总 -->
              <div v-if="hasSelfScores(qrow.detail)" class="qref-scores-row">
                <span class="qref-scores-label">各模块自评分</span>
                <el-tag
                  v-for="(score, key) in qrow.detail.moduleSelfScores"
                  :key="key"
                  size="small"
                  type="info"
                  effect="plain"
                >{{ MOD_NAMES[key] || key }}：{{ score }}</el-tag>
              </div>
            </div>
          </template>
        </el-collapse-item>
      </el-collapse>
    </div>
  </el-card>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { getDwYearSummary } from '@/api/dailywork'

const props = defineProps({
  statYear: { type: String, required: true },
  orgId:    { type: String, default: null },
})

const LIST_MODULES = ['meeting', 'training', 'guidance', 'survey', 'data_analysis_report']
const ALL_ORDERED  = ['meeting', 'training', 'guidance', 'survey', 'data_analysis_report',
  'annual_work', 'it_construction', 'work_plan', 'admin_response',
  'activity_report', 'funding', 'bonus_pub', 'bonus_comp']

const MOD_NAMES = {
  meeting: '质控会议', training: '质控培训', guidance: '质控指导', survey: '质控调研',
  data_analysis_report: '数据分析报告',
  annual_work: '年度工作落实', it_construction: '信息化建设', work_plan: '工作计划总结',
  admin_response: '行政指令响应', activity_report: '质控活动报备', funding: '经费执行',
  bonus_pub: '加分项-丛书/指南', bonus_comp: '加分项-技能竞赛',
}
const FORM_LABEL  = { offline: '线下', online: '线上', hybrid: '线上+线下', onsite: '现场' }
const SURVEY_TYPE = { baseline: '基线调研', special: '专项调研' }

const loading        = ref(false)
const panelExpanded  = ref(true)
const activeQuarters = ref([])
const rows           = ref([])

/** 只保留有 statQuarter 的行，按季度排序（approvedOnly=true 时每行都有 detail） */
const quarterRows = computed(() =>
  rows.value.filter(r => r.statQuarter != null).sort((a, b) => a.statQuarter - b.statQuarter)
)

/** 季度折叠：无 detail、无列表/加分/经费且无私评分时整项不展示 */
function quarterRowHasReferenceContent(qrow) {
  const d = qrow?.detail
  if (!d) return false
  if (hasSelfScores(d)) return true
  return visibleModules(d).some(mk => moduleHasReferenceContent(d, mk))
}

const displayQuarterRows = computed(() =>
  quarterRows.value.filter(quarterRowHasReferenceContent)
)

function visibleModules(detail) {
  const keys = detail.enabledModuleKeys
  if (!Array.isArray(keys) || !keys.length) return ALL_ORDERED
  return ALL_ORDERED.filter(k => keys.includes(k))
}

function listItems(detail, mk) {
  const map = {
    meeting: 'meetings',
    training: 'trainings',
    guidance: 'guidances',
    survey: 'surveys',
    data_analysis_report: 'dataAnalysisReports',
  }
  return detail[map[mk]] || []
}

function fundingHasValues(f) {
  if (!f || typeof f !== 'object') return false
  const keys = ['fiscalAppropriationWan', 'fiscalExecutionRate', 'hospitalAppropriationWan', 'hospitalExecutionRate']
  return keys.some(k => {
    const v = f[k]
    return v !== null && v !== undefined && v !== ''
  })
}

/** 某模块在参考面板中是否有可展示的数据（空子节点则不渲染该模块块） */
function moduleHasReferenceContent(detail, mk) {
  if (LIST_MODULES.includes(mk)) return listItems(detail, mk).length > 0
  if (mk === 'bonus_pub') return getBonuses(detail, 'publication').length > 0
  if (mk === 'bonus_comp') return getBonuses(detail, 'competition').length > 0
  if (mk === 'funding') return fundingHasValues(detail.funding)
  return false
}

function getBonuses(detail, bonusType) {
  return (detail.bonuses || []).filter(b => b.bonusType === bonusType)
}

function hasSelfScores(detail) {
  const sc = detail?.moduleSelfScores
  return sc && Object.keys(sc).length > 0
}

watch(displayQuarterRows, (list) => {
  if (!list.length) {
    activeQuarters.value = []
    return
  }
  if (list.some(r => r.statQuarter === 1)) activeQuarters.value = [1]
  else activeQuarters.value = [list[0].statQuarter]
}, { immediate: true })

async function load() {
  if (!props.statYear) return
  loading.value = true
  try {
    const params = { statYear: props.statYear, approvedOnly: true }
    if (props.orgId) params.orgId = props.orgId
    const res = await getDwYearSummary(params)
    rows.value = res.data || []
  } catch { rows.value = [] } finally { loading.value = false }
}

watch(() => [props.statYear, props.orgId], load)
onMounted(load)
</script>

<style scoped>
.qref-panel { margin-bottom: 16px; }
.qref-panel :deep(.el-card__header) { padding: 10px 16px; }

.qref-header {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.qref-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
}
.qref-chips { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; align-items: center; }
.qref-chip  { font-size: 12px; }
.qref-no-data { font-size: 12px; color: #c0c4cc; }
.qref-toggle {
  font-size: 14px;
  color: #909399;
  transition: transform 0.25s;
  flex-shrink: 0;
}
.qref-toggle.is-collapsed { transform: rotate(-90deg); }

/* collapse */
.qref-collapse { border-top: none; }
.qref-q-num   { font-weight: 700; color: #409eff; margin-right: 6px; font-size: 13px; }
.qref-q-name  { font-size: 13px; color: #606266; }

/* 灰态只读容器 */
.qref-detail-readonly {
  pointer-events: none;
  opacity: 0.72;
}

/* 模块子分区 */
.qref-mod-section {
  margin-bottom: 14px;
}
.qref-mod-title {
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  margin-bottom: 6px;
  padding: 0 2px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.qref-table {
  font-size: 12px;
}
.qref-empty {
  font-size: 12px;
  color: #c0c4cc;
  padding: 6px 4px;
}
.qref-upload-hint {
  font-size: 12px;
  color: #b0b8c1;
  padding: 4px;
  font-style: italic;
}

/* 自评分行 */
.qref-scores-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px dashed #ebeef5;
}
.qref-scores-label {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}
</style>
