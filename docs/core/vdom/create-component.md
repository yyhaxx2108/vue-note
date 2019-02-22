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

  prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
    const options = vnode.componentOptions
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
    const { context, componentInstance } = vnode
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true
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
  if (isUndef(Ctor.cid)) {
    asyncFactory = Ctor
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor, context)
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
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

  // transform component v-model data into props & events
  if (isDef(data.model)) {
    transformModel(Ctor.options, data)
  }

  // extract props
  const propsData = extractPropsFromVNodeData(data, Ctor, tag)

  // functional component
  if (isTrue(Ctor.options.functional)) {
    return createFunctionalComponent(Ctor, propsData, data, context, children)
  }

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners
  const listeners = data.on
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
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

// transform component v-model info (value and callback) into
// prop and event handler respectively.
function transformModel (options, data: any) {
  const prop = (options.model && options.model.prop) || 'value'
  const event = (options.model && options.model.event) || 'input'
  ;(data.props || (data.props = {}))[prop] = data.model.value
  const on = data.on || (data.on = {})
  const existing = on[event]
  const callback = data.model.callback
  if (isDef(existing)) {
    if (
      Array.isArray(existing)
        ? existing.indexOf(callback) === -1
        : existing !== callback
    ) {
      on[event] = [callback].concat(existing)
    }
  } else {
    on[event] = callback
  }
}

```