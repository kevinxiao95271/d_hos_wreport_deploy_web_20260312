<!-- 三级质控网络完善（树选择+单记录覆盖+附件） -->
<template>
  <div class="network-build-form">
    <PreviewDialog ref="previewRef" />

    <p v-if="moduleConfig.scoreDesc" class="upload-hint-global">{{ moduleConfig.scoreDesc }}</p>

    <!-- 只读：展示已填数据 -->
    <template v-if="!editable && networkBuild">
      <el-descriptions border :column="2" size="small">
        <el-descriptions-item label="市级质控中心数">
          {{ networkBuild.cityCenterCount ?? 0 }} 家
        </el-descriptions-item>
        <el-descriptions-item label="区县级质控中心数">
          {{ networkBuild.countyCenterCount ?? 0 }} 家
        </el-descriptions-item>
        <el-descriptions-item label="已覆盖市级" :span="2">
          <span v-if="networkBuild.cityCenterNames?.length">
            {{ networkBuild.cityCenterNames.join('、') }}
          </span>
          <span v-else style="color:#c0c4cc">—</span>
        </el-descriptions-item>
        <el-descriptions-item label="已覆盖区县" :span="2">
          <template v-if="networkBuild.countyCenterGroups?.length">
            <div v-for="g in networkBuild.countyCenterGroups" :key="g.cityName" class="county-group-row">
              <span class="county-city-label">{{ g.cityName }}：</span>
              <span class="county-names">{{ g.counties.join('、') }}</span>
            </div>
          </template>
          <span v-else-if="networkBuild.countyCenterNames?.length">
            {{ networkBuild.countyCenterNames.join('、') }}
          </span>
          <span v-else style="color:#c0c4cc">—</span>
        </el-descriptions-item>
      </el-descriptions>
    </template>

    <!-- 可编辑：树形选择 + 保存 -->
    <template v-else-if="editable">
      <div class="form-section">
        <div class="section-title">省→市质控中心（勾选已建立的市级质控中心）</div>
        <div class="guidance-tree-wrap">
          <el-checkbox-group v-model="form.cityCenterIds" class="city-checkbox-group">
            <el-checkbox v-for="c in cityTree" :key="c.id" :label="c.id">{{ c.name }}</el-checkbox>
          </el-checkbox-group>
          <div class="tree-count">已选 <b>{{ form.cityCenterIds?.length || 0 }}</b> 家</div>
        </div>
      </div>

      <div class="form-section">
        <div class="section-title">省→市→县质控中心（勾选已建立的区县级质控中心）</div>
        <div class="guidance-tree-wrap">
          <el-tree
            ref="countyTreeRef"
            :data="countyTree"
            :props="{ children: 'children', label: 'name' }"
            show-checkbox
            :check-strictly="false"
            node-key="id"
            :default-checked-keys="form.countyCenterIds || []"
            @check="onCountyCheck"
            class="county-tree"
          />
          <div class="tree-count">已选 <b>{{ form.countyCenterIds?.length || 0 }}</b> 家</div>
        </div>
      </div>

      <div class="form-footer">
        <el-button type="primary" :loading="saving" @click="handleSave">保存覆盖范围</el-button>
        <span class="save-hint">保存后管理员将根据覆盖范围进行打分</span>
      </div>
    </template>

    <!-- 无数据 + 只读 -->
    <el-empty v-else description="暂未填写网络完善信息" :image-size="60" />

    <!-- 附件区 -->
    <el-divider content-position="left" style="margin:16px 0 8px">证明材料附件</el-divider>
    <DwAttachSlot
      :files="evidenceFiles"
      :record-id="recordId"
      module-type="network_build"
      slot_="evidence"
      :editable="editable"
      label="网络完善证明材料"
      accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
      format-hint="支持 PDF / DOCX / 图片"
      @uploaded="$emit('saved')"
      @deleted="$emit('deleted')"
      @preview="(url, name) => previewRef.show(url, name)"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { saveNetworkBuild, getGuidanceRegions } from '@/api/dailywork'
import DwAttachSlot from './DwAttachSlot.vue'
import PreviewDialog from '@/components/PreviewDialog.vue'

const props = defineProps({
  moduleConfig: { type: Object, required: true },
  networkBuild: { type: Object, default: null },
  record:       { type: Object, required: true },
  recordId:     { type: [String, Number], required: true },
  editable:     { type: Boolean, default: true },
})
const emit = defineEmits(['saved', 'deleted'])

const previewRef     = ref(null)
const saving         = ref(false)
const cityTree       = ref([])
const countyTree     = ref([])
const countyTreeRef  = ref(null)

const form = ref({
  cityCenterIds:   [],
  countyCenterIds: [],
})

const evidenceFiles = computed(() => props.record?.networkBuildFiles || props.networkBuild?.evidences || [])

function parseIds(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) } catch { return [] }
}

function onCountyCheck(_, state) {
  const leaves = state.checkedNodes.filter(n => !n.children?.length)
  form.value.countyCenterIds = leaves.map(n => n.id)
}

async function loadRegions() {
  if (cityTree.value.length) return
  try {
    const res = await getGuidanceRegions()
    cityTree.value   = res.data?.cityTree?.children   || res.data?.cityTree   || []
    countyTree.value = res.data?.countyTree?.children || res.data?.countyTree || []
  } catch { /* ignore */ }
}

async function handleSave() {
  saving.value = true
  try {
    await saveNetworkBuild({
      recordId:         String(props.recordId),
      cityCenterCount:  form.value.cityCenterIds?.length   || 0,
      cityCenterIds:    JSON.stringify(form.value.cityCenterIds   || []),
      countyCenterCount: form.value.countyCenterIds?.length || 0,
      countyCenterIds:  JSON.stringify(form.value.countyCenterIds || []),
    })
    ElMessage.success('网络完善覆盖范围已保存')
    emit('saved')
  } finally {
    saving.value = false
  }
}

// 回填已有数据
watch(() => props.networkBuild, (nb) => {
  if (nb) {
    form.value.cityCenterIds   = parseIds(nb.cityCenterIds)
    form.value.countyCenterIds = parseIds(nb.countyCenterIds)
  }
}, { immediate: true })

onMounted(loadRegions)
</script>

<style scoped>
.network-build-form { }
.upload-hint-global { font-size: 13px; color: #909399; margin-bottom: 12px; }
.form-section { margin-bottom: 16px; }
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}
.guidance-tree-wrap { width: 100%; }
.city-checkbox-group { display: flex; flex-wrap: wrap; gap: 6px 0; }
.county-tree {
  max-height: 260px; overflow-y: auto;
  border: 1px solid #ebeef5; border-radius: 4px; padding: 4px 0;
}
.tree-count { font-size: 12px; color: #409eff; margin-top: 6px; }
.form-footer {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 0 4px;
}
.save-hint { font-size: 12px; color: #909399; }
.county-group-row { line-height: 1.9; }
.county-city-label { font-weight: 500; color: #409eff; }
.county-names { color: #606266; }
</style>
