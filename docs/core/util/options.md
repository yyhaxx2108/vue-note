# options
这个文件的主要作用是将父组件配置和子组件配置合并到一起并返回


```javascript

import config from '../config'
import { warn } from './debug'
import { nativeWatch } from './env'
import { set } from '../observer/index'

import {
  ASSET_TYPES,
  LIFECYCLE_HOOKS
} from 'shared/constants'

import {
  extend,
  hasOwn,
  camelize,
  toRawType,
  capitalize,
  isBuiltInTag,
  isPlainObject
} from 'shared/util'

// 此时strats是空对象
const strats = config.optionMergeStrategies

// 非生产环境中，el、propsData将采用默认合并选项，之所以包装一下是方便抛出警告
if (process.env.NODE_ENV !== 'production') {
  strats.el = strats.propsData = function (parent, child, vm, key) {
    // 如果 vm 不存在，说明是合并父子组件选项，此时，el、propsData将不能被合并，也就是说child上面不应该出现el、propsData
    if (!vm) {
      warn(
        `option "${key}" can only be used during instance ` +
        'creation with the `new` keyword.'
      )
    }
    // 此为默认合并策略，即如果子组件选项存在则返回子组件选项，否则返回父组件选项，这个合并策略其实是个函数
    return defaultStrat(parent, child)
  }
}

// 递归地将两个数据对象合并在一起的工具函数。总结出来就是：
// 1.to[key] 存在且不是纯对象，那么返回to[key]
// 2.to[key] 存在且是纯对象，但 from[key] 不是纯对象，那么返回 to[key]
// 3.to[key] 存在且是纯对象，且 from[key] 不是纯对象，递归调用 mergeData
// 4.to[key] 不存在，那么返回 from[key] 
function mergeData (to: Object, from: ?Object): Object {
  // 如果不存在 from 直接返回 to
  if (!from) return to
  let key, toVal, fromVal
  // 缓存from 对象中 keys 到数组 keys
  const keys = Object.keys(from)
  // 遍历keys
  for (let i = 0; i < keys.length; i++) {
    key = keys[i]
    toVal = to[key]
    fromVal = from[key]
    // 如果 to[key] 不存在，那么 set(to, key, fromVal)
    if (!hasOwn(to, key)) {
      // 用 set 是为了触发更改通知
      set(to, key, fromVal)
    } else if (
      toVal !== fromVal &&
      isPlainObject(toVal) &&
      isPlainObject(fromVal)
    ) {
      // 如果 toVal !== fromVal 且 两者都是纯对象，那么递归调用此方法
      mergeData(toVal, fromVal)
    }
  }
  return to
}

// 合并data的具体实现
export function mergeDataOrFn (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  if (!vm) {
    // 在 Vue.extend merge 中, parentVal和childVal都必须是functions，且返回的是函数
    if (!childVal) {
      // 没有 childVal，也就是说子组件的选项中没有 data 选项，那么直接返回 parentVal，如：Parent.extend({})
      return parentVal
    }
    if (!parentVal) {
      return childVal
    }
    // 当parentVal和childVal都存在时，我们需要返回一个函数，该函数返回两个函数的合并结果，这里不需要检查parentVal是否是一个函数，因为它必须是传递先前合并的函数
    return function mergedDataFn () {
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
      )
    }
  } else {
    // 合并实例与构造函数中的data，返回的是函数
    return function mergedInstanceDataFn () {
      // 通过调用函数，先获取到值
      const instanceData = typeof childVal === 'function'
        ? childVal.call(vm, vm)
        : childVal
      const defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm, vm)
        : parentVal
      if (instanceData) {
        // 如果存在 instanceData，调用 mergeData，且将值返回
        return mergeData(instanceData, defaultData)
      } else {
        // 如果部存在 instanceData，直接返回defaultData
        return defaultData
      }
    }
  }
}

// 给 data 加上合并策略
strats.data = function (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  if (!vm) {
    // 合并父子组件的 data
    if (childVal && typeof childVal !== 'function') {
      // 子组件的 data 应该为 function，如果不是则直接返回 parentVal，并报警告
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      )

      return parentVal
    }
    return mergeDataOrFn(parentVal, childVal)
  }
  // 合并实例和构造函数的 data
  return mergeDataOrFn(parentVal, childVal, vm)
}

// 生命周期钩子合并方法
function mergeHook (
  parentVal: ?Array<Function>,
  childVal: ?Function | ?Array<Function>
): ?Array<Function> {
  return childVal                    // 是否存在 childVal
    ? parentVal                      // 是否存在 parentVal
      ? parentVal.concat(childVal)   // 如果存在 parentVal 和 childVal 那么直接将二者合并
      : Array.isArray(childVal)      // 如果不存在 parentVal，那么判读 childVal 是否为数组
        ? childVal                   // 是数组则直接返回
        : [childVal]                 // 不是数组，那么包装成数组返回
    : parentVal
}

// 给实例的生命周期钩子加上合并策略
LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

// 当存在vm时，我们需要在构造函数选项、实例选项和父选项之间进行三向合并。
function mergeAssets (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): Object {
  // 如果 parentVal 存在，我们将 res 的 __proto__ 赋值成为 parentVal, 如果不存在，res 的 __proto__ 为 undefined
  const res = Object.create(parentVal || null)
  if (childVal) {
    // 如果在非生产环境中，如果 childVal 不是纯对象那么报警告
    process.env.NODE_ENV !== 'production' && assertObjectType(key, childVal, vm)
    // 返回合并后的 res，res 自身是 与 options 属性一样，原型上面挂载了父级元素的属性
    return extend(res, childVal)
  } else {
    return res
  }
}

// 给component、directive、filter加上合并策略
ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

// 给 watch 加上合并策略，Watchers 不能被覆盖，所以把 Watchers 当成数组处理
strats.watch = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  // 火狐浏览器上面存在 watch， 所以需要以下处理
  if (parentVal === nativeWatch) parentVal = undefined
  if (childVal === nativeWatch) childVal = undefined
  // 当 childVal 不存在时，返回 Object.create(parentVal || null)
  if (!childVal) return Object.create(parentVal || null)
  if (process.env.NODE_ENV !== 'production') {
    // 在非生产环境中，先断言 childVal 是否为对象
    assertObjectType(key, childVal, vm)
  }
  // // 当 parentVal 不存在时，返回 childVal
  if (!parentVal) return childVal
  // 定义 ret 常量，其值为一个对象
  const ret = {}
  // 将 parentVal 的属性混合到 ret 中，后面处理的都将是 ret 对象，最后返回的也是 ret 对象
  extend(ret, parentVal)
  // 遍历 childVal
  for (const key in childVal) {
    // 由于遍历的是 childVal，所以 key 是子选项的 key，父选项中未必能获取到值，所以 parent 未必有值
    let parent = ret[key]
    const child = childVal[key]
    // 如果 parent 存在，就将其转为数组
    if (parent && !Array.isArray(parent)) {
      parent = [parent]
    }
    // 如果 parent 存在，此时的 parent 应该已经被转为数组了，所以直接将 child concat 进去
    // 如果 parent 不存在，直接将 child 转为数组返回
    ret[key] = parent
      ? parent.concat(child)
      : Array.isArray(child) ? child : [child]
  }
  // 最后返回新的 ret 对象
  return ret
}

// props、methods、inject、computed 的 合并策略
strats.props =
strats.methods =
strats.inject =
strats.computed = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  if (childVal && process.env.NODE_ENV !== 'production') {
    // 首先断言 childVal 是否为 Object
    assertObjectType(key, childVal, vm)
  }
  // parentVal 不存在的情况下直接返回 childVal
  if (!parentVal) return childVal
  // 如果 parentVal 存在，则创建 ret 对象，然后分别将 parentVal 和 childVal 的属性混合到 ret 中，childVal 将覆盖 parentVal 的同名属性
  const ret = Object.create(null)
  extend(ret, parentVal)
  if (childVal) extend(ret, childVal)
  // 最后返回 ret 对象。
  return ret
}
// provide 的合并策略，此合并策略和data的一样
strats.provide = mergeDataOrFn

// 默认合并策略，如果 childVal 存在，则使用 childVal 的值，否则使用 parentVal
const defaultStrat = function (parentVal: any, childVal: any): any {
  return childVal === undefined
    ? parentVal
    : childVal
}

// 检查components子组件的命名是否规范
function checkComponents (options: Object) {
  for (const key in options.components) {
    validateComponentName(key)
  }
}

// 1.组件的名字要满足正则表达式：/^[a-zA-Z][\w-]*$/
// 要满足：条件 isBuiltInTag(name) || config.isReservedTag(name) 不成立
export function validateComponentName (name: string) {
  if (!/^[a-zA-Z][\w-]*$/.test(name)) {
    warn(
      'Invalid component name: "' + name + '". Component names ' +
      'can only contain alphanumeric characters and the hyphen, ' +
      'and must start with a letter.'
    )
  }
  // isBuiltInTag判断是否为内置的标签，即 slot 或 component
  // config.isReservedTag判断是否为，即原生html标签，或者svg标签
  if (isBuiltInTag(name) || config.isReservedTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component ' +
      'id: ' + name
    )
  }
}

// 将所有的 props 都规范化成为 Object-based 形式 即 props: {aaBb: {type: null}}
function normalizeProps (options: Object, vm: ?Component) {
  // 缓存下props
  const props = options.props
  // 如果不存在，那么直接return
  if (!props) return
  const res = {}
  let i, val, name
  if (Array.isArray(props)) {
    //如果 props 为数组, 直接循环数组
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        // 如果数组里面的值是字符串，那么将其格式化成 {aaBb: {type: null}} 形式
        name = camelize(val)
        res[name] = { type: null }
      } else if (process.env.NODE_ENV !== 'production') {
        // 如果不是字符串，则报警告
        warn('props must be strings when using array syntax.')
      }
    }
  } else if (isPlainObject(props)) {
    // 如果 props 是一个对象，则进行一下处理
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    // 如果 props 既不是数组，也不是对象，那么报警告
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` +
      `but got ${toRawType(props)}.`,
      vm
    )
  }
  options.props = res
}

