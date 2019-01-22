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

// 生成 style 相关字符串
function genData (el: ASTElement): string {
  // 声明一个空字符串，保存到data上
  let data = ''
  // 如果存在 el.staticStyle
  if (el.staticStyle) {
    // 将 `staticStyle:${el.staticStyle},` 添加到 data 上
    data += `staticStyle:${el.staticStyle},`
  }
  // 如果存在 el.styleBinding
  if (el.styleBinding) {
    / 将 `style:(${el.styleBinding}),` 添加到 data 上
    data += `style:(${el.styleBinding}),`
  }
  // 将 data 返回
  return data
}

export default {
  staticKeys: ['staticStyle'],
  transformNode,
  genData
}
```