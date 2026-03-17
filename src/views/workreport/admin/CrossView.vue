<template>
  <div class="crossview-page">
    <el-page-header @back="router.back()">
      <template #content>数据汇聚视图</template>
    </el-page-header>

    <!-- 筛选栏 -->
    <el-card shadow="never" style="margin-top:12px">
      <el-form inline :model="filter" label-width="56px">
        <el-form-item label="任务">
          <el-select
            v-model="filter.taskId"
            placeholder="请选择任务"
            style="width:300px"
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

        <!-- 附件2：字段筛选（初次加载后显示） -->
        <el-form-item v-if="isStandard && allLeaves.length" label="字段">
          <el-select
            v-model="filter.itemIds"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="默认全部字段"
            style="width:380px"
            clearable
          >
            <el-option
              v-for="leaf in allLeaves"
              :key="leaf.id"
              :label="headerLabel(leaf)"
              :value="leaf.id"
            />
          </el-select>
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
      <template v-if="cvData && isStandard">
        <el-table
          :data="cvData.orgRows"
          border
          stripe
          style="width:100%"
          :header-cell-style="{ background: '#fafafa', fontWeight: '600' }"
        >
          <el-table-column label="机构" prop="orgName" min-width="160" fixed />
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
      <template v-else-if="cvData && isMatrix">
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Select } from '@element-plus/icons-vue'
import { getTaskPage } from '@/api/task'
import { getCrossView } from '@/api/record'

const router = useRouter()

const loading  = ref(false)
const taskList = ref([])
const cvData   = ref(null)

const filter = ref({
  taskId:  null,
  itemIds: []
})

const isStandard = computed(() => cvData.value?.templateType === 'standard')
const isMatrix   = computed(() => cvData.value?.templateType === 'matrix')

// 附件2 字段列表（初次查询后可用于二次筛选）
const allLeaves = computed(() => cvData.value?.items || [])

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

  const bSet    = getSubtreeIndices(rootB.rowIndex)
  const groupB  = rows.filter(r => bSet.has(r.rowIndex))
  const groupA  = rows.filter(r => !bSet.has(r.rowIndex))
  return [groupB, groupA]
})

// ── 矩阵值快查 map ───────────────────────────────────────────────────
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
    map[`${v.orgId}_${v.itemId}`] = v.value
  })
  return map
})

// ── 初始化 ───────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const res = await getTaskPage({ pageSize: 200 })
    taskList.value = res.data?.records || res.data?.list || []
  } catch {
    ElMessage.error('任务列表加载失败')
  }
})

// ── 任务切换：清空旧数据，自动触发首次查询 ──────────────────────────
async function onTaskChange() {
  filter.value.itemIds = []
  cvData.value = null
  await loadCrossView()
}

// ── 核心查询 ─────────────────────────────────────────────────────────
async function loadCrossView() {
  if (!filter.value.taskId) return
  loading.value = true
  try {
    const params = { taskId: filter.value.taskId }
    if (filter.value.itemIds.length) {
      params.itemIds = filter.value.itemIds.join(',')
    }
    const res = await getCrossView(params)
    cvData.value = res.data
  } catch {
    ElMessage.error('数据加载失败')
  } finally {
    loading.value = false
  }
}

// ── 工具函数 ─────────────────────────────────────────────────────────
function headerLabel(leaf) {
  const p = leaf.headerPath
  if (!p) return leaf.itemName
  if (Array.isArray(p)) return p.join(' / ')
  return String(p)
}

function getCellLabel(row, itemId) {
  const cell = (row.cells || []).find(c => c.itemId === itemId)
  return cell?.cellLabel ?? cell?.cellValue ?? '—'
}

function getMatrixVal(orgId, rowIndex) {
  return !!matrixValMap.value[`${orgId}_${rowIndex}`]
}

function getNumberVal(orgId, itemId) {
  return numberValMap.value[`${orgId}_${itemId}`] ?? null
}

function levelIndent(level) {
  return ({ 1: 12, 2: 28, 3: 48 })[level] ?? 12
}
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
.matrix-scroll {
  overflow-x: auto;
}

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

/* 行级别样式 */
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

/* 列头表格内容换行 */
:deep(.el-table .cell) {
  white-space: normal;
  word-break: break-word;
}
</style>
