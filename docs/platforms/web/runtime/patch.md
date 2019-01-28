# patch
```javascript
import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index'
import platformModules from 'web/runtime/modules/index'

// 指令模块在会在所有构建模块都被引用后才会被用到
// platformModules 是平台化的模块调用，baseModules 是通用模块
const modules = platformModules.concat(baseModules)

// 调用 createPatchFunction，该方法传入的是包含了 nodeOps, modules 的对象
// nodeOps, modules 是和平台相关的，这里用到了函数柯里化的技巧
// 改函数会返回一个 patch 函数
export const patch: Function = createPatchFunction({ nodeOps, modules })
```