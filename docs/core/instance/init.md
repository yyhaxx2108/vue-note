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

// 实例唯一标识
let uid = 0

export function initMixin (Vue: Class<Component>) {
  // 在 原型上 挂载 _init 方法，此方法在 new Vue() 时执行
  Vue.prototype._init = function (options?: Object) {
    // 缓存自身的实例
    const vm: Component = this
    // 给实例自身加上一个唯一标记uid, 且保存到内存
    vm._uid = uid++ 

    // 性能测量相关
    let startTag, endTag
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      // mark为window.performance.mark方法
      mark(startTag)
    }

    // 将改实例_isVue设置为true，即当一个对象拥有 _isVue时，代表该对象为Vue实例 避免被观测(observed)
    vm._isVue = true
    // 合并options
    if (options && options._isComponent) {
      // 如果 options._isComponent 为 true 此为内部组件
      // 因为动态选项合并非常慢，并且内部组件选项都不需要特殊处理，所以这里可以直接赋值，从而优化性能。
      initInternalComponent(vm, options)
    } else {
      // resolveConstructorOptions(vm.constructor) 解析构造函数的options
      // options 传入的options
      // vm 实例自身
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }

    // 代理vm实例的属性, 即 vm._renderProxy 的值就是 vm
    if (process.env.NODE_ENV !== 'production') {
      // 主要是为了提供更好的提示信息
      initProxy(vm)
    } else {
      // 在生产环境中 vm._renderProxy 就是 vm
      vm._renderProxy = vm
    }
    // 通过 vm._self 暴露事例自身
    // 与上面的 vm._renderProxy 可能不同，vm._renderProxy 可能是 proxy 代理的实例
    vm._self = vm
    // initLifeCycle初始化一些生命周期相关的属性
    initLifecycle(vm)
    // 初始化一些事件相关的属性
    initEvents(vm)
    // 初始化 Render 相关
    initRender(vm)
    // 调用 beforeCreate 钩子函数，此时拿不了 data 这些数据
    // vue-router、vuex 会在此混入一些逻辑
    callHook(vm, 'beforeCreate')
    // 初始化inject
    initInjections(vm)
    // 初始化 props, methods, data, computed 和 watch
    initState(vm)
    // 初始化provide
    initProvide(vm)
    // 调用 created 钩子函数
    callHook(vm, 'created')

    // 性能测量相关，与之前代码相对应
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      // measure是measure、clearMarks、clearMeasures的方法进行封装
      measure(`vue ${vm._name} init`, startTag, endTag)
    }
    // 如果存在vm.$options.el，则调用vm.$mount方法,进行挂载
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

// 初始化内部组件，此时 vm 是子组件
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  // 以 vm.constructor.options 为原型对象创造一个空对象，并且赋值给vm.$options
  const opts = vm.$options = Object.create(vm.constructor.options)
  // 用一个个赋值代替列举赋值来提升性能，这里缓存parentVnode，方便后面使用
  // 将占位节点保存到 parentVnode 上
  const parentVnode = options._parentVnode
  // 将父亲节点保存到 vm.$options.parent 上
  opts.parent = options.parent
  // 将占位节点保存到 vm.$options._parentVnode 上
  opts._parentVnode = parentVnode

  // 读取占位节点的 componentOptions，并且保存到 vnodeComponentOptions 上
  const vnodeComponentOptions = parentVnode.componentOptions
  // 将占位节点上的 propsData 保存到 vm.$options.propsData 上
  opts.propsData = vnodeComponentOptions.propsData
  // 将占位节点上的 listeners 保存到 vm.$options._parentListeners 上
  opts._parentListeners = vnodeComponentOptions.listeners
  // 将占位节点上的 children 保存到 vm.$options._renderChildren 上
  opts._renderChildren = vnodeComponentOptions.children
  // 将占位节点上的 tag 保存到 vm.$options._componentTag 上
  opts._componentTag = vnodeComponentOptions.tag

  // 如果存在 options.render
  if (options.render) {
    // 将 options.render 赋值给 vm.$options.render
    opts.render = options.render
    // 将 options.staticRenderFns 赋值给 vm.$options.staticRenderFns
    opts.staticRenderFns = options.staticRenderFns
  }
}

// 解析constructor上的options属性, constructor可以是 Vue 也可以示 Vue.extend 扩展的构造函数
export function resolveConstructorOptions (Ctor: Class<Component>) {
  // 此时options拥有共有的 components、directives、filters、_base
  let options = Ctor.options
  // 如果存在 Ctor.super 说明 Ctor 是 Vue.extend构建的子类
  if (Ctor.super) {
    // 递归调用，继续查找 Ctor.super 的父类的options并且赋值给superOptions
    const superOptions = resolveConstructorOptions(Ctor.super)
    // 将自身的 superOptions 缓存在 cachedSuperOptions
    const cachedSuperOptions = Ctor.superOptions
    // 比较这两个变量的值,不等则说明"父类"的options改变过了，例如使用了Vue.mixin等
    if (superOptions !== cachedSuperOptions) {
      // 更新自身 superOptions 为 superOptions
      Ctor.superOptions = superOptions
      // 检查是否有后期修改/附加选项，这个主要是解决注入选项丢失的问题(#4976)
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
  // 该函数返回值是 Ctor.options
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  // 定义modified变量
  let modified
  // 自身新增的 options
  const latest = Ctor.options
  // 当前构造器新增的 options
  const extended = Ctor.extendOptions
  // 当前构造器新增并且封装好的options
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
  // 防止生命周期构造函数重复，如果latest不是数组则不用操作，否则进行去重
  // last 一般存放的是生命周期钩子函数
  if (Array.isArray(latest)) {
    const res = []
    sealed = Array.isArray(sealed) ? sealed : [sealed]
    extended = Array.isArray(extended) ? extended : [extended]
    for (let i = 0; i < latest.length; i++) {
      // 在 extended 中有 或者 sealed 中 没有，则推入返回数组中
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