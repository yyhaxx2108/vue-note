# merge-hook
```javascript
import VNode from '../vnode'
import { createFnInvoker } from './update-listeners'
import { remove, isDef, isUndef, isTrue } from 'shared/util'

export function mergeVNodeHook (def: Object, hookKey: string, hook: Function) {
  // 如果 def 是 VNode 的实例
  if (def instanceof VNode) {
    // 将 def.data.hook 保存到 def 上
    def = def.data.hook || (def.data.hook = {})
  }
  // 定义 invoker
  let invoker
  // 将 def[hookKey] 保存到 oldHook 上
  const oldHook = def[hookKey]

  // 定义 wrappedHook
  function wrappedHook () {
    // 执行真正的 hook 函数
    hook.apply(this, arguments)
    // 删除 hook 用以确保他只调用一次，避免出现内存泄露
    remove(invoker.fns, wrappedHook)
  }

  // 如果不存在 oldHook
  if (isUndef(oldHook)) {
    // 调用 createFnInvoker 创建一个 invoker
    invoker = createFnInvoker([wrappedHook])
  } else {
    // 如果定义了 oldHook.fns, 并且 oldHook.merged 为真
    if (isDef(oldHook.fns) && isTrue(oldHook.merged)) {
      // 将 oldHook 保存到 invoker 上
      invoker = oldHook
      // 给 invoker.fns push wrappedHook
      invoker.fns.push(wrappedHook)
    } else {
      // 已经存在 hook，将 [oldHook, wrappedHook] 当作参数传入，并且生成 invoker
      invoker = createFnInvoker([oldHook, wrappedHook])
    }
  }

  // 将 invoker.merged 设置为 true
  invoker.merged = true
  // 将 def[hookKey] 设置为 invoker
  def[hookKey] = invoker
}
```