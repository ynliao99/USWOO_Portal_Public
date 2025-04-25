<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, reactive } from "vue";
import { ElForm, ElMessage, FormInstance, FormRules, ElAutocomplete, AutocompleteFetchSuggestionsCallback, ElMessageBox } from "element-plus";
import { message } from "@/utils/message"; // Use project's message util
import { useCustomerRecords, CustomerRecord, CreateOrUpdateCustomerRecord, BuildingInfo, UploadedFileInfo, availableFiles, statusMap, statusList } from "./utils/useCustomerRecords";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

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
  saveRecord,
  voidRecord, // Get void function
  setSearchTerm,
  setSort,
  setStatusFilter, // Get status filter function
  toggleOnlyMine,
  setPage,
  setPageSize,
  formatDate // Get format date function
} = useCustomerRecords();

// Local state for UI elements
const searchTermLocal = ref(searchTerm.value); // Local copy for input v-model
const dialogVisible = ref(false); // Add/Edit dialog visibility
const filterDialogVisible = ref(false); // Filter dialog visibility
const dialogTitle = ref(""); // Title for Add/Edit dialog
const isEditMode = ref(false); // To track if the dialog is for editing

// Form data model (using Partial for flexibility, ensure all fields exist)
const form = ref<Partial<CreateOrUpdateCustomerRecord & { uuid?: string }>>({});

// Filter form data model
const filterForm = ref<{ status: number[] }>({ status: [] });

// --- Computed Properties ---
// Check if form has unsaved changes (basic check)
// const hasUnsavedChanges = computed(() => {
//   // Needs a more robust implementation: store initial state and compare
//   return dialogVisible.value; // Placeholder: always true if dialog is open
// });

// Define Form Rules (replace with actual rules from ./utils/rule)
// TODO: Define comprehensive rules in ./utils/rule.ts

const customerFormRules = reactive<FormRules>({
  community_name: [{ required: true, message: "请选择或输入公寓名称", trigger: "change" }],
  buildingId: [{ required: true, message: "必须选择一个有效的公寓", trigger: "blur" }], // Ensure buildingId is set
  address: [{ required: true, message: "请输入地址", trigger: "blur" }],
  unit: [{ required: true, message: "请输入Unit", trigger: "blur" }],
  rent: [{ required: true, message: "请输入房租", trigger: "blur" }],
  // concession: [{ required: true, message: "请输入优惠信息", trigger: "blur" }], // Make required if necessary
  broker_fee: [{ required: true, message: "请输入客户中介费", trigger: "blur" }],
  ll_broker_fee: [{ required: true, message: "请输入公寓中介费", trigger: "blur" }],
  term: [{ required: true, message: "请输入租期", trigger: "blur" }],
  move_in_date: [{ required: true, message: "请选择开始日期", trigger: "change" }],
  move_out_date: [{ required: true, message: "请选择结束日期", trigger: "change" }],
  last_name: [{ required: true, message: "请输入姓", trigger: "blur" }],
  first_name: [{ required: true, message: "请输入名", trigger: "blur" }],
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: ['blur', 'change'] }
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
      trigger: 'change'
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

  if (mode === "add") {
    isEditMode.value = false;
    dialogTitle.value = "发起新请求";
    // Initialize form with defaults for 'add' mode
    form.value = {
      id: null,
      uuid: undefined, // Ensure uuid is not carried over
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
      uploaded_files: ["Other"], // Default selection?
      file_only: false,
    };
  } else if (mode === "edit" && record) {
    isEditMode.value = true;
    dialogTitle.value = "编辑请求信息";
    // Map CustomerRecord to CreateOrUpdateCustomerRecord for the form
    form.value = {
      id: record.id,
      uuid: record.uuid, // Keep UUID for reference/backend update
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
      uploaded_files: Array.isArray(record.uploaded_files)
        ? record.uploaded_files.map(f => f.file_name) // Extract names for checkboxes
        : ["Other"], // Default if parsing failed or empty
      file_only: !!record.file_only, // Ensure boolean
    };
    // Handle TBD state based on loaded data
    checkAndSetTbdState();
  }
  dialogVisible.value = true;
}

