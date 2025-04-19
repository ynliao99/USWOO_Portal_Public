<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
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
import FullIcon from "~icons/ic/baseline-star-rate";
import HalfIcon from "~icons/ic/baseline-star-half";
import NoneIcon from "~icons/lineicons/star-fat";
import InfoIcon from "~icons/fa6-solid/info";

import { coFormRules } from "./utils/rule";

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
const replaceYesNo = (text: string | null) => {
  if (text == null) return "";
  return text
    .replace(
      /\byes\b/i,
      '<i class="fa-solid fa-check" style="color: #008a17;"></i>'
    )
    .replace(
      /\bno\b/i,
      '<i class="fa-regular fa-xmark" style="color: #eb0000;"></i>'
    )
    .replace(
      /\bdk\b/i,
      '<i class="fa-regular fa-question" style="color: #feb02a;"></i>'
    );
};

const replaceBrokerFee = (text: string | null) => {
  if (text == null) return "";
  return text
    .replace(/\bfull\b/i, '<i class="fas fa-star"></i>')
    .replace(/\bhalf\b/i, '<i class="fas fa-star-half-alt"></i>')
    .replace(/\bnone\b/i, '<i class="far fa-star"></i>')
    .replace(/\bother\b/i, '<i class="fas fa-info"></i>')
    .replace(/\bunknown\b/i, '<i class="fas fa-question"></i>');
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
            <div style="white-space: nowrap">
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
            </div>
          </template>
          <template #building_name="{ row }">
            <a :href="`${row.website}`" target="_blank" style="color: #409eff">
              {{ row.building_name }}
            </a>
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
</style>
