<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, watch, computed } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import AddIcon from "~icons/ri/add-circle-line";
import EditIcon from "~icons/ri/edit-circle-line";
import DeleteIcon from "~icons/ri/delete-bin-2-line";
import ShareIcon from "~icons/ri/share-forward-2-fill";
import DownloadIcon from "~icons/ri/download-2-fill";
import LockIcon from "~icons/ri/lock-2-fill"
import { useRecords, useSourceOptions } from "./utils/getViewRecord";
import { driveViewFormRules } from "./utils/rule";
import { message } from "@/utils/message";
import type { FormInstance } from "element-plus";
import { generateShortLink } from "@/utils/shortLink";
import { downloadByUrl } from "@pureadmin/utils";
import { SelectOption } from "@/api/drivePathList";

// 声明外部全局函数
declare const initiateMapAutoComplete: (...args: any[]) => void;

defineOptions({
  name: "driveView"
});

// 从 hook 中获取状态和操作方法
const {
  dataList,
  loading,
  pagination,
  currentUserAgentId,
  fetchRecords,
  dialogVisible,
  dialogTitle,
  form,
  areas,
  openDialog,
  handleSave,
  handleDelete,
  handleChangeSource,
  columns,
  handleSizeChange,
  handleCurrentChange,
  handleSearch,
  share_link_prefix,
  download_link_prefix
} = useRecords();

const hasPermissionManagement = computed(() => {
  const sel = sourceOptions.value.find(opt => opt.value === selectedSource.value)
  return sel?.owner === currentUserAgentId.value
})


const selectedSource = ref<string>('self')  // 默认值self字符串，会选中下面这个默认项
const sourceOptions = ref<SelectOption[]>([
  { label: '我上传的', value: 'self' }
])

// 点击权限管理按钮时的处理
function openPermissionManagement() {
  // TODO: 跳转到权限管理页 / 弹窗 / whatever
  console.log('打开权限管理，source =', selectedSource.value)
}

useSourceOptions()
  .then(({ sourceOptions: so }) => {
    // 把后端选项追加到默认选项之后
    sourceOptions.value = [
      { label: '我上传的', value: 'self' },
      ...so.value
    ]
  })
  .catch(err => {
    console.error('加载 sourceOptions 失败', err)
  })

// 本地搜索输入
const searchTermLocal = ref('');

console.log(currentUserAgentId.value);
// 定义一个状态标识，记录是否已初始化自动补全
const autoCompleteInitialized = ref(false);
const size = ref("default");

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

function pad(num: number): string {
  return num < 10 ? "0" + num : num.toString();
}


onMounted(() => {
  fetchRecords();
  // 监听 autocomplete-selected 事件，更新表单数据
  document.addEventListener("autocomplete-selected", (e: CustomEvent) => {
    const { marker, value } = e.detail;
    if (marker && form.hasOwnProperty(marker)) {
      form[marker] = value;
    }
  });
});

// 监听对话框显示变化，首次打开时加载地图自动补全脚本
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
            "apartmentName,address",
            "apartmentName",
            "address",
            "none",
            "apartmentName"
          );
          autoCompleteInitialized.value = true;
        }
      };
      document.body.appendChild(script);
    });
  }
});
</script>

