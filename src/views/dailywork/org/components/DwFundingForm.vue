<!-- 经费执行模块 -->
<template>
  <el-form :model="form" label-width="160px" style="max-width:560px">
    <el-form-item label="财政专项是否有拨款">
      <el-radio-group v-model="form.fiscalHasFund" :disabled="!editable">
        <el-radio :label="true">是</el-radio>
        <el-radio :label="false">否</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item v-if="form.fiscalHasFund" label="财政专项执行率(%)">
      <el-input-number
        v-model="form.fiscalExecutionRate"
        :min="0" :max="100" :precision="1"
        :disabled="!editable"
        style="width:200px"
      />
    </el-form-item>

    <el-form-item label="医院自筹是否有拨款">
      <el-radio-group v-model="form.hospitalHasFund" :disabled="!editable">
        <el-radio :label="true">是</el-radio>
        <el-radio :label="false">否</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item v-if="form.hospitalHasFund" label="医院自筹执行率(%)">
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
const form       = ref({ fiscalHasFund: null, hospitalHasFund: null, fiscalExecutionRate: null, hospitalExecutionRate: null })
const extraLocal = ref({})

watch(() => props.funding, (v) => {
  if (v) form.value = { ...v }
}, { immediate: true })

watch(() => props.extraValues, (v) => {
  extraLocal.value = { ...(v || {}) }
}, { immediate: true })

async function handleSave() {
  saving.value = true
  try {
    await saveFunding({ ...form.value, recordId: props.recordId })
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
