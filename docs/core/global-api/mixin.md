# mixin

```javascript
import { mergeOptions } from '../util/index'

// 初始化 Mixin 方法
export function initMixin (Vue: GlobalAPI) {
  // 给 Vue 上 挂载 mixin
  Vue.mixin = function (mixin: Object) {
    // this 指 Vue，将 this.options 与传入的 mixin 进行合并
    this.options = mergeOptions(this.options, mixin)
    // 返回 Vue
    return this
  }
}
```