# traverse

```javascript

import { _Set as Set, isObject } from '../util/index'
import type { SimpleSet } from '../util/index'
import VNode from '../vdom/vnode'

// 定义一个 new Det() 实例
const seenObjects = new Set()

// 递归地遍历对象以调用所有转换的getter，这样对象内的每个嵌套属性都被收集为“深度”依赖项。
export function traverse (val: any) {
  _traverse(val, seenObjects)
  seenObjects.clear()
}

// 遍历对象
function _traverse (val: any, seen: SimpleSet) {
  let i, keys
  // 判断 val 是否为字符串
  const isA = Array.isArray(val)
  // 如果不是数组也不是对象，或者 isFrozen，或是 VNode 的实例
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    return
  }
  // 如果存在 val.__ob__
  if (val.__ob__) {
    // 缓存 depId
    const depId = val.__ob__.dep.id
    // 如果 seen.has(depId)，则说明之前 _traverse 过当前值，直接返回
    // 解决引用死循环
    if (seen.has(depId)) {
      return
    }
    // 标识上，说明已经观测过
    seen.add(depId)
  }
  // 如果是数组
  if (isA) {
    // 循环数组并且递归 _traverse
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else {
    // 如果是对象，递归 _traverse 属性值
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen)
  }
}

```