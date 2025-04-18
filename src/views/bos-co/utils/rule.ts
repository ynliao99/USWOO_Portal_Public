// rule.ts
import { reactive } from "vue";
import type { FormRules } from "element-plus";
import { $t, transformI18n } from "@/plugins/i18n";

/** 看房表单校验 */
const coFormRules: FormRules = reactive({
  status: [
    {
      validator: (rule, value, callback) => {
        if (value === "") {
          callback(new Error(transformI18n($t("co.requiredStatus"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  type: [
    {
      validator: (rule, value, callback) => {
        if (value === "") {
          callback(new Error(transformI18n($t("co.requiredType"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  placeName: [
    {
      validator: (rule, value, callback) => {
        if (value === "") {
          callback(new Error(transformI18n($t("co.requiredPlaceName"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  location: [
    {
      validator: (rule, value, callback) => {
        if (value === "") {
          callback(new Error(transformI18n($t("co.requiredLocation"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  area: [
    {
      validator: (rule, value, callback) => {
        if (value === "") {
          callback(new Error(transformI18n($t("co.requiredArea"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  budget: [
    {
      validator: (rule, value, callback) => {
        if (value === "") {
          callback(new Error(transformI18n($t("co.requiredBudget"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  roomType: [
    {
      validator: (rule, value, callback) => {
        if (!Array.isArray(value) || value.length === 0) {
          callback(new Error(transformI18n($t("co.requiredRoomType"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  dateRange: [
    {
      validator: (rule, value, callback) => {
        if (!value || value.length !== 2 || !value[0] || !value[1]) {
          callback(new Error(transformI18n($t("co.requiredDateRange"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  sex: [
    {
      validator: (rule, value, callback) => {
        if (value === "") {
          callback(new Error(transformI18n($t("co.requiredSex"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  sexRequirement: [
    {
      validator: (rule, value, callback) => {
        if (value === "") {
          callback(new Error(transformI18n($t("co.requiredSexRequirement"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  identity: [
    {
      validator: (rule, value, callback) => {
        if (value === "") {
          callback(new Error(transformI18n($t("co.requiredIdentity"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ]
});

export { coFormRules };
