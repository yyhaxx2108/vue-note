# props

```javascript

import { warn } from './debug'
import { observe, toggleObserving, shouldObserve } from '../observer/index'
import {
  hasOwn,
  isObject,
  toRawType,
  hyphenate,
  capitalize,
  isPlainObject
} from 'shared/util'

type PropOptions = {
  type: Function | Array<Function> | null,
  default: any,
  required: ?boolean,
  validator: ?Function
};

// key 为 prop 的名字， propOptions 数据选项对象，propsData数据来源对象
export function validateProp (
  key: string,
  propOptions: Object,
  propsData: Object,
  vm?: Component
): any {
  // 缓存数据选项对象
  const prop = propOptions[key]
  // 判断是否传入 props 数据给组件
  const absent = !hasOwn(propsData, key)
  // 读取传入的 props 值
  let value = propsData[key]
  // 获取 Boolean 在 prop.type 中的index
  const booleanIndex = getTypeIndex(Boolean, prop.type)
  if (booleanIndex > -1) {
    // 如果 booleanIndex > -1，说明在 props 的定义中指定了 Boolean 类型
    // 判断是否没有传入 props 并且不存在 default
    if (absent && !hasOwn(prop, 'default')) {
      // 如果没有传入 props 并且不存在 default，那么将 value = false
      value = false
    } else if (value === '' || value === hyphenate(key)) {
      // 如果 value 是一个空字符串，或者 value === hyphenate(key)，读取 String 在 prop.type 的位置
      const stringIndex = getTypeIndex(String, prop.type)
      // 如果 prop.type 中不存在 String，或者 Boolen 的声明具有更高的优先级，那么 value = true
      if (stringIndex < 0 || booleanIndex < stringIndex) {
        value = true
      }
    }
  }
  // 如果没有传入 props 数据给组件
  if (value === undefined) {
    // 调用 getPropDefaultValue 获取 value 的值
    value = getPropDefaultValue(vm, prop, key)
    // 因为默认值为新复本，所以需要手动 observe
    // 首先保存 shouldObserve 的状态
    const prevShouldObserve = shouldObserve
    // 打开 observe 开关
    toggleObserving(true)
    // observe value值
    observe(value)
    // 还原 shouldObserve 到之前的状态
    toggleObserving(prevShouldObserve)
  }
  if (
    process.env.NODE_ENV !== 'production' &&
    // skip validation for weex recycle-list child component props
    !(__WEEX__ && isObject(value) && ('@binding' in value))
  ) {
    assertProp(prop, key, value, vm, absent)
  }
  return value
}

// 获取 props 的默认值
function getPropDefaultValue (vm: ?Component, prop: PropOptions, key: string): any {
  // 如果没有 default 直接返回 undefined
  if (!hasOwn(prop, 'default')) {
    return undefined
  }
  // 将 prop.default 的引用保存到 def 上面
  const def = prop.default
  // 如果 def 是对象或数组或Set 等引用类型，直接报警告，此时应该是一个构造函数方法返回该引用类型
  // 这样做的目的是为了避免多个组件实例共用一份数据而造成的数据污染问题
  if (process.env.NODE_ENV !== 'production' && isObject(def)) {
    warn(
      'Invalid default value for prop "' + key + '": ' +
      'Props with type Object/Array must use a factory function ' +
      'to return the default value.',
      vm
    )
  }
  // 在之前的 render 中，原始的props值是undefined， 返回之前的默认值避免触发不必要等watcher
  // 判断 vm.$options.propsData[key] === undefined 的原因是组件第一次创建和更新是两套不一样的逻辑
  // 下面这段代码是为更新逻辑准备的
  if (vm && vm.$options.propsData &&
    vm.$options.propsData[key] === undefined &&
    vm._props[key] !== undefined
  ) {
    // 当组件处于更新状态，且没有传递该props数据给组件
    // 上一次更新或创建时，外界也没有像该组件传递该props数据
    // 上一次组件更新或创建时，该 props 拥有一个部位 undefined 的默认值
    // 直接返回默认值，防治触发没有意义的响应
    return vm._props[key]
  }
  // 调用非函数类型的工厂函数
  // 如果一个值的原型是函数，即使在不同的执行上下文中也是函数
  return typeof def === 'function' && getType(prop.type) !== 'Function'
    ? def.call(vm)
    : def
}

/**
 * Assert whether a prop is valid.
 */
function assertProp (
  prop: PropOptions,
  name: string,
  value: any,
  vm: ?Component,
  absent: boolean
) {
  if (prop.required && absent) {
    warn(
      'Missing required prop: "' + name + '"',
      vm
    )
    return
  }
  if (value == null && !prop.required) {
    return
  }
  let type = prop.type
  let valid = !type || type === true
  const expectedTypes = []
  if (type) {
    if (!Array.isArray(type)) {
      type = [type]
    }
    for (let i = 0; i < type.length && !valid; i++) {
      const assertedType = assertType(value, type[i])
      expectedTypes.push(assertedType.expectedType || '')
      valid = assertedType.valid
    }
  }

  if (!valid) {
    warn(
      getInvalidTypeMessage(name, value, expectedTypes),
      vm
    )
    return
  }
  const validator = prop.validator
  if (validator) {
    if (!validator(value)) {
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      )
    }
  }
}

const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/

function assertType (value: any, type: Function): {
  valid: boolean;
  expectedType: string;
} {
  let valid
  const expectedType = getType(type)
  if (simpleCheckRE.test(expectedType)) {
    const t = typeof value
    valid = t === expectedType.toLowerCase()
    // for primitive wrapper objects
    if (!valid && t === 'object') {
      valid = value instanceof type
    }
  } else if (expectedType === 'Object') {
    valid = isPlainObject(value)
  } else if (expectedType === 'Array') {
    valid = Array.isArray(value)
  } else {
    valid = value instanceof type
  }
  return {
    valid,
    expectedType
  }
}

// 用 instanceof 判断数据类型，在跨iframe中将失败
function getType (fn) {
  // 我们通过 fn.toString() 然后在进行正则判断将不会出现这个问题
  const match = fn && fn.toString().match(/^\s*function (\w+)/)
  return match ? match[1] : ''
}

// 判断给定的两个构造函数类型是否相同
function isSameType (a, b) {
  return getType(a) === getType(b)
}

// 判断 type 是否存在在 expectedTypes 数组中
function getTypeIndex (type, expectedTypes): number {
  if (!Array.isArray(expectedTypes)) {
    // 如果 expectedTypes 不是数组，调用 isSameType 函数
    // 如果 expectedTypes 与 type 相同，则返回 0， 否则返回 -1
    return isSameType(expectedTypes, type) ? 0 : -1
  }
  // 如果是数组则遍历 expectedTypes，并且 type 在 expectedTypes 中的位置
  for (let i = 0, len = expectedTypes.length; i < len; i++) {
    if (isSameType(expectedTypes[i], type)) {
      return i
    }
  }
  // 如果 type 不在 expectedTypes 中，返回 -1
  return -1
}

function getInvalidTypeMessage (name, value, expectedTypes) {
  let message = `Invalid prop: type check failed for prop "${name}".` +
    ` Expected ${expectedTypes.map(capitalize).join(', ')}`
  const expectedType = expectedTypes[0]
  const receivedType = toRawType(value)
  const expectedValue = styleValue(value, expectedType)
  const receivedValue = styleValue(value, receivedType)
  // check if we need to specify expected value
  if (expectedTypes.length === 1 &&
      isExplicable(expectedType) &&
      !isBoolean(expectedType, receivedType)) {
    message += ` with value ${expectedValue}`
  }
  message += `, got ${receivedType} `
  // check if we need to specify received value
  if (isExplicable(receivedType)) {
    message += `with value ${receivedValue}.`
  }
  return message
}

function styleValue (value, type) {
  if (type === 'String') {
    return `"${value}"`
  } else if (type === 'Number') {
    return `${Number(value)}`
  } else {
    return `${value}`
  }
}

function isExplicable (value) {
  const explicitTypes = ['string', 'number', 'boolean']
  return explicitTypes.some(elem => value.toLowerCase() === elem)
}

function isBoolean (...args) {
  return args.some(elem => elem.toLowerCase() === 'boolean')
}

```