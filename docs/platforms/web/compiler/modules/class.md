# class

```javascript
import { parseText } from 'compiler/parser/text-parser'
import {
  getAndRemoveAttr,
  getBindingAttr,
  baseWarn
} from 'compiler/helpers'

// 中序处理，class
function transformNode (el: ASTElement, options: CompilerOptions) {
  // 缓存 warn
  const warn = options.warn || baseWarn
  // 获取 class 的值
  const staticClass = getAndRemoveAttr(el, 'class')
  // 如果存在静态 class
  if (process.env.NODE_ENV !== 'production' && staticClass) {
    // 尝试解析 staticClass，并且将其结果保存到 res 上
    const res = parseText(staticClass, options.delimiters)
    // 如果存在 res 说明 class 上面有 {{}}, 报警告，使用 v-bind 代替
    if (res) {
      warn(
        `class="${staticClass}": ` +
        'Interpolation inside attributes has been removed. ' +
        'Use v-bind or the colon shorthand instead. For example, ' +
        'instead of <div class="{{ val }}">, use <div :class="val">.'
      )
    }
  }
  // 如果存在 staticClass
  if (staticClass) {
    // 将 staticClass JSON.stringify 后保存到 el.staticClass 上
    el.staticClass = JSON.stringify(staticClass)
  }
  // 获取动态绑定的 class
  const classBinding = getBindingAttr(el, 'class', false )
  // 如果存在动态绑定的 class
  if (classBinding) {
    // 将其值绑定到 el.classBinding
    el.classBinding = classBinding
  }
}

function genData (el: ASTElement): string {
  let data = ''
  if (el.staticClass) {
    data += `staticClass:${el.staticClass},`
  }
  if (el.classBinding) {
    data += `class:${el.classBinding},`
  }
  return data
}

export default {
  staticKeys: ['staticClass'],
  transformNode,
  genData
}
```