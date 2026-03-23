<template>
  <div>
    <el-page-header @back="router.back()">
      <template #content>配置模板 — {{ route.query.name }}</template>
    </el-page-header>

    <el-tabs v-model="activeTab" style="margin-top:16px" type="border-card">
      <!-- ==================== Tab 1: 列定义 ==================== -->
      <el-tab-pane label="列定义（表头）" name="columns">
        <el-row :gutter="16">
          <!-- 左：树形结构 -->
          <el-col :span="8">
            <el-card shadow="never">
              <template #header>
                <div class="card-header">
                  <span>表头结构</span>
                  <el-button type="primary" size="small" @click="addRootNode">
                    <el-icon><Plus /></el-icon> 新增列
                  </el-button>
                </div>
              </template>
              <el-tree
                ref="treeRef"
                :data="treeData"
                :props="{ label: 'itemName', children: 'children' }"
                node-key="tempId"
                default-expand-all
                highlight-current
                @node-click="onNodeClick"
              >
                <template #default="{ node, data }">
                  <div class="tree-node">
                    <el-icon v-if="data.isLeaf === 1" color="#67c23a"><Document /></el-icon>
                    <el-icon v-else color="#409eff"><Folder /></el-icon>
                    <span class="node-name">{{ data.itemName || '(未命名)' }}</span>
                    <span class="node-type" v-if="data.isLeaf === 1 && !isScoreTemplate">{{ data.valueType }}</span>
                    <span class="node-type" v-if="isScoreTemplate && data.isLeaf === 0 && data.scoreValue > 0">{{ data.scoreValue }}分</span>
                    <span class="node-type" v-if="isScoreTemplate && data.isLeaf === 1">{{ data.minAttachments }}~{{ data.maxAttachments || '∞' }}个</span>
                    <div class="node-actions" @click.stop>
                      <el-icon class="action-icon" title="添加子节点" @click="addChildNode(data)"><Plus /></el-icon>
                      <el-icon class="action-icon danger" title="删除节点" @click="deleteNode(node, data)"><Delete /></el-icon>
                    </div>
                  </div>
                </template>
              </el-tree>
              <el-empty v-if="!treeData.length" description="暂无表头，点击新增列" />
            </el-card>
          </el-col>

          <!-- 右：节点配置面板 -->
          <el-col :span="16">
            <el-card shadow="never">
              <template #header>
                <div class="card-header">
                  <span>{{ activeNode ? `编辑节点：${activeNode.itemName || '(未命名)'}` : '请点击左侧节点进行编辑' }}</span>
                  <el-button type="success" :loading="savingItems" @click="saveAllItems">
                    <el-icon><Check /></el-icon> 保存全部列定义
                  </el-button>
                </div>
              </template>

              <el-form v-if="activeNode" :model="activeNode" label-width="120px" size="default">
                <el-form-item label="列名称">
                  <el-input v-model="activeNode.itemName" placeholder="请输入列名称" />
                </el-form-item>
                <el-form-item label="是否叶子节点">
                  <el-radio-group v-model="activeNode.isLeaf">
                    <el-radio :label="1">是（有填报数据）</el-radio>
                    <el-radio :label="0">否（分组标题）</el-radio>
                  </el-radio-group>
                </el-form-item>
                <template v-if="activeNode.isLeaf === 1">
                  <el-form-item label="数据类型">
                    <el-select v-model="activeNode.valueType" style="width:200px">
                      <el-option label="文本 text"       value="text" />
                      <el-option label="数字 number"     value="number" />
                      <el-option label="日期 date"       value="date" />
                      <el-option label="下拉 select"     value="select" />
                      <el-option label="勾选 checkbox"   value="checkbox" />
                    </el-select>
                    <el-text v-if="activeNode.valueType === 'checkbox'" type="warning" size="small" style="margin-left:8px">
                      矩阵类型，需在「行定义」Tab 配置行数据
                    </el-text>
                  </el-form-item>
                  <template v-if="activeNode.valueType !== 'checkbox'">
                    <!-- 字典绑定：紧跟数据类型，选中后自动联动为下拉 -->
                    <el-form-item label="字典绑定">
                      <div>
                        <div style="display:flex;align-items:center;gap:8px">
                          <el-select
                            v-model="activeNode.dictCode"
                            placeholder="不绑定（自由输入）"
                            style="width:220px"
                            clearable
                            @change="onDictChange"
                          >
                            <el-option
                              v-for="d in dictTypeList"
                              :key="d.dictCode"
                              :label="`${d.dictName}（${d.dictCode}）`"
                              :value="d.dictCode"
                            />
                          </el-select>
                          <el-button
                            v-if="activeNode.id"
                            :loading="dictSaving"
                            @click="applyDictBinding"
                          >立即应用</el-button>
                          <el-text v-else type="info" size="small">保存全部后生效</el-text>
                        </div>
                        <div class="field-hint" v-if="activeNode.dictCode">
                          已绑定字典，数据类型已自动切换为「下拉」，填报时渲染为单选下拉框。
                        </div>
                        <div class="field-hint muted" v-else>
                          绑定字典后填报渲染为单选下拉，选项由字典管理统一维护。
                        </div>
                      </div>
                    </el-form-item>
                    <el-form-item label="单位">
                      <el-input v-model="activeNode.unit" placeholder="如：个、%、元" style="width:180px" />
                    </el-form-item>
                    <el-form-item label="占位提示">
                      <el-input v-model="activeNode.placeholder" placeholder="下拉选项用逗号分隔（无字典时有效）" />
                    </el-form-item>
                    <el-form-item label="要求上传附件">
                      <el-radio-group v-model="activeNode.requireAttachment">
                        <el-radio :label="0">不要求</el-radio>
                        <el-radio :label="1">必传</el-radio>
                        <el-radio :label="2">可选</el-radio>
                      </el-radio-group>
                    </el-form-item>
                    <el-form-item label="格式模板文件">
                      <div v-if="activeNode.formatTemplateName">
                        <el-tag closable @close="clearFormatFile">{{ activeNode.formatTemplateName }}</el-tag>
                      </div>
                      <el-upload
                        v-if="activeNode.id && !activeNode.formatTemplateName"
                        :action="`/wr/template/item/upload-format/${activeNode.id}`"
                        :headers="uploadHeaders"
                        :on-success="onFormatUpload"
                        :show-file-list="false"
                        accept=".doc,.docx,.pdf,.xlsx,.xls"
                      >
                        <el-button size="small">上传格式模板</el-button>
                      </el-upload>
                      <span v-if="!activeNode.id" class="tips">保存后可上传格式模板</span>
                    </el-form-item>
                  </template>
                </template>
                <!-- 评分细则模板专属字段 -->
                <template v-if="isScoreTemplate">
                  <el-divider content-position="left" style="margin:8px 0">
                    <el-text type="warning" size="small">评分细则配置</el-text>
                  </el-divider>
                  <!-- 父节点：配置分值 -->
                  <el-form-item v-if="activeNode.isLeaf === 0" label="分值（分）">
                    <el-input-number v-model="activeNode.scoreValue" :min="0" :step="5" style="width:140px" />
                    <el-text type="info" size="small" style="margin-left:8px">父节点分值，叶子节点填 0</el-text>
                  </el-form-item>
                  <!-- 叶子节点：配置附件数量 -->
                  <template v-if="activeNode.isLeaf === 1">
                    <el-form-item label="最少上传数">
                      <el-input-number v-model="activeNode.minAttachments" :min="0" style="width:120px" />
                      <el-text type="info" size="small" style="margin-left:8px">0 = 不要求</el-text>
                    </el-form-item>
                    <el-form-item label="最多上传数">
                      <el-input-number v-model="activeNode.maxAttachments" :min="0" style="width:120px" />
                      <el-text type="info" size="small" style="margin-left:8px">0 = 不限制</el-text>
                    </el-form-item>
                  </template>
                </template>
                <el-form-item label="排序号">
                  <el-input-number v-model="activeNode.sortNum" :min="1" style="width:120px" />
                </el-form-item>
              </el-form>

              <el-empty v-else description="点击左侧节点进行编辑" />
            </el-card>

            <!-- 预览区 -->
            <el-card shadow="never" style="margin-top:12px">
              <template #header><span>表头预览</span></template>
              <div v-if="flatItems.length" class="preview-table-wrap">
                <table class="preview-table" border="1" cellspacing="0" cellpadding="4">
                  <thead>
                    <tr v-for="(rowItems, rIdx) in headerRows" :key="rIdx">
                      <th
                        v-for="item in rowItems"
                        :key="item.tempId"
                        :rowspan="item.rowSpan || 1"
                        :colspan="item.colSpan || 1"
                        style="background:#fafafa;text-align:center"
                      >{{ item.itemName }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td v-for="leaf in leafItems" :key="leaf.tempId" style="text-align:center;color:#999;font-size:12px">
                        {{ leaf.valueType }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <el-empty v-else description="暂无预览数据" />
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- ==================== Tab 2: 行定义（矩阵专用） ==================== -->
      <el-tab-pane name="rows">
        <template #label>
          <span>行定义（矩阵）</span>
          <el-tag v-if="isMatrixTemplate" type="warning" size="small" style="margin-left:4px">矩阵</el-tag>
        </template>

        <el-alert
          v-if="!isMatrixTemplate"
          type="info"
          :closable="false"
          style="margin-bottom:16px"
          title="当前列定义中不含 checkbox 类型，行定义仅对勾选矩阵模板有效。如需使用，请先在「列定义」Tab 将叶子节点的数据类型设置为「勾选 checkbox」。"
        />

        <el-card shadow="never" v-loading="loadingRows">
          <template #header>
            <div class="card-header">
              <span>行定义列表（共 {{ rowDefs.length }} 行）</span>
              <div style="display:flex;gap:8px">
                <el-button size="small" @click="addRowDef">
                  <el-icon><Plus /></el-icon> 新增行
                </el-button>
                <el-button type="success" size="small" :loading="savingRows" @click="saveAllRows">
                  <el-icon><Check /></el-icon> 保存全部行定义
                </el-button>
              </div>
            </div>
          </template>

          <el-table :data="rowDefs" border size="small" max-height="500">
            <el-table-column type="index" label="#" width="50" align="center" />
            <el-table-column label="行标签" min-width="160">
              <template #default="{ row }">
                <el-input v-model="row.rowLabel" size="small" placeholder="行显示名称" />
              </template>
            </el-table-column>
            <el-table-column label="层级" width="120">
              <template #default="{ row }">
                <el-select v-model="row.rowLevel" size="small" style="width:100%">
                  <el-option label="1 省级汇总" :value="1" />
                  <el-option label="2 市级"     :value="2" />
                  <el-option label="3 县/区级"  :value="3" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="行序号(rowIndex)" width="140">
              <template #default="{ row }">
                <el-input-number v-model="row.rowIndex" :min="1" size="small" style="width:110px" />
              </template>
            </el-table-column>
            <el-table-column label="父行序号" width="120">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.parentRowIndex"
                  :min="0"
                  :placeholder="'空=无'"
                  size="small"
                  style="width:100px"
                  :controls="false"
                />
              </template>
            </el-table-column>
            <el-table-column label="排序号" width="100">
              <template #default="{ row }">
                <el-input-number v-model="row.sortNum" :min="1" size="small" style="width:80px" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70" align="center" fixed="right">
              <template #default="{ $index }">
                <el-button type="danger" text size="small" @click="removeRowDef($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div style="margin-top:8px;color:#909399;font-size:12px">
            说明：rowIndex 是填报时传入的行标识（唯一整数），层级3（县/区级）的父行序号填对应市级行的 rowIndex。
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getTemplateItems, getTemplateDetail, saveTemplateItems, deleteFormatFile, updateItemDict,
  getTemplateRows,  saveTemplateRows
} from '@/api/template'
import { getDictTypes } from '@/api/dict'
import { buildTree, getLeafNodes, getHeaderRows } from '@/utils/headerTree'

const route  = useRoute()
const router = useRouter()
const templateId = route.query.id

const activeTab    = ref('columns')
const templateType = ref('form')   // 'form' | 'score'

const isScoreTemplate = computed(() => templateType.value === 'score')

// ──────────── 字典类型列表 ────────────
const dictTypeList  = ref([])
const dictSaving    = ref(false)

// ──────────── 列定义 ────────────
const treeRef    = ref()
const treeData   = ref([])
const activeNode = ref(null)
const savingItems = ref(false)
let tempIdCounter = 1

const uploadHeaders = computed(() => ({ Authorization: localStorage.getItem('wr_token') }))

const flatItems  = computed(() => flattenTree(treeData.value))
const headerRows = computed(() => flatItems.value.length ? getHeaderRows(flatItems.value) : [])
const leafItems  = computed(() => getLeafNodes(flatItems.value))

const isMatrixTemplate = computed(() =>
  flatItems.value.some(i => i.isLeaf === 1 && i.valueType === 'checkbox')
)

onMounted(async () => {
  // 加载字典类型列表 + 模板类型
  try {
    const [dres, tRes] = await Promise.all([
      getDictTypes(),
      getTemplateDetail(templateId)
    ])
    dictTypeList.value = dres.data || []
    if (tRes.data?.templateType) templateType.value = tRes.data.templateType
  } catch { /* ignore */ }

  if (!templateId) return
  try {
    const res = await getTemplateItems(templateId)
    const items = res.data || []
    if (items.length) {
      // id / parentId 统一转 String，保证与新节点的 "new_N" 类型一致
      items.forEach(i => {
        i.id       = i.id       != null ? String(i.id)       : null
        i.parentId = i.parentId != null ? String(i.parentId) : null
        i.tempId   = i.id || `t_${tempIdCounter++}`
      })
      treeData.value = buildTree(items)
    }
  } catch { /* empty template */ }
  await loadRows()
})

function onNodeClick(data) { activeNode.value = data }

function makeTempId() { return `new_${tempIdCounter++}` }

function addRootNode() {
  const node = newNode(null, treeData.value.length + 1)
  treeData.value.push(node)
  activeNode.value = node
}

function addChildNode(parent) {
  if (!parent.children) parent.children = []
  parent.isLeaf = 0
  const node = newNode(parent.tempId, parent.children.length + 1)
  parent.children.push(node)
  activeNode.value = node
}

function newNode(parentTempId, sort) {
  const tid = makeTempId()
  return {
    tempId: tid,
    id: tid,       // 新节点用 tempId 作为批次内唯一标识，后端会映射为真实 Snowflake id
    parentTempId,
    itemName: '',
    isLeaf: 1,
    valueType: 'text',
    unit: '',
    placeholder: '',
    requireAttachment: 0,
    dictCode: null,
    sortNum: sort,
    scoreValue: 0,
    minAttachments: 0,
    maxAttachments: 0,
    formatTemplateName: null,
    formatTemplateUrl: null,
    children: []
  }
}

function deleteNode(node, data) {
  ElMessageBox.confirm('确认删除该节点及其所有子节点？', '警告', { type: 'warning' })
    .then(() => {
      const parent = node.parent
      const siblings = parent.data?.children ?? treeData.value
      const idx = siblings.indexOf(data)
      siblings.splice(idx, 1)
      if (activeNode.value?.tempId === data.tempId) activeNode.value = null
      ElMessage.success('已删除')
    })
}

function flattenTree(nodes, depth = 1, colStart = { val: 1 }) {
  const result = []
  nodes.forEach(node => {
    const item = { ...node, headerRow: depth, colIndex: colStart.val }
    if (node.children && node.children.length) {
      item.colSpan = countLeaves(node)
      item.rowSpan = 1
      item.isLeaf  = 0
      result.push(item)
      result.push(...flattenTree(node.children, depth + 1, colStart))
    } else {
      item.colSpan = 1
      item.rowSpan = 1
      item.isLeaf  = node.isLeaf ?? 1
      colStart.val++
      result.push(item)
    }
  })
  return result
}

function countLeaves(node) {
  if (!node.children || !node.children.length) return 1
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0)
}

