<template>
  <div class="upload-form">
    <el-form
      ref="formRef"
      :model="validateForm"
      :rules="rules"
      label-width="120px"
      class="p-4 bg-white"
    >
      <!-- 视频上传 -->
      <el-form-item
        label="选择视频"
        prop="fileList"
        :rules="[{ required: true, message: '附件不能为空' }]"
      >
        <el-upload
          ref="uploadRef"
          v-model:file-list="validateForm.fileList"
          drag
          action="#"
          class="w-[200px]!"
          :auto-upload="false"
          accept="video/*"
          :limit="1"
          :on-exceed="onExceed"
          @change="(uploadFile, uploadFiles) => handleSelect(uploadFiles)"
          @remove="(_, files) => handleSelect(files)"
        >
          <div class="el-upload__text">
            <UploadIcon class="m-auto mb-2" />
            可点击或拖拽上传
          </div>
        </el-upload>
      </el-form-item>

      <!-- 公寓名称及地址 -->
      <el-form-item label="公寓名称" prop="apartmentName">
        <el-input
          ref="nameInputRef"
          v-model="validateForm.apartmentName"
          data-marker="apartmentName"
          placeholder="请输入公寓名称"
          @blur="onApartmentNameBlur"
        />
      </el-form-item>
      <el-form-item label="公寓地址" prop="apartmentAddress">
        <el-input
          v-model="validateForm.apartmentAddress"
          data-marker="apartmentAddress"
          placeholder="请输入公寓地址"
        />
      </el-form-item>

      <!-- Unit / APT -->
      <el-form-item label="Unit/APT" prop="unit">
        <el-input
          v-model="validateForm.unit"
          placeholder="请输入房间号                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  "
        />
      </el-form-item>

      <!-- 房间类型 -->
      <el-form-item label="房间类型" prop="roomType">
        <el-select v-model="validateForm.roomType" placeholder="请选择房间类型">
          <el-option
            v-for="opt in roomOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <!-- 区域 -->
      <el-form-item label="区域" prop="area">
        <el-select
          v-model="validateForm.area"
          placeholder="请选择区域"
          class="w-[200px]"
        >
          <el-option v-for="a in areas" :key="a" :label="a" :value="a" />
        </el-select>
      </el-form-item>

      <!-- 上传目的地 -->
      <el-form-item label="上传到" prop="targetSource">
        <el-select
          v-model="validateForm.targetSource"
          placeholder="请选择上传目的地"
          class="w-[200px]"
        >
          <el-option
            v-for="opt in targetSources"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <!-- 提交按钮 -->
      <el-form-item>
        <el-button type="primary" @click="submit()">开始上传</el-button>
        <el-button @click="resetForm(formRef)">重置</el-button>
      </el-form-item>

      <div class="el-form-item">
        <div class="el-form-item__content" style="margin-left: 0">
          <span class="mb-2 text-sm text-gray-500">
            你上传的视频将被传输至位于<a
              href="https://cn.aliyun.com/product/oss"
              target="_blank"
              class="!text-blue-400"
            >
              <LocationIcon
                class="w-[1em] h-[1em] inline-block location-icon"
              />
              中国香港的数据中心</a
            >保存
          </span>
        </div>
      </div>
      <!-- 上传进度 -->
      <el-progress
        v-if="uploading"
        :text-inside="true"
        :stroke-width="20"
        :percentage="percent"
        status="exception"
        striped
        striped-flow
        class="mb-2"
      />
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, nextTick } from "vue";
import { UploadFile } from "element-plus";
import { message } from "@/utils/message";
import UploadIcon from "~icons/ri/upload-2-line?width=26&height=26";
import LocationIcon from "~icons/ri/map-pin-2-line?width=26&height=26";
import { fetchAreas } from "@/api/fechAreas";
import { formUpload, UploadMeta } from "@/api/formUpload";
import type { UploadUserFile } from "element-plus";
import { useApartmentLookup } from "@/api/driveFecthApartmentAI";

import {
  loadTargetSources,
  loadPublicTargetSources,
  SelectOption
} from "@/api/drivePathList";

const formRef = ref();
const uploadRef = ref();
const percent = ref(0);
const uploading = ref(false);
const selectedFile = ref<File | null>(null);
const fileNameForAIProcess = ref<string | null>(null);
const nameInputRef = ref(); // for el-input
defineOptions({
  name: "driveUpload"
});
const {
  info: aptInfo,
  loading: aptLoading,
  error: aptError,
  lookup: fetchApartment,
  checkApartmentName
} = useApartmentLookup();

