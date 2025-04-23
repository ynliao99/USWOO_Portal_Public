<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, watch, computed } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import AddIcon from "~icons/ri/add-circle-line";
import EditIcon from "~icons/ri/edit-circle-line";
import DeleteIcon from "~icons/ri/delete-bin-2-line";
import { useSchedules } from "./useSchedules";
import { showingFormRules } from "./utils/rule";
import { message } from "@/utils/message";
import type { FormInstance } from "element-plus";

// 声明外部全局函数
declare const initiateMapAutoComplete: (...args: any[]) => void;

// 从 hook 中获取状态和操作方法
const {
  dataList,
  loading,
  pagination,
  currentUserAgentId,
  fetchSchedules,
  dialogVisible,
  dialogTitle,
  form,
  openDialog,
  handleSave,
  handleDelete,
  // 新增，更新排序和筛选条件状态的方法
  updateQueryParams
} = useSchedules();

// 新增：保存排序和筛选条件（根据需要可以额外维护多个变量）
const sortField = ref("");
const sortOrder = ref(""); // "asc" 或 "desc"
const filters = reactive({
  agentName: [] as string[],
  location: [] as string[]
});

// 表格列定义，同时设置 sortable 和 filters（初始过滤选项为空，稍后从 API 赋值）
const columns = [
  {
    label: "操作",
    prop: "operation",
    slot: "operation",
    width: "150px"
  },
  {
    label: "公寓/地点",
    prop: "location",
    sortable: true
  },
  {
    label: "经纪人",
    prop: "agentName",
    sortable: true
  },
  {
    label: "开始时间",
    prop: "startTime",
    sortable: true
  },
  { label: "详细地址", prop: "address" },
  { label: "房型/Unit", prop: "unit" },
  {
    label: "客户信息",
    prop: "customerInfo",
    slot: "customerInfo"
  },
  { label: "备注", prop: "note" }
];

// 定义一个状态标识，记录是否已初始化自动补全
const autoCompleteInitialized = ref(false);
const size = ref("default");
const dynamicSize = ref();
const onlyMine = ref(false);

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

function pad(num: number): string {
  return num < 10 ? "0" + num : num.toString();
}

function formatDate(date: Date): string {
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    " " +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds())
  );
}

// “只看我的”按钮事件处理
function onOnlyMineChange(checked: boolean) {
  onlyMine.value = checked;
  // 当选中时，强制 agentName 筛选为当前用户的ID，否则清空 agent 筛选
  if (checked && currentUserAgentId.value) {
    filters.agentName = [currentUserAgentId.value];
  } else {
    filters.agentName = [];
  }
  pagination.currentPage = 1;
  updateQueryParams({
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    filters
  });
  fetchSchedules();
}

// 分页切换时重新加载数据
function handleSizeChange(val: number) {
  pagination.pageSize = val;
  pagination.currentPage = 1;
  fetchSchedules();
}

function handleCurrentChange(val: number) {
  pagination.currentPage = val;
  fetchSchedules();
}

// 处理排序变更（具体事件名称请参考 pure-table 文档）
function handleSortChange({ prop, order }: { prop: string; order: string }) {
  sortField.value = prop;
  sortOrder.value =
    order === "ascending" ? "asc" : order === "descending" ? "desc" : "";
  // 重置当前页为1，然后重新加载数据
  pagination.currentPage = 1;
  updateQueryParams({
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    filters
  });
  fetchSchedules();
}

// 处理筛选变更（pure-table 触发 filter-change 事件）
function handleFilterChange(newFilters: Record<string, string[]>) {
  filters.agentName = newFilters.agentName || [];
  filters.location = newFilters.location || [];
  // 如果“只看我的”已选中，则覆盖 agentName 筛选为当前用户ID
  if (onlyMine.value && currentUserAgentId.value) {
    filters.agentName = [currentUserAgentId.value];
  }
  pagination.currentPage = 1;
  updateQueryParams({
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    filters
  });
  fetchSchedules();
}

onMounted(() => {
  fetchSchedules();
  // 监听 autocomplete-selected 事件，更新表单数据
  document.addEventListener("autocomplete-selected", (e: CustomEvent) => {
    const { marker, value } = e.detail;
    if (marker && form.hasOwnProperty(marker)) {
      form[marker] = value;
    }
  });
});

