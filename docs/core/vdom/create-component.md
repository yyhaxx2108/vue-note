# create-component

```javascript

import VNode from './vnode'
import { resolveConstructorOptions } from 'core/instance/init'
import { queueActivatedComponent } from 'core/observer/scheduler'
import { createFunctionalComponent } from './create-functional-component'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject
} from '../util/index'

import {
  resolveAsyncComponent,
  createAsyncPlaceholder,
  extractPropsFromVNodeData
} from './helpers/index'

import {
  callHook,
  activeInstance,
  updateChildComponent,
  activateChildComponent,
  deactivateChildComponent
} from '../instance/lifecycle'

import {
  isRecyclableComponent,
  renderRecyclableComponentTemplate
} from 'weex/runtime/recycle-list/render-component-template'

// inline hooks to be invoked on component VNodes during patch
const componentVNodeHooks = {
  // 创建一个 Vue 的实例，并且调用 $mount 进行挂载
  init (vnode: VNodeWithData, hydrating: boolean): ?boolean {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      const mountedNode: any = vnode // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode)
    } else {
      // 调用 createComponentInstanceForVnode 创建一个实例
      // activeInstance 为当前正在渲染的实例的引用
      const child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      )
      // 手动挂载这个实例
      child.$mount(hydrating ? vnode.elm : undefined, hydrating)
    }
  },

  // 预 patch
  prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
    // 将 vnode.componentOptions 保存到 options 上
    const options = vnode.componentOptions
    // 将 oldVnode.componentInstance 保存到 vnode.componentInstance 上
    const child = vnode.componentInstance = oldVnode.componentInstance
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    )
  },

  insert (vnode: MountedComponentVNode) {
    // 将 context 和 componentInstance 保存下来
    const { context, componentInstance } = vnode
    // 如果 !componentInstance._isMounted 说明该组件实例还没有挂载，进行挂载处理
    if (!componentInstance._isMounted) {
      // 将是已经挂载的标记设置为 true
      componentInstance._isMounted = true
      // 调用 mounted 方法
      callHook(componentInstance, 'mounted')
    }
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
        queueActivatedComponent(componentInstance)
      } else {
        activateChildComponent(componentInstance, true /* direct */)
      }
    }
  },

  destroy (vnode: MountedComponentVNode) {
    const { componentInstance } = vnode
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        componentInstance.$destroy()
      } else {
        deactivateChildComponent(componentInstance, true /* direct */)
      }
    }
  }
}

// 该数组的值是 [init, prepatch, insert,destroy]
const hooksToMerge = Object.keys(componentVNodeHooks)

// 创建组件 Vnode
export function createComponent (
  Ctor: Class<Component> | Function | Object | void,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag?: string
): VNode | Array<VNode> | void {
  // 如果没有传入 Ctor 直接 return
  if (isUndef(Ctor)) {
    return
  }

  // 将 Vue 或者其扩展保存到 baseCtor 上
  const baseCtor = context.$options._base

  // 如果 Ctor 是纯对象，将其转化成 constructor
  if (isObject(Ctor)) {
    // 调用 Vue.extend 方法实现，该方法会返回 Sub，继承Vue 的 构造函数
    Ctor = baseCtor.extend(Ctor)
  }

  // if at this stage it's not a constructor or an async component factory,
  // reject.
  // 如果 Ctor 不是一个函数，那说明 vue.extends 返回值出现错误
  if (typeof Ctor !== 'function') {
    if (process.env.NODE_ENV !== 'production') {
      // 报警告，组件定义不正确
      warn(`Invalid Component definition: ${String(Ctor)}`, context)
    }
    return
  }

  // 异步组件
  let asyncFactory
  // 如果没有定义 Ctor.cid，则说明是异步组件
  if (isUndef(Ctor.cid)) {
    // 将 Ctor 保存到 asyncFactory 上
    asyncFactory = Ctor
    // 解析异步组件
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor, context)
    // 如果 Ctor 是 undefined
    if (Ctor === undefined) {
      // 返回异步组件的占位符节点，该节点呈现为注释节点，但保留该节点的所有原始信息。
      // 这些信息将会被用在异步的服务器渲染中
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }
  }

  data = data || {}

  // resolve constructor options in case global mixins are applied after
  // component constructor creation
  resolveConstructorOptions(Ctor)

  // 如果存在 data.model
  if (isDef(data.model)) {
    // 将组件上面的 v-model data 转化为 props & events
    transformModel(Ctor.options, data)
  }

  // extract props
  const propsData = extractPropsFromVNodeData(data, Ctor, tag)

  // functional component
  if (isTrue(Ctor.options.functional)) {
    return createFunctionalComponent(Ctor, propsData, data, context, children)
  }

  // 在组件中，将 data.on 赋值成为 listeners，因为组件中的 on 是自定义事件而非原生 Dom 事件
  const listeners = data.on
  // 替换带有 native 修饰符的监听，因此他会在父组件的 patch 过程中得到处理
  // 将 data.nativeOn 事件设置为原生事件
  data.on = data.nativeOn

  if (isTrue(Ctor.options.abstract)) {
    // abstract components do not keep anything
    // other than props & listeners & slot

    // work around flow
    const slot = data.slot
    data = {}
    if (slot) {
      data.slot = slot
    }
  }

  // 安装一些组件钩子函数
  installComponentHooks(data)

  // return a placeholder vnode
  const name = Ctor.options.name || tag
  // 生成 vnode，tag 为 vue-component-开头是组件
  // 该组件里面的 children 是空
  // componentOptions 是 { Ctor, propsData, listeners, tag, children }
  // asyncFactory 是异步组件
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )

  // Weex specific: invoke recycle-list optimized @render function for
  // extracting cell-slot template.
  // https://github.com/Hanks10100/weex-native-directive/tree/master/component
  if (__WEEX__ && isRecyclableComponent(vnode)) {
    return renderRecyclableComponentTemplate(vnode)
  }

  // 返回 vnode
  return vnode
}

// 实例化子组件，返回的是一个 vm 实例
// vnode 为当前组件的 vnode，parent 为 activeInstance 即当前正在渲染的实例的引用
export function createComponentInstanceForVnode (
  vnode: any,
  parent: any,
): Component {
  // 定义 options，vnode 为占位节点，parent 为父节点
  const options: InternalComponentOptions = {
    _isComponent: true,
    _parentVnode: vnode,
    parent
  }
  // check inline-template render functions
  const inlineTemplate = vnode.data.inlineTemplate
  if (isDef(inlineTemplate)) {
    options.render = inlineTemplate.render
    options.staticRenderFns = inlineTemplate.staticRenderFns
  }
  // 实例化自组件的构造函数，实际上执行的是 sub 的构造函数
  return new vnode.componentOptions.Ctor(options)
}

// 安装组件的钩子
function installComponentHooks (data: VNodeData) {
  // 缓存 data.hook 
  const hooks = data.hook || (data.hook = {})
  // 遍历 hooksToMerge，hooksToMerge的值是 [init, prepatch, insert,destroy]
  for (let i = 0; i < hooksToMerge.length; i++) {
    // 将当前元素保存到 key 上面
    const key = hooksToMerge[i]
    // 读取 data 中传入到 hooks
    const existing = hooks[key]
    // 读取 componentVNodeHooks 的hooks
    const toMerge = componentVNodeHooks[key]
    // 如果传入的 hooks 和 componentVNodeHooks 上的 hooks 相等，
    // 或没有传入 hooks 并且传入的 hooks 中有 _merged，不进行操作
    if (existing !== toMerge && !(existing && existing._merged)) {
      // 如果传入了 existing 调用 mergeHook 进行合并，并且将其返回值赋值给 hooks[key]
      // 如果没有传入 existing，直接将 toMerge 赋值给 hooks[key]
      hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge
    }
  }
}

// 合并组件钩子
function mergeHook (f1: any, f2: any): Function {
  // 定义mereged 函数，该函数会依次调用 f1、f2
  const merged = (a, b) => {
    // flow complains about extra args which is why we use any
    f1(a, b)
    f2(a, b)
  }
  // 将 merged 的 _merged 值设置为 true
  merged._merged = true
  // 将 merged 返回
  return merged
}

// 将组件的 v-model 分别转化为元素上的值和回调方法
function transformModel (options, data: any) {
  // 将 options.model.prop 或 'value' 保存到 prop 上
  const prop = (options.model && options.model.prop) || 'value'
  // 将 options.model.event 或 'input' 保存到 event 上
  const event = (options.model && options.model.event) || 'input'
  // 将 data.model.value 保存到 data.props 上
  ;(data.props || (data.props = {}))[prop] = data.model.value
  // 保存 data.on 到 on 上面
  const on = data.on || (data.on = {})
  // 读取已经存在了的 event 事件
  const existing = on[event]
  // 保存 callback 回调
  const callback = data.model.callback
  // 判断 existing 是否存在
  if (isDef(existing)) {
    // 如果存在，判断 existing 是否为数组, 如果是数组并且，该数组不存在 callback，或不是数组，且 existing 和 callback 不想等
    if (
      Array.isArray(existing)
        ? existing.indexOf(callback) === -1
        : existing !== callback
    ) {
      // 将 callback 和 existing进行拼接
      on[event] = [callback].concat(existing)
    }
  } else {
    // 如果不存在，直接将 callback 存到 on[event] 上
    on[event] = callback
  }
}

```