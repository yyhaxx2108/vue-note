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
  // 在非生产环境中对 props 值类型进行验证
  if (
    process.env.NODE_ENV !== 'production' &&
    // 跳过WEEX回收列表子组件属性的验证
    !(__WEEX__ && isObject(value) && ('@binding' in value))
  ) {
    // 完成校验工作
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

// 校验 prop 是否正确
function assertProp (
  prop: PropOptions,
  name: string,
  value: any,
  vm: ?Component,
  absent: boolean
) {
  if (prop.required && absent) {
    // 如果 prop.required 但是没有传入 prop，那么抛出警告并且返回
    warn(
      'Missing required prop: "' + name + '"',
      vm
    )
    return
  }
  if (value == null && !prop.required) {
    // 如果 value 为空，并且 prop 不是必须，直接返回，不必进行之后的校验
    return
  }
  // 下面的代码用来做类型断言，首先将 prop.type 赋值给 type
  let type = prop.type
  // valid 表示 type 是否校验成功，
  // !type 表示开发者并没有定义 type，和 type === true 一起不需要进行校验
  let valid = !type || type === true
  // 初始化一个空数组，并且赋值给 expectedTypes 常量
  const expectedTypes = []
  // 只有当 type 存在的时候才进行类型校验
  if (type) {
    if (!Array.isArray(type)) {
      // 如果 type 不是数组，组装一个 [type] 数组，并且赋值给 type
      type = [type]
    }
    // 遍历 type，并且用 assertType 对其进行断言
    for (let i = 0; i < type.length && !valid; i++) {
      // assertedType 函数会返回如 {assertedType.expectedType: 'String', valid: true}这样的结构
      const assertedType = assertType(value, type[i])
      // 将 assertedType.expectedType push到 expectedTypes 数组中
      expectedTypes.push(assertedType.expectedType || '')
      // 将 assertedType.valid 赋值给 valid，如果valid 为真，说明断言成功，将跳出循环
      valid = assertedType.valid
    }
  }

  // 如果此时 valid 为假，则说明用户传入的数据不满足期待的类型，将抛出警告
  if (!valid) {
    warn(
      getInvalidTypeMessage(name, value, expectedTypes),
      vm
    )
    return
  }
  // 缓存自定义校验函数
  const validator = prop.validator
  // 如果存在自定义校验，则进行校验
  if (validator) {
    // 如果校验不过，报警告
    if (!validator(value)) {
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      )
    }
  }
}

// 匹配字符串，String、Number、Boolean、Function、Symbol
const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/

// 断言数据类型
function assertType (value: any, type: Function): {
  valid: boolean;
  expectedType: string;
} {
  // 定义一个变量 valid
  let valid
  // 返回期望的数据类型字符串
  const expectedType = getType(type)
  // 判断 expectedType 是否 String|Number|Boolean|Function|Symbol 中的一种
  if (simpleCheckRE.test(expectedType)) {
    // 如果是，计算 value 的类型，并且保存到常量 t 上
    const t = typeof value
    // 判断 t 是否和 expectedType的小写相等，并把结果保存到 valid 上
    valid = t === expectedType.toLowerCase()
    // 如果不相等，但是 t 是基本包装对象, 如：new String('ddd')
    if (!valid && t === 'object') {
      // 判断 value 是否为 type 的 实例，并且将结果保存到 valid 上
      valid = value instanceof type
    }
  } else if (expectedType === 'Object') {
    // 如果 expectedType === 'Object'，那么判断 value 是否为纯对象，并且将结果保存到 valid 上
    valid = isPlainObject(value)
  } else if (expectedType === 'Array') {
    // 如果 expectedType === 'Array'，那么判断 value 是否为数组，并且将结果保存到 valid 上
    valid = Array.isArray(value)
  } else {
    // 判断 value 是否为 type 的 实例，并且将结果保存到 valid 上
    valid = value instanceof type
  }
  // 将 valid 和 expectedType 封装成对象，并且返回
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

// 校验失败的警告信息
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