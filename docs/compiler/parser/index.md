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
    // 检查是否在 pre 里面，如果在，将 inVPre 设置为 false
    if (element.pre) {
      inVPre = false
    }
    // 检查是否在 pre 里面，如果在，将 inVPre 设置为 false
    if (platformIsPreTag(element.tag)) {
      inPre = false
    }
    // 进行后置处理
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
        // 处理 v-for 指令
        processFor(element)
        // 处理 v-if 指令
        processIf(element)
        // 处理 v-once 指令
        processOnce(element)
        // 处理其他属性
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

    // 对结束标签进行处理
    end () {
      // 删除尾随空格
      // 获取 stack 堆顶
      const element = stack[stack.length - 1]
      // 获取最后一个 children 元素
      const lastNode = element.children[element.children.length - 1]
      // 如果最后一个子元素的 type 为 3，并且最后一个子元素为空字符串，并且不在 pre 里面，弹出当前子元素
      if (lastNode && lastNode.type === 3 && lastNode.text === ' ' && !inPre) {
        element.children.pop()
      }
      // 删除堆顶元素
      stack.length -= 1
      // 将 stack 中接下来的元素赋值给 currentParent
      currentParent = stack[stack.length - 1]
      // 关闭当前标签
      closeElement(element)
    },

    // 处理字符串
    chars (text: string) {
      // 如果不存在 currentParent
      if (!currentParent) {
        if (process.env.NODE_ENV !== 'production') {
          // 如果 text 与 template 相同
          if (text === template) {
            // 报警告，文本节点应该在根标签中
            warnOnce(
              'Component template requires a root element, rather than just text.'
            )
          } else if ((text = text.trim())) {
            // 如果 如果 text 与 template 不相同
            // 报警告，不在 root 标签中将会被忽略
            warnOnce(
              `text "${text}" outside root element will be ignored.`
            )
          }
        }
        // 直接返回
        return
      }
      // 处理 IE 的 placeholder 的bug
      if (isIE &&
        currentParent.tag === 'textarea' &&
        currentParent.attrsMap.placeholder === text
      ) {
        // 如果是在 IE 中，并且当前parent标签是 textarea，并且当前 parent 标签的 placeholder 和 text 相同
        // 直接返回
        return
      }
      // 将 currentParent.children 的引用保存到 children 上
      const children = currentParent.children
      // 如果 inPre 为真或者 text不为空时，如果父节点不是文本标签，对 text 进行 decodeHTML 操作
      // 如果 inPre 为假并且 text为空时，如果传入了 preserveWhitespace 并且有子节点，text为 ‘ ’,否则为 ‘’
      text = inPre || text.trim()
        ? isTextTag(currentParent) ? text : decodeHTMLCached(text)
        : preserveWhitespace && children.length ? ' ' : ''
      // 如果存在 text
      if (text) {
        // 定义 res
        let res
        // 不在 pre 环境下，当前文本节点不是空字符，且解析了当前节点
        if (!inVPre && text !== ' ' && (res = parseText(text, delimiters))) {
          // 将type、expression、tokens、text组装成对象保存到 chilren 中
          children.push({
            type: 2,
            expression: res.expression,
            tokens: res.tokens,
            text
          })
        } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
          // 纯文本type 为 3
          children.push({
            type: 3,
            text
          })
        }
      }
    },
    // 对注释标签的处理
    comment (text: string) {
      // 将type 改为 3，isComment 改为 true，然后 push 到 children 中
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
  // 处理 key 
  processKey(element)

  // determine whether this is a plain element after
  // removing structural attributes
  // 判读该标签是否是纯标签，即没有 key 和 结构化以外的属性(v-if, v-for, v-onces)
  element.plain = !element.key && !element.attrsList.length
  
  // 解析 ref 属性
  processRef(element)
  // 处理作用域插槽
  processSlot(element)
  // 处理组件 is/inline-template
  processComponent(element)
  // 遍历 transforms
  for (let i = 0; i < transforms.length; i++) {
    // 调用 transform 并且将其返回， transforms 对 class 和 style 进行处理
    element = transforms[i](element, options) || element
  }
  // 处理 el.attrsList 剩余属性
  processAttrs(element)
}