// 规范化 child 里面的 Inject
function normalizeInject (options: Object, vm: ?Component) {
  // 缓存inject 且如果inject 不存在，则直接退出
  const inject = options.inject
  if (!inject) return

  const normalized = options.inject = {}
  if (Array.isArray(inject)) {
    // 当 inject 是数组时，循环该数组，并且将其保存到对象中，格式为{aa: {from: aa}}
    for (let i = 0; i < inject.length; i++) {
      normalized[inject[i]] = { from: inject[i] }
    }
  } else if (isPlainObject(inject)) {
    // 当 inject 为对象时， 格式化为{aa: {from: key, bb: bb}}
    for (const key in inject) {
      const val = inject[key]
      normalized[key] = isPlainObject(val)
        ? extend({ from: key }, val)
        : { from: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    // 当 inject 既不是数组，又不是对象时，报错
    warn(
      `Invalid value for option "inject": expected an Array or an Object, ` +
      `but got ${toRawType(inject)}.`,
      vm
    )
  }
}

// 规范化 child 里面的 Directives
function normalizeDirectives (options: Object) {
  const dirs = options.directives
  if (dirs) {
    // 如果 dirs[key] 是函数，则将其规范化成 { bind: dirs[key], update: dirs[key] }形式
    for (const key in dirs) {
      const def = dirs[key]
      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def }
      }
    }
  }
}

