<template>
  <div class="qy-login-container">
    <div v-if="isLoading" class="loading-message">
      <p>正在通过企业微信登录认证，请稍候...</p>
      <el-icon class="is-loading" :size="26">
        <Loading />
      </el-icon>
    </div>
    <div v-if="error" class="error-message">
      <el-alert type="error" center :closable="false">
        <template #title>
          <span style="font-weight: bold">登录失败</span>
        </template>
        <p>{{ error }}</p>
        <p>请确认企业微信配置或联系系统管理员。</p>
        <el-button
          type="primary"
          link
          style="margin-top: 10px"
          @click="goToLogin"
        >
          返回手动登录
        </el-button>
      </el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStoreHook } from "@/store/modules/user"; // 引入用户 Store
import { initRouter } from "@/router/utils"; // 引入路由初始化工具
import { message } from "@/utils/message"; // 引入消息提示
import { setToken } from "@/utils/auth"; // *** 引入核心的 setToken 函数 ***
import { Loading } from "@element-plus/icons-vue"; // 引入加载图标
import { http } from "@/utils/http"; // 引入 HTTP 客户端实例

// 设置组件名称
defineOptions({
  name: "QyAutoLogin" // 保持命名规范一致性
});

const route = useRoute();
const router = useRouter();
const userStore = useUserStoreHook(); // 获取用户 Store 实例

const isLoading = ref(true);
const error = ref<string | null>(null);

/**
 * 处理登录成功后的逻辑：
 * 1. 调用 setToken 存储用户信息（Token、角色等到 localStorage/sessionStorage）。
 * 2. （可选）直接更新 Pinia state（setToken 可能已通过 storage 事件触发更新）。
 * 3. 初始化动态路由。
 * 4. 跳转到目标页面。
 */
const handleLoginSuccess = async (apiResponseData: any) => {
  // 接收后端返回的 data 对象
  if (!apiResponseData || !apiResponseData.accessToken) {
    // 确保核心数据存在
    error.value = "登录成功，但后端返回的用户信息或 Token 无效。";
    isLoading.value = false;
    console.error("Invalid login response data:", apiResponseData);
    return; // 无法继续
  }

  try {
    console.log("handleLoginSuccess: Received data, calling setToken...");
    // 1. 使用 setToken 处理后端返回的数据，存储认证信息
    // setToken 函数应负责将 token、用户信息（username, roles等）存入 Storage
    setToken(apiResponseData);

    // 2. （可选）显式更新 Pinia Store，确保即时反应
    // setToken 通常会更新 storage，而 store 的 state 会从 storage 初始化。
    // 但为确保界面立即更新，可以手动调用 SET action。
    console.log("handleLoginSuccess: Updating Pinia store state...");
    if (apiResponseData.username)
      userStore.SET_USERNAME(apiResponseData.username);
    if (apiResponseData.nickname)
      userStore.SET_NICKNAME(apiResponseData.nickname);
    if (apiResponseData.roles) userStore.SET_ROLES(apiResponseData.roles);
    if (apiResponseData.permissions)
      userStore.SET_PERMS(apiResponseData.permissions);
    // if (apiResponseData.avatar) userStore.SET_AVATAR(apiResponseData.avatar);

    console.log("handleLoginSuccess: Initializing router...");
    // 3. 初始化路由（加载用户对应的动态路由）
    await initRouter();

    // 4. 确定跳转目标路径
    const jumpPath = route.query.jump as string; // 从当前回调 URL 获取 jump 参数
    const targetPath = jumpPath ? jumpPath : "/"; // 如果有 jump 路径则跳过去，否则跳首页

    console.log(
      `handleLoginSuccess: Redirecting to target path: ${targetPath}`
    );
    // 5. 执行跳转，使用 replace 避免用户回退到此回调页面
    await router.replace(targetPath);

    // 6. (可选) 显示成功提示
    // message.success("企业微信登录成功"); // 自动登录通常不需要提示
  } catch (err: any) {
    console.error("处理登录成功逻辑时出错:", err);
    // 如果 setToken 或 initRouter 失败
    error.value = `登录状态设置或路由初始化失败: ${err.message || "未知错误"}。请联系管理员。`;
    isLoading.value = false; // 停止加载，显示错误
  }
};

/**
 * 跳转回手动登录页面
 */
const goToLogin = () => {
  router.push("/login");
};

// 组件挂载后执行
onMounted(async () => {
  const { code, state } = route.query; // 从 URL 获取 code 和 state
  const jumpPath = route.query.jump as string; // 从 URL 获取 jump

  console.log("回调页面加载. Code:", code, "State:", state, "Jump:", jumpPath);

  // 校验 code 是否存在
  if (!code || typeof code !== "string") {
    error.value = "企业微信回调参数无效或缺失 (code)，无法登录。";
    isLoading.value = false;
    return;
  }

  // TODO: 在这里添加 state 参数的校验逻辑（如果需要）
  // const expectedState = storageLocal().getItem('oauth_state');
  // if (!state || state !== expectedState) {
  //   error.value = '无效的 state 参数，可能存在安全风险。';
  //   isLoading.value = false;
  //   return;
  // }
  // storageLocal().removeItem('oauth_state'); // 验证后移除

  try {
    isLoading.value = true;
    error.value = null;

    const apiUrl = "/portalapi/qyAutoLogin"; // 确认 API 端点名称
    console.log(`发送 code 到后端 API: ${apiUrl}`);

    // 调用后端 API，发送 code
    // 注意：根据你的 http 客户端封装，确认 data 包装方式。
    // 如果 http.request 自动处理 JSON，通常第三个参数直接是数据对象。
    // 如果需要明确指定 data 字段，则用 { data: { code: code } }
    const response = await http.request<{
      success: boolean;
      message?: string;
      data?: any;
    }>(
      "post",
      apiUrl,
      { data: { code: code } } // 将 code 包装在 data 属性中以符合 AxiosRequestConfig 类型
      // 或者如果你的封装需要: { data: { code: code } }
    );

    console.log("后端 API 响应:", response);

    // 处理后端响应
    if (response && response.success) {
      // 登录成功，调用 handleLoginSuccess 处理后续流程
      await handleLoginSuccess(response.data); // 将后端返回的 data 传递过去
    } else {
      // 后端返回登录失败
      error.value =
        response?.message ||
        "企业微信登录认证失败，可能是 Code 无效、用户未绑定或未授权。";
      isLoading.value = false;
    }
  } catch (apiError: any) {
    // 请求后端 API 本身失败（网络错误等）
    console.error(`请求 API 失败:`, apiError);
    error.value = `请求企业微信登录接口失败 (${apiError.statusCode || "Network Error"})，请检查网络或联系管理员。`;
    isLoading.value = false;
  }
});
</script>

<style scoped>
.qy-login-container {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
  padding: 20px;
  text-align: center;
}

.loading-message p,
.error-message p {
  margin-bottom: 10px;
  font-size: 1.1em;
  color: #606266;
}

.error-message p {
  color: #303133;
}

.el-alert {
  width: 100%;
  max-width: 400px;
  padding: 20px;
}

.el-alert p {
  margin-bottom: 8px;
  line-height: 1.5;
}

.is-loading {
  margin-top: 15px;
}
</style>
