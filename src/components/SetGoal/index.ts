// src/components/setGoal/index.ts

import { h, render } from 'vue';
import QuarterlyGoalModal from './setGoal.vue'; // Adjust path

import { http } from "@/utils/http";

// Define the structure of the payload returned by the promise
export interface GoalModalResult {
  status: 'success' | 'error' | 'closed';
  goal?: number;
  message?: string;
}

export function openGoalModal(): Promise<GoalModalResult> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let isCleaningUp = false;
    const cleanup = () => {
  if (isCleaningUp) return;
  isCleaningUp = true;
  console.log("(Service) cleanup: Unmounting component and removing container."); // Log
  render(null, container); // 卸载 Vue 实例
  requestAnimationFrame(() => { // 确保 DOM 已准备好移除
     if (container.parentNode) {
        container.parentNode.removeChild(container);
     }
  });
};

    const onCloseHandler = (payload?: GoalModalResult) => {
  console.log("(Service) onCloseHandler called with:", payload); // Log
  if (isCleaningUp) return;

  resolve(payload ?? { status: 'closed' });

 // --- Trigger cleanup after transition duration ---
 const transitionDuration = 300; // ms - 必须与 CSS 过渡时间匹配
 console.log(`(Service) Setting cleanup timeout for ${transitionDuration}ms`); // Log
 setTimeout(cleanup, transitionDuration);
 // 不再依赖 onTransitionComplete
};
    // Create VNode, passing only onClose prop
    const vnode = h(QuarterlyGoalModal, {
      onClose: onCloseHandler,
      // onTransitionComplete: () => {
      //   console.log("(Service) Transition complete."); // Optional: Add any logic needed
      // },
    });

    // Render the component
    render(vnode, container);
    console.log("(Service) Modal rendered."); // Log
  });
}

// Optional: You could add a checkGoalSet function here if needed,
// but it might be better handled within the component or where the check result is needed.
// Example:

export interface GoalStatusResult {
  isGoalSet: boolean;
  goal?: number;
  season?: string;
  message?: string; // Include message for potential API info/warnings
  isTlHasNewUntaggedMemember?: boolean; // Optional, based on your API
}

export async function checkGoalSetStatus(): Promise<GoalStatusResult> {
    try {
        // Type the expected response data structure more accurately
        const response = await http.request<{
            status: 'success' | 'error';
            currentSeason?: string; // Make optional as it might fail
            isGoalSet?: boolean;   // Make optional
            goal?: number;
            message?: string;
            isTlHasNewUntaggedMemember?: boolean; // Optional, based on your API
            
        }>('get', '/portalapi/checkGoal/'); // Use the correct API endpoint

        if (response.status === 'success' && response.currentSeason !== undefined && response.isGoalSet !== undefined) {
            // API call was successful AND returned expected structure
            return {
                isGoalSet: response.isGoalSet,
                goal: response.goal, // Will be undefined if not set, which is fine
                season: response.currentSeason,
                message: response.message // Pass along any informational message
            };
        } else {
            // API reported an error or returned unexpected data
            throw new Error(response.message || '无法获取目标状态或响应格式无效。');
        }
    } catch (error: any) {
        console.error("Error in checkGoalSetStatus:", error);
        // Re-throw a consistent error structure or message
        throw new Error(error.message || '检查目标状态时发生网络或服务器错误。');
    }
}
