# dep

```javascript

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    // dep 的唯一标识
    this.id = uid++
    // 保存 Wather 的数组
    this.subs = []
  }

  // 添加 Watcher，这个方法是真正的收集观察者的方法
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  // 将 watcher 从 this.subs 也就是变量引用的那个dep闭包中删除
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  depend () {
    // 这里继续判断 Dep.target 是否有值的原因是 depend 不仅仅在 get 中调用
    if (Dep.target) {
      // Dep.target 其实就是一个 Wathcer实例
      Dep.target.addDep(this)
    }
  }

  notify () {
    // 复制 subs 数组，subs里面存放的是 watcher 实例
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // 在同步执行观察者时，我们需要先对 watcher 进行排序，用于保证更新的正确顺序
      subs.sort((a, b) => a.id - b.id)
    }
    // 遍历 wathcer，并且执行 wather 中的 update 方法
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// 获取当前对wather，在全局中，当前的wather是唯一的
Dep.target = null
const targetStack = []

// 给 Dep.target 属性赋值
export function pushTarget (target: ?Watcher) {
  // 将 target push 到 targetStack 数组
  targetStack.push(target)
  // 将 target 赋值给 Dep.target
  Dep.target = target
}

// 将当前 Wathcer 的前一个值赋值给 Dep.target，同时将当前 Wather 从 targetStack 移除掉
export function popTarget () {
  // 将栈顶的 Wather 推出去
  targetStack.pop()
  // 将倒数第二个 Wather 赋值给 Dep.target
  Dep.target = targetStack[targetStack.length - 1]
}

```