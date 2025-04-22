<script setup lang="ts">
import { getCardList } from "@/api/drive-list";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { ref, onMounted, nextTick, computed, watch } from "vue";
import ListCard from "./components/ListCard.vue";

defineOptions({
  name: "CardList"
});

defineProps<{
  buildingName?: any;
}>();

const svg = `
        <path class="path" d="
          M 30 15
          L 28 17
          M 25.61 25.61
          A 15 15, 0, 0, 1, 15 30
          A 15 15, 0, 1, 1, 27.99 7.5
          L 15 15
        " style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)"/>
      `;

const INITIAL_DATA = {
  name: "",
  status: "",
  description: "",
  type: "",
  mark: ""
};

const pagination = ref({ current: 1, pageSize: 12, total: 0 });

const dataList = ref([]);
const dataLoading = ref(true);
const auth_url = ref("");
const getCardListData = async () => {
  dataLoading.value = true;
  try {
    const { data } = await getCardList();

    // 先校验 status
    if (data.status !== "success") {
      // 接口返回的错误信息弹窗提示
      message("加载失败，请稍后重试" + data.message, { type: "warning" });
      console.error("接口返回的错误信息", data);
      return;
    }

    // status === 'success' 再赋值
    dataList.value = data.list;
    auth_url.value = data.token;
    pagination.value = {
      ...pagination.value,
      total: data.list.length
    };
  } catch (e) {
    console.error(e);
    message("加载失败，请稍后重试" + e, { type: "warning" });
  } finally {
    // 保证 loading 最少持续 500ms
    setTimeout(() => {
      dataLoading.value = false;
    }, 500);
  }
};

onMounted(() => {
  getCardListData();
});

const formData = ref({ ...INITIAL_DATA });
const searchValue = ref("");

const onPageSizeChange = (size: number) => {
  pagination.value.pageSize = size;
  pagination.value.current = 1;
};
const onCurrentChange = (current: number) => {
  pagination.value.current = current;
};

// 拉数据后设置 total
onMounted(async () => {
  const { data } = await getCardList();
  dataList.value = data.list;
  pagination.value.total = dataList.value.length;
  dataLoading.value = false;
});

// 过滤列表：apartment 或 area 匹配都算
const filteredList = computed(() => {
  const kw = searchValue.value.trim().toLowerCase();
  if (!kw) return dataList.value;
  return dataList.value.filter(v => {
    const a = String(v.apartment || "").toLowerCase();
    const r = String(v.area || "").toLowerCase();
    return a.includes(kw) || r.includes(kw);
  });
});

// 当搜索关键词或原始列表变化时，更新 total，并回到第一页
watch([filteredList], ([list]) => {
  pagination.value.total = list.length;
  pagination.value.current = 1;
});
</script>

<template>
  <div>
    <div class="w-full flex justify-between mb-4">
      <el-input
        v-model="searchValue"
        style="width: 300px"
        placeholder="搜索公寓"
        clearable
      >
        <template #suffix>
          <el-icon class="el-input__icon">
            <IconifyIconOffline
              v-show="searchValue.length === 0"
              icon="ri/search-line"
            />
          </el-icon>
        </template>
      </el-input>
    </div>
    <div
      v-loading="dataLoading"
      :element-loading-svg="svg"
      element-loading-svg-view-box="-10, -10, 50, 50"
    >
      <!-- Empty -->
      <el-empty
        v-if="filteredList.length === 0"
        :description="`${searchValue} 数据不存在`"
      />

      <!-- 列表 + 分页 -->
      <template v-else>
        <el-row :gutter="16">
          <el-col
            v-for="(video, i) in filteredList.slice(
              (pagination.current - 1) * pagination.pageSize,
              pagination.current * pagination.pageSize
            )"
            :key="i"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
            :xl="4"
          >
            <ListCard
              :video="video"
              :index="(pagination.current - 1) * pagination.pageSize + i"
            />
          </el-col>
        </el-row>

        <el-pagination
          v-model:currentPage="pagination.current"
          class="float-right"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[12, 16, 24, 36]"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="onPageSizeChange"
          @current-change="onCurrentChange"
        />
      </template>
    </div>
  </div>
</template>