// Open Filter Dialog
function openFilterDialog() {
  // Load current filter state into the dialog form
  filterForm.value.status = [...statusList.map(status => status.value)]; // Use statusList values
  filterDialogVisible.value = true;
}

// Apply Filters from Dialog
function applyFilters() {
  setStatusFilter(filterForm.value.status); // Update hook state
  filterDialogVisible.value = false; // Close dialog
}

// Reset Filters in Dialog
function resetFilters() {
  filterForm.value.status = []; // Clear local dialog state
  // Optionally: Apply immediately or wait for 'Apply' button
  // setStatusFilter([]);
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
    console.log('Validation Error:', error);
    message("请检查表单，填写所有必填项。", { type: "warning" });
  }
}

// Handle Save Logic (called after validation)
async function handleSave() {
  // Prepare data, potentially converting TBD back if needed, although saving 'TBD' is fine
  const payload = { ...form.value } as CreateOrUpdateCustomerRecord;

  // Ensure buildingId is set if community_name exists
  if (payload.community_name && !payload.buildingId) {
    message("请从列表中选择一个有效的公寓，以获取其ID。", { type: "warning" });
    return;
  }

  // Convert file_only to boolean if it's somehow not
  payload.file_only = !!payload.file_only;

  // Ensure uploaded_files is an array of strings
  if (!Array.isArray(payload.uploaded_files)) {
    payload.uploaded_files = [];
  }
  // Ensure 'Other' is included if needed? Or handle based on selection.
  // The current setup assumes the checkbox group handles the array correctly.

  const success = await saveRecord(payload);
  if (success) {
    dialogVisible.value = false; // Close dialog on successful save
  }
  // If saveRecord fails, dialog remains open for correction
}


// Handle Apartment Autocomplete Search
const queryApartmentSearch = (queryString: string, cb: AutocompleteFetchSuggestionsCallback) => {
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
  form.value.address = `${item.address || ''}, ${item.city || ''}, ${item.state || ''} ${item.postcode || ''}`.replace(/^, |, $/g, '').replace(/, ,/g, ','); // Basic formatting
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
    const matchingBuilding = buildings.value.find(b => b.id === form.value.buildingId);
    if (!matchingBuilding || matchingBuilding.name !== form.value.community_name) {
      // Mismatch, potentially clear or prompt user
      // form.value.buildingId = ""; // Clear ID if name changed manually
    }
  }
};

// TBD Logic: Add helper functions or use watchers
function handleTbdChange(field: keyof CreateOrUpdateCustomerRecord, isTbd: boolean) {
  const fieldName = field as string;
  if (isTbd) {
    form.value[field] = 'TBD';
    // Find the corresponding input ref and potentially disable it (more complex)
    // Or rely on the :disabled binding in the template
  } else {
    // If unchecking TBD, clear the field if it was 'TBD'
    if (form.value[field] === 'TBD') {
      form.value[field] = '';
    }
    // Enable input via :disabled binding
  }
}

// Helper to check initial TBD state when loading edit form
function checkAndSetTbdState() {
  const tbdFields: (keyof CreateOrUpdateCustomerRecord)[] = ['unit', 'concession', 'broker_fee', 'll_broker_fee', 'term', 'rent'];
  tbdFields.forEach(field => {
    if (form.value[field] === 'TBD') {
      // Set a corresponding boolean flag if needed for the checkbox v-model
      // Example: form.value[`${field}IsTbd`] = true;
      // Or just rely on checking form.value[field] === 'TBD' in the template
    }
  });
}


// --- Table Event Handlers ---
function handleSortChange({ prop, order }: { prop: string; order: string }) {
  setSort(prop, order === "ascending" ? "asc" : order === "descending" ? "desc" : "");
}

function handlePageChange(page: number) {
  setPage(page);
}

function handlePageSizeChange(size: number) {
  setPageSize(size);
}

