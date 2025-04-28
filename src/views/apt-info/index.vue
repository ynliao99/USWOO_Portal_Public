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
import ExternalLinkIcon from "~icons/ri/external-link-line";
import { aptFormRules } from "./utils/rule";

import IframeDialog, {
  IframeDialogProps
} from "@/components/IframeDialog/Iframe.vue";
import { useNav } from "@/layout/hooks/useNav";
const { device } = useNav();

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

// 以下 查询确认是最新的政策的字段
// 字段分组："broker_fee" 等具有两子字段的，视作单一组
const fieldGroups = [
  ["concessions"],
  ["broker_fee", "broker_fee_desc"],
  ["ut"],
  ["undergrad", "undergrad_desc"],
  ["intl_student", "intl_student_desc"],
  ["pet", "pet_desc"],
  ["parking"],
  ["amenities"],
  ["room_amenities"],
  ["contact"],
  ["note"]
] as const;

type GroupKey = (typeof fieldGroups)[number][number];

// 初始化每组的确认状态：使用主字段名作为 key
const confirmNoChange = reactive<Record<string, boolean>>(
  Object.fromEntries(fieldGroups.map(group => [group[0], false])) as Record<
    string,
    boolean
  >
);

// Watch：一旦确认未变，则立即恢复该组所有字段的原始值
watch(
  () => ({ ...confirmNoChange }),
  newFlags => {
    fieldGroups.forEach(group => {
      const key = group[0];
      if (newFlags[key]) {
        group.forEach(f => {
          form[f] = originalForm.value[f];
        });
      }
    });
  },
  { deep: true }
);

// computeCurrent：收集所有被锁定或实际改动的字段名
function computeCurrent(): string {
  const changed: string[] = [];
  fieldGroups.forEach(group => {
    const key = group[0];
    if (confirmNoChange[key]) {
      // 锁定：两个字段都算
      changed.push(...group);
    } else {
      // 未锁定：如果任一子字段改动，两个字段都算
      const diff = group.some(
        f => String(form[f] ?? "") !== String(originalForm.value[f] ?? "")
      );
      if (diff) {
        changed.push(...group);
      }
    }
  });
  return changed.join(",");
}

