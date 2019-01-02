# compat

```javascript
import { inBrowser } from 'core/util/index'

// 检查当前浏览器是否对属性值中的字符进行编码
let div
function getShouldDecode (href: boolean): boolean {
  // 创建一个 div 节点
  div = div || document.createElement('div')
  // 给 div 标签填充 <a href="\n"/> 或 <div a="\n"/>
  div.innerHTML = href ? `<a href="\n"/>` : `<div a="\n"/>`
  // 判断是否有 &#10; 符号
  return div.innerHTML.indexOf('&#10;') > 0
}

// #3663: <div a="\n"/> 这种标签在 ie 中会加上 &#10; 符号
export const shouldDecodeNewlines = inBrowser ? getShouldDecode(false) : false
// #6828: <a href="\n"/> 在 chrome 中会加上 &#10; 符号
export const shouldDecodeNewlinesForHref = inBrowser ? getShouldDecode(true) : false
```