// --- Action Handlers ---
function handleCopyLink(link: string) {
  navigator.clipboard.writeText(link).then(() => {
    ElMessage.success("链接已复制到剪贴板！");
  }).catch(err => {
    console.error('Copy failed:', err);
    ElMessage.error("复制失败");
  });
}

function handleVoidRecord(uuid: string) {
  voidRecord(uuid); // Call the void function from the hook
}

function handleCrmRedirect(rowData: CustomerRecord) {
  // Prepare data for CRM link (similar to legacy `toUrlParams`)
  const params = new URLSearchParams();
  // Map relevant fields from rowData to CRM expected params
  params.append('buildingName', rowData.community_name || '');
  params.append('buildingId', rowData.buildingId || '');
  params.append('address', rowData.address || '');
  params.append('unit', rowData.unit || '');
  params.append('rent', rowData.rent || '');
  params.append('concession', rowData.concession || '');
  params.append('broker_fee', rowData.broker_fee || '');
  params.append('ll_broker_fee', rowData.ll_broker_fee || '');
  params.append('term', rowData.term || '');
  params.append('move_in_date', rowData.move_in_date || '');
  params.append('move_out_date', rowData.move_out_date || '');
  params.append('last_name', rowData.last_name || '');
  params.append('first_name', rowData.first_name || '');
  params.append('email', rowData.email || '');
  // uploaded_files might need special handling depending on what CRM expects
  if (Array.isArray(rowData.uploaded_files)) {
    rowData.uploaded_files.forEach(file => params.append('uploaded_files[]', file.file_name));
  }
  params.append('fileOnly', rowData.file_only ? '1' : '0');
  params.append('waitlist', rowData.waitlist || '');
  // Add other fields as needed by the CRM page

  // Construct the URL and open in a new tab
  const crmUrl = `/agent/crm/createOrder/?${params.toString()}`; // Adjust base URL if needed
  window.open(crmUrl, '_blank');
}

// --- Lifecycle Hooks ---
onMounted(() => {
  // fetchRecords() and fetchBuildings() are called inside the hook's onMounted
});

// Watch for changes in the search input
watch(searchTermLocal, (newValue) => {
  debounceSearch(newValue);
});

</script>

