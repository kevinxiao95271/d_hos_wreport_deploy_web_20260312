<template>
  <div class="score414-page">
    <div class="page-header">
      <h2>2025年质控中心 / 技术指导中心得分</h2>
    </div>

    <el-tabs v-model="activeTab" class="score-tabs">
      <!-- Tab 1: 质控中心得分 -->
      <el-tab-pane label="质控中心得分" name="qk">
        <div class="table-wrap">
          <table class="score-table">
            <thead>
              <tr class="header-row-1">
                <th rowspan="2" class="col-fixed col-seq">序号</th>
                <th rowspan="2" class="col-fixed col-name">质控中心</th>
                <th colspan="4" class="group-header">
                  1. 制定本专业质量管理体系
                  <span class="max-score">（30分）</span>
                </th>
                <th colspan="2" class="group-header">
                  2. 健全质控网络
                  <span class="max-score">（10分）</span>
                </th>
                <th colspan="5" class="group-header">
                  3. 组织开展培训/检查/考核
                  <span class="max-score">（20分）</span>
                </th>
                <th colspan="3" class="group-header">
                  4. 质量安全信息收集与报送
                  <span class="max-score">（30分）</span>
                </th>
                <th colspan="3" class="group-header">
                  5. 质控管理规范性
                  <span class="max-score">（10分）</span>
                </th>
                <th colspan="3" class="group-header group-bonus">
                  附加分
                  <span class="max-score">（10分）</span>
                </th>
                <th rowspan="2" class="col-total">总分</th>
                <th rowspan="2" class="col-total col-total-bonus">总分<br/>（含附加）</th>
              </tr>
              <tr class="header-row-2">
                <th class="sub-header">年度计划<br/>总结<br/><span class="max">10</span></th>
                <th class="sub-header">工作指引<br/><span class="max">10</span></th>
                <th class="sub-header">监测指标<br/><span class="max">6</span></th>
                <th class="sub-header">数据库<br/><span class="max">4</span></th>
                <th class="sub-header">三级质控<br/>网络<br/><span class="max">4</span></th>
                <th class="sub-header">布置工作<br/>任务<br/><span class="max">6</span></th>
                <th class="sub-header">培训<br/><span class="max">6</span></th>
                <th class="sub-header">调研<br/><span class="max">4</span></th>
                <th class="sub-header">调研报告<br/><span class="max">4</span></th>
                <th class="sub-header">市/县中心<br/>指导<br/><span class="max">3</span></th>
                <th class="sub-header">医疗机构<br/>指导<br/><span class="max">3</span></th>
                <th class="sub-header">指标监测<br/>情况<br/><span class="max">10</span></th>
                <th class="sub-header">近3年撰写<br/>分析报告<br/><span class="max">10</span></th>
                <th class="sub-header">近3年参与<br/>撰写省报<br/><span class="max">10</span></th>
                <th class="sub-header">事前事后<br/>报备<br/><span class="max">4</span></th>
                <th class="sub-header">挂靠医院<br/>经费<br/><span class="max">3</span></th>
                <th class="sub-header">经费管理<br/>制度<br/><span class="max">3</span></th>
                <th class="sub-header bonus-sub">丛书/指南<br/>共识/规范<br/><span class="max">3</span></th>
                <th class="sub-header bonus-sub">技能竞赛<br/><span class="max">3</span></th>
                <th class="sub-header bonus-sub">行政任务<br/><span class="max">4</span></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in qkData"
                :key="idx"
                :class="{ 'row-odd': idx % 2 === 0 }"
              >
                <td class="col-seq">{{ row[0] }}</td>
                <td class="col-name">{{ row[1] }}</td>
                <td v-for="ci in scoreColIndices" :key="ci" :class="scoreClass(row[ci], maxScores[ci])">
                  {{ row[ci] }}
                </td>
                <td class="col-total">{{ row[22] }}</td>
                <td class="col-total col-total-bonus">
                  <strong>{{ row[23] }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </el-tab-pane>

      <!-- Tab 2: 技术指导中心得分 -->
      <el-tab-pane label="技术指导中心得分" name="js">
        <div class="table-wrap">
          <table class="score-table">
            <thead>
              <tr class="header-row-1">
                <th rowspan="2" class="col-fixed col-seq">序号</th>
                <th rowspan="2" class="col-fixed col-name">技术指导中心</th>
                <th colspan="4" class="group-header">
                  1. 制定本专业质量管理体系
                  <span class="max-score">（30分）</span>
                </th>
                <th colspan="2" class="group-header">
                  2. 健全质控网络
                  <span class="max-score">（10分）</span>
                </th>
                <th colspan="5" class="group-header">
                  3. 组织开展培训/检查/考核
                  <span class="max-score">（20分）</span>
                </th>
                <th colspan="3" class="group-header">
                  4. 质量安全信息收集与报送
                  <span class="max-score">（30分）</span>
                </th>
                <th colspan="3" class="group-header">
                  5. 质控管理规范性
                  <span class="max-score">（10分）</span>
                </th>
                <th colspan="3" class="group-header group-bonus">
                  附加分
                  <span class="max-score">（10分）</span>
                </th>
                <th rowspan="2" class="col-total">总分</th>
                <th rowspan="2" class="col-total col-total-bonus">总分<br/>（含附加）</th>
              </tr>
              <tr class="header-row-2">
                <th class="sub-header">年度计划<br/>总结<br/><span class="max">10</span></th>
                <th class="sub-header">工作指引<br/><span class="max">10</span></th>
                <th class="sub-header">监测指标<br/><span class="max">6</span></th>
                <th class="sub-header">数据库<br/><span class="max">4</span></th>
                <th class="sub-header">三级质控<br/>网络<br/><span class="max">4</span></th>
                <th class="sub-header">布置工作<br/>任务<br/><span class="max">6</span></th>
                <th class="sub-header">培训<br/><span class="max">6</span></th>
                <th class="sub-header">调研<br/><span class="max">4</span></th>
                <th class="sub-header">调研报告<br/><span class="max">4</span></th>
                <th class="sub-header">市/县中心<br/>指导<br/><span class="max">3</span></th>
                <th class="sub-header">医疗机构<br/>指导<br/><span class="max">3</span></th>
                <th class="sub-header">指标监测<br/>情况<br/><span class="max">10</span></th>
                <th class="sub-header">近3年撰写<br/>分析报告<br/><span class="max">10</span></th>
                <th class="sub-header">近3年参与<br/>撰写省报<br/><span class="max">10</span></th>
                <th class="sub-header">事前事后<br/>报备<br/><span class="max">4</span></th>
                <th class="sub-header">挂靠医院<br/>经费<br/><span class="max">3</span></th>
                <th class="sub-header">经费管理<br/>制度<br/><span class="max">3</span></th>
                <th class="sub-header bonus-sub">丛书/指南<br/>共识/规范<br/><span class="max">3</span></th>
                <th class="sub-header bonus-sub">技能竞赛<br/><span class="max">3</span></th>
                <th class="sub-header bonus-sub">行政任务<br/><span class="max">4</span></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in jsData"
                :key="idx"
                :class="{ 'row-odd': idx % 2 === 0 }"
              >
                <td class="col-seq">{{ row[0] }}</td>
                <td class="col-name">{{ row[1] }}</td>
                <td v-for="ci in scoreColIndices" :key="ci" :class="scoreClass(row[ci], maxScores[ci])">
                  {{ row[ci] }}
                </td>
                <td class="col-total">{{ row[22] }}</td>
                <td class="col-total col-total-bonus">
                  <strong>{{ row[23] }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const activeTab = ref('qk')

// 各子项列索引（cols 2-21）和对应满分
const scoreColIndices = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
const maxScores = {
  2: 10, 3: 10, 4: 6, 5: 4,
  6: 4, 7: 6,
  8: 6, 9: 4, 10: 4, 11: 3, 12: 3,
  13: 10, 14: 10, 15: 10,
  16: 4, 17: 3, 18: 3,
  19: 3, 20: 3, 21: 4
}

function scoreClass(val, max) {
  if (val === null || val === undefined || val === '/') return 'score-cell score-na'
  const n = Number(val)
  if (isNaN(n)) return 'score-cell score-na'
  if (n === 0) return 'score-cell score-zero'
  if (n >= max) return 'score-cell score-full'
  if (n >= max * 0.6) return 'score-cell score-mid'
  return 'score-cell score-low'
}

// 质控中心得分数据（按序号升序）
const qkData = [
  [1,  '浙江省临床检验质量控制中心',   10, 10, 6, 4, 4, 6, 6, 4, 4, 3, 3, 10, 10, 10, 2, 0, 3, 3, 2, 4,  95, 104],
  [2,  '浙江省医疗设备管理控制中心',   8,  10, 6, 4, 4, 6, 6, 4, 0, 3, 3, 10, 10, 10, 4, 0, 3, 3, 3, 0,  91,  97],
  [3,  '临床麻醉质控中心',             10, 10, 6, 4, 4, 6, 6, 4, 4, 3, 3, 10, 10, 10, 4, 3, 3, 1, 3, 0, 100, 104],
  [4,  '临床放射质控中心',             10, 10, 6, 4, 4, 6, 6, 4, 4, 3, 0, 10, 10, 10, 4, 0, 3, 1, 2, 2,  94,  99],
  [5,  '临床病理质控中心',             10, 10, 6, 4, 3, 6, 6, 0, 0, 3, 3, 10, 10, 10, 4, 0, 3, 0, 3, 2,  88,  93],
  [6,  '护理质控中心',                 8,  10, 6, 4, 4, 6, 3, 4, 4, 1, 3, 10, 10, 10, 4, 3, 3, 3, 3, 4,  93, 103],
  [7,  '肿瘤诊治质控中心',             10, 10, 6, 4, 3, 6, 6, 4, 4, 3, 3, 10, 10, 10, 4, 3, 3, 1, 2, 0,  99, 102],
  [8,  '医院感染管理质控中心',         10, 10, 6, 4, 4, 6, 6, 4, 4, 3, 3, 10, 10, 10, 2, 3, 3, 0, 2, 4,  98, 104],
  [9,  '血液质量管理委员会',           10, 10, 6, 4, 4, 6, 3, 0, 0, 1, 3, 10, 10, 10, 0, 3, 3, 0, 3, 2,  83,  88],
  [10, '医院药事管理质控中心',         8,  10, 6, 4, 4, 6, 6, 4, 4, 3, 3, 10, 10, 10, 0, 3, 3, 3, 3, 4,  94, 104],
  [11, '病历管理质控中心',             8,  10, 6, 0, 4, 6, 6, 4, 4, 3, 3, 10, 10, 10, 0, 3, 3, 1, 2, 2,  90,  95],
  [12, '口腔质控中心',                 10, 10, 6, 4, 4, 3, 6, 4, 4, 3, 3,  8, 10, 10, 4, 3, 0, 1, 0, 2,  92,  95],
  [13, '高压氧医疗质控中心',           10, 10, 6, 0, 2, 6, 3, 4, 4, 3, 3,  5,  0,  0, 0, 0, 0, 0, 0, 0,  56,  56],
  [14, '急诊质控中心',                 8,  10, 6, 4, 4, 6, 6, 4, 4, 3, 3, 10, 10, 10, 2, 3, 0, 2, 0, 0,  93,  95],
  [15, '肾病学质控中心',               10, 10, 6, 4, 4, 3, 6, 4, 4, 3, 0, 10, 10, 10, 0, 3, 3, 0, 0, 0,  90,  90],
  [16, '内镜（腔镜）质控中心',         8,   0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  0,  0,  0, 0, 0, 0, 0, 0, 0,   8,   8],
  [17, 'ICU质控中心',                  8,  10, 6, 4, 3, 6, 6, 4, 4, 3, 3,  8, 10, 10, 0, 0, 3, 1, 3, 0,  88,  92],
  [18, '心血管疾病介入诊疗质控中心',   8,   0, 0, 0, 3, 6, 6, 4, 0, 3, 3,  0, 10, 10, 0, 3, 3, 0, 2, 0,  59,  61],
  [19, '康复医学质控中心',             10, 10, 6, 0, 3, 3, 6, 0, 0, 1, 3,  5, 10, 10, 0, 0, 0, 0, 3, 2,  67,  72],
  [20, '脑卒中医疗质控中心',           8,  10, 6, 4, 3, 6, 6, 4, 0, 3, 3,  8, 10, 10, 0, 0, 0, 0, 3, 0,  81,  84],
  [21, '传染病诊治质控中心',           0,   0, 0, 0, 3, 0, 0, 0, 0, 0, 0,  0,  0,  0, 0, 0, 0, 0, 0, 0,   3,   3],
  [22, '医院门诊管理质控中心',         10, 10, 6, 4, 4, 6, 6, 4, 4, 3, 3, 10, 10, 10, 4, 0, 3, 3, 2, 2,  97, 104],
  [23, '产科医疗质控中心',             10, 10, 6, 4, 4, 0, 6, 4, 0, 0, 0, 10, 10, 10, 0, 3, 0, 0, 2, 0,  77,  79],
  [24, '人类辅助生殖技术质控中心',     10, 10, 0, 0, 0, 6, 6, 4, 4, 0, 3, 10,  0,  0, 4, 3, 3, 0, 0, 0,  63,  63],
  [25, '产前诊断（筛查）',             8,  10, 6, 4, 4, 3, 6, 4, 0, 3, 3,  5,  0,  0, 2, 3, 0, 1, 2, 2,  61,  66],
  [26, '新生儿疾病筛查质控中心',       10, 10, 6, 4, 4, 6, 3, 4, 4, 3, 3, 10, 10, 10, 0, 0, 0, 0, 0, 2,  87,  89],
  [27, '省超声质控中心',               10, 10, 6, 4, 4, 6, 3, 4, 4, 0, 0, 10, 10, 10, 4, 0, 3, 1, 3, 0,  88,  92],
  [28, '新生儿窒息复苏和管理质控中心', 10, 10, 6, 0, 2, 3, 6, 0, 0, 3, 3, 10,  0,  0, 2, 0, 0, 0, 0, 0,  55,  55],
  [29, '院前医疗急救质控中心',         10, 10, 6, 4, 4, 6, 6, 4, 4, 0, 3, 10,  0,  0, 4, 3, 0, 0, 3, 2,  74,  79],
  [30, '微创技术质控中心',             10, 10, 6, 4, 2, 0, 3, 0, 0, 0, 0,  0, 10, 10, 2, 3, 3, 0, 2, 0,  63,  65],
  [31, '性病诊治质控中心',             8,  10, 6, 0, 2, 6, 6, 0, 0, 3, 3, 10,  0,  0, 0, 3, 0, 1, 3, 0,  57,  61],
  [32, '结核病诊治质控中心',           10, 10, 6, 4, 2, 3, 3, 0, 0, 0, 3, 10,  0,  0, 0, 3, 3, 0, 2, 2,  57,  61],
  [33, '消化内镜质控中心',             10, 10, 6, 0, 3, 6, 6, 4, 0, 3, 3,  5, 10, 10, 2, 3, 0, 0, 2, 0,  81,  83],
  [34, '整形美容质控中心',             10, 10, 6, 4, 2, 6, 6, 4, 0, 1, 3,  5, 10, 10, 0, 0, 3, 0, 0, 0,  80,  80],
  [35, '健康体检质控中心',             10, 10, 6, 4, 3, 6, 6, 0, 0, 3, 3,  8, 10, 10, 0, 3, 0, 0, 0, 2,  82,  84],
  [36, '儿科及小儿外科专业质控中心',   10, 10, 6, 0, 2, 6, 6, 4, 4, 0, 0,  5,  0,  0, 2, 0, 0, 0, 0, 2,  55,  57],
  [37, '精神医学专业医疗质量控制中心', 10, 10, 6, 0, 2, 6, 6, 4, 4, 3, 1, 10,  0,  0, 4, 3, 3, 0, 0, 0,  72,  72],
  [38, '眼科专业医疗质控中心',         10, 10, 0, 0, 2, 6, 3, 0, 0, 0, 0,  0,  0,  0, 4, 3, 3, 0, 0, 0,  41,  41],
  [39, '罕见病专业质控中心',           10, 10, 0, 0, 0, 3, 0, 0, 0, 0, 0,  5,  0,  0, 4, 0, 0, 0, 0, 0,  32,  32],
  [40, '器官移植专业医疗质控中心',     8,  10, 0, 0, 0, 6, 6, 4, 0, 1, 1,  0,  0,  0, 0, 0, 0, 0, 0, 0,  36,  36],
]

// 技术指导中心得分数据（按序号升序）
const jsData = [
  [1,  '省防盲指导中心',             10,  0, 0, 0, 0, 3, 6, 0, 0, 0, 1,  0, 10, 10, 0, 0, 0, 0, 0, 4,  40,  44],
  [2,  '省医院管理研究中心',         10,  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  0,  0,  0, 0, 0, 0, 0, 0, 0,  10,  10],
  [3,  '省核医学技术指导中心',       10, 10, 6, 4, 2, 6, 6, 4, 4, 3, 3,  8, 10, 10, 4, 3, 3, 0, 0, 2,  96,  98],
  [4,  '省烧伤救治技术指导中心',     8,  10, 6, 0, 0, 6, 6, 0, 0, 0, 1,  0,  0,  0, 0, 0, 0, 1, 0, 0,  37,  38],
  [5,  '省中毒急救防治中心',         10,  0, 0, 0, 0, 0, 6, 0, 0, 0, 0,  0,  0,  0, 4, 3, 3, 0, 0, 2,  26,  28],
  [6,  '省临床营养中心',             10, 10, 6, 0, 3, 6, 6, 4, 4, 3, 1, 10, 10, 10, 2, 3, 3, 0, 2, 0,  91,  93],
  [7,  '省人工肝技术指导中心',       10,  0, 0, 0, 0, 3, 0, 4, 0, 0, 0,  0,  0,  0, 0, 0, 0, 0, 0, 0,  17,  17],
  [8,  '省病理、尸体解剖中心',       10,  0, 0, 0, 0, 0, 3, 0, 0, 0, 3,  0,  0,  0, 0, 0, 0, 0, 0, 0,  16,  16],
  [9,  '省皮肤病临床诊治技术指导中心', 10, 10, 6, 0, 2, 3, 6, 0, 0, 3, 3, 5,  0,  0, 2, 0, 0, 0, 2, 0,  50,  52],
  [10, '省医院图书管理指导中心',     10, 10, 0, 0, 0, 3, 3, 0, 0, 0, 0,  0,  0,  0, 2, 0, 3, 0, 0, 0,  31,  31],
  [11, '省细菌耐药监测中心',         10, 10, 6, 0, 3, 3, 6, 0, 0, 3, 0, 10, 10, 10, 2, 3, 3, 0, 0, 2,  79,  81],
  [12, '省结直肠疾病诊疗中心',       8,   0, 6, 0, 0, 3, 0, 0, 0, 0, 3,  8,  0,  0, 0, 0, 0, 0, 2, 0,  28,  30],
  [13, '省神经外科技术指导中心',     10, 10, 6, 0, 2, 3, 6, 0, 0, 3, 0,  5, 10, 10, 2, 0, 0, 0, 0, 2,  67,  69],
  [14, '省骨科技术指导中心',         8,  10, 6, 0, 3, 3, 6, 0, 0, 1, 0,  0,  0,  0, 0, 0, 0, 0, 2, 0,  37,  39],
  [15, '省口腔正畸中心',             10, 10, 0, 0, 0, 0, 3, 0, 0, 0, 0,  0,  0,  0, 0, 0, 0, 0, 0, 0,  23,  23],
  [16, '分娩镇痛技术指导中心',       10, 10, 6, 0, 2, 0, 6, 4, 4, 1, 1,  8,  0,  0, 4, 3, 0, 0, 0, 0,  59,  59],
  [17, '全科医学技术指导中心',       10, 10, 6, 0, 2, 6, 6, 4, 0, 1, 3, 10,  0,  0, 0, 3, 3, 0, 2, 0,  64,  66],
  [18, '甲状腺病诊治技术指导中心',   10, 10, 6, 0, 0, 0, 3, 0, 0, 1, 1,  8,  0,  0, 0, 3, 0, 0, 0, 0,  42,  42],
  [19, '老年病诊治指导中心',         10, 10, 6, 0, 2, 3, 3, 0, 0, 3, 3, 10,  0,  0, 0, 0, 0, 0, 2, 2,  50,  54],
  [20, '日间手术技术指导中心',       8,  10, 6, 0, 2, 6, 6, 0, 0, 0, 3, 10, 10, 10, 2, 3, 3, 0, 0, 0,  79,  79],
  [21, '口腔种植技术指导中心',       8,  10, 6, 0, 0, 6, 0, 4, 0, 0, 0, 10,  0,  0, 0, 0, 0, 0, 2, 0,  44,  46],
  [22, '生殖微创技术指导中心',       10, 10, 6, 0, 0, 0, 3, 0, 0, 0, 0,  5,  0,  0, 0, 3, 0, 0, 0, 0,  37,  37],
  [23, '角膜病诊治技术指导中心',     10, 10, 0, 0, 0, 3, 3, 0, 0, 0, 3,  0,  0,  0, 0, 3, 3, 0, 0, 0,  35,  35],
  [24, '肿瘤靶向治疗技术指导中心',   10, 10, 0, 0, 0, 3, 6, 0, 0, 0, 3,  0,  0,  0, 0, 3, 0, 1, 0, 0,  35,  36],
  [25, '胎儿心脏超声诊断技术指导中心', 10, 10, 6, 0, 2, 3, 6, 0, 0, 0, 3, 0,  0,  0, 0, 3, 0, 0, 0, 0,  43,  43],
  [26, '呼吸疾病诊疗技术指导中心',   10, 10, 6, 0, 2, 6, 6, 4, 4, 3, 3,  5, 10, 10, 2, 3, 3, 0, 0, 4,  87,  91],
]
</script>

<style scoped>
.score414-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100%;
}

.page-header {
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.score-tabs {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
}

.table-wrap {
  overflow-x: auto;
  margin-top: 8px;
}

.score-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
  min-width: 1800px;
}

.score-table th,
.score-table td {
  border: 1px solid #dcdfe6;
  padding: 5px 6px;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
}

/* 表头第1行 */
.header-row-1 th {
  background: #ecf5ff;
  color: #303133;
  font-weight: 600;
  font-size: 11px;
  line-height: 1.4;
}

/* 分组表头 */
.group-header {
  background: #ecf5ff !important;
  border-bottom: 2px solid #409eff !important;
}

.group-header .max-score {
  color: #606266;
  font-weight: 400;
  font-size: 10px;
}

.group-bonus {
  background: #fdf6ec !important;
  border-bottom: 2px solid #e6a23c !important;
}

/* 表头第2行 */
.header-row-2 th {
  background: #f0f4ff;
  font-size: 10px;
  color: #606266;
  line-height: 1.3;
}

.sub-header .max {
  display: inline-block;
  background: #409eff;
  color: #fff;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 10px;
  line-height: 1.4;
  margin-top: 2px;
}

.bonus-sub .max {
  background: #e6a23c;
}

/* 固定列 */
.col-fixed {
  position: sticky;
  background: #fafafa;
  z-index: 1;
}

.col-seq {
  width: 40px;
  min-width: 40px;
  left: 0;
  font-weight: 600;
}

.col-name {
  width: 160px;
  min-width: 140px;
  max-width: 180px;
  left: 40px;
  text-align: left;
  white-space: normal;
  word-break: break-all;
  font-weight: 500;
}

/* 总分列 */
.col-total {
  background: #f0f9eb;
  font-weight: 600;
  color: #67c23a;
  width: 48px;
  min-width: 48px;
}

.col-total-bonus {
  background: #fdf6ec;
  color: #e6a23c;
}

/* 数据行斑马纹 */
.row-odd td {
  background-color: #fafafa;
}

.row-odd .col-total {
  background: #e8f5e1;
}

.row-odd .col-total-bonus {
  background: #fdf3e3;
}

/* 得分格 */
.score-cell {
  width: 36px;
  min-width: 32px;
  font-size: 12px;
  font-weight: 500;
}

.score-full {
  background: #f0f9eb;
  color: #67c23a;
}

.score-mid {
  background: #fdf6ec;
  color: #e6a23c;
}

.score-low {
  background: #fef0f0;
  color: #f56c6c;
}

.score-zero {
  background: #fef0f0;
  color: #f56c6c;
  font-weight: 700;
}

.score-na {
  color: #c0c4cc;
}
</style>
