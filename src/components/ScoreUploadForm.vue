<template>
  <div class="score-upload-form">
    <!-- 整体达标进度 -->
    <div class="overall-bar">
      <el-tag :type="allComplete ? 'success' : 'warning'" size="large">
        上传进度：{{ completedCount }} / {{ requiredLeaves.length }} 项已达标
      </el-tag>
      <el-text v-if="!editable" type="info" size="small" style="margin-left:12px">只读模式</el-text>
    </div>

    <!-- 遍历顶层分组 -->
    <div v-for="group in displayGroups" :key="group.id" class="score-group">
      <!-- 分组标题（isLeaf=0 的父节点） -->
      <div class="group-header">
        <span class="group-name">{{ group.itemName }}</span>
        <el-tag v-if="group.scoreValue > 0" type="warning" size="small" style="margin-left:8px">
          {{ group.scoreValue }} 分
        </el-tag>
      </div>

      <!-- 叶子上传区 -->
      <div
        v-for="leaf in group.leaves"
        :key="leaf.id"
        class="leaf-block"
        :class="{ complete: isLeafComplete(leaf), required: leaf.minAttachments > 0 && !isLeafComplete(leaf) }"
      >
        <div class="leaf-header">
          <span class="leaf-title">{{ leafLabel(leaf) }}</span>
          <span v-if="leaf.placeholder" class="leaf-hint">{{ leaf.placeholder }}</span>
          <span class="leaf-count" :class="{ 'count-ok': isLeafComplete(leaf), 'count-warn': !isLeafComplete(leaf) && leaf.minAttachments > 0 }">
            <el-icon v-if="isLeafComplete(leaf)"><CircleCheck /></el-icon>
            <el-icon v-else-if="leaf.minAttachments > 0"><CircleClose /></el-icon>
            已上传 {{ leafFiles(leaf.id).length }} 个
            <template v-if="leaf.maxAttachments > 0"> / 最多 {{ leaf.maxAttachments }} 个</template>
            <template v-if="leaf.minAttachments > 0">（至少需 {{ leaf.minAttachments }} 个）</template>
          </span>
        </div>

        <!-- 文件列表 -->
        <div class="file-list">
          <div v-for="att in leafFiles(leaf.id)" :key="att.id" class="file-row">
            <el-icon color="#409eff"><Document /></el-icon>
            <el-link :href="att.attachPath" target="_blank" type="primary" class="file-name">
              {{ att.attachName }}
            </el-link>
            <el-button
              v-if="editable"
              type="danger" text size="small"
              :loading="deleting[att.id]"
              @click="handleDelete(att.id)"
            >删除</el-button>
            <el-link v-else :href="att.attachPath" target="_blank" type="primary" size="small">下载</el-link>
          </div>
          <div v-if="!leafFiles(leaf.id).length" class="no-file">暂无文件</div>
        </div>

        <!-- 上传按钮 -->
        <div v-if="editable" class="upload-btn-wrap">
          <el-upload
            :show-file-list="false"
            :disabled="isUploadDisabled(leaf) || uploading[leaf.id]"
            :http-request="(opts) => handleUpload(opts.file, leaf.id)"
          >
            <el-button
              size="small" type="primary" plain
              :disabled="isUploadDisabled(leaf)"
              :loading="uploading[leaf.id]"
            >
              <el-icon><Upload /></el-icon>
              {{ isUploadDisabled(leaf) ? '已达上限' : '上传文件' }}
            </el-button>
          </el-upload>
        </div>
      </div>
    </div>

    <!-- 无分组的独立叶子节点 -->
    <div
      v-for="leaf in soloLeaves"
      :key="leaf.id"
      class="leaf-block"
      :class="{ complete: isLeafComplete(leaf), required: leaf.minAttachments > 0 && !isLeafComplete(leaf) }"
    >
      <div class="leaf-header">
        <span class="leaf-title">{{ leafLabel(leaf) }}</span>
        <span v-if="leaf.placeholder" class="leaf-hint">{{ leaf.placeholder }}</span>
        <span class="leaf-count" :class="{ 'count-ok': isLeafComplete(leaf), 'count-warn': !isLeafComplete(leaf) && leaf.minAttachments > 0 }">
          <el-icon v-if="isLeafComplete(leaf)"><CircleCheck /></el-icon>
          <el-icon v-else-if="leaf.minAttachments > 0"><CircleClose /></el-icon>
          已上传 {{ leafFiles(leaf.id).length }} 个
          <template v-if="leaf.maxAttachments > 0"> / 最多 {{ leaf.maxAttachments }} 个</template>
          <template v-if="leaf.minAttachments > 0">（至少需 {{ leaf.minAttachments }} 个）</template>
        </span>
      </div>
      <div class="file-list">
        <div v-for="att in leafFiles(leaf.id)" :key="att.id" class="file-row">
          <el-icon color="#409eff"><Document /></el-icon>
          <el-link :href="att.attachPath" target="_blank" type="primary" class="file-name">{{ att.attachName }}</el-link>
          <el-button v-if="editable" type="danger" text size="small" :loading="deleting[att.id]" @click="handleDelete(att.id)">删除</el-button>
          <el-link v-else :href="att.attachPath" target="_blank" type="primary" size="small">下载</el-link>
        </div>
        <div v-if="!leafFiles(leaf.id).length" class="no-file">暂无文件</div>
      </div>
      <div v-if="editable" class="upload-btn-wrap">
        <el-upload :show-file-list="false" :disabled="isUploadDisabled(leaf) || uploading[leaf.id]" :http-request="(opts) => handleUpload(opts.file, leaf.id)">
          <el-button size="small" type="primary" plain :disabled="isUploadDisabled(leaf)" :loading="uploading[leaf.id]">
            <el-icon><Upload /></el-icon>
            {{ isUploadDisabled(leaf) ? '已达上限' : '上传文件' }}
          </el-button>
        </el-upload>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadAttachment, deleteAttachment } from '@/api/attachment'

