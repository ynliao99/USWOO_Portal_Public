<script setup lang="ts">
import { ref, computed } from "vue";
import { Plus } from "@element-plus/icons-vue";
import { message } from "@/utils/message";
import { useCoRecords, CoRecord } from "./useCoRecords";
import { http } from "@/utils/http";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import EditIcon from "~icons/ri/edit-circle-line";
import ViewIcon from "~icons/ri/eye-line";

// 从 useCoRecords 中解构响应式数据与操作方法
const {
  paginatedRecords,
  loading,
  pagination,
  searchTerm,
  onlyMine,
  setSearchTerm,
  setSort,
  toggleOnlyMine,
  setPage,
  setPageSize,
  fetchRecords,
  saveRecord,
  areas
} = useCoRecords();

// 新增/编辑、详情对话框相关状态
const dialogVisible = ref(false);
const detailDialogVisible = ref(false);
const dialogTitle = ref("");
const form = ref<Partial<CoRecord>>({});
const recordDetail = ref<Partial<CoRecord>>({});

// 本地搜索输入（保留在 PureTableBar 上方）
const searchTermLocal = ref(searchTerm.value);

// 新增：定义范围日期选择双向绑定，转换 form.term_sd 与 form.term_ed
const dateRange = computed<string[]>({
  get() {
    return form.value.term_sd && form.value.term_ed
      ? [form.value.term_sd, form.value.term_ed]
      : [];
  },
  set(val: string[]) {
    if (val && val.length === 2) {
      form.value.term_sd = val[0];
      form.value.term_ed = val[1];
    } else {
      form.value.term_sd = "";
      form.value.term_ed = "";
    }
  }
});
const dynamicSize = ref();
const size = ref("default");

function openDialog(mode: "add" | "edit", record?: CoRecord) {
  if (mode === "add") {
    dialogTitle.value = "新增需求";
    form.value = {
      id: null,
      status: "",
      type: "",
      placeName: "",
      unit: "",
      location: "",
      area: "",
      budget: "",
      roomType: "",
      term_sd: "",
      term_ed: "",
      sex: "",
      identity: "",
      sexRequirement: "",
      demand: ""
    };
  } else if (mode === "edit" && record) {
    dialogTitle.value = "编辑需求";
    form.value = { ...record };
  }
  dialogVisible.value = true;
}

async function handleSave() {
  if (!form.value.type || !form.value.placeName || !form.value.location) {
    message("请填写所有必填项。", { type: "warning" });
    return;
  }
  try {
    await saveRecord(form.value);
    dialogVisible.value = false;
  } catch (error) {
    // 错误处理在 saveRecord 内部
  }
}

function handleSearch(term: string) {
  setSearchTerm(term);
}

function handleSortChange({ prop, order }: { prop: string; order: string }) {
  setSort(
    prop,
    order === "ascending" ? "asc" : order === "descending" ? "desc" : ""
  );
  setPage(1);
}

function handleOnlyMineChange(val: boolean) {
  toggleOnlyMine(val);
  setPage(1);
}

function handlePageChange(page: number) {
  setPage(page);
}
function handlePageSizeChange(size: number) {
  setPageSize(size);
}

// 筛选变化处理（这里示例仅重置页码后刷新数据，可根据实际业务扩展处理逻辑）
function handleFilterChange(newFilters: Record<string, string[]>) {
  setPage(1);
  fetchRecords();
}

// 显示详情对话框
function showDetails(record: CoRecord) {
  recordDetail.value = { ...record };
  detailDialogVisible.value = true;
}

