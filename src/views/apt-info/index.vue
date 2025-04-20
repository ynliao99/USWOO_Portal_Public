<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  watch,
  nextTick,
  h,
  VNode,
  isVNode,
  reactive,
  toRaw
} from "vue";
import { ElForm, ElMessageBox, FormInstance } from "element-plus";
import { message } from "@/utils/message";
import { useGjgyRecords, AptRecord } from "./useGjgyRecords";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import EditIcon from "~icons/ri/edit-circle-line";
import ViewIcon from "~icons/ri/eye-line";
import AddIcon from "~icons/ri/add-circle-line";
import YesIcon from "~icons/mingcute/check-fill";
import NoIcon from "~icons/fa6-solid/xmark";
import UnknownIcon from "~icons/ic/baseline-question-mark";
import FullIcon from "~icons/gravity-ui/star-fill";
import HalfIcon from "~icons/fluent/star-half-12-regular";
import NoneIcon from "~icons/hugeicons/star";
import InfoIcon from "~icons/fa6-solid/info";
import CalendarIcon from "~icons/ph/calendar-fill";
import BuildingIcon from "~icons/carbon/floorplan";
import VideoIcon from "~icons/icon-park-solid/play";
import VideoList from "@/views/drive/video-list.vue";

import { aptFormRules } from "./utils/rule";

import IframeDialog, {
  IframeDialogProps
} from "@/components/IframeDialog/Iframe.vue";

const iframeDialog = ref();

const iframeDialogOptions = ref<Partial<IframeDialogProps> & { url: string }>({
  url: ""
});

function openDialogTWithOptions(
  options: Partial<IframeDialogProps> & { url: string }
) {
  iframeDialogOptions.value = { ...options };
  iframeDialog.value.open();
}

function handleTourClick(row: AptRecord) {
  const allowedTypes = [0, 2, 3];
  const type = Number(row.tour_url_type);
  if (allowedTypes.includes(type)) {
    openDialogTWithOptions({
      url: String(row.tour_url),
      title: "预约看房",
      message: "如无法加载，点此前往官网预约",
      message_url: row.website
    });
  } else {
    window.open(row.tour_url, "_blank");
  }
}

function isTourDialog(row: AptRecord): boolean {
  return [0, 2, 3].includes(Number(row.tour_url_type));
}
const tableRef = ref();
const formRef = ref<InstanceType<typeof ElForm>>();
defineOptions({
  name: "gjgy"
});

// 视频列表
const videoDialogVisible = ref(false);
const selectedBuildingName = ref<string>("");

function showVideoDialog(row: AptRecord) {
  selectedBuildingName.value = row.building_name ?? "";
  videoDialogVisible.value = true;
}

// 从 hook 中解构逻辑与数据
const {
  paginatedRecords,
  loading,
  pagination,
  searchTerm,
  columns,
  fetchRecords,
  currentUserAgentId, // 当前用户id
  hasAdminPermission, // 是否展示高级选项
  saveRecord,
  areas,
  setSearchTerm,
  setSort,
  setPage,
  setPageSize,
  setFilter
} = useGjgyRecords();

// 本地搜索输入
const searchTermLocal = ref(searchTerm.value);

// 对话框相关状态
const detailDialogVisible = ref(false);
const recordDetail = ref<Partial<AptRecord>>({});

// ----以下是公寓编辑框

// 公寓编辑框状态
const dialogVisible = ref(false);

const dialogTitle = ref("新增公寓");
let isAddMode = false;

// 从 HTML 原始选项中提取列表
const amenitiesOptions = [
  "健身房",
  "游泳池",
  "篮球场",
  "开放式天台",
  "烧烤架",
  "观影室",
  "游戏室",
  "儿童活动室",
  "花园",
  "公共洗衣房",
  "电梯",
  "包裹寄存",
  "生鲜寄存",
  "24小时门卫",
  "狗狗公园",
  "宠物美容",
  "宠物友好",
  "礼宾服务",
  "瑜伽室",
  "自行车库",
  "露天停车场",
  "室内车库",
  "储藏室",
  "门禁",
  "共享自习办公室",
  "共享会议室",
  "公共交通接驳车",
  "桑拿/温泉"
];
const roomAmenitiesOptions = [
  "室内洗烘",
  "真抽油烟机",
  "垃圾处理器",
  "电陶炉",
  "明火炉",
  "落地窗",
  "步入式衣柜",
  "智能家居",
  "中央空调",
  "独立空调",
  "洗碗机",
  "微波炉",
  "烤箱",
  "全屋木地板",
  "包家具"
];

