<template>
  <!-- ── 父节点：渲染为分组表头 ── -->
  <el-table-column
    v-if="node.children && node.children.length"
    :label="node.itemName"
    align="center"
  >
    <TableColumnGroup
      v-for="child in node.children"
      :key="child.id"
      :node="child"
    />
  </el-table-column>

  <!-- ── 叶节点：渲染数据列 ── -->
  <el-table-column
    v-else
    :label="node.itemName"
    :prop="String(node.id)"
    :min-width="ctx.colMinWidth(node)"
    :align="node.valueType === 'attachment' ? 'left' : ctx.colAlign(node)"
  >
    <template #header>
      <div>
        {{ node.itemName }}
        <span v-if="node.unit && !ctx.isScore.value" class="unit-label">（{{ node.unit }}）</span>
        <div v-if="node.valueType === 'attachment'" class="score-col-constraint">
          {{ ctx.scoreConstraintText(node) }}
        </div>
        <span v-else-if="node.requireAttachment === 1" style="color:red"> *</span>
      </div>
    </template>

    <template #default="{ row, $index }">
      <!-- ═══ attachment 叶子：上传格子 ═══ -->
      <template v-if="node.valueType === 'attachment'">
        <div class="score-cell">
          <div class="score-cell-top">
            <span class="score-badge" :class="ctx.scoreBadgeClass(node)">
              {{ ctx.scoreBadgeText(node) }}
            </span>
          </div>
          <div v-if="node.placeholder" class="score-hint">{{ node.placeholder }}</div>
          <!-- 格式 / 数量约束提示 -->
          <div v-if="formatHint(node)" class="score-format-hint">{{ formatHint(node) }}</div>
          <div v-if="ctx.cellAttachments(node.id).length" class="score-chips">
            <div
              v-for="att in ctx.cellAttachments(node.id)"
              :key="att.id"
              class="score-chip"
            >
              <el-icon size="12" color="#409eff"><Document /></el-icon>
              <span class="chip-name" :title="att.attachName">{{ att.attachName }}</span>
              <el-button
                v-if="canPreview(att.attachName)"
                type="primary" text size="small"
                class="chip-action"
                @click="ctx.previewFile(att.attachPath, att.attachName)"
              >预览</el-button>
              <el-link
                :href="att.attachPath"
                target="_blank"
                type="default"
                class="chip-action"
              >下载</el-link>
              <el-button
                v-if="ctx.editable.value"
                type="danger" text size="small"
                class="chip-del"
                :loading="ctx.deleting[att.id]"
                @click="ctx.handleScoreDelete(att.id)"
              >删</el-button>
            </div>
          </div>
          <div v-else class="score-empty">暂无文件</div>
          <el-upload
            v-if="ctx.editable.value"
            :show-file-list="false"
            :accept="toAccept(node.allowedFormats)"
            :disabled="ctx.scoreIsDisabled(node) || ctx.uploading[node.id]"
            :http-request="(opts) => ctx.handleScoreUpload(opts.file, node.id)"
            style="margin-top:6px"
          >
            <el-button
              size="small" plain
              :type="ctx.scoreIsDisabled(node) ? 'info' : 'primary'"
              :disabled="ctx.scoreIsDisabled(node)"
              :loading="ctx.uploading[node.id]"
            >
              {{ ctx.scoreIsDisabled(node) ? '已达上限' : '+ 上传文件' }}
            </el-button>
          </el-upload>
        </div>
      </template>

      <!-- ═══ 普通格子：文本/数字/下拉/日期 ═══ -->
      <template v-else>
        <!-- 编辑模式 -->
        <template v-if="ctx.editable.value">
          <el-select
            v-if="node.dictCode"
            v-model="row[node.id]"
            style="width:100%"
            clearable
            @change="ctx.emitChange"
          >
            <el-option
              v-for="opt in ctx.dictsCache.value[node.dictCode] || []"
              :key="opt.itemValue"
              :label="opt.itemLabel"
              :value="opt.itemValue"
            />
          </el-select>
          <el-input
            v-else-if="node.valueType === 'text'"
            v-model="row[node.id]"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 8 }"
            :placeholder="node.placeholder || ''"
            @change="ctx.emitChange"
          />
          <el-input
            v-else-if="node.valueType === 'number'"
            v-model="row[node.id]"
            type="number"
            :placeholder="node.placeholder || ''"
            @change="ctx.emitChange"
          />
          <el-date-picker
            v-else-if="node.valueType === 'date'"
            v-model="row[node.id]"
            type="date"
            value-format="YYYY-MM-DD"
            style="width:100%"
            @change="ctx.emitChange"
          />
          <el-select
            v-else-if="node.valueType === 'select'"
            v-model="row[node.id]"
            style="width:100%"
            @change="ctx.emitChange"
          >
            <el-option
              v-for="opt in ctx.parseOptions(node.placeholder)"
              :key="opt"
              :label="opt"
              :value="opt"
            />
          </el-select>
          <el-input v-else v-model="row[node.id]" @change="ctx.emitChange" />
        </template>

        <!-- 只读模式 -->
        <div
          v-else
          :class="node.valueType === 'text' ? 'cell-text-ro' : 'cell-val-ro'"
        >
          {{ ctx.dictLabel(node, row[String(node.id)]) }}
        </div>

        <!-- form 模式内联附件 -->
        <template v-if="ctx.inlineFormAttach.value && node.requireAttachment > 0 && $index === 0">
          <div class="inline-attach">
            <div
              v-for="att in ctx.cellAttachments(node.id)"
              :key="att.id"
              class="inline-attach-row"
            >
              <el-icon size="13" color="#409eff"><Document /></el-icon>
              <el-link :href="att.attachPath" target="_blank" type="primary" class="attach-name">
                {{ att.attachName }}
              </el-link>
              <el-button
                v-if="ctx.editable.value"
                type="danger" text size="small"
                style="padding:0 2px"
                @click="ctx.onFormDeleteFile(att.id)"
              >删</el-button>
            </div>
            <el-upload
              v-if="ctx.editable.value"
              :show-file-list="false"
              :http-request="(opts) => { ctx.onFormUploadFile(opts.file, node.id); return Promise.resolve() }"
              style="display:inline-block;margin-top:4px"
            >
              <el-button size="small" plain style="font-size:11px;padding:2px 8px">
                <el-icon><Upload /></el-icon> 上传
                <el-tag
                  v-if="node.requireAttachment === 1"
                  type="danger" size="small"
                  style="margin-left:4px;transform:scale(.85)"
                >必传</el-tag>
              </el-button>
            </el-upload>
          </div>
        </template>
      </template>
    </template>
  </el-table-column>
