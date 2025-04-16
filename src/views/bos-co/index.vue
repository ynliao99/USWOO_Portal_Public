<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Plus } from "@element-plus/icons-vue";
import { message } from "@/utils/message";
import { useCoRecords, CoRecord } from "./useCoRecords";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import EditIcon from "~icons/ri/edit-circle-line";
import ViewIcon from "~icons/ri/eye-line";

const tableRef = ref();
defineOptions({
  name: "co"
});

// 从 hook 中解构逻辑与数据
const {
  paginatedRecords,
  loading,
  pagination,
  searchTerm,
  onlyMine,
  columns,
  fetchRecords,
  saveRecord,
  areas,
  setSearchTerm,
  setSort,
  toggleOnlyMine,
  setPage,
  setPageSize,
  setFilter
} = useCoRecords();

// 本地搜索输入
const searchTermLocal = ref(searchTerm.value);

// 对话框相关状态
const dialogVisible = ref(false);
const detailDialogVisible = ref(false);
const dialogTitle = ref("");
const form = ref<Partial<CoRecord>>({});
const recordDetail = ref<Partial<CoRecord>>({});

// 日期范围双向绑定
const dateRange = computed<string[]>({
  get() {
    return form.value.term_sd && form.value.term_ed
      ? [form.value.term_sd, form.value.term_ed]
      : [];
  },
  set(val: string[]) {
    if (val.length === 2) {
      form.value.term_sd = val[0];
      form.value.term_ed = val[1];
    } else {
      form.value.term_sd = "";
      form.value.term_ed = "";
    }
  }
});

// 新增/编辑对话框打开
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

// 保存表单
async function handleSave() {
  if (!form.value.type || !form.value.placeName || !form.value.location) {
    message("请填写所有必填项。", { type: "warning" });
    return;
  }
  try {
    await saveRecord(form.value);
    dialogVisible.value = false;
  } catch {
    // 内部已处理
  }
}

// 详情对话框
function showDetails(record: CoRecord) {
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
function handleFilterChange(filtersMap: Record<string, string[]>) {
  for (const key in filtersMap) {
    setFilter(key, filtersMap[key] || []);
  }
}
onMounted(() => fetchRecords());
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
      title="转租/拼室友"
      :columns="columns"
      @refresh="fetchRecords"
    >
      <template #buttons>
        <el-checkbox
          v-model="onlyMine"
          style="margin-right: 16px"
          @change="handleOnlyMineChange"
          >只看我的</el-checkbox
        >
        <el-button type="primary" @click="openDialog('add')">
          <el-icon><Plus /></el-icon>
          新增需求
        </el-button>
      </template>

      <template #default="{ size }">
        <pure-table
          ref="tableRef"
          row-key="id"
          showOverflowTooltip
          :data="paginatedRecords"
          :columns="columns"
          :loading="loading"
          :pagination="pagination"
          adaptive
          table-layout="fixed"
          stripe
          :size="size"
          @sort-change="handleSortChange"
          @filter-change="handleFilterChange"
          @page-size-change="handlePageSizeChange"
          @page-current-change="handlePageChange"
        >
          <template #operation="{ row }">
            <div style="white-space: nowrap">
              <el-button
                class="icon-button"
                color="#557DED"
                size="default"
                :icon="useRenderIcon(EditIcon)"
                @click="openDialog('edit', row)"
              />
              <el-button
                class="icon-button"
                type="primary"
                size="default"
                :icon="useRenderIcon(ViewIcon)"
                @click="showDetails(row)"
              />
            </div>
          </template>

          <template #term="{ row }">
            {{ row.term_sd }} - {{ row.term_ed }}
          </template>

          <template #cell="{ row, column }">
            <el-tooltip effect="dark" :content="row[column.prop]">
              <span class="cell-text">{{ row[column.prop] }}</span>
            </el-tooltip>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
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
          <el-input v-model="form.placeName" placeholder="地点名称" />
        </el-form-item>
        <el-form-item label="Unit/学院">
          <el-input v-model="form.unit" placeholder="单位/学院" />
        </el-form-item>
        <el-form-item label="详细地址">
          <el-input v-model="form.location" placeholder="详细地址" />
        </el-form-item>
        <el-form-item label="区域">
          <el-select v-model="form.area" placeholder="请选择">
            <el-option
              v-for="area in areas"
              :key="area"
              :label="area"
              :value="area"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="价格/预算">
          <el-input v-model="form.budget" placeholder="价格或预算" />
        </el-form-item>
        <el-form-item label="房型">
          <el-input v-model="form.roomType" placeholder="房型，用逗号分隔" />
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
            v-model="form.demand"
            type="textarea"
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
      v-model="detailDialogVisible"
      title="详细信息"
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
  margin-right: 8px;
  font-weight: bold;
  color: #606266;
}

.detail-value {
  color: #303133;
}
</style>
