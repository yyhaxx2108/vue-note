# state

```javascript

import config from '../config'
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

// 代理 proxy(vm, `_data`, key) 
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

export function initState (vm: Component) {
  // vm 添加一个属性 vm._watchers = []
  // 其初始值是一个数组，这个数组将用来存储所有该组件实例的 watcher 对象，即观察者
  vm._watchers = []
  // 定义了常量 opts，它是 vm.$options 的引用
  const opts = vm.$options
  // 选项中有 props，那么就调用 initProps 初始化 props 选项
  if (opts.props) initProps(vm, opts.props)
  // 选项中有 methods，那么就调用 initMethods 初始化 methods 选项
  if (opts.methods) initMethods(vm, opts.methods)
  if (opts.data) {
    // 选项如果存在 data，那么调用 initData 初始化 data
    initData(vm)
  } else {
    // 如果不存在则直接调用 observe 函数观测一个空对象
    observe(vm._data = {}, true /* asRootData */)
  }
  // 选项中有 computed，那么就调用 initComputed 初始化 computed 选项
  if (opts.computed) initComputed(vm, opts.computed)
  // 选项中有 watch，且不是原生 watch，那么就调用 initwatch 初始化 watch 选项
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}

function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false)
  }
  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}

function initData (vm: Component) {
  // 定义 data，且 data 为 vm.$options.data 的引用
  let data = vm.$options.data
  // 这里对 data 进行了取值
  // mergeOptions 将 data 变成了函数，但是 beforeCreated 中，可能将其修改
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  // 如果 data 不是纯对象，那么报警告
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // 获取 data 对象的所有键
  const keys = Object.keys(data)
  // 缓存 props
  const props = vm.$options.props
  // 缓存 methods
  const methods = vm.$options.methods
  let i = keys.length
  // 对 keys 进行遍历
  while (i--) {
    const key = keys[i]
    if (process.env.NODE_ENV !== 'production') {
      // 如果 methods 中有 key 抛出警告
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      // 如果 props 中有 key 抛出警告
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      // 如果 key 不是保留字， 则对key进行代理
      proxy(vm, `_data`, key)
    }
  }
  // 调用 observe 函数将 data 数据对象转换成响应式的
  observe(data, true)
}

// 通过调用 data 函数获取真正的数据对象并返回
export function getData (data: Function, vm: Component): any {
  // pushTarget、popTarget为了防止使用 props 数据初始化 data 数据时收集冗余的依赖
  pushTarget()
  // data 函数可能会报错，所以需要包裹在try catch里面
  try {
    // 返回 data 调用的返回值
    return data.call(vm, vm)
  } catch (e) {
    // 如果报错，打印日志
    handleError(e, vm, `data()`)
    // 返回一个空对象
    return {}
  } finally {
    popTarget()
  }
}

// 用于 computed 创建 watcher
const computedWatcherOptions = { lazy: true }

// 初始化 computed
function initComputed (vm: Component, computed: Object) {
  // 首先创建一个空对象，并且将该对象赋值给 vm._computedWatchers 和 watchers
  const watchers = vm._computedWatchers = Object.create(null)

  // 判断是否为服务端渲染，计算属性只是 getter
  const isSSR = isServerRendering()

  for (const key in computed) {
    // 缓存 computed[key] 到 userDef
    const userDef = computed[key]
    // 如果 userDef 是方法，那么 getter 就是 userDef，否则 getter 为 userDef.get
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    // 在非生产环境中，不存在 getter 那么报警告
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    if (!isSSR) {
      // 在非服务端渲染中，创建一个内部监视器, 计算属性观察者
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // 判断 vm 上面是否有 key
    if (!(key in vm)) {
      // 如果 vm 上面没有定义，直接调用 defineComputed 将其定义好
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      // 如果存在在 $data 或 $prop 上，抛出对应的警告
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}

// 该函数的作用就是通过 Object.defineProperty 函数在组件实例对象上定义与计算属性同名的组件实例属性
export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  // 非服务端渲染的情况下计算属性才会缓存值
  const shouldCache = !isServerRendering()
  
  // 判断 userDef 是否为函数
  if (typeof userDef === 'function') {
    // 如果 userDef 是函数，用该函数定义 sharedPropertyDefinition.get 
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    // 如果 userDef 是函数，那么 set 为 noop 函数
    sharedPropertyDefinition.set = noop
  } else {
    // 如果 userDef 不是函数，用该对象上的get 定义 sharedPropertyDefinition.get
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  // 如果在非生产环境中，如果没有定义 set 方法，调用 set 报警告
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  // 在组件实例对象上定义与计算属性同名的组件实例属性
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

// 计算属性访问器属性，返回 computedGetter 函数
function createComputedGetter (key) {
  return function computedGetter () {
    // 读取计算 wathcer 数组里面缓存的 wather
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        // 给 watcher.value 求值，同时为 computed 所构成的属性，搜集依赖
        watcher.evaluate()
      }
      if (Dep.target) {
        // 如果 Dep.target 有值，继续为 computed 所构成的属性，搜集依赖
        watcher.depend()
      }
      // 返回 watcher.value 作为 computed 的值
      return watcher.value
    }
  }
}

// 如果是服务端渲染，返回的 computedGetter 只是调用 getter
function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}

// 初始化 watch
function initWatch (vm: Component, watch: Object) {
  // 遍历 watch
  for (const key in watch) {
    // 缓存 watch 里面的值
    const handler = watch[key]
    // 判读是否为数组
    if (Array.isArray(handler)) {
      // 如果是数组，那么循环创建wather
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      // 如果不是 那么直接创建watcher
      createWatcher(vm, key, handler)
    }
  }
}

// 创建一个 Watcher
function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  // 判断 handler 是否为纯对象
  if (isPlainObject(handler)) {
    // 如果是纯对象，那么 handler = handler.handler
    options = handler
    handler = handler.handler
  }
  // 判断 handler 是否为字符串
  if (typeof handler === 'string') {
    // 如果是字符串，那么读取 实例里面的方法
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}

export function stateMixin (Vue: Class<Component>) {
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  // 给Vue.prototype 定义 $data 属性，该属性有get方法，用来代理_data，且当非生产环境时候不能给他赋值
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  // 给Vue.prototype 定义 $props 属性，该属性有get方法, 用来代理_props，且当非生产环境时候不能给他赋值
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  // 在 Vue.prototype 上定义了 $set 方法
  Vue.prototype.$set = set
  // 在 Vue.prototype 上定义了 $delete 方法
  Vue.prototype.$delete = del

  // 在 Vue.prototype 上定义了 $watch 方法
  // expOrFn 是观察的属性，cb 需要的回调函数，options，一些可选项，比如deep等
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    // 将 this 缓存到 vm
    const vm: Component = this
    if (isPlainObject(cb)) { 
      // 如果 cb 是纯对象，调用 createWatcher 并且返回
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    // 定义为用户 Wathcer
    options.user = true
    const watcher = new Watcher(vm, expOrFn, cb, options)
    // 判断是否立即回调
    if (options.immediate) {
      // 如果立即执行回调，此时将最新到值传入回调中
      try {
        cb.call(vm, watcher.value)
      } catch (error) {
        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
      }
    }
    // 将 unwatchFn 函数，作为返回值，执行此函数，会解除观察者对观察属性的观察
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}

```