const form = reactive<Partial<AptRecord>>({});
// 原始表单信息
const originalForm = ref<Partial<AptRecord>>({});

function openDialog(mode: "add" | "edit", record?: AptRecord) {
  if (mode === "add") {
    isAddMode = true;
    dialogTitle.value = "新增公寓";
    // reactive 的话，直接清空对象：
    Object.keys(form).forEach(key => delete form[key as keyof AptRecord]);
    form.id = null;
  } else if (mode === "edit" && record) {
    form.value = { ...record };
    originalForm.value = JSON.parse(JSON.stringify(record));
    isAddMode = false;
    dialogTitle.value = "编辑公寓信息";
    // 拷贝记录到 form
    Object.assign(form, record);
    // 解析 amenities 和 room_amenities
    if (typeof record.amenities === "string") {
      try {
        form.amenities = JSON.parse(record.amenities);
      } catch {}
    } else {
      form.amenities = record.amenities as any;
    }
    if (typeof record.room_amenities === "string") {
      try {
        form.room_amenities = JSON.parse(record.room_amenities);
      } catch {}
    } else {
      form.room_amenities = record.room_amenities as any;
    }
  }
  dialogVisible.value = true;
}
function closeDialog() {
  dialogVisible.value = false;
}

// --- 2. 相似度算法：简单用 Levenshtein 距离算（也可以换成 Jaro‑Winkler） ---
function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen > 0 ? (maxLen - dist) / maxLen : 1;
}

// 提交按钮逻辑：第一次校验 → 格式化 → 再校验 → 保存
async function onSubmit() {
  const f = formRef.value;
  if (!f) return;
  try {
    // 第一次校验
    await f.validate();

    // 拿到原始 & 当前快照
    const current = { ...form } as AptRecord;
    const original = originalForm.value as AptRecord;

    // 要比对的字段列表
    const fields: (keyof AptRecord)[] = [
      "broker_fee",
      "broker_fee_desc",
      "concessions",
      "contact",
      "intl_student",
      "intl_student_desc",
      "note",
      "pet",
      "pet_desc",
      "undergrad",
      "undergrad_desc",
      "ut"
    ];

    // 单字段相似度收集（完全一致也收集）
    const sims: number[] = [];
    for (const key of fields) {
      const origVal = original[key];
      const currVal = current[key];
      // 如果你想把“原来和现在都没填”也算作 1，可以改成：
      if (origVal == null && currVal == null) {
        sims.push(1);
        continue;
      }
      if (origVal == null || currVal == null) {
        // 值缺失就跳过
        continue;
      }
      const s = similarity(String(origVal), String(currVal));
      sims.push(s);
    }

    // 平均相似度
    const avgSim =
      sims.length > 0 ? sims.reduce((sum, v) => sum + v, 0) / sims.length : 1;
    console.log("新表单：", current);
    console.log("比对字段：", fields);
    console.log(
      "原始表单片段：",
      fields.map(k => original[k])
    );
    console.log(
      "当前表单片段：",
      fields.map(k => current[k])
    );
    console.log("平均相似度：", avgSim);
    // —— 新增这段：高相似度确认 ——
    if (avgSim > 0.95) {
      try {
        await ElMessageBox.confirm(
          `检测到您此次提交与原始数据总体相似度高达 ${(avgSim * 100).toFixed(2)}%。\n` +
            `恶意套刷更新次数将导致不良后果，是否确认继续提交？`,
          "高相似度提示",
          {
            confirmButtonText: "继续提交",
            cancelButtonText: "取消",
            type: "warning"
          }
        );
      } catch {
        // 用户取消，就不继续提交
        return;
      }
    }
    // —— 确认框结束 ——

    // 组装 payload
    const payload: any = { ...toRaw(form) };
    // 删字段
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.userAgentId;
    delete payload.userAgentName;
    // percent 字段
    payload.percent = (avgSim * 100).toFixed(2);
    // 处理数组字段为 JSON 字符串
    payload.amenities = JSON.stringify(payload.amenities || []);
    payload.room_amenities = JSON.stringify(payload.room_amenities || []);

    // 保存
    await saveRecord(payload);
    dialogVisible.value = false;

    // 保存
    await saveRecord(form.value as AptRecord);
    dialogVisible.value = false;
    console.log("提交成功");
    message("提交成功", { type: "success" });
  } catch (err) {
    message("请填写所有的必填项目。", { type: "warning" });
    console.warn("提交被拦截：", err);
  }
}

