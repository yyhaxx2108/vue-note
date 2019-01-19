# style
```javascript
import { cached, extend, toObject } from 'shared/util'

// 解析 style 字符串值
export const parseStyleText = cached(function (cssText) {
  // 设置一个 res 空数组
  const res = {}
  // 匹配‘;’, 该‘;’ 后面不能跟 ‘)’, 除非之前有 ‘(’
  // 如 background: url(test.com?amp;);,只匹配后面那个 ‘;’
  const listDelimiter = /;(?![^(]*\))/g
  // 匹配冒号
  const propertyDelimiter = /:(.+)/
  // 先通过‘;’将 style 字符串分割成数组，然后通过 ‘:’ 将其保存到 res 对象中
  cssText.split(listDelimiter).forEach(function (item) {
    // 如果存在 style
    if (item) {
      // 通过 ‘:’ 将其分割成数组，并且保存到 tmp 中
      const tmp = item.split(propertyDelimiter)
      // 如果该数组存在元素，将其转化成键值队保存到 res 中
      tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim())
    }
  })
  // 返回 res
  return res
})

// merge static and dynamic style data on the same vnode
function normalizeStyleData (data: VNodeData): ?Object {
  const style = normalizeStyleBinding(data.style)
  // static style is pre-processed into an object during compilation
  // and is always a fresh object, so it's safe to merge into it
  return data.staticStyle
    ? extend(data.staticStyle, style)
    : style
}

// normalize possible array / string values into Object
export function normalizeStyleBinding (bindingStyle: any): ?Object {
  if (Array.isArray(bindingStyle)) {
    return toObject(bindingStyle)
  }
  if (typeof bindingStyle === 'string') {
    return parseStyleText(bindingStyle)
  }
  return bindingStyle
}

/**
 * parent component style should be after child's
 * so that parent component's style could override it
 */
export function getStyle (vnode: VNodeWithData, checkChild: boolean): Object {
  const res = {}
  let styleData

  if (checkChild) {
    let childNode = vnode
    while (childNode.componentInstance) {
      childNode = childNode.componentInstance._vnode
      if (
        childNode && childNode.data &&
        (styleData = normalizeStyleData(childNode.data))
      ) {
        extend(res, styleData)
      }
    }
  }

  if ((styleData = normalizeStyleData(vnode.data))) {
    extend(res, styleData)
  }

  let parentNode = vnode
  while ((parentNode = parentNode.parent)) {
    if (parentNode.data && (styleData = normalizeStyleData(parentNode.data))) {
      extend(res, styleData)
    }
  }
  return res
}


```