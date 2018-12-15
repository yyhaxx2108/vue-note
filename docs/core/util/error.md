# error

```javascript

import config from '../config'
import { warn } from './debug'
import { inBrowser, inWeex } from './env'

// 将捕获到的错误进行处理
export function handleError (err: Error, vm: any, info: string) {
  if (vm) {
    let cur = vm
    // 链表遍历，逐层寻找父级组件，如果父级组件使用了 errorCaptured 选项，则调用之
    while ((cur = cur.$parent)) {
      const hooks = cur.$options.errorCaptured
      if (hooks) {
        for (let i = 0; i < hooks.length; i++) {
          try {
            const capture = hooks[i].call(cur, err, vm, info) === false
            // 如果有 hooks[i].call(cur, err, vm, info) === false，那么会直接return
            // 此时 将阻止错误继续向“上级”传递
            if (capture) return
          } catch (e) {
            // 如果 hooks里面报错，那么交给 globalHandleError 处理
            globalHandleError(e, cur, 'errorCaptured hook')
          }
        }
      }
    }
  }
  // globalHandleError 是用来检测你是否自定义了 config.errorHandler 的，如果有则用之，如果没有就是用 logError
  globalHandleError(err, vm, info)
}

// 检测你是否自定义了 config.errorHandler 的，如果有则用之，如果没有就是用 logError
function globalHandleError (err, vm, info) {
  if (config.errorHandler) {
    // 如果定义了 config.errorHandler，那么尝试调用
    try {
      return config.errorHandler.call(null, err, vm, info)
    } catch (e) {
      // 如果 config.errorHandler 自身就有错误，那么用 logError 打印
      logError(e, null, 'config.errorHandler')
    }
  }
  // 如果没有定义了 config.errorHandler，那么用 logError 打印
  logError(err, vm, info)
}

function logError (err, vm, info) {
  if (process.env.NODE_ENV !== 'production') {
    // 在非生产环境中先打印警告
    warn(`Error in ${info}: "${err.toString()}"`, vm)
  }
  if ((inBrowser || inWeex) && typeof console !== 'undefined') {
    // 在浏览器或Weex中，如果存在原生 console，那么直接console.error打印
    console.error(err)
  } else {
    // 如果不满足之前的条件，那么抛出错误
    throw err
  }
}

```