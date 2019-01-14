# helpers

```javascript
import { emptyObject } from 'shared/util'
import { parseFilters } from './parser/filter-parser'

// 默认警告方法
export function baseWarn (msg: string) {
  console.error(`[Vue compiler]: ${msg}`)
}

// 第一个参数中筛选出函数名字与第二个参数所指定字符串相同的函数，并将它们组成一个数组
export function pluckModuleFunction<F: Function> (
  modules: ?Array<Object>,
  key: string
): Array<F> {
  // 首先进行 map 然后筛掉 undfined
  return modules
    ? modules.map(m => m[key]).filter(_ => _)
    : []
}

// 添加原生属性
export function addProp (el: ASTElement, name: string, value: string) {
  // 向 el.props 数组中添加 { name, value }，el.props 为原生dom 的属性
  (el.props || (el.props = [])).push({ name, value })
  // 将 el.plain 设置成为 false
  el.plain = false
}

// 添加属性
export function addAttr (el: ASTElement, name: string, value: any) {
  // 向 el.attrs 数组中添加 { name, value }
  (el.attrs || (el.attrs = [])).push({ name, value })
  // 将 el.plain 设置成为 false
  el.plain = false
}

// add a raw attr (use this in preTransforms)
export function addRawAttr (el: ASTElement, name: string, value: any) {
  el.attrsMap[name] = value
  el.attrsList.push({ name, value })
}

export function addDirective (
  el: ASTElement,
  name: string,
  rawName: string,
  value: string,
  arg: ?string,
  modifiers: ?ASTModifiers
) {
  (el.directives || (el.directives = [])).push({ name, rawName, value, arg, modifiers })
  el.plain = false
}

export function addHandler (
  el: ASTElement,
  name: string,
  value: string,
  modifiers: ?ASTModifiers,
  important?: boolean,
  warn?: Function
) {
  modifiers = modifiers || emptyObject
  // warn prevent and passive modifier
  /* istanbul ignore if */
  if (
    process.env.NODE_ENV !== 'production' && warn &&
    modifiers.prevent && modifiers.passive
  ) {
    warn(
      'passive and prevent can\'t be used together. ' +
      'Passive handler can\'t prevent default event.'
    )
  }

  // normalize click.right and click.middle since they don't actually fire
  // this is technically browser-specific, but at least for now browsers are
  // the only target envs that have right/middle clicks.
  if (name === 'click') {
    if (modifiers.right) {
      name = 'contextmenu'
      delete modifiers.right
    } else if (modifiers.middle) {
      name = 'mouseup'
    }
  }

  // check capture modifier
  if (modifiers.capture) {
    delete modifiers.capture
    name = '!' + name // mark the event as captured
  }
  if (modifiers.once) {
    delete modifiers.once
    name = '~' + name // mark the event as once
  }
  /* istanbul ignore if */
  if (modifiers.passive) {
    delete modifiers.passive
    name = '&' + name // mark the event as passive
  }

  let events
  if (modifiers.native) {
    delete modifiers.native
    events = el.nativeEvents || (el.nativeEvents = {})
  } else {
    events = el.events || (el.events = {})
  }

  const newHandler: any = {
    value: value.trim()
  }
  if (modifiers !== emptyObject) {
    newHandler.modifiers = modifiers
  }

  const handlers = events[name]
  /* istanbul ignore if */
  if (Array.isArray(handlers)) {
    important ? handlers.unshift(newHandler) : handlers.push(newHandler)
  } else if (handlers) {
    events[name] = important ? [newHandler, handlers] : [handlers, newHandler]
  } else {
    events[name] = newHandler
  }

  el.plain = false
}

// 获取动态 attr
export function getBindingAttr (
  el: ASTElement,
  name: string,
  getStatic?: boolean
): ?string {
  // 获取动态标签描述，以‘:’或 ‘v-bind’ 开始的 attr
  const dynamicValue =
    getAndRemoveAttr(el, ':' + name) ||
    getAndRemoveAttr(el, 'v-bind:' + name)
  // 如果存在 dynamicValue，说明是动态属性
  if (dynamicValue != null) {
    // 调用 parseFilters 方法，解析动态变量过滤器，并且将结果返回
    return parseFilters(dynamicValue)
  } else if (getStatic !== false) {
    // 如果不是动态属性，也没有传入值为 false 的 getStatic，获取 name 标签 的值
    const staticValue = getAndRemoveAttr(el, name)
    // 如果存在 staticValue
    if (staticValue != null) {
      // 将 staticValue JSON.stringify 后返回
      return JSON.stringify(staticValue)
    }
  }
}

// 从 attrsList 中将 attr 为 name 的元素删除，并且返回
export function getAndRemoveAttr (
  el: ASTElement,
  name: string,
  removeFromMap?: boolean
): ?string {
  // 定义 val
  let val
  // 如果 el.attrsMap[name] 存在，从 attrsList 中找到 attr 为 name 的元素，并且赋值给val，然后删除
  if ((val = el.attrsMap[name]) != null) {
    // 保存 attrsList 的引用
    const list = el.attrsList
    // 遍历 attrsList
    for (let i = 0, l = list.length; i < l; i++) {
      if (list[i].name === name) {
        // 如果找到，将其删掉
        list.splice(i, 1)
        // 跳出循环
        break
      }
    }
  }
  // 如果传入了 removeFromMap 且为真
  if (removeFromMap) {
    // 将其从 attrsMap 删掉
    delete el.attrsMap[name]
  }
  // 返回 val
  return val
}

```