// 处理 key
function processKey (el) {
  // 获取 key 的表达式
  const exp = getBindingAttr(el, 'key')
  // 如果存在 exp 表达式
  if (exp) {
    if (process.env.NODE_ENV !== 'production') {
      // template 标签不能有 key
      if (el.tag === 'template') {
        warn(`<template> cannot be keyed. Place the key on real elements instead.`)
      }
      // 如果 el 存在循环
      if (el.for) {
        // 获取 el 的迭代器表达式
        const iterator = el.iterator2 || el.iterator1
        // 获取 el 的父元素
        const parent = el.parent
        // 如果存在 iterator 并且 iterator 和 key 的表达式一样，并且父亲元素是 transition-group
        if (iterator && iterator === exp && parent && parent.tag === 'transition-group') {
          // 报警告，在transition-group 的 chilren 中不要使用 index 作为 key
          warn(
            `Do not use v-for index as key on <transtion-group> children, ` +
            `this is the same as not using keys.`
          )
        }
      }
    }
    // 将 el.key 赋值为 exp
    el.key = exp
  }
}

// 解析 ref 属性
function processRef (el) {
  // 获取 ref 属性值
  const ref = getBindingAttr(el, 'ref')
  // 如果存在 ref
  if (ref) {
    // 将 ref 赋值到 el.ref 
    el.ref = ref
    // 检查当前 el 是否在 for 循环中
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

// 处理 v-if 指令
function processIf (el) {
  // 获取 v-if 指令表达式
  const exp = getAndRemoveAttr(el, 'v-if')
  // 判断 v-if 指令表示式是否存在
  if (exp) {
    // 如果 exp 存在，首先将其值保存到 el.if 上
    el.if = exp
    // 在 el.ifcondition数组中加上 { exp: exp, block: el } 对象
    addIfCondition(el, {
      exp: exp,
      block: el
    })
  } else {
    // 如果存在 v-else 指令，将 el.else 设置为 true
    if (getAndRemoveAttr(el, 'v-else') != null) {
      el.else = true
    }
    // 判读是否存在 v-else-if 指令
    const elseif = getAndRemoveAttr(el, 'v-else-if')
    // 如果存在 elseif，将 elseif 的值保存到 el.elseif 上
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

// 解析 v-once
function processOnce (el) {
  // 获取 v-once
  const once = getAndRemoveAttr(el, 'v-once')
  // 如果存在 once
  if (once != null) {
    // 将 el.once 设置为true
    el.once = true
  }
}

// 处理作用域插槽
function processSlot (el) {
  // 判断 tag 是否为 slot
  if (el.tag === 'slot') {
    // 如果 tag 为 slot，首先获取 slot 标签上面的 name
    el.slotName = getBindingAttr(el, 'name')
    // 如果 slot 上面存在 key，报警告，因为 slot 是抽象的，可能会被多个元素替换，不存在唯一索引
    if (process.env.NODE_ENV !== 'production' && el.key) {
      warn(
        `\`key\` does not work on <slot> because slots are abstract outlets ` +
        `and can possibly expand into multiple elements. ` +
        `Use the key on a wrapping element instead.`
      )
    }
  } else {
    // 如果 tag 不是 slot，先初始化 slotScope
    let slotScope
    // 判断 tag 是不是 template
    if (el.tag === 'template') {
      // 如果 tag 是 template，首先获取 scope 保存到 slotScope 上
      slotScope = getAndRemoveAttr(el, 'scope')
      // 如果存在 slotScope，报警告，因为 template 上面 slot 被 slot-scope 替代了
      if (process.env.NODE_ENV !== 'production' && slotScope) {
        warn(
          `the "scope" attribute for scoped slots have been deprecated and ` +
          `replaced by "slot-scope" since 2.5. The new "slot-scope" attribute ` +
          `can also be used on plain elements in addition to <template> to ` +
          `denote scoped slots.`,
          true
        )
      }
      // 将 slotScope 或 slot-scope 上面的值赋予 el.slotScope
      el.slotScope = slotScope || getAndRemoveAttr(el, 'slot-scope')
    } else if ((slotScope = getAndRemoveAttr(el, 'slot-scope'))) {
      // 如果 tag 不是 template，首先将 slot-scope 赋值给 slotScope
      // 如果 slot-scope 确实存在，判断是否在 v-for 循环中
      if (process.env.NODE_ENV !== 'production' && el.attrsMap['v-for']) {
        // 如果在 v-for 循环中，报警告，在 v-for 中使用 slot-scope 不清楚，正确的做法是在template中使用 slot-scope
        // v-for 具有更高的优先级
        warn(
          `Ambiguous combined usage of slot-scope and v-for on <${el.tag}> ` +
          `(v-for takes higher priority). Use a wrapper <template> for the ` +
          `scoped slot to make it clearer.`,
          true
        )
      }
      // 将 slotScope 赋值给 el.slotScope
      el.slotScope = slotScope
    }
    // 获取当前节点的 slot 属性
    const slotTarget = getBindingAttr(el, 'slot')
    // 如果存在 slot 属性
    if (slotTarget) {
      // 如果 slotTarget 为字符串‘""’，则将 "default" 字符串赋值给 el.slotTarget 否则将 slotTarget 复制给 el.slotTarget
      el.slotTarget = slotTarget === '""' ? '"default"' : slotTarget
      // 处理 shadow DOM 中的 slot 属性
      // 在不是 template 节点，且不存在 el.slotScope 的情况下，将 slot 保留成原生标签
      if (el.tag !== 'template' && !el.slotScope) {
        addAttr(el, 'slot', slotTarget)
      }
    }
  }
}

// 处理 is/inline-template
function processComponent (el) {
  // 定义 binding 变量，用来保存 is 属性值
  let binding
  // 获取 is 属性，并且保存到 binding
  if ((binding = getBindingAttr(el, 'is'))) {
    // 如果存在 binding，将 binding 赋值到 el.component 上
    el.component = binding
  }
  // 如果存在 inline-template
  if (getAndRemoveAttr(el, 'inline-template') != null) {
    // 将 el.inlineTemplate 设置为 true
    el.inlineTemplate = true
  }
}

// 处理 el.attrsList
function processAttrs (el) {
  // 将 el.attrsList 保存到 list 上面
  const list = el.attrsList
  let i, l, name, rawName, value, modifiers, isProp
  // 遍历 el.attrsList
  for (i = 0, l = list.length; i < l; i++) {
    // 保存 list[i].name
    name = rawName = list[i].name
    // 保存 list[i].value
    value = list[i].value
    // 判断 name 是否为动态属性，动态属性包括 v-/:/@
    if (dirRE.test(name)) {
      // 如果包含动态属性，将 el.hasBindings 设置为 true, 标识当前元素为动态元素
      el.hasBindings = true
      // 解析修饰器，modifiers 为对象，其中存了以修饰器为键，以 true 为值的元素
      modifiers = parseModifiers(name)
      // 如果没有修饰器 modifiers 为 undefined
      if (modifiers) {
        // 将 modifierRE 替换掉
        name = name.replace(modifierRE, '')
      }
      // 如果是 v-bind/: 的动态属性
      if (bindRE.test(name)) {
        // 将前面标识动态属性的 v-bind/: 去掉，然后保存到 name 上
        name = name.replace(bindRE, '')
        // 解析过滤器，并且把处理好的字符串保存到 value 上
        value = parseFilters(value)
        // 将 isProp 设置为 false，isProp 变量标识该绑定属性是否为原生属性
        isProp = false
        if (
          process.env.NODE_ENV !== 'production' &&
          value.trim().length === 0
        ) {
          // 如果 value 为空，报警告，动态绑定的值必须有 value
          warn(
            `The value for a v-bind expression cannot be empty. Found in "v-bind:${name}"`
          )
        }
        // 如果存在修饰器
        if (modifiers) {
          if (modifiers.prop) {
            // 如果修饰器上面有 prop，说明该属性被指定为原生属性，将 prop 设置为 true
            isProp = true
            // 将 name 进行 camelize 处理
            name = camelize(name)
            // 如果 name 为 innerHtml，将其修改为 innerHTML
            if (name === 'innerHtml') name = 'innerHTML'
          }
          if (modifiers.camel) {
            // 如果修饰器上面有 camel，将 name 进行 camelize 处理
            // 浏览器会将标签的属性全部读取成小写字母，如 viewBox 会读成 viewbox，正确的写法是 view-box.camel
            name = camelize(name)
          }
          if (modifiers.sync) {
            // 如果有修饰器 sync，调用 addHandler 函数，
            // addHandler 是将事件名称与该事件的侦听函数添加到元素描述对象的 el.events 属性或 el.nativeEvents 属性中
            // aa.async 等价于 @update:aa=this.vlue=val
            // genAssignmentCode(value, `$event`) 事件发生时候的回调函数
            addHandler(
              el,
              `update:${camelize(name)}`,
              genAssignmentCode(value, `$event`)
            )
          }
        }
        // 如果 isProp 变量为真，则说明该绑定的属性是原生DOM对象的属性
        // el.component 为假，表示没有使用 is 属性，并且标签上的属性需要使用原生属性绑定
        if (isProp || (
          !el.component && platformMustUseProp(el.tag, el.attrsMap.type, name)
        )) {
          // 如果满足上面的要求，将属性添加为原生属性
          addProp(el, name, value)
        } else {
          // 如果不满足上面的要求，将属性添加为属性
          addAttr(el, name, value)
        }
      } else if (onRE.test(name)) { 
        // 解析 v-on 指令，首先将 onRE 替换成空
        name = name.replace(onRE, '')
        // 将 name 事件添加到 event 数组中
        addHandler(el, name, value, modifiers, false, warn)
      } else {
        // 处理其他的指令，首先将 v-、: @ 去掉
        name = name.replace(dirRE, '')
        // 解析参数
        const argMatch = name.match(argRE)
        // 将匹配到的参数保存到 arg 上面
        const arg = argMatch && argMatch[1]
        // 如果存在 arg
        if (arg) {
          // 将 arg 前面的字符串作为 name
          name = name.slice(0, -(arg.length + 1))
        }
        // 添加指令
        addDirective(el, name, rawName, value, arg, modifiers)
        // 如果是 v-model 指令
        if (process.env.NODE_ENV !== 'production' && name === 'model') {
          checkForAliasModel(el, value)
        }
      }
    } else {
      // 非指令属性，id，width 等
      if (process.env.NODE_ENV !== 'production') {
        // 解析字面量表述式，并且保存到 res 上
        const res = parseText(value, delimiters)
        // 如果存在字变量表示的变量，报警告。
        if (res) {
          warn(
            `${name}="${value}": ` +
            'Interpolation inside attributes has been removed. ' +
            'Use v-bind or the colon shorthand instead. For example, ' +
            'instead of <div id="{{ val }}">, use <div :id="val">.'
          )
        }
      }
      // 在 el.attrsList 上添加值为 JSON.stringify(value) 的 name
      addAttr(el, name, JSON.stringify(value))
      // 处理 fireFox 中，muted 相关的 bug
      if (!el.component &&
          name === 'muted' &&
          platformMustUseProp(el.tag, el.attrsMap.type, name)) {
        addProp(el, name, 'true')
      }
    }
  }
}

// 检查 el 是否在 for 循环中
function checkInFor (el: ASTElement): boolean {
  // 初始化 parent 为自身
  let parent = el
  // 递归寻找 parent
  while (parent) {
    // 如果在 parent 中存在 for 返回 true
    if (parent.for !== undefined) {
      return true
    }
    parent = parent.parent
  }
  // 如果在祖先中不存在 for 返回false
  return false
}

// 解析修饰器
function parseModifiers (name: string): Object | void {
  // 正则匹配修饰器，将匹配到到结果保存到 match
  const match = name.match(modifierRE)
  if (match) {
    // 如果匹配到修饰器，初始化 ret 对象
    const ret = {}
    // 遍历 match，并且将‘.’截取掉后的字符串作为健值，保存到 ret 对象上，其值为 true
    match.forEach(m => { ret[m.slice(1)] = true })
    // 返回 ret
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
  // 将 el 保存到 _el
  let _el = el
  // 遍历 el 的祖先节点
  while (_el) {
    // 如果节点上存在着 for 或者 alias 将报警告
    // 您正在将v-model直接绑定到v-for迭代别名。
    // 这将无法修改v-for源数组，因为写入别名就像修改函数局部变量一样。
    // 请考虑使用对象数组，而在对象属性上使用v-model。
    if (_el.for && _el.alias === value) {
      warn(
        `<${el.tag} v-model="${value}">: ` +
        `You are binding v-model directly to a v-for iteration alias. ` +
        `This will not be able to modify the v-for source array because ` +
        `writing to the alias is like modifying a function local variable. ` +
        `Consider using an array of objects and use v-model on an object property instead.`
      )
    }
    // 将 _el 替换成 _el.parent，开始遍历
    _el = _el.parent
  }
}
```