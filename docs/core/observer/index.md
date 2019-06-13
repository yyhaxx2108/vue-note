# index

```javascript

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

// 获取自身变异方法 keys
const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

// 某些情况下，我们可能希望禁用组件更新计算中的观察
export let shouldObserve: boolean = true

// 修改是否可以观察的标志
export function toggleObserving (value: boolean) {
  shouldObserve = value
}

// 附加到每个观察对象的观察器类
// 一旦附加，观察者将目标对象的属性键转换为收集依赖项和分派更新的getter/setter
export class Observer {
  // 数据对象本身
  value: any;
  // Dep 实例对象
  dep: Dep;
  // 用此对象为根数据的 vm 的数量
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    // 引用了数据对象本身，这是一个循环引用
    this.value = value
    // 实例化一个dep
    this.dep = new Dep()
    // vmCount 初始为0
    this.vmCount = 0
    // 使用 def 函数，为数据对象定义了一个 __ob__ 属性，这个属性的值就是当前 Observer 实例对象
    // 这里的 __ob__ 是不可枚举的属性，防止后面被遍历到
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      // 如果 value 是数组则进行下面操作
      if (hasProto) {
        // 如果存在 __proto__, __proto__ ie11后才开始支持
        protoAugment(value, arrayMethods)
      } else {
        // 如果不存在 __proto__
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 对数组里面的元素进行观测
      this.observeArray(value)
    } else {
      // 如果 value 是对象则直接walk
      this.walk(value)
    }
  }

  // 当 value 是对象时会调用此方法
  // 遍历所有的属性，并且将他们转化为 getter/setters
  walk (obj: Object) {
    // 获取可以枚举的 keys
    const keys = Object.keys(obj)
    // 遍历keys，并且调用 defineReactive
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  // 分别对数组的元素进行观测
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// 如果存在 __proto__，通过拦截原型链，增强目标对象，直接将对象的原型修改为 __proto__
function protoAugment (target, src: Object) {
  target.__proto__ = src
}

// 如果不存在 __proto__，通过定义隐藏属性或方法来扩展对象
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

// 观测的工厂函数，试图为值创建一个观察者对象实例，
// 如果观察成功，将创建好的对象返回，
// 如果已经存在观察者，则将存在的观察者返回
// value 为需要观测的值，asRootData 表示是否当作根级数据
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    // 如果 value 不是纯对象或者是VNode 则直接返回
    return
  }
  // 用 ob 保存一个 Observer 实例
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    // 如果已经存在观察者，则将存在的观察者返回，避免重复观察
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    // 可以观测的条件是
    // 1.shouldObserve 为 true, 在 initProps 中，defineReactive 时，会将其设置会false
    // 2.不是服务端渲染
    // 3.是纯对象或者数组
    // 4.改对象是可以在上面添加新属性的，Object.preventExtensions，Object.seal 或 Object.freeze 都可以禁止添加属性
    // 5.value._isVue 必须为真
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    // 如果是根对象，且存在 ob，那么 ob.vmCount++
    // 根数据对象不能添加响应式属性
    ob.vmCount++
  }
  return ob
}

// 定义一个响应式的对象
// 该函数核心就是将数据对象的数据属性转换为访问器属性，即设置一对 getter/setter
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 首先实例化了一个 Dep 对象，这个对象会闭包保存
  // 每一个key 都有一个 dep 对象来收集对应的依赖
  const dep = new Dep()
  // 方法返回指定对象上一个自有属性对应的属性描述符
  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 如果 property.configurable === false 则说明定义的 value 不可枚举，那么直接返回
  if (property && property.configurable === false) {
    return
  }

  // 缓存预定义的 getter
  const getter = property && property.get
  // 缓存预定义的 setter
  const setter = property && property.set

  // !getter || setter 的目的是保证定义响应式数据行为的一致性
  // arguments.length === 2 是当前函数只传递了两参数
  if ((!getter || setter) && arguments.length === 2) {
    // 根据 key 获取 val
    val = obj[key]
  }

  // 当!shallow 时，observe(val)，并且赋值给 childOb，observe 返回值是一个Observe的实例对象
  let childOb = !shallow && observe(val)
  // 转化成为 getter/setter
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 如果存在 getter 方法，那么调用 getter 取值，否则用 val 当 value 的值
      const value = getter ? getter.call(obj) : val
      // 收集依赖，其中 Dep.target 为要被收集对依赖
      if (Dep.target) {
        // 如果存在需要被收集对依赖，执行依赖收集，dep 为当前对象下面对闭包
        // 此依赖触发的时机是当前属性值被修改
        dep.depend()
        // childOb 也被闭包引用
        if (childOb) {
          // childOb 存在，childOb.dep.depend 也搜集依赖
          // 此依赖触发的时机是 Vue.set 给对象添加新的属性
          childOb.dep.depend()

          if (Array.isArray(value)) {
            // 如果是数组，进行 dependArray 操作
            dependArray(value)
          }
        }
      }
      // 返回 value
      return value
    },
    set: function reactiveSetter (newVal) {
      // 首先获取到 value 值
      const value = getter ? getter.call(obj) : val
      // 如果新的值和原来的值相等，或者是NaN，那么直接返回，不用进行操作
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      
      // 在非生产环境中，如果 customSetter 存在，则调用 customSetter，如initRender
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // 避免不必要的观察
      if (getter && !setter) return
      // 设置新的值
      if (setter) {
        // 如果存在setter，则调用setter
        setter.call(obj, newVal)
      } else {
        // 如果不存在setter，则 val = newVal
        val = newVal
      }
      // 当 !shallow，newVal可能是对象，或者是数组，所以我们需要对他进行观察
      childOb = !shallow && observe(newVal)
      // 触发依赖
      dep.notify()
    }
  })
}

// 在对象上设置属性。添加新属性，如果属性不存在，则触发更改通知。
// target 是将要被添加属性的对象, 参数 key 是健名，val 是值
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    // 如果 target 是基础类型，那么报警告
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target)}`)
  }

  // 当 target 是数组，并且 key 是有效的索引值时，进行以下操作
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    // 首先增加 target 长度
    target.length = Math.max(target.length, key)
    // 修改 target 中 key 元素的值为 val，splice方法本身是能够触发响应
    target.splice(key, 1, val)
    // 返回 val
    return val
  }
  // 当 key 是 target 自身的元素时，如下：
  if (key in target && !(key in Object.prototype)) {
    // 将 val 赋值给 target[key]，赋值的过程将触发响应
    target[key] = val
    // 返回 val
    return val
  }
  // 下面操作是给对象添加一个新的属性
  // ob 引用数据对象 target.__ob__
  const ob = target.__ob__
  // 1. 不能给 vm 实例添加响应式属性
  // 2. 不能给根数据对象添加响应式属性，原因就是根数据对象的 Observer 实例收集不到依赖
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    // 如果 target 原本就不是响应式的，那么直接赋值即可
    target[key] = val
    return val
  }
  // 将新添加的属性修改为响应式
  defineReactive(ob.value, key, val)
  // 触发收集到的依赖
  ob.dep.notify()
  // 返回 val
  return val
}

// 删除属性，在需要的情况下，触发搜集到的依赖
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    // 如果 target 是基础类型，那么报警告
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    // 当 target 是数组，并且 key 是有效的索引值时，splice能触发响应
    target.splice(key, 1)
    return
  }
  const ob = (target).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    // 不能用于删除 vm 或 根数据上面的data
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  // 如果key 不是 target 上面的属性，直接 return
  if (!hasOwn(target, key)) {
    return
  }
  // 删除当前属性
  delete target[key]
  // 如果不是响应式的，直接return
  if (!ob) {
    return
  }
  // 如果是响应式的，那么触发收集到的依赖
  ob.dep.notify()
}

// 给数组内部元素也添加上数组的依赖，这个我们就可以劫持数组内部元素的变化
// 数组的索引是非响应式的，因为索引并不是“访问器属性”
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    // 获取每个元素的值
    e = value[i]
    // 如果 拥有 __ob__ 那么说明 e 是 对象或数组，此时在 e.__ob__.dep 中对依赖进行收集
    e && e.__ob__ && e.__ob__.dep.depend()
    // 如果 e 是数组，那么递归的 dependArray
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}

```