# index

```javascript
import he from 'he'
import { parseHTML } from './html-parser'
import { parseText } from './text-parser'
import { parseFilters } from './filter-parser'
import { genAssignmentCode } from '../directives/model'
import { extend, cached, no, camelize } from 'shared/util'
import { isIE, isEdge, isServerRendering } from 'core/util/env'

import {
  addProp,
  addAttr,
  baseWarn,
  addHandler,
  addDirective,
  getBindingAttr,
  getAndRemoveAttr,
  pluckModuleFunction
} from '../helpers'

// 匹配 @ 或者 v-on 开始的正则表达式，即是否为监听事件的指令
export const onRE = /^@|^v-on:/
// 匹配 @ 或者 v- 或者 :开始的正则表达式，即是否为指令
export const dirRE = /^v-|^@|^:/
// 匹配 v-for 的属性值，并且保留 in 或者 of 前后的字符串
export const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
// 匹配 v-for 迭代器的值，如 (v, k) of list 或者 (v, k, i) in obj
export const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
// 匹配以 ( 开始， 或者 ) 结束的字符床
const stripParensRE = /^\(|\)$/g

// 匹配指令中书写的参数，如 v-on:click.stop
const argRE = /:(.*)$/
// 匹配 : 或者 v-bind 开头的字符串，用来检测一个标签属性是否动态绑定
export const bindRE = /^:|^v-bind:/
// 匹配修饰符 
const modifierRE = /\.[^.]+/g

// he 用于字符解码工作
const decodeHTMLCached = cached(he.decode)

// 定义平台化变量
export let warn: any
let delimiters
let transforms
let preTransforms
let postTransforms
let platformIsPreTag
let platformMustUseProp
let platformGetTagNamespace

type Attr = { name: string; value: string };

// 用来创建一个元素的描述对象
export function createASTElement (
  tag: string,
  attrs: Array<Attr>,
  parent: ASTElement | void
): ASTElement {
  return {
    type: 1,
    tag,
    attrsList: attrs,
    attrsMap: makeAttrsMap(attrs),
    parent,
    children: []
  }
}

// 将 HTML 字符串转化成 AST
export function parse (
  template: string,
  options: CompilerOptions
): ASTElement | void {
  // 如果存在 options.warn 使用 options.warn 否则使用 baseWarn
  warn = options.warn || baseWarn

  // 初始化了平台变量
  // 判断该标签是否是 pre 标签
  platformIsPreTag = options.isPreTag || no
  // 判断是否一个属性在标签中是否要使用元素对象原生的 prop 进行绑定
  platformMustUseProp = options.mustUseProp || no
  // 获取元素(标签)的命名空间
  platformGetTagNamespace = options.getTagNamespace || no
  // 筛选 options.modules 中的 transformNode 并且保存到 transforms 中
  transforms = pluckModuleFunction(options.modules, 'transformNode')
  // 筛选 options.modules 中的 transformNode 并且保存到 preTransformNode 中
  preTransforms = pluckModuleFunction(options.modules, 'preTransformNode')
  // 筛选 options.modules 中的 transformNode 并且保存到 postTransformNode 中
  postTransforms = pluckModuleFunction(options.modules, 'postTransformNode')

  // 定义了 delimiters
  delimiters = options.delimiters

  // 定义一个 stack 空数组
  const stack = []
  // 是否解析空白字符
  const preserveWhitespace = options.preserveWhitespace !== false
  // 声明 root 变量，root 实际上就是ast
  let root
  // 当前Parent
  let currentParent
  // inVPre 变量用来标识当前解析的标签是否在拥有 v-pre 的标签之内
  let inVPre = false
  // inPre 变量用来标识当前正在解析的标签是否在 <pre></pre> 标签之内
  let inPre = false
  // 用于 warnOnce 函数
  let warned = false

  // 警告一次
  function warnOnce (msg) {
    if (!warned) {
      warned = true
      warn(msg)
    }
  }

  // 闭合标签
  function closeElement (element) {
    // check pre state
    if (element.pre) {
      inVPre = false
    }
    if (platformIsPreTag(element.tag)) {
      inPre = false
    }
    // apply post-transforms
    for (let i = 0; i < postTransforms.length; i++) {
      postTransforms[i](element, options)
    }
  }

  // 进行词法分析
  parseHTML(template, {
    warn,
    expectHTML: options.expectHTML,
    isUnaryTag: options.isUnaryTag,
    canBeLeftOpenTag: options.canBeLeftOpenTag,
    shouldDecodeNewlines: options.shouldDecodeNewlines,
    shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref,
    shouldKeepComment: options.comments,
    start (tag, attrs, unary) {
      // 检查命名空间, 如果存在父级n，则继承父级n
      const ns = (currentParent && currentParent.ns) || platformGetTagNamespace(tag)

      // 处理 IE 的bug
      if (isIE && ns === 'svg') {
        attrs = guardIESVGBug(attrs)
      }

      // 通过 tag、attrs、currentParent，创建 ast 描述对象
      let element: ASTElement = createASTElement(tag, attrs, currentParent)
      // 如果存在 ns，将 element.ns 赋值为 ns
      if (ns) {
        element.ns = ns
      }

      // 如果 element 为禁止标签，且不是服务端渲染
      if (isForbiddenTag(element) && !isServerRendering()) {
        // 将 forbidden 设置为 true
        element.forbidden = true
        // 抛出警告
        process.env.NODE_ENV !== 'production' && warn(
          'Templates should only be responsible for mapping the state to the ' +
          'UI. Avoid placing tags with side-effects in your templates, such as ' +
          `<${tag}>` + ', as they will not be parsed.'
        )
      }

      // 遍历 preTransforms，并且调用，将结果返回给 element
      for (let i = 0; i < preTransforms.length; i++) {
        // element 当前元素描述对象，options 为编译器选项
        element = preTransforms[i](element, options) || element
      }

      // 如果 inVPre 为 false，首先处理 element 中的 pre 标签
      // 如果 inVPre 为 true，说明后面都在 v-pre 环境中，编译器会跳过该指令标签以及其包含的子标签的编译
      if (!inVPre) {
        // 调用 processPre 对 attr 中 pre 进行处理
        processPre(element)
        if (element.pre) {
          // 如果 element.pre，将 inVPre 设置为 true
          inVPre = true
        }
      }
      // 判断当前标签是否为 pre 标签
      if (platformIsPreTag(element.tag)) {
        // 如果当前标签为 pre，将 inVPre 设置为 true
        inPre = true
      }
      // 判断 inVPre 是否为 true，即 当前标签是否在 pre 环境下
      // <pre> 标签会对其包含的 html 字符实体进行解码
      // <pre> 标签会保留 html 字符串编写时的空白
      if (inVPre) {
        // 对其自身和其子标签的 attr 进行原生化处理
        processRawAttrs(element)
      } else if (!element.processed) {
        // 如果 element.processed 为 false，说明该标签没有处理过, 该属性在 preTransforms 时加上的
        // 处理 for 指令
        processFor(element)
        processIf(element)
        processOnce(element)
        // element-scope stuff
        processElement(element, options)
      }

      // 检测模版跟元素是否符合要求
      function checkRootConstraints (el) {
        // 在非生产环境中，只能有一个根节点
        if (process.env.NODE_ENV !== 'production') {
          // 如果 el 是 slot 或者是 template 将不能用作根元素
          if (el.tag === 'slot' || el.tag === 'template') {
            warnOnce(
              `Cannot use <${el.tag}> as component root element because it may ` +
              'contain multiple nodes.'
            )
          }
          // 如果 el 上有 v-for 不能用来作根元素
          if (el.attrsMap.hasOwnProperty('v-for')) {
            warnOnce(
              'Cannot use v-for on stateful component root element because ' +
              'it renders multiple elements.'
            )
          }
        }
      }

      // 生成 ast 树
      if (!root) {
        // 如果当前不存在 root，将 element 赋值给 root
        root = element
        // 检查 root 是否合法
        checkRootConstraints(root)
      } else if (!stack.length) {
        // 如果已经存在了 root，但是当前堆栈为空，则需要判断是否存在v-else-if 和 v-else
        // v-if、v-else-if 和 v-else 是通过 processIf 解析得到的
        if (root.if && (element.elseif || element.else)) {
          // 如果 root 里面存在 if，且 element 存在 v-else-if 和 v-else
          // 判断 element作为 root 是否合法
          checkRootConstraints(element)
          // 将 element的 elseif 表达式和元素组成的对象 push 到 root.ifConditions 中
          addIfCondition(root, {
            exp: element.elseif,
            block: element
          })
        } else if (process.env.NODE_ENV !== 'production') {
          // 如果已经存在了 root，且当前堆栈为空，且不存在 if、else 相关逻辑，说明不只存在一个根节点，报警告
          warnOnce(
            `Component template should contain exactly one root element. ` +
            `If you are using v-if on multiple elements, ` +
            `use v-else-if to chain them instead.`
          )
        }
      }
      // 如果存在 currentParent，并且当前元素不是禁止元素
      if (currentParent && !element.forbidden) {
        if (element.elseif || element.else) {
          // 如果存在 element.elseif 或 element.else，将该对象添加到 element.if中
          processIfConditions(element, currentParent)
        } else if (element.slotScope) {
          // 如果存在 element.slotScope
          // 将 currentParent.plain 设置成false
          currentParent.plain = false
          // 将 name 赋值为 element.slotTarget 或 default
          const name = element.slotTarget || '"default"'
          // 将 element 存到 currentParent.scopedSlots 中
          ;(currentParent.scopedSlots || (currentParent.scopedSlots = {}))[name] = element
        } else {
          // 将当前元素 push 到 currentParent.children
          currentParent.children.push(element)
          // 将当前元素的 parent 设置成为 currentParent
          element.parent = currentParent
        }
      }
      // 判断 unary 是否存在
      if (!unary) {
        // 如果不存在 unary，说明当前 element 不是自闭合元素，
        // 将 element 赋值给 currentParent
        currentParent = element
        // 将 element push 到 stack 中
        stack.push(element)
      } else {
        // 如果存在 unary，说明当前 element 是自闭合元素，
        // 闭合当前标签
        closeElement(element)
      }
    },

    end () {
      // remove trailing whitespace
      const element = stack[stack.length - 1]
      const lastNode = element.children[element.children.length - 1]
      if (lastNode && lastNode.type === 3 && lastNode.text === ' ' && !inPre) {
        element.children.pop()
      }
      // pop stack
      stack.length -= 1
      currentParent = stack[stack.length - 1]
      closeElement(element)
    },

    chars (text: string) {
      if (!currentParent) {
        if (process.env.NODE_ENV !== 'production') {
          if (text === template) {
            warnOnce(
              'Component template requires a root element, rather than just text.'
            )
          } else if ((text = text.trim())) {
            warnOnce(
              `text "${text}" outside root element will be ignored.`
            )
          }
        }
        return
      }
      // IE textarea placeholder bug
      if (isIE &&
        currentParent.tag === 'textarea' &&
        currentParent.attrsMap.placeholder === text
      ) {
        return
      }
      const children = currentParent.children
      text = inPre || text.trim()
        ? isTextTag(currentParent) ? text : decodeHTMLCached(text)
        // only preserve whitespace if its not right after a starting tag
        : preserveWhitespace && children.length ? ' ' : ''
      if (text) {
        let res
        if (!inVPre && text !== ' ' && (res = parseText(text, delimiters))) {
          children.push({
            type: 2,
            expression: res.expression,
            tokens: res.tokens,
            text
          })
        } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
          children.push({
            type: 3,
            text
          })
        }
      }
    },
    comment (text: string) {
      currentParent.children.push({
        type: 3,
        text,
        isComment: true
      })
    }
  })
  // 将 root 返回
  return root
}

// 解析 Pre
function processPre (el) {
  // 如果在 el 中有 v-pre， 那么将其从 el.attrlist 中删除掉
  if (getAndRemoveAttr(el, 'v-pre') != null) {
    // 将 el.pre 赋值为 true
    el.pre = true
  }
}

// 将元素所有属性当作元素属性处理，该函数只会在 inPre 环境下调用
function processRawAttrs (el) {
  // 缓存 el.attrsList 的长度到 l
  const l = el.attrsList.length
  // 如果存在 l
  if (l) {
    // 构造一个长度为 l 的空数组，并且保存到 el.attrs 和 attrs 上
    const attrs = el.attrs = new Array(l)
    // 循环 l 次
    for (let i = 0; i < l; i++) {
      // 将包含有当前 el.attr.name 和序列化后的 el.attr.value 的对象保存到 el.attrs[i] 上
      attrs[i] = {
        name: el.attrsList[i].name,
        // JSON.stringify 是为了将 el.attrsList[i].value 当作字符串处理
        value: JSON.stringify(el.attrsList[i].value)
      }
    }
  } else if (!el.pre) {
    // 如果即不存在 attr 又不是 pre 标签，那么说明该标签是 pre 下的子标签
    // 将 el.plain 赋值为 true，即纯标签
    el.plain = true
  }
}

export function processElement (element: ASTElement, options: CompilerOptions) {
  processKey(element)

  // determine whether this is a plain element after
  // removing structural attributes
  element.plain = !element.key && !element.attrsList.length

  processRef(element)
  processSlot(element)
  processComponent(element)
  for (let i = 0; i < transforms.length; i++) {
    element = transforms[i](element, options) || element
  }
  processAttrs(element)
}

function processKey (el) {
  const exp = getBindingAttr(el, 'key')
  if (exp) {
    if (process.env.NODE_ENV !== 'production') {
      if (el.tag === 'template') {
        warn(`<template> cannot be keyed. Place the key on real elements instead.`)
      }
      if (el.for) {
        const iterator = el.iterator2 || el.iterator1
        const parent = el.parent
        if (iterator && iterator === exp && parent && parent.tag === 'transition-group') {
          warn(
            `Do not use v-for index as key on <transtion-group> children, ` +
            `this is the same as not using keys.`
          )
        }
      }
    }
    el.key = exp
  }
}

function processRef (el) {
  const ref = getBindingAttr(el, 'ref')
  if (ref) {
    el.ref = ref
    el.refInFor = checkInFor(el)
  }
}

// 处理 v-for 指令
export function processFor (el: ASTElement) {
  // 定义 exp
  let exp
  // 如果存在 v-for 指令，将 attr 中 v-for 的值赋予 exp
  if ((exp = getAndRemoveAttr(el, 'v-for'))) {
    // 调用 parseFor 解析 exp 并且将结果保存到 res
    const res = parseFor(exp)
    // 判断 res 是否存在
    if (res) {
      // 如果 res 存在，将 res 扩展到 el 对象上
      extend(el, res)
    } else if (process.env.NODE_ENV !== 'production') {
      // 如果 res 不存在，说明 v-for 表达式有错误，报警告
      warn(
        `Invalid v-for expression: ${exp}`
      )
    }
  }
}

type ForParseResult = {
  for: string;
  alias: string;
  iterator1?: string;
  iterator2?: string;
};

// 解析 v-for 表达式
export function parseFor (exp: string): ?ForParseResult {
  // 匹配 forAliasRE 并且将结果保存到 inMatch 中
  const inMatch = exp.match(forAliasRE)
  // 如果 inMatch 为 null, 说明没有匹配到，直接返回
  if (!inMatch) return
  // 定义 res 空对象
  const res = {}
  // 将需要遍历的值保存到 res.for 上
  res.for = inMatch[2].trim()
  // 去除掉 alias 上面的括号
  const alias = inMatch[1].trim().replace(stripParensRE, '')
  // 匹配 forIteratorRE 并且保存到 iteratorMatch
  // 如 obj, key, index 匹配后的结果将是 [', key, index', 'key', 'index']
  const iteratorMatch = alias.match(forIteratorRE)
  // 判断是否存在 iteratorMatch
  if (iteratorMatch) {
    // 保存 alias
    res.alias = alias.replace(forIteratorRE, '').trim()
    // 保存第一个 iterator 的名字
    res.iterator1 = iteratorMatch[1].trim()
    if (iteratorMatch[2]) {
      // 如果存在第二个 iterator， 保存第二个 iterator 的名字
      res.iterator2 = iteratorMatch[2].trim()
    }
  } else {
    // 如果不存在，直接将 alias 保存到 res.alias 上
    res.alias = alias
  }
  // 将 res 对象返回
  return res
}

function processIf (el) {
  const exp = getAndRemoveAttr(el, 'v-if')
  if (exp) {
    el.if = exp
    addIfCondition(el, {
      exp: exp,
      block: el
    })
  } else {
    if (getAndRemoveAttr(el, 'v-else') != null) {
      el.else = true
    }
    const elseif = getAndRemoveAttr(el, 'v-else-if')
    if (elseif) {
      el.elseif = elseif
    }
  }
}

// 将 else、else-if 节点对象添加到前一个兄弟节点中的 if 节点的 chilren 中 
function processIfConditions (el, parent) {
  // 寻找前一个兄弟节点
  const prev = findPrevElement(parent.children)
  if (prev && prev.if) {
    // 如果有前一个兄弟节点，且此节点存在 if 指令
    // 将此节点及其描述对象添加到前一个兄弟节点的 ifConditions 数组中
    addIfCondition(prev, {
      exp: el.elseif,
      block: el
    })
  } else if (process.env.NODE_ENV !== 'production') {
    // 否则在非生产环境中报警告
    warn(
      `v-${el.elseif ? ('else-if="' + el.elseif + '"') : 'else'} ` +
      `used on element <${el.tag}> without corresponding v-if.`
    )
  }
}

// 寻找前一个元素节点，该函数只用在 processIfConditions 中
function findPrevElement (children: Array<any>): ASTElement | void {
  // 缓存 chilren 的长度，用于遍历
  let i = children.length
  // 遍历 chilren
  while (i--) {
    // 找到第一个元素节点，且判断其type
    if (children[i].type === 1) {
      // 如果 type === 1，则返回该元素
      return children[i]
    } else {
      // 如果 type !==1, 且不是空字符串，报警告
      if (process.env.NODE_ENV !== 'production' && children[i].text !== ' ') {
        warn(
          `text "${children[i].text.trim()}" between v-if and v-else(-if) ` +
          `will be ignored.`
        )
      }
      children.pop()
    }
  }
}

// 将 else 或 else-if 节点和表达式的对象 push 到 el.ifConditions 中
export function addIfCondition (el: ASTElement, condition: ASTIfCondition) {
  // 如果 el.ifConditions 不存在，先将 el.ifConditions 初始化成空数组
  if (!el.ifConditions) {
    el.ifConditions = []
  }
  // 将 condition 对象 push 到 el.ifConditions 中
  el.ifConditions.push(condition)
}

function processOnce (el) {
  const once = getAndRemoveAttr(el, 'v-once')
  if (once != null) {
    el.once = true
  }
}

function processSlot (el) {
  if (el.tag === 'slot') {
    el.slotName = getBindingAttr(el, 'name')
    if (process.env.NODE_ENV !== 'production' && el.key) {
      warn(
        `\`key\` does not work on <slot> because slots are abstract outlets ` +
        `and can possibly expand into multiple elements. ` +
        `Use the key on a wrapping element instead.`
      )
    }
  } else {
    let slotScope
    if (el.tag === 'template') {
      slotScope = getAndRemoveAttr(el, 'scope')
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && slotScope) {
        warn(
          `the "scope" attribute for scoped slots have been deprecated and ` +
          `replaced by "slot-scope" since 2.5. The new "slot-scope" attribute ` +
          `can also be used on plain elements in addition to <template> to ` +
          `denote scoped slots.`,
          true
        )
      }
      el.slotScope = slotScope || getAndRemoveAttr(el, 'slot-scope')
    } else if ((slotScope = getAndRemoveAttr(el, 'slot-scope'))) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && el.attrsMap['v-for']) {
        warn(
          `Ambiguous combined usage of slot-scope and v-for on <${el.tag}> ` +
          `(v-for takes higher priority). Use a wrapper <template> for the ` +
          `scoped slot to make it clearer.`,
          true
        )
      }
      el.slotScope = slotScope
    }
    const slotTarget = getBindingAttr(el, 'slot')
    if (slotTarget) {
      el.slotTarget = slotTarget === '""' ? '"default"' : slotTarget
      // preserve slot as an attribute for native shadow DOM compat
      // only for non-scoped slots.
      if (el.tag !== 'template' && !el.slotScope) {
        addAttr(el, 'slot', slotTarget)
      }
    }
  }
}