// 定义表格列（对类型、经纪人、房源/通勤地点、地区、房型、性别要求提供筛选功能）
const columns = [
  { label: "操作", prop: "operation", slot: "operation", width: "150px" },
  {
    label: "类型",
    prop: "type",
    sortable: true,
    filters: [
      { text: "转租", value: "转租" },
      { text: "拼室友", value: "拼室友" },
      { text: "私人房东", value: "私人房东" },
      { text: "单房", value: "单房" }
    ],
    filterMultiple: false
  },
  {
    label: "经纪人",
    prop: "userAgentName",
    sortable: true,
    filters: [], // 请在此补充经纪人筛选项
    filterMultiple: false
  },
  {
    label: "房源/通勤地点",
    prop: "location",
    sortable: true,
    filters: [], // 请在此补充房源/通勤地点筛选项
    filterMultiple: true
  },
  {
    label: "地区",
    prop: "area",
    sortable: true,
    filters: [
      { text: "Allston", value: "Allston" },
      { text: "Arlington", value: "Arlington" }
    ],
    filterMultiple: true
  },
  { label: "价格/预算", prop: "budget" },
  {
    label: "房型",
    prop: "roomType",
    filters: [], // 请在此补充房型筛选项
    filterMultiple: true
  },
  { label: "租期/入住时段", prop: "term", slot: "term" },
  {
    label: "性别要求",
    prop: "sexRequirement",
    sortable: true,
    filters: [
      { text: "男", value: "男" },
      { text: "女", value: "女" },
      { text: "不限", value: "不限" }
    ],
    filterMultiple: true
  },
  {
    label: "主观需求",
    width: "400",
    prop: "demand"
  }
];
</script>

