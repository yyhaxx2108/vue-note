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
    // 保存原生方法运行结果
    const result = original.apply(this, args)
    // 这里的 this 是数组本身，ob 是一个 Observe 实例对象
    const ob = this.__ob__
    // push, unshift, splice 都会往数组里面增加元素，新增加的元素用insert 缓存
    // inserted 是数组
    // splice 第三个以后的都是需要插入数组的元素
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
    // inserted 是数组，所以调用 ob.observeArray 继续观察 inserted
    if (inserted) ob.observeArray(inserted)
    // 数组发生改变，所以触发依赖
    ob.dep.notify()
    // 返回原生方法的运行结果
    return result
  })
})
```