defineExpose({ openDialog });

// 统计有多少个字段正在被过滤（非空数组或 recent=true）
const filterCount = computed(() => {
  let cnt = 0;
  if (filterForm.area.length) cnt++;
  if (filterForm.broker_fee.length) cnt++;
  if (filterForm.undergrad.length) cnt++;
  if (filterForm.intl_student.length) cnt++;
  if (filterForm.pet.length) cnt++;
  if (filterForm.recent) cnt++;
  return cnt;
});

// 清空筛选
function clearFilters() {
  searchTermLocal.value = "";
  setSearchTerm("");
  setSort("", "");
  setPage(1);
  // 清空自定义筛选
  setFilter("area", []);
  setFilter("broker_fee", []);
  setFilter("undergrad", []);
  setFilter("intl_student", []);
  setFilter("pet", []);
  setFilter("last_edited", []);
}

// Filter dialog state
const filterDialogVisible = ref(false);
const filterForm = reactive({
  area: [] as string[],
  broker_fee: [] as string[],
  undergrad: [] as string[],
  intl_student: [] as string[],
  pet: [] as string[],
  recent: false
});

// 打开筛选对话框
function openFilterDialog() {
  // 初始化当前筛选值（如果需要可从后端或 hook 获取）
  filterDialogVisible.value = true;
}

// 确认筛选
function handleFilterConfirm() {
  setFilter("area", filterForm.area);
  setFilter("broker_fee", filterForm.broker_fee);
  setFilter("undergrad", filterForm.undergrad);
  setFilter("intl_student", filterForm.intl_student);
  setFilter("pet", filterForm.pet);
  // if (filterForm.recent) {
  //   // 自定义逻辑：last_edited 在两周以内
  //   setFilter('last_edited', ['recent']);
  // } else {
  //   setFilter('last_edited', []);
  // }
  filterDialogVisible.value = false;
  setPage(1);
  //fetchRecords();
}

// 重置筛选表单
function handleFilterReset() {
  filterForm.area = [];
  filterForm.broker_fee = [];
  filterForm.undergrad = [];
  filterForm.intl_student = [];
  filterForm.pet = [];
  filterForm.recent = false;
}
// 详情对话框
function showDetails(record: AptRecord) {
  recordDetail.value = { ...record };
  detailDialogVisible.value = true;
}

// 事件处理
function handleSearch(val: string) {
  setSearchTerm(val);
}
function handleSortChange({ prop, order }: { prop: string; order: string }) {
  setSort(
    prop,
    order === "ascending" ? "asc" : order === "descending" ? "desc" : ""
  );
}

function handlePageChange(page: number) {
  setPage(page);
}
function handlePageSizeChange(size: number) {
  setPageSize(size);
}

