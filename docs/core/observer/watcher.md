# watcher

```javascript

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

// Watcher 作用是对观察的表达式收集依赖，触发回调，在$watch() 和 directives 用到
// Watcher 的原理是通过对“被观测目标”的求值，触发数据属性的 get 拦截器函数从而收集依赖
// Watcher 用于求值，Observer 用于将对象转化成 get/set
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  // vm 是实例对象，expOrFn 需要观察的表达式，cb 当被观察的表达式的值变化时的回调函数 
  // options 当前观察者对象使用到的 options，isRenderWatcher 用来标识该观察者实例是否是渲染函数的观察者
  // isRenderWatcher 只有在 mountComponent 函数中创建渲染函数观察者时这个参数为真
  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    // 首先将当前组件实例对象 vm 赋值给该观察者实例的 this.vm 属性，该属性指明了这个观察者是属于哪一个组件的
    this.vm = vm
    // 如果是渲染函数观察者
    if (isRenderWatcher) {
      // 当前组件上的 _watcher 引用给渲染函数观察者
      vm._watcher = this
    }
    // 该组件实例的观察者都会被添加到该组件实例对象的 vm._watchers 数组中
    // 包括渲染函数的观察者和非渲染函数的观察者
    vm._watchers.push(this)

    // 判读是否传入了 options
    if (options) {
      // 如果传入 options，那么分别对以下属性进行转化
      this.deep = !!options.deep   // 是否进行深度观察
      this.user = !!options.user   // 是开发者定义的，还是内部定义的，其中像渲染函数的观察者、计算属性的观察者是false
      this.lazy = !!options.lazy   // 是否为惰性属性
      this.sync = !!options.sync   // 用来告诉观察者当数据变化时是否同步求值并执行回调
      // 同时将 options.before 存到 this.before
      this.before = options.before
    } else {
      // 没有传入 options，将默认配置都重置为 false
      this.deep = this.user = this.lazy = this.sync = false
    }
    // 保存回调函数的引用
    this.cb = cb
    // 观察者标识
    this.id = ++uid
    // 是否是激活状态
    this.active = true
    // 只有计算属性的观察者实例对象的 this.dirty 属性的值才会为真
    this.dirty = this.lazy

    // 下面几个属性是用来避免收集重复依赖和移除无用的依赖
    this.deps = []             // 保存着上一次求值过程中，收集到的dep
    this.newDeps = []          // 保存着当前求值过程中，收集到的dep
    this.depIds = new Set()    // 保存着上一次求值过程中，收集到的depId
    this.newDepIds = new Set() // 保存着当前求值过程中，收集到的depId

    // 在非生产环境中会表达式用字符串的形式存到 this.expression 上
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    
    // 判读 expOrFn 是否为函数
    if (typeof expOrFn === 'function') {
      // 如果 expOrFn 是函数，那么直接使用 expOrFn 作为 this.getter 属性的值
      this.getter = expOrFn
    } else {
      // 不是函数，将 parsePath(expOrFn) 函数的返回值作为 this.getter 属性的值，
      // parsePath(expOrFn) 也是一个函数
      this.getter = parsePath(expOrFn)
      // 如果 this.getter 为 undefined
      if (!this.getter) {
        // 首先将 this.getter 赋值为一个空函数
        this.getter = noop
        // 同时报警告，只接受简单的点(.)分隔路径，如果你要用全部的 js 语法特性直接观察一个函数
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    // 如果 this.lazy 为假，那么 this.value = undefined，否则直接调用 this.get()
    // this.value 保存着被观察目标的值
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  // 对 getter 求值，并且重新获取依赖
  get () {
    // 将当前 Watcher 赋值给 Dep.target
    pushTarget(this)
    // 定义 value
    let value
    // 读取当前 Watcher 上面到组件实例 vm
    const vm = this.vm
    try {
      // 调用当前 getter 并且将返回值 赋值给 value
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        // 如果是用户自定义的 wather 中 获取值失败，那么抛出错误
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        // 否则将错误往上一层抛
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      // 获取到值以后，将当前 Wather 弹出
      popTarget()
      // 重新整理 deps、depIds、newDeps、newDepIds
      this.cleanupDeps()
    }
    return value
  }

  // 将一个dep实例添加到该watcher中，dep 是一个实例
  addDep (dep: Dep) {
    // 缓存唯一标识id, 下面的步骤是为了避免收集重复的依赖
    const id = dep.id
    // 如果 this.newDepIds.has(id)，那么说明该 wather 实例中有 dep，不用收集
    // 如 {{test}}{{test}}
    if (!this.newDepIds.has(id)) {
      // 将 dep 的 id add 到 this.newDepIds
      this.newDepIds.add(id)
      // 将 dep psuh 到 this.newDeps
      this.newDeps.push(dep)
      // 避免多次求值中搜集重复依赖
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  // 清理收集到的依赖
  cleanupDeps () {
    let i = this.deps.length
    // 如果之前的 wather 没有在新的dep队列里面，那么将其从变量所引用的闭包中删除掉
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    // 缓存 this.depIds
    let tmp = this.depIds
    // 将新的 newDepIds 赋值给旧的 depIds
    this.depIds = this.newDepIds
    // 将新的 newDepIds 清空
    this.newDepIds = tmp
    this.newDepIds.clear()
    // 缓存 this.deps
    tmp = this.deps
    // 将新的 newDeps 赋值给旧的 deps
    this.deps = this.newDeps
    // 将新的 newDeps 清空
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  // 订阅接口，在依赖发生变化时会被调用
  update () {
    if (this.lazy) {
      // 如果 this.lazy 那么将 this.dirty 设置为 true
      this.dirty = true
    } else if (this.sync) {
      // 如果 this.sync 为真，那么说明是同步操作，立即执行 run 函数
      this.run()
    } else {
      // 将其添入异步更新队列中，后面执行
      queueWatcher(this)
    }
  }

  // scheduler接口，scheduler 将被执行
  run () {
    // 当观察者是否处于激活状态时执行
    if (this.active) {
      // 执行 get，重新搜集依赖，并且将返回值缓存到 value 上
      const value = this.get()
      // 判断 value 是否发生变化 或 value 是对象或 this.deep 为 true
      // 渲染 watcher 将不会执行if里面的内容
      if (
        value !== this.value ||
        isObject(value) ||
        this.deep
      ) {
        // 缓存之前的 value
        const oldValue = this.value
        // 将新的 value 赋值给 this.value
        this.value = value
        // 判断是否为用户 watcher
        if (this.user) {
          // 如果是用户 watcher，在try中执行用户传入的回调
          try {
            // 该回调函数传入的参数分别是 实例对象、新的值、旧的值
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          // 直接执行回调
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}

```