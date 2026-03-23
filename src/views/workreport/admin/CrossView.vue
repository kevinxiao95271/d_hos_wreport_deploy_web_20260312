<template>
  <div class="crossview-page">
    <el-page-header @back="router.back()">
      <template #content>数据汇聚视图</template>
    </el-page-header>

    <!-- 筛选栏 -->
    <el-card shadow="never" style="margin-top:12px">
      <el-form inline :model="filter" label-width="56px">

        <!-- 任务选择 -->
        <el-form-item label="任务">
          <el-select
            v-model="filter.taskId"
            placeholder="请选择任务"
            style="width:300px"
            :loading="taskLoading"
            @change="onTaskChange"
          >
            <el-option
              v-for="t in taskList"
              :key="t.id"
              :label="t.taskName"
              :value="t.id"
            />
          </el-select>
        </el-form-item>

        <!-- 标准模板：字段多选 -->
        <el-form-item v-if="templateType === 'standard' && allLeaves.length" label="字段">
          <el-select
            v-model="filter.itemIds"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="请选择对比字段"
            style="width:380px"
            clearable
            @change="onItemSelChange"
          >
            <el-option
              v-for="leaf in allLeaves"
              :key="leaf.id"
              :label="headerLabel(leaf)"
              :value="leaf.id"
            />
          </el-select>
        </el-form-item>

        <!-- 矩阵模板：行选择（按钮触发弹窗） -->
        <el-form-item v-if="templateType === 'matrix' && allRows.length" label="地区">
          <el-button plain @click="rowDialogVisible = true">
            <el-icon><Filter /></el-icon>
            选择地区
            <el-tag
              v-if="filter.rowIndexes.length"
              type="primary"
              size="small"
              style="margin-left:6px"
            >已选 {{ filter.rowIndexes.length }} 行</el-tag>
            <el-tag
              v-else
              type="info"
              size="small"
              style="margin-left:6px"
            >全部</el-tag>
          </el-button>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            :disabled="!filter.taskId"
            @click="loadCrossView"
          >查 询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 结果区 -->
    <el-card shadow="never" style="margin-top:12px" v-loading="loading">

      <!-- ── 附件2：标准多级表头横向对比 ── -->
      <template v-if="cvData && templateType === 'standard'">
        <el-table
          :data="cvData.orgRows"
          border
          stripe
          style="width:100%"
          :header-cell-style="{ background: '#fafafa', fontWeight: '600' }"
        >
          <el-table-column label="机构" prop="orgName" min-width="160" fixed />
          <el-table-column label="状态" width="90" align="center" fixed>
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)" size="small">
                {{ row.statusLabel || statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            v-for="item in cvData.items"
            :key="item.id"
            :label="headerLabel(item)"
            :min-width="item.valueType === 'text' ? 220 : 140"
            :align="item.valueType === 'text' ? 'left' : 'center'"
          >
            <template #default="{ row }">
              <div :class="item.valueType === 'text' ? 'cell-text' : ''">
                {{ getCellLabel(row, item.id) }}
              </div>
            </template>
          </el-table-column>
        </el-table>
        <div class="result-tip">共 {{ cvData.orgRows.length }} 家机构</div>
      </template>

      <!-- ── 附件3：矩阵横向对比 ── -->
      <template v-else-if="cvData && templateType === 'matrix'">

        <!-- checkbox 矩阵 -->
        <div class="matrix-scroll">
          <table class="cross-matrix" cellspacing="0" cellpadding="0">
            <thead>
              <tr>
                <th class="row-label-th">地区 / 机构</th>
                <th
                  v-for="col in cvData.orgCols"
                  :key="col.orgId"
                  class="org-th"
                >{{ col.orgName }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(group, gi) in rowGroups" :key="gi">
                <tr v-if="gi === 1 && rowGroups[0].length" class="group-divider-row">
                  <td :colspan="(cvData.orgCols.length || 0) + 1" class="divider-cell"></td>
                </tr>
                <tr
                  v-for="row in group"
                  :key="row.rowIndex"
                  :class="['data-row', `level-${row.rowLevel}`]"
                >
                  <td
                    class="row-label-td"
                    :style="{ paddingLeft: levelIndent(row.rowLevel) + 'px' }"
                  >
                    <span :class="['row-label', `lv${row.rowLevel}`]">{{ row.rowLabel }}</span>
                  </td>
                  <td
                    v-for="col in cvData.orgCols"
                    :key="col.orgId"
                    class="cell-td"
                    align="center"
                  >
                    <el-icon v-if="getMatrixVal(col.orgId, row.rowIndex)" color="#409eff" :size="16">
                      <Select />
                    </el-icon>
                    <span v-else class="cell-empty">—</span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- 独立数值项 -->
        <template v-if="cvData.numberItems && cvData.numberItems.length">
          <div class="section-divider">独立数值项</div>
          <el-table
            :data="cvData.numberItems"
            border
            style="width:100%"
            :header-cell-style="{ background: '#fafafa' }"
          >
            <el-table-column label="项目" prop="itemName" min-width="160" />
            <el-table-column
              v-for="col in cvData.orgCols"
              :key="col.orgId"
              :label="col.orgName"
              min-width="110"
              align="center"
            >
              <template #default="{ row }">
                {{ getNumberVal(col.orgId, row.id) ?? '—' }}
              </template>
            </el-table-column>
          </el-table>
        </template>

        <div class="result-tip">共 {{ (cvData.orgCols || []).length }} 家机构</div>
      </template>

      <!-- 空态 -->
      <el-empty v-else-if="!loading" description="请选择任务后点击查询" :image-size="80" />
    </el-card>

    <!-- 矩阵行选择弹窗 -->
    <el-dialog
      v-model="rowDialogVisible"
      title="选择地区行"
      width="480px"
      :close-on-click-modal="false"
    >
      <div class="row-tree-hint">勾选需要对比的地区，不勾任何节点则显示全部。</div>
      <el-tree
        ref="rowTreeRef"
        :data="rowTreeData"
        show-checkbox
        node-key="rowIndex"
        :default-checked-keys="filter.rowIndexes"
        :default-expand-all="false"
        :default-expanded-keys="rootRowIndexes"
        :props="{ label: 'rowLabel', children: 'children' }"
        style="max-height:480px; overflow-y:auto; margin-top:8px"
      />
      <template #footer>
        <el-button @click="clearRowSelection">清空（显示全部）</el-button>
        <el-button type="primary" @click="confirmRowSelection">确 定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Select, Filter } from '@element-plus/icons-vue'
import { getTaskPage } from '@/api/task'
import { getTemplateFullDetail, getTemplateRows } from '@/api/template'
import { getCrossView } from '@/api/record'
import { getLeafNodesFromTree } from '@/utils/headerTree'

const router = useRouter()

// ── 状态 ─────────────────────────────────────────────────────────────
const loading     = ref(false)
const taskLoading = ref(false)   // 仅控制任务下拉框 loading 状态
const taskList    = ref([])
const cvData      = ref(null)

const templateType = ref(null)   // 'standard' | 'matrix'
const templateId   = ref(null)

// 附件2：全量叶子节点
const allLeaves = ref([])
// 附件3：全量行定义
const allRows   = ref([])

const filter = ref({
  taskId:     null,
  itemIds:    [],   // 附件2 已选字段
  rowIndexes: []    // 附件3 已选地区行
})

// 矩阵行选择器弹窗
const rowDialogVisible = ref(false)
const rowTreeRef       = ref(null)

// ── localStorage 记忆 ─────────────────────────────────────────────────
const itemKey = (taskId) => `wr_cv_items_${taskId}`
const rowKey  = (taskId) => `wr_cv_rows_${taskId}`

function loadSaved(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch { return null }
}
function saveTo(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* ignore */ }
}

// ── 工具函数 ─────────────────────────────────────────────────────────
function headerLabel(leaf) {
  const p = leaf.headerPath
  if (!p) return leaf.itemName
  return Array.isArray(p) ? p.join(' / ') : String(p)
}

function statusLabel(s) {
  return { 0: '草稿', 1: '已提交', 2: '已通过', 3: '已驳回' }[s] ?? '未知'
}
function statusType(s) {
  return { 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' }[s] ?? ''
}

function getCellLabel(row, itemId) {
  const cell = (row.cells || []).find(c => c.itemId === itemId)
  return cell?.cellLabel ?? cell?.cellValue ?? '—'
}

function levelIndent(level) {
  return ({ 1: 12, 2: 28, 3: 48 })[level] ?? 12
}

// ── 矩阵值快查 ────────────────────────────────────────────────────────
const matrixValMap = computed(() => {
  const map = {}
  ;(cvData.value?.matrixValues || []).forEach(v => {
    map[`${v.orgId}_${v.rowIndex}`] = v.cellValue === '1'
  })
  return map
})

const numberValMap = computed(() => {
  const map = {}
  ;(cvData.value?.numberValues || []).forEach(v => {
    map[`${v.orgId}_${v.itemId}`] = v.cellValue ?? v.value
  })
  return map
})

function getMatrixVal(orgId, rowIndex) { return !!matrixValMap.value[`${orgId}_${rowIndex}`] }
function getNumberVal(orgId, itemId)   { return numberValMap.value[`${orgId}_${itemId}`] ?? null }

// ── 矩阵行分组（市级树 B 在上，省市县树 A 在下）────────────────────
const rowGroups = computed(() => {
  const rows = cvData.value?.rows || []
  if (!rows.length) return [[], []]

  const childrenOf = {}
  rows.forEach(r => {
    if (r.parentRowIndex != null) {
      if (!childrenOf[r.parentRowIndex]) childrenOf[r.parentRowIndex] = []
      childrenOf[r.parentRowIndex].push(r.rowIndex)
    }
  })

  function getSubtreeIndices(rootIdx) {
    const visited = new Set()
    const queue = [rootIdx]
    while (queue.length) {
      const ri = queue.shift()
      if (visited.has(ri)) continue
      visited.add(ri)
      ;(childrenOf[ri] || []).forEach(ci => queue.push(ci))
    }
    return visited
  }

  const roots = rows.filter(r => r.parentRowIndex == null)
  const rootB = roots.find(r => r.rowLabel?.includes('市级'))
  if (!rootB) return [[], rows]

  const bSet   = getSubtreeIndices(rootB.rowIndex)
  const groupB = rows.filter(r => bSet.has(r.rowIndex))
  const groupA = rows.filter(r => !bSet.has(r.rowIndex))
  return [groupB, groupA]
})

// ── el-tree 行树数据 ──────────────────────────────────────────────────
const rowTreeData = computed(() => buildRowTree(allRows.value))

const rootRowIndexes = computed(() =>
  allRows.value.filter(r => r.parentRowIndex == null).map(r => r.rowIndex)
)

function buildRowTree(rows) {
  const map = {}
  rows.forEach(r => { map[r.rowIndex] = { ...r, children: [] } })
  const roots = []
  rows.forEach(r => {
    if (r.parentRowIndex == null) roots.push(map[r.rowIndex])
    else map[r.parentRowIndex]?.children.push(map[r.rowIndex])
  })
  return roots
}

// ── 行选择弹窗操作 ────────────────────────────────────────────────────
function clearRowSelection() {
  rowTreeRef.value?.setCheckedKeys([])
}

function confirmRowSelection() {
  const checked = rowTreeRef.value?.getCheckedKeys() || []
  filter.value.rowIndexes = checked
  saveTo(rowKey(filter.value.taskId), checked)
  rowDialogVisible.value = false
}

// ── 字段选择变更时自动保存记忆 ───────────────────────────────────────
function onItemSelChange(ids) {
  saveTo(itemKey(filter.value.taskId), ids)
}

// ── 任务切换：加载模板定义后自动查询 ────────────────────────────────
async function onTaskChange() {
  cvData.value       = null
  templateType.value = null
  templateId.value   = null
  allLeaves.value    = []
  allRows.value      = []
  filter.value.itemIds    = []
  filter.value.rowIndexes = []

  if (!filter.value.taskId) return

  // templateId 直接从已加载的任务列表取，无需额外请求
  const task = taskList.value.find(t => t.id === filter.value.taskId)
  const tid  = task?.templateId
  if (!tid) { ElMessage.warning('该任务未绑定模板'); return }
  templateId.value = tid

  taskLoading.value = true
  try {
    // 一次调用拿到 items + rows（与 ReportForm.vue 保持一致）
    const fullRes = await getTemplateFullDetail(tid)
    const allItems   = fullRes.data?.items || []
    const allRowDefs = fullRes.data?.rows  || []

    // 优先用 data.template.templateType；后备用叶子 checkbox 检测
    const tplType    = fullRes.data?.template?.templateType
    const allLeafItems = getLeafNodesFromTree(allItems)
    const isMatrixType = tplType === 'matrix' || (!tplType && allLeafItems.some(i => i.valueType === 'checkbox'))
    templateType.value = isMatrixType ? 'matrix' : 'standard'

    if (!isMatrixType) {
      // 标准模板：取叶子节点，还原记忆或默认前 5
      const leaves   = allLeafItems
      allLeaves.value = leaves
      const validIds = leaves.map(l => l.id)
      const saved    = loadSaved(itemKey(filter.value.taskId))
      let effective  = saved ? saved.filter(id => validIds.includes(id)) : []
      if (!effective.length) effective = validIds.slice(0, 5)
      filter.value.itemIds = effective
    } else {
      // 矩阵模板：行定义（fullDetail rows 可能为空则单独拉一次）
      const rows = allRowDefs.length ? allRowDefs : (await getTemplateRows(tid)).data || []
      allRows.value = rows
      const validIdxs = rows.map(r => r.rowIndex)
      const saved     = loadSaved(rowKey(filter.value.taskId))
      filter.value.rowIndexes = saved ? saved.filter(i => validIdxs.includes(i)) : []
    }
  } catch (e) {
    ElMessage.error('模板信息加载失败：' + (e?.message || '未知错误'))
    taskLoading.value = false
    return
  }

  taskLoading.value = false
  // 模板就绪后自动触发查询
  await loadCrossView()
}

// ── 核心查询 ─────────────────────────────────────────────────────────
async function loadCrossView() {
  if (!filter.value.taskId) return
  loading.value = true
  try {
    const params = { taskId: filter.value.taskId }

    if (templateType.value === 'standard' && filter.value.itemIds.length) {
      params.itemIds = filter.value.itemIds.join(',')
      saveTo(itemKey(filter.value.taskId), filter.value.itemIds)
    }
    if (templateType.value === 'matrix' && filter.value.rowIndexes.length) {
      params.rowIndexes = filter.value.rowIndexes.join(',')
      saveTo(rowKey(filter.value.taskId), filter.value.rowIndexes)
    }

    const res = await getCrossView(params)
    cvData.value = res.data
  } catch (e) {
    ElMessage.error('数据加载失败：' + (e?.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

// ── 初始化任务列表 ────────────────────────────────────────────────────
onMounted(async () => {
  taskLoading.value = true
  try {
    const res = await getTaskPage({ pageSize: 200 })
    taskList.value = res.data?.records || res.data?.list || []
  } catch {
    ElMessage.error('任务列表加载失败')
  } finally {
    taskLoading.value = false
  }
})
</script>

<style scoped>
.crossview-page { padding-bottom: 40px; }

.result-tip {
  margin-top: 10px;
  font-size: 12px;
  color: #999;
  text-align: right;
}

/* ── 矩阵表格 ── */
.matrix-scroll { overflow-x: auto; }

.cross-matrix {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.cross-matrix th,
.cross-matrix td {
  border: 1px solid #e8e8e8;
}

.row-label-th {
  background: #fafafa;
  font-weight: 600;
  padding: 10px 14px;
  white-space: nowrap;
  min-width: 180px;
  position: sticky;
  left: 0;
  z-index: 2;
}

.org-th {
  background: #fafafa;
  font-weight: 600;
  padding: 10px 12px;
  white-space: nowrap;
  min-width: 110px;
  text-align: center;
}

.row-label-td {
  background: #fff;
  position: sticky;
  left: 0;
  z-index: 1;
  min-width: 180px;
  white-space: nowrap;
  border-right: 2px solid #e0e0e0;
}

.cell-td {
  padding: 6px 8px;
  min-width: 80px;
}

.data-row.level-1 .row-label-td { background: #f0f5ff; }
.row-label.lv1 { font-weight: 700; color: #1a4a8a; font-size: 13px; }
.row-label.lv2 { font-weight: 500; color: #333; }
.row-label.lv3 { color: #555; font-size: 12px; }

.group-divider-row .divider-cell {
  height: 6px;
  background: #f0f2f5;
  border: none;
  padding: 0;
}

.cell-empty { color: #ccc; }

/* 附件2 文本列 */
.cell-text {
  white-space: pre-wrap;
  word-break: break-word;
  text-align: left;
  line-height: 1.6;
}

/* 数值项分隔 */
.section-divider {
  margin: 20px 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  border-left: 3px solid #409eff;
  padding-left: 8px;
}

/* 行选择弹窗提示 */
.row-tree-hint {
  font-size: 12px;
  color: #999;
}

:deep(.el-table .cell) {
  white-space: normal;
  word-break: break-word;
}
</style>
