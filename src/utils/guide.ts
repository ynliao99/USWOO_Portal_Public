// src/utils/appGuide.ts
import intro from "intro.js";
import "intro.js/minified/introjs.min.css";

// 定义步骤配置的接口 (使用选择器字符串)
interface GuideStepConfig {
  elementSelector: string; // CSS 选择器
  title: string;
  intro: string;
  position?: "left" | "right" | "top" | "bottom"; // 位置可选
}

// 定义引导步骤的配置 (使用选择器字符串)
// 这些选择器需要与你启动引导时页面的 DOM 结构匹配
const GUIDE_STEP_CONFIGS: GuideStepConfig[] = [
  {
    elementSelector: ".sidebar-logo-container",
    title: "网站名称和Logo",
    intro: "USWOO Employee Portal",
    position: "right" // 根据布局调整位置
  },
  {
    elementSelector: "#header-search",
    title: "搜索菜单",
    intro: "您可以在这里搜索想要查看的菜单",
    position: "left"
  },
  {
    elementSelector: "#header-translation",
    title: "国际化",
    intro: "您可以在这里进行语言切换",
    position: "left"
  },
  {
    elementSelector: "#full-screen",
    title: "全屏",
    intro: "您可以在这里进行全屏切换",
    position: "left"
  },
  {
    elementSelector: "#header-notice",
    title: "消息通知",
    intro: "您可以在这里查看管理员发送的消息",
    position: "left"
  },
  {
    elementSelector: ".set-icon", // 假设设置图标的 CSS 类名
    title: "系统配置",
    intro: "您可以在这里查看系统配置",
    position: "left"
  },
  {
    elementSelector: ".tags-view", // 假设标签页导航的 CSS 类名
    title: "多标签页",
    intro: "这里是您访问过的页面的历史",
    position: "bottom"
  }
];

/**
 * 启动应用介绍引导 (intro.js)
 * (安全版：在运行时查找 DOM 元素)
 */
export function startAppGuide() {
  // 1. 在函数调用时，根据配置中的选择器查找元素
  const steps = GUIDE_STEP_CONFIGS.map(config => {
    try {
      // 实时查找元素
      const element = document.querySelector(config.elementSelector);
      if (element) {
        // 找到元素，创建 intro.js 需要的步骤对象
        return {
          element: element as HTMLElement, // 明确是 HTMLElement
          title: config.title,
          intro: config.intro,
          position: config.position
        };
      } else {
        // 找不到元素，打印警告并返回 null
        console.warn(
          `引导步骤 "${config.title}" 跳过：未找到元素 (选择器: ${config.elementSelector})`
        );
        return null;
      }
    } catch (error) {
      // 处理无效的选择器错误
      console.error(
        `引导步骤 "${config.title}" 出错：无效的选择器 "${config.elementSelector}"`,
        error
      );
      return null;
    }
  }).filter(step => step !== null); // 过滤掉所有失败的步骤 (找不到元素或选择器错误)

  // 2. 检查是否还有有效的步骤
  if (steps.length === 0) {
    console.error(
      "无法启动引导：没有找到任何有效的引导目标元素。请检查选择器和页面结构。"
    );
    // 可以给用户一个界面提示，例如使用 ElMessage
    // import { ElMessage } from 'element-plus';
    // ElMessage.warning("当前页面无法启动引导。");
    return; // 如果没有有效步骤，则不启动引导
  }

  // 3. 使用有效的步骤配置并启动 intro.js
  intro()
    .setOptions({
      steps: steps, // 传递最终有效的步骤数组
      // --- 其他 intro.js 配置 ---
      nextLabel: "下一步 &rarr;", // 使用 HTML 实体显示箭头
      prevLabel: "&larr; 上一步",
      doneLabel: "完成",
      tooltipClass: "custom-intro-tooltip", // 自定义样式类 (可选)
      exitOnOverlayClick: true, // 点击遮罩层退出 (可选)
      showProgress: true // 显示进度条 (可选)
      // 更多选项参考 intro.js 文档: https://introjs.com/docs/intro/options
    })
    .start();
}

// 如果需要，可以在此文件添加其他与引导相关的工具函数
