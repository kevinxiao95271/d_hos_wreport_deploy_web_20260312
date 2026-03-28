<template>
  <div>
    <el-empty v-if="!items.length" description="暂无加分项" :image-size="40" />
    <el-collapse v-else>
      <el-collapse-item v-for="item in items" :key="item.id" :name="item.id">
        <template #title>{{ item.pubName || item.compName || item.id }}</template>
        <el-descriptions :column="2" size="small" border>
          <template v-if="item.bonusType === 'publication'">
            <el-descriptions-item label="出版物名称">{{ item.pubName }}</el-descriptions-item>
            <el-descriptions-item label="类别">{{ item.pubCategory }}</el-descriptions-item>
            <el-descriptions-item label="出版日期">{{ item.pubDate }}</el-descriptions-item>
          </template>
          <template v-else>
            <el-descriptions-item label="竞赛名称">{{ item.compName }}</el-descriptions-item>
            <el-descriptions-item label="主办类型">{{ item.compSponsor }}</el-descriptions-item>
            <el-descriptions-item label="竞赛日期">{{ item.compDate }}</el-descriptions-item>
          </template>
        </el-descriptions>
        <el-divider content-position="left" style="margin:8px 0 4px">证明文件</el-divider>
        <div class="file-list">
          <div v-for="f in (item.evidences || [])" :key="f.id" class="file-chip">
            <el-icon><Document /></el-icon>
            <span class="chip-name">{{ f.fileName }}</span>
            <el-button v-if="canPreview(f.fileName)" type="primary" link size="small" @click="$emit('preview', f.fileUrl, f.fileName)">预览</el-button>
            <el-button type="primary" link size="small" tag="a" :href="f.fileUrl" target="_blank">下载</el-button>
          </div>
          <span v-if="!item.evidences?.length" style="color:#c0c4cc;font-size:13px">无</span>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup>
import { Document } from '@element-plus/icons-vue'
defineProps({ items: { type: Array, default: () => [] } })
defineEmits(['preview'])
const IMAGE_EXTS = ['jpg','jpeg','png','gif','webp'], PDF_EXTS = ['pdf'], DOCX_EXTS = ['docx','doc']
function ext(n) { return (n||'').split('.').pop().toLowerCase() }
function canPreview(n) { const e=ext(n); return IMAGE_EXTS.includes(e)||PDF_EXTS.includes(e)||DOCX_EXTS.includes(e) }
</script>
<style scoped>
.file-list { display:flex; flex-wrap:wrap; gap:6px; }
.file-chip { display:flex; align-items:center; gap:6px; background:#f4f4f5; border-radius:4px; padding:3px 8px; font-size:13px; }
.chip-name { max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
</style>
