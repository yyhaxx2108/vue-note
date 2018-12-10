# element
```javascript

import { inBrowser } from 'core/util/env'
import { makeMap } from 'shared/util'

export const namespaceMap = {
  svg: 'http://www.w3.org/2000/svg',
  math: 'http://www.w3.org/1998/Math/MathML'
}

export const isHTMLTag = makeMap(
  'html,body,base,head,link,meta,style,title,' +
  'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
  'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' +
  'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
  's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
  'embed,object,param,source,canvas,script,noscript,del,ins,' +
  'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
  'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
  'output,progress,select,textarea,' +
  'details,dialog,menu,menuitem,summary,' +
  'content,element,shadow,template,blockquote,iframe,tfoot'
)

// this map is intentionally selective, only covering SVG elements that may
// contain child elements.
export const isSVG = makeMap(
  'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
  'foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
  'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
  true
)

export const isPreTag = (tag: ?string): boolean => tag === 'pre'

// 检查是否为原生的html标签或svg标签
export const isReservedTag = (tag: string): ?boolean => {
  return isHTMLTag(tag) || isSVG(tag)
}

// 获取组件作用域
export function getTagNamespace (tag: string): ?string {
  if (isSVG(tag)) {
    return 'svg'
  }
  // 当 MathML 元素是组件根时将不被支持
  if (tag === 'math') {
    return 'math'
  }
}

// 判读是否为未知节点
const unknownElementCache = Object.create(null)
export function isUnknownElement (tag: string): boolean {
  // 当不在浏览器环境中默认为true
  if (!inBrowser) {
    return true
  }
  // 当 tag 属于 HTML或SVG 标签时返回false
  if (isReservedTag(tag)) {
    return false
  }
  tag = tag.toLowerCase()
  // 当缓存过该节点时是否存在时，返回该结果
  if (unknownElementCache[tag] != null) {
    return unknownElementCache[tag]
  }
  // 判断用户自定义节点
  const el = document.createElement(tag)
  if (tag.indexOf('-') > -1) {
    return (unknownElementCache[tag] = (
      el.constructor === window.HTMLUnknownElement ||
      el.constructor === window.HTMLElement
    ))
  } else {
    return (unknownElementCache[tag] = /HTMLUnknownElement/.test(el.toString()))
  }
}

export const isTextInputType = makeMap('text,number,password,search,email,tel,url')

```