// 监听对话框显示变化，首次打开时加载地图自动补全脚本
// 定义一个状态标识，记录是否已初始化自动补全
const autoCompleteInitialized = ref(false);
// 声明外部全局函数
declare const initiateMapAutoComplete: (...args: any[]) => void;
// 地址补全主程序
watch(dialogVisible, newVal => {
  if (newVal && !autoCompleteInitialized.value) {
    nextTick(() => {
      const script = document.createElement("script");
      script.src =
        "https://api.uswoo.cn/map/place-req.js?location=42.3601,-71.0589&radius=241400&strictbounds&v=" +
        new Date().getTime();
      script.async = true;
      script.onload = () => {
        if (typeof initiateMapAutoComplete === "function") {
          initiateMapAutoComplete(
            "building_name,address",
            "building_name",
            "address",
            "none",
            "building_name"
          );
          autoCompleteInitialized.value = true;
        }
      };
      document.body.appendChild(script);
    });
  }
});

// ─────────────────────────────
// 工具函数
// ─────────────────────────────

const replaceYesNo = (text: string | null): VNode | string => {
  if (!text) return "";
  const lower = text.toLowerCase();
  if (lower === "yes") return h(YesIcon, { style: { color: "#008a17" } });
  if (lower === "no") return h(NoIcon, { style: { color: "#eb0000" } });
  if (lower === "dk") return h(UnknownIcon, { style: { color: "#feb02a" } });
  return text;
};

const replaceBrokerFee = (text: string | null): VNode | string => {
  if (!text) return "";
  const lower = text.toLowerCase();
  if (lower.includes("full"))
    return h(FullIcon, { style: { color: "#fc676e" } });
  if (lower.includes("half"))
    return h(HalfIcon, { style: { color: "#feb02a" } });
  if (lower.includes("none")) return h(NoneIcon, { style: { color: "#ccc" } });
  if (lower.includes("other") || lower.includes("unknown"))
    return h(InfoIcon, { style: { color: "#999" } });
  return text;
};

const formatDate = (input: string): string => {
  const date = new Date(input);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
};

const isRecent = (input: string): boolean => {
  const date = new Date(input);
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  return date >= twoWeeksAgo;
};

onMounted(() => {
  document.addEventListener("autocomplete-selected", (e: CustomEvent) => {
    const { marker, value } = e.detail as {
      marker: keyof AptRecord;
      value: any;
    };
    form[marker] = value; // 直接写就行了
  });
});
</script>

