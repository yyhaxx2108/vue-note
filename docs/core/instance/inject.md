# inject

```javascript
import { hasOwn } from 'shared/util'
import { warn, hasSymbol } from '../util/index'
import { defineReactive, toggleObserving } from '../observer/index'

// 初始化 provide
export function initProvide (vm: Component) {
  // 将 vm.$options.provide 保存到 provide 上
  const provide = vm.$options.provide
  // 如果存在 provide
  if (provide) {
    // 如果 provide 是方法，运行 provide 方法并且将其结果赋值给 vm._provided
    // 如果 provide 不是方法，直接将其结果赋值给 vm._provided
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}

// 初始化 inject
export function initInjections (vm: Component) {
  // 序列化 inject 并且将其保存到 result 上
  const result = resolveInject(vm.$options.inject, vm)
  // 如果 result 存在
  if (result) {
    // 关闭 observe
    toggleObserving(false)
    // 遍历 result 并且将其代理到vm上
    Object.keys(result).forEach(key => {
      if (process.env.NODE_ENV !== 'production') {
        // 在非生产环境中，对inject 赋值时将报警告
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        defineReactive(vm, key, result[key])
      }
    })
    // 打开 observe
    toggleObserving(true)
  }
}

export function resolveInject (inject: any, vm: Component): ?Object {
  // 如果存在 inject，inject 对象已经被规范化为 {data1: {from: 'data1', default: 'test'}}
  if (inject) {
    // 创建一个空对象
    const result = Object.create(null)
    // 判断是否原生拥有 Reflect
    // Reflect.ownKeys(inject) 返回包含自身属性不包含继承属性的数组
    const keys = hasSymbol
      ? Reflect.ownKeys(inject).filter(key => {
        return Object.getOwnPropertyDescriptor(inject, key).enumerable
      })
      : Object.keys(inject)
    // 遍历 keys
    for (let i = 0; i < keys.length; i++) {
      // 将 keys[i] 保存到 key 上面
      const key = keys[i]
      // 将 inject[key].from 保存到 provideKey 上
      const provideKey = inject[key].from
      // 将 vm 缓存到 source 上面
      let source = vm
      // 递归的在 vm.$parent 上面查找 _provided[provideKey]，找到便退出，并且将值复制个 result
      while (source) {
        // 如果 source 上面有 _provided，且该 _provided 有 provideKey
        if (source._provided && hasOwn(source._provided, provideKey)) {
          // 将 source._provided[provideKey] 赋值给 result[key]
          result[key] = source._provided[provideKey]
          // 跳出循环
          break
        }
        // 递归
        source = source.$parent
      }
      // 如果没有在祖先组件上找到值
      if (!source) {
        // 判断 defalut 是否存在
        if ('default' in inject[key]) {
          // 如果 inject[key].default 存在，将其值保存到 provideDefault
          const provideDefault = inject[key].default
          // 如果 provideDefault 是函数，则触发并且将其返回值赋值给result[key]，否则直接将 provideDefault 赋值给 result[key]
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault
        } else if (process.env.NODE_ENV !== 'production') {
          // 如果不存在 default，且在非生产环境中，报警告
          warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    // 返回 result 对象
    return result
  }
}

```