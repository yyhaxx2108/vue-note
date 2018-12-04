# init

```javascript
import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    // 缓存自身的实例
    const vm: Component = this
    // 给实例自身加上一个唯一标记uid
    vm._uid = uid++ 

    // 性能测量相关
    let startTag, endTag
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      // mark为window.performance.mark方法
      mark(startTag)
    }

    // 将改实例_isVue设置为true，避免被观测(observed)
    vm._isVue = true
    // 合并options
    if (options && options._isComponent) {
      // 如果 options._isComponent 为 true 此为内部组件
      // 因为动态选项合并非常慢，并且内部组件选项都不需要特殊处理，所以这里可以直接赋值，从而优化性能。
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }

    // 代理vm实例的属性
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // 通过 vm._self 暴露事例自身
    vm._self = vm
    // initLifeCycle初始化一些生命周期相关的属性
    initLifecycle(vm)
    // 初始化一些事件相关的属性
    initEvents(vm)
    // 初始化Render相关
    initRender(vm)
    // 触发beforeCreate钩子
    callHook(vm, 'beforeCreate')
    // 初始化inject
    initInjections(vm) // resolve injections before data/props
    // 初始化 props, methods, data, computed 和 watch
    initState(vm)
    // 初始化provide
    initProvide(vm) // resolve provide after data/props
    // 触发created钩子
    callHook(vm, 'created')

    // 性能测量相关，与之前代码相对应
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      // measure是measure、clearMarks、clearMeasures的方法进行封装
      measure(`vue ${vm._name} init`, startTag, endTag)
    }
    // 如果存在vm.$options.el，则调用vm.$mount方法
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  // 以 vm.constructor.options 为原型对象创造一个空对象，并且赋值给vm.$options
  const opts = vm.$options = Object.create(vm.constructor.options)
  // 用一个个赋值代替列举赋值来提升性能，这里缓存parentVnode，方便后面使用
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const extended = Ctor.extendOptions
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = dedupe(latest[key], extended[key], sealed[key])
    }
  }
  return modified
}

function dedupe (latest, extended, sealed) {
  // compare latest and sealed to ensure lifecycle hooks won't be duplicated
  // between merges
  if (Array.isArray(latest)) {
    const res = []
    sealed = Array.isArray(sealed) ? sealed : [sealed]
    extended = Array.isArray(extended) ? extended : [extended]
    for (let i = 0; i < latest.length; i++) {
      // push original options and not sealed options to exclude duplicated options
      if (extended.indexOf(latest[i]) >= 0 || sealed.indexOf(latest[i]) < 0) {
        res.push(latest[i])
      }
    }
    return res
  } else {
    return latest
  }
}

```