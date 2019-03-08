# resolve-slots

```javascript
import type VNode from 'core/vdom/vnode'

// 在运行工程中渲染 slot 子组件的帮助函数
export function resolveSlots (
  children: ?Array<VNode>,
  context: ?Component
): { [key: string]: Array<VNode> } {
  // 定义 slots 为空对象
  const slots = {}
  // 如果不存在 children
  if (!children) {
    // 直接将 slots 返回
    return slots
  }
  // 遍历 children
  for (let i = 0, l = children.length; i < l; i++) {
    // 将遍历到的元素保存到 child 上
    const child = children[i]
    // 将 child.data 保存到 data 上
    const data = child.data
    // 删掉在 Vue slot 节点中的 slot 标签
    if (data && data.attrs && data.attrs.slot) {
      delete data.attrs.slot
    }
    // 判断 child.context 或 child.fnContext 是否与 context 相等，并且 data.slot 不为空
    // 命名 slots 应该被对待，如果虚拟dom被在相同作用域下渲染
    if ((child.context === context || child.fnContext === context) &&
      data && data.slot != null
    ) {
      // 将 data.slot 保存为 name
      const name = data.slot
      // 如果 slots[name] 为定义，那么将其设置为一个空数组
      const slot = (slots[name] || (slots[name] = []))
      // 判断 child.tag 是否为 template
      if (child.tag === 'template') {
        slot.push.apply(slot, child.children || [])
      } else {
        // 将 child push 到 slot 中
        slot.push(child)
      }
    } else {
      // 如果不存在 data.slot，直接将 child push 到 slots.default 中
      (slots.default || (slots.default = [])).push(child)
    }
  }
  // 忽略只有空白字符的 slots 节点
  // 遍历 slots
  for (const name in slots) {
    // 如果查找到全是空白节点的slot，并且删除
    if (slots[name].every(isWhitespace)) {
      delete slots[name]
    }
  }
  // 返回 slots
  return slots
}

function isWhitespace (node: VNode): boolean {
  return (node.isComment && !node.asyncFactory) || node.text === ' '
}

// 生成作用域插槽的方法
export function resolveScopedSlots (
  fns: ScopedSlotsData, // see flow/vnode
  res?: Object
): { [key: string]: Function } {
  // 如果 res 不存在，定义成为空对象
  res = res || {}
  // 遍历 fns
  for (let i = 0; i < fns.length; i++) {
    // 判断 fns[i] 是否为数组
    if (Array.isArray(fns[i])) {
      // 如果是数组，递归调用 resolveScopedSlots
      resolveScopedSlots(fns[i], res)
    } else {
      // 如果不是数组将 fns[i].fn 赋值给 res[fns[i].key]
      res[fns[i].key] = fns[i].fn
    }
  }
  // 返回 res 
  return res
}

```