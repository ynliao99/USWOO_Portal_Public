<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from "vue";
import {
  ElForm,
  ElMessage,
  FormInstance,
  FormRules,
  ElAutocomplete,
  AutocompleteFetchSuggestionsCallback
} from "element-plus";
import { message } from "@/utils/message"; // Use project's message util
import {
  useCustomerRecords,
  CustomerRecord,
  CreateOrUpdateCustomerRecord,
  BuildingInfo,
  UploadedFileInfo
} from "./utils/useCustomerRecords";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import IframeDialog, {
  IframeDialogProps
} from "@/components/IframeDialog/Iframe.vue"; // 导入 IframeDialog
import { getToken } from "@/utils/auth";
// Icons
import EditIcon from "~icons/ri/edit-circle-line";
import AddIcon from "~icons/ri/add-circle-line";
import SearchIcon from "~icons/ri/search-line";
import FilterIcon from "~icons/ri/filter-3-line";
import CopyIcon from "~icons/ri/file-copy-line";
import LinkIcon from "~icons/ri/link";
import EyeIcon from "~icons/ri/eye-line";
import DeleteBinIcon from "~icons/ri/delete-bin-7-line"; // Void icon
import CheckIcon from "~icons/ri/check-line";
import ExternalLinkIcon from "~icons/ri/external-link-line"; // For CRM link

// Define component name (optional but good practice)
defineOptions({
  name: "CustomerOperations" // Changed name for clarity
});

// --- Refs and State ---
const tableRef = ref(); // Ref for the pure-table component
const formRef = ref<FormInstance>(); // Ref for the Add/Edit form
const filterFormRef = ref<FormInstance>(); // Ref for the Filter form

// Destructure from the hook
const {
  paginatedRecords,
  loading,
  pagination,
  searchTerm,
  onlyMine,
  columns,
  buildings, // Building list from hook
  statusMap,
  statusList,
  availableFiles,
  fetchRecords,
  currentUserAgentId,
  statusFilter,
  saveRecord,
  voidRecord, // Get void function
  setSearchTerm,
  setSort,
  setStatusFilter, // Get status filter function
  toggleOnlyMine,
  setPage,
  setPageSize
} = useCustomerRecords();

// Local state for UI elements
const searchTermLocal = ref(searchTerm.value); // Local copy for input v-model
const dialogVisible = ref(false); // Add/Edit dialog visibility
const filterDialogVisible = ref(false); // Filter dialog visibility
const dialogTitle = ref(""); // Title for Add/Edit dialog
const isEditMode = ref(false); // To track if the dialog is for editing
const tokenInfo = getToken();
const authToken = tokenInfo?.accessToken || "";

// Form data model (using Partial for flexibility, ensure all fields exist)
const form = ref<
  Partial<
    Omit<CreateOrUpdateCustomerRecord, "uploaded_files"> & {
      uploaded_files?: string | null;
      uuid?: string;
    } & Record<string, string | number | boolean | null | "TBD">
  >
>({});

// Filter form data model
const filterForm = ref<{ status: number[] }>({ status: [] });

// --- NEW: Reactive state for Checkbox Group v-model ---
const selectedFileNames = ref<string[]>([]); // Holds ["Passport", "Visa", ...]

// --- NEW: Helper to safely parse the JSON string ---
function parseFilesString(
  jsonString: string | null | undefined
): UploadedFileInfo[] {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    // Basic validation that it's an array
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to parse uploaded_files JSON:", e);
    return []; // Return empty array on error
  }
}

// --- Iframe Dialog Refs ---
const iframeDialog = ref(); // 用于引用 IframeDialog 组件实例

// Iframe Dialog 的配置选项
const iframeDialogOptions = ref<Partial<IframeDialogProps> & { url: string }>({
  url: "", // URL 将动态设置
  title: "快速录单" // 默认标题，会被覆盖
});