const props = defineProps({
  items:       { type: Array,  default: () => [] },
  attachments: { type: Array,  default: () => [] },
  recordId:    { type: String, default: null },
  editable:    { type: Boolean, default: true }
})

const emit = defineEmits(['attachment-added', 'attachment-removed', 'need-record'])

const uploading = reactive({})
const deleting  = reactive({})

// 按 parentId 建索引
const itemMap = computed(() => {
  const m = {}
  props.items.forEach(i => { m[String(i.id)] = i })
  return m
})

const idSet = computed(() => new Set(props.items.map(i => String(i.id))))

// 顶层非叶节点（isLeaf=0，没有在本批次 items 中有父节点的）
const rootGroups = computed(() =>
  props.items.filter(i => i.isLeaf === 0 && (!i.parentId || !idSet.value.has(String(i.parentId))))
)

// 有父节点的叶子按 parentId 归组
const leafsByParent = computed(() => {
  const m = {}
  props.items.filter(i => i.isLeaf === 1).forEach(i => {
    const pid = i.parentId ? String(i.parentId) : null
    if (!m[pid]) m[pid] = []
    m[pid].push(i)
  })
  return m
})

// 有所属分组的展示组
const displayGroups = computed(() =>
  rootGroups.value.map(g => ({
    ...g,
    leaves: (leafsByParent.value[String(g.id)] || []).sort((a, b) => (a.sortNum || 0) - (b.sortNum || 0))
  }))
)

// 没有分组归属的独立叶子
const soloLeaves = computed(() =>
  (leafsByParent.value['null'] || []).filter(i => !idSet.value.has(String(i.parentId)))
)

// 所有叶子
const allLeaves = computed(() => props.items.filter(i => i.isLeaf === 1))

// 需要达标的叶子（minAttachments > 0）
const requiredLeaves = computed(() => allLeaves.value.filter(i => i.minAttachments > 0))

function leafFiles(itemId) {
  return props.attachments.filter(a => String(a.itemId) === String(itemId))
}

function isLeafComplete(leaf) {
  if (!leaf.minAttachments) return true
  return leafFiles(leaf.id).length >= leaf.minAttachments
}

function isUploadDisabled(leaf) {
  return leaf.maxAttachments > 0 && leafFiles(leaf.id).length >= leaf.maxAttachments
}

const completedCount = computed(() =>
  requiredLeaves.value.filter(isLeafComplete).length
)

const allComplete = computed(() =>
  requiredLeaves.value.length === 0 || completedCount.value >= requiredLeaves.value.length
)

function leafLabel(leaf) {
  const p = leaf.headerPath
  if (p && Array.isArray(p) && p.length > 1) return p.join(' / ')
  return leaf.itemName
}

async function handleUpload(file, itemId) {
  if (!props.recordId) {
    emit('need-record', { file, itemId })
    return Promise.resolve()
  }
  uploading[itemId] = true
  try {
    const res = await uploadAttachment(props.recordId, itemId, file)
    emit('attachment-added', res.data)
    ElMessage.success('上传成功')
  } catch { /* interceptor handles */ } finally {
    uploading[itemId] = false
  }
  return Promise.resolve()
}

async function handleDelete(attachId) {
  deleting[attachId] = true
  try {
    await deleteAttachment(attachId)
    emit('attachment-removed', attachId)
    ElMessage.success('已删除')
  } catch { /* interceptor handles */ } finally {
    deleting[attachId] = false
  }
}

// 供父组件检查是否可提交
defineExpose({ allComplete, completedCount, requiredCount: computed(() => requiredLeaves.value.length) })
</script>

<style scoped>
.score-upload-form { padding: 4px 0; }
.overall-bar { display: flex; align-items: center; margin-bottom: 20px; }
.score-group { margin-bottom: 20px; border: 1px solid #e4e7ed; border-radius: 6px; overflow: hidden; }
.group-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}
.group-name { font-weight: 600; font-size: 14px; }
.leaf-block {
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}
.leaf-block:last-child { border-bottom: none; }
.leaf-block.complete { background: #f6ffed; }
.leaf-block.required { background: #fff9f0; }
.leaf-header { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.leaf-title { font-weight: 500; font-size: 13px; }
.leaf-hint { font-size: 12px; color: #909399; flex: 1; }
.leaf-count { font-size: 12px; display: flex; align-items: center; gap: 4px; white-space: nowrap; }
.count-ok  { color: #67c23a; }
.count-warn { color: #f56c6c; }
.file-list { margin: 6px 0; }
.file-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
.file-name { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.no-file { font-size: 12px; color: #c0c4cc; padding: 4px 0; }
.upload-btn-wrap { margin-top: 8px; }
</style>
