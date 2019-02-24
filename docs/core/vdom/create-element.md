# create-element

```javascript
import config from '../config'
import VNode, { createEmptyVNode } from './vnode'
import { createComponent } from './create-component'
import { traverse } from '../observer/traverse'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject,
  isPrimitive,
  resolveAsset
} from '../util/index'

import {
  normalizeChildren,
  simpleNormalizeChildren
} from './helpers/index'

// 用于 children normalize 方法选择
const SIMPLE_NORMALIZE = 1
const ALWAYS_NORMALIZE = 2

// createElement 的包装函数，可以格式化参数，让参数传递更灵活
export function createElement (
  context: Component,
  tag: any,
  data: any,
  children: any,
  normalizationType: any,
  alwaysNormalize: boolean
): VNode | Array<VNode> {
  // 将传入的参数重新整理
  // 如果 data 是数组或是原始类型，将 data 之后的参数后移
  if (Array.isArray(data) || isPrimitive(data)) {
    // 将 normalizationType 赋值 children
    normalizationType = children
    // 将 children 赋值为 data
    children = data
    // 将 data 设置为 undefined
    data = undefined
  }
  // 判读 alwaysNormalize 全等于 true
  if (isTrue(alwaysNormalize)) {
    // 将 normalizationType 设置为 2
    normalizationType = ALWAYS_NORMALIZE
  }
  // 调用 _createElement 并且将其值返回，真正的创建 VNode 的方法
  return _createElement(context, tag, data, children, normalizationType)
}

// 真正创建 VNode 的方法
export function _createElement (
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  // 如果 data 已经定义，且存在 data.__ob__, 说明存在响应式 data
  if (isDef(data) && isDef(data.__ob__)) {
    // 报警告，不能使用响应式的 data 作为 vnode data
    process.env.NODE_ENV !== 'production' && warn(
      `Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n` +
      'Always create fresh vnode data objects in each render!',
      context
    )
    // 创建一个空白注释节点，并且返回
    return createEmptyVNode()
  }
  // 如果定义了 data，且定义了 data.is 说明该组件式动态的
  if (isDef(data) && isDef(data.is)) {
    // 将 tag 重新赋值为 data.is 的值
    tag = data.is
  }
  // 如果 tag 不为真，即 :is 是一个 falsy value
  if (!tag) {
    // 创建一个空白注释节点，并且返回
    return createEmptyVNode()
  }
  // 反对使用非基础类型的 key 
  if (process.env.NODE_ENV !== 'production' &&
    isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    // 在非 weex 环境中，或 data.key 存在 @binding
    // 如果定义了 data.key，但是 data.key 不是基础类型，报警告
    if (!__WEEX__ || !('@binding' in data.key)) {
      // 避免使用非基础属性的 key 
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      )
    }
  }
  // 支持单函数 chilren 作为默认的 scoped slot
  // 如果 children 为数组，并且第一个元素是 function
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    // data 如果不存在，将其值变成空对象
    data = data || {}
    // 将 data.scopedSlots 赋值为 { default: children[0] }
    data.scopedSlots = { default: children[0] }
    // 将 children 清空
    children.length = 0
  }
  // 判断 normalizationType 的值，然后使用不同的方法处理 chilren 
  if (normalizationType === ALWAYS_NORMALIZE) {
    // 如果为 ALWAYS_NORMALIZE，调用 normalizeChildren 处理 children
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    // 如果为 SIMPLE_NORMALIZE simpleNormalizeChildren 处理 children
    children = simpleNormalizeChildren(children)
  }
  // 定义 vnode、ns
  let vnode, ns
  // 判断 tag 是否为字符串
  if (typeof tag === 'string') {
    // 定义一个 Ctor
    let Ctor
    // 如果存在 context.$vnode.ns，将 context.$vnode.ns 赋值给 ns。否则用 config.getTagNamespace 获取 ns
    // 这里会给 svg 或 math 标签填上作用域
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
    // 判断 tag 是否保留标签
    if (config.isReservedTag(tag)) {
      // 创建一个平台保留标签，config.parsePlatformTagName 即 identity 函数，改函数的作用是返回传入参数
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // 如果不存在 data 或 data.pre为 false，并且 resolveAsset(context.$options, 'components', tag) 为真
      // 创建一个组件 vnode
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else {
    // 如果不是字符串，说明是 options/constructor，直接调用 createComponent 创建组件
    vnode = createComponent(tag, data, context, children)
  }
  if (Array.isArray(vnode)) {
    return vnode
  } else if (isDef(vnode)) {
    if (isDef(ns)) applyNS(vnode, ns)
    if (isDef(data)) registerDeepBindings(data)
    return vnode
  } else {
    return createEmptyVNode()
  }
}

function applyNS (vnode, ns, force) {
  vnode.ns = ns
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    ns = undefined
    force = true
  }
  if (isDef(vnode.children)) {
    for (let i = 0, l = vnode.children.length; i < l; i++) {
      const child = vnode.children[i]
      if (isDef(child.tag) && (
        isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
        applyNS(child, ns, force)
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
function registerDeepBindings (data) {
  if (isObject(data.style)) {
    traverse(data.style)
  }
  if (isObject(data.class)) {
    traverse(data.class)
  }
}

```