const customerFormRules = reactive<FormRules>({
  community_name: [
    { required: true, message: "请选择或输入公寓名称", trigger: "change" }
  ],
  buildingId: [
    { required: true, message: "必须选择一个有效的公寓", trigger: "blur" }
  ], // Ensure buildingId is set
  address: [{ required: true, message: "请输入地址", trigger: "blur" }],
  unit: [{ required: true, message: "请输入Unit", trigger: "blur" }],
  rent: [{ required: true, message: "请输入房租", trigger: "blur" }],
  // concession: [{ required: true, message: "请输入优惠信息", trigger: "blur" }], // Make required if necessary
  broker_fee: [
    { required: true, message: "请输入客户中介费", trigger: "blur" }
  ],
  ll_broker_fee: [
    { required: true, message: "请输入公寓中介费", trigger: "blur" }
  ],
  term: [{ required: true, message: "请输入租期", trigger: "blur" }],
  move_in_date: [
    { required: true, message: "请选择开始日期", trigger: "change" }
  ],
  move_out_date: [
    { required: true, message: "请选择结束日期", trigger: "change" }
  ],
  last_name: [{ required: true, message: "请输入姓", trigger: "blur" }],
  first_name: [{ required: true, message: "请输入名", trigger: "blur" }],
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    {
      type: "email",
      message: "请输入有效的邮箱地址",
      trigger: ["blur", "change"]
    }
  ],
  uploaded_files: [
    {
      validator: (rule, value, callback) => {
        // If not fileOnly mode, require at least 'Other' or another file? Adjust as needed.
        // Example: Require selection only if not fileOnly
        // if (!form.value.file_only && (!value || value.length === 0)) {
        //   callback(new Error('请至少选择一个文件类型'));
        // } else {
        //   callback();
        // }
        callback(); // Default: Files are optional unless specified
      },
      trigger: "change"
    }
  ]
  // Add rules for other fields as needed
});

// --- Methods ---

// Debounced search handler
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
function debounceSearch(value: string) {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(() => {
    setSearchTerm(value);
  }, 300); // 300ms delay
}

// Open Add/Edit Dialog
function openDialog(mode: "add" | "edit", record?: CustomerRecord) {
  // Reset form validation and TBD states before populating
  formRef.value?.resetFields();
  form.value = {}; // Clear previous data
  selectedFileNames.value = []; // Reset checkbox state
  const defaultFilesJson = '[{"file_name":"Other","path":""}]';

  if (mode === "add") {
    isEditMode.value = false;
    dialogTitle.value = "发起新请求";
    // Initialize form with defaults for 'add' mode
    form.value = {
      id: null,
      community_name: "",
      buildingId: "",
      address: "",
      unit: "",
      rent: "",
      concession: "",
      broker_fee: "",
      ll_broker_fee: "",
      term: "",
      move_in_date: "",
      move_out_date: "",
      waitlist: "",
      last_name: "",
      first_name: "",
      email: "",
      uploaded_files: defaultFilesJson,
      file_only: false
    };
    selectedFileNames.value = ["Other"];
  } else if (mode === "edit" && record) {
    isEditMode.value = true;
    dialogTitle.value = "编辑请求信息";
    // Map CustomerRecord to CreateOrUpdateCustomerRecord for the form
    let initialJsonString = defaultFilesJson; // Fallback default
    // Use fetched string if valid, otherwise keep default
    if (
      typeof record.uploaded_files === "string" &&
      record.uploaded_files.trim().startsWith("[")
    ) {
      initialJsonString = record.uploaded_files;
    } else if (Array.isArray(record.uploaded_files)) {
      // If hook already parsed it, stringify back (less ideal)
      initialJsonString = JSON.stringify(record.uploaded_files);
    }
    // Parse the initial JSON to set checkbox state
    const initialFiles = parseFilesString(initialJsonString);
    selectedFileNames.value = initialFiles.map(f => f.file_name);

    form.value = {
      id: record.id,
      community_name: record.community_name || "",
      buildingId: record.buildingId || "",
      address: record.address || "",
      unit: record.unit || "",
      rent: record.rent || "",
      concession: record.concession || "",
      broker_fee: record.broker_fee || "",
      ll_broker_fee: record.ll_broker_fee || "",
      term: record.term || "",
      move_in_date: record.move_in_date || "",
      move_out_date: record.move_out_date || "",
      waitlist: record.waitlist || "",
      last_name: record.last_name || "",
      first_name: record.first_name || "",
      email: record.email || "",
      // Parse uploaded_files: Expecting UploadedFileInfo[] from hook's processed data
      uploaded_files: initialJsonString, // Default if parsing failed or empty
      // uploaded_files: Array.isArray(record.uploaded_files)
      //   ? record.uploaded_files.map(f => f.file_name) // Extract names for checkboxes
      //   : [],
      file_only: !!record.file_only // Ensure boolean
    };
    // Handle TBD state based on loaded data
    checkAndSetTbdState();
  }
  dialogVisible.value = true;
}

