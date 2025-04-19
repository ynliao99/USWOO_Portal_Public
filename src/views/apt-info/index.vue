<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  watch,
  nextTick,
  h,
  VNode,
  isVNode
} from "vue";
import { ElForm, FormInstance } from "element-plus";
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

import { coFormRules } from "./utils/rule";

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

// 从 hook 中解构逻辑与数据
const {
  paginatedRecords,
  loading,
  pagination,
  searchTerm,
  columns,
  fetchRecords,
  currentUserAgentId, //当前用户id
  saveRecord,
  areas,
  setSearchTerm,
  setSort,
  toggleOnlyMine,
  setPage,
  setPageSize,
  setFilter
} = useGjgyRecords();

// 本地搜索输入
const searchTermLocal = ref(searchTerm.value);

// 对话框相关状态
const dialogVisible = ref(false);
const detailDialogVisible = ref(false);
const dialogTitle = ref("");
const form = ref<Partial<AptRecord>>({});
const recordDetail = ref<Partial<AptRecord>>({});

// 表单校验
// 表单 ref，用于校验
const ruleFormRef = ref<FormInstance>();

// 提交前先触发表单验证
const onSubmit = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  message("请填写所有的必填项目。", { type: "warning" });
  await formEl.validate(valid => {
    if (valid) {
      handleSave();
    }
  });
};

// 新增/编辑对话框 模式
let isAddMode = false;

// 新增/编辑对话框打开
function openDialog(mode: "add" | "edit", record?: AptRecord) {
  if (mode === "add") {
    isAddMode = true;
    dialogTitle.value = "新增需求";
    form.value = {
      id: null
    };
  } else if (mode === "edit" && record) {
    isAddMode = false;
    dialogTitle.value = "编辑需求";
  }
  dialogVisible.value = true;
}

async function handleSave() {
  formRef.value?.validate(async valid => {
    if (!valid) return;
    const payload = {
      ...form.value
    };
    try {
      await saveRecord(payload);
      dialogVisible.value = false;
    } catch {
      // handled
    }
  });
}

function clearFilters() {
  const { clearFilter } = tableRef.value.getTableRef();
  clearFilter();
  columns.forEach(col => {
    if (col.filters && typeof col.prop === "string") {
      setFilter(col.prop, []);
    }
  });
  searchTermLocal.value = "";
  setSearchTerm("");
  setSort("", "");
  toggleOnlyMine(false);
  setPage(1);
  fetchRecords();
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
function handleOnlyMineChange(val: boolean) {
  toggleOnlyMine(val);
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
            "placeName,location",
            "placeName",
            "location",
            "none",
            "placeName"
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
  fetchRecords();
  document.addEventListener("autocomplete-selected", (e: CustomEvent) => {
    const { marker, value } = e.detail as {
      marker: keyof AptRecord;
      value: any;
    };
    // 简单断言
    form.value[marker] = value;
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
        <IframeDialog ref="iframeDialog" v-bind="iframeDialogOptions" />
        <div style="margin: 0 16px">
          <el-button type="primary" @click="clearFilters">筛选</el-button>
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
                @click="showDetails(row)"
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
  max-height: 80vh;
  padding-right: 12px;
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

.el-popper {
  max-width: 400px;
  word-break: break-word;
  white-space: normal;
}

.opt-buttons .el-button,
.el-button.is-round {
  padding: 8px;
  margin-left: 6px;
}
</style>
