<template>
  <el-form
    ref="formRef"
    :model="validateForm"
    :rules="rules"
    label-width="120px"
    class="p-4 bg-white rounded"
  >
    <!-- 视频上传 -->
    <el-form-item
      label="附件"
      prop="fileList"
      :rules="[{ required: true, message: '附件不能为空' }]"
    >
      <el-upload
        ref="uploadRef"
        v-model:file-list="validateForm.fileList"
        drag
        multiple
        action="#"
        class="w-[200px]!"
        :auto-upload="false"
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
        v-model="validateForm.apartmentName"
        placeholder="请输入公寓名称"
      />
    </el-form-item>
    <el-form-item label="公寓地址" prop="apartmentAddress">
      <el-input
        v-model="validateForm.apartmentAddress"
        placeholder="请输入公寓地址"
      />
    </el-form-item>

    <!-- Unit / APT -->
    <el-form-item label="Unit/APT" prop="apartmentUnit">
      <el-input v-model="validateForm.apartmentUnit" />
    </el-form-item>

    <!-- 房间类型 -->
    <el-form-item label="房间类型" prop="apartmentType">
      <el-select
        v-model="validateForm.apartmentType"
        placeholder="请选择房间类型"
      >
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
          v-for="ts in targetSources"
          :key="ts.value"
          :label="ts.label"
          :value="ts.value"
        />
      </el-select>
    </el-form-item>

    <!-- 提交按钮 -->
    <el-form-item>
      <el-button type="primary" @click="submitForm(formRef)">提交</el-button>
      <el-button @click="resetForm(formRef)">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { UploadFile } from "element-plus";
import { message } from "@/utils/message";
import { createFormData } from "@pureadmin/utils";
import UploadIcon from "~icons/ri/upload-2-line?width=26&height=26";
import { fetchAreas } from "@/api/fechAreas";
import { http } from "@/utils/http";
// import { uploadVideo } from '@/api/videoUpload';

const formRef = ref();
const uploadRef = ref();

const validateForm = reactive({
  fileList: [] as UploadFile[],
  apartmentName: "",
  apartmentAddress: "",
  apartmentUnit: "",
  apartmentType: "",
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
  apartmentType: [
    { required: true, message: "请选择房间类型", trigger: "change" }
  ],
  area: [{ required: true, message: "请选择区域", trigger: "change" }],
  targetSource: [
    { required: true, message: "请选择上传目的地", trigger: "change" }
  ]
};

const roomOptions = [
  { label: "Studio", value: "Studio" },
  { label: "Studio+Den", value: "StudioDen" },
  { label: "1B1B", value: "1B1B" }
  /* … 其他选项 … */
];
const areas = ref<string[]>([]);
const targetSources = ref<{ label: string; value: string }[]>([]);

onMounted(() => {
  fetchAreas(areas);
  // loadTargetSources();
});

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
    if (valid) {
      const formData = createFormData({
        files: validateForm.fileList.map(f => ({ raw: f.raw })),
        apartmentName: validateForm.apartmentName,
        apartmentAddress: validateForm.apartmentAddress,
        apartmentUnit: validateForm.apartmentUnit,
        apartmentType: validateForm.apartmentType,
        area: validateForm.area,
        targetSource: validateForm.targetSource
      });
      try {
        // const res = await uploadVideo(formData);
        // if (res.status === 'success') {
        //   message('提交成功', { type: 'success' });
        //   resetForm(formRef.value);
        // } else {
        //   message('提交失败');
        // }
      } catch (err) {
        message(`提交异常 ${err}`, { type: "error" });
      }
    }
  });
};

const resetForm = (formEl: any) => {
  if (!formEl) return;
  formEl.resetFields();
  validateForm.fileList = [];
};
</script>
