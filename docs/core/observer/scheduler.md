# scheduler

```javascript

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

// 保存观察者的队列数组
const queue: Array<Watcher> = []
const activatedChildren: Array<Component> = []
// has 为空对象，用作标记 watcher 是否在队列中 
let has: { [key: number]: ?true } = {}
// 循环更新使用
let circular: { [key: number]: number } = {}
// 这个标识的作用是多次执行 queueWatcher，nextTick都只执行一次
let waiting = false
// 表示是否正在执行更新
let flushing = false
let index = 0

// 重置 SchedulerState
function resetSchedulerState () {
  // 将 queue、activatedChildren 的长度，以及 index 设置为 0
  index = queue.length = activatedChildren.length = 0
  // 将 has 设置为空对象
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    // 在非生产环境中，将 circular 设置为空对象
    circular = {}
  }
  // 将 waiting 和 flushing 设置为 false
  waiting = flushing = false
}

 // 刷新队列并且执行 watchers
function flushSchedulerQueue () {
  // 将 flushing 设置为 true
  flushing = true
  // 定义 watcher, id
  let watcher, id

  // 对 queue 进行排序
  // 1. 组件更新是从父到子，因为父元素总是在子元素之前创建
  // 2. 一个组件到自定义 watchers 要比他的渲染 watcher 先执行，因为用户 watcher 比渲染 watcher 先渲染
  // 3. 如果在父组件回调执行期间，子组件被销毁，子组件的 watcher 将被跳过
  queue.sort((a, b) => a.id - b.id)

  // 不要将 queue 数组的长度缓存下来，因为在执行存在的 watcher 中，可能会 push 更多的watcher
  // 遍历 queue
  for (index = 0; index < queue.length; index++) {
    // 将当前 watcher 缓存起来
    watcher = queue[index]
    // 如果存在 watcher.before，执行 watcher.before
    if (watcher.before) {
      // 该函数可能是调用 beforeUpdate
      watcher.before()
    }
    // 缓存 watcher.id
    id = watcher.id
    // 将 has[id] 设置成 null
    has[id] = null
    // 执行 watcher.run()
    watcher.run()
    // 判读是否存在无限循环更新
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      // 如果 has[id] 不为 null
      // 如果 circular[id] 不存在，则将其加1，否则将其自增1
      circular[id] = (circular[id] || 0) + 1
      // 如果 circular[id] > MAX_UPDATE_COUNT
      if (circular[id] > MAX_UPDATE_COUNT) {
        // 报警告
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        // 跳出循环
        break
      }
    }
  }

  // 在重置状态之前保存一份 post queues 的备份
  // activatedQueue 是给 keep-alive 用的
  const activatedQueue = activatedChildren.slice()
  // 保存 queue 的备份到 updatedQueue 上
  const updatedQueue = queue.slice()

  // 重置 SchedulerState
  resetSchedulerState()

  // 调用组件的 actived hooks
  callActivatedHooks(activatedQueue)
  // 调用组件的 update hooks
  callUpdatedHooks(updatedQueue)

  // devtool hook
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

// 调用 updatehook
function callUpdatedHooks (queue) {
  // 读取 queue 的长度
  let i = queue.length
  // 遍历 queue
  while (i--) {
    // 保存当前遍历到的 watcher
    const watcher = queue[i]
    // 保存当前遍历到的 vm
    const vm = watcher.vm
    // vm._watcher === watcher 说明该 Wather 是渲染 watcher
    // vm._isMounted 为 true 说明已经挂载
    // vm._isDestroyed 为 false 说明该 watcher 没有被销毁
    if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
      // 执行 updated 钩子函数
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

// 将 watcher 推入 watcher 队列中
// 相同的任务将会被跳过，除非他是在队列被刷新后才被推入
export function queueWatcher (watcher: Watcher) {
  // 缓存 wathcer.id
  const id = watcher.id
  // 判断 has 对象中是否缓存了此id，从而判断队列中是否有watcher，避免 watcher 重复入队
  if (has[id] == null) {
    // 如果没有当前 watcher，将观察者的 id 值加到 has 对象上并设置为 true
    has[id] = true
    // 判断当前 queue 是否处于更新状态，
    if (!flushing) {
      // 如果不处于更新状态，那么将 watcher push到 queue 尾部
      queue.push(watcher)
    } else {
      // 如果处于更新状态，通过 watcher.id 拼接 queue，如果超出，那么立即执行该watcher
      // 渲染函数中存在计算属性时会出现这种情况
      // 保存 queue 的长度到 i
      let i = queue.length - 1
      // 循环，当 i < index, 或 queue[i].id <= watcher.id 跳出循环
      while (i > index && queue[i].id > watcher.id) {
        // i--
        i--
      }
      // 往 queue 中插入 watcher
      queue.splice(i + 1, 0, watcher)
    }
    // 将 flushSchedulerQueue 加入异步任务中
    if (!waiting) {
      waiting = true
      // 在非生产环境下，且配置了 async 为false，那么所有观察者将同步执行
      if (process.env.NODE_ENV !== 'production' && !config.async) {
        flushSchedulerQueue()
        return
      }
      // 下一个 tick 执行，flushSchedulerQueue遍历队列，执行逻辑
      nextTick(flushSchedulerQueue)
    }
  }
}

```