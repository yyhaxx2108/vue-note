# node-ops
web 环境下操作 Dom 的一些方法

```javascript
import { namespaceMap } from 'web/util/index'

// 创建一个标签节点
export function createElement (tagName: string, vnode: VNode): Element {
  // 创建一个空的 tagName 节点
  const elm = document.createElement(tagName)
  // 如果 tagName 不是 select 直接返回
  if (tagName !== 'select') {
    return elm
  }
  // 在 select 中，如果 vnode.data.attrs.multiple 不是 undefined，则为 elm 设置 multiple 标签
  if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
    elm.setAttribute('multiple', 'multiple')
  }
  // 将 elm 返回
  return elm
}

// 创建一个带有作用域的标签节点
export function createElementNS (namespace: string, tagName: string): Element {
  // namespaceMap 包括 svg: 'http://www.w3.org/2000/svg'和math: 'http://www.w3.org/1998/Math/MathML'
  return document.createElementNS(namespaceMap[namespace], tagName)
}

// 创建一个文本节点
export function createTextNode (text: string): Text {
  // 返回创建好的文本节点
  return document.createTextNode(text)
}

// 创建一个注释节点
export function createComment (text: string): Comment {
  // 返回创建好的注释节点
  return document.createComment(text)
}

// 
export function insertBefore (parentNode: Node, newNode: Node, referenceNode: Node) {
  parentNode.insertBefore(newNode, referenceNode)
}

export function removeChild (node: Node, child: Node) {
  node.removeChild(child)
}

export function appendChild (node: Node, child: Node) {
  node.appendChild(child)
}

// 返回 node 的父节点对象
export function parentNode (node: Node): ?Node {
  return node.parentNode
}

// 返回node的下一个节点
export function nextSibling (node: Node): ?Node {
  // 改节点即可能是 dom 也可能是文本节点，注释节点等
  return node.nextSibling
}

// 返回 dom 的 tagName，这里的 tagName 为大写
export function tagName (node: Element): string {
  return node.tagName
}

export function setTextContent (node: Node, text: string) {
  node.textContent = text
}

export function setStyleScope (node: Element, scopeId: string) {
  node.setAttribute(scopeId, '')
}
```