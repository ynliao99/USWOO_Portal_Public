// useCoRecords.tsx
import { ref, reactive, computed, onMounted } from 'vue';
import { http } from '@/utils/http';
import { message } from '@/utils/message';

export interface CoRecord {
  id: number;
  status: string;
  type: string;
  userAgentName: string;
  placeName: string;
  unit: string;
  location: string;
  area: string;
  budget: string;
  roomType: string;
  term_sd: string;
  term_ed: string;
  sex: string;
  sexRequirement: string;
  identity: string;
  demand: string;
  updated_at?: string;
  userAgentId?: string;
}

// 定义后端返回数据的类型（查询记录接口）
interface FetchRecordsResponse {
  status: 'success' | 'error';
  currentUserId: string;
  data: CoRecord[];
  message?: string;
}

interface FetcAreasResponse {
  areas?: any;
}


export function useCoRecords() {
  // 所有记录数据
  const records = ref<CoRecord[]>([]);
  const loading = ref(false);
  
  // 搜索、排序、筛选状态
  const searchTerm = ref('');
  const sortField = ref('');
  const sortOrder = ref(''); // 'asc' 或 'desc'
  const filters = reactive<Record<string, string[]>>({});

  // “只看我的”
  const onlyMine = ref(false);
  // 初始值示例，后续根据接口返回更新当前登录经纪人的ID
  const currentUserAgentId = ref('123');

  // 分页状态
  const pagination = reactive({
    currentPage: 1,
    pageSize: 10,
    total: 0,
    pageSizes: [10, 20, 40, 60]
  });

  // 新增：区域数据
  const areas = ref<string[]>([]);

  // 从后端 API 获取记录数据
  const fetchRecords = async () => {
    loading.value = true;
    try {
      const res = await http.request(
        'get',
        '/portalapi/co/',
        { params: { action: 'view' } }
      ) as FetchRecordsResponse;

      if (res && res.status === 'success' && Array.isArray(res.data)) {
        records.value = res.data;
        pagination.total = res.data.length;
        // 更新当前用户ID
        currentUserAgentId.value = res.currentUserId;
        // 如存在 updated_at 字段，按降序排序
        records.value.sort((a, b) =>
          new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime()
        );
      } else {
        message(res && res.message ? res.message : '数据格式错误', { type: 'warning' });
        records.value = [];
      }
    } catch (error) {
      console.error(error);
      message('加载数据失败', { type: 'warning' });
    } finally {
      loading.value = false;
    }
  };

  // 新增：从 /portalapi/bos_public/areas.json 获取区域数据
  const fetchAreas = async () => {
    try {
      const res = await http.request('get', '/portalapi/bos_public/areas.json') as FetcAreasResponse;
      // 假设返回数据格式为：{ areas: string[] }
      if (res && res.areas && Array.isArray(res.areas)) {
        areas.value = res.areas;
      } else {
        message('获取区域数据失败', { type: 'warning' });
      }
    } catch (error) {
      console.error(error);
      message('获取区域数据异常', { type: 'warning' });
    }
  };

  // onMounted 钩子中同时获取记录数据和区域数据
  onMounted(() => {
    fetchRecords();
    fetchAreas();
  });

  // 根据当前条件过滤数据
  const filteredRecords = computed(() => {
    let data = [...records.value];
    // “只看我的”
    if (onlyMine.value && currentUserAgentId.value) {
      data = data.filter(record => String(record.userAgentId) === currentUserAgentId.value);
    }
    // 搜索
    if (searchTerm.value) {
      const term = searchTerm.value.toLowerCase();
      data = data.filter(record =>
        Object.values(record).some(val =>
          typeof val === 'string' && val.toLowerCase().includes(term)
        )
      );
    }
    // 过滤：对 filters 中各个字段进行处理
    for (const key in filters) {
      if (filters[key].length > 0) {
        data = data.filter(record => filters[key].includes(record[key]));
      }
    }
    // 排序
    if (sortField.value) {
      data.sort((a, b) => {
        const aVal = a[sortField.value] || '';
        const bVal = b[sortField.value] || '';
        if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1;
        if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1;
        return 0;
      });
    }
    return data;
  });

  // 分页：计算当前页数据
  const paginatedRecords = computed(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredRecords.value.slice(start, start + pagination.pageSize);
  });

  // 修改搜索、排序、筛选、分页的方法
  function setSearchTerm(term: string) {
    searchTerm.value = term;
    pagination.currentPage = 1;
  }
  function setSort(field: string, order: string) {
    sortField.value = field;
    sortOrder.value = order;
    pagination.currentPage = 1;
  }
  function setFilter(key: string, values: string[]) {
    filters[key] = values;
    pagination.currentPage = 1;
  }
  function toggleOnlyMine(val: boolean) {
    onlyMine.value = val;
    pagination.currentPage = 1;
  }
  function setPage(page: number) {
    pagination.currentPage = page;
  }
  function setPageSize(size: number) {
    pagination.pageSize = size;
    pagination.currentPage = 1;
  }

  // 保存记录：新增或更新
  async function saveRecord(record: Partial<CoRecord>) {
    try {
      let res;
      if (record.id) {
        // 更新记录时需要传入 caseID
        res = await http.request('post', '/portalapi/co/', {
          params: { action: 'update' },
          data: { ...record, caseID: record.id }
        });
      } else {
        res = await http.request('post', '/portalapi/co/', {
          params: { action: 'add' },
          data: { ...record }
        });
      }
      if (res.status === 'success') {
        message(record.id ? '更新成功！' : '添加成功！', { type: 'success' });
      } else {
        message(res.message || (record.id ? '更新失败' : '添加失败'), { type: 'warning' });
      }
      fetchRecords();
      return res;
    } catch (error) {
      console.error(error);
      message('提交失败', { type: 'warning' });
      throw error;
    }
  }

  return {
    records,
    loading,
    searchTerm,
    sortField,
    sortOrder,
    filters,
    onlyMine,
    currentUserAgentId,
    areas, // 导出区域数组
    pagination,
    fetchRecords,
    filteredRecords,
    paginatedRecords,
    setSearchTerm,
    setSort,
    setFilter,
    toggleOnlyMine,
    setPage,
    setPageSize,
    saveRecord,
    fetchAreas,
  };
}
