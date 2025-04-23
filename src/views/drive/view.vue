<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, watch, computed } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import AddIcon from "~icons/ri/add-circle-line";
import EditIcon from "~icons/ri/edit-circle-line";
import DeleteIcon from "~icons/ri/delete-bin-2-line";
import ShareIcon from "~icons/ri/share-forward-2-fill";
import { useRecords } from "./utils/getViewRecord";
import { driveViewFormRules } from "./utils/rule";
import { message } from "@/utils/message";
import type { FormInstance } from "element-plus";

// 声明外部全局函数
declare const initiateMapAutoComplete: (...args: any[]) => void;

defineOptions({
  name: 'driveView'
})

// 从 hook 中获取状态和操作方法
const {
  dataList,
  loading,
  pagination,
  currentUserAgentId,
  fetchRecords,
  dialogVisible,
  dialogTitle,
  form,
  openDialog,
  handleSave,
  handleDelete,
  columns,
  // 新增，更新排序和筛选条件状态的方法
  updateQueryParams
} = useRecords();

// 新增：保存排序和筛选条件（根据需要可以额外维护多个变量）
const sortField = ref("");
const sortOrder = ref(""); // "asc" 或 "desc"
const filters = reactive({
  agentName: [] as string[],
  location: [] as string[]
});

// 表格列定义，同时设置 sortable 和 filters（初始过滤选项为空，稍后从 API 赋值）


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
  fetchRecords();
}

// 分页切换时重新加载数据
function handleSizeChange(val: number) {
  pagination.pageSize = val;
  pagination.currentPage = 1;
  fetchRecords();
}

function handleCurrentChange(val: number) {
  pagination.currentPage = val;
  fetchRecords();
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
  fetchRecords();
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
  fetchRecords();
}

onMounted(() => {
  fetchRecords();
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

</script>

<template>
  <div>
    <PureTableBar title="我上传的视频" :columns="columns" @refresh="fetchRecords">
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
              <div style="white-space: nowrap" class="opt-buttons">
                <el-button class="icon-button" color="#557DED" size="default" :icon="useRenderIcon(EditIcon)"
                  @click="openDialog('edit', row)" />
                <el-popconfirm title="确定删除此看房记录？删除后不可恢复！" @confirm="handleDelete(row)">
                  <template #reference>
                    <el-button class="icon-button" type="danger" size="default" :icon="useRenderIcon(DeleteIcon)" />
                  </template>
                </el-popconfirm>
              </div>
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
    <el-dialog v-model="dialogVisible" :title="dialogTitle" class="custom-dialog">
      <el-form ref="ruleFormRef" :model="form" :rules="driveViewFormRules" label-width="6em">
        
        <el-form-item label="公寓名称" required prop="placeName">
          <el-input v-model="form.placeName" placeholder="地点名称" required data-marker="placeName" />
        </el-form-item>
        <el-form-item label="Unit/APT" prop="unit">
          <el-input v-model="form.unit" />
        </el-form-item>
        <el-form-item label="详细地址" required prop="address">
          <el-input v-model="form.address" placeholder="详细地址" required data-marker="location" />
        </el-form-item>
        <el-form-item label="区域" required prop="area">
          <el-select v-model="form.area" placeholder="请选择" required>
            <el-option v-for="area in areas" :key="area" :label="area" :value="area" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="房型" required prop="roomType">
          <el-checkbox-group v-model="form.roomType as string[]" required>
            <el-checkbox-button value="Studio">Studio</el-checkbox-button>
            <el-checkbox-button value="1B1B">1B1B</el-checkbox-button>
            <el-checkbox-button value="1B Den">1B+Den</el-checkbox-button>
            <el-checkbox-button value="2B1B">2B1B</el-checkbox-button>
            <el-checkbox-button value="2B2B">2B2B</el-checkbox-button>
            <el-checkbox-button value="3B1B">3B1B</el-checkbox-button>
            <el-checkbox-button value="3B2B">3B2B</el-checkbox-button>
            <el-checkbox-button value="3B3B">3B3B</el-checkbox-button>
            <el-checkbox-button value="4B2B">4B2B</el-checkbox-button>
            <el-checkbox-button value="4B3B">4B3B</el-checkbox-button>
            <el-checkbox-button value="4B4B">4B4B</el-checkbox-button>
            <el-checkbox-button value="5B+">5B+</el-checkbox-button>
          </el-checkbox-group>
        </el-form-item>

        
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="onSubmit(ruleFormRef)">保存</el-button>
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
  color: #606266;
  /* 未选中时文字颜色 */
  cursor: pointer;
  border: 1px solid #dcdfe6;
  /* 未选中时边框颜色 */
  border-radius: 4px;
  transition:
    background 0.3s,
    color 0.3s,
    border 0.3s;
}

.only-mine-tag.active {
  color: #fff;
  background-color: var(--el-color-primary, #409eff);
  /* Element Plus 主色 */
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

.opt-buttons .el-button,
.el-button.is-round {
  padding: 8px;
  margin-left: 6px;
}
</style>
