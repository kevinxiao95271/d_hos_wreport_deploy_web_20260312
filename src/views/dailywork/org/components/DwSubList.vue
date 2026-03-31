<!-- 多条记录型模块（会议 / 培训 / 指导 / 调研）列表 -->
<template>
  <div>
    <PreviewDialog ref="previewRef" />

    <!-- ① 已有记录：折叠列表 -->
    <template v-if="items.length">
      <div class="collapse-scroll-wrap">
      <el-collapse v-model="openIds">
        <el-collapse-item
          v-for="item in displayItems"
          :key="collapseItemId(item)"
          :name="collapseItemId(item)"
          class="dw-sublist-quarter"
          :style="dwQuarterRowStyle(item)"
        >
          <template #title>
            <div class="collapse-title">
              <div class="title-left">
                <span class="item-title">{{ itemTitle(item) }}</span>
                <el-tag v-if="item.startYearQuarter" size="small" type="info" effect="plain" class="quarter-tag">{{ item.startYearQuarter }}</el-tag>
              </div>
              <div class="title-actions" @click.stop>
                <el-button v-if="editable" type="primary" link size="small" @click="openEdit(item)">编辑</el-button>
                <el-button v-if="editable" type="danger"  link size="small" :loading="deletingId === item.id" @click="handleDelete(item)">删除</el-button>
              </div>
            </div>
          </template>

          <!-- 固定字段预览 -->
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item
              v-for="fd in displayFields"
              :key="fd.key"
              :label="fd._countKey ? `${fd.label}（${item[fd._countKey] ?? 0} 家）` : fd.label"
            >{{ formatFixed(item, fd) }}</el-descriptions-item>
          </el-descriptions>

          <!-- guidance 专属：县级中心按市分组展示 -->
          <template v-if="moduleKey === 'guidance'">
            <div class="county-groups-wrap">
              <div class="county-groups-title">
                省→市→县质控中心（{{ item.countyCenterCount ?? 0 }} 家）
              </div>
              <template v-if="item.countyCenterGroups?.length">
                <div
                  v-for="g in item.countyCenterGroups"
                  :key="g.cityName"
                  class="county-group-row"
                >
                  <span class="county-city-label">{{ g.cityName }}：</span>
                  <span class="county-names">{{ g.counties.join('、') }}</span>
                </div>
              </template>
              <span v-else-if="item.countyCenterNames?.length" class="county-names">
                {{ item.countyCenterNames.join('、') }}
              </span>
              <span v-else style="color:#c0c4cc;font-size:13px">—</span>
            </div>
          </template>

          <!-- 扩展字段预览（extraFields 仅子记录级动态字段，不含 module_self_score） -->
          <template v-if="moduleConfig.extraFields?.length">
            <el-descriptions :column="2" size="small" border>
              <el-descriptions-item
                v-for="ef in moduleConfig.extraFields"
                :key="ef.fieldKey"
                :label="ef.fieldName"
              >{{ item.extraValues?.[ef.fieldKey] ?? '—' }}</el-descriptions-item>
            </el-descriptions>
          </template>

          <!-- 附件区 -->
          <el-divider content-position="left" style="margin:12px 0 8px">附件</el-divider>
          <div class="attach-grid">
            <DwAttachSlot
              v-for="s in slotDef"
              :key="s.slot"
              :files="item[s.field] || []"
              :record-id="recordId"
              :module-type="moduleKey"
              :slot_="s.slot"
              :sub-record-id="item.id"
              :editable="editable"
              :label="s.label"
              :accept="s.accept"
              :format-hint="s.hint"
              @uploaded="$emit('saved')"
              @deleted="$emit('deleted')"
              @preview="(url, name) => previewRef.show(url, name)"
            />
          </div>
        </el-collapse-item>
      </el-collapse>
      </div>

      <el-button v-if="editable" type="primary" plain style="margin-top:12px" @click="openDialog(null)">
        <el-icon><Plus /></el-icon> 新增
      </el-button>
    </template>

    <!-- ② 无记录 + 可编辑：内联表单 -->
    <template v-else-if="editable">
      <div class="inline-form-wrap">
        <el-form :model="form" label-width="130px" :rules="rules" ref="formRef" @submit.prevent>
          <!-- 普通字段 -->
          <template v-for="fd in fixedFields" :key="fd.key">
            <el-form-item :label="fd.label" :prop="fd.key">
              <el-input
                v-if="fd.type === 'text'"
                v-model="form[fd.key]"
                :placeholder="fd.placeholder"
                type="textarea"
                :autosize="{ minRows: 2 }"
              />
              <el-date-picker
                v-else-if="fd.type === 'date'"
                v-model="form[fd.key]"
                type="date" value-format="YYYY-MM-DD"
                placeholder="选择日期" style="width:100%"
              />
              <el-select v-else-if="fd.type === 'select'" v-model="form[fd.key]" style="width:100%">
                <el-option v-for="o in fd.options" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
              <el-input-number
                v-else-if="fd.type === 'number'"
                v-model="form[fd.key]" :min="0" :placeholder="fd.placeholder"
                style="width:100%" controls-position="right"
              />
              <el-input-number
                v-else-if="fd.type === 'percent'"
                v-model="form[fd.key]" :min="0" :max="100" :precision="1"
                style="width:100%" controls-position="right"
              >
                <template #suffix>%</template>
              </el-input-number>
              <div v-else-if="fd.type === 'timeRange'" class="time-range-group">
                <div class="time-range-row">
                  <span class="time-range-side-label">开始</span>
                  <el-date-picker v-model="form[fd.startDateKey]" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" style="width:160px"
                    :disabled-date="disabledAfter(form[fd.endDateKey])" />
                  <el-select v-model="form[fd.startHalfKey]" style="width:90px">
                    <el-option label="上午" value="AM" /><el-option label="下午" value="PM" />
                  </el-select>
                </div>
                <div class="time-range-row" style="margin-top:6px">
                  <span class="time-range-side-label">结束</span>
                  <el-date-picker v-model="form[fd.endDateKey]" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" style="width:160px"
                    :disabled-date="disabledBefore(form[fd.startDateKey])" />
                  <el-select v-model="form[fd.endHalfKey]" style="width:90px">
                    <el-option label="上午" value="AM" /><el-option label="下午" value="PM" />
                  </el-select>
                </div>
              </div>
            </el-form-item>
          </template>

          <!-- 质控指导：机构树形选择 -->
          <template v-if="moduleKey === 'guidance'">
            <el-form-item label="省→市质控中心">
              <div class="guidance-tree-wrap">
                <el-checkbox-group v-model="form.cityCenterIds" class="city-checkbox-group">
                  <el-checkbox v-for="c in cityTree" :key="c.id" :label="c.id">{{ c.name }}</el-checkbox>
                </el-checkbox-group>
                <div class="tree-count">已选 <b>{{ form.cityCenterIds?.length || 0 }}</b> 家</div>
              </div>
            </el-form-item>
            <el-form-item label="省→市→县质控中心">
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
            </el-form-item>
          </template>

          <!-- 扩展字段（跳过模块级自评分） -->
          <DwExtraFields
            v-if="moduleConfig.extraFields?.filter(f => f.fieldKey !== 'module_self_score').length"
            :fields="moduleConfig.extraFields.filter(f => f.fieldKey !== 'module_self_score')"
            v-model="form.extraValues"
            :editable="true"
          />
        </el-form>

        <!-- 附件选择区（保存时一并上传） -->
        <template v-if="slotDef.length">
          <el-divider content-position="left" style="margin:14px 0 10px">
            附件 <span class="attach-inline-tip">（选好后点「保存本条」一并上传）</span>
          </el-divider>
          <div class="attach-inline-grid">
            <div v-for="s in slotDef" :key="s.slot" class="attach-inline-slot">
              <div class="attach-slot-label">{{ s.label }}</div>
              <div class="attach-slot-fmt">{{ s.hint }}</div>
              <div v-if="pendingFiles[s.slot]?.length" class="pending-chips">
                <el-tag
                  v-for="(f, idx) in pendingFiles[s.slot]"
                  :key="idx" closable size="small"
                  style="margin:2px 4px 2px 0"
                  @close="removePending(s.slot, idx)"
                >{{ f.name }}</el-tag>
              </div>
              <el-upload
                :accept="s.accept" :show-file-list="false"
                :auto-upload="false" multiple
                :on-change="(file) => addPending(s.slot, file)"
                style="margin-top:6px"
              >
                <el-button size="small" plain :icon="Plus">选择文件</el-button>
              </el-upload>
            </div>
          </div>
        </template>

        <div class="inline-footer">
          <el-button type="primary" :loading="uploadingInline" @click="handleSave">保存本条</el-button>
        </div>
      </div>
    </template>

    <!-- ③ 无记录 + 只读 -->
    <el-empty v-else description="暂无记录" :image-size="60" />

    <!-- 编辑/新增弹窗（有列表时使用） -->
    <el-dialog v-model="dialogVisible" :title="editingItem ? '编辑' : '新增'" width="680px" destroy-on-close>
      <el-form :model="form" label-width="130px" :rules="rules" ref="formRef">
        <template v-for="fd in fixedFields" :key="fd.key">
          <el-form-item :label="fd.label" :prop="fd.key">
            <el-input
              v-if="fd.type === 'text'"
              v-model="form[fd.key]" :placeholder="fd.placeholder"
              type="textarea" :autosize="{ minRows: 2 }"
            />
            <el-date-picker
              v-else-if="fd.type === 'date'"
              v-model="form[fd.key]" type="date"
              value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%"
            />
            <el-select v-else-if="fd.type === 'select'" v-model="form[fd.key]" style="width:100%">
              <el-option v-for="o in fd.options" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
            <el-input-number
              v-else-if="fd.type === 'number'"
              v-model="form[fd.key]" :min="0" :placeholder="fd.placeholder"
              style="width:100%" controls-position="right"
            />
            <el-input-number
              v-else-if="fd.type === 'percent'"
              v-model="form[fd.key]" :min="0" :max="100" :precision="1"
              style="width:100%" controls-position="right"
            >
              <template #suffix>%</template>
            </el-input-number>
            <div v-else-if="fd.type === 'timeRange'" class="time-range-group">
              <div class="time-range-row">
                <span class="time-range-side-label">开始</span>
                <el-date-picker v-model="form[fd.startDateKey]" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" style="width:160px"
                  :disabled-date="disabledAfter(form[fd.endDateKey])" />
                <el-select v-model="form[fd.startHalfKey]" style="width:90px">
                  <el-option label="上午" value="AM" /><el-option label="下午" value="PM" />
                </el-select>
              </div>
              <div class="time-range-row" style="margin-top:6px">
                <span class="time-range-side-label">结束</span>
                <el-date-picker v-model="form[fd.endDateKey]" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" style="width:160px"
                  :disabled-date="disabledBefore(form[fd.startDateKey])" />
                <el-select v-model="form[fd.endHalfKey]" style="width:90px">
                  <el-option label="上午" value="AM" /><el-option label="下午" value="PM" />
                </el-select>
              </div>
            </div>
          </el-form-item>
        </template>

        <!-- 质控指导：机构树形选择（弹窗中） -->
        <template v-if="moduleKey === 'guidance'">
          <el-form-item label="省→市质控中心">
            <div class="guidance-tree-wrap">
              <el-checkbox-group v-model="form.cityCenterIds" class="city-checkbox-group">
                <el-checkbox v-for="c in cityTree" :key="c.id" :label="c.id">{{ c.name }}</el-checkbox>
              </el-checkbox-group>
              <div class="tree-count">已选 <b>{{ form.cityCenterIds?.length || 0 }}</b> 家</div>
            </div>
          </el-form-item>
          <el-form-item label="省→市→县质控中心">
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
          </el-form-item>
        </template>

        <DwExtraFields
          v-if="moduleConfig.extraFields?.length"
          :fields="moduleConfig.extraFields"
          v-model="form.extraValues"
          :editable="true"
        />
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  saveMeeting, deleteMeeting,
  saveTraining, deleteTraining,
  saveGuidance, deleteGuidance,
  saveSurvey, deleteSurvey,
  saveDwFieldValues,
  uploadDwAttachment,
  getGuidanceRegions,
} from '@/api/dailywork'
import DwAttachSlot  from './DwAttachSlot.vue'
import DwExtraFields from './DwExtraFields.vue'
import PreviewDialog from '@/components/PreviewDialog.vue'
import { sortDwSubRecordsByStartDesc, dwQuarterRowStyle } from '@/utils/dwQuarter'

