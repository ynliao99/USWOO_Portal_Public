<script setup lang="ts">
import { defineProps } from "vue";
import { useColumns } from "./columns";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

// 定义接收父组件传入的 coTableData
const props = defineProps({
  coTableData: {
    type: Array,
    default: () => []
  }
});

// 将 coTableData 传入 useColumns 钩子
const { loading, columns, dataList, pagination, Empty, onCurrentChange } =
  useColumns(props.coTableData);

console.log(props); 

</script>

<template>
  <pure-table
    row-key="id"
    alignWhole="center"
    showOverflowTooltip
    :loading="loading"
    :loading-config="{ background: 'transparent' }"
    :data="
      dataList.slice(
        (pagination.currentPage - 1) * pagination.pageSize,
        pagination.currentPage * pagination.pageSize
      )
    "
    :columns="columns"
    :pagination="pagination"
    @page-current-change="onCurrentChange"
  >
    <template #empty>
      <el-empty description="暂无数据" :image-size="60">
        <template #image>
          <Empty />
        </template>
      </el-empty>
    </template>
    <template #operation="{ row }">
      <el-button
        plain
        circle
        size="small"
        :title="`查看序号为${row.id}的详情`"
        :icon="useRenderIcon('ri:search-line')"
      />
    </template>
  </pure-table>
</template>

<style lang="scss">
.pure-table-filter {
  .el-table-filter__list {
    min-width: 80px;
    padding: 0;
    li {
      line-height: 28px;
    }
  }
}
</style>

<style lang="scss" scoped>
:deep(.el-table) {
  --el-table-border: none;
  --el-table-border-color: transparent;
  .el-empty__description {
    margin: 0;
  }
  .el-scrollbar__bar {
    display: none;
  }
}
</style>
