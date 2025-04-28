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


  <!-- 绑定表单 -->
     <transition name="fade-slide">
    <div
      v-if="showBindForm"
      class="bind-form-card"
      @mouseenter="hover = true"
      @mouseleave="hover = false"
    >

      <el-form :model="bindForm" status-icon class="bind-form">
        <div class="bind-prompt">
        请先将企业微信账号与HRM账号绑定
      </div>

        <el-form-item label="HRM账号" :label-width="formLabelWidth">
          <el-input
            v-model="bindForm.username"
            autocomplete="username"
            class="fancy-input"
          />
        </el-form-item>

        <el-form-item label="HRM密码" :label-width="formLabelWidth">
          <el-input
            type="password"
            v-model="bindForm.password"
            autocomplete="current-password"
            class="fancy-input"
          />
        </el-form-item>

        <el-form-item class="btn-wrapper">
          <el-button
            type="primary"
            :loading="isLoading"
            @click="handleBind"
            class="pulse-btn"
          >
            绑定并登录
          </el-button>
        </el-form-item>

        <p v-if="error" class="error-msg">{{ error }}</p>
      </el-form>
    </div>
  </transition>
  </div>

</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from "vue";
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
const hover = ref(false); // Define hover as a reactive reference

// 绑定流程相关
const showBindForm = ref(false);
const bindForm = reactive({
  username: "",
  password: ""
});
const bindCode = ref("");
const formLabelWidth = "80px";

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


/** 处理绑定提交 **/
const handleBind = async () => {
  if (!bindForm.username || !bindForm.password) {
    error.value = "请输入账号和密码再提交。";
    return;
  }

  try {
    isLoading.value = true;
    error.value = null;

    const apiUrl = "/portalapi/qyAutoLogin/";
    const response = await http.request<{
      success: boolean;
      message?: string;
      errcode?: number;
      code?: string;
      data?: any;
    }>(
      "post",
      apiUrl,
      {
        data: {
          action: "bind",
          code: bindCode.value,
          username: bindForm.username,
          password: bindForm.password
        }
      }
    );

    if (response.success) {
      // 绑定成功，直接登录
      await handleLoginSuccess(response.data);
    } else if (response.errcode === -6) {
      // 绑定失败，需要重新输入，后端返回新的 code
      error.value = response.message || "绑定失败，请重试。";
      bindCode.value = response.code || "";
      isLoading.value = false;
    } else {
      // 其他错误
      throw new Error(response.message || "绑定流程出错");
    }
  } catch (err: any) {
    error.value = err.message || "绑定请求失败，请检查网络。";
    isLoading.value = false;
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
  // 获取回调参数
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get("code")!;
  const state = searchParams.get("state");
  const jumpPath = route.query.jump as string;

  if (!code) {
    error.value = "企业微信回调参数无效或缺失 (code)。";
    return;
  }

  try {
    isLoading.value = true;
    error.value = null;

    const apiUrl = "/portalapi/qyAutoLogin/";
    const response = await http.request<{
      success: boolean;
      message?: string;
      errcode?: number;
      code?: string;
      data?: any;
    }>(
      "post",
      apiUrl,
      { data: { code } }
    );

    if (response.success) {
      await handleLoginSuccess(response.data);
    } else if (response.errcode === -5) {
      // 进入绑定流程
      bindCode.value = response.code || "";
      showBindForm.value = true;
      isLoading.value = false;
    } else {
      error.value =
        response.message ||
        "企业微信登录认证失败，可能是 Code 无效、用户未绑定或未授权。";
      isLoading.value = false;
    }
  } catch (apiError: any) {
    error.value = `请求企业微信登录接口失败：${apiError.message || "网络错误"}`;
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



/* 外层卡片 + 渐变边框 */
.bind-form-card {
  max-width: 420px;
  width: 100%;
  margin: 0 auto;
  padding: 30px 24px;
  background: #1e1e2f;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.bind-form-card::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    60deg,
    #ff416c,
    #ff4b2b,
    #2b86c5,
    #8e2de2,
    #ff416c
  );
  animation: rotateGrad 6s linear infinite;
  z-index: 0;
}
.bind-form-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.8);
}

/* 内层覆盖，保证内容在最上层 */
.bind-form-card .el-alert,
.bind-form-card .bind-form {
  position: relative;
  z-index: 1;
}

/* 表单项 */
.fancy-input ::v-deep .el-input__inner {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.fancy-input ::v-deep .el-input__inner:focus,
.fancy-input ::v-deep .el-input__inner:hover {
  border-color: #ff4b2b;
  box-shadow: 0 0 8px rgba(255, 75, 43, 0.6);
}

/* 按钮脉冲效果 */
.pulse-btn {
  width: 100%;
  font-weight: bold;
  box-shadow: 0 0 0 rgba(255, 75, 43, 0.7);
  animation: pulse 2s infinite;
  border-radius: 999px;
  overflow: hidden;
}
.pulse-btn:hover {
  animation-duration: 1.2s;
}

/* 错误提示 */
.error-msg {
  margin-top: 12px;
  color: #ff6b6b;
  font-weight: 500;
  text-align: center;
}

/* 过渡动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.fade-slide-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

/* 表单项标签改为白色 */
:deep(.el-form-item__label) {
  color: #fff !important;
}

/* 输入框文字改为深灰，placeholder 也同步调整 */
.fancy-input ::v-deep .el-input__inner {
  color: #333 !important;
}
.fancy-input ::v-deep .el-input__inner::placeholder {
  color: #888 !important;
}

/* Keyframes */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 75, 43, 0.7);
  }
  70% {
    box-shadow: 0 0 0 20px rgba(255, 75, 43, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 75, 43, 0);
  }
}
@keyframes rotateGrad {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.bind-prompt {
  font-size: 1.2em;
  font-weight: 600;
  color: #fff;
  text-align: center;
  margin-bottom: 16px;
}
</style>