// --- NEW: Watcher to sync checkboxes and JSON string ---
watch(
  selectedFileNames,
  currentlySelected => {
    // Only run if the dialog is open to avoid unnecessary updates
    if (!dialogVisible.value) return;

    // Get the current JSON string state (the source of truth for paths)
    const currentJsonString = form.value.uploaded_files || "[]";
    const existingFiles = parseFilesString(currentJsonString);
    const existingFileMap = new Map(
      existingFiles.map(f => [f.file_name, f.path])
    );

    // Build the new array based on currently selected checkboxes
    const updatedFilesArray: UploadedFileInfo[] = currentlySelected.map(
      name => ({
        file_name: name,
        // Preserve existing path if the file was already in the JSON, otherwise use ""
        path: existingFileMap.get(name) ?? ""
      })
    );

    // Update the form's JSON string state
    // Add check to prevent infinite loop if stringify results in the same string
    const newJsonString = JSON.stringify(updatedFilesArray);
    if (newJsonString !== form.value.uploaded_files) {
      form.value.uploaded_files = newJsonString;
    }
  },
  { deep: true }
); // deep watch needed for array changes

// Open Filter Dialog
function openFilterDialog() {
  // Load current filter state into the dialog form

  filterForm.value.status = [...statusFilter.value];
  filterDialogVisible.value = true;
}

// Apply Filters from Dialog
function applyFilters() {
  setStatusFilter(filterForm.value.status);
  filterDialogVisible.value = false;
}

// Reset Filters in Dialog
function resetFilters() {
  filterForm.value.status = [];
}

// Handle Form Submission
async function handleSubmit() {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    // If validation passes, proceed to save
    handleSave();
  } catch (error) {
    // Validation failed
    console.log("Validation Error:", error);
    message("请检查表单，填写所有必填项。", { type: "warning" });
  }
}

// Handle Save Logic (called after validation)
async function handleSave() {
  // Prepare data, potentially converting TBD back if needed, although saving 'TBD' is fine
  const payload = { ...form.value } as unknown as CreateOrUpdateCustomerRecord;

  // Ensure buildingId is set if community_name exists
  if (payload.community_name && !payload.buildingId) {
    message("请从列表中选择一个有效的公寓。", { type: "warning" });
    return;
  }

  // Convert file_only to boolean if it's somehow not
  payload.file_only = !!payload.file_only;

  const success = await saveRecord(payload);
  if (success) {
    dialogVisible.value = false; // Close dialog on successful save
  }
  // If saveRecord fails, dialog remains open for correction
}

// Handle Apartment Autocomplete Search
const queryApartmentSearch = (
  queryString: string,
  cb: AutocompleteFetchSuggestionsCallback
) => {
  const results = queryString
    ? buildings.value.filter(createFilter(queryString))
    : buildings.value; // Show all if empty query? Or limit.
  cb(results);
};

// Filter logic for autocomplete
const createFilter = (queryString: string) => {
  return (restaurant: BuildingInfo) => {
    return (
      restaurant.name.toLowerCase().indexOf(queryString.toLowerCase()) === 0
    );
  };
};

// Handle Apartment Selection from Autocomplete
const handleApartmentSelect = (item: BuildingInfo) => {
  form.value.community_name = item.name;
  form.value.buildingId = item.id;
  // Auto-fill address based on selection (like legacy)
  form.value.address =
    `${item.address || ""}, ${item.city || ""}, ${item.state || ""} ${item.postcode || ""}`
      .replace(/^, |, $/g, "")
      .replace(/, ,/g, ","); // Basic formatting
};

// Handle Apartment Input Blur (Clear address if name is cleared)
const handleApartmentBlur = () => {
  // If name is empty or doesn't match a known buildingId, clear related fields
  if (!form.value.community_name || !form.value.buildingId) {
    form.value.community_name = "";
    form.value.buildingId = "";
    form.value.address = ""; // Clear address if name is invalid/cleared
  } else {
    // Optional: Verify if current community_name still matches buildingId
    const matchingBuilding = buildings.value.find(
      b => b.id === form.value.buildingId
    );
    if (
      !matchingBuilding ||
      matchingBuilding.name !== form.value.community_name
    ) {
      // Mismatch, potentially clear or prompt user
      // form.value.buildingId = ""; // Clear ID if name changed manually
    }
  }
};