// 断言 value 是否为纯对象
function assertObjectType (name: string, value: any, vm: ?Component) {
  if (!isPlainObject(value)) {
    warn(
      `Invalid value for option "${name}": expected an Object, ` +
      `but got ${toRawType(value)}.`,
      vm
    )
  }
}

// 合并options，这个在组件实例化或继承当中都有用到，parent 为构造函数解析出来的options，child 为传入的options
// 产生一个新的对象
export function mergeOptions (
  parent: Object,
  child: Object,
  vm?: Component
): Object {
  // 在非生产环境下，首先检查child中component.key的命名是否规范
  if (process.env.NODE_ENV !== 'production') {
    checkComponents(child)
  }

  // 说明child还可以是一个函数，也就是说，我们甚至可以将两个构造函数进行合并
  if (typeof child === 'function') {
    child = child.options
  }

  // 规范化 child 里面的 props
  normalizeProps(child, vm)
  // 规范化 child 里面的 Inject
  normalizeInject(child, vm)
  // 规范化 child 里面的 Directives
  normalizeDirectives(child)
  
  // 将 child 上面的 mixins 和 extends 合并到 parent 上面，只有当 child 不是 另一个mergeoptions 调用结果的原始对象，切存在_base属性
  if (!child._base) {
    // 判断 child.extends 是否存在，如果存在 递归调用 mergeOptions，并且保存在覆盖 parent
    if (child.extends) {
      parent = mergeOptions(parent, child.extends, vm)
    }
    // 与 extends 一样，不过 mixins 是数组
    if (child.mixins) {
      for (let i = 0, l = child.mixins.length; i < l; i++) {
        parent = mergeOptions(parent, child.mixins[i], vm)
      }
    }
  }

  // 接下来是真正的合并操作
  const options = {}
  let key
  // 遍历 parent 并且进行mergeField
  for (key in parent) {
    mergeField(key)
  }
  // 遍历 child 如果 parent 自身有此方法，进行mergeField，因为前面一个for in 已经调用了
  for (key in child) {
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }
  function mergeField (key) {
    // 如果上面对 strats[key] 有定义则使用 strats[key] 否则使用 defaultStrat
    const strat = strats[key] || defaultStrat
    // 通过合并策略计算出key 的值，并保存到options上
    options[key] = strat(parent[key], child[key], vm, key)
  }
  // 将 options 返回
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */
export function resolveAsset (
  options: Object,
  type: string,
  id: string,
  warnMissing?: boolean
): any {
  if (typeof id !== 'string') {
    return
  }
  const assets = options[type]
  // check local registration variations first
  if (hasOwn(assets, id)) return assets[id]
  const camelizedId = camelize(id)
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]
  const PascalCaseId = capitalize(camelizedId)
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]
  // fallback to prototype chain
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}

```