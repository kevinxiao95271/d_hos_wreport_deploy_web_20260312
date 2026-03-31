<!-- 经费执行模块 -->
<template>
  <el-form :model="form" label-width="160px" style="max-width:560px">
    <el-form-item label="财政专项拨款（万元）">
      <el-input-number
        v-model="form.fiscalAppropriationWan"
        :min="0"
        :precision="2"
        :disabled="!editable"
        style="width:200px"
      />
    </el-form-item>

    <el-form-item label="财政执行率（%）">
      <el-input-number
        v-model="form.fiscalExecutionRate"
        :min="0" :max="100" :precision="1"
        :disabled="!editable"
        style="width:200px"
      />
    </el-form-item>

    <el-form-item label="医院自筹拨款（万元）">
      <el-input-number
        v-model="form.hospitalAppropriationWan"
        :min="0"
        :precision="2"
        :disabled="!editable"
        style="width:200px"
      />
    </el-form-item>

    <el-form-item label="医院执行率（%）">
      <el-input-number
        v-model="form.hospitalExecutionRate"
        :min="0" :max="100" :precision="1"
        :disabled="!editable"
        style="width:200px"
      />
    </el-form-item>

    <!-- 扩展字段 -->
    <DwExtraFields
      v-if="moduleConfig.extraFields?.length"
      :fields="moduleConfig.extraFields"
      v-model="extraLocal"
      :editable="editable"
      @save="saveExtra"
    />

    <el-form-item v-if="editable">
      <el-button type="primary" :loading="saving" @click="handleSave">保存经费信息</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { saveFunding, saveDwFieldValues } from '@/api/dailywork'
import DwExtraFields from './DwExtraFields.vue'

const props = defineProps({
  moduleConfig: { type: Object, required: true },
  funding:      { type: Object, default: null },
  extraValues:  { type: Object, default: () => ({}) },
  recordId:     { type: [String, Number], required: true },
  editable:     { type: Boolean, default: true },
})
const emit = defineEmits(['saved'])

const saving     = ref(false)
const form = ref({
  fiscalAppropriationWan: null,
  fiscalExecutionRate: null,
  hospitalAppropriationWan: null,
  hospitalExecutionRate: null,
})
const extraLocal = ref({})

watch(() => props.funding, (v) => {
  if (!v) return
  form.value = {
    fiscalAppropriationWan: v.fiscalAppropriationWan ?? null,
    fiscalExecutionRate: v.fiscalExecutionRate ?? null,
    hospitalAppropriationWan: v.hospitalAppropriationWan ?? null,
    hospitalExecutionRate: v.hospitalExecutionRate ?? null,
  }
}, { immediate: true })

watch(() => props.extraValues, (v) => {
  extraLocal.value = { ...(v || {}) }
}, { immediate: true })

async function handleSave() {
  saving.value = true
  try {
    const payload = {
      recordId: props.recordId,
      fiscalAppropriationWan: form.value.fiscalAppropriationWan,
      fiscalExecutionRate: form.value.fiscalExecutionRate,
      hospitalAppropriationWan: form.value.hospitalAppropriationWan,
      hospitalExecutionRate: form.value.hospitalExecutionRate,
    }
    await saveFunding(payload)
    if (Object.keys(extraLocal.value).length) {
      await saveDwFieldValues({ recordId: String(props.recordId), moduleKey: 'funding', values: extraLocal.value })
    }
    ElMessage.success('经费信息已保存')
    emit('saved')
  } finally { saving.value = false }
}

async function saveExtra(vals) {
  if (!props.editable) return
  try {
    await saveDwFieldValues({ recordId: String(props.recordId), moduleKey: 'funding', values: vals })
  } catch { /* ignore */ }
}
</script>