// 提交按钮逻辑：第一次校验 → 格式化 → 再校验 → 保存
async function onSubmit() {
  const f = formRef.value;
  if (!f) return;
  try {
    // 第一次校验
    await f.validate();
  } catch (err) {
    message("请填写所有的必填项目", { type: "warning" });
    return;
    console.warn("提交被拦截：", err);
  }
  // 拿到原始 & 当前快照
  const current = { ...form } as AptRecord;
  const original = originalForm.value as AptRecord;

  // 组装 payload
  const payload: any = { ...toRaw(form) };

  // 单字段相似度收集（完全一致也收集）
  if (!isAddMode) {
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
    const sims: number[] = [];
    for (const key of fields) {
      const a = original[key],
        b = current[key];
      if (a == null && b == null) {
        sims.push(1);
        continue;
      }
      if (typeof a === "string" && typeof b === "string")
        sims.push(similarity(a, b));
    }
    const avgSim = sims.length
      ? sims.reduce((s, v) => s + v, 0) / sims.length
      : 1;
    if (avgSim > 0.95) {
      try {
        await ElMessageBox.confirm(
          `检测到你此次提交与原始数据总体相似度高达 ${(avgSim * 100).toFixed(2)}%。\n 恶意套刷更新次数将导致不良后果，是否继续提交？`,
          "高相似度提示",
          {
            confirmButtonText: "继续提交",
            cancelButtonText: "取消",
            type: "warning"
          }
        );
      } catch {
        message("已取消，请更新政策后再试", { type: "warning" });
        return;
      }
    }
    // percent 字段
    payload.percent = (avgSim * 100).toFixed(2);
  }

  // 删字段
  delete payload.created_at;
  delete payload.value;
  delete payload.updated_at;
  delete payload.userAgentId;
  delete payload.userAgentName;

  // 处理数组字段为 JSON 字符串
  payload.amenities = JSON.stringify(payload.amenities || []);
  payload.room_amenities = JSON.stringify(payload.room_amenities || []);
  // current 字段
  payload.current = computeCurrent();

  payload.pid = form.pid ?? null;

  // 保存
  try {
    // 调用修改后的 saveRecord 并获取结果
    const success = await saveRecord(payload); // <--- success 是 true 或 false

    // 根据保存结果执行操作
    if (success) {
      // 保存成功
      dialogVisible.value = false; // <--- 关闭对话框
      fetchRecords(); // <--- 刷新列表
      console.log("记录已成功保存。");
    } else {
      console.log("记录保存失败，对话框保持打开。");
    }
  } catch (saveErr) {
    console.error("保存记录失败：", saveErr);
    message("保存失败：网络错误，请稍后重试", { type: "error" });
    return; // 保存失败就不往下执行
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

// 解析 current 字段
const currentFields = computed<string[]>(() => {
  if (!recordDetail.value.current) return [];
  return String(recordDetail.value.current)
    .split(",")
    .map(s => s.trim());
});

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
            "website",
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
  // 自动补全同步信息
  document.addEventListener("autocomplete-selected", (e: CustomEvent) => {
    const { marker, value, pid } = e.detail as {
      marker: keyof AptRecord;
      value: any;
      pid?: string;
    };
    console.log("autocomplete-selected", marker, value, pid);
    form[marker] = value; // 直接写就行了
    if (marker === "building_name") {
      form.pid = pid; // <— 这里就拿到了 place_id
    }
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

      <template #default="{ size, dynamicColumns }">
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
          :columns="dynamicColumns"
          :loading="loading"
          :pagination="pagination"
          table-layout="auto"
          :adaptive="device != 'mobile'"
          stripe
          :size="size"
          @sort-change="handleSortChange"
          @page-size-change="handlePageSizeChange"
          @page-current-change="handlePageChange"
        >
          <template #operation="{ row }">
            <div style="white-space: nowrap" class="opt-buttons">
              <el-tooltip content="编辑公寓信息" placement="top">
                <el-button
                  class="icon-button"
                  color="#557DED"
                  :icon="useRenderIcon(EditIcon)"
                  size="default"
                  @click="openDialog('edit', row)"
                />
              </el-tooltip>

              <el-tooltip content="查看详情" placement="top">
                <el-button
                  class="icon-button"
                  type="primary"
                  :icon="useRenderIcon(ViewIcon)"
                  size="default"
                  @click="showDetails(row)"
                />
              </el-tooltip>

              <el-tooltip
                v-if="row.sightmap_id"
                content="查看实时房源"
                placement="top"
              >
                <el-button
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
              </el-tooltip>

              <el-tooltip
                v-if="row.tour_url"
                content="预约看房"
                placement="top"
              >
                <el-button
                  class="icon-button"
                  :icon="useRenderIcon(CalendarIcon)"
                  :type="isTourDialog(row) ? 'success' : undefined"
                  :color="!isTourDialog(row) ? '#0045f3' : undefined"
                  @click="handleTourClick(row)"
                />
              </el-tooltip>

              <el-tooltip content="实拍视频" placement="top">
                <el-button
                  class="icon-button"
                  color="#557DED"
                  :icon="useRenderIcon(VideoIcon)"
                  size="default"
                  @click="showVideoDialog(row)"
                />
              </el-tooltip>
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

              <span v-if="row.broker_fee_desc"> {{ row.broker_fee_desc }}</span>
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

              <span v-if="row.undergrad_desc">{{ row.undergrad_desc }}</span>
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
                {{ row.intl_student_desc }}</span
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

              <span v-if="row.pet_desc">{{ row.pet_desc }}</span>
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
      top="5vh"
      destroy-on-close
    >
      <div style="padding: 10px">
        <VideoList :building-name="selectedBuildingName" />
      </div>
    </el-dialog>
    <!-- 编辑公寓 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle">
      <el-form
        ref="formRef"
        :model="form"
        :rules="aptFormRules"
        label-width="120px"
        label-position="left"
        class="detail-content"
      >
        <!-- 区域 -->
        <el-form-item label="区域" prop="area" required>
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
        <el-form-item label="公寓名称" prop="building_name" required>
          <el-input v-model="form.building_name" data-marker="building_name" />
        </el-form-item>
        <!-- 地址 -->
        <el-form-item label="地址" prop="address" required>
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
          <el-input
            v-model="form.tour_url_type"
            data-marker="tour_url_type"
            placeholder="1=跨域限制，直接跳转；2=需要加padding；3=doorway组件；4=悬浮日历，通常底部有按钮；5=udr；6=equity；7=tour24（含bldg89等不提供自助的）；8=类indie，日历形式拒绝跨域；"
          />
        </el-form-item>

        <!-- Sightmap ID -->
        <el-form-item label="Sightmap ID" prop="sightmap_id">
          <el-input
            v-model="form.sightmap_id"
            data-marker="sightmap_id"
            placeholder="不知道请留空"
          />
        </el-form-item>

        <hr />
        <!-- 优惠 -->
        <el-form-item label="优惠" prop="concessions" required>
          <el-input
            v-model="form.concessions"
            type="textarea"
            placeholder="请输入优惠信息"
            data-marker="concessions"
            :disabled="confirmNoChange.concessions"
            style="flex: 1"
          />
          <el-switch
            v-if="!isAddMode"
            v-model="confirmNoChange.concessions"
            active-text="优惠未变"
            inactive-text=""
            style="margin: 0 8px"
          />
        </el-form-item>

        <!-- 杂费 -->
        <el-form-item label="杂费" prop="ut">
          <el-input
            v-model="form.ut"
            placeholder="水、电、网、暖、垃圾费"
            data-marker="ut"
            :disabled="confirmNoChange.ut"
            style="flex: 1"
          />
          <el-switch
            v-if="!isAddMode"
            v-model="confirmNoChange.ut"
            active-text="杂费未变"
            inactive-text=""
            style="margin: 0 8px"
          />
        </el-form-item>

        <!-- 中介费 -->
        <el-form-item label="中介费" prop="broker_fee" required>
          <!-- 先放 select -->
          <el-select
            v-model="form.broker_fee"
            placeholder="请选择"
            :disabled="confirmNoChange.broker_fee"
            data-marker="broker_fee"
            style="flex-shrink: 0; width: 100px"
          >
            <el-option label="Full" value="Full" />
            <el-option label="Half" value="Half" />
            <el-option label="None" value="None" />
            <el-option label="Other" value="Other" />
            <el-option label="Unknown" value="Unknown" />
          </el-select>
          <!-- 再放说明 input -->
          <el-input
            v-model="form.broker_fee_desc"
            :disabled="confirmNoChange.broker_fee"
            placeholder="说明"
            data-marker="broker_fee_desc"
            style="flex: 1; min-width: 0; margin: 0 12px"
          />
          <!-- 最后放开关 -->
          <el-switch
            v-if="!isAddMode"
            v-model="confirmNoChange.broker_fee"
            active-text="中介费未变"
            inactive-text=""
            style="white-space: nowrap"
          />
        </el-form-item>

        <hr />
        <!-- 本科生 -->
        <el-form-item label="本科生" prop="undergrad" required>
          <el-radio-group
            v-model="form.undergrad"
            data-marker="undergrad"
            :disabled="confirmNoChange.undergrad"
          >
            <el-radio value="YES">是</el-radio>
            <el-radio value="NO">否</el-radio>
            <el-radio value="DK">未知</el-radio>
          </el-radio-group>
          <el-input
            v-model="form.undergrad_desc"
            placeholder="说明"
            style="flex: 1; margin: 0 8px"
            data-marker="undergrad_desc"
            :disabled="confirmNoChange.undergrad"
          />
          <el-switch
            v-if="!isAddMode"
            v-model="confirmNoChange.undergrad"
            active-text="本科生政策未变"
            inactive-text=""
            style="margin: 0 8px"
          />
        </el-form-item>

        <!-- 国际学生 -->
        <el-form-item label="国际学生" prop="intl_student" required>
          <el-radio-group
            v-model="form.intl_student"
            data-marker="intl_student"
            :disabled="confirmNoChange.intl_student"
          >
            <el-radio value="YES">是</el-radio>
            <el-radio value="NO">否</el-radio>
            <el-radio value="DK">未知</el-radio>
          </el-radio-group>
          <el-input
            v-model="form.intl_student_desc"
            placeholder="说明"
            style="flex: 1; margin: 0 8px"
            :disabled="confirmNoChange.intl_student"
            data-marker="intl_student_desc"
          />
          <el-switch
            v-if="!isAddMode"
            v-model="confirmNoChange.intl_student"
            active-text="国际生政策未变"
            inactive-text=""
            style="margin: 0 8px"
          />
        </el-form-item>

        <!-- 宠物 -->
        <el-form-item label="宠物" prop="pet" required>
          <el-radio-group
            v-model="form.pet"
            data-marker="pet"
            :disabled="confirmNoChange.pet"
          >
            <el-radio value="YES">允许</el-radio>
            <el-radio value="NO">不允许</el-radio>
            <el-radio value="DK">未知</el-radio>
          </el-radio-group>
          <el-input
            v-model="form.pet_desc"
            placeholder="说明"
            style="flex: 1; margin: 0 8px"
            :disabled="confirmNoChange.pet"
            data-marker="pet_desc"
          />
          <el-switch
            v-if="!isAddMode"
            v-model="confirmNoChange.pet"
            active-text="　宠物政策未变"
            inactive-text=""
            style="margin: 0 8px"
          />
        </el-form-item>

        <!-- 停车费/车库 -->
        <el-form-item label="停车费/车库" prop="parking">
          <el-input
            v-model="form.parking"
            placeholder="停车信息"
            data-marker="parking"
            style="flex: 1"
            :disabled="confirmNoChange.parking"
          />
          <el-switch
            v-if="!isAddMode"
            v-model="confirmNoChange.parking"
            active-text="停车费未变"
            inactive-text=""
            style="margin: 0 8px"
          />
        </el-form-item>

        <!-- 公共设施 -->
        <el-form-item label="公共设施" prop="amenities" required>
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
        <el-form-item label="套内设施" prop="room_amenities" required>
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

    <el-dialog
      v-model="detailDialogVisible"
      title="公寓详情"
      destroy-on-close
      :before-close="() => (detailDialogVisible = false)"
    >
      <div class="detail-content">
        <!-- 基本信息 -->
        <div
          class="detail-item"
          :class="{ highlight: currentFields.includes('last_edited') }"
        >
          <span class="detail-label">更新时间：</span>
          <span class="detail-value">{{ recordDetail.last_edited }}</span>
        </div>
        <div
          class="detail-item"
          :class="{ highlight: currentFields.includes('userAgentName') }"
        >
          <span class="detail-label">更新人：</span>
          <span class="detail-value">{{ recordDetail.userAgentName }}</span>
        </div>
        <div
          class="detail-item"
          :class="{ highlight: currentFields.includes('id') }"
        >
          <span class="detail-label">数据 ID：</span>
          <span class="detail-value">{{ recordDetail.id }}</span>
        </div>
        <div
          v-if="recordDetail.website"
          class="detail-item"
          :class="{ highlight: currentFields.includes('website') }"
        >
          <span class="detail-label">网站：</span>
          <span class="detail-value">
            <a :href="recordDetail.website" target="_blank" class="detail-link">
              <el-button
                type="primary"
                link
                :icon="useRenderIcon(ExternalLinkIcon)"
              >
                查看官网
              </el-button>
            </a>
          </span>
        </div>
        <div
          v-if="recordDetail.tour_url"
          class="detail-item"
          :class="{ highlight: currentFields.includes('tour_url') }"
        >
          <span class="detail-label">Tour：</span>
          <span class="detail-value">
            <a
              :href="recordDetail.tour_url"
              target="_blank"
              class="detail-link"
            >
              <el-button
                type="primary"
                link
                :icon="useRenderIcon(ExternalLinkIcon)"
              >
                点击前往预约
              </el-button>
            </a>
          </span>
        </div>

        <hr />

        <!-- 核心字段 -->
        <div
          class="detail-item"
          :class="{ highlight: currentFields.includes('area') }"
        >
          <span class="detail-label">区域：</span>
          <span class="detail-value">{{ recordDetail.area }}</span>
        </div>
        <div
          class="detail-item"
          :class="{ highlight: currentFields.includes('building_name') }"
        >
          <span class="detail-label">公寓名称：</span>
          <span class="detail-value">
            <a
              v-if="recordDetail.website"
              :href="recordDetail.website"
              target="_blank"
              class="detail-link"
              >{{ recordDetail.building_name }}</a
            >
            <span v-else>{{ recordDetail.building_name }}</span>
          </span>
        </div>
        <div
          class="detail-item"
          :class="{ highlight: currentFields.includes('address') }"
        >
          <span class="detail-label">地址：</span>
          <span class="detail-value">
            <a
              :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(recordDetail.address)}`"
              target="_blank"
              class="detail-link"
              >{{ recordDetail.address }}</a
            >
          </span>
        </div>

        <hr />

        <!-- 其它信息 -->
        <div
          v-if="recordDetail.concessions"
          class="detail-item"
          :class="{ highlight: currentFields.includes('concessions') }"
        >
          <span class="detail-label">优惠：</span>
          <span class="detail-value">{{ recordDetail.concessions }}</span>
        </div>
        <div
          v-if="recordDetail.broker_fee || recordDetail.broker_fee_desc"
          class="detail-item"
          :class="{ highlight: currentFields.includes('broker_fee') }"
        >
          <span class="detail-label">中介费：</span>
          <span class="detail-value">
            <component :is="replaceBrokerFee(recordDetail.broker_fee)" />
            <span v-if="recordDetail.broker_fee_desc"
              >｜{{ recordDetail.broker_fee_desc }}</span
            >
          </span>
        </div>
        <div
          v-if="recordDetail.ut"
          class="detail-item"
          :class="{ highlight: currentFields.includes('ut') }"
        >
          <span class="detail-label">杂费：</span>
          <span class="detail-value">{{ recordDetail.ut }}</span>
        </div>
        <div
          v-if="recordDetail.note"
          class="detail-item"
          :class="{ highlight: currentFields.includes('note') }"
        >
          <span class="detail-label">备注：</span>
          <span class="detail-value">{{ recordDetail.note }}</span>
        </div>

        <hr />

        <!-- 字段图标展示 -->
        <div
          class="detail-item"
          :class="{ highlight: currentFields.includes('undergrad') }"
        >
          <span class="detail-label">本科生：</span>
          <span class="detail-value">
            <component :is="replaceYesNo(recordDetail.undergrad)" />
            <span v-if="recordDetail.undergrad_desc"
              >｜{{ recordDetail.undergrad_desc }}</span
            >
          </span>
        </div>
        <div
          class="detail-item"
          :class="{ highlight: currentFields.includes('intl_student') }"
        >
          <span class="detail-label">国际学生：</span>
          <span class="detail-value">
            <component :is="replaceYesNo(recordDetail.intl_student)" />
            <span v-if="recordDetail.intl_student_desc"
              >｜{{ recordDetail.intl_student_desc }}</span
            >
          </span>
        </div>
        <div
          class="detail-item"
          :class="{ highlight: currentFields.includes('pet') }"
        >
          <span class="detail-label">宠物：</span>
          <span class="detail-value">
            <component :is="replaceYesNo(recordDetail.pet)" />
            <span v-if="recordDetail.pet_desc"
              >｜{{ recordDetail.pet_desc }}</span
            >
          </span>
        </div>
        <div
          v-if="recordDetail.parking"
          class="detail-item"
          :class="{ highlight: currentFields.includes('parking') }"
        >
          <span class="detail-label">停车：</span>
          <span class="detail-value">{{ recordDetail.parking }}</span>
        </div>
        <div
          v-if="recordDetail.contact"
          class="detail-item"
          :class="{ highlight: currentFields.includes('contact') }"
        >
          <span class="detail-label">联系方式：</span>
          <span class="detail-value">{{ recordDetail.contact }}</span>
        </div>
        <hr />

        <!-- 设施展示 -->
        <div class="facilities-container">
          <div class="facility-category">
            <h4>公共设施</h4>
            <div class="facility-list">
              <span v-if="!recordDetail.amenities" class="facility-item"
                >无</span
              >
              <span
                v-for="item in recordDetail.amenities
                  ? JSON.parse(recordDetail.amenities)
                  : []"
                :key="item"
                class="facility-item"
                >{{ item }}</span
              >
            </div>
          </div>
          <div class="facility-category">
            <h4>套内设施</h4>
            <div class="facility-list">
              <span v-if="!recordDetail.room_amenities" class="facility-item"
                >无</span
              >
              <span
                v-for="item in recordDetail.room_amenities
                  ? JSON.parse(recordDetail.room_amenities)
                  : []"
                :key="item"
                class="facility-item"
                >{{ item }}</span
              >
            </div>
          </div>
        </div>
        <!-- 免责声明 -->
        <div class="disclaimer">
          政策随时调整，仅供参考！即使显示为近期更新，仍有可能随时过期。<br />
          申请前务必再次与公寓确认。
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style>
@media (width <=768px) {
  .el-dialog {
    width: 90% !important;
  }
}

@media (width <=768px) {
  .dialog-form .el-form-item__label {
    /* 移除固定宽度 */
    width: auto !important;
    text-align: left !important;
  }
}

.pure-table .el-table__header-wrapper th {
  white-space: nowrap;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 10px;
  margin: 20px 0;
}

.detail-item {
  font-size: 16px;
  line-height: 1.6;
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

.el-table--fit .el-popper {
  max-width: 400px;
  word-break: break-word;
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

.detail-label {
  display: inline-block;
  width: 100px;
  margin-right: 8px;
  font-weight: 600;
  font-weight: bold;
  color: #606266;
}

.detail-value {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  color: #303133;

  /* 图标和文字之间留一点空隙 */
}

.detail-value svg {
  display: inline-block !important;
  vertical-align: middle;
}

.detail-link {
  color: #409eff;
  text-decoration: underline;
  transition: color 0.3s ease;
}

.detail-link:hover {
  color: #66b1ff;
}

.detail-link:active {
  color: #337ecc;
}

.disclaimer {
  padding-top: 12px;
  margin-top: 16px;
  font-size: 12px;
  color: #909399;
  border-top: 1px solid #ebeef5;
}

.highlight .detail-value {
  color: #008a17 !important;
}

hr {
  margin: 8px 0;
  border: none;
  border-top: 1px solid #ebeef5;
}

.facilities-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin: 20px 0;
}

.facility-category {
  flex: 1;
  min-width: 200px;
}

.facility-category h4 {
  margin-bottom: 10px;
  font-size: 1.1em;
  color: #333;
}

.facility-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.facility-item {
  padding: 5px 8px;
  font-size: 0.9em;
  background-color: #f9f9f9;
  border: 1px solid #ccc;
  border-radius: 3px;
}
</style>