function handleSelect(uploadFiles: UploadFile[]) {
  const file = uploadFiles[0]?.raw as File;
  selectedFile.value = file;
  if (!file) return;
  fileNameForAIProcess.value = file.name;
  console.log("文件名称", selectedFile.value?.name);
  console.log("文件大小", selectedFile.value?.size);
  console.log("文件类型", selectedFile.value?.type);
  fileNameForAIProcess.value = file.name;
  // 去掉后缀
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  fetchApartment(baseName).then(() => {
    // 拿到接口返回的公寓信息，填到表单
    if (aptInfo.unit) validateForm.unit = aptInfo.unit;
    if (aptInfo.area) validateForm.area = aptInfo.area;
    if (aptInfo.type) validateForm.roomType = aptInfo.type;
    if (aptInfo.name) {
      validateForm.apartmentName = aptInfo.name;

      // 2. 等 DOM 更新后，模拟一次“空格+删掉”来触发自动补全
      nextTick(() => {
        const inputEl = (nameInputRef.value as any).$el.querySelector(
          "input"
        ) as HTMLInputElement;
        if (!inputEl) return;
        inputEl.focus();
        // 加个空格
        inputEl.value = aptInfo.name + " ";
        inputEl.dispatchEvent(new Event("input"));
        // 立刻删掉
        setTimeout(() => {
          inputEl.value = aptInfo.name;
          inputEl.dispatchEvent(new Event("input"));
        }, 50);
      });
    }
  });
}

function onExceed(files: File[], uploadFiles: UploadUserFile[]) {
  message("只能选择一个视频文件，请先删除其他文件再上传", { type: "warning" });
}

async function onApartmentNameBlur() {
  if (!validateForm.apartmentName) return;

  await new Promise(resolve => setTimeout(resolve, 1000)); // 延迟1秒

  await checkApartmentName(validateForm.apartmentName);

  if (aptInfo.area) {
    validateForm.area = aptInfo.area;
    formRef.value?.validateField("area");
  }
}

const validateForm = reactive({
  fileList: [] as UploadFile[],
  apartmentName: "",
  apartmentAddress: "",
  unit: "",
  roomType: "",
  area: "",
  targetSource: ""
});

const rules = {
  fileList: [{ required: true, message: "请上传视频文件", trigger: "change" }],
  apartmentName: [
    { required: true, message: "请输入公寓名称", trigger: "blur" }
  ],
  apartmentAddress: [
    { required: true, message: "请输入公寓地址", trigger: "blur" }
  ],
  roomType: [{ required: true, message: "请选择房间类型", trigger: "change" }],
  area: [{ required: true, message: "请选择区域", trigger: "change" }],
  targetSource: [
    { required: true, message: "请选择上传目的地", trigger: "change" }
  ]
};

const roomOptions = [
  { label: "Studio", value: "Studio" },
  { label: "Studio Den", value: "StudioDen" },
  { label: "1B1B", value: "1B1B" },
  { label: "1B Den", value: "1B Den" },
  { label: "1B Split", value: "1B Split" },
  { label: "2B1B", value: "2B1B" },
  { label: "2B Split", value: "2B Split" },
  { label: "2B2B", value: "2B2B" },
  { label: "3B1B", value: "3B1B" },
  { label: "3B2B", value: "3B2B" },
  { label: "3B3B", value: "3B3B" },
  { label: "4B1B", value: "4B1B" },
  { label: "4B2B", value: "4B2B" },
  { label: "4B3B", value: "4B3B" },
  { label: "4B4B", value: "4B4B" },
  { label: "5B+", value: "5B+" },
  { label: "Other", value: "Other" },
  { label: "公共设施", value: "公共设施" }
];

const areas = ref<string[]>([]);
const privateSources = ref<SelectOption[]>([]);
const publicSources = ref<SelectOption[]>([]);
const targetSources = ref<SelectOption[]>([]);

// 声明外部全局函数
declare const initiateMapAutoComplete: (...args: any[]) => void;

