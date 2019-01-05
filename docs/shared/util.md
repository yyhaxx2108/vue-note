# util
```javascript

// Object.freeze() 方法可以冻结一个对象
export const emptyObject = Object.freeze({})

// 判断给定变量是否是未定义，当变量值为 null时，也会认为其是未定义
export function isUndef (v: any): boolean %checks {
  return v === undefined || v === null
}

// 判断给定变量是否定义
export function isDef (v: any): boolean %checks {
  return v !== undefined && v !== null
}

// 判断给定变量是否是 true
export function isTrue (v: any): boolean %checks {
  return v === true
}

// 判断给定变量是否是 false
export function isFalse (v: any): boolean %checks {
  return v === false
}

// 判断给定变量是否是原始类型值，即 string，number，boolean，symbol
export function isPrimitive (value: any): boolean %checks {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    // $flow-disable-line
    typeof value === 'symbol' ||
    typeof value === 'boolean'
  )
}

// 主要是为了区分原始值
export function isObject (obj: mixed): boolean %checks {
  return obj !== null && typeof obj === 'object'
}


const _toString = Object.prototype.toString

// 返回给定变量的原始类型字符串
export function toRawType (value: any): string {
  return _toString.call(value).slice(8, -1)
}

// 判读obj 是否为一个纯对象
export function isPlainObject (obj: any): boolean {
  return _toString.call(obj) === '[object Object]'
}

// 判读是否为正则表达式
export function isRegExp (v: any): boolean {
  return _toString.call(v) === '[object RegExp]'
}

// 检查是否为有效的索引
export function isValidArrayIndex (val: any): boolean {
  // 1.大于等于 0 的整数， 2.不能是无限的
  const n = parseFloat(String(val))
  return n >= 0 && Math.floor(n) === n && isFinite(val)
}

/**
 * Convert a value to a string that is actually rendered.
 */
export function toString (val: any): string {
  return val == null
    ? ''
    : typeof val === 'object'
      ? JSON.stringify(val, null, 2)
      : String(val)
}

/**
 * Convert an input value to a number for persistence.
 * If the conversion fails, return original string.
 */
export function toNumber (val: string): number | string {
  const n = parseFloat(val)
  return isNaN(n) ? val : n
}

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
// 先根据一个字符串生成一个 map，然后根据该 map 产生一个新函数，新函数接收一个字符串参数作为 key，如果这个 key 在 map 中则返回 true，否则返回 undefined
export function makeMap (
  str: string,
  expectsLowerCase?: boolean
): (key: string) => true | void {
  const map = Object.create(null)
  const list: Array<string> = str.split(',')
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true
  }
  return expectsLowerCase
    ? val => map[val.toLowerCase()]
    : val => map[val]
}

// 检查标签是否为slot 或 component
export const isBuiltInTag = makeMap('slot,component', true)

// 检查属性是否为保留属性
export const isReservedAttribute = makeMap('key,ref,slot,slot-scope,is')

// 将一个元素从数组中移除出去，返回被删除的元素
export function remove (arr: Array<any>, item: any): Array<any> | void {
  if (arr.length) {
    const index = arr.indexOf(item)
    if (index > -1) {
      return arr.splice(index, 1)
    }
  }
}

// 判断对象自身是否有此属性
const hasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwn (obj: Object | Array<*>, key: string): boolean {
  return hasOwnProperty.call(obj, key)
}

// 为一个纯函数创建一个缓存版本的函数
// fn 一定要是一个纯函数
export function cached<F: Function> (fn: F): F {
  // 创建一个 cache 空对象，且闭包引用
  const cache = Object.create(null)
  return (function cachedFn (str: string) {
    const hit = cache[str]
    // 如果有缓存，那么先读缓存，否则才求值，且保存到闭包的缓存中
    return hit || (cache[str] = fn(str))
  }: any)
}

// 将中横线转驼峰
const camelizeRE = /-(\w)/g
export const camelize = cached((str: string): string => {
  return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : '')
})

// 将首字母转化为大写
export const capitalize = cached((str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
})

// 匹配大写字母，且该大写字母为非单词边界
const hyphenateRE = /\B([A-Z])/g
// 将驼峰转为连字符
export const hyphenate = cached((str: string): string => {
  return str.replace(hyphenateRE, '-$1').toLowerCase()
})

// 像 PhantomJS 1.x 这样的环境中，不支持 bind。为了保持向后兼容性，使用polyfillBind
function polyfillBind (fn: Function, ctx: Object): Function {
  function boundFn (a) {
    // 保存 arguments 的长度
    const l = arguments.length
    return l
      ? l > 1                         // 传入参数，判断参数长度是否大于 1
        ? fn.apply(ctx, arguments)    // 如果参数大于1，使用 apply 方法传入参数数组
        : fn.call(ctx, a)             // 如果参数等一1，使用call 方法传入字符串
      : fn.call(ctx)                  // 如果没有传入参数，直接调用fn
  }

  boundFn._length = fn.length
  return boundFn
}

// 原生bind
function nativeBind (fn: Function, ctx: Object): Function {
  return fn.bind(ctx)
}

// 返回 bind 后的函数
export const bind = Function.prototype.bind
  ? nativeBind
  : polyfillBind

/**
 * Convert an Array-like object to a real Array.
 */
export function toArray (list: any, start?: number): Array<any> {
  start = start || 0
  let i = list.length - start
  const ret: Array<any> = new Array(i)
  while (i--) {
    ret[i] = list[i + start]
  }
  return ret
}

// 将属性混合到目标对象中
export function extend (to: Object, _from: ?Object): Object {
  for (const key in _from) {
    to[key] = _from[key]
  }
  return to
}

/**
 * Merge an Array of Objects into a single Object.
 */
export function toObject (arr: Array<any>): Object {
  const res = {}
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      extend(res, arr[i])
    }
  }
  return res
}

/* eslint-disable no-unused-vars */

/**
 * Perform no operation.
 * Stubbing args to make Flow happy without leaving useless transpiled code
 * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/).
 */
export function noop (a?: any, b?: any, c?: any) {}

// 永远返回 false 的函数
export const no = (a?: any, b?: any, c?: any) => false

/**
 * Return the same value.
 */
export const identity = (_: any) => _

// 从编译器模块生成包含静态键的字符串。
export function genStaticKeys (modules: Array<ModuleOptions>): string {
  // 将 m.staticKeys 拍平到一个空数组，然后再用逗号平接成字符串
  return modules.reduce((keys, m) => {
    return keys.concat(m.staticKeys || [])
  }, []).join(',')
}

/**
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 */
export function looseEqual (a: any, b: any): boolean {
  if (a === b) return true
  const isObjectA = isObject(a)
  const isObjectB = isObject(b)
  if (isObjectA && isObjectB) {
    try {
      const isArrayA = Array.isArray(a)
      const isArrayB = Array.isArray(b)
      if (isArrayA && isArrayB) {
        return a.length === b.length && a.every((e, i) => {
          return looseEqual(e, b[i])
        })
      } else if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime()
      } else if (!isArrayA && !isArrayB) {
        const keysA = Object.keys(a)
        const keysB = Object.keys(b)
        return keysA.length === keysB.length && keysA.every(key => {
          return looseEqual(a[key], b[key])
        })
      } else {
        /* istanbul ignore next */
        return false
      }
    } catch (e) {
      /* istanbul ignore next */
      return false
    }
  } else if (!isObjectA && !isObjectB) {
    return String(a) === String(b)
  } else {
    return false
  }
}

/**
 * Return the first index at which a loosely equal value can be
 * found in the array (if value is a plain object, the array must
 * contain an object of the same shape), or -1 if it is not present.
 */
export function looseIndexOf (arr: Array<mixed>, val: mixed): number {
  for (let i = 0; i < arr.length; i++) {
    if (looseEqual(arr[i], val)) return i
  }
  return -1
}

/**
 * Ensure a function is called only once.
 */
export function once (fn: Function): Function {
  let called = false
  return function () {
    if (!called) {
      called = true
      fn.apply(this, arguments)
    }
  }
}

```