const props = defineProps({
  moduleKey:    { type: String, required: true },
  moduleConfig: { type: Object, required: true },
  items:        { type: Array,  default: () => [] },
  recordId:     { type: [String, Number], required: true },
  editable:     { type: Boolean, default: true },
})
const emit = defineEmits(['saved', 'deleted'])

/** 与后端返回顺序一致；若接口未排序则按开始时间倒序兜底 */
const displayItems = computed(() => sortDwSubRecordsByStartDesc(props.items, props.moduleKey))

const previewRef      = ref(null)
const dialogVisible   = ref(false)
const saving          = ref(false)
const deletingId      = ref(null)
const formRef         = ref(null)
const editingItem     = ref(null)
const openIds         = ref([])
const form            = ref({})
const pendingOpenId   = ref(null)
const pendingFiles    = ref({})
const uploadingInline = ref(false)

// 指导模块：地区树数据
const cityTree      = ref([])
const countyTree    = ref([])
const countyTreeRef = ref(null)

// ── 固定字段定义（guidance 不含树形选择字段）──────────────────
const FIXED_FIELDS = {
  meeting: [
    { key: 'meetingName',      label: '会议名称',  type: 'text',    placeholder: '请输入会议名称' },
    { key: 'meetingStartDate', label: '时间区间',  type: 'timeRange',
      startDateKey: 'meetingStartDate', startHalfKey: 'meetingStartHalf',
      endDateKey:   'meetingEndDate',   endHalfKey:   'meetingEndHalf' },
    { key: 'meetingForm',      label: '会议形式',  type: 'select',  options: [{ label: '线下', value: 'offline' }, { label: '线上', value: 'online' }, { label: '线上+线下', value: 'hybrid' }] },
    { key: 'attendeeCount',    label: '参会人数',  type: 'number',  placeholder: '人' },
    { key: 'attendanceRate',   label: '出勤率(%)', type: 'percent' },
    { key: 'meetingContent',   label: '会议内容',  type: 'text',    placeholder: '简要描述' },
  ],
  training: [
    { key: 'trainingName',      label: '培训名称',  type: 'text',    placeholder: '请输入培训名称' },
    { key: 'trainingStartDate', label: '时间区间',  type: 'timeRange',
      startDateKey: 'trainingStartDate', startHalfKey: 'trainingStartHalf',
      endDateKey:   'trainingEndDate',   endHalfKey:   'trainingEndHalf' },
    { key: 'trainingForm',      label: '培训形式',  type: 'select',  options: [{ label: '线下', value: 'offline' }, { label: '线上', value: 'online' }] },
    { key: 'trainingPeopleCount', label: '培训人数', type: 'number', placeholder: '人' },
    { key: 'trainingContent',   label: '培训内容',  type: 'text',    placeholder: '简要描述' },
  ],
  guidance: [
    { key: 'guidanceStartDate', label: '时间区间', type: 'timeRange',
      startDateKey: 'guidanceStartDate', startHalfKey: 'guidanceStartHalf',
      endDateKey:   'guidanceEndDate',   endHalfKey:   'guidanceEndHalf' },
    { key: 'guidanceForm',    label: '指导形式', type: 'select', options: [{ label: '现场', value: 'onsite' }, { label: '线上', value: 'online' }] },
    { key: 'guidanceContent', label: '指导内容', type: 'text',   placeholder: '简要描述' },
    // cityCenterIds / countyCenterIds 通过树形选择器处理，不在此列
    { key: 'hospitalCount',   label: '医院数',   type: 'number', placeholder: '家' },
  ],
  survey: [
    { key: 'surveyStartDate', label: '时间区间', type: 'timeRange',
      startDateKey: 'surveyStartDate', startHalfKey: 'surveyStartHalf',
      endDateKey:   'surveyEndDate',   endHalfKey:   'surveyEndHalf' },
    { key: 'surveyTarget',  label: '调研对象', type: 'text',   placeholder: '请输入' },
    { key: 'surveyType',    label: '调研类型', type: 'select', options: [{ label: '基线调研', value: 'baseline' }, { label: '专项调研', value: 'special' }] },
    { key: 'surveyForm',    label: '调研方式', type: 'select', options: [{ label: '现场', value: 'onsite' }, { label: '线上', value: 'online' }] },
    { key: 'surveyContent', label: '调研内容', type: 'text',   placeholder: '简要描述' },
  ],
}

