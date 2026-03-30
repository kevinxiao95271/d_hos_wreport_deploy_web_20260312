<template>
  <div>
    <el-empty v-if="!items.length" description="暂无加分项" :image-size="40" />
    <el-collapse v-else>
      <el-collapse-item v-for="item in items" :key="item.id" :name="item.id">
        <template #title>{{ item.pubName || item.compName || item.id }}</template>
        <el-descriptions :column="2" size="small" border>
          <el-descriptions-item v-if="item.bonusType === 'publication'" label="出版物名称">{{ item.pubName }}</el-descriptions-item>
          <el-descriptions-item v-if="item.bonusType === 'publication'" label="类别">{{ pubCategoryLabel(item.pubCategory) }}</el-descriptions-item>
          <el-descriptions-item v-if="item.bonusType === 'publication'" label="出版日期">{{ item.pubDate }}</el-descriptions-item>
          <el-descriptions-item v-if="item.bonusType === 'competition'" label="竞赛名称">{{ item.compName }}</el-descriptions-item>
          <el-descriptions-item v-if="item.bonusType === 'competition'" label="主办类型">{{ compSponsorLabel(item.compSponsor) }}</el-descriptions-item>
          <el-descriptions-item v-if="item.bonusType === 'competition'" label="举办时间">{{ formatCompDate(item) }}</el-descriptions-item>
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
const pubCategoryLabel  = v => ({ book_guide_consensus: '专著/指南/共识', standard_norm: '标准/规范' }[v] ?? v ?? '—')
const compSponsorLabel  = v => ({ provincial_joint: '省级联合主办', other: '其他' }[v] ?? v ?? '—')
const halfLabel = h => h === 'AM' ? '上午' : h === 'PM' ? '下午' : ''
function formatCompDate(item) {
  const sD = item.compStartDate, sH = item.compStartHalf
  const eD = item.compEndDate,   eH = item.compEndHalf
  if (sD && eD) return `${sD} ${halfLabel(sH)} → ${eD} ${halfLabel(eH)}`
  return '—'
}
</script>
<style scoped>
.file-list { display:flex; flex-wrap:wrap; gap:6px; }
.file-chip { display:flex; align-items:center; gap:6px; background:#f4f4f5; border-radius:4px; padding:3px 8px; font-size:13px; }
.chip-name { max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
</style>
