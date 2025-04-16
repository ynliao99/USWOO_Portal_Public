<script setup lang="ts">
import { tableData } from "./data";

const columns: TableColumnList = [
  {
    label: "日期",
    prop: "date"
  },
  {
    label: "姓名",
    prop: "name"
  },
  {
    label: "地址",
    prop: "address"
  },
  {
    label: "地址",
    prop: "add11ress"
  }
];
</script>

<template>
  <pure-table :data="tableData" :columns="columns" stripe />
</template>
