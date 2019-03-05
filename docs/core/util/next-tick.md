# next-tick

```javascript

import { noop } from 'shared/util'
import { handleError } from './error'
import { isIOS, isNative } from './env'

// 定义回调队列
const callbacks = []
// 代表回调队列是否等待刷新状态，初始时为否
let pending = false

function flushCallbacks () {
  // 设置队列不为刷新状态
  pending = false
  // 复制当前任务队列
  const copies = callbacks.slice(0)
  // 清空任务队列
  callbacks.length = 0
  // 依次执行任务队列的 cb
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}
// 宏任务和微任务的作用都是将 flushCallbacks 推入事件队列中
// macroTimerFunc 中间可以插入 ui 渲染，因此，我们可以把数据更新放到 microTimerFunc 中
// 这样可以一次更新多个状态改变，提高性能
let microTimerFunc
let macroTimerFunc
let useMacroTask = false

// 确定宏任务的实现方式
if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // 第一选择是 setImmediate， 这个主要是ie支持
  // setImmediate 有更好的性能，因为 setTimeout 要不断的做超时检测
  macroTimerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else if (typeof MessageChannel !== 'undefined' && (
  isNative(MessageChannel) ||
  MessageChannel.toString() === '[object MessageChannelConstructor]'
)) {
  // 第二选择是 MessageChannel， MessageChannel 也不用做超时检测
  // 实例化一个 MessageChannel
  const channel = new MessageChannel()
  // 定义 channel.port2
  const port = channel.port2
  // 定义 channel.port1 的 onmessage 回调
  channel.port1.onmessage = flushCallbacks
  // 将 包装有 port.postMessage(1) 的方法赋值给 macroTimerFunc
  macroTimerFunc = () => {
    port.postMessage(1)
  }
} else {
  // 最后用 setTimeout
  macroTimerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

// 确定微任务的实现方式.
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  // Promise.resolve().then() 会注册一个微任务
  const p = Promise.resolve()
  microTimerFunc = () => {
    p.then(flushCallbacks)
    // 在一些 UIWebViews 中存在很奇怪的问题，即 microtask 没有被刷新，
    // 对于这个问题的解决方案就是让浏览做一些其他的事情比如注册一个 (macro)task 
    if (isIOS) setTimeout(noop)
  }
} else {
  // 如果环境中不支持 Promise，则降级成 macroTimerFunc
  microTimerFunc = macroTimerFunc
}

// 包装函数，以便如果其中有任何代码触发状态更改
// 使用 (macro) task 替换 microtask
export function withMacroTask (fn: Function): Function {
  // 返回 fn._withTask函数
  return fn._withTask || (fn._withTask = function () {
    // 将 useMacroTask 设置为 true
    useMacroTask = true
    try {
      // 尝试调用 fn，并且将其值返回 
      return fn.apply(null, arguments)
    } finally {
      // 重新将 useMacroTask 设置为 false
      useMacroTask = false    
    }
  })
}

// nextTick 实现
export function nextTick (cb?: Function, ctx?: Object) {
  let _resolve
  // 将匿名函数 push 到 callbacks，此时 cb 并不会立即执行
  callbacks.push(() => {
    // 该匿名函数执行时，将判读cb是否存在
    if (cb) {
      // 如果存在 cb，调用 cb 的
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      // 如果不存在 cb，将调用 _resolve，切换Promise状态
      _resolve(ctx)
    }
  })
  // 如果没有处于回调刷新状态
  if (!pending) {
    // 修改为处于回调刷新状态
    pending = true
    // 判断是否用 MacroTask 刷新任务队列
    if (useMacroTask) {
      macroTimerFunc()
    } else {
      microTimerFunc()
    }
  }
  // 如果不存在回调，且支持promise
  if (!cb && typeof Promise !== 'undefined') {
    // 返回一个 promise 实例
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}

```