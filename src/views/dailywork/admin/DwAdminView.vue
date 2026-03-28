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
      <el-descriptions-item label="驳回原因">{{ detail.auditRemark || '—' }}</el-descriptions-item>
    </el-descriptions>

    <!-- 各模块只读展示 -->
    <template v-for="mod in enabledModules" :key="mod.moduleKey">
      <el-card shadow="never" class="module-card">
        <template #header>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-weight:600">{{ mod.moduleName }}</span>
            <el-tag type="warning" size="small">满分 {{ mod.scoreMax }} 分</el-tag>
          </div>
        </template>

        <!-- 多条记录型 -->
        <template v-if="isListModule(mod.moduleKey)">
          <el-collapse v-if="getListItems(mod.moduleKey).length">
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
              <template v-if="mod.extraFields?.length">
                <el-divider content-position="left" style="margin:10px 0 6px">扩展信息</el-divider>
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
          <el-empty v-else description="暂无记录" :image-size="50" />
        </template>

        <!-- 加分项 -->
        <template v-else-if="mod.moduleKey === 'bonus'">
          <div>
            <p class="bonus-type-label">丛书 / 指南 / 共识出版</p>
            <DwReadonlyBonuses :items="getBonusItems('publication')" @preview="(u,n) => previewRef.show(u,n)" />
          </div>
          <el-divider style="margin:12px 0" />
          <div>
            <p class="bonus-type-label">竞赛组织与主办</p>
            <DwReadonlyBonuses :items="getBonusItems('competition')" @preview="(u,n) => previewRef.show(u,n)" />
          </div>
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
import { Check, Close } from '@element-plus/icons-vue'
import { getDwModules, getDwRecord, auditDwRecord } from '@/api/dailywork'
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

function isListModule(key) { return LIST_MODULES.includes(key) }

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

const FORM_LABELS = { offline: '线下', online: '线上', hybrid: '线上+线下', onsite: '现场', baseline: '基线调研', special: '专项调研' }
const FIELD_NAMES = {
  meetingTime: '时间', meetingForm: '形式', attendeeCount: '参会人数', attendanceRate: '出勤率',
  trainingTime: '时间', trainingForm: '形式', coverageRate: '覆盖率',
  guidanceTime: '时间', guidanceForm: '形式', cityCenterCount: '省→市机构数', countyCenterCount: '省→县机构数', hospitalCount: '医院数',
  surveyTime: '时间', surveyType: '类型', surveyForm: '方式',
}
function flattenItem(moduleKey, item) {
  const skip = new Set(['id', 'recordId', 'delFlag', 'createUser', 'createTime', 'updateTime', 'extraValues',
    'minutes', 'photos', 'signins', 'materials', 'evidences', 'reports', 'meetingContent', 'trainingContent', 'guidanceContent', 'surveyContent',
    'meetingName', 'trainingName', 'surveyTarget', 'cityCenterIds', 'countyCenterIds'])
  const r = {}
  Object.entries(item).forEach(([k, v]) => {
    if (skip.has(k) || v === null || v === undefined || v === '') return
    const label = FIELD_NAMES[k] || k
    r[label] = FORM_LABELS[v] || (typeof v === 'number' ? v : v)
  })
  // Add content/name back
  if (item.meetingContent) r['内容'] = item.meetingContent
  if (item.trainingContent) r['内容'] = item.trainingContent
  if (item.guidanceContent) r['内容'] = item.guidanceContent
  if (item.surveyContent) r['内容'] = item.surveyContent
  return r
}

async function loadAll() {
  loading.value = true
  try {
    const [modRes, detailRes] = await Promise.all([getDwModules(), getDwRecord(recordId)])
    modules.value = modRes.data    || []
    detail.value  = detailRes.data || {}
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
</style>