// TBD Logic: Add helper functions or use watchers
function handleTbdChange(
  field: keyof CreateOrUpdateCustomerRecord,
  isTbd: boolean
) {
  if (!form.value) return;

  // Use a safe key type for indexing
  const key = field as keyof typeof form.value;

  if (isTbd) {
    // Set the value to 'TBD'
    (form.value as any)[key] = "TBD"; // Using 'as any' as discussed before

    // --- ADD THIS LINE ---
    // Manually clear the validation message for the specific field
    // Pass the field name (key) to clearValidate
    formRef.value?.clearValidate(field as string | string[]);
    // --------------------
  } else {
    // If unchecking TBD, clear the field ONLY if it was 'TBD'
    if (form.value[key] === "TBD") {
      (form.value as any)[key] = "";
    }
    // Optional: If you want the validation to re-run immediately
    // when unchecking and the field might be required, you could add:
    // formRef.value?.validateField(field as string | string[]);
  }
}

// Helper to check initial TBD state when loading edit form
function checkAndSetTbdState() {
  const tbdFields: (keyof CreateOrUpdateCustomerRecord)[] = [
    "unit",
    "concession",
    "broker_fee",
    "ll_broker_fee",
    "term",
    "rent"
  ];
  tbdFields.forEach(field => {
    if (form.value[field] === "TBD") {
      // Set a corresponding boolean flag if needed for the checkbox v-model
      // Example: form.value[`${field}IsTbd`] = true;
      // Or just rely on checking form.value[field] === 'TBD' in the template
    }
  });
}

// --- Table Event Handlers ---
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

// --- Action Handlers ---
function handleCopyLink(link: string) {
  navigator.clipboard
    .writeText(link)
    .then(() => {
      ElMessage.success("链接已复制到剪贴板！");
    })
    .catch(err => {
      console.error("Copy failed:", err);
      ElMessage.error("复制失败");
    });
}

function handleVoidRecord(uuid: string) {
  voidRecord(uuid); // Call the void function from the hook
}

function handleCrmRedirect(rowData: CustomerRecord) {
  const token = getToken(); // Assuming you have a function to get the token
  // 1. 构造 URL - 这部分逻辑保持不变
  const params = new URLSearchParams();
  params.append("buildingName", rowData.community_name || "");
  params.append("buildingId", rowData.buildingId || "");
  params.append("address", rowData.address || "");
  params.append("unit", rowData.unit || "");
  params.append("rent", rowData.rent || "");
  params.append("concession", rowData.concession || "");
  params.append("broker_fee", rowData.broker_fee || "");
  params.append("ll_broker_fee", rowData.ll_broker_fee || "");
  params.append("term", rowData.term || "");
  params.append("move_in_date", rowData.move_in_date || "");
  params.append("move_out_date", rowData.move_out_date || "");
  params.append("last_name", rowData.last_name || "");
  params.append("first_name", rowData.first_name || "");
  params.append("email", rowData.email || "");

  // Add other fields as needed by the CRM page

  // 确认 CRM 页面的基础 URL 是否正确
  const crmUrl = `https://bos.uswoo.com/createOrder/?token=${token.accessToken}&${params.toString()}`;

  // --- 修改开始 ---
  // 2. 不再使用 window.open，而是更新 iframe 对话框的选项
  iframeDialogOptions.value = {
    ...iframeDialogOptions.value, // 保留其他可能存在的默认选项
    url: crmUrl, // 设置要加载的 URL
    title: `CRM 录单 - ${rowData.first_name} ${rowData.last_name}` // 设置一个动态的标题
  };

  // 3. 调用 IframeDialog 组件实例上的 open() 方法来显示对话框
  //    (假设 IframeDialog 组件通过 defineExpose 暴露了 open 方法)
  //    使用可选链 ?. 确保 iframeDialog.value 存在
  if (iframeDialog.value && typeof iframeDialog.value.open === "function") {
    iframeDialog.value.open();
  } else {
    console.error("IframeDialog reference or open method is not available.");
    // 可以给用户一个提示，说明无法打开对话框
    message("无法打开 CRM 录单窗口。", { type: "error" });
  }
  // --- 修改结束 ---
}

