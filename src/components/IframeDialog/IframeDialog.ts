// iframeDialogService.ts
import { createVNode, render, nextTick, getCurrentInstance } from "vue";
import IframeDialog from "@/components/IframeDialog/Iframe.vue";

interface DialogOptions {
  url: string;
  title?: string;
  width?: string;
  message?: string;
  message_url?: string;
}

export function openDynamicIframeDialog(options: DialogOptions) {
  const currentInstance = getCurrentInstance();
  if (!currentInstance) {
    throw new Error("openDynamicIframeDialog() must be called inside setup()");
  }

  const container = document.createElement("div");
  document.body.appendChild(container);

  const vnode = createVNode(IframeDialog, {
    ...options,
    onClosed() {
      render(null, container);
      container.remove();
    }
  });

  // 👇 关键一步：传入当前组件的上下文，才能用 Element Plus 等全局组件
  vnode.appContext = currentInstance.appContext;

  render(vnode, container);

  nextTick(() => {
    const comp = vnode.component;
    if (!comp) return;
    comp.exposed?.open(); // 如果你在 IframeDialog.vue 里用了 expose({ open })
  });
}