</template>

<script setup>
import { inject } from 'vue'
import { Document, Upload } from '@element-plus/icons-vue'

defineProps({ node: { type: Object, required: true } })

const ctx = inject('dhtCtx')

const PREVIEW_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'pdf']
function canPreview(name) {
  return PREVIEW_EXTS.includes((name || '').split('.').pop().toLowerCase())
}

function toAccept(allowedFormats) {
  if (!allowedFormats) return '*'
  return allowedFormats.split(',').map(ext => `.${ext.trim()}`).join(',')
}

function formatHint(node) {
  const parts = []
  if (node.allowedFormats) {
    parts.push(`格式：${node.allowedFormats.toUpperCase().replace(/,/g, ' / ')}`)
  }
  const min = node.minAttachments || 0
  const max = node.maxAttachments || 0
  if (min > 0 && max > 0 && min === max) {
    parts.push(`需 ${min} 个`)
  } else {
    if (min > 0) parts.push(`至少 ${min} 个`)
    if (max > 0) parts.push(`最多 ${max} 个`)
  }
  return parts.join('，')
}
</script>

<style scoped>
.unit-label { font-size: 12px; color: #999; }
.score-col-constraint { font-size: 11px; color: #909399; margin-top: 2px; }

.score-cell { padding: 2px 0; }
.score-cell-top { margin-bottom: 6px; }
.score-badge { font-size: 12px; font-weight: 500; padding: 1px 7px; border-radius: 10px; }
.badge-ok   { color: #67c23a; background: #f0f9eb; }
.badge-warn { color: #e6a23c; background: #fdf6ec; }
.badge-fail { color: #f56c6c; background: #fef0f0; }
.badge-none { color: #909399; background: #f5f5f5; }

.score-hint        { font-size: 11px; color: #c0c4cc; margin-bottom: 4px; line-height: 1.4; }
.score-format-hint { font-size: 11px; color: #909399; margin-bottom: 6px; line-height: 1.4; }
.score-empty { font-size: 12px; color: #c0c4cc; margin: 4px 0; }

.score-chips { display: flex; flex-direction: column; gap: 4px; margin-bottom: 4px; }
.score-chip {
  display: flex; align-items: center; gap: 5px;
  background: #f5f7fa; border: 1px solid #e4e7ed;
  border-radius: 4px; padding: 3px 7px; font-size: 12px;
}
.chip-name {
  flex: 1; font-size: 12px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px;
}
.chip-action { padding: 0 3px; font-size: 11px; flex-shrink: 0; }
.chip-del    { padding: 0 2px; font-size: 11px; flex-shrink: 0; }

.cell-text-ro { white-space: pre-wrap; word-break: break-word; line-height: 1.6; text-align: left; min-height: 44px; }
.cell-val-ro  { line-height: 1.6; }

.inline-attach { margin-top: 6px; border-top: 1px dashed #e4e7ed; padding-top: 6px; }
.inline-attach-row { display: flex; align-items: center; gap: 4px; margin-bottom: 3px; }
.attach-name { font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
