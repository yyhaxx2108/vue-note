# style

```javascript
import { parseText } from 'compiler/parser/text-parser'
import { parseStyleText } from 'web/util/style'
import {
  getAndRemoveAttr,
  getBindingAttr,
  baseWarn
} from 'compiler/helpers'

// 中序处理style
function transformNode (el: ASTElement, options: CompilerOptions) {
  // 缓存警告函数
  const warn = options.warn || baseWarn
  // 获取静态的 style
  const staticStyle = getAndRemoveAttr(el, 'style')
  // 如果存在 staticStyle
  if (staticStyle) {
    if (process.env.NODE_ENV !== 'production') {
      // 解析 ‘{{}}’ 字符串
      const res = parseText(staticStyle, options.delimiters)
      // 如果存在 res 报警告
      if (res) {
        warn(
          `style="${staticStyle}": ` +
          'Interpolation inside attributes has been removed. ' +
          'Use v-bind or the colon shorthand instead. For example, ' +
          'instead of <div style="{{ val }}">, use <div :style="val">.'
        )
      }
    }
    // 将 staticStyle 进行 parseStyleText，然后在序列化放到 el.staticStyle 中
    el.staticStyle = JSON.stringify(parseStyleText(staticStyle))
  }
  // 获取 style 的动态绑定
  const styleBinding = getBindingAttr(el, 'style', false )
  // 如果存在 styleBinding
  if (styleBinding) {
    // 将其保存到 el.styleBinding 上
    el.styleBinding = styleBinding
  }
}

function genData (el: ASTElement): string {
  let data = ''
  if (el.staticStyle) {
    data += `staticStyle:${el.staticStyle},`
  }
  if (el.styleBinding) {
    data += `style:(${el.styleBinding}),`
  }
  return data
}

export default {
  staticKeys: ['staticStyle'],
  transformNode,
  genData
}
```