// 只读展示字段（guidance 追加市级中心，县级单独分组渲染）
const DISPLAY_EXTRA = {
  guidance: [
    { key: 'cityCenterNames', label: '省→市质控中心', _isList: true, _countKey: 'cityCenterCount' },
    // countyCenterGroups 通过独立模板块渲染，不在此列
  ],
}

const FMT = {
  pdfDocx:        { accept: '.pdf,.docx,.doc',                            hint: '支持 PDF / DOCX' },
  imgPdf:         { accept: '.jpg,.jpeg,.png,.gif,.pdf',                  hint: '支持 JPG / PNG / GIF / PDF' },
  imgPdfDocxXlsx: { accept: '.jpg,.jpeg,.png,.gif,.pdf,.docx,.doc,.xlsx', hint: '支持 JPG / PNG / GIF / PDF / DOCX / XLSX' },
}

const SLOT_DEF = {
  meeting:  [
    { slot: 'minutes', field: 'minutes',   label: '会议纪要 / 通知文稿', ...FMT.pdfDocx },
    { slot: 'photo',   field: 'photos',    label: '现场照片',             ...FMT.imgPdf },
    { slot: 'signin',  field: 'signins',   label: '签到表',               ...FMT.imgPdfDocxXlsx },
  ],
  training: [
    { slot: 'material', field: 'materials', label: '培训材料', ...FMT.pdfDocx },
    { slot: 'photo',    field: 'photos',    label: '现场照片', ...FMT.imgPdf },
  ],
  guidance: [
    { slot: 'evidence', field: 'evidences', label: '佐证材料', ...FMT.pdfDocx },
  ],
  survey: [
    { slot: 'report', field: 'reports', label: '调研报告', ...FMT.pdfDocx },
    { slot: 'photo',  field: 'photos',  label: '现场照片', ...FMT.imgPdf },
  ],
}