<template>
  <div>
    <!-- 搜索框 -->
    <el-input
      v-model="searchTermLocal"
      placeholder="全能搜索..."
      clearable
      @input="handleSearch"
      style="margin: 20px 0"
    ></el-input>

    <!-- 使用 PureTableBar 管理整个表格控件 -->
    <PureTableBar
      title="转租/拼室友"
      :columns="columns"
      @refresh="fetchRecords"
    >
      <!-- 按钮区域（包含“只看我的”复选框与新增需求按钮） -->
      <template #buttons>
        <el-checkbox
          v-model="onlyMine"
          @change="handleOnlyMineChange"
          style="margin-right: 16px"
        >
          只看我的
        </el-checkbox>
        <el-button type="primary" @click="openDialog('add')">
          <el-icon><Plus /></el-icon>
          新增需求
        </el-button>
      </template>

      <!-- 默认插槽，用于渲染 pure-table -->
      <template #default="{ size, dynamicColumns }">
        <pure-table
          showOverflowTooltip
          :data="paginatedRecords"
          :columns="dynamicColumns"
          :loading="loading"
          :pagination="pagination"
          @sort-change="handleSortChange"
          @filter-change="handleFilterChange"
          @page-size-change="handlePageSizeChange"
          @page-current-change="handlePageChange"
          :adaptive="true"
          table-layout="fixed"
          stripe
          :size="size"
        >
          <!-- 操作列：采用图标按钮（减少 padding），并确保不换行 -->
          <template #operation="{ row }">
            <div style="white-space: nowrap">
              <el-button
                class="icon-button"
                color="#557DED"
                size="default"
                @click="openDialog('edit', row)"
                :icon="useRenderIcon(EditIcon)"
              ></el-button>
              <el-button
                class="icon-button"
                type="primary"
                size="default"
                @click="showDetails(row)"
                :icon="useRenderIcon(ViewIcon)"
              ></el-button>
            </div>
          </template>

          <!-- 租期列：显示开始和结束日期 -->
          <template #term="{ row }">
            {{ row.term_sd }} - {{ row.term_ed }}
          </template>

          <!-- 默认单元格渲染：对内容文字最多显示 3 行，超出部分截断，鼠标悬停显示 Tooltip -->
          <template #cell="{ row, column }">
            <el-tooltip effect="dark" :content="row[column.prop]">
              <span class="cell-text">{{ row[column.prop] }}</span>
            </el-tooltip>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- 新增/编辑对话框 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="600px">
      <el-form :model="form" label-width="120px">
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio-button value="Open">Open</el-radio-button>
            <el-radio-button value="Closed">Closed</el-radio-button>
            </el-radio-group>
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio-button value="转租">转租</el-radio-button>
            <el-radio-button value="拼室友">拼室友</el-radio-button>
            <el-radio-button value="私人房东">私人房东</el-radio-button>
            <el-radio-button value="单房">单房</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="房源/地点">
          <el-input v-model="form.placeName" placeholder="地点名称"></el-input>
        </el-form-item>
        <el-form-item label="Unit/学院">
          <el-input v-model="form.unit" placeholder="单位/学院"></el-input>
        </el-form-item>
        <el-form-item label="详细地址">
          <el-input v-model="form.location" placeholder="详细地址"></el-input>
        </el-form-item>
        <el-form-item label="区域">
          <el-select v-model="form.area" placeholder="请选择">
            <el-option
              v-for="area in areas"
              :key="area"
              :label="area"
              :value="area"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="价格/预算">
          <el-input v-model="form.budget" placeholder="价格或预算"></el-input>
        </el-form-item>
        <el-form-item label="房型">
          <el-input
            v-model="form.roomType"
            placeholder="房型，用逗号分隔"
          ></el-input>
        </el-form-item>
        <el-form-item label="租期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            class="w-[240px]!"
            unlink-panels
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            :popper-options="{ placement: 'bottom-start' }"
            :size="dynamicSize"
            :disabled="size === 'disabled'"
          />
        </el-form-item>
        <el-form-item label="本人性别">
          <el-radio-group v-model="form.sex">
            <el-radio value="男">男</el-radio>
            <el-radio value="女">女</el-radio>
            <el-radio value="整套转租">整套转租</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="性别要求">
          <el-radio-group v-model="form.sexRequirement">
            <el-radio value="男">男</el-radio>
            <el-radio value="女">女</el-radio>
            <el-radio value="不限">不限</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="本人身份">
          <el-radio-group v-model="form.identity">
            <el-radio value="本科">本科</el-radio>
            <el-radio value="研究生">研究生</el-radio>
            <el-radio value="工作">工作</el-radio>
            <el-radio value="访问学者">访问学者</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="主观需求">
          <el-input
            type="textarea"
            v-model="form.demand"
            placeholder="备注信息"
            :rows="5"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      title="详细信息"
      v-model="detailDialogVisible"
      width="600px"
      center
    >
      <div class="detail-content">
        <div class="detail-item">
          <span class="detail-label">状态：</span>
          <span class="detail-value">{{ recordDetail.status }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">类型：</span>
          <span class="detail-value">{{ recordDetail.type }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">经纪人：</span>
          <span class="detail-value">{{ recordDetail.userAgentName }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">房源/地点：</span>
          <span class="detail-value">{{ recordDetail.placeName }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Unit/学院：</span>
          <span class="detail-value">{{ recordDetail.unit }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">详细地址：</span>
          <span class="detail-value">{{ recordDetail.location }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">区域：</span>
          <span class="detail-value">{{ recordDetail.area }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">价格/预算：</span>
          <span class="detail-value">{{ recordDetail.budget }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">房型：</span>
          <span class="detail-value">{{ recordDetail.roomType }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">租期：</span>
          <span class="detail-value"
            >{{ recordDetail.term_sd }} - {{ recordDetail.term_ed }}</span
          >
        </div>
        <div class="detail-item">
          <span class="detail-label">本人性别：</span>
          <span class="detail-value">{{ recordDetail.sex }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">性别要求：</span>
          <span class="detail-value">{{ recordDetail.sexRequirement }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">本人身份：</span>
          <span class="detail-value">{{ recordDetail.identity }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">主观需求：</span>
          <span class="detail-value">{{ recordDetail.demand }}</span>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="detailDialogVisible = false">
          关闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style>
/* 按钮样式：减少按钮内左右 padding 并确保按钮宽度自适应内容 */

/* 表格标题行的每个标题不换行 */
.pure-table .el-table__header-wrapper th {
  white-space: nowrap;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 12px; /* 信息间距 */
  margin: 20px 0;
}

.detail-item {
  font-size: 16px; /* 较大的字体 */
  line-height: 1.6;
}

.detail-label {
  font-weight: bold;
  color: #606266;
  margin-right: 8px;
}

.detail-value {
  color: #303133;
}
</style>
