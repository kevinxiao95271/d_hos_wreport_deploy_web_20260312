<template>
  <el-drawer
    v-model="visible"
    :title="drawerTitle"
    size="88%"
    direction="rtl"
    destroy-on-close
    class="dashboard-drilldown-drawer"
  >
    <template v-if="context">
      <div class="drilldown-meta">
        <el-tag type="primary" effect="plain">{{ context.orgName }}</el-tag>
        <el-tag type="success" effect="plain">{{ context.moduleName }}</el-tag>
        <el-tag v-if="context.taskPeriodLabel" effect="plain">{{ context.taskPeriodLabel }}</el-tag>
        <span class="drilldown-count">共 {{ context.count }} 条</span>
      </div>

      <DwAdminView
        v-if="visible && context.recordId"
        embedded
        :record-id-prop="context.recordId"
        :focus-module-key="context.moduleKey"
      />
    </template>
  </el-drawer>
</template>

<script setup>
import { computed, ref } from 'vue'
import DwAdminView from '@/views/dailywork/admin/DwAdminView.vue'

const visible = ref(false)
const context = ref(null)

const drawerTitle = computed(() => {
  if (!context.value) return '模块明细'
  return `${context.value.orgName || '机构'} · ${context.value.moduleName || '模块'}`
})

function open(ctx) {
  context.value = ctx
  visible.value = true
}

defineExpose({ open })
</script>

<style scoped>
.drilldown-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #f5f9ff 0%, #fafcff 100%);
  border: 1px solid #e4ebf5;
  border-radius: 10px;
}

.drilldown-count {
  margin-left: auto;
  font-size: 13px;
  color: #606266;
}
</style>

<style>
.dashboard-drilldown-drawer .el-drawer__body {
  padding-top: 8px;
}
</style>