const SAVE_FN   = { meeting: saveMeeting,   training: saveTraining,   guidance: saveGuidance,   survey: saveSurvey }
const DELETE_FN = { meeting: deleteMeeting, training: deleteTraining, guidance: deleteGuidance, survey: deleteSurvey }

const fixedFields   = computed(() => FIXED_FIELDS[props.moduleKey] || [])
const displayFields = computed(() => {
  const base  = fixedFields.value
  const extra = DISPLAY_EXTRA[props.moduleKey] || []
  return [...base, ...extra]
})
const slotDef = computed(() => SLOT_DEF[props.moduleKey] || [])

const FORM_LABEL = { meeting: 'meetingName', training: 'trainingName', guidance: 'guidanceContent', survey: 'surveyTarget' }

/** 折叠面板 name 必须用字符串，避免 Snowflake id 超过 Number 安全整数时与 v-model 对不上、无法展开 */
function collapseItemId(item) {
  return item?.id != null ? String(item.id) : ''
}

function itemTitle(item) {
  return item[FORM_LABEL[props.moduleKey]] || `记录 ${item.id}`
}

const LABEL_MAP = {
  offline: '线下', online: '线上', hybrid: '线上+线下',
  onsite: '现场', baseline: '基线调研', special: '专项调研',
}
const halfLabel = h => h === 'AM' ? '上午' : h === 'PM' ? '下午' : ''
// 将 picker 传入的 Date 对象格式化为 YYYY-MM-DD 字符串（避免 new Date(str) 时区偏差）
function pickerDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const disabledBefore = (limitDate) => (d) => limitDate ? pickerDateStr(d) < limitDate : false
const disabledAfter  = (limitDate) => (d) => limitDate ? pickerDateStr(d) > limitDate : false
function formatFixed(item, fd) {
  if (fd.type === 'timeRange') {
    const sD = item[fd.startDateKey], sH = item[fd.startHalfKey]
    const eD = item[fd.endDateKey],   eH = item[fd.endHalfKey]
    if (sD && eD) return `${sD} ${halfLabel(sH)} → ${eD} ${halfLabel(eH)}`
    return '—'
  }
  const v = item[fd.key]
  if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) return '—'
  if (fd._isList) return Array.isArray(v) ? v.join('、') : v
  if (fd.type === 'select') return LABEL_MAP[v] || v
  if (fd.type === 'percent') return `${v}%`
  if (fd.type === 'number' && fd.key === 'hospitalCount') return `${v} 家`
  return v
}