function processComponent (el) {
  let binding
  if ((binding = getBindingAttr(el, 'is'))) {
    el.component = binding
  }
  if (getAndRemoveAttr(el, 'inline-template') != null) {
    el.inlineTemplate = true
  }
}

function processAttrs (el) {
  const list = el.attrsList
  let i, l, name, rawName, value, modifiers, isProp
  for (i = 0, l = list.length; i < l; i++) {
    name = rawName = list[i].name
    value = list[i].value
    if (dirRE.test(name)) {
      // mark element as dynamic
      el.hasBindings = true
      // modifiers
      modifiers = parseModifiers(name)
      if (modifiers) {
        name = name.replace(modifierRE, '')
      }
      if (bindRE.test(name)) { // v-bind
        name = name.replace(bindRE, '')
        value = parseFilters(value)
        isProp = false
        if (
          process.env.NODE_ENV !== 'production' &&
          value.trim().length === 0
        ) {
          warn(
            `The value for a v-bind expression cannot be empty. Found in "v-bind:${name}"`
          )
        }
        if (modifiers) {
          if (modifiers.prop) {
            isProp = true
            name = camelize(name)
            if (name === 'innerHtml') name = 'innerHTML'
          }
          if (modifiers.camel) {
            name = camelize(name)
          }
          if (modifiers.sync) {
            addHandler(
              el,
              `update:${camelize(name)}`,
              genAssignmentCode(value, `$event`)
            )
          }
        }
        if (isProp || (
          !el.component && platformMustUseProp(el.tag, el.attrsMap.type, name)
        )) {
          addProp(el, name, value)
        } else {
          addAttr(el, name, value)
        }
      } else if (onRE.test(name)) { // v-on
        name = name.replace(onRE, '')
        addHandler(el, name, value, modifiers, false, warn)
      } else { // normal directives
        name = name.replace(dirRE, '')
        // parse arg
        const argMatch = name.match(argRE)
        const arg = argMatch && argMatch[1]
        if (arg) {
          name = name.slice(0, -(arg.length + 1))
        }
        addDirective(el, name, rawName, value, arg, modifiers)
        if (process.env.NODE_ENV !== 'production' && name === 'model') {
          checkForAliasModel(el, value)
        }
      }
    } else {
      // literal attribute
      if (process.env.NODE_ENV !== 'production') {
        const res = parseText(value, delimiters)
        if (res) {
          warn(
            `${name}="${value}": ` +
            'Interpolation inside attributes has been removed. ' +
            'Use v-bind or the colon shorthand instead. For example, ' +
            'instead of <div id="{{ val }}">, use <div :id="val">.'
          )
        }
      }
      addAttr(el, name, JSON.stringify(value))
      // #6887 firefox doesn't update muted state if set via attribute
      // even immediately after element creation
      if (!el.component &&
          name === 'muted' &&
          platformMustUseProp(el.tag, el.attrsMap.type, name)) {
        addProp(el, name, 'true')
      }
    }
  }
}

