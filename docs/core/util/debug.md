# debug
```javascript

import config from '../config'
import { noop } from 'shared/util'

export let warn = noop
export let tip = noop
export let generateComponentTrace = (noop: any) // work around flow check
export let formatComponentName = (noop: any)

if (process.env.NODE_ENV !== 'production') {
  // 检测宿主环境的 console 是否可用
  const hasConsole = typeof console !== 'undefined'
  // 用于 classify 函数
  const classifyRE = /(?:^|[-_])(\w)/g
  // 函数的作用是将一个字符串的首字母以及中横线转为驼峰
  const classify = str => str.replace(classifyRE, c => c.toUpperCase()).replace(/[-_]/g, '')

  // 警告函数
  warn = (msg, vm) => {
    const trace = vm ? generateComponentTrace(vm) : ''

    if (config.warnHandler) {
      config.warnHandler.call(null, msg, vm, trace)
    } else if (hasConsole && (!config.silent)) {
      console.error(`[Vue warn]: ${msg}${trace}`)
    }
  }

  // 提示函数
  tip = (msg, vm) => {
    if (hasConsole && (!config.silent)) {
      console.warn(`[Vue tip]: ${msg}` + (
        vm ? generateComponentTrace(vm) : ''
      ))
    }
  }

  // 格式化组件名称
  formatComponentName = (vm, includeFile) => {
    if (vm.$root === vm) {
      // 如果 vm.$root === vm，直接返回 '<Root>'
      return '<Root>'
    }
    // 缓存 options 
    // 如果 vm 是 function 并且 vm.cid != null, options = vm.options
    // 如果不满足上面的条件，但是vm.$options 或 vm.constructor.options, 则 options = vm.$options || vm.constructor.options 
    // 否则 options = vm || {}
    const options = typeof vm === 'function' && vm.cid != null 
      ? vm.options   
      : vm._isVue
        ? vm.$options || vm.constructor.options 
        : vm || {}
    // 缓存组件名称或组件标签名称
    let name = options.name || options._componentTag
    // 读取缓存的文件路径
    const file = options.__file
    // 如果 name 不存在，但是 options.__file 存在，那么 name 为 文件名
    if (!name && file) {
      const match = file.match(/([^/\\]+)\.vue$/)
      name = match && match[1]
    }
    // 将 name 和 file（如果存在）那么拼接成字符串返回
    return (
      (name ? `<${classify(name)}>` : `<Anonymous>`) +
      (file && includeFile !== false ? ` at ${file}` : '')
    )
  }

  const repeat = (str, n) => {
    let res = ''
    while (n) {
      if (n % 2 === 1) res += str
      if (n > 1) str += str
      n >>= 1
    }
    return res
  }

  generateComponentTrace = vm => {
    if (vm._isVue && vm.$parent) {
      // 如果 vm._isVue 和 vm.$parent 都存在
      const tree = []
      let currentRecursiveSequence = 0
      while (vm) {
        if (tree.length > 0) {
          const last = tree[tree.length - 1]
          if (last.constructor === vm.constructor) {
            currentRecursiveSequence++
            vm = vm.$parent
            continue
          } else if (currentRecursiveSequence > 0) {
            tree[tree.length - 1] = [last, currentRecursiveSequence]
            currentRecursiveSequence = 0
          }
        }
        tree.push(vm)
        vm = vm.$parent
      }
      return '\n\nfound in\n\n' + tree
        .map((vm, i) => `${
          i === 0 ? '---> ' : repeat(' ', 5 + i * 2)
        }${
          Array.isArray(vm)
            ? `${formatComponentName(vm[0])}... (${vm[1]} recursive calls)`
            : formatComponentName(vm)
        }`)
        .join('\n')
    } else {
      // 如果 vm._isVue 或 vm.$parent 有一个不存在，则返回如下文案
      return `\n\n(found in ${formatComponentName(vm)})`
    }
  }
}

```