const rules = computed(() => {
  const r = {}
  fixedFields.value.forEach(fd => {
    if (fd.type !== 'number' && fd.type !== 'percent' && fd.type !== 'timeRange') {
      r[fd.key] = [{ required: true, message: `${fd.label}不能为空`, trigger: 'blur' }]
    }
  })
  return r
})

// ── 指导模块地区树 ──────────────────────────────────────────
function parseIds(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) } catch { return [] }
}

async function loadRegions() {
  if (cityTree.value.length) return
  try {
    const res = await getGuidanceRegions()
    cityTree.value   = res.data?.cityTree   || []
    countyTree.value = res.data?.countyTree || []
  } catch { /* ignore */ }
}

function onCountyCheck(_, state) {
  const leaves = state.checkedNodes.filter(n => !n.children?.length)
  form.value.countyCenterIds    = leaves.map(n => n.id)
  form.value.countyCenterCount  = leaves.length
}

// ── 表单初始化 ──────────────────────────────────────────────
function initBlankForm() {
  const blank = { recordId: props.recordId, extraValues: {}, cityCenterIds: [], countyCenterIds: [] }
  fixedFields.value.forEach(fd => {
    if (fd.type === 'timeRange') {
      blank[fd.startDateKey] = null
      blank[fd.startHalfKey] = 'AM'
      blank[fd.endDateKey]   = null
      blank[fd.endHalfKey]   = 'PM'
    } else {
      blank[fd.key] = null
    }
  })
  form.value     = blank
  editingItem.value = null
}

