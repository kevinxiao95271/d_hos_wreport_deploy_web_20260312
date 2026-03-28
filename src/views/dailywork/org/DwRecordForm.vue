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
          <div class="module-header">
            <span class="module-name">{{ mod.moduleName }}</span>
            <el-tag type="warning" size="small">满分 {{ mod.scoreMax }} 分</el-tag>
          </div>
        </template>

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

        <!-- ② 加分项（publication + competition 两个子类在同一模块卡片内） -->
        <template v-else-if="mod.moduleKey === 'bonus'">
          <div class="bonus-section">
            <p class="bonus-type-label">丛书 / 指南 / 共识出版</p>
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
          <el-divider style="margin:16px 0" />
          <div class="bonus-section">
            <p class="bonus-type-label">竞赛组织与主办</p>
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
      </el-card>
    </template>

    <!-- 提交栏 -->
    <div v-if="editable" class="submit-bar">
      <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
        提交上报
      </el-button>
      <span class="submit-hint">提交后将进入审核流程，不可再编辑</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getDwModules, initDwRecord, submitDwRecord } from '@/api/dailywork'
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

const LIST_MODULES   = ['meeting', 'training', 'guidance', 'survey']
const FILE_MODULES   = ['annual_work', 'it_construction', 'work_plan', 'admin_response', 'activity_report']

const enabledModules = computed(() => (modules.value || []).filter(m => m.isEnabled))
const editable       = computed(() => detail.value.status === 0 || detail.value.status === 3)

function isListModule(key) { return LIST_MODULES.includes(key) }

function getListItems(key) {
  const map = {
    meeting: detail.value.meetings,
    training: detail.value.trainings,
    guidance: detail.value.guidances,
    survey:   detail.value.surveys,
  }
  return map[key] || []
}

function getBonusItems(bonusType) {
  return (detail.value.bonuses || []).filter(b => b.bonusType === bonusType)
}

async function loadAll() {
  pageLoading.value = true
  try {
    const [modRes, detailRes] = await Promise.all([
      getDwModules(),
      initDwRecord(taskId)
    ])
    modules.value = modRes.data || []
    detail.value  = detailRes.data || detail.value
  } finally {
    pageLoading.value = false
  }
}

async function reloadDetail() {
  try {
    const res = await initDwRecord(taskId)
    detail.value = res.data || detail.value
  } catch { /* ignore */ }
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
}
.module-name { font-size: 15px; font-weight: 600; color: #303133; }
.submit-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0 32px;
}
.submit-hint { font-size: 13px; color: #909399; }
.bonus-section { }
.bonus-type-label { font-size: 13px; font-weight: 600; color: #606266; margin: 0 0 10px; }
</style>
