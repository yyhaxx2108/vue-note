# events
```javascript
import { isDef, isUndef } from 'shared/util'
import { updateListeners } from 'core/vdom/helpers/index'
import { withMacroTask, isIE, supportsPassive } from 'core/util/index'
import { RANGE_TOKEN, CHECKBOX_RADIO_TOKEN } from 'web/compiler/directives/model'

// normalize v-model event tokens that can only be determined at runtime.
// it's important to place the event as the first in the array because
// the whole point is ensuring the v-model callback gets called before
// user-attached handlers.
function normalizeEvents (on) {
  /* istanbul ignore if */
  if (isDef(on[RANGE_TOKEN])) {
    // IE input[type=range] only supports `change` event
    const event = isIE ? 'change' : 'input'
    on[event] = [].concat(on[RANGE_TOKEN], on[event] || [])
    delete on[RANGE_TOKEN]
  }
  // This was originally intended to fix #4521 but no longer necessary
  // after 2.5. Keeping it for backwards compat with generated code from < 2.4
  /* istanbul ignore if */
  if (isDef(on[CHECKBOX_RADIO_TOKEN])) {
    on.change = [].concat(on[CHECKBOX_RADIO_TOKEN], on.change || [])
    delete on[CHECKBOX_RADIO_TOKEN]
  }
}

let target: any

// 用 once 包装函数
function createOnceHandler (handler, event, capture) {
  // 用闭包保存当前的 _target  
  const _target = target
  // 返回 onceHandler 函数
  return function onceHandler () {
    // 执行 handler，并且将其结果保存到 res
    const res = handler.apply(null, arguments)
    // 如果 res 不为 null
    if (res !== null) {
      // 执行删除方法，将事件删除调
      remove(event, onceHandler, capture, _target)
    }
  }
}

// 添加事件钩子
function add (
  event: string,
  handler: Function,
  once: boolean,
  capture: boolean,
  passive: boolean
) {
  // 用 withMacroTask 包装 handler
  handler = withMacroTask(handler)
  // 如果存在 once，再次对 handler 进行包装
  if (once) handler = createOnceHandler(handler, event, capture)
  // 注册 DOM 事件
  target.addEventListener(
    event,
    handler,
    supportsPassive
      ? { capture, passive }
      : capture
  )
}

// 删除事件
function remove (
  event: string,
  handler: Function,
  capture: boolean,
  _target?: HTMLElement
) {
  // 删除注册的 Dom 事件 
  (_target || target).removeEventListener(
    event,
    handler._withTask || handler,
    capture
  )
}

// 更新 DOM 的监听，oldVnode为旧的节点，vnode为新节点
function updateDOMListeners (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  // 如果 oldVnode.data.on 和 vnode.data.on 都没有定义
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    // 直接返回
    return
  }
  // 将 vnode.data.on 或 {} 保存到 on 上
  const on = vnode.data.on || {}
  // 将 oldOn.data.on 或 {} 保存到 oldOn 上
  const oldOn = oldVnode.data.on || {}
  // 将 vnode.elm 保存到 target 上
  target = vnode.elm
  // 序列化 on 对象, 实际上是在处理 v-model 
  normalizeEvents(on)
  // 更新事件
  updateListeners(on, oldOn, add, remove, vnode.context)
  // 重置 target
  target = undefined
}

export default {
  create: updateDOMListeners,
  update: updateDOMListeners
}

```