async function saveAllItems() {
  savingItems.value = true
  try {
    const items = buildSavePayload(treeData.value, null, 1, { col: 1 })
    await saveTemplateItems(templateId, items)
    const res = await getTemplateItems(templateId)
    const loaded = res.data || []
    loaded.forEach(i => {
      i.id       = i.id       != null ? String(i.id)       : null
      i.parentId = i.parentId != null ? String(i.parentId) : null
      i.tempId   = i.id
    })
    treeData.value = buildTree(loaded)
    activeNode.value = null
    ElMessage.success('列定义保存成功')
  } finally { savingItems.value = false }
}

function buildSavePayload(nodes, parentId, depth, colTracker) {
  const result = []
  nodes.forEach((node, idx) => {
    const hasChildren = node.children && node.children.length > 0
    // id / parentId 统一转 String：已有节点是 Long 数字，新节点是 "new_N" 字符串
    const clientId     = node.id != null ? String(node.id) : null
    const clientParent = parentId  != null ? String(parentId)  : null
    const payload = {
      id:                clientId,
      parentId:          clientParent,
      itemName:          node.itemName || '列' + (idx + 1),
      headerRow:         depth,
      colIndex:          colTracker.col,
      rowSpan:           1,
      colSpan:           hasChildren ? countLeaves(node) : 1,
      isLeaf:            hasChildren ? 0 : (node.isLeaf ?? 1),
      valueType:         node.valueType || 'text',
      unit:              node.unit || null,
      placeholder:       node.placeholder || null,
      requireAttachment: node.requireAttachment ?? 0,
      dictCode:          node.dictCode || null,
      sortNum:           node.sortNum || (idx + 1),
      scoreValue:        node.scoreValue ?? 0,
      minAttachments:    node.minAttachments ?? 0,
      maxAttachments:    node.maxAttachments ?? 0
    }
    if (!hasChildren) colTracker.col++
    result.push(payload)
    if (hasChildren) {
      result.push(...buildSavePayload(node.children, node.id, depth + 1, colTracker))
    }
  })
  return result
}

