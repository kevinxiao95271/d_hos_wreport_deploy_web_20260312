<!-- 动态扩展字段渲染组件 -->
<template>
  <template v-for="field in fields" :key="field.fieldKey">
    <el-form-item
      :label="field.fieldName"
      :required="field.isRequired"
    >
      <el-input
        v-if="field.fieldType === 'text'"
        v-model="localValues[field.fieldKey]"
        :placeholder="field.placeholder || ''"
        :disabled="!editable"
        @blur="emitSave"
      />
      <el-input-number
        v-else-if="field.fieldType === 'number'"
        v-model="numericProxy[field.fieldKey]"
        :placeholder="field.placeholder || ''"
        :disabled="!editable"
        style="width:200px"
        @blur="emitSave"
      />
      <el-select
        v-else-if="field.fieldType === 'enum'"
        v-model="localValues[field.fieldKey]"
        :placeholder="field.placeholder || '请选择'"
        :disabled="!editable"
        style="width:220px"
        @change="emitSave"
      >
        <el-option
          v-for="opt in parseOptions(field.fieldOptions)"
          :key="opt" :label="opt" :value="opt"
        />
      </el-select>
      <el-checkbox-group
        v-else-if="field.fieldType === 'checkbox'"
        v-model="checkboxProxy[field.fieldKey]"
        :disabled="!editable"
        @change="emitSave"
      >
        <el-checkbox
          v-for="opt in parseOptions(field.fieldOptions)"
          :key="opt" :label="opt"
        />
      </el-checkbox-group>
    </el-form-item>
  </template>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'

const props = defineProps({
  fields:      { type: Array,   default: () => [] },
  modelValue:  { type: Object,  default: () => ({}) },
  editable:    { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'save'])

const localValues = reactive({ ...props.modelValue })

watch(() => props.modelValue, (v) => {
  Object.keys(v || {}).forEach(k => { localValues[k] = v[k] })
}, { deep: true })

// number fields: store as string in localValues, expose as number for el-input-number
const numericProxy = computed(() => {
  const proxy = {}
  props.fields.filter(f => f.fieldType === 'number').forEach(f => {
    const v = localValues[f.fieldKey]
    proxy[f.fieldKey] = v !== undefined && v !== '' ? Number(v) : null
  })
  return new Proxy(proxy, {
    set(_, key, val) {
      localValues[key] = val !== null && val !== undefined ? String(val) : ''
      return true
    }
  })
})

// checkbox fields: store as JSON string, expose as array
const checkboxProxy = computed(() => {
  const proxy = {}
  props.fields.filter(f => f.fieldType === 'checkbox').forEach(f => {
    const v = localValues[f.fieldKey]
    try { proxy[f.fieldKey] = v ? JSON.parse(v) : [] } catch { proxy[f.fieldKey] = [] }
  })
  return new Proxy(proxy, {
    set(_, key, val) {
      localValues[key] = JSON.stringify(val)
      return true
    }
  })
})

function parseOptions(str) {
  try { return str ? JSON.parse(str) : [] } catch { return [] }
}

function emitSave() {
  emit('update:modelValue', { ...localValues })
  emit('save', { ...localValues })
}
</script>