watch(() => props.items, (newItems) => {
  if (pendingOpenId.value) {
    const match = newItems.find(i => String(i.id) === String(pendingOpenId.value))
    if (match) {
      openIds.value = [String(match.id)]
      pendingOpenId.value = null
    }
  }
  const idSet = new Set(newItems.map(i => String(i.id)))
  openIds.value = openIds.value.filter(id => idSet.has(String(id)))
  if (newItems.length === 0) initBlankForm()
}, { deep: false })

onMounted(async () => {
  if (props.moduleKey === 'guidance') await loadRegions()
  if (!props.items.length) initBlankForm()
})

// ── 弹窗（编辑已有记录 / 有列表时新增）──────────────────────
function openDialog(item) {
  editingItem.value = item
  if (item) {
    const f = { ...item, extraValues: { ...(item.extraValues || {}) } }
    if (props.moduleKey === 'meeting') delete f.extraValues.budget_amount
    if (props.moduleKey === 'training') {
      f.trainingPeopleCount = item.trainingPeopleCount ?? item.attendeeCount ?? null
      delete f.attendeeCount
      delete f.coverageRate
    }
    if (props.moduleKey === 'guidance') {
      f.cityCenterIds   = parseIds(item.cityCenterIds)
      f.countyCenterIds = parseIds(item.countyCenterIds)
    }
    // ensure half defaults for existing records that pre-date new fields
    fixedFields.value.forEach(fd => {
      if (fd.type === 'timeRange') {
        if (!f[fd.startHalfKey]) f[fd.startHalfKey] = 'AM'
        if (!f[fd.endHalfKey])   f[fd.endHalfKey]   = 'PM'
      }
    })
    form.value = f
  } else {
    initBlankForm()
  }
  dialogVisible.value = true
}
function openEdit(item) { openDialog(item) }

