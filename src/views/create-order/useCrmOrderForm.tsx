import { ref, reactive, onMounted, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { http } from "@/utils/http"; // Assuming your http utility path
import { ElMessage } from "element-plus"; // Or your project's message utility

// --- Interfaces ---
interface Agent {
  id: string | number;
  name: string;
}

interface Building {
  id: string | number;
  label: string; // For display (name)
  value: string | number; // For storing ID
  name: string; // Original name
}

interface License {
  id: string | number;
  name: string;
}

interface ClientResources {
  sources: string[];
  school_branch_boston: string[];
  life_stage: string[];
  payment_method_branch_boston: string[];
  grade: string[];
  package: string[];
}

interface OrderFormData {
  multiAgent: "0" | "1";
  agentIds: (string | number)[];
  // For building autocomplete, store both label (name) and value (id)
  buildingName?: string; // Name displayed/searched
  buildingId?: string | number | null; // Actual ID selected
  apt: string;
  amountRent: number | null;
  bedBath: string;
  dtLeaseStart: string; // YYYY-MM-DD
  dtLeaseEnd: string; // YYYY-MM-DD
  totalTenants: number | null;
  brokerLicenseId: string | number | null;
  memo: string;
}

interface ClientFormData {
  dtDeal: string; // YYYY-MM-DD
  name: string;
  commBuilding: "0" | "1"; // Radio button value
  amountCommBuilding: number | null;
  commCyof: "0" | "1"; // Radio button value
  amountCommCyof: number | null;
  rebate: string;
  weChat: string;
  email: string;
  school: string;
  lifeStage: string;
  gender: "Male" | "Female" | "";
  sources: string;
  paymentMethod: string;
  grade: string;
  package: string;
  dob: string; // YYYY-MM-DD or empty
  tel: string;
  referral: string;
  memo: string;
}

// API Response Payloads (simplified)
interface OrderApiResponse {
  status: number;
  rentOrder?: { id: string | number };
  message?: string;
}

interface ClientApiResponse {
  status: number;
  message?: string;
  // Add other relevant fields if needed
}

// --- Hook ---
export function useCrmOrderForm() {
  const route = useRoute();
  const isLoadingInitialData = ref(true);
  const isSubmittingOrder = ref(false);
  const isSubmittingClient = ref(false);
  const finalStatus = ref<"idle" | "success" | "error">("idle");
  const errorMessage = ref<string | null>(null);

  // Dropdown/Autocomplete Options
  const agents = ref<Agent[]>([]);
  const buildings = ref<Building[]>([]);
  const licenses = ref<License[]>([]);
  const clientResources = ref<ClientResources | null>(null);

  // Form Step Data Models
  const orderFormData = reactive<OrderFormData>({
    multiAgent: "0",
    agentIds: [],
    buildingName: "",
    buildingId: null,
    apt: "",
    amountRent: null,
    bedBath: "",
    dtLeaseStart: "",
    dtLeaseEnd: "",
    totalTenants: null,
    brokerLicenseId: null,
    memo: ""
  });

  const clientFormData = reactive<ClientFormData>({
    dtDeal: "",
    name: "",
    commBuilding: "0",
    amountCommBuilding: null,
    commCyof: "0",
    amountCommCyof: null,
    rebate: "",
    weChat: "",
    email: "",
    school: "",
    lifeStage: "",
    gender: "",
    sources: "",
    paymentMethod: "",
    grade: "",
    package: "",
    dob: "",
    tel: "",
    referral: "",
    memo: ""
  });

  const rentOrderId = ref<string | number | null>(null); // Stored after step 1 success

  // --- Computed Values ---
  const totalCommission = computed(() => {
    const llComm = Number(clientFormData.amountCommBuilding) || 0;
    const ttComm = Number(clientFormData.amountCommCyof) || 0;
    return (llComm + ttComm).toFixed(2);
  });

  // --- Functions ---

  // Fetch initial dropdown/autocomplete data
  const fetchInitialData = async () => {
    isLoadingInitialData.value = true;
    try {
      // Fetch Order resources (agents, buildings, licenses)
      const orderRes = await http.request<{
        agents: { content: Agent[] };
        buildings: { content: Building[] };
        licenses: { content: License[] };
      }>("get", "/portalapi/crm/hrm_get_order_list.php");
      agents.value = orderRes.agents.content || [];
      buildings.value = (orderRes.buildings.content || []).map(b => ({
        ...b,
        label: b.name,
        value: b.id
      })); // Map for autocomplete
      licenses.value = orderRes.licenses.content || [];

      // Fetch Client resources
      const clientRes = await http.request<ClientResources>(
        "get",
        "/portalapi/crm/hrm_get_client_res.php"
      );
      clientResources.value = clientRes;

      // Once data is fetched, prefill form from URL params
      prefillFromUrlParams();
    } catch (error) {
      console.error("Failed to fetch initial CRM data:", error);
      ElMessage.error("加载初始数据失败，请稍后重试。");
      // Handle error state appropriately
    } finally {
      isLoadingInitialData.value = false;
    }
  };

  // Prefill form based on URL query parameters
  const prefillFromUrlParams = () => {
    const params = route.query;

    // Prefill Order Form
    const buildingNameParam = params.buildingName || params.community_name;
    if (typeof buildingNameParam === "string" && buildings.value.length > 0) {
      const matchedBuilding = buildings.value.find(
        b => b.label === buildingNameParam
      );
      if (matchedBuilding) {
        orderFormData.buildingName = matchedBuilding.label;
        orderFormData.buildingId = matchedBuilding.value;
      } else {
        orderFormData.buildingName = buildingNameParam; // Keep name, ID is null
        console.warn("Prefill: Building not found in list:", buildingNameParam);
      }
    }
    if (typeof params.unit === "string") orderFormData.apt = params.unit;
    if (typeof params.rent === "string" && !isNaN(parseFloat(params.rent)))
      orderFormData.amountRent = parseFloat(params.rent);
    if (typeof params.move_in_date === "string")
      orderFormData.dtLeaseStart = params.move_in_date;
    if (typeof params.move_out_date === "string")
      orderFormData.dtLeaseEnd = params.move_out_date;
    // Add other order prefill fields if needed (totalTenants, bedBath?)

    // Prefill Client Form
    const firstName =
      typeof params.first_name === "string" ? params.first_name : "";
    const lastName =
      typeof params.last_name === "string" ? params.last_name : "";
    if (firstName || lastName)
      clientFormData.name = `${firstName} ${lastName}`.trim();
    if (typeof params.email === "string") clientFormData.email = params.email;

    // Handle commission prefill logic (from dom_client.js)
    const llBrokerFee = params.ll_broker_fee;
    if (
      typeof llBrokerFee === "string" &&
      !isNaN(parseFloat(llBrokerFee)) &&
      parseFloat(llBrokerFee) != 0
    ) {
      clientFormData.commBuilding = "1";
      clientFormData.amountCommBuilding = parseFloat(llBrokerFee);
    }
    const brokerFee = params.broker_fee;
    if (
      typeof brokerFee === "string" &&
      !isNaN(parseFloat(brokerFee)) &&
      parseFloat(brokerFee) != 0
    ) {
      clientFormData.commCyof = "1";
      clientFormData.amountCommCyof = parseFloat(brokerFee);
    }
    // Add other client prefill fields if needed (dtDeal, weChat?)
    if (typeof params.dtDeal === "string")
      clientFormData.dtDeal = params.dtDeal; // Example
    if (typeof params.weChat === "string")
      clientFormData.weChat = params.weChat; // Example
    if (typeof params.memo === "string") {
      // Append prefilled memo if any
      orderFormData.memo = params.memo;
      clientFormData.memo = params.memo; // Add to both? Check requirement
    }
  };

  // Submit Step 1: Create Rent Order
  const submitOrder = async (): Promise<boolean> => {
    isSubmittingOrder.value = true;
    finalStatus.value = "idle";
    errorMessage.value = null;

    // Basic Frontend Validation (add more if needed)
    if (!orderFormData.buildingId) {
      ElMessage.warning("请从列表中选择一个有效的公寓 Building。");
      isSubmittingOrder.value = false;
      return false;
    }
    if (
      orderFormData.multiAgent === "1" &&
      orderFormData.agentIds.length === 0
    ) {
      ElMessage.warning("请选择拼单的 Agent。");
      isSubmittingOrder.value = false;
      return false;
    }
    // Add date range validation if not handled by component rules
    if (
      orderFormData.dtLeaseStart &&
      orderFormData.dtLeaseEnd &&
      orderFormData.dtLeaseStart > orderFormData.dtLeaseEnd
    ) {
      ElMessage.warning("Lease Start Date 不能晚于 Lease End Date。");
      isSubmittingOrder.value = false;
      return false;
    }

    // Construct payload based on legacy process.js
    const payload = {
      id: "", // Empty for create
      multiAgent: orderFormData.multiAgent,
      agentIds: orderFormData.multiAgent === "1" ? orderFormData.agentIds : [],
      agents: [], // Let backend handle mapping agentIds to agents object?
      apt: orderFormData.apt,
      dtLeaseStart: orderFormData.dtLeaseStart,
      amountRent: orderFormData.amountRent,
      totalTenants: orderFormData.totalTenants,
      buildingId: orderFormData.buildingId,
      building: {}, // Let backend handle mapping buildingId to building object?
      bedBath: orderFormData.bedBath,
      dtLeaseEnd: orderFormData.dtLeaseEnd,
      brokerLicenseId: orderFormData.brokerLicenseId,
      brokerLicense: {}, // Let backend handle mapping licenseId?
      memo: orderFormData.memo + "  QYCRM", // Append marker
      uploadedArray: [], // Assuming not needed for this step
      module: 1, // USA Module
      fromRentOrderItemId: ""
    };

    try {
      // POST to the wrapper API, specifying the target action via url_label
      const response = await http.request<OrderApiResponse>(
        "post",
        "/portalapi/crm/hrm_transfer_request.php",
        {
          // The wrapper expects label/token in POST body, JSON payload in request body
          data: {
            // This outer object is the POST body for the wrapper
            url_label: "create_order",
            // token: "YOUR_TOKEN", // Add if http util doesn't handle it
            payload: payload // This is the actual JSON payload for HRM
          }
          // Or if wrapper expects JSON directly and label/token as params:
          // params: { url_label: "create_order", token: "YOUR_TOKEN"},
          // data: payload
          // ** Check how hrm_transfer_request.php expects data ** Let's assume label in POST data, payload in request body
        },
        {
          // Need to manually set Content-Type if sending nested structure?
          // Usually http util handles JSON Content-Type for 'data'
          // headers: { 'Content-Type': 'application/x-www-form-urlencoded' } // If sending form data instead of nested JSON
        }
      );

      // Assuming the wrapper forwards the HRM response directly:
      if (response.status === 200 && response.rentOrder?.id) {
        rentOrderId.value = response.rentOrder.id; // Store the ID for the next step
        ElMessage.success("订单信息保存成功！");
        isSubmittingOrder.value = false;
        return true; // Allow step progression
      } else {
        throw new Error(response.message || "创建订单失败");
      }
    } catch (error: any) {
      console.error("Submit Order Error:", error);
      errorMessage.value = error.message || "提交订单时发生错误";
      ElMessage.error(errorMessage.value);
      isSubmittingOrder.value = false;
      return false; // Prevent step progression
    }
  };

  // Submit Step 2: Create Rent Order Client
  const submitClient = async (): Promise<boolean> => {
    if (!rentOrderId.value) {
      ElMessage.error("无法提交客户信息：缺少订单ID。请返回上一步重试。");
      return false;
    }
    isSubmittingClient.value = true;
    finalStatus.value = "idle";
    errorMessage.value = null;

    // Frontend Validation
    if (
      clientFormData.commBuilding === "1" &&
      (clientFormData.amountCommBuilding === null ||
        clientFormData.amountCommBuilding < 0)
    ) {
      ElMessage.warning("请输入有效的大楼付款金额 (LL Comm)。");
      isSubmittingClient.value = false;
      return false;
    }
    if (
      clientFormData.commCyof === "1" &&
      (clientFormData.amountCommCyof === null ||
        clientFormData.amountCommCyof < 0)
    ) {
      ElMessage.warning("请输入有效的客户付款金额 (TT Comm)。");
      isSubmittingClient.value = false;
      return false;
    }

    // Construct payload based on legacy process_client.js
    const payload = {
      miscUploadedArray: [], // Assuming not needed
      dtDeal: clientFormData.dtDeal,
      name: clientFormData.name,
      rentOrderId: rentOrderId.value, // Use stored ID
      amountComm: totalCommission.value, // Use computed total
      amountCommBuilding:
        clientFormData.commBuilding === "1"
          ? clientFormData.amountCommBuilding
          : 0, // Send 0 if radio is 'No'
      amountCommCyof:
        clientFormData.commCyof === "1" ? clientFormData.amountCommCyof : 0, // Send 0 if radio is 'No'
      commBuilding: clientFormData.commBuilding === "1", // Send boolean
      commCyof: clientFormData.commCyof === "1", // Send boolean
      pack: clientFormData.package, // Map 'package' to 'pack'
      email: clientFormData.email,
      tel: clientFormData.tel,
      referral: clientFormData.referral,
      school: clientFormData.school,
      lifeStage: clientFormData.lifeStage,
      gender: clientFormData.gender,
      rebate: clientFormData.rebate || "0", // Default to "0" if empty
      weChat: clientFormData.weChat,
      sources: clientFormData.sources,
      paymentMethod: clientFormData.paymentMethod,
      grade: clientFormData.grade,
      dob: clientFormData.dob,
      memo: clientFormData.memo, // Use memo from step 2
      wire: 0, // Default value from legacy
      cyof: 0 // Default value from legacy
    };

    try {
      // POST to the wrapper API
      const response = await http.request<ClientApiResponse>(
        "post",
        "/portalapi/crm/hrm_transfer_request.php",
        {
          // Similar structure as submitOrder, check wrapper needs
          data: {
            // Assuming nested structure for wrapper
            url_label: "create_client",
            // token: "YOUR_TOKEN",
            payload: payload // Actual client data for HRM
          }
          // Or direct payload if wrapper expects that:
          // data: payload,
          // params: { url_label: "create_client", token: "YOUR_TOKEN" }
        }
      );

      // Assuming wrapper forwards HRM status
      if (response.status === 200) {
        ElMessage.success("客户信息提交成功！");
        finalStatus.value = "success";
        isSubmittingClient.value = false;
        return true; // Indicate final success
      } else {
        throw new Error(response.message || "创建客户失败");
      }
    } catch (error: any) {
      console.error("Submit Client Error:", error);
      errorMessage.value = error.message || "提交客户信息时发生错误";
      ElMessage.error(errorMessage.value);
      finalStatus.value = "error";
      isSubmittingClient.value = false;
      return false;
    }
  };

  // Reset form state for "Add Another Client" or "New Order"
  const resetForm = () => {
    rentOrderId.value = null;
    finalStatus.value = "idle";
    errorMessage.value = null;
    // Reset reactive objects
    Object.assign(orderFormData, {
      multiAgent: "0",
      agentIds: [],
      buildingName: "",
      buildingId: null,
      apt: "",
      amountRent: null,
      bedBath: "",
      dtLeaseStart: "",
      dtLeaseEnd: "",
      totalTenants: null,
      brokerLicenseId: null,
      memo: ""
    });
    Object.assign(clientFormData, {
      dtDeal: "",
      name: "",
      commBuilding: "0",
      amountCommBuilding: null,
      commCyof: "0",
      amountCommCyof: null,
      rebate: "",
      weChat: "",
      email: "",
      school: "",
      lifeStage: "",
      gender: "",
      sources: "",
      paymentMethod: "",
      grade: "",
      package: "",
      dob: "",
      tel: "",
      referral: "",
      memo: ""
    });
    // Re-run prefill based on original URL params
    prefillFromUrlParams();
  };

  // Fetch data when hook is mounted
  onMounted(() => {
    fetchInitialData();
  });

  // --- Watchers for conditional logic (like legacy JS) ---
  watch(
    () => orderFormData.multiAgent,
    newVal => {
      if (newVal === "0") {
        orderFormData.agentIds = []; // Clear agents if not multi-agent
      }
    }
  );

  watch(
    () => clientFormData.commBuilding,
    newVal => {
      if (newVal === "0") {
        clientFormData.amountCommBuilding = null; // Or 0 if backend expects number
      }
    }
  );

  watch(
    () => clientFormData.commCyof,
    newVal => {
      if (newVal === "0") {
        clientFormData.amountCommCyof = null; // Or 0
      }
    }
  );

  // Return state and methods
  return {
    isLoadingInitialData,
    isSubmittingOrder,
    isSubmittingClient,
    finalStatus,
    errorMessage,
    // Form Data
    orderFormData,
    clientFormData,
    // Select Options
    agents,
    buildings,
    licenses,
    clientResources,
    // Computed
    totalCommission,
    // Methods
    submitOrder,
    submitClient,
    resetForm
  };
}
