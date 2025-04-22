<template>
  <el-form ref="formRef" :model="validateForm" :rules="rules" label-width="120px" class="p-4 bg-white rounded">
    <!-- 视频上传 -->
    <el-form-item label="选择视频" prop="fileList" :rules="[{ required: true, message: '附件不能为空' }]">
      <el-upload ref="uploadRef" v-model:file-list="validateForm.fileList" drag multiple action="#" class="w-[200px]!"
        :auto-upload="false" accept="video/*" :limit="1" :on-exceed="handleExceed" :before-upload="beforeUpload">
        <div class="el-upload__text">
          <UploadIcon class="m-auto mb-2" />
          可点击或拖拽上传
        </div>
      </el-upload>
      <el-progress v-if="uploading" :percentage="percent" style="margin-top:8px" />
    </el-form-item>

    <!-- 公寓名称及地址 -->
    <el-form-item label="公寓名称" prop="apartmentName">
      <el-input data-marker="apartmentName" v-model="validateForm.apartmentName" placeholder="请输入公寓名称" />
    </el-form-item>
    <el-form-item label="公寓地址" prop="apartmentAddress">
      <el-input data-marker="apartmentAddress" v-model="validateForm.apartmentAddress" placeholder="请输入公寓地址" />
    </el-form-item>

    <!-- Unit / APT -->
    <el-form-item label="Unit/APT" prop="unit">
      <el-input v-model="validateForm.unit"
        placeholder="请输入房间号                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  " />
    </el-form-item>

    <!-- 房间类型 -->
    <el-form-item label="房间类型" prop="roomType">
      <el-select v-model="validateForm.roomType" placeholder="请选择房间类型">
        <el-option v-for="opt in roomOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </el-form-item>

    <!-- 区域 -->
    <el-form-item label="区域" prop="area">
      <el-select v-model="validateForm.area" placeholder="请选择区域" class="w-[200px]">
        <el-option v-for="a in areas" :key="a" :label="a" :value="a" />
      </el-select>
    </el-form-item>

    <!-- 上传目的地 -->
    <el-form-item label="上传到" prop="targetSource">
      <el-select v-model="validateForm.targetSource" placeholder="请选择上传目的地" class="w-[200px]">
        <el-option v-for="opt in targetSources" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </el-form-item>

    <!-- 提交按钮 -->
    <el-form-item>
      <el-button type="primary" @click="submitForm(formRef)">开始上传</el-button>
      <el-button @click="resetForm(formRef)">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from "vue";
import { UploadFile } from "element-plus";
import { message } from "@/utils/message";
import { createFormData } from "@pureadmin/utils";
import UploadIcon from "~icons/ri/upload-2-line?width=26&height=26";
import { fetchAreas } from "@/api/fechAreas";
import { http } from "@/utils/http";
import { formUpload } from "@/api/formUpload";


import {
  loadTargetSources,
  loadPublicTargetSources,
  SelectOption
} from "@/api/drivePathList";

const formRef = ref();
const uploadRef = ref();

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
  roomType: [
    { required: true, message: "请选择房间类型", trigger: "change" }
  ],
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
  /* … 其他选项 … */
];

const areas = ref<string[]>([]);
const privateSources = ref<SelectOption[]>([]);
const publicSources = ref<SelectOption[]>([]);
const targetSources = ref<SelectOption[]>([]);
function handleExceed(overflowFiles: UploadFile[], currentFileList: UploadFile[]) {
  message('只能上传一个视频文件', { type: 'warning' });
}

onMounted(async () => {
  fetchAreas(areas);
  try {
    // 私人/团队盘
    await loadPublicTargetSources(publicSources);
    targetSources.value = [...publicSources.value];
    await loadTargetSources(privateSources);

    targetSources.value = [
      ...publicSources.value,
      ...privateSources.value
    ]
    
  } catch (err: any) {
    message(err.message || '加载选项失败', { type: 'error' })
  }

  // 地图api自动补全
  // 监听对话框显示变化，首次打开时加载地图自动补全脚本
  // 页面加载时初始化地图自动完成
  const script = document.createElement('script')
  script.src =
    'https://api.uswoo.cn/map/place-req.js?location=42.3601,-71.0589&radius=241400&strictbounds&v=' +
    new Date().getTime()
  script.async = true
  script.onload = () => {
    if (typeof initiateMapAutoComplete === 'function') {
      initiateMapAutoComplete(
        'apartmentName, apartmentAddress',
        'apartmentName',
        'apartmentAddress',
        'none',
        'apartmentName'
      )
    }
  }
  document.body.appendChild(script);

  // 同步自动补全的值到 validateForm
  document.addEventListener('autocomplete-selected', (e: CustomEvent) => {
    const { marker, value } = e.detail;
    if (marker in validateForm) {
      // @ts-ignore
      validateForm[marker] = value;
      // 如果想立即触发校验：
      formRef.value?.validateField(marker);
    }
  });

})