<template>
  <div class="app-container">
    <PureTableBar title="客户资料管理" :columns="columns" :show-column-setting="true" @refresh="fetchRecords">
      <template #buttons>
        <el-input v-model="searchTermLocal" placeholder="全能搜索..." clearable style="width: 200px; margin-right: 16px;"
          :prefix-icon="useRenderIcon(SearchIcon)" />
        <el-button type="primary" :icon="useRenderIcon(FilterIcon)" style="margin-right: 16px"
          @click="openFilterDialog">
          筛选
        </el-button>
        <el-checkbox v-model="onlyMine" style="margin-right: 16px" @change="toggleOnlyMine">
          只看我的
        </el-checkbox>
        <el-button type="primary" :icon="useRenderIcon(AddIcon)" @click="openDialog('add')">
          发起请求
        </el-button>
      </template>

      <template #default="{ size, dynamicColumns }">
        <pure-table ref="tableRef" row-key="uuid" adaptive :data="paginatedRecords" :columns="dynamicColumns"
          :loading="loading" :pagination="pagination"
          :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }"
          stripe showOverflowTooltip table-layout="auto" :size="size" @sort-change="handleSortChange"
          @page-size-change="handlePageSizeChange" @page-current-change="handlePageChange" class="crm-form">

          <template #operation="{ row }: { row: CustomerRecord }">
            <div class="operation-buttons">
              <el-tooltip content="编辑" placement="top">
                <el-button circle size="small" type="primary" :icon="useRenderIcon(EditIcon)"
                  @click="openDialog('edit', row)" :disabled="row.is_completed === 4" />
              </el-tooltip>
              <el-tooltip content="查看客户填写页面" placement="top">
                <el-button circle size="small" type="success" :icon="useRenderIcon(EyeIcon)"
                  :disabled="row.is_completed === 4" tag="a" :href="`/application/applicant_view.php?token=${row.uuid}`"
                  target="_blank" />
              </el-tooltip>
              <el-tooltip content="作废" placement="top">
                <el-button circle size="small" type="danger" :icon="useRenderIcon(DeleteBinIcon)"
                  @click="handleVoidRecord(row.uuid)" :disabled="row.is_completed === 4" />
              </el-tooltip>
              <el-tooltip content="一键录单 (CRM)" placement="top">
                <el-button circle size="small" class="bg-green-500 hover:bg-green-600"
                  :icon="useRenderIcon(ExternalLinkIcon)" @click="handleCrmRedirect(row)"
                  :disabled="row.is_completed === 4" />
              </el-tooltip>
            </div>
          </template>

          <template #clientLink="{ row }">
            <el-tooltip content="点击复制链接" placement="top" v-if="row.is_completed !== 4">
              <el-button type="primary" link :icon="useRenderIcon(CopyIcon)"
                @click="handleCopyLink(`https://portal.uswoo.cn/application/applicant.php?token=${row.uuid}`)">
                复制
              </el-button>
            </el-tooltip>
            <span v-else> - </span>
          </template>

          <template #status="{ row }">
            <el-tag
              :type="row.is_completed === 0 ? 'warning' : row.is_completed === 1 ? 'primary' : row.is_completed === 2 ? 'success' : row.is_completed === 4 ? 'info' : 'info'"
              disable-transitions>
              <template v-if="row.is_completed === 2">
                <el-icon>
                  <IconifyIconOffline :icon="CheckIcon" />
                </el-icon>
              </template>
              {{ statusMap[row.is_completed ?? -1] ?? '未知' }}
            </el-tag>
          </template>

          <template #files="{ row }: { row: CustomerRecord }">
            <div v-if="Array.isArray(row.uploaded_files) && row.uploaded_files.length > 0 && row.is_completed !== 4">
              <span v-for="(file, index) in row.uploaded_files" :key="index" class="file-item">
                <el-tooltip :content="file.path ? '点击下载' : '未上传'" placement="top">
                  <a v-if="file.path" :href="`/application/download.php?filepath=${encodeURIComponent(file.path)}`"
                    target="_blank" class="file-link">
                    {{ file.file_name }}
                  </a>
                  <span v-else class="file-name-no-link">{{ file.file_name }}</span>
                </el-tooltip>
                <el-divider direction="vertical" v-if="index < row.uploaded_files.length - 1" />
              </span>
            </div>
            <span v-else-if="row.is_completed === 4"> - </span>
            <span v-else>无要求</span>
          </template>

        </pure-table>
      </template>
    </PureTableBar>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="60%" draggable destroy-on-close
      class="custom-dialog">
      <el-form ref="formRef" :model="form" :rules="customerFormRules" label-width="120px" label-position="right"
        status-icon>
        <p class="form-notice">未确定项可标记为<b>「TBD」</b>，并向客户解释。</p>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="公寓名称" prop="community_name">
              <el-autocomplete v-model="form.community_name" :fetch-suggestions="queryApartmentSearch"
                placeholder="搜索或选择公寓..." clearable style="width: 100%;" @select="handleApartmentSelect"
                @blur="handleApartmentBlur" value-key="name">
                <template #default="{ item }: { item: BuildingInfo }">
                  <div class="autocomplete-item">
                    <span class="name">{{ item.name }}</span>
                    <span class="addr">{{ item.address }}</span>
                  </div>
                </template>
              </el-autocomplete>
              <input type="hidden" v-model="form.buildingId" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="地址" prop="address">
              <el-input v-model="form.address" placeholder="选择公寓后自动填充或手动输入" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Unit" prop="unit">
              <el-input v-model="form.unit" placeholder="Unit #" :disabled="form.unit === 'TBD'" />
              <el-checkbox label="TBD" :model-value="form.unit === 'TBD'"
                @change="(val: boolean) => handleTbdChange('unit', val)" style="margin-left: 10px;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="租期 (月)" prop="term">
              <el-input v-model="form.term" placeholder="例如: 12" :disabled="form.term === 'TBD'" />
              <el-checkbox label="TBD" :model-value="form.term === 'TBD'"
                @change="(val: boolean) => handleTbdChange('term', val)" style="margin-left: 10px;" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始日期" prop="move_in_date">
              <el-date-picker v-model="form.move_in_date" type="date" placeholder="选择日期" format="YYYY-MM-DD"
                value-format="YYYY-MM-DD" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束日期" prop="move_out_date">
              <el-date-picker v-model="form.move_out_date" type="date" placeholder="选择日期" format="YYYY-MM-DD"
                value-format="YYYY-MM-DD" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">费用与优惠</el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="月租金" prop="rent">
              <el-input v-model="form.rent" placeholder="无需 $" :disabled="form.rent === 'TBD'" />
              <el-checkbox label="TBD" :model-value="form.rent === 'TBD'"
                @change="(val: boolean) => handleTbdChange('rent', val)" style="margin-left: 10px;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优惠" prop="concession">
              <el-input v-model="form.concession" placeholder="客户可享受优惠" :disabled="form.concession === 'TBD'" />
              <el-checkbox label="TBD" :model-value="form.concession === 'TBD'"
                @change="(val: boolean) => handleTbdChange('concession', val)" style="margin-left: 10px;" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户中介费" prop="broker_fee">
              <el-input v-model="form.broker_fee" placeholder="客户需支付, 无需 $" :disabled="form.broker_fee === 'TBD'" />
              <el-checkbox label="TBD" :model-value="form.broker_fee === 'TBD'"
                @change="(val: boolean) => handleTbdChange('broker_fee', val)" style="margin-left: 10px;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="公寓中介费" prop="ll_broker_fee">
              <el-input v-model="form.ll_broker_fee" placeholder="公寓支付, 无需 $"
                :disabled="form.ll_broker_fee === 'TBD'" />
              <el-checkbox label="TBD" :model-value="form.ll_broker_fee === 'TBD'"
                @change="(val: boolean) => handleTbdChange('ll_broker_fee', val)" style="margin-left: 10px;" />
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

        <el-form-item label="" label-width="0px"> <el-checkbox v-model="form.file_only" style="margin-right: 20px;">
            仅上传文件 (客户无需填写其他信息)
          </el-checkbox>
        </el-form-item>

        <el-form-item label="勾选所需文件" prop="uploaded_files">
          <el-checkbox-group v-model="form.uploaded_files">
            <el-checkbox v-for="file in availableFiles" :key="file" :label="file" :disabled="file === 'Other'">
              {{ file.replace('_', ' ') }} </el-checkbox>
          </el-checkbox-group>
        </el-form-item>


        <el-divider content-position="left">其他</el-divider>

        <el-form-item label="Waitlist" prop="waitlist">
          <el-input type="textarea" v-model="form.waitlist" placeholder="如客户排Waitlist，可将其他公寓名称写在这里" :rows="2" />
        </el-form-item>

      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">关 闭</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading">
          {{ isEditMode ? '保 存' : '提 交' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="filterDialogVisible" title="筛选条件" width="400px" draggable>
      <el-form ref="filterFormRef" :model="filterForm" label-position="top">
        <el-form-item label="状态">
          <el-checkbox-group v-model="filterForm.status">
            <el-checkbox v-for="status in statusList" :key="status.value" :label="status.value">
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

  </div>
</template>

<style lang="scss">

.operation-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: nowrap;
  /* Prevent wrapping */
  justify-content: flex-start;
}

.crm-form .el-button+.el-button {
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
  justify-content: space-between;
  align-items: center;
  line-height: normal;
  padding: 7px 0;
  /* Adjust padding */

  .name {
    text-overflow: ellipsis;
    overflow: hidden;
    margin-right: 10px;
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
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin-bottom: 15px;
  margin-left: 10px;

  /* Align slightly with form content */
  b {
    color: var(--el-color-primary);
  }
}


.el-form{
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