<template>
  <div>
    <el-input v-model="searchTermLocal" placeholder="全能搜索..." clearable style="margin: 0" @input="handleSearch" />

    <PureTableBar title="我上传的视频" :columns="columns" @refresh="fetchRecords">

      <template #buttons>
        <!-- 只有 owner === 当前用户时才显示 -->
        <el-button v-if="hasPermissionManagement" type="default" style="margin-right: 1rem;" :icon="useRenderIcon(LockIcon)"
          @click="openPermissionManagement">
          权限
        </el-button>

        <el-select v-model="selectedSource" placeholder="请选择存储源" class="auto-width-select" @change="handleChangeSource">
          <el-option v-for="opt in sourceOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>

      </template>

      <template #default="{ size, dynamicColumns }">
        <pure-table :data="dataList" :columns="dynamicColumns" showOverflowTooltip :loading="loading"
          :pagination="{ ...pagination, size }" table-layout="fixed" stripe adaptive :size="size"
          @page-size-change="handleSizeChange" @page-current-change="handleCurrentChange">
          <template #operation="{ row }">
            <template v-if="row">
              <div style="white-space: nowrap" class="opt-buttons">
                <!-- 只有自己或者ID为 649u54989 的人才看得到编辑/删除 -->
                <template v-if="
                    String(row.userID) === String(currentUserAgentId) ||
                    currentUserAgentId === '649u54989'
                  ">
                  <el-tooltip content="编辑" placement="top" effect="dark">
                    <el-button class="icon-button" color="#557DED" size="default" :icon="useRenderIcon(EditIcon)"
                      @click="openDialog('edit', row)" />
                  </el-tooltip>

                  <el-popconfirm title="删除后不可恢复且当月上传次数-1！确定删除吗？" @confirm="handleDelete(row)">
                    <template #reference>
                      <el-button class="icon-button" type="danger" size="default" :icon="useRenderIcon(DeleteIcon)" />
                    </template>
                  </el-popconfirm>
                </template>

                <!-- 其余按钮正常显示 -->
                <template v-if="String(row.status) === 'Done' && row.processed_oss_path">
                  <el-tooltip content="生成分享链接" placement="top" effect="dark">
                    <el-button class="icon-button" type="success" size="default" :icon="useRenderIcon(ShareIcon)"
                      @click="
                        () =>
                          generateShortLink(
                            share_link_prefix + row.processed_oss_path
                          )
                      " />
                  </el-tooltip>
                </template>
              </div>
            </template>
          </template>
          <template #download="{ row }">
            <div style="white-space: nowrap" class="opt-buttons">
              <el-tooltip content="下载可分享的带水印视频" placement="top" effect="dark">
                <el-button v-if="String(row.status) === 'Done' && row.processed_oss_path" class="icon-button"
                  type="danger" size="default" :icon="useRenderIcon(DownloadIcon)" @click="
                    () => {
                      const url = download_link_prefix + row.processed_oss_path;
                      message('正在启动下载带水印视频，请稍等...', {
                        type: 'info'
                      });
                      downloadByUrl(
                        url,
                        (row.processed_oss_path.split('/').pop() || '').trim()
                      );
                    }
                  " />
              </el-tooltip>

              <el-tooltip content="下载无水印的原视频" placement="top" effect="dark">
                <el-button v-if="String(row.status) === 'Done' && row.original_oss_path" class="icon-button"
                  type="default" size="default" :icon="useRenderIcon(DownloadIcon)" @click="
                    () => {
                      const url = download_link_prefix + row.original_oss_path;
                      const name = row.o_filename;
                      message(
                        '正在启动原视频' + row.o_filename + '下载，请稍等...',
                        { type: 'info' }
                      );
                      console.log('name', name);
                      downloadByUrl(url, row.o_filename);
                    }
                  " />
              </el-tooltip>
            </div>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- 编辑记录模态框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" class="custom-dialog">
      <el-form ref="ruleFormRef" :model="form" :rules="driveViewFormRules" label-width="6em">
        <el-form-item label="公寓名称" required prop="apartmentName">
          <el-input v-model="form.apartmentName" placeholder="地点名称" required data-marker="apartmentName" />
        </el-form-item>
        <el-form-item label="Unit/APT" prop="unit">
          <el-input v-model="form.unit" />
        </el-form-item>
        <el-form-item label="详细地址" required prop="address">
          <el-input v-model="form.address" placeholder="address" required data-marker="address" />
        </el-form-item>
        <el-form-item label="区域" required prop="area">
          <el-select v-model="form.area" placeholder="请选择" required>
            <el-option v-for="area in areas" :key="area" :label="area" :value="area" />
          </el-select>
        </el-form-item>
        <el-form-item> <span>不支持更换已上传的视频，如传错需删除后重新上传。</span></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="onSubmit(ruleFormRef)">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style>
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
  width: fit-content;            /* 或者 用 auto */
  min-width: 180px;
  max-width: 100%;               /* 防止超出容器 */
}

/* 内部 input 也要同步 */
.auto-width-select .el-input__inner {
  width: fit-content !important; /* 覆盖默认 100% 宽度 */
  white-space: nowrap;           /* 文本不换行 */
}
</style>
