<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { ElForm, FormInstance } from "element-plus";
import { message } from "@/utils/message";
import { useCoRecords, CoRecord } from "./useCoRecords";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import EditIcon from "~icons/ri/edit-circle-line";
import ViewIcon from "~icons/ri/eye-line";
import AddIcon from "~icons/ri/add-circle-line";
import { coFormRules } from "./utils/rule";

const tableRef = ref();
const formRef = ref<InstanceType<typeof ElForm>>();
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
// 动态表单项 label 显示
const isSharedOrShortTerm = computed(() => {
  return ["拼室友", "找短租"].includes(form.value.type || "");
});

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
function openDialog(mode: "add" | "edit", record?: CoRecord) {
  if (mode === "add") {
    isAddMode = true;
    dialogTitle.value = "新增需求";
    form.value = {
      id: null,
      status: "Open", // 状态默认 Open
      type: "",
      placeName: "",
      unit: "",
      location: "",
      area: "",
      budget: "",
      roomType: [],
      term_sd: "",
      term_ed: "",
      sex: "",
      identity: "",
      sexRequirement: "",
      demand: ""
    };
  } else if (mode === "edit" && record) {
    isAddMode = false;
    dialogTitle.value = "编辑需求";
    form.value = {
      ...record,
      roomType: Array.isArray(record.roomType)
        ? record.roomType
        : typeof record.roomType === "string"
          ? record.roomType.split(/\s*,\s*/)
          : []
    };
  }
  dialogVisible.value = true;
}

async function handleSave() {
  formRef.value?.validate(async valid => {
    if (!valid) return;
    const payload = {
      ...form.value,
      roomType: Array.isArray(form.value.roomType)
        ? form.value.roomType.join(", ")
        : (form.value.roomType ?? "")
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

// 监听对话框显示变化，首次打开时加载地图自动补全脚本
// 定义一个状态标识，记录是否已初始化自动补全
const autoCompleteInitialized = ref(false);
// 声明外部全局函数
declare const initiateMapAutoComplete: (...args: any[]) => void;

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

onMounted(() => {
  fetchRecords();
  // 监听 autocomplete-selected 事件，更新表单数据
  document.addEventListener("autocomplete-selected", (e: CustomEvent) => {
    const { marker, value } = e.detail;
    if (marker && form.value.hasOwnProperty(marker)) {
      form[marker] = value;
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
        <el-button
          type="primary"
          :icon="useRenderIcon(AddIcon)"
          @click="openDialog('add')"
        >
          新增需求
        </el-button>
      </template>

      <template #default="{ size }">
        <el-button @click="clearFilters">重置所有筛选项目</el-button>

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
          <template #placeName="{ row }">
            <a
              :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.location)}`"
              target="_blank"
              style="color: #409eff"
            >
              {{ row.placeName }}
            </a>
          </template>
          <template #roomType="{ row }">
            <span>
              {{
                Array.isArray(row.roomType)
                  ? row.roomType.join(", ")
                  : typeof row.roomType === "string"
                    ? row.roomType.split(",").join(", ")
                    : row.roomType
              }}
            </span>
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
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      class="custom-dialog"
    >
      <el-form
        ref="ruleFormRef"
        :model="form"
        :rules="coFormRules"
        label-width="6em"
      >
        <el-form-item v-if="!isAddMode" label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio-button value="Open">Open</el-radio-button>
            <el-radio-button value="Closed">Closed</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type" required>
            <el-radio-button value="转租">转租</el-radio-button>
            <el-radio-button value="私人房东">私人房东</el-radio-button>
            <el-radio-button value="拼室友">拼室友</el-radio-button>
            <el-radio-button value="找短租">找短租</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          :label="isSharedOrShortTerm ? '通勤地点' : '房源地址'"
          required
          prop="placeName"
        >
          <el-input
            v-model="form.placeName"
            placeholder="地点名称"
            required
            data-marker="placeName"
          />
        </el-form-item>
        <el-form-item
          :label="isSharedOrShortTerm ? '学院' : 'Unit'"
          prop="unit"
        >
          <el-input v-model="form.unit" />
        </el-form-item>
        <el-form-item label="详细地址" required prop="location">
          <el-input
            v-model="form.location"
            placeholder="详细地址"
            required
            data-marker="location"
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
        <el-form-item
          :label="isSharedOrShortTerm ? '预算' : '价格'"
          required
          prop="budget"
        >
          <el-input v-model="form.budget" placeholder="请输入" required />
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

        <el-form-item label="租期" required prop="dateRange">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            unlink-panels
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            :popper-options="{ placement: 'bottom-start' }"
            size="default"
            required
          />
        </el-form-item>
        <el-form-item label="本人性别" required prop="sex">
          <el-radio-group v-model="form.sex">
            <el-radio-button value="男">男</el-radio-button>
            <el-radio-button value="女">女</el-radio-button>
            <el-radio-button value="整套转租">整套转租</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="性别要求" required prop="sexRequirement">
          <el-radio-group v-model="form.sexRequirement">
            <el-radio-button value="男">男</el-radio-button>
            <el-radio-button value="女">女</el-radio-button>
            <el-radio-button value="不限">不限</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="本人身份" required prop="identity">
          <el-radio-group v-model="form.identity">
            <el-radio-button value="本科">本科</el-radio-button>
            <el-radio-button value="研究生">研究生</el-radio-button>
            <el-radio-button value="工作">工作</el-radio-button>
            <el-radio-button value="访问学者">访问学者</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          :label="isSharedOrShortTerm ? '主观需求' : '备注信息'"
          prop="demand"
        >
          <el-input
            v-model="form.demand"
            type="textarea"
            :placeholder="
              isSharedOrShortTerm
                ? '如意向公寓、通勤时间、室内洗烘、车位、宠物、偏好卧室、偏好区域'
                : '输入房源的其他说明，例如家具、价格浮动空间、室友情况等'
            "
            :rows="5"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="onSubmit(ruleFormRef)"
          >保存</el-button
        >
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="详细信息"
      width="600px"
      center
      class="custom-dialog"
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
          <span class="detail-label">
            {{
              ["拼室友", "找短租"].includes(recordDetail.type || "")
                ? "通勤地点："
                : "房源地址："
            }}
          </span>
          <span class="detail-value">{{ recordDetail.placeName }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">
            {{
              ["拼室友", "找短租"].includes(recordDetail.type || "")
                ? "学院："
                : "Unit："
            }}
          </span>
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
          <span class="detail-label">
            {{
              ["拼室友", "找短租"].includes(recordDetail.type || "")
                ? "预算："
                : "价格："
            }}
          </span>
          <span class="detail-value">{{ recordDetail.budget }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">房型：</span>
          <span class="detail-value">
            {{
              Array.isArray(recordDetail.roomType)
                ? recordDetail.roomType.join(", ")
                : recordDetail.roomType
            }}
          </span>
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
          <span class="detail-label">
            {{
              ["拼室友", "找短租"].includes(recordDetail.type || "")
                ? "主观需求："
                : "备注信息："
            }}
          </span>
          <span class="detail-value">{{ recordDetail.demand }}</span>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="detailDialogVisible = false"
          >关闭</el-button
        >
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
  max-height: 80vh;
  padding-right: 12px;
  overflow-y: auto;
}
</style>