function beforeUpload(file: UploadFile) {
  const isVideo = file.raw.type.startsWith("video/");
  const isLarge = file.raw.size >= 15 * 1024 * 1024;
  if (!isVideo || !isLarge) {
    message("不支持此格式或视频过小 (至少15MB)", { type: "warning" });
    return false;
  }
  return true;
}

const submitForm = (formEl: any) => {
  if (!formEl) return;
  formEl.validate(async valid => {
    if (!valid) return;

    const timestamp = Date.now();
    // 拿到 label
    const sel = targetSources.value.find((opt: SelectOption) => opt.value === validateForm.targetSource);
    const targetSourceLabel = sel?.label || "";

    // 只取第一个文件
    const f = validateForm.fileList[0];
    if (!f) {
      message("请先选择一个视频文件", { type: "warning" });
      return;
    }
    const file = f.raw as File;
    const filename = file.name;
    const filesize = (file.size / (1024 * 1024)).toFixed(2).toString();
    const ext = filename.slice(filename.lastIndexOf(".") + 1);

    // 根据非空项拼接前缀，自动跳过空 unit
    const nameParts = [
      validateForm.apartmentName,
      validateForm.roomType
    ];
    if (validateForm.unit) {
      nameParts.push(validateForm.unit);
    }
    const prefix = nameParts.join("_");
    const ossFileName = `${prefix}_${timestamp}.${ext}`;
    const originalPath =
      `未打水印房源视频/${validateForm.targetSource}/${validateForm.area}/${validateForm.apartmentName}/${ossFileName}`;

    // 构造 FormData（单文件，不用数组）
    const fd = new FormData();
    fd.append("file", file);
    fd.append("ossFileName", ossFileName);
    fd.append("original_oss_path", originalPath);
    fd.append("filename", filename);
    fd.append("filesize", filesize);

    // 其它表单字段
    fd.append("apartmentName", validateForm.apartmentName);
    fd.append("apartmentAddress", validateForm.apartmentAddress);
    if (validateForm.unit) {
      fd.append("unit", validateForm.unit);
    }
    fd.append("roomType", validateForm.roomType);
    fd.append("area", validateForm.area);
    fd.append("target_source", validateForm.targetSource);
    fd.append("target_source_label", targetSourceLabel);

    try {
      const res = await formUpload(fd);
      if (res.success == 'success') {
        message("上传成功", { type: "success" });
        resetForm(formRef.value);
      } else {
        message("提交失败" + res.message, { type: "error" });
      }
    } catch (err: any) {
      message(`提交异常：${err.message || err}`, { type: "error" });
    }
  });
};

async function submit() {
  await formRef.value.validate(async valid => {
    if (!valid || !selectedFile.value) {
      message("请补全信息并选一个视频", { type: "warning" });
      return;
    }
    uploading.value = true;
    percent.value = 0;

    // 构建 meta
    const meta: UploadMeta = {
      apartmentName: validateForm.apartmentName,
      roomType: validateForm.apartmentType,
      unit: validateForm.unit,
      area: validateForm.area,
      target_source: validateForm.targetSource,
      target_source_label: validateForm.targetSourceLabel,
      filename: selectedFile.value.name,
      filesize: selectedFile.value.size
    };

    try {
      await formUpload({
        file: selectedFile.value,
        meta,
        onProgress: p => percent.value = p
      });
      message("上传并保存成功", { type: "success" });
      formRef.value.resetFields();
    } catch (err: any) {
      message("上传失败：" + err.message, { type: "error" });
    } finally {
      uploading.value = false;
    }
  });
}

const resetForm = (formEl: any) => {
  if (!formEl) return;
  formEl.resetFields();
  validateForm.fileList = [];
};


</script>
