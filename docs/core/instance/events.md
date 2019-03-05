# events

```javascript
import {
  tip,
  toArray,
  hyphenate,
  handleError,
  formatComponentName
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

export function initEvents (vm: Component) {
  // vm._events 初始化成一个空对象
  vm._events = Object.create(null)
  // vm._hasHookEvent 初始化成false
  vm._hasHookEvent = false
  // 这是在初始化 parent 中附加的 listeners
  const listeners = vm.$options._parentListeners
  if (listeners) {
    // 调用 updateComponentListeners
    updateComponentListeners(vm, listeners)
  }
}

let target: any

// 定义 add 方法
function add (event, fn, once) {
  // 判断 once
  if (once) {
    // 如果 once 为真，调用target.$once
    target.$once(event, fn)
  } else {
    // 如果 once 为假，调用target.$on
    target.$on(event, fn)
  }
}

// 定义 remove 方法 
function remove (event, fn) {
  // 调用target.$off
  target.$off(event, fn)
}

// 更新组件的事件
export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  // 将全局维护的 target 赋值成为 vm
  target = vm
  // 调用 updateListeners 函数，传入的 add 和 remove 均为自定义方法
  updateListeners(listeners, oldListeners || {}, add, remove, vm)
  // 重新将 target 设置为 undefined
  target = undefined
}

// 混入事件
export function eventsMixin (Vue: Class<Component>) {
  // 定义 hook 正则
  const hookRE = /^hook:/
  // 在 Vue.prototype 上定义了 $on 方法, event 为事件名称，可以是字符串或是数组，fn 为回调函数
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    // 用 vm 保留当前实例的引用
    const vm: Component = this
    // 判断 event 是否为数组
    if (Array.isArray(event)) {
      // 如果 event 是数组，对其进行遍历
      for (let i = 0, l = event.length; i < l; i++) {
        // 调用 vm.$on
        vm.$on(event[i], fn)
      }
    } else {
      // 如果传入的 event 不是数组，调用将其 push 到 vm._events[event] 数组中
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // 使用注册时标记的布尔标志，而不是哈希查找优化钩子：事件开销
      if (hookRE.test(event)) {
        // 将 vm._hasHookEvent 设置为 true
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  // 在 Vue.prototype 上定义了 $once 方法
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    // 保存当前实例的引用
    const vm: Component = this
    // 定义 on 方法
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    // 设置 on.fn = fn
    on.fn = fn
    // 将包装好的事件进行绑定
    vm.$on(event, on)
    // 返回当前实例
    return vm
  }

  // 在 Vue.prototype 上定义了 $off 方法, 对注册的事件进行销毁
  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    // 保存当前实例
    const vm: Component = this
    // 如果没有传入参数，销毁掉所有的事件
    if (!arguments.length) {
      // 将 vm._events 设置为空对象
      vm._events = Object.create(null)
      // 返回 vm 
      return vm
    }
    // 如果传入的是事件数组
    if (Array.isArray(event)) {
      // 遍历事件数组
      for (let i = 0, l = event.length; i < l; i++) {
        // 将传入的数组依次进行解绑
        vm.$off(event[i], fn)
      }
      // 返回 vm
      return vm
    }
    // 具体的事件
    // 读取事件绑定的回调并且保存到 cbs 上
    const cbs = vm._events[event]
    // 如果没有回调
    if (!cbs) {
      // 直接返回 vm
      return vm
    }
    // 如果没有传入 fn
    if (!fn) {
      // 将 vm._events[event] 设置为 null
      vm._events[event] = null
      // 返回 vm
      return vm
    }
    // 如果传入了 fn, 说明要删除具体的回调
    if (fn) {
      // 定义 cb
      let cb
      // 将 cbs.length 保存到 i 上
      let i = cbs.length
      // 对 cbs 进行遍历
      while (i--) {
        // 缓存 cbs[i]
        cb = cbs[i]
        // 如果 cb === fn || cb.fn === fn
        if (cb === fn || cb.fn === fn) {
          // 对 cb 进行删除
          cbs.splice(i, 1)
          // 跳出循环
          break
        }
      }
    }
    // 返回 vm 实例
    return vm
  }

  // 在 Vue.prototype 上定义了 $emit 方法, 执行注册的事件
  Vue.prototype.$emit = function (event: string): Component {
    // 用 vm 保存当前的组件实例
    const vm: Component = this
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase()
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    // 读取 event 的回调函数数组
    let cbs = vm._events[event]
    // 如果存在 cbs
    if (cbs) {
      // 转为真正的数组
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      // 将传入的参数转化为真正的数组
      const args = toArray(arguments, 1)
      // 遍历 cbs
      for (let i = 0, l = cbs.length; i < l; i++) {
        try {
          // 尝试调用当前方法
          cbs[i].apply(vm, args)
        } catch (e) {
          // 处理错误
          handleError(e, vm, `event handler for "${event}"`)
        }
      }
    }
    // 返回 vm
    return vm
  }
}
```
