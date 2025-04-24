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
  name: "driveView"
});

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
  areas,
  openDialog,
  handleSave,
  handleDelete,
  searchTerm,
  columns,
  setSearchTerm
} = useRecords();

// 本地搜索输入
const searchTermLocal = ref(searchTerm.value);

console.log(currentUserAgentId.value);
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

function handleSearch(val: string) {
  setSearchTerm(val);
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
            "apartmentName,address",
            "apartmentName",
            "address",
            "none",
            "apartmentName"
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
    <el-input
      v-model="searchTermLocal"
      placeholder="全能搜索..."
      clearable
      style="margin: 0"
      @input="handleSearch"
    />

    <PureTableBar
      title="我上传的视频"
      :columns="columns"
      @refresh="fetchRecords"
    >
      <!-- 按钮区域 -->
      <template #buttons>
        <el-button
          type="primary"
          :icon="useRenderIcon(AddIcon)"
          @click="openDialog('add')"
        >
          新增看房
        </el-button>
      </template>

      <template #default="{ size, dynamicColumns }">
        <pure-table
          :data="dataList"
          :columns="dynamicColumns"
          showOverflowTooltip
          :loading="loading"
          :pagination="{ ...pagination, size }"
          table-layout="fixed"
          stripe
          :size="size"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #operation="{ row }">
            <template v-if="row">
              <div style="white-space: nowrap" class="opt-buttons">
                <!-- 只有自己或者ID为 649u54989 的人才看得到编辑/删除 -->
                <template
                  v-if="
                    String(row.userID) === String(currentUserAgentId) ||
                    currentUserAgentId === '649u54989'
                  "
                >
                  <el-button
                    class="icon-button"
                    color="#557DED"
                    size="default"
                    :icon="useRenderIcon(EditIcon)"
                    @click="openDialog('edit', row)"
                  />
                  <el-popconfirm
                    title="确定删除此视频？删除后不可恢复且当月上传次数-1！"
                    @confirm="handleDelete(row)"
                  >
                    <template #reference>
                      <el-button
                        class="icon-button"
                        type="danger"
                        size="default"
                        :icon="useRenderIcon(DeleteIcon)"
                      />
                    </template>
                  </el-popconfirm>
                </template>

                <!-- 其余按钮正常显示 -->
                <template v-if="String(row.status) === 'Done'">
                  <el-button
                    class="icon-button"
                    type="success"
                    size="default"
                    :icon="useRenderIcon(ShareIcon)"
                    @click="openDialog('share', row)"
                  />
                </template>
              </div>
            </template>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- 新增/编辑看房记录模态框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      class="custom-dialog"
    >
      <el-form
        ref="ruleFormRef"
        :model="form"
        :rules="driveViewFormRules"
        label-width="6em"
      >
        <el-form-item label="公寓名称" required prop="apartmentName">
          <el-input
            v-model="form.apartmentName"
            placeholder="地点名称"
            required
            data-marker="apartmentName"
          />
        </el-form-item>
        <el-form-item label="Unit/APT" prop="unit">
          <el-input v-model="form.unit" />
        </el-form-item>
        <el-form-item label="详细地址" required prop="address">
          <el-input
            v-model="form.address"
            placeholder="address"
            required
            data-marker="address"
          />
        </el-form-item>
        <el-form-item label="区域" required prop="area">
          <el-select v-model="form.area" placeholder="请选择" required>
            <el-option
              v-for="area in areas"
              :key="area"
              :label="area"
              :value="area"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="onSubmit(ruleFormRef)"
          >保存</el-button
        >
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
