# index

```javascript

import Vue from 'core/index'
import config from 'core/config'
import { extend, noop } from 'shared/util'
import { mountComponent } from 'core/instance/lifecycle'
import { devtools, inBrowser, isChrome } from 'core/util/index'

import {
  query,
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement
} from 'web/util/index'

import { patch } from './patch'
import platformDirectives from './directives/index'
import platformComponents from './components/index'

// 必须使用属性的标签
Vue.config.mustUseProp = mustUseProp
// 判读是否为原生html标签，或者svg标签
Vue.config.isReservedTag = isReservedTag
// 是否为 html 保留的属性
Vue.config.isReservedAttr = isReservedAttr
// 获取组件作用域
Vue.config.getTagNamespace = getTagNamespace
// 是否为未知节点
Vue.config.isUnknownElement = isUnknownElement

// 给Vue.options 上面挂载上model、show两个指令
extend(Vue.options.directives, platformDirectives)
// 给Vue.options 上面加上Transition、TransitionGroup两个组件，在之前已经挂载上了KeepAlive组件
extend(Vue.options.components, platformComponents)

// 在浏览器环境中，给Vue.prototype 加上 __patch__  方法
Vue.prototype.__patch__ = inBrowser ? patch : noop

// 给 Vue.prototype 加上 $mount 方法
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}

// vue-devtools 和 开发环境等相关
if (inBrowser) {
  setTimeout(() => {
    if (config.devtools) {
      if (devtools) {
        devtools.emit('init', Vue)
      } else if (
        process.env.NODE_ENV !== 'production' &&
        process.env.NODE_ENV !== 'test' &&
        isChrome
      ) {
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n' +
          'https://github.com/vuejs/vue-devtools'
        )
      }
    }
    if (process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test' &&
      config.productionTip !== false &&
      typeof console !== 'undefined'
    ) {
      console[console.info ? 'info' : 'log'](
        `You are running Vue in development mode.\n` +
        `Make sure to turn on production mode when deploying for production.\n` +
        `See more tips at https://vuejs.org/guide/deployment.html`
      )
    }
  }, 0)
}

export default Vue

```