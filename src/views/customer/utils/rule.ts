// src/views/co/utils/rule.ts
import type { FormRules } from "element-plus";
import { reactive } from "vue";

// const checkTbdOrRequired = (rule: any, value: any, callback: Function) => {
//     if (value === 'TBD') {
//         callback(); // Allow 'TBD'
//     } else if (!value) {
//         callback(new Error(rule.message || '此项不能为空')); // Require value if not 'TBD'
//     } else {
//         callback();
//     }
// };

export const customerFormRules = reactive<FormRules>({
  community_name: [
    { required: true, message: "请选择或输入公寓名称", trigger: "change" }
  ],
  address: [{ required: true, message: "请输入地址", trigger: "blur" }],
  unit: [{ required: true, message: "请输入Unit或选择TBD", trigger: "blur" }],
  rent: [{ required: true, message: "请输入房租或选择TBD", trigger: "blur" }],
  concession: [],
  broker_fee: [
    { required: true, message: "请输入客户中介费或选择TBD", trigger: "blur" }
  ],
  ll_broker_fee: [
    // { required: true, validator: checkTbdOrRequired, message: "请输入公寓中介费或选择TBD", trigger: "blur" }
    { required: true, message: "请输入公寓中介费或选择TBD", trigger: "blur" }
  ],
  term: [
    // { required: true, validator: checkTbdOrRequired, message: "请输入租期或选择TBD", trigger: "blur" }
    { required: true, message: "请输入租期或选择TBD", trigger: "blur" }
  ],
  move_in_date: [
    { required: true, message: "请选择开始日期", trigger: "change" }
  ],
  move_out_date: [
    { required: true, message: "请选择结束日期", trigger: "change" }
  ],
  last_name: [{ required: true, message: "请输入姓", trigger: "blur" }],
  first_name: [{ required: true, message: "请输入名", trigger: "blur" }],
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    {
      type: "email",
      message: "请输入有效的邮箱地址",
      trigger: ["blur", "change"]
    }
  ]
});
