// import type { FormRules } from "element-plus";
// import { $t, transformI18n } from "@/plugins/i18n";

// /** 看房表单校验 */
// const showingFormRules: FormRules = {
//   location: [
//     {
//       validator: (rule, value, callback) => {
//         if (value === "") {
//           callback(new Error(transformI18n("请输入公寓/见面地点")));
//         } else {
//           callback();
//         }
//       },
//       trigger: "blur"
//     }
//   ],
//   startTime: [
//     {
//       validator: (rule, value, callback) => {
//         if (value === "" || value === null) {
//           callback(new Error(transformI18n("请输入看房开始时间")));
//         } else {
//           callback();
//         }
//       },
//       trigger: "blur"
//     }
//   ],
//   endTime: [
//     {
//       validator: (rule, value, callback) => {
//         if (value === "" || value === null) {
//           callback(new Error(transformI18n("请输入看房结束时间")));
//         } else {
//           callback();
//         }
//       },
//       trigger: "blur"
//     }
//   ],
//   address: [
//     {
//       validator: (rule, value, callback) => {
//         if (value === "") {
//           callback(new Error(transformI18n("请输入详细地址")));
//         } else {
//           callback();
//         }
//       },
//       trigger: "blur"
//     }
//   ]
// };

// export { showingFormRules };

// rule.ts
import { reactive } from "vue";
import type { FormRules } from "element-plus";
import { $t, transformI18n } from "@/plugins/i18n";

/** 看房表单校验 */
const showingFormRules: FormRules = reactive({
  location: [
    {
      validator: (rule, value, callback) => {
        if (value === "") {
          // 使用国际化，如无对应 key 可直接写提示文本
          callback(new Error(transformI18n($t("schedule.requiredLocation"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  startTime: [
    {
      validator: (rule, value, callback) => {
        if (value === "" || value === null) {
          callback(new Error(transformI18n($t("schedule.requiredStartTime"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  endTime: [
    {
      validator: (rule, value, callback) => {
        if (value === "" || value === null) {
          callback(new Error(transformI18n($t("schedule.requiredEndTime"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  address: [
    {
      validator: (rule, value, callback) => {
        if (value === "") {
          callback(new Error(transformI18n($t("schedule.requiredAddress"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ]
});

export { showingFormRules };
