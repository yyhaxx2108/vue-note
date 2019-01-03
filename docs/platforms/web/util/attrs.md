# attrs

```javascript
import { makeMap } from 'shared/util'

// 是否为 html 保留的属性
export const isReservedAttr = makeMap('style,class')
// 绑定 value 的标签
const acceptValue = makeMap('input,textarea,option,select,progress')
// 检测一个属性在标签中是否要使用元素原生的 prop 进行绑定
export const mustUseProp = (tag: string, type: ?string, attr: string): boolean => {
  // input,textarea,option,select,progress 的 value 属于原生属性
  // option 上的 selected 属于原生属性
  // input 上的 checked 属于原生属性
  // vedio 上的 muted 属于原生属性
  return (
    (attr === 'value' && acceptValue(tag)) && type !== 'button' ||
    (attr === 'selected' && tag === 'option') ||
    (attr === 'checked' && tag === 'input') ||
    (attr === 'muted' && tag === 'video')
  )
}

export const isEnumeratedAttr = makeMap('contenteditable,draggable,spellcheck')

export const isBooleanAttr = makeMap(
  'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,' +
  'default,defaultchecked,defaultmuted,defaultselected,defer,disabled,' +
  'enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,' +
  'muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,' +
  'required,reversed,scoped,seamless,selected,sortable,translate,' +
  'truespeed,typemustmatch,visible'
)

export const xlinkNS = 'http://www.w3.org/1999/xlink'

export const isXlink = (name: string): boolean => {
  return name.charAt(5) === ':' && name.slice(0, 5) === 'xlink'
}

export const getXlinkProp = (name: string): string => {
  return isXlink(name) ? name.slice(6, name.length) : ''
}

export const isFalsyAttrValue = (val: any): boolean => {
  return val == null || val === false
}

```