# index

```javascript

import { warn } from 'core/util/index'

export * from './attrs'
export * from './class'
export * from './element'

// 如果 el 不是 Element，那么将 el 转化为 Element
export function query (el: string | Element): Element {
  if (typeof el === 'string') {
    // 如果是字符串，首先尝试在 document 中，查找el元素
    const selected = document.querySelector(el)
    if (!selected) {
      // 如果没有找到，那么抛出警告
      process.env.NODE_ENV !== 'production' && warn(
        'Cannot find element: ' + el
      )
      // 返回一个空的div
      return document.createElement('div')
    }
    return selected
  } else {
    // 如果不是字符串，直接返回
    return el
  }
}

```