onMounted(async () => {
  fetchAreas(areas);
  try {
    // 私人/团队盘
    await loadPublicTargetSources(publicSources);
    targetSources.value = [...publicSources.value];
    await loadTargetSources(privateSources);

    targetSources.value = [...publicSources.value, ...privateSources.value];
  } catch (err: any) {
    message(err.message || "加载选项失败", { type: "error" });
  }

  // 地图api自动补全
  // 监听对话框显示变化，首次打开时加载地图自动补全脚本
  // 页面加载时初始化地图自动完成+

  const script = document.createElement("script");
  script.src =
    "https://api.uswoo.cn/map/place-req.js?location=42.3601,-71.0589&radius=241400&strictbounds&v=" +
    new Date().getTime();
  script.async = true;
  script.onload = () => {
    if (typeof initiateMapAutoComplete === "function") {
      initiateMapAutoComplete(
        "apartmentName, apartmentAddress",
        "apartmentName",
        "apartmentAddress",
        "none",
        "apartmentName"
      );
    }
  };
  document.body.appendChild(script);

  // 同步自动补全的值到 validateForm
  document.addEventListener("autocomplete-selected", (e: CustomEvent) => {
    const { marker, value } = e.detail;
    if (marker in validateForm) {
      // @ts-ignore
      validateForm[marker] = value;
      // 如果想立即触发校验：
      formRef.value?.validateField(marker);
    }
  });
});

async function submit() {
  // 手动触发 Element Plus 校验
  formRef.value.validate((valid: boolean, fields: Record<string, any>) => {
    // 文件相关的校验
    const files = validateForm.fileList;
    if (files.length === 0) {
      message("请先选一个视频文件", { type: "warning" });
      return;
    }
    if (files.length > 1) {
      message("只能上传一个视频文件", { type: "warning" });
      return;
    }
    const file = selectedFile.value!;
    if (!file.type.startsWith("video/")) {
      message("只能上传视频文件", { type: "warning" });
      return;
    }
    const minSize = 15 * 1024 * 1024;
    if (file.size < minSize) {
      message(`视频文件太小，至少 ${Math.round(minSize / 1024 / 1024)}MB`, {
        type: "warning"
      });
      return;
    }

    // 表单相关校验
    if (valid && selectedFile.value) {
      doUpload();
    } else {
      // 收集缺失项
      const missing: string[] = [];

      // 视频
      if (!selectedFile.value) missing.push("视频文件");

      // 下面对照你的表单字段和 rules 来检查
      if (!validateForm.apartmentName) missing.push("公寓名称");
      if (!validateForm.apartmentAddress) missing.push("公寓地址");
      if (!validateForm.roomType) missing.push("房间类型");
      if (!validateForm.area) missing.push("区域");
      if (!validateForm.targetSource) missing.push("上传到");

      // 如果 fields 参数里也带了校验结果，你也可以用 fields 来看哪些没过
      // const failedFields = Object.keys(fields);

      message(`以下字段未填写或不合法：${missing.join("、")}`, {
        type: "warning"
      });
    }
  });

  async function doUpload() {
    uploading.value = true;
    percent.value = 0;

    // 构造 targetSourceLabel
    const sel = targetSources.value.find(
      o => o.value === validateForm.targetSource
    );
    const targetSourceLabel = sel?.label || "";

    const meta: UploadMeta = {
      apartmentName: validateForm.apartmentName,
      roomType: validateForm.roomType,
      address: validateForm.apartmentAddress,
      unit: validateForm.unit,
      area: validateForm.area,
      target_source: validateForm.targetSource,
      target_source_label: targetSourceLabel,
      filename: selectedFile.value.name,
      filesize: parseFloat((selectedFile.value.size / (1024 * 1024)).toFixed(2))
    };

    try {
      console.log("Starting upload..."); // 添加开始日志
      await formUpload({
        file: selectedFile.value!, // 确保 selectedFile 不是 null
        meta,
        onProgress: p => {
          console.log("Progress Update Received:", p); // <--- 添加日志，检查 p 的值和调用频率
          // 确保 p 是数字类型且在 0-100 之间
          if (typeof p === "number" && p >= 0 && p <= 100) {
            percent.value = Math.round(p); // 可以取整避免小数
          } else {
            console.warn("Invalid progress value received:", p);
          }
        }
      });
      message("上传并保存成功", { type: "success" });

      formRef.value.resetFields();
      selectedFile.value = undefined;
    } catch (err: any) {
      message("上传失败：" + err.message, { type: "error" });
    } finally {
      uploading.value = false;
    }
  }
}

const resetForm = (formEl: any) => {
  if (!formEl) return;
  formEl.resetFields();
  validateForm.fileList = [];
};
</script>

<style scoped lang="scss">
:deep(.location-icon) {
  display: inline-block !important;
}
</style>
