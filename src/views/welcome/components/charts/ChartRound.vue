<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useDark, useECharts } from "@pureadmin/utils";

// 定义 props，接受 percent 参数（类型为 any，后续转为数字）
const props = defineProps<{ percent?: any }>();

// 如果没有传入，则默认 100
const percentValue = computed(() => {
  const val = props.percent;
  return typeof val === "number" ? val : Number(val) || 100;
});

const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

const chartRef = ref();
const { setOptions } = useECharts(chartRef, {
  theme,
  renderer: "svg"
});

// 定义一个更新图表选项的函数
function updateChart() {
  setOptions({
    // 注意：这里移除了 container 属性，让 useECharts 自动把选项应用到 chartRef 对应的 DOM
    title: {
      text: percentValue.value.toFixed(0) + "%",
      left: "47%",
      top: "30%",
      textAlign: "center",
      textStyle: {
        fontSize: "16",
        fontWeight: 600
      }
    },
    polar: {
      radius: ["100%", "90%"],
      center: ["50%", "50%"]
    },
    angleAxis: {
      max: 100,
      show: false
    },
    radiusAxis: {
      type: "category",
      show: true,
      axisLabel: {
        show: false
      },
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      }
    },
    series: [
      {
        type: "bar",
        roundCap: true,
        barWidth: 2,
        showBackground: true,
        backgroundStyle: {
          color: "#dfe7ef"
        },
        // 使用传入的百分比更新 series 数据
        data: [percentValue.value],
        coordinateSystem: "polar",
        color: "#7846e5",
        itemStyle: {
          shadowBlur: 2,
          shadowColor: "#7846e5",
          shadowOffsetX: 0,
          shadowOffsetY: 0
        }
      }
    ]
  });
}

// 初始调用
updateChart();

// 监听 percentValue 变化，动态更新图表
watch(percentValue, () => {
  updateChart();
});
</script>

<template>
  <div ref="chartRef" style="width: 100%; height: 60px" />
</template>
