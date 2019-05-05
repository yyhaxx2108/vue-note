# proxy
```javascript
 
import config from 'core/config'
import { warn, makeMap, isNative } from '../util/index'

// 初始化 initProxy
let initProxy

if (process.env.NODE_ENV !== 'production') {
  // 存储所允许的全局对象类型映射表, 具体形式是{Infinity: true, undefined: true....}
  // 其中 require 是 为了 Webpack/Browserify 设计的
  const allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
    'require' 
  )

  // 断言 target 是否初始化
  const warnNonPresent = (target, key) => {
    warn(
      `Property or method "${key}" is not defined on the instance but ` +
      'referenced during render. Make sure that this property is reactive, ' +
      'either in the data option, or for class-based components, by ' +
      'initializing the property. ' +
      'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.',
      target
    )
  }

  // 以 _ 或 $ 开头的属性不会被 Vue 实例代理，因为它们可能和 Vue 内置的属性、API 方法冲突。
  // 你可以使用例如 vm.$data._property 的方式访问这些属性
  const warnReservedPrefix = (target, key) => {
    warn(
      `Property "${key}" must be accessed with "$data.${key}" because ` +
      'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
      'prevent conflicts with Vue internals' +
      'See: https://vuejs.org/v2/api/#data',
      target
    )
  }

  // 判断 Proxy 是否还是浏览器原生方法
  const hasProxy =
    typeof Proxy !== 'undefined' && isNative(Proxy)

  if (hasProxy) {
    // 构建 isBuiltInModifier 的映射表
    const isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact')
    // 对config.keyCodes对象进行了代理，其意义在于禁止用户修改Vue内建的一些按键值，
    // 如不能进行 config.keyCodes.stop = '11' 这种操作
    config.keyCodes = new Proxy(config.keyCodes, {
      set (target, key, value) {
        if (isBuiltInModifier(key)) {
          warn(`Avoid overwriting built-in modifier in config.keyCodes: .${key}`)
          return false
        } else {
          target[key] = value
          return true
        }
      }
    })
  }

  const hasHandler = {
    has (target, key) {
      // 是否存在在 target 上，has 可以拦截 with 语句块里对变量的访问
      const has = key in target
      // 是否是被允许访问的key，即 allowedGlobals(key) 或者 
      // (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data)) 比如_c等
      const isAllowed = allowedGlobals(key) ||
        (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data))
      if (!has && !isAllowed) {
        // 如果不在 target 上，但是是允许访问的keys，那么报 warnReservedPrefix 警告
        // 如果即不在 target 上，又不是允许访问的keys，那么报 warnNonPresent 警告
        if (key in target.$data) warnReservedPrefix(target, key)
        else warnNonPresent(target, key)
      }
      return has || !isAllowed
    }
  }

  const getHandler = {
    get (target, key) {
      // 如果 key 只存在在 target.$data 上，那么报 warnReservedPrefix 警告
      // 如果 key 不是字符串或不存在在target和target.$data上，直接报 warnNonPresent 警告
      if (typeof key === 'string' && !(key in target)) {
        if (key in target.$data) warnReservedPrefix(target, key)
        else warnNonPresent(target, key)
      }
      return target[key]
    }
  }

  // 将 vm 进行代理，对对象访问进行劫持
  initProxy = function initProxy (vm) {
    // 判断浏览器是否支持代理
    if (hasProxy) {
      // vm.$options 的引用
      const options = vm.$options
      // 如果 options.render._withStripped 为 true，那么就是 getHandler，否值就是 hasHandler
      // 当手写 render 函数时，为了捕获到错误，需要手动将 render._withStripped 设置为 true
      const handlers = options.render && options.render._withStripped
        ? getHandler
        : hasHandler
      // 对 vm 进行代理，并且赋值给 vm._renderProxy
      vm._renderProxy = new Proxy(vm, handlers)
    } else {
      // 如果不存在原生的 Proxy，那么直接将vm._renderProxy 赋值成 vm
      vm._renderProxy = vm
    }
  }
}

// 导出 initProxy，initProxy是个函数
export { initProxy }

```