<script setup lang="ts">
import { getConfig } from "@/config";

const TITLE = getConfig("Title");
</script>

<template>
  <footer
    class="layout-footer text-[rgba(0,0,0,0.6)] dark:text-[rgba(220,220,242,0.8)]"
  >
    <a target="_blank" href="https://beian.miit.gov.cn/"
      >吉ICP备2024022860号&nbsp;</a
    >
    © 2010 - 2025
    <a class="hover:text-primary" href="https://lyndons.cn" target="_blank">
      &nbsp;Lyndon's Studio.
    </a>
  </footer>
</template>

<style lang="scss" scoped>
.layout-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0 0 8px;
  font-size: 12px;
}
</style>