function onFormatUpload(res) {
  if (res.code === 200 && activeNode.value) {
    activeNode.value.formatTemplateName = res.data.attachName
    activeNode.value.formatTemplateUrl  = res.data.attachPath
    activeNode.value.id = res.data.id
    ElMessage.success('格式模板上传成功')
  }
}

// 字典选中时自动联动数据类型为 select
function onDictChange(val) {
  if (val && activeNode.value) {
    activeNode.value.valueType = 'select'
  }
}

// 已保存的节点（有 id）直接调单独接口实时切换字典绑定
async function applyDictBinding() {
  if (!activeNode.value?.id) return
  dictSaving.value = true
  try {
    await updateItemDict(activeNode.value.id, activeNode.value.dictCode)
    ElMessage.success(activeNode.value.dictCode ? '字典绑定已应用' : '已解绑字典')
  } finally { dictSaving.value = false }
}

async function clearFormatFile() {
  if (!activeNode.value?.id) return
  await deleteFormatFile(activeNode.value.id)
  activeNode.value.formatTemplateName = null
  activeNode.value.formatTemplateUrl  = null
  ElMessage.success('已删除格式模板')
}

// ──────────── 行定义 ────────────
const rowDefs    = ref([])
const loadingRows = ref(false)
const savingRows  = ref(false)
let rowNextIndex  = 1

