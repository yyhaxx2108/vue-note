# update-listeners

```javascript
import { warn } from 'core/util/index'
import { cached, isUndef, isPlainObject } from 'shared/util'

// 对事件名做 normalizeEvent 操作
const normalizeEvent = cached((name: string): {
  name: string,
  once: boolean,
  capture: boolean,
  passive: boolean,
  handler?: Function,
  params?: Array<any>
} => {
  // 如果事件名前面有 ‘&’，将 passive设置为true
  const passive = name.charAt(0) === '&'
  // 如果 name 存在 passive，将其第一个字符串删除
  name = passive ? name.slice(1) : name
  // 如果 name 前面有 ‘~’，将 once 设置为 true
  const once = name.charAt(0) === '~' 
  // 如果 once 为 true，删除 name 前的一个字符串
  name = once ? name.slice(1) : name
  // 如果 name 前面有 ‘!’，将 once 设置为 capture
  const capture = name.charAt(0) === '!'
  // 如果 capture 为 true，删除 name 前的一个字符串
  name = capture ? name.slice(1) : name
  // 返回 name, once, capture, passive 构成的对象
  return {
    name,
    once,
    capture,
    passive
  }
})

// 创建 FnInvoker
export function createFnInvoker (fns: Function | Array<Function>): Function {
  // 定义一个 invoker 函数
  function invoker () {
    // 将 invoker.fns 保存到 fns 上
    const fns = invoker.fns
    // 判断 fns 是否为数组 
    if (Array.isArray(fns)) {
      // 如果 fns 是数组，将 fns 复制到 cloned 上
      const cloned = fns.slice()
      // 遍历 cloned
      for (let i = 0; i < cloned.length; i++) {
        // 调用 fns 中的函数 
        cloned[i].apply(null, arguments)
      }
    } else {
      // 当 fns 不是数组，调用 fns，并且将其返回值返回
      return fns.apply(null, arguments)
    }
  }
  // 将 invoker 的 fns 设置为 fns
  invoker.fns = fns
  // 返回 invoker
  return invoker
}

// 更新事件监听
export function updateListeners (
  on: Object,
  oldOn: Object,
  add: Function,
  remove: Function,
  vm: Component
) {
  // 定义一些局部变量
  let name, def, cur, old, event
  // 遍历 on 上面的事件
  for (name in on) {
    // 将 on[name] 换成到 def 和 cur 上
    def = cur = on[name]
    // 将 oldOn[name] 换成到 old 上
    old = oldOn[name]
    // 对 name 进行 normalizeEvent 操作, 将返回值保存到 event 上
    event = normalizeEvent(name)
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler
      event.params = def.params
    }
    if (isUndef(cur)) {
      // 如果没有定义 cur，报警告
      process.env.NODE_ENV !== 'production' && warn(
        `Invalid handler for event "${event.name}": got ` + String(cur),
        vm
      )
    } else if (isUndef(old)) {
      // 如果没有定义 old，说明正在执行 create
      // 如果此时为定义 cur.fns
      if (isUndef(cur.fns)) {
        // 调用 createFnInvoker(cur)，并且将其值保存到 on[name] 和 cur 上
        cur = on[name] = createFnInvoker(cur)
      }
      // 调用 add 函数, 传入的参数有：解析后的事件名，createFnInvoker返回的函数，以及各种修饰器
      add(event.name, cur, event.once, event.capture, event.passive, event.params)
    } else if (cur !== old) {
      // 如果 cur 与 old 不相同
      // 将 cur 保存到 old.fns 上
      old.fns = cur
      // 将 old 保存到 on[name] 上
      on[name] = old
    }
  }
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name)
      remove(event.name, oldOn[name], event.capture)
    }
  }
}
```