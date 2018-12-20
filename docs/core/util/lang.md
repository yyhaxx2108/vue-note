# lang

```javascript
// 判断是否为保留字，以 $ 或 _ 开头的是保留字, 0x24是$, 0x5F是_
export function isReserved (str: string): boolean {
  const c = (str + '').charCodeAt(0)
  return c === 0x24 || c === 0x5F
}

// 定义一个属性
export function def (obj: Object, key: string, val: any, enumerable?: boolean) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}

// 不能是字母或数字或下划线或.或$,比如 / *
const bailRE = /[^\w.$]/
// 转化如 obj.a 这样的字符串，其返回值是一个函数
export function parsePath (path: string): any {
  if (bailRE.test(path)) {
    // 如果 path 中 含有 不是 字母或数字或下划线或.或$ 的字符串，那么直接返回 undefined
    return
  }
  // 通过字符 . 分割 path 字符串产生数组，并且保存到 segments
  const segments = path.split('.')
  // 返回一个函数，此函数会递归的访问 segments 里面的键值，并且把最底层那个值返回
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}
```