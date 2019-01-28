# lifecycle

```javascript
import config from '../config'
import Watcher from '../observer/watcher'
import { mark, measure } from '../util/perf'
import { createEmptyVNode } from '../vdom/vnode'
import { updateComponentListeners } from './events'
import { resolveSlots } from './render-helpers/resolve-slots'
import { toggleObserving } from '../observer/index'
import { pushTarget, popTarget } from '../observer/dep'

import {
  warn,
  noop,
  remove,
  handleError,
  emptyObject,
  validateProp
} from '../util/index'

// 这个变量将总是保存着当前正在渲染的实例的引用
export let activeInstance: any = null

// 定义 isUpdatingChildComponent，并初始化为 false
export let isUpdatingChildComponent: boolean = false

export function initLifecycle (vm: Component) {
  // 引用 vm.$options 到 options，并且后面都是使用 options
  const options = vm.$options

  // 定义 parent 值为 options.parent，
  // options.parent 除了可以通过 options 传入外，另一个生成途径来自createComponentInstanceForVnode
  let parent = options.parent
  if (parent && !options.abstract) {
    // 如果当前实例有父组件，且当前实例不是抽象的
    // 使用 while 循环查找第一个非抽象的父组件
    // 抽象组件不会渲染DOM至页面，也不会出现在父子关系的路径上
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    // 将当前组件实例push到第一个非抽象父组件的 $children 中
    parent.$children.push(vm)
  }

  // 设置 vm 的 $parent 为第一个非抽象父组件
  vm.$parent = parent
  // 设置 vm 的 $root 为 有父级就是用父级的 $root，否则 $root 指向自身
  vm.$root = parent ? parent.$root : vm

  // 子组件数组
  vm.$children = []
  // $refs 为节点的引用
  vm.$refs = {}

  // 渲染观察者
  vm._watcher = null
  
  vm._inactive = null
  vm._directInactive = false
  vm._isMounted = false
  vm._isDestroyed = false
  vm._isBeingDestroyed = false
}

export function lifecycleMixin (Vue: Class<Component>) {
  // 在 Vue.prototype 上定义了 _update 方法，改方法的作用是把 VNode 渲染成真实 Dom
  // 调用时机有俩个，1、第一次渲染的时候会调用，2、数据改变的时候会调用 
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    // 保存当前实例
    const vm: Component = this
    // 用 prevEl 保存 vm.$el 的引用
    const prevEl = vm.$el
    // 用 prevVnode 保存 vm._vnode 的引用
    const prevVnode = vm._vnode
    // 将 activeInstance 赋值到 prevActiveInstance 上
    const prevActiveInstance = activeInstance
    // 将当前实例赋值到 activeInstance 上
    activeInstance = vm
    // 将 vnode 赋值给 vm._vnode
    vm._vnode = vnode
    // Vue.prototype.__patch__ 会在入口点被注入，用于不同环境进行补丁算法
    // 判断 prevVnode 是否存在
    if (!prevVnode) {
      // 如果不存在，说明是初始化渲染，调用 vm.__patch__ 函数，将其值赋值给 vm.$el
      // 传入的 vm.$el 为 旧的 vnode，即为用于挂载的 dom（真实dom）
      // vnode 传入的 vnode(虚拟dom)，hydrating 是否为服务端渲染，最后一个参数为 removeOnly
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false)
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    activeInstance = prevActiveInstance
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  }

  // 在 Vue.prototype 上定义了 $forceUpdate 方法
  Vue.prototype.$forceUpdate = function () {
    const vm: Component = this
    if (vm._watcher) {
      vm._watcher.update()
    }
  }

  // 在 Vue.prototype 上定义了 $destroy 方法
  Vue.prototype.$destroy = function () {
    const vm: Component = this
    if (vm._isBeingDestroyed) {
      return
    }
    callHook(vm, 'beforeDestroy')
    vm._isBeingDestroyed = true
    // remove self from parent
    const parent = vm.$parent
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm)
    }
    // teardown watchers
    if (vm._watcher) {
      vm._watcher.teardown()
    }
    let i = vm._watchers.length
    while (i--) {
      vm._watchers[i].teardown()
    }
    // remove reference from data ob
    // frozen object may not have observer.
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }
    // call the last hook...
    vm._isDestroyed = true
    // invoke destroy hooks on current rendered tree
    vm.__patch__(vm._vnode, null)
    // fire destroyed hook
    callHook(vm, 'destroyed')
    // turn off all instance listeners.
    vm.$off()
    // remove __vue__ reference
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
    // release circular reference (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null
    }
  }
}

// 挂载组件的函数，vm 是组件的实例，el 为挂载节点，hydrating 为透传的参数，与服务端相关
export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  // 先用 vm.$el 保存 el 的引用
  vm.$el = el
  if (!vm.$options.render) {
    // 如果 vm.$options.render 不存在, 那么创建一个空的Node
    vm.$options.render = createEmptyVNode
    if (process.env.NODE_ENV !== 'production') {
      // 如果在非生产环境下，将报警告
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        // 如果有 template, 且template是#开头的，或者存在 vm.$options.el，此时应该在带编译的环境中运行
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        // 否则直接报，编译错误
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }
  // 触发 beforeMount 回调
  callHook(vm, 'beforeMount')

  // 下面代码是对 updateComponent 进行初始化
  let updateComponent
  // 性能优化相关
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    // 在非生产环境，对性能进行测试
    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`

      mark(startTag)
      // 通过 vm._render() 获取 vnode
      const vnode = vm._render()
      mark(endTag)
      measure(`vue ${name} render`, startTag, endTag)

      mark(startTag)
      // 通过 vm._update() 更新 成真正的dom
      vm._update(vnode, hydrating)
      mark(endTag)
      measure(`vue ${name} patch`, startTag, endTag)
    }
  } else {
    // updateComponent 是一个函数，把渲染函数生成的虚拟DOM渲染成真正的DOM
    updateComponent = () => {
      // vm._render() 生成 VNode
      vm._update(vm._render(), hydrating)
    }
  }

  // 创建一个渲染函数观察者，
  // 这里表达式参数是一个函数，改函数里面有求值操作，用以收集依赖
  // 第三个参数传入的是 noop 空函数
  new Watcher(vm, updateComponent, noop, {
    before () {
      if (vm._isMounted) {
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* 渲染 wathers */)
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  if (vm.$vnode == null) {
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}

export function updateChildComponent (
  vm: Component,
  propsData: ?Object,
  listeners: ?Object,
  parentVnode: MountedComponentVNode,
  renderChildren: ?Array<VNode>
) {
  if (process.env.NODE_ENV !== 'production') {
    // 在非生产环境中，在更新开始时将isUpdatingChildComponent设置为true
    // 试图修改 vm.$attr 或 vm.$listeners 可能会用到
    isUpdatingChildComponent = true
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren
  const hasChildren = !!(
    renderChildren ||               // has new static slots
    vm.$options._renderChildren ||  // has old static slots
    parentVnode.data.scopedSlots || // has new scoped slots
    vm.$scopedSlots !== emptyObject // has old scoped slots
  )

  vm.$options._parentVnode = parentVnode
  vm.$vnode = parentVnode // update vm's placeholder node without re-render

  if (vm._vnode) { // update child tree's parent
    vm._vnode.parent = parentVnode
  }
  vm.$options._renderChildren = renderChildren

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  vm.$attrs = parentVnode.data.attrs || emptyObject
  vm.$listeners = listeners || emptyObject

  // update props
  if (propsData && vm.$options.props) {
    toggleObserving(false)
    const props = vm._props
    const propKeys = vm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      const propOptions: any = vm.$options.props // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, vm)
    }
    toggleObserving(true)
    // keep a copy of raw propsData
    vm.$options.propsData = propsData
  }

  // update listeners
  listeners = listeners || emptyObject
  const oldListeners = vm.$options._parentListeners
  vm.$options._parentListeners = listeners
  updateComponentListeners(vm, listeners, oldListeners)

  // resolve slots + force update if has children
  if (hasChildren) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    vm.$forceUpdate()
  }

  if (process.env.NODE_ENV !== 'production') {
    // 在更新完成后，将其设置为false
    isUpdatingChildComponent = false
  }
}

function isInInactiveTree (vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true
  }
  return false
}

export function activateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = false
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i])
    }
    callHook(vm, 'activated')
  }
}

export function deactivateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true
    if (isInInactiveTree(vm)) {
      return
    }
  }
  if (!vm._inactive) {
    vm._inactive = true
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i])
    }
    callHook(vm, 'deactivated')
  }
}

// 调用生命周期函数
export function callHook (vm: Component, hook: string) {
  // 加上 pushTarget 和 popTarget，为了避免在某些生命周期钩子中使用 props 数据导致收集冗余的依赖
  pushTarget()
  // 生命周期钩子选项通过合并会变成一个数组
  const handlers = vm.$options[hook]
  if (handlers) {
    // handlers 可能不存在
    for (let i = 0, j = handlers.length; i < j; i++) {
      // 生命周期钩子函数由用户编写，应该捕获错误
      try {
        // 使用call(vm) 能保证 生命钩子函数的this指向vm
        handlers[i].call(vm)
      } catch (e) {
        // 如果钩子函数有错误，则交给 handleError 处理
        handleError(e, vm, `${hook} hook`)
      }
    }
  }
  // 在 initEvents 函数中定义的，它的作用是判断是否存在生命周期钩子的事件侦听器
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }
  popTarget()
}

```