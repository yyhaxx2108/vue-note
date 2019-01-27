# render

```javascript
import {
  warn,
  nextTick,
  emptyObject,
  handleError,
  defineReactive
} from '../util/index'

import { createElement } from '../vdom/create-element'
import { installRenderHelpers } from './render-helpers/index'
import { resolveSlots } from './render-helpers/resolve-slots'
import VNode, { createEmptyVNode } from '../vdom/vnode'

import { isUpdatingChildComponent } from './lifecycle'

export function initRender (vm: Component) {
  // 在 vm 上添加 _vnode
  vm._vnode = null 
  // 在 vm 上添加 _staticTrees
  vm._staticTrees = null

  const options = vm.$options
  // 父组件中占位标签
  const parentVnode = vm.$vnode = options._parentVnode
  const renderContext = parentVnode && parentVnode.context
  vm.$slots = resolveSlots(options._renderChildren, renderContext)
  // 将 vm.$scopedSlots 赋值成为一个空对象
  vm.$scopedSlots = emptyObject
  // 是对内部函数 createElement 的包装
  // 为了获取正确的上下文环境，我们将 createElement 方法绑定到这个实例上
  // a, b, c, d 分别代表 tag，data，children，normalizationType
  // 内部调用，编译器根据模板字符串生成的渲染函数的了，最后一个参数为 false
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
  // 用户手写 render 函数时调用，最后一个参数为 true
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)

  // $attrs、$listeners主要用于创建高级别的组件
  const parentData = parentVnode && parentVnode.data
  // 将$attrs、$listeners定义成为响应式的
  // $attrs、$listeners 均为非深度观察
  if (process.env.NODE_ENV !== 'production') {
    // 在非生产环境中，setter函数会有报警告的操作，具体是 !isUpdatingChildComponent 成立时
    // isUpdatingChildComponent 一般情况为 false， 
    // isUpdatingChildComponent 当执行updateChildComponent的开始为变为 true，结束后变回 false
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$attrs is readonly.`, vm)
    }, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$listeners is readonly.`, vm)
    }, true)
  } else {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, null, true)
  }
}

export function renderMixin (Vue: Class<Component>) {
  // 在 Vue.prototype 上定义了 _o 等一系列辅助方法
  installRenderHelpers(Vue.prototype)

  // 在 Vue.prototype 上定义了 $nextTick 方法
  Vue.prototype.$nextTick = function (fn: Function) {
    return nextTick(fn, this)
  }

  // 在 Vue.prototype 上定义了 _render 方法，返回 VNode
  Vue.prototype._render = function (): VNode {
    // 将 Vue 实例保存到 vm 上
    const vm: Component = this
    // 将 vm.$options.render 和 vm.$options._parentVnode 分别保存到 render 和 _parentVnode 上
    const { render, _parentVnode } = vm.$options

    if (_parentVnode) {
      vm.$scopedSlots = _parentVnode.data.scopedSlots || emptyObject
    }

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    vm.$vnode = _parentVnode
    // render self
    let vnode
    try {
      // 调用 render 方法生成 vnode
      // vm._renderProxy 在生产环境下就是 vm，在开发环境是 proxy 对象
      // vm.$createElement 在 initRender 中定义
      vnode = render.call(vm._renderProxy, vm.$createElement)
    } catch (e) {
      // 如果 render 方法抛出错误，将错误交给 handleError 处理
      handleError(e, vm, `render`)
      // 返回错误呈现结果或以前的Vnode，以防止呈现错误导致空白组件
      if (process.env.NODE_ENV !== 'production' && vm.$options.renderError) {
        try {
          vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
        } catch (e) {
          handleError(e, vm, `renderError`)
          vnode = vm._vnode
        }
      } else {
        vnode = vm._vnode
      }
    }
    // 如果 render 函数出错，则返回空Vnode
    if (!(vnode instanceof VNode)) {
      // 如果 vnode 是数组
      if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
        // 报警告，只能有一个根组件
        warn(
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        )
      }
      // 创建一个空白组件
      vnode = createEmptyVNode()
    }
    // set parent
    vnode.parent = _parentVnode
    return vnode
  }
}
```