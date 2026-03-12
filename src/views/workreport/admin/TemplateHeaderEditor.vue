<template>
  <div>
    <el-page-header @back="router.back()">
      <template #content>配置表头 — {{ route.query.name }}</template>
    </el-page-header>

    <el-row :gutter="16" style="margin-top:16px">
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
                <span class="node-type" v-if="data.isLeaf === 1">{{ data.valueType }}</span>
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
              <div>
                <el-button type="success" :loading="saving" @click="saveAll">
                  <el-icon><Check /></el-icon> 保存全部
                </el-button>
              </div>
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
                <el-select v-model="activeNode.valueType" style="width:180px">
                  <el-option label="文本 text" value="text" />
                  <el-option label="数字 number" value="number" />
                  <el-option label="日期 date" value="date" />
                  <el-option label="下拉 select" value="select" />
                </el-select>
              </el-form-item>
              <el-form-item label="单位">
                <el-input v-model="activeNode.unit" placeholder="如：个、%、元" style="width:180px" />
              </el-form-item>
              <el-form-item label="占位提示">
                <el-input v-model="activeNode.placeholder" placeholder="下拉选项用逗号分隔" />
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTemplateItems, saveTemplateItems, deleteFormatFile } from '@/api/template'
import { buildTree, getLeafNodes, getHeaderRows } from '@/utils/headerTree'

const route  = useRoute()
const router = useRouter()
const templateId = route.query.id

const treeRef = ref()
const treeData  = ref([])
const activeNode = ref(null)
const saving = ref(false)
let tempIdCounter = 1

const uploadHeaders = computed(() => ({ Authorization: localStorage.getItem('wr_token') }))

// Flat array derived from tree for calculations
const flatItems = computed(() => flattenTree(treeData.value))

// Build header rows for preview (simple: group by depth/level)
const headerRows = computed(() => {
  // Flatten and group by headerRow field
  const items = flatItems.value
  if (!items.length) return []
  return getHeaderRows(items)
})
const leafItems = computed(() => getLeafNodes(flatItems.value))

onMounted(async () => {
  if (!templateId) return
  try {
    const res = await getTemplateItems(templateId)
    const items = res.data || []
    if (items.length) {
      // assign tempId for tree node-key
      items.forEach(i => { i.tempId = i.id || `t_${tempIdCounter++}` })
      treeData.value = buildTree(items)
    }
  } catch (e) { /* empty template */ }
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
  return {
    tempId: makeTempId(),
    id: null,
    parentTempId,
    itemName: '',
    isLeaf: 1,
    valueType: 'text',
    unit: '',
    placeholder: '',
    requireAttachment: 0,
    sortNum: sort,
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

// Flatten tree to array with computed headerRow, colIndex, rowSpan, colSpan
function flattenTree(nodes, depth = 1, colStart = { val: 1 }, maxDepth = { val: 1 }) {
  maxDepth.val = Math.max(maxDepth.val, depth)
  const result = []
  nodes.forEach(node => {
    const item = { ...node, headerRow: depth, colIndex: colStart.val }
    if (node.children && node.children.length) {
      const childResult = flattenTree(node.children, depth + 1, colStart, maxDepth)
      item.colSpan = node.children.reduce((s, _) => s, 0)
      // calc colSpan from leaf count
      item.colSpan = countLeaves(node)
      item.rowSpan = 1
      item.isLeaf = 0
      result.push(item)
      result.push(...childResult)
    } else {
      item.colSpan = 1
      item.rowSpan = 1 // will be adjusted below
      item.isLeaf = node.isLeaf ?? 1
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

async function saveAll() {
  saving.value = true
  try {
    const items = buildSavePayload(treeData.value, null, 1, { col: 1 })
    await saveTemplateItems(templateId, items)
    // Reload to get fresh IDs
    const res = await getTemplateItems(templateId)
    const loaded = res.data || []
    loaded.forEach(i => { i.tempId = i.id })
    treeData.value = buildTree(loaded)
    activeNode.value = null
    ElMessage.success('保存成功')
  } finally { saving.value = false }
}

function buildSavePayload(nodes, parentId, depth, colTracker) {
  const result = []
  nodes.forEach((node, idx) => {
    const hasChildren = node.children && node.children.length > 0
    const payload = {
      itemName: node.itemName || '列' + (idx + 1),
      headerRow: depth,
      colIndex: colTracker.col,
      rowSpan: 1,
      colSpan: hasChildren ? countLeaves(node) : 1,
      isLeaf: hasChildren ? 0 : (node.isLeaf ?? 1),
      valueType: node.valueType || 'text',
      unit: node.unit || null,
      placeholder: node.placeholder || null,
      requireAttachment: node.requireAttachment ?? 0,
      sortNum: node.sortNum || (idx + 1)
    }
    if (!hasChildren) colTracker.col++
    result.push(payload)
    if (hasChildren) {
      const childItems = buildSavePayload(node.children, null, depth + 1, colTracker)
      result.push(...childItems)
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

async function clearFormatFile() {
  if (!activeNode.value?.id) return
  await deleteFormatFile(activeNode.value.id)
  activeNode.value.formatTemplateName = null
  activeNode.value.formatTemplateUrl  = null
  ElMessage.success('已删除格式模板')
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
</style>
