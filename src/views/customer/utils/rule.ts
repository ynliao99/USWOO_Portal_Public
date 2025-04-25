// src/views/co/utils/rule.ts
import type { FormRules } from "element-plus";
import { reactive } from "vue";

// Validation function for TBD fields (optional helper)
const checkTbdOrRequired = (rule: any, value: any, callback: Function) => {
    if (value === 'TBD') {
        callback(); // Allow 'TBD'
    } else if (!value) {
        callback(new Error(rule.message || '此项不能为空')); // Require value if not 'TBD'
    } else {
        callback();
    }
};

export const customerFormRules = reactive<FormRules>({
  community_name: [{ required: true, message: "请选择或输入公寓名称", trigger: "change" }],
  // buildingId might not need a direct rule if it's set programmatically
  // but ensure it's checked before submission if required by backend
  // buildingId: [{ required: true, message: "必须选择一个有效的公寓", trigger: "blur" }],
  address: [{ required: true, message: "请输入地址", trigger: "blur" }],
  unit: [
    // Use custom validator if 'TBD' is allowed but empty is not
    // { required: true, validator: checkTbdOrRequired, message: "请输入Unit或选择TBD", trigger: "blur" }
    // Or simple required if 'TBD' isn't strictly validated as 'filled'
    { required: true, message: "请输入Unit或选择TBD", trigger: "blur" }
  ],
  rent: [
    // { required: true, validator: checkTbdOrRequired, message: "请输入房租或选择TBD", trigger: "blur" }
    { required: true, message: "请输入房租或选择TBD", trigger: "blur" }
  ],
  concession: [
     // Make optional or required based on needs
     // { required: true, message: "请输入优惠信息或选择TBD", trigger: "blur" }
  ],
  broker_fee: [
    // { required: true, validator: checkTbdOrRequired, message: "请输入客户中介费或选择TBD", trigger: "blur" }
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
  move_in_date: [{ required: true, message: "请选择开始日期", trigger: "change" }],
  move_out_date: [{ required: true, message: "请选择结束日期", trigger: "change" }],
  last_name: [{ required: true, message: "请输入姓", trigger: "blur" }],
  first_name: [{ required: true, message: "请输入名", trigger: "blur" }],
  email: [
      { required: true, message: "请输入邮箱", trigger: "blur" },
      { type: 'email', message: '请输入有效的邮箱地址', trigger: ['blur', 'change'] }
   ],
   // Rule for uploaded_files if needed (e.g., require selection if not file_only)
//    uploaded_files: [
//       {
//         validator: (rule, value, callback, source, options) => {
//             // Access form state carefully here - it might not be directly available
//             // This might need to be handled in the component before save.
//             // Example logic (conceptual):
//             // const isFileOnly = ... get form.file_only value ...;
//             // if (!isFileOnly && (!value || value.length === 0)) {
//             //   callback(new Error('请至少选择一个文件类型'));
//             // } else {
//             //   callback();
//             // }
//             callback();
//         },
//         trigger: 'change'
//       }
//     ]
});