function checkInFor (el: ASTElement): boolean {
  let parent = el
  while (parent) {
    if (parent.for !== undefined) {
      return true
    }
    parent = parent.parent
  }
  return false
}

function parseModifiers (name: string): Object | void {
  const match = name.match(modifierRE)
  if (match) {
    const ret = {}
    match.forEach(m => { ret[m.slice(1)] = true })
    return ret
  }
}

// 这里是将属性数组转化为属性字典对象
function makeAttrsMap (attrs: Array<Object>): Object {
  // 定义一个 map 常量
  const map = {}
  // 遍历 attrs
  for (let i = 0, l = attrs.length; i < l; i++) {
    if (
      process.env.NODE_ENV !== 'production' &&
      map[attrs[i].name] && !isIE && !isEdge
    ) {
      // 在非 IE 环境下，属性值如果重复，报警告
      warn('duplicate attribute: ' + attrs[i].name)
    }
    // 将 attrs[i].value 赋值给 map[attrs[i].name]，这里是将数组转化为字典对象
    map[attrs[i].name] = attrs[i].value
  }
  // 将 map 常量返回
  return map
}

// for script (e.g. type="x/template") or style, do not decode content
function isTextTag (el): boolean {
  return el.tag === 'script' || el.tag === 'style'
}

// 判断是否为禁止标签，即 style 或 script
function isForbiddenTag (el): boolean {
  return (
    el.tag === 'style' ||
    (el.tag === 'script' && (
      !el.attrsMap.type ||
      el.attrsMap.type === 'text/javascript'
    ))
  )
}

const ieNSBug = /^xmlns:NS\d+/
const ieNSPrefix = /^NS\d+:/

// 处理 IE 中 SVG 属性的 bug
function guardIESVGBug (attrs) {
  // 定义一个空对象
  const res = []
  // 遍历 attrs
  for (let i = 0; i < attrs.length; i++) {
    // 缓存 attr
    const attr = attrs[i]
    // 如果 attr.name 不能正则匹配 xmlns:NS
    if (!ieNSBug.test(attr.name)) {
      // 将 attr.name 中 /^NS\d+:/ 替换成空
      attr.name = attr.name.replace(ieNSPrefix, '')
      // 将 attr push 到 res数组
      res.push(attr)
    }
  }
  // 返回 res
  return res
}

function checkForAliasModel (el, value) {
  let _el = el
  while (_el) {
    if (_el.for && _el.alias === value) {
      warn(
        `<${el.tag} v-model="${value}">: ` +
        `You are binding v-model directly to a v-for iteration alias. ` +
        `This will not be able to modify the v-for source array because ` +
        `writing to the alias is like modifying a function local variable. ` +
        `Consider using an array of objects and use v-model on an object property instead.`
      )
    }
    _el = _el.parent
  }
}
```