async function loadRows() {
  if (!templateId) return
  loadingRows.value = true
  try {
    const res = await getTemplateRows(templateId)
    rowDefs.value = (res.data || []).map(r => ({ ...r }))
    rowNextIndex = rowDefs.value.reduce((m, r) => Math.max(m, r.rowIndex || 0), 0) + 1
  } catch { /* no rows yet */ }
  finally { loadingRows.value = false }
}

function addRowDef() {
  rowDefs.value.push({
    rowIndex:       rowNextIndex++,
    rowLabel:       '',
    rowLevel:       2,
    parentRowIndex: null,
    sortNum:        rowDefs.value.length + 1
  })
}

function removeRowDef(index) {
  rowDefs.value.splice(index, 1)
}

async function saveAllRows() {
  const invalid = rowDefs.value.filter(r => !r.rowLabel || !r.rowLabel.trim())
  if (invalid.length) {
    ElMessage.warning('存在空行标签，请填写后保存')
    return
  }
  savingRows.value = true
  try {
    const payload = rowDefs.value.map(r => ({
      rowIndex:       r.rowIndex,
      rowLabel:       r.rowLabel.trim(),
      rowLevel:       r.rowLevel,
      parentRowIndex: r.parentRowIndex || null,
      sortNum:        r.sortNum
    }))
    await saveTemplateRows(templateId, payload)
    await loadRows()
    ElMessage.success('行定义保存成功')
  } finally { savingRows.value = false }
}
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.tree-node { display: flex; align-items: center; gap: 4px; width: 100%; }
.node-name { flex: 1; }
.node-type { font-size: 11px; color: #999; margin-right: 4px; }
.node-actions { display: none; gap: 4px; }
.tree-node:hover .node-actions { display: flex; }
.action-icon { cursor: pointer; color: #409eff; }
.action-icon.danger { color: #f56c6c; }
.preview-table-wrap { overflow-x: auto; }
.preview-table { border-collapse: collapse; min-width: 100%; font-size: 13px; }
.preview-table th, .preview-table td { border: 1px solid #dcdfe6; padding: 6px 12px; }
.tips { color: #999; font-size: 12px; }
.field-hint { margin-top: 5px; font-size: 12px; color: #409eff; line-height: 1.5; }
.field-hint.muted { color: #999; }
</style>