// 监听对话框显示变化，首次打开时加载地图自动补全脚本
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
            "location,address",
            "location",
            "address",
            "none",
            "location"
          );
          autoCompleteInitialized.value = true;
        }
      };
      document.body.appendChild(script);
    });
  }
});

// --------------------- 限制时间可选范围 ---------------------
// 1. 限制开始时间的可选范围（若结束时间已设定，则开始时间不能大于等于结束时间）
const startPickerOptions = computed(() => ({
  disabledDate: (time: Date) => {
    if (form.endTime) {
      return time.getTime() >= new Date(form.endTime).getTime();
    }
    return false;
  }
}));

// 2. 限制结束时间的可选范围（若开始时间已设定，则结束时间不能小于等于开始时间）
const endPickerOptions = computed(() => ({
  disabledDate: (time: Date) => {
    if (form.startTime) {
      return time.getTime() <= new Date(form.startTime).getTime();
    }
    return false;
  }
}));

// 3. 监听开始时间变化
watch(
  () => form.startTime,
  newVal => {
    if (newVal && !form.endTime) {
      const startDate = new Date(newVal);
      // 自动将结束时间设为开始时间后30分钟，并转换为 "YYYY-MM-DD HH:mm:ss" 格式
      form.endTime = formatDate(new Date(startDate.getTime() + 30 * 60 * 1000));
    }
    if (form.startTime && form.endTime) {
      const start = new Date(form.startTime);
      const end = new Date(form.endTime);
      if (end.getTime() <= start.getTime()) {
        form.endTime = "";
      }
    }
  }
);

// 4. 监听结束时间变化
watch(
  () => form.endTime,
  newVal => {
    if (form.startTime && newVal) {
      const start = new Date(form.startTime);
      const end = new Date(newVal);
      if (end.getTime() <= start.getTime()) {
        // 如果结束时间不大于开始时间，结束时间设置到开始时间并通知用户
        form.endTime = formatDate(
          new Date(new Date(form.startTime).getTime() + 60 * 1000)
        );
        message("结束时间必须晚于开始时间。", { type: "warning" });
      }
    }
  }
);
// --------------------- 新增代码结束 ---------------------
</script>