// ── 保存 ────────────────────────────────────────────────────
async function handleSave() {
  await formRef.value?.validate()

  // validate timeRange pairs
  for (const fd of fixedFields.value) {
    if (fd.type === 'timeRange') {
      const s = form.value[fd.startDateKey], e = form.value[fd.endDateKey]
      if (!s || !e) { ElMessage.warning(`请填写「${fd.label}」的开始和结束日期`); return }
      if (s > e)    { ElMessage.warning('开始日期不能晚于结束日期'); return }
    }
  }

  const isInline = !dialogVisible.value
  if (isInline) uploadingInline.value = true
  else saving.value = true

  try {
    const payload = { ...form.value, recordId: props.recordId }
    delete payload.extraValues
    // 旧时间字段已下线，确保不传
    delete payload.meetingTime
    delete payload.trainingTime
    delete payload.guidanceTime
    delete payload.surveyTime
    if (props.moduleKey === 'training') {
      delete payload.coverageRate
      delete payload.attendeeCount
    }

    // guidance：序列化 IDs、计算数量
    if (props.moduleKey === 'guidance') {
      payload.cityCenterCount   = payload.cityCenterIds?.length   || 0
      payload.countyCenterCount = payload.countyCenterIds?.length || 0
      payload.cityCenterIds     = JSON.stringify(payload.cityCenterIds   || [])
      payload.countyCenterIds   = JSON.stringify(payload.countyCenterIds || [])
    }

    const res     = await SAVE_FN[props.moduleKey](payload)
    const savedId = res.data?.id

    // 扩展字段（会议模块已下线 budget_amount，不再提交）
    const extraVals = { ...(form.value.extraValues || {}) }
    if (props.moduleKey === 'meeting') delete extraVals.budget_amount
    if (savedId && Object.keys(extraVals).length) {
      await saveDwFieldValues({
        recordId: String(props.recordId),
        moduleKey: props.moduleKey,
        subRecordId: String(savedId),
        values: extraVals,
      })
    }

    // 内联模式：批量上传附件
    if (isInline && savedId) {
      const failedSlots = []
      for (const s of slotDef.value) {
        for (const file of (pendingFiles.value[s.slot] || [])) {
          try {
            await uploadDwAttachment(String(props.recordId), props.moduleKey, s.slot, file, savedId)
          } catch { failedSlots.push(s.label) }
        }
      }
      resetPending()
      if (failedSlots.length) {
        ElMessage.warning(`记录已保存，但以下附件上传失败，请展开记录后重试：${[...new Set(failedSlots)].join('、')}`)
      } else {
        ElMessage.success('保存成功')
      }
      pendingOpenId.value = savedId != null ? String(savedId) : null
    } else {
      ElMessage.success('保存成功')
    }

    if (dialogVisible.value) dialogVisible.value = false
    emit('saved')
  } finally {
    saving.value = false
    uploadingInline.value = false
  }
}