// --- Lifecycle Hooks ---
onMounted(() => {
  // fetchRecords() and fetchBuildings() are called inside the hook's onMounted
});

// Watch for changes in the search input
watch(searchTermLocal, newValue => {
  debounceSearch(newValue);
});
</script>

<template>
  <div class="app-container">
    <PureTableBar
      title="客户资料管理"
      :columns="columns"
      :show-column-setting="true"
      @refresh="fetchRecords"
    >
      <template #buttons>
        <el-input
          v-model="searchTermLocal"
          placeholder="全能搜索..."
          clearable
          style="width: 200px; margin-right: 16px"
          :prefix-icon="useRenderIcon(SearchIcon)"
        />
        <el-button
          type="primary"
          :icon="useRenderIcon(FilterIcon)"
          style="margin-right: 16px"
          @click="openFilterDialog"
        >
          筛选
        </el-button>
        <el-checkbox
          v-model="onlyMine"
          style="margin-right: 16px"
          @change="toggleOnlyMine"
        >
          只看我的
        </el-checkbox>
        <el-button
          type="primary"
          :icon="useRenderIcon(AddIcon)"
          @click="openDialog('add')"
        >
          发起请求
        </el-button>
      </template>

      <template #default="{ size, dynamicColumns }">
        <pure-table
          ref="tableRef"
          row-key="uuid"
          adaptive
          :data="paginatedRecords"
          :columns="dynamicColumns"
          :loading="loading"
          :pagination="pagination"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }"
          stripe
          showOverflowTooltip
          table-layout="auto"
          :size="size"
          class="crm-form"
          @sort-change="handleSortChange"
          @page-size-change="handlePageSizeChange"
          @page-current-change="handlePageChange"
        >
          <template #operation="{ row }: { row: CustomerRecord }">
            <div class="operation-buttons">
              <el-tooltip content="编辑" placement="top">
                <el-button
                  circle
                  size="small"
                  type="primary"
                  :icon="useRenderIcon(EditIcon)"
                  :disabled="row.is_completed === 4"
                  @click="openDialog('edit', row)"
                />
              </el-tooltip>
              <el-tooltip content="查看客户填写的详情" placement="top">
                <el-button
                  v-if="row.is_completed !== 4"
                  circle
                  size="small"
                  type="success"
                  :icon="useRenderIcon(EyeIcon)"
                  tag="a"
                  :href="`https://bos.uswoo.com/application/applicant_view.php?token=${row.uuid}&authToken=${authToken}`"
                  target="_blank"
                />
                <el-button
                  v-else
                  circle
                  size="small"
                  type="success"
                  :icon="useRenderIcon(EyeIcon)"
                  disabled
                />
              </el-tooltip>
              <el-tooltip content="作废" placement="top">
                <el-button
                  circle
                  size="small"
                  type="danger"
                  :icon="useRenderIcon(DeleteBinIcon)"
                  :disabled="row.is_completed === 4"
                  @click="handleVoidRecord(row.uuid)"
                />
              </el-tooltip>
              <el-tooltip content="一键录单 (CRM)" placement="top">
                <el-button
                  circle
                  size="small"
                  class="bg-green-500 hover:bg-green-600"
                  :icon="useRenderIcon(ExternalLinkIcon)"
                  :disabled="row.is_completed === 4"
                  @click="handleCrmRedirect(row)"
                />
              </el-tooltip>
            </div>
          </template>

          <template #clientLink="{ row }">
            <el-tooltip
              v-if="row.is_completed !== 4"
              content="点击复制链接"
              placement="top"
            >
              <el-button
                type="primary"
                link
                :icon="useRenderIcon(CopyIcon)"
                @click="
                  handleCopyLink(
                    `https://bos.uswoo.com/application/applicant.php?token=${row.uuid}`
                  )
                "
              >
                复制
              </el-button>
            </el-tooltip>
            <span v-else> - </span>
          </template>

          <template #status="{ row }">
            <el-tag
              :type="
                row.is_completed === 0
                  ? 'warning'
                  : row.is_completed === 1
                    ? 'primary'
                    : row.is_completed === 2
                      ? 'success'
                      : row.is_completed === 4
                        ? 'info'
                        : 'info'
              "
              disable-transitions
            >
              <template v-if="row.is_completed === 2">
                <el-icon>
                  <IconifyIconOffline :icon="CheckIcon" />
                </el-icon>
              </template>
              {{ statusMap[row.is_completed ?? -1] ?? "未知" }}
            </el-tag>
          </template>

          <template #files="{ row }: { row: CustomerRecord }">
            <div
              v-if="
                Array.isArray(row.uploaded_files) &&
                row.uploaded_files.length > 0 &&
                row.is_completed !== 4
              "
            >
              <span
                v-for="(file, index) in row.uploaded_files"
                :key="index"
                class="file-item"
              >
                <el-tooltip
                  :content="file.path ? '点击下载' : '未上传'"
                  placement="top"
                >
                  <a
                    v-if="file.path"
                    :href="`https://bos.uswoo.com/application/download.php?filepath=${encodeURIComponent(file.path)}`"
                    target="_blank"
                    class="file-link"
                  >
                    {{ file.file_name }}
                  </a>
                  <span v-else class="file-name-no-link">{{
                    file.file_name
                  }}</span>
                </el-tooltip>
                <el-divider
                  v-if="index < row.uploaded_files.length - 1"
                  direction="vertical"
                />
              </span>
            </div>
            <span v-else-if="row.is_completed === 4"> - </span>
            <span v-else>无要求</span>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="60%"
      draggable
      destroy-on-close
      class="custom-dialog"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="customerFormRules"
        label-width="120px"
        label-position="right"
        status-icon
      >
        <p class="form-notice">
          未确定项可标记为<b>「TBD」</b>，并向客户解释。
        </p>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="公寓名称" prop="community_name">
              <el-autocomplete
                v-model="form.community_name"
                :fetch-suggestions="queryApartmentSearch"
                placeholder="搜索或选择公寓..."
                clearable
                style="width: 100%"
                value-key="name"
                @select="handleApartmentSelect"
                @blur="handleApartmentBlur"
              >
                <template #default="{ item }">
                  <div class="autocomplete-item">
                    <span class="name">{{ item.name }}</span>
                    <span class="addr">{{ item.address }}</span>
                  </div>
                </template>
              </el-autocomplete>
              <input v-model="form.buildingId" type="hidden" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="地址" prop="address">
              <el-input
                v-model="form.address"
                placeholder="选择公寓后自动填充"
                readonly
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Unit" prop="unit">
              <el-input
                v-model="form.unit"
                placeholder="Unit #"
                :disabled="form.unit === 'TBD'"
              />
              <el-checkbox
                label="TBD"
                :model-value="form.unit === 'TBD'"
                style="margin-left: 10px"
                @change="(val: boolean) => handleTbdChange('unit', val)"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="租期 (月)" prop="term">
              <el-input
                v-model="form.term"
                placeholder="例如: 12"
                :disabled="form.term === 'TBD'"
              />
              <el-checkbox
                label="TBD"
                :model-value="form.term === 'TBD'"
                style="margin-left: 10px"
                @change="(val: boolean) => handleTbdChange('term', val)"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始日期" prop="move_in_date">
              <el-date-picker
                v-model="form.move_in_date"
                type="date"
                placeholder="选择日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束日期" prop="move_out_date">
              <el-date-picker
                v-model="form.move_out_date"
                type="date"
                placeholder="选择日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">费用与优惠</el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="月租金" prop="rent">
              <el-input
                v-model="form.rent"
                placeholder="无需 $"
                :disabled="form.rent === 'TBD'"
              />
              <el-checkbox
                label="TBD"
                :model-value="form.rent === 'TBD'"
                style="margin-left: 10px"
                @change="(val: boolean) => handleTbdChange('rent', val)"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优惠" prop="concession">
              <el-input
                v-model="form.concession"
                placeholder="客户可享受优惠"
                :disabled="form.concession === 'TBD'"
              />
              <el-checkbox
                label="TBD"
                :model-value="form.concession === 'TBD'"
                style="margin-left: 10px"
                @change="(val: boolean) => handleTbdChange('concession', val)"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户中介费" prop="broker_fee">
              <el-input
                v-model="form.broker_fee"
                placeholder="客户需支付, 无需 $"
                :disabled="form.broker_fee === 'TBD'"
              />
              <el-checkbox
                label="TBD"
                :model-value="form.broker_fee === 'TBD'"
                style="margin-left: 10px"
                @change="(val: boolean) => handleTbdChange('broker_fee', val)"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="公寓中介费" prop="ll_broker_fee">
              <el-input
                v-model="form.ll_broker_fee"
                placeholder="公寓支付, 无需 $"
                :disabled="form.ll_broker_fee === 'TBD'"
              />
              <el-checkbox
                label="TBD"
                :model-value="form.ll_broker_fee === 'TBD'"
                style="margin-left: 10px"
                @change="
                  (val: boolean) => handleTbdChange('ll_broker_fee', val)
                "
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">客户信息</el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓 (Last Name)" prop="last_name">
              <el-input v-model="form.last_name" placeholder="Last Name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="名 (First Name)" prop="first_name">
              <el-input v-model="form.first_name" placeholder="First Name" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="Email" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">所需文件</el-divider>

        <el-form-item label="">
          <el-checkbox v-model="form.file_only">
            仅上传文件 (客户无需填写其他信息)
          </el-checkbox>
        </el-form-item>

        <el-form-item label="勾选所需文件" prop="uploaded_files">
          <el-checkbox-group v-model="selectedFileNames">
            <el-checkbox
              v-for="file in availableFiles"
              :key="file"
              :label="file"
              :disabled="
                file === 'Other' && selectedFileNames.includes('Other')
              "
            >
              {{ file.replace("_", " ") }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-divider content-position="left">其他</el-divider>

        <el-form-item label="Waitlist" prop="waitlist">
          <el-input
            v-model="form.waitlist"
            type="textarea"
            placeholder="如客户排Waitlist，可将其他公寓名称写在这里"
            :rows="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">关 闭</el-button>
        <el-button type="primary" :loading="loading" @click="handleSubmit">
          {{ isEditMode ? "保 存" : "提 交" }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="filterDialogVisible"
      title="筛选条件"
      width="400px"
      draggable
    >
      <el-form ref="filterFormRef" :model="filterForm" label-position="top">
        <el-form-item label="状态">
          <el-checkbox-group v-model="filterForm.status">
            <el-checkbox
              v-for="status in statusList"
              :key="status.value"
              :label="status.value"
            >
              {{ status.text }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetFilters">重 置</el-button>
        <el-button type="primary" @click="applyFilters">应 用</el-button>
        <el-button @click="filterDialogVisible = false">取 消</el-button>
      </template>
    </el-dialog>
    <IframeDialog ref="iframeDialog" v-bind="iframeDialogOptions" />
  </div>
</template>

<style lang="scss">


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

.operation-buttons {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;

  /* Prevent wrapping */
  justify-content: flex-start;
}

.crm-form .el-button + .el-button {
  margin-left: 0;

  /* Override default margin if needed */
}

/* Ensure tooltips on circle buttons work well */
.el-button.is-circle {
  padding: 8px;
}

/* Style for autocomplete dropdown */
.autocomplete-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 0;
  line-height: normal;

  /* Adjust padding */

  .name {
    margin-right: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 14px;
    color: var(--el-text-color-regular);
  }

  .addr {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;

    /* Prevent address wrapping */
  }
}

/* Form notice style */
.form-notice {
  margin-bottom: 15px;
  margin-left: 10px;
  font-size: 13px;
  color: var(--el-text-color-secondary);

  /* Align slightly with form content */
  b {
    color: var(--el-color-primary);
  }
}

.el-form {
  width: 95%;
}

.file-link {
  color: var(--el-color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.file-name-no-link {
  color: var(--el-text-color-disabled);

  /* Indicate not uploaded */
}

/* Adjust checkbox group layout */
.el-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;

  /* Spacing between checkboxes */
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

/* 让 el-select 宽度根据文字自动撑开，不做百分百全宽 */
.auto-width-select {
  display: inline-block;
  width: fit-content;

  /* 或者 用 auto */
  min-width: 180px;
  max-width: 100%;

  /* 防止超出容器 */
}

/* 内部 input 也要同步 */
.auto-width-select .el-input__inner {
  width: fit-content !important;

  /* 覆盖默认 100% 宽度 */
  white-space: nowrap;

  /* 文本不换行 */
}
</style>
