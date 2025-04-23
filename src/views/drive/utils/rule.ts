
// rule.ts
import { reactive } from "vue";
import type { FormRules } from "element-plus";
import { $t, transformI18n } from "@/plugins/i18n";

/** 表单校验 */
const driveViewFormRules: FormRules = reactive({
  location: [
    {
      validator: (rule, value, callback) => {
        if (value === "") {
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

export { driveViewFormRules };