<template>
  <div>
    <el-input
      v-model="searchTermLocal"
      placeholder="全能搜索..."
      clearable
      style="margin: 0"
      @input="handleSearch"
    />

    <PureTableBar
      title="查实时房源、约看房"
      :columns="columns"
      @refresh="fetchRecords"
    >
      <template #buttons>
        <el-button
          type="primary"
          :icon="useRenderIcon(AddIcon)"
          @click="openDialog('add')"
        >
          新增房源
        </el-button>
      </template>

      <template #default="{ size }">
        <div style="margin: 0 16px">
          <el-button type="primary" @click="openFilterDialog"
            >筛选<span v-if="filterCount"
              >（{{ filterCount }}）</span
            ></el-button
          >
          <el-button @click="clearFilters">重置筛选</el-button>
        </div>

        <pure-table
          ref="tableRef"
          row-key="id"
          showOverflowTooltip
          :data="paginatedRecords"
          :columns="columns"
          :loading="loading"
          :pagination="pagination"
          table-layout="auto"
          stripe
          :size="size"
          @sort-change="handleSortChange"
          @page-size-change="handlePageSizeChange"
          @page-current-change="handlePageChange"
        >
          <template #operation="{ row }">
            <div style="white-space: nowrap" class="opt-buttons">
              <el-button
                class="icon-button"
                color="#557DED"
                :icon="useRenderIcon(EditIcon)"
                size="default"
                @click="openDialog('edit', row)"
              />
              <el-button
                class="icon-button"
                type="primary"
                :icon="useRenderIcon(ViewIcon)"
                size="default"
                @click="showDetails(row)"
              />

              <el-button
                v-if="row.sightmap_id"
                class="icon-button"
                color="#8f16f3"
                size="default"
                :icon="useRenderIcon(BuildingIcon)"
                @click="
                  openDialogTWithOptions({
                    url: `https://sightmap.com/embed/${row.sightmap_id}?enable_api=1`,
                    title: '实时房源预览'
                  })
                "
              />

              <el-button
                v-if="row.tour_url"
                class="icon-button"
                :icon="useRenderIcon(CalendarIcon)"
                :type="isTourDialog(row) ? 'success' : undefined"
                :color="!isTourDialog(row) ? '#0045f3' : undefined"
                @click="handleTourClick(row)"
              />

              <el-button
                class="icon-button"
                color="#557DED"
                :icon="useRenderIcon(VideoIcon)"
                size="default"
                @click="showVideoDialog(row)"
              />
            </div>
          </template>
          <template #building_name="{ row }">
            <a :href="`${row.website}`" target="_blank" style="color: #409eff">
              {{ row.building_name }}
            </a>
          </template>
          <template #last_edited="{ row }">
            <span
              :style="{
                color: isRecent(row.last_edited) ? '#008a17' : '#ca0000'
              }"
            >
              {{ formatDate(row.last_edited) }}
            </span>
          </template>

          <template #broker_fee="{ row }">
            <span class="table-icon">
              <template v-if="isVNode(replaceBrokerFee(row.broker_fee))">
                <component :is="replaceBrokerFee(row.broker_fee)" />
              </template>
              <template v-else>
                {{ row.broker_fee }}
              </template>

              <span v-if="row.broker_fee_desc">
                | {{ row.broker_fee_desc }}</span
              >
            </span>
          </template>

          <template #undergrad="{ row }">
            <span class="table-icon">
              <template v-if="isVNode(replaceYesNo(row.undergrad))">
                <component :is="replaceYesNo(row.undergrad)" />
              </template>
              <template v-else>
                {{ row.undergrad }}
              </template>

              <span v-if="row.undergrad_desc"> | {{ row.undergrad_desc }}</span>
            </span>
          </template>

          <template #intl_student="{ row }">
            <span class="table-icon">
              <template v-if="isVNode(replaceYesNo(row.intl_student))">
                <component :is="replaceYesNo(row.intl_student)" />
              </template>
              <template v-else>
                {{ row.intl_student }}
              </template>

              <span v-if="row.intl_student_desc">
                | {{ row.intl_student_desc }}</span
              >
            </span>
          </template>

          <template #pet="{ row }">
            <span class="table-icon">
              <template v-if="isVNode(replaceYesNo(row.pet))">
                <component :is="replaceYesNo(row.pet)" />
              </template>
              <template v-else>
                {{ row.pet }}
              </template>

              <span v-if="row.pet_desc"> | {{ row.pet_desc }}</span>
            </span>
          </template>

          <template #address="{ row }">
            <a
              :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.address)}`"
              target="_blank"
              style="color: #409eff"
            >
              {{ row.address }}
            </a>
          </template>
          <template #cell="{ row, column }">
            <el-tooltip
              effect="dark"
              :content="row[column.prop]"
              class="limit-tooltip"
              placement="top"
            >
              <div class="multiline-ellipsis">{{ row[column.prop] }}</div>
            </el-tooltip>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
    <!-- iFrame对话框 -->
    <IframeDialog ref="iframeDialog" v-bind="iframeDialogOptions" />
    <!-- 视频列表 -->
    <el-dialog
      v-model="videoDialogVisible"
      title="查看视频"
      width="80vw"
      top="5vh"
      destroy-on-close
    >
      <div style="padding: 10px">
        <VideoList :building-name="selectedBuildingName" />
      </div>
    </el-dialog>
    <!-- 编辑公寓 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="60vw">
      <el-form
        ref="formRef"
        :model="form"
        :rules="aptFormRules"
        label-width="120px"
        label-position="left"
      >
        <!-- 区域 -->
        <el-form-item label="区域" prop="area">
          <el-select
            v-model="form.area"
            placeholder="请选择区域"
            data-marker="area"
          >
            <el-option
              v-for="area in areas"
              :key="area"
              :label="area"
              :value="area"
            />
          </el-select>
        </el-form-item>

        <!-- 公寓名称 -->
        <el-form-item label="公寓名称" prop="building_name">
          <el-input v-model="form.building_name" data-marker="building_name" />
        </el-form-item>
        <!-- 地址 -->
        <el-form-item label="地址" prop="address">
          <el-input v-model="form.address" data-marker="address" />
        </el-form-item>

        <!-- 官网 -->
        <el-form-item label="公寓官网" prop="website">
          <el-input v-model="form.website" data-marker="website" />
        </el-form-item>

        <!-- 预约看房链接 -->
        <el-form-item label="预约看房链接" prop="tour_url">
          <el-input v-model="form.tour_url" data-marker="tour_url" />
        </el-form-item>
        <!-- 看房链接类型 -->
        <el-form-item
          v-if="hasAdminPermission"
          label="看房链接类型"
          prop="tour_url_type"
        >
          <el-input v-model="form.tour_url_type" data-marker="tour_url_type" />
        </el-form-item>

        <!-- Sightmap ID -->
        <el-form-item label="Sightmap ID" prop="sightmap_id">
          <el-input v-model="form.sightmap_id" data-marker="sightmap_id" />
        </el-form-item>

        <!-- 优惠 -->
        <el-form-item label="优惠" prop="concessions">
          <el-input
            v-model="form.concessions"
            type="textarea"
            placeholder="请输入优惠信息"
            data-marker="concessions"
          />
        </el-form-item>

        <!-- 中介费 -->
        <el-form-item label="中介费" prop="broker_fee">
          <el-select
            v-model="form.broker_fee"
            placeholder="请选择"
            data-marker="broker_fee"
          >
            <el-option label="Full" value="Full" />
            <el-option label="Half" value="Half" />
            <el-option label="None" value="None" />
            <el-option label="Other" value="Other" />
            <el-option label="Unknown" value="Unknown" />
          </el-select>
          <el-input
            v-model="form.broker_fee_desc"
            placeholder="说明"
            style="margin-top: 8px"
            data-marker="broker_fee_desc"
          />
        </el-form-item>

        <!-- 杂费 -->
        <el-form-item label="杂费" prop="ut">
          <el-input v-model="form.ut" placeholder="杂费金额" data-marker="ut" />
        </el-form-item>

        <!-- 本科生 -->
        <el-form-item label="本科生" prop="undergrad">
          <el-radio-group v-model="form.undergrad" data-marker="undergrad">
            <el-radio value="YES">是</el-radio>
            <el-radio value="NO">否</el-radio>
            <el-radio value="DK">未知</el-radio>
          </el-radio-group>
          <el-input
            v-model="form.undergrad_desc"
            placeholder="说明"
            style="margin-top: 8px"
            data-marker="undergrad_desc"
          />
        </el-form-item>

        <!-- 国际学生 -->
        <el-form-item label="国际学生" prop="intl_student">
          <el-radio-group
            v-model="form.intl_student"
            data-marker="intl_student"
          >
            <el-radio value="YES">是</el-radio>
            <el-radio value="NO">否</el-radio>
            <el-radio value="DK">未知</el-radio>
          </el-radio-group>
          <el-input
            v-model="form.intl_student_desc"
            placeholder="说明"
            style="margin-top: 8px"
            data-marker="intl_student_desc"
          />
        </el-form-item>

        <!-- 宠物 -->
        <el-form-item label="宠物" prop="pet">
          <el-radio-group v-model="form.pet" data-marker="pet">
            <el-radio value="YES">允许</el-radio>
            <el-radio value="NO">不允许</el-radio>
            <el-radio value="DK">未知</el-radio>
          </el-radio-group>
          <el-input
            v-model="form.pet_desc"
            placeholder="说明"
            style="margin-top: 8px"
            data-marker="pet_desc"
          />
        </el-form-item>

        <!-- 停车费/车库 -->
        <el-form-item label="停车费/车库" prop="parking">
          <el-input
            v-model="form.parking"
            placeholder="停车信息"
            data-marker="parking"
          />
        </el-form-item>

        <!-- 公共设施 -->
        <el-form-item label="公共设施" prop="amenities">
          <el-select
            v-model="form.amenities"
            multiple
            placeholder="请选择公共设施"
            data-marker="amenities"
          >
            <el-option
              v-for="item in amenitiesOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>

        <!-- 套内设施 -->
        <el-form-item label="套内设施" prop="room_amenities">
          <el-select
            v-model="form.room_amenities"
            multiple
            placeholder="请选择套内设施"
            data-marker="room_amenities"
          >
            <el-option
              v-for="item in roomAmenitiesOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>

        <!-- 联系方式 -->
        <el-form-item label="联系方式" prop="contact">
          <el-input
            v-model="form.contact"
            placeholder="联系方式"
            data-marker="contact"
          />
        </el-form-item>

        <!-- 备注 -->
        <el-form-item label="备注" prop="note">
          <el-input
            v-model="form.note"
            type="textarea"
            placeholder="备注信息"
            data-marker="note"
          />
        </el-form-item>
      </el-form>

      <!-- 提交按钮 -->
      <template #footer>
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" @click="onSubmit()"> 提交 </el-button>
      </template>
    </el-dialog>

    <!-- 筛选对话框 -->
    <el-dialog
      v-model="filterDialogVisible"
      title="筛选条件"
      style="margin-top: 15vh"
      destroy-on-close
    >
      <el-form :model="filterForm" label-width="100px">
        <el-form-item label="区域">
          <el-select
            v-model="filterForm.area"
            multiple
            placeholder="请选择区域"
            style="width: 100%"
            popper-class="filter-dropdown"
            popper-append-to-body="false"
          >
            <el-option v-for="a in areas" :key="a" :label="a" :value="a" />
          </el-select>
        </el-form-item>
        <el-form-item label="中介费">
          <el-checkbox-group v-model="filterForm.broker_fee">
            <el-checkbox label="Full">Full</el-checkbox>
            <el-checkbox label="Half">Half</el-checkbox>
            <el-checkbox label="None">None</el-checkbox>
            <el-checkbox label="Other">Other</el-checkbox>
            <el-checkbox label="Unknown">Unknown</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="本科生">
          <el-checkbox-group v-model="filterForm.undergrad">
            <el-checkbox label="YES">是</el-checkbox>
            <el-checkbox label="NO">否</el-checkbox>
            <el-checkbox label="DK">未知</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="国际学生">
          <el-checkbox-group v-model="filterForm.intl_student">
            <el-checkbox label="YES">是</el-checkbox>
            <el-checkbox label="NO">否</el-checkbox>
            <el-checkbox label="DK">未知</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="宠物">
          <el-checkbox-group v-model="filterForm.pet">
            <el-checkbox label="YES">允许</el-checkbox>
            <el-checkbox label="NO">不允许</el-checkbox>
            <el-checkbox label="DK">未知</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleFilterReset">重置</el-button>
        <el-button type="primary" @click="handleFilterConfirm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style>
/* 表格标题行的每个标题不换行 */
.pure-table .el-table__header-wrapper th {
  white-space: nowrap;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 20px 0;
}

.detail-item {
  font-size: 16px;
  line-height: 1.6;
}

.detail-label {
  margin-right: 8px;
  font-weight: bold;
  color: #606266;
}

.detail-value {
  color: #303133;
}

.el-dialog {
  max-height: 90vh;
  padding-right: 12px;
  margin-top: 5vh;
  overflow-y: auto;
}

::v-deep(.limit-tooltip) .el-tooltip__popper {
  max-width: 300px;
  word-break: break-word;
  white-space: normal;
}

.cell {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  word-break: break-word;
  -webkit-box-orient: vertical;
}

.el-table .cell.el-tooltip {
  white-space: normal;
}

.filter-dropdown,
.filter-dropdown .el-scrollbar,
.filter-dropdown .el-select-dropdown {
  width: 100% !important;
  min-width: unset !important;
  max-width: none !important;
}

/* 让滚动区域也撑满 */
.filter-dropdown .el-scrollbar__wrap {
  width: 100% !important;
  max-height: 200px;
  overflow-y: auto;
}

.opt-buttons .el-button,
.el-button.is-round {
  padding: 8px;
  margin-left: 6px;
}

.filter-dropdown {
  width: 400px !important;
}
</style>
