# resolve-async-component

```javascript
import {
  warn,
  once,
  isDef,
  isUndef,
  isTrue,
  isObject,
  hasSymbol
} from 'core/util/index'

import { createEmptyVNode } from 'core/vdom/vnode'

// 确保存在子组件构造对象
function ensureCtor (comp: any, base) {
  // 如果 comp 是 es 模块
  if (
    comp.__esModule ||
    (hasSymbol && comp[Symbol.toStringTag] === 'Module')
  ) {
    // 将 comp.default 赋值给 comp
    comp = comp.default
  }
  // 如果 comp 是普通对象，返回 extend 后的构造对象，否则直接返回 comp
  return isObject(comp)
    ? base.extend(comp)
    : comp
}

// 创建异步组件占位节点
export function createAsyncPlaceholder (
  factory: Function,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag: ?string
): VNode {
  // 创建一个空节点
  const node = createEmptyVNode()
  // 将 factory 保存到 node.asyncFactory
  node.asyncFactory = factory
  // 将 data, context, children, tag 组装成对象，并且保存到 node.asyncMeta 上
  node.asyncMeta = { data, context, children, tag }
  // 返回 node
  return node
}

export function resolveAsyncComponent (
  factory: Function,
  baseCtor: Class<Component>,
  context: Component
): Class<Component> | void {
  // 如果 factory.error 真，且定义了 factory.errorComp
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    // 返回 factory.errorComp
    return factory.errorComp
  }
  // 如果定义了 factory.resolved，说明已经缓存了解析
  if (isDef(factory.resolved)) {
    // 直接返回 factory.resolved
    return factory.resolved
  }

  // 如果 factory.loading 为真，并且定义了 factory.loadingComp
  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    // 返回 factory.loadingComp
    return factory.loadingComp
  }

  // 判读是否定义了 factory.contexts
  if (isDef(factory.contexts)) {
    // 如果定义了 factory.contexts，将 context push到 factory.contexts 中
    factory.contexts.push(context)
  } else {
    // 如果没有定义 factory.contexts
    // 将 [context] 保存到 factory.contexts 上
    const contexts = factory.contexts = [context]
    // 定义 sync 为 true
    let sync = true

    // 强制渲染函数
    const forceRender = (renderCompleted: boolean) => {
      // 遍历 contexts，并且调用 contexts[i].$forceUpdate()
      for (let i = 0, l = contexts.length; i < l; i++) {
        // 调用 contexts[i].$forceUpdate()
        contexts[i].$forceUpdate()
      }

      // 如果 renderCompleted 为真
      if (renderCompleted) {
        // 清空数组
        contexts.length = 0
      }
    }

    // 通过 once 包装一个 resolve 函数，参数 res 其实就是组件定义对象
    const resolve = once((res: Object | Class<Component>) => {
      // 调用 ensureCtor(res, baseCtor) 生成组件构造函数，并缓存到 factory.resolved
      factory.resolved = ensureCtor(res, baseCtor)
      // 只有当不是异步解析的时候调用回调函数
      // 异步解析会被当作同步解析在 SSR 中
      if (!sync) {
        // 如果 sync 为 false，调用 forceRender 函数，强制渲染
        forceRender(true)
      }
    })

    const reject = once(reason => {
      process.env.NODE_ENV !== 'production' && warn(
        `Failed to resolve async component: ${String(factory)}` +
        (reason ? `\nReason: ${reason}` : '')
      )
      if (isDef(factory.errorComp)) {
        factory.error = true
        forceRender(true)
      }
    })

    // 执行 factory，将前面包装好的 resolve 和 reject 当作参数传入
    const res = factory(resolve, reject)

    if (isObject(res)) {
      if (typeof res.then === 'function') {
        // () => Promise
        if (isUndef(factory.resolved)) {
          res.then(resolve, reject)
        }
      } else if (isDef(res.component) && typeof res.component.then === 'function') {
        res.component.then(resolve, reject)

        if (isDef(res.error)) {
          factory.errorComp = ensureCtor(res.error, baseCtor)
        }

        if (isDef(res.loading)) {
          factory.loadingComp = ensureCtor(res.loading, baseCtor)
          if (res.delay === 0) {
            factory.loading = true
          } else {
            setTimeout(() => {
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true
                forceRender(false)
              }
            }, res.delay || 200)
          }
        }

        if (isDef(res.timeout)) {
          setTimeout(() => {
            if (isUndef(factory.resolved)) {
              reject(
                process.env.NODE_ENV !== 'production'
                  ? `timeout (${res.timeout}ms)`
                  : null
              )
            }
          }, res.timeout)
        }
      }
    }

    // 将 sync 设置为 false
    sync = false
    // return in case resolved synchronously
    return factory.loading
      ? factory.loadingComp
      : factory.resolved
  }
}
```