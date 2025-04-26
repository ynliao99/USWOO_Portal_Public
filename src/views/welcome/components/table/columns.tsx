import { ref, onMounted, reactive } from "vue";
import type { PaginationProps } from "@pureadmin/table";
import { delay } from "@pureadmin/utils";
import Empty from "./empty.svg?component";

/**
 * 修改后的 useColumns 钩子接受一个初始数据列表
 * @param initialList 合作房源数据
 */
export function useColumns(initialList: any[] = []) {
  const dataList = ref<any[]>([]);
  const loading = ref(true);

  // 更新列配置，根据 coTableData 格式定义列
  const columns: TableColumnList = [
    {
      sortable: true,
      label: "类型",
      prop: "type",
      filterMultiple: false,
      filterClassName: "pure-table-filter",
      filters: [
        { text: "转租", value: "转租" },
        { text: "拼室友", value: "拼室友" }
      ],
      filterMethod: (value, row) => row.type === value
    },
    {
      sortable: true,
      label: "经纪人",
      prop: "agent"
    },
    {
      sortable: true,
      label: "公寓/通勤地点",
      prop: "location"
    },
    {
      sortable: true,
      label: "预算",
      prop: "budget",
      // 使用 sortMethod 按数值排序
      sortMethod: (a, b) => Number(a.budget) - Number(b.budget)
    },
    {
      sortable: true,
      label: "时段",
      prop: "period"
    },
    {
      label: "需求",
      prop: "demand"
    },
    {
      label: "操作",
      fixed: "right",
      slot: "operation"
    }
  ];

  /** 分页配置：每页10项 */
  const pagination = reactive<PaginationProps>({
    pageSize: 10,
    currentPage: 1,
    layout: "prev, pager, next",
    total: 0,
    align: "center"
  });

  function onCurrentChange(page: number) {
    console.log("onCurrentChange", page);
    loading.value = true;
    delay(300).then(() => {
      loading.value = false;
    });
  }

  onMounted(() => {
    // 使用传入的初始数据（父组件传入的 coTableData）
    dataList.value = initialList;
    pagination.total = dataList.value.length;
    loading.value = false;
  });

  return {
    Empty,
    loading,
    columns,
    dataList,
    pagination,
    onCurrentChange
  };
}
