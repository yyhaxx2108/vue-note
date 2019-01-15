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
  // 将 { name, rawName, value, arg, modifiers } 添加到 el.directives 数组中
  (el.directives || (el.directives = [])).push({ name, rawName, value, arg, modifiers })
  // 将 el.plain 设置为 false
  el.plain = false
}

// 添加事件
export function addHandler (
  el: ASTElement,
  name: string,
  value: string,
  modifiers: ?ASTModifiers,
  important?: boolean,
  warn?: Function
) {
  // 如果不存在 modifiers，则将其设置为空对象
  modifiers = modifiers || emptyObject
  // 如果既存在 prevent 又存在 passive，将抛出警告
  if (
    process.env.NODE_ENV !== 'production' && warn &&
    modifiers.prevent && modifiers.passive
  ) {
    // passive 是告诉浏览器不要阻止默认行为
    warn(
      'passive and prevent can\'t be used together. ' +
      'Passive handler can\'t prevent default event.'
    )
  }

  // 在点击事件中
  if (name === 'click') {
    // 如果有右键修饰器
    if (modifiers.right) {
      // 将时间名称赋值成为 contextmenu
      name = 'contextmenu'
      // 删除右键修饰器
      delete modifiers.right
    } else if (modifiers.middle) {
      // 如果有中建修饰器，直接将事件名称赋值成 mouseup
      name = 'mouseup'
    }
  }

  // 如果有捕获修饰器
  if (modifiers.capture) {
    // 删除捕获修饰器
    delete modifiers.capture
    // 同时在事件名称前面加上‘!’
    name = '!' + name 
  }
  // 如果有 once 修饰器
  if (modifiers.once) {
    // 删除 once 修饰器
    delete modifiers.once
    // 在事件名称前面加上 ‘～’
    name = '~' + name
  }
  // 如果有 passive 修饰器
  if (modifiers.passive) {
    // 删除 passive 修饰器
    delete modifiers.passive
    // 在事件名称前面加上 ‘&’
    name = '&' + name
  }

  // 定义事件
  let events
  // 判断是否存在 natvie 修饰器
  if (modifiers.native) {
    // 如果有 native 修饰器
    // 删除 native 修饰器
    delete modifiers.native
    // 如果 el 上存在 nativeEvents，将其赋值给 events，如果不存在，将空对象赋值到 el.nativeEvents 和 events上
    events = el.nativeEvents || (el.nativeEvents = {})
  } else {
    // 如果没有 native 修饰器，将 el.events 赋值到 events 上
    events = el.events || (el.events = {})
  }

  // 定义一个新的事件对象，其 value 为 value.trim()
  const newHandler: any = {
    value: value.trim()
  }
  // 如果此时 modifiers 不是空对象
  if (modifiers !== emptyObject) {
    // 在 newHandler 对象上加上 modifiers
    newHandler.modifiers = modifiers
  }

  // 将 events[name] 保存到 handlers 上
  const handlers = events[name]
  if (Array.isArray(handlers)) {
    // 如果 handlers 是数组，如果存在 important，将 newHandlers 添加到 handlers 数组前面，否则添加到 handlers 后面
    important ? handlers.unshift(newHandler) : handlers.push(newHandler)
  } else if (handlers) {
    // 如果 handlers 不是数组，则将 newHandler 和 handlers 拼接成数组，important 决定其顺序
    events[name] = important ? [newHandler, handlers] : [handlers, newHandler]
  } else {
    // 如果之前就不存在，直接将 newHandler 赋值到 events[name] 上
    events[name] = newHandler
  }
  // 然后将 el.plain 修改成 false
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