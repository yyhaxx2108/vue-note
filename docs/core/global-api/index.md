# index
```javascript

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // 给构造函数添加一个只读的config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  Object.defineProperty(Vue, 'config', configDef)

  // 在 Vue.util 上暴露出工具方法，尽量不要使用
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  // Vue 上添加了三个属性分别是 set、delete、nextTick
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 在 Vue 上添加 options 对象
  Vue.options = Object.create(null)
  // 在 Vue.options 上 加上属性分别为 components,directives,filters 的空对象
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // 给Vue.options 上 添加 _base 且其值为 Vue
  Vue.options._base = Vue

  // 将 builtInComponents 的属性混合到 Vue.options.components 中, 即Vue.options.components = { KeepAlive }
  extend(Vue.options.components, builtInComponents)

  // 在 Vue 构造函数上添加 use 方法
  initUse(Vue)
  // 在 Vue 构造函数上添加 mixin 方法
  initMixin(Vue)
  // 在 Vue 构造函数上添加 extend 方法, 和cid属性
  initExtend(Vue)
  // 在 Vue 构造函数上添 component, directive, filter 方法， 用来全局注册组件，指令和过滤器
  initAssetRegisters(Vue)
}

```