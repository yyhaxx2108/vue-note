# array
```javascript
import { def } from '../util/index'

const arrayProto = Array.prototype
// arrayMethods 是一个对象， arrayMethods.__proto__ 与 new Array() 的 __proto__ 相同
export const arrayMethods = Object.create(arrayProto)

// 变异方法
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

// 拦截变异方法，并且emit事件
methodsToPatch.forEach(function (method) {
  // 缓存原始方法
  const original = arrayProto[method]
  
  def(arrayMethods, method, function mutator (...args) {
    const result = original.apply(this, args)
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    if (inserted) ob.observeArray(inserted)
    // notify change
    ob.dep.notify()
    return result
  })
})
```