<template>
  <div>
    <PureTableBar title="看房登记" :columns="columns" @refresh="fetchSchedules">
      <!-- 按钮区域 -->
      <template #buttons>
        <el-button type="primary" :icon="useRenderIcon(AddIcon)" @click="openDialog('add')">
          新增看房
        </el-button>
      </template>

      <template #default="{ size, dynamicColumns }">
        <!-- 添加“只看我的”按钮 -->
        <div style="margin: 0 16px">
          <el-check-tag :class="[
              'select-none',
              size === 'disabled' && 'tag-disabled',
              onlyMine && 'is-active'
            ]" :checked="onlyMine" @change="onOnlyMineChange">
            {{ onlyMine ? "✅ 只看我的" : "只看我的" }}
          </el-check-tag>
        </div>
        <pure-table :data="dataList" :columns="dynamicColumns" showOverflowTooltip :loading="loading"
          :pagination="{ ...pagination, size }" table-layout="fixed" stripe :size="size" @sort-change="handleSortChange"
          @filter-change="handleFilterChange" @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange">
          <!-- 操作列插槽：仅当记录的 userAgentId 与 currentUserAgentId 相同时显示编辑和删除按钮 -->
          <template #operation="{ row }">
            <template v-if="String(row.userAgentId) === String(currentUserAgentId)">
              <el-button color="#557DED" size="default" :icon="useRenderIcon(EditIcon)"
                @click="openDialog('edit', row)" />
              <el-popconfirm title="确定删除此看房记录？删除后不可恢复！" @confirm="handleDelete(row)">
                <template #reference>
                  <el-button type="danger" size="default" :icon="useRenderIcon(DeleteIcon)" />
                </template>
              </el-popconfirm>
            </template>
          </template>
          <!-- 客户信息列插槽 -->
          <template #customerInfo="{ row }">
            <span>
              {{ row.customerSex || "" }}
              {{ row.customerIdentity || "" }}
              {{ row.customerTarget || "" }}
              {{ row.customerNeed || "" }}
            </span>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- 新增/编辑看房记录模态框 -->
    <el-dialog v-model="dialogVisible" class="showing-dialog" :title="dialogTitle">
      <el-form ref="ruleFormRef" :model="form" :rules="showingFormRules" class="dialog-form">
        <el-form-item label="公寓/见面地点" prop="location">
          <el-input v-model="form.location" placeholder="输入地点开始搜索" required data-marker="location" />
        </el-form-item>

        <el-form-item label="看房开始时间" prop="startTime">
          <el-date-picker v-model="form.startTime" type="datetime" placeholder="选择开始时间"
            :picker-options="startPickerOptions" style="width: 100%" value-format="YYYY-MM-DD HH:mm:ss" required />
        </el-form-item>
        <el-form-item label="看房结束时间" prop="endTime">
          <el-date-picker v-model="form.endTime" type="datetime" placeholder="选择结束时间" :picker-options="endPickerOptions"
            style="width: 100%" value-format="YYYY-MM-DD HH:mm:ss" required />
        </el-form-item>
        <el-form-item label="详细地址" prop="address">
          <el-input v-model="form.address" placeholder="输入详细地址" required data-marker="address" />
        </el-form-item>
        <el-form-item label="房型/Unit">
          <el-input v-model="form.unit" placeholder="列出要看的Unit和房型" />
        </el-form-item>
        <div style="margin: 20px 0; text-align: center">
          <i>只有持证经纪人或组长可以领取钥匙</i>
        </div>
        <el-form-item label="客户性别">
          <el-radio-group v-model="form.customerSex" :size="dynamicSize" :disabled="size === 'disabled'">
            <el-radio-button value="男">男</el-radio-button>
            <el-radio-button value="女">女</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="身份">
          <el-radio-group v-model="form.customerIdentity" :size="dynamicSize" :disabled="size === 'disabled'">
            <el-radio-button value="本科">本科</el-radio-button>
            <el-radio-button value="研究生">研究生</el-radio-button>
            <el-radio-button value="工作">工作</el-radio-button>
            <el-radio-button value="访问学者">访问学者</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="通勤地点">
          <el-input v-model="form.customerTarget" placeholder="上学/工作地点" />
        </el-form-item>
        <el-form-item label="客户需求">
          <el-input v-model="form.customerNeed" placeholder="需求信息" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" type="textarea" placeholder="备注（如同一客户多个看房，可在此添加更多房源）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="onSubmit(ruleFormRef)">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style>
@media (width <= 768px) {
  .el-dialog {
    width: 90% !important;
  }
}

@media (width <= 768px) {
  .dialog-form .el-form-item__label {
    /* 移除固定宽度 */
    width: auto !important;
    text-align: left !important;
  }
}

.showing-dialog .el-dialog {
  /* 默认宽度为600px */
  width: 600px !important;
}

/* 针对 .dialog-form 中的 label 进行调整 */
.dialog-form .el-form-item__label {
  text-align: right;
}

.automap_autocomplete-suggestions {
  z-index: 9999 !important;
}

.only-mine-tag {
  display: inline-block;
  padding: 4px 8px;
  color: #606266; /* 未选中时文字颜色 */
  cursor: pointer;
  border: 1px solid #dcdfe6; /* 未选中时边框颜色 */
  border-radius: 4px;
  transition:
    background 0.3s,
    color 0.3s,
    border 0.3s;
}

.only-mine-tag.active {
  color: #fff;
  background-color: var(--el-color-primary, #409eff); /* Element Plus 主色 */
  border-color: var(--el-color-primary, #409eff);
}

.pure-table .el-table__header-wrapper th {
  white-space: nowrap;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  font-size: 16px;
  line-height: 1.6;
}

.el-dialog {
  max-height: 80vh;
  padding-right: 12px;
  margin-top: 10vh;
  overflow-y: auto;
}

.detail-label {
  margin-right: 8px;
  font-weight: bold;
  color: #606266;
}

.detail-value {
  color: #303133;
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
</style>
