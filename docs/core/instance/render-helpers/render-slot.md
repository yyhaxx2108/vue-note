# render-slot

```javascript
import { extend, warn, isObject } from 'core/util/index'

// slot 的运行时函数, 返回一个 VNode 节点对象数组
export function renderSlot (
  // 插槽名称
  name: string,
  // 默认组件
  fallback: ?Array<VNode>,
  props: ?Object,
  bindObject: ?Object
): ?Array<VNode> {
  // 获取 scopedSlotFn 方法
  const scopedSlotFn = this.$scopedSlots[name]
  // 定义 nodes
  let nodes
  if (scopedSlotFn) { // scoped slot
    props = props || {}
    if (bindObject) {
      if (process.env.NODE_ENV !== 'production' && !isObject(bindObject)) {
        warn(
          'slot v-bind without argument expects an Object',
          this
        )
      }
      props = extend(extend({}, bindObject), props)
    }
    nodes = scopedSlotFn(props) || fallback
  } else {
    // 将 nodes 赋值为 this.$slots[name] 或 fallback
    nodes = this.$slots[name] || fallback
  }

  const target = props && props.slot
  // 判读是否存在 props.slot
  if (target) {
    return this.$createElement('template', { slot: target }, nodes)
  } else {
    // 如果不存在，直接将 nodes 返回
    return nodes
  }
}
```