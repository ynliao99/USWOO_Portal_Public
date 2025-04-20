// rule.ts
import { reactive } from "vue";
import type { FormRules } from "element-plus";
import { $t, transformI18n } from "@/plugins/i18n";

/** 公寓表单校验 */
const aptFormRules: FormRules = reactive({
  area: [
    {
      validator: (rule, value, callback) => {
        if (value === "" || value == null) {
          callback(new Error(transformI18n($t("co.requiredArea"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  broker_fee: [
    {
      validator: (rule, value, callback) => {
        if (value === "" || value == null) {
          callback(new Error(transformI18n($t("apt.broker_fee"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  pet: [
    {
      validator: (rule, value, callback) => {
        if (value === "" || value == null) {
          callback(new Error(transformI18n($t("apt.pet"))));
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
        if (value === "" || value == null) {
          callback(new Error(transformI18n($t("apt.address"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  building_name: [
    {
      validator: (rule, value, callback) => {
        if (value === "" || value == null) {
          callback(new Error(transformI18n($t("apt.building_name"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  intl_student: [
    {
      validator: (rule, value, callback) => {
        if (value === "" || value == null) {
          callback(new Error(transformI18n($t("apt.intl_student"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  undergrad: [
    {
      validator: (rule, value, callback) => {
        if (value === "" || value == null) {
          callback(new Error(transformI18n($t("apt.undergrad"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  room_amenities: [
    {
      validator: (rule, value, callback) => {
        if (value === "" || value == null) {
          callback(new Error(transformI18n($t("apt.room_amenities"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  amenities: [
    {
      validator: (rule, value, callback) => {
        if (value === "" || value == null) {
          callback(new Error(transformI18n($t("apt.amenities"))));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ]
});

export { aptFormRules };
