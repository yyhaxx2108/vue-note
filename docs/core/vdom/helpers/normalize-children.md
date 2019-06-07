# normalize-children

```javascript

import VNode, { createTextVNode } from 'core/vdom/vnode'
import { isFalse, isTrue, isDef, isUndef, isPrimitive } from 'shared/util'

// 模版编译器试图在编译阶段通过静态分析 template 来达到最小化规范的需要
// 对于纯的 html 标签，完全可以跳过规范化，因为生成的 render 函数是可以保证返回 VNode 数组的
// 有一下两种情况需要重新的规范化：
// 1.当 children 中包含了 components，因为函数式组件可能返回一个数组，而不是一个根的节点。在这种情况下，只需要简单的nomalize
// 如果在数组中有任何的 child，我们只需要通过 Array.prototype.concat进行拍平，通过 normalize 后，函数式组件只会返回一个一维数组
// 这种方法不用递归考虑其子元素的子元素是否为数组，该方法只能拍平一个二维数组
export function simpleNormalizeChildren (children: any) {
  // 遍历 children
  for (let i = 0; i < children.length; i++) {
    // 如果其值为数组
    if (Array.isArray(children[i])) {
      // 调用 apply 函数，达到拍平数组的效果
      // 其中 apply 会将 children 中的每一个元素都当做 concat 的参数，即[].concat(children[0], children[1]...)
      return Array.prototype.concat.apply([], children)
    }
  }
  // 返回 children
  return children
}

// 当 children 中保护了总是生成复杂数组的构造函数，像template、slot、v-for 或者是用户手写的 render 函数
// 这种情况下需要 normalize 所有 children 值的情况
export function normalizeChildren (children: any): ?Array<VNode> {
  // 如果 children 的值是基础类型，创建一个纯文本对象并且包装成数组返回
  // 如果 children 是数组，那么调用 normalizeArrayChildren 处理，并且返回
  // 如果不是数组和基础类型，返回 undefined
  return isPrimitive(children)
    ? [createTextVNode(children)]
    : Array.isArray(children)
      ? normalizeArrayChildren(children)
      : undefined
}

// 判断节点是否为文本节点
function isTextNode (node): boolean {
  // 如果定义node，且定义了 node.text，并且 node.isComment 是 false时，说明是文本节点
  return isDef(node) && isDef(node.text) && isFalse(node.isComment)
}

// 处理 children
function normalizeArrayChildren (children: any, nestedIndex?: string): Array<VNode> {
  // 定义一个空数组并且保存到 res
  const res = []
  // 定义 i, c, lastIndex, last
  let i, c, lastIndex, last
  // 遍历 children
  for (i = 0; i < children.length; i++) {
    // 将 children[i] 保存 c
    c = children[i]
    // 如果未定义 c，或者 c 是 boolean 值，跳过本次循环
    if (isUndef(c) || typeof c === 'boolean') continue
    // 将res的倒数第一个 index，保存 lastIndex
    lastIndex = res.length - 1
    // 将 res 的后面元素保存到 last 上面
    last = res[lastIndex]
    // 处理嵌套的 children，判断 c 的类型
    if (Array.isArray(c)) {
      // 如果 c 是数组，且 c 的 长度大于 0
      if (c.length > 0) {
        // 递归调用 normalizeArrayChildren，第二个参数传入 `${nestedIndex || ''}_${i}`
        // 将其返回值保存到 c 上
        c = normalizeArrayChildren(c, `${nestedIndex || ''}_${i}`)
        // 合并相邻的文本节点
        if (isTextNode(c[0]) && isTextNode(last)) {
          // 如果 c[0] 为文本节点，且 last 也为文本节点， 以last.text 和 c[0].text 相加为文本创造文本节点
          // 将创造的文本节点保存到 res[lastIndex] 上
          res[lastIndex] = createTextVNode(last.text + (c[0]: any).text)
          // 将 c 的第一个元素推出
          c.shift()
        }
        // 将 c push 到 res 中
        res.push.apply(res, c)
      }
    } else if (isPrimitive(c)) {
      // 如果 c 是一个基础类型，判断 res 的最后一个节点是否为文本节点
      if (isTextNode(last)) {
        // 如果是文本节点
        // 合并相邻的文本节点，对于服务端渲染来说这是必要的，因为在 html 字符串中，相邻字符串是合并的
        // 将 res[lastIndex] 重新赋值为 createTextVNode(last.text + c)
        res[lastIndex] = createTextVNode(last.text + c)
      } else if (c !== '') {
        // 如果不是文本节点，且 c 不是空文本，以 c 为值创建一个文本节点并且 push 到 res 中
        res.push(createTextVNode(c))
      }
    } else {
      // 如果 c 既不是数组，也不是基础类型，判断 c 是不是文本节点对象
      if (isTextNode(c) && isTextNode(last)) {
        // 合并俩文本节点，并且创建文本节点，并且保存到 res[lastIndex] 上
        res[lastIndex] = createTextVNode(last.text + c.text)
      } else {
        // 给嵌套数组设置默认的 key 
        if (isTrue(children._isVList) &&
          isDef(c.tag) &&
          isUndef(c.key) &&
          isDef(nestedIndex)) {
          // 如果 children._isVList 为 true，且定义了c.tag、没有定义 c.key，存在nestedIndex
          // 将 `__vlist${nestedIndex}_${i}__` 保存到 c.key 上
          c.key = `__vlist${nestedIndex}_${i}__`
        }
        // 将 c push 到 res 上
        res.push(c)
      }
    }
  }
  // 返回 res
  return res
}

```