// ── 附件队列 ────────────────────────────────────────────────
function addPending(slot, uploadFile) {
  if (!pendingFiles.value[slot]) pendingFiles.value[slot] = []
  pendingFiles.value[slot].push(uploadFile.raw)
}
function removePending(slot, idx) { pendingFiles.value[slot].splice(idx, 1) }
function resetPending() { pendingFiles.value = {} }

// ── 删除记录 ────────────────────────────────────────────────
async function handleDelete(item) {
  await ElMessageBox.confirm('确认删除该条记录？', '提示', { type: 'warning' })
  deletingId.value = item.id
  try {
    await DELETE_FN[props.moduleKey](item.id)
    emit('deleted')
  } finally { deletingId.value = null }
}
</script>

<style scoped>
.collapse-title {
  display: flex; align-items: center;
  justify-content: space-between; width: 100%; padding-right: 12px;
  gap: 10px;
}
.title-left    { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; flex-wrap: wrap; }
.item-title    { font-weight: 500; color: #303133; }
.quarter-tag   { flex-shrink: 0; }

/* 按季度着色：标题栏 + 展开区淡底 */
.dw-sublist-quarter :deep(.el-collapse-item__header) {
  background-color: var(--quarter-bg, transparent) !important;
}
.dw-sublist-quarter :deep(.el-collapse-item__wrap) {
  background-color: rgba(255, 255, 255, 0.65);
}
.title-actions { display: flex; gap: 4px; }
.attach-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px; margin-top: 8px;
}

/* 内联表单 */
.inline-form-wrap {
  background: #f9fafb; border: 1px dashed #dcdfe6;
  border-radius: 6px; padding: 16px 16px 12px;
}
.inline-footer {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #ebeef5;
}

/* 指导模块树选择器 */
.guidance-tree-wrap { width: 100%; }
.city-checkbox-group { display: flex; flex-wrap: wrap; gap: 6px 0; }
.county-tree {
  max-height: 260px; overflow-y: auto;
  border: 1px solid #ebeef5; border-radius: 4px; padding: 4px 0;
}
.tree-count { font-size: 12px; color: #409eff; margin-top: 6px; }

/* 内联附件选择区 */
.attach-inline-tip  { font-size: 11px; color: #909399; font-weight: 400; }
.attach-inline-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;
}
.attach-inline-slot {
  background: #fff; border: 1px solid #ebeef5; border-radius: 4px; padding: 8px 10px;
}
.attach-slot-label { font-size: 13px; font-weight: 500; color: #303133; margin-bottom: 2px; }
.attach-slot-fmt   { font-size: 11px; color: #909399; margin-bottom: 6px; }
.pending-chips     { margin-bottom: 4px; }

/* 记录列表局部滚动容器 */
.collapse-scroll-wrap {
  max-height: 480px;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  /* 自定义滚动条（Webkit） */
  scrollbar-width: thin;
  scrollbar-color: #dcdfe6 transparent;
}
.collapse-scroll-wrap::-webkit-scrollbar { width: 6px; }
.collapse-scroll-wrap::-webkit-scrollbar-track { background: transparent; }
.collapse-scroll-wrap::-webkit-scrollbar-thumb { background: #dcdfe6; border-radius: 3px; }
.collapse-scroll-wrap::-webkit-scrollbar-thumb:hover { background: #c0c4cc; }

/* 时间区间控件 */
.time-range-group { display: flex; flex-direction: column; }
.time-range-row   { display: flex; align-items: center; gap: 8px; }
.time-range-side-label { width: 28px; font-size: 13px; color: #606266; flex-shrink: 0; }

/* guidance 县级分组只读 */
.county-groups-wrap {
  margin-top: 8px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 8px 12px;
  background: #fafafa;
  font-size: 13px;
}
.county-groups-title {
  font-weight: 600;
  color: #606266;
  font-size: 12px;
  margin-bottom: 6px;
}
.county-group-row { line-height: 1.9; }
.county-city-label { font-weight: 500; color: #409eff; }
.county-names { color: #606266; }
</style>

