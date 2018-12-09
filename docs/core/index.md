# index
```javascript
import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

// 在构造函数 Vue 身上挂载一些属性和方法
initGlobalAPI(Vue)

// 在 Vue.prototype 上定义了 $isServer 属性，改属性代理了 isServerRendering 方法
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

// 在 Vue.prototype 上定义了 $ssrContext 属性
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    return this.$vnode && this.$vnode.ssrContext
  }
})

// 在 Vue上 定义FunctionalRenderContext静态属性（与ssr相关）
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

// 当前 Vue 的版本值，最终会被 rollup 插件替换成 process.env.VERSION || require('../package.json').version
Vue.version = '__VERSION__'

export default Vue
```