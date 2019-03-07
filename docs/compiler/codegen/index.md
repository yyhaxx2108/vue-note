# index

```javascript
import { genHandlers } from './events'
import baseDirectives from '../directives/index'
import { camelize, no, extend } from 'shared/util'
import { baseWarn, pluckModuleFunction } from '../helpers'

type TransformFunction = (el: ASTElement, code: string) => string;
type DataGenFunction = (el: ASTElement) => string;
type DirectiveFunction = (el: ASTElement, dir: ASTDirective, warn: Function) => boolean;

export class CodegenState {
  options: CompilerOptions;
  warn: Function;
  transforms: Array<TransformFunction>;
  dataGenFns: Array<DataGenFunction>;
  directives: { [key: string]: DirectiveFunction };
  maybeComponent: (el: ASTElement) => boolean;
  onceId: number;
  staticRenderFns: Array<string>;
  pre: boolean;

  constructor (options: CompilerOptions) {
    // 将 options 的引用保存到 this.options
    this.options = options
    // 将 options.warn 或者 baseWarn 保存 this.warn
    this.warn = options.warn || baseWarn
    // 将 transformCode 提取出来保存到 this.transforms 上
    this.transforms = pluckModuleFunction(options.modules, 'transformCode')
    // 将 genData 提取出来保存到 this.dataGenFns 上
    this.dataGenFns = pluckModuleFunction(options.modules, 'genData')
    // 将 on、bind、cloak、html、model、text 保存到 this.directives
    this.directives = extend(extend({}, baseDirectives), options.directives)
    // 将 options.isReservedTag 或 no 保存到 isReservedTag
    const isReservedTag = options.isReservedTag || no
    // 将 this.maybeComponent 设置为一个判断 isReservedTag 的函数
    this.maybeComponent = (el: ASTElement) => !(isReservedTag(el.tag) && !el.component)
    // 将 this.onceId 设置为 0
    this.onceId = 0
    // 将 this.staticRenderFns 初始化为空数组
    this.staticRenderFns = []
    // 将 this.pre 设置为 false
    this.pre = false
  }
}

export type CodegenResult = {
  render: string,
  staticRenderFns: Array<string>
};

export function generate (
  ast: ASTElement | void,
  options: CompilerOptions
): CodegenResult {
  // 通过 options 实例化 CodegenState 并且保存到 state
  const state = new CodegenState(options)
  // 如果没有传入 ast，将 '_c("div")' 保存到 code 上，否则调用 genElement 获取 code
  const code = ast ? genElement(ast, state) : '_c("div")'
  // 将拼接好 render 和 staticRenderFns 的对象返回
  return {
    render: `with(this){return ${code}}`,
    staticRenderFns: state.staticRenderFns
  }
}

// 生成 code
export function genElement (el: ASTElement, state: CodegenState): string {
  // 如果存在 el.parent
  if (el.parent) {
    // 如果 el.pre 不为真，将 el.parent.pre 赋值给 el.pre
    el.pre = el.pre || el.parent.pre
  }
  
  // 对 el 是否静态或者存在 for、if 等进行判断
  if (el.staticRoot && !el.staticProcessed) {
    // 如果 el 是纯静态根元素, 即自身和子元素都不会变，
    // 并且 el.staticProcessed 为false，即没有进行过 genStatic 处理
    // 调用genStatic 方法，并且将其值 _m 函数字符串返回
    return genStatic(el, state)
  } else if (el.once && !el.onceProcessed) {
    // 如果存在 v-once 并且没有经过 genOnce 处理，
    // 调用 genOnce 进行处理，如果不同时存在 v-if、for 等指令就返回 genStatic() 的值
    return genOnce(el, state)
  } else if (el.for && !el.forProcessed) {
    return genFor(el, state)
  } else if (el.if && !el.ifProcessed) {
    // 如果存在 el.if 且不存在 el.ifProcessed，调用 genIf，并且将其值返回
    return genIf(el, state)
  } else if (el.tag === 'template' && !el.slotTarget && !state.pre) {
    return genChildren(el, state) || 'void 0'
  } else if (el.tag === 'slot') {
    return genSlot(el, state)
  } else {
    // 不满足以上条件，说明el 为普通的节点
    let code
    // 判断是否存在 el.component 
    if (el.component) {
      code = genComponent(el.component, el, state)
    } else {
      // 不存在
      let data
      // 如果 el.plain 为false 或 el.pre 和 state.maybeComponent(el) 都为true
      if (!el.plain || (el.pre && state.maybeComponent(el))) {
        // 调用 genData 方法生成 data
        data = genData(el, state)
      }

      // children 保存为 null(el.inlineTemplate为真时) 或 genChildren(el, state, true)
      const children = el.inlineTemplate ? null : genChildren(el, state, true)
      // 拼接 _c 函数，并且保存到 code 上
      code = `_c('${el.tag}'${
        data ? `,${data}` : ''
      }${
        children ? `,${children}` : ''
      })`
    }
    // module transforms
    for (let i = 0; i < state.transforms.length; i++) {
      code = state.transforms[i](el, code)
    }
    return code
  }
}

// 提取静态子树，该函数会往 staticRenderFns push 一个 _c 函数，并且返回一个 _m 函数
function genStatic (el: ASTElement, state: CodegenState): string {
  // 将 el.staticProcessed 设置为 true
  el.staticProcessed = true
  // 在 v-pre 标签中，一些元素需要表现得不同。所有的 pre 节点都是静态根节点，因此我们可以把此用作
  // 包装状态变化的容器，并且在存在的 pre 上重置他
  // 将 state.pre 保存到 originalPreState 上
  const originalPreState = state.pre
  if (el.pre) {
    // 如果 el.pre 为 true，将 state.pre 保存为 true
    state.pre = el.pre
  }
  // genElement 会生成如下字符串：_c('ul',{attrs:{"id":"demo"}},[_c('div')])
  // 将 with(this){return ${genElement(el, state)}} push 到 state.staticRenderFns
  state.staticRenderFns.push(`with(this){return ${genElement(el, state)}}`)
  // 将 state.pre 还原
  state.pre = originalPreState
  // _m 为 renderStatic 函数，如果
  // 返回一个 _m 函数拼接成的字符串，el.staticInFor 为true，则 _m 第二个参数会传入 true
  return `_m(${
    state.staticRenderFns.length - 1
  }${
    el.staticInFor ? ',true' : ''
  })`
}

// 处理 v-once
function genOnce (el: ASTElement, state: CodegenState): string {
  // 将 onceProcessed 设置为 true
  el.onceProcessed = true
  if (el.if && !el.ifProcessed) {
    // 如果存在 v-if, 且没有经过 genIf 处理
    // 调用 genIf 处理，并且将其值返回
    return genIf(el, state)
  } else if (el.staticInFor) {
    // 如果存在 el.staticInFor，那么处理 for
    let key = ''
    let parent = el.parent
    while (parent) {
      if (parent.for) {
        key = parent.key
        break
      }
      parent = parent.parent
    }
    if (!key) {
      process.env.NODE_ENV !== 'production' && state.warn(
        `v-once can only be used inside v-for that is keyed. `
      )
      return genElement(el, state)
    }
    return `_o(${genElement(el, state)},${state.onceId++},${key})`
  } else {
    // 如果即不存在 v-if，又不存在 for，调用 el.staticInFor 并且将其值返回
    return genStatic(el, state)
  }
}

// 处理 v-if 指令
export function genIf (
  el: any,
  state: CodegenState,
  altGen?: Function,
  altEmpty?: string
): string {
  // 将 el.ifProcessed 设置为 true，避免递归调用造成死循环
  el.ifProcessed = true
  // 调用 genIfConditions 处理 v-if 指令
  return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty)
}

function genIfConditions (
  conditions: ASTIfConditions,
  state: CodegenState,
  altGen?: Function,
  altEmpty?: string
): string {
  // 如果 conditions 为空 
  if (!conditions.length) {
    // 如果传入了 altEmpty，返回 altEmpty 否则返回 ‘_e()’，_e() 为 createEmptyVNode
    return altEmpty || '_e()'
  }
  // 将 conditions的第一个元素赋值给 condition 
  const condition = conditions.shift()
  // 如果存在 condition.exp
  if (condition.exp) {
    // 调用 genTernaryExp 函数，返回 _m、_s 函数字符串。
    // 用 exp 拼接三元运算 genTernaryExp 字符串，并且返回。
    return `(${condition.exp})?${
      genTernaryExp(condition.block)
    }:${
      genIfConditions(conditions, state, altGen, altEmpty)
    }`
  } else {
    // 如果不存在，那么 genTernaryExp 调用返回值，并且返回字符串
    return `${genTernaryExp(condition.block)}`
  }

  // 如果 v-if 和 v-once 同时存在，应该生成 (a)?_m(0):_m(1) 这样的代码
  function genTernaryExp (el) {
    // 如果传入 altGen，调用 altGen(el, state) 并且将其值返回
    // 如果存在 el.once，调用 genOnce(el, state) 并且将其值返回
    // 否则调用 genElement(el, state) 将其值返回
    return altGen
      ? altGen(el, state)
      : el.once
        ? genOnce(el, state)
        : genElement(el, state)
  }
}


export function genFor (
  el: any,
  state: CodegenState,
  altGen?: Function,
  altHelper?: string
): string {
  // 将需要遍历数组表达式赋值给 exp
  const exp = el.for
  // 将需要迭代的表达式赋值给 alias
  const alias = el.alias
  // 将 key 赋值给 iterator1
  const iterator1 = el.iterator1 ? `,${el.iterator1}` : ''
  // 将 index 赋值给 iterator2
  const iterator2 = el.iterator2 ? `,${el.iterator2}` : ''
  // 如果可能是组件，并且不是 slot，并且不是 template，并且不存在key
  if (process.env.NODE_ENV !== 'production' &&
    state.maybeComponent(el) &&
    el.tag !== 'slot' &&
    el.tag !== 'template' &&
    !el.key
  ) {
    // 报警告，在不是slot和component的 v-for 组件中，需要指定key
    state.warn(
      `<${el.tag} v-for="${alias} in ${exp}">: component lists rendered with ` +
      `v-for should have explicit keys. ` +
      `See https://vuejs.org/guide/list.html#key for more info.`,
      true 
    )
  }
  // 将 el.forProcessed 设置为 true，避免死循环
  el.forProcessed = true
  // 如果传入的 altHelper 或者 _l 函数生产字符串
  return `${altHelper || '_l'}((${exp}),` +
    `function(${alias}${iterator1}${iterator2}){` +
      `return ${(altGen || genElement)(el, state)}` +
    '})'
}

// 生成 data，传入的参数分别是 节点描述对象 el 和编译状态描述对象 state
export function genData (el: ASTElement, state: CodegenState): string {
  // 初始化 data 为 ‘{’，后面会生成JSON字符串
  let data = '{'

  // 首先解析指令，因为指令解析前可以改变EL的其他属性。
  const dirs = genDirectives(el, state)
  // 如果解析出了 dirs，将 dirs + ',' 后，再加上 data 然后赋值给 data 
  if (dirs) data += dirs + ','

  // 如果存在 el.key, 将 `key:${el.key},` 加到 data 后面
  if (el.key) {
    data += `key:${el.key},`
  }
  // 如果存在 el.ref, 将 `ref:${el.ref},` 加到 data 后面
  if (el.ref) {
    data += `ref:${el.ref},`
  }
  // 如果存在 el.refInFor, 将 `refInFor:true,` 加到 data 后面
  if (el.refInFor) {
    data += `refInFor:true,`
  }
  // 如果 el.pre 为 true，将 `pre:true,` 加到 data 后面
  if (el.pre) {
    data += `pre:true,`
  }
  // 使用了 is 属性 component，记录上原始的标签
  if (el.component) {
    // 如果 el.component 为 true，将 `tag:"${el.tag}",` 加到 data 后面
    data += `tag:"${el.tag}",`
  }
  // 生成模块数据的方法，如 style、class
  for (let i = 0; i < state.dataGenFns.length; i++) {
    data += state.dataGenFns[i](el)
  }
  // 如果存在 attrs，处理标签
  if (el.attrs) {
    // 调用 genProps(el.attrs) 将返回值拼接到 attr字符串，然后追加到 data 上
    data += `attrs:{${genProps(el.attrs)}},`
  }
  // 如果存在 el.props，处理 props
  if (el.props) {
    data += `domProps:{${genProps(el.props)}},`
  }
  // 如果存在 el.events 处理 el.events
  if (el.events) {
    data += `${genHandlers(el.events, false)},`
  }
  // 如果存在 el.nativeEvents 处理 el.nativeEvents
  if (el.nativeEvents) {
    data += `${genHandlers(el.nativeEvents, true)},`
  }
  // slot target
  // only for non-scoped slots
  if (el.slotTarget && !el.slotScope) {
    data += `slot:${el.slotTarget},`
  }
  // scoped slots
  if (el.scopedSlots) {
    data += `${genScopedSlots(el.scopedSlots, state)},`
  }
  // 如果组件存在 v-model
  if (el.model) {
    // 将 data 拼接成为以下对象字符串
    data += `model:{value:${
      el.model.value
    },callback:${
      el.model.callback
    },expression:${
      el.model.expression
    }},`
  }
  // inline-template
  if (el.inlineTemplate) {
    const inlineTemplate = genInlineTemplate(el, state)
    if (inlineTemplate) {
      data += `${inlineTemplate},`
    }
  }
  // 将 data 最后一个逗号去掉，并且加上 ‘}’
  data = data.replace(/,$/, '') + '}'
  // v-bind data wrap
  if (el.wrapData) {
    data = el.wrapData(data)
  }
  // v-on data wrap
  if (el.wrapListeners) {
    data = el.wrapListeners(data)
  }
  // 返回 data
  return data
}

// 解析指令
function genDirectives (el: ASTElement, state: CodegenState): string | void {
  // 首先获取指令，并且保存到 dirs
  const dirs = el.directives
  // 如果不存在 dirs 直接返回
  if (!dirs) return
  // 将 res 设置成字符串 'directives:['
  let res = 'directives:['
  // 将 hasRuntime 设置成 false
  let hasRuntime = false
  // 定义一些变量
  let i, l, dir, needRuntime
  // 遍历dirs 
  for (i = 0, l = dirs.length; i < l; i++) {
    // 保存 dirs 中的元素到 dir 中
    dir = dirs[i]
    // 将 needRuntime 设置为 true 
    needRuntime = true
    // 获取指令对应的方法
    // 当 dir.name 为 model, DirectiveFunction 即为平台的 model 方法
    const gen: DirectiveFunction = state.directives[dir.name]
    // 如果有指令对应的方法
    if (gen) {
      // 运行时的指令会操纵AST, 如果在运行时也有对应部分，将返回 true
      needRuntime = !!gen(el, dir, state.warn)
    }
    // 如果处于运行时
    if (needRuntime) {
      // 将 hasRuntime 设置为 true
      hasRuntime = true
      // 拼接 res 返回对象字符串
      res += `{name:"${dir.name}",rawName:"${dir.rawName}"${
        dir.value ? `,value:(${dir.value}),expression:${JSON.stringify(dir.value)}` : ''
      }${
        dir.arg ? `,arg:"${dir.arg}"` : ''
      }${
        dir.modifiers ? `,modifiers:${JSON.stringify(dir.modifiers)}` : ''
      }},`
    }
  }
  // 如果 hasRuntime 为 true
  if (hasRuntime) {
    // 将 res 删除最后一个‘,’，并且加上 ‘]’ 返回
    return res.slice(0, -1) + ']'
  }
}

function genInlineTemplate (el: ASTElement, state: CodegenState): ?string {
  const ast = el.children[0]
  if (process.env.NODE_ENV !== 'production' && (
    el.children.length !== 1 || ast.type !== 1
  )) {
    state.warn('Inline-template components must have exactly one child element.')
  }
  if (ast.type === 1) {
    const inlineRenderFns = generate(ast, state.options)
    return `inlineTemplate:{render:function(){${
      inlineRenderFns.render
    }},staticRenderFns:[${
      inlineRenderFns.staticRenderFns.map(code => `function(){${code}}`).join(',')
    }]}`
  }
}

function genScopedSlots (
  slots: { [key: string]: ASTElement },
  state: CodegenState
): string {
  return `scopedSlots:_u([${
    Object.keys(slots).map(key => {
      return genScopedSlot(key, slots[key], state)
    }).join(',')
  }])`
}

function genScopedSlot (
  key: string,
  el: ASTElement,
  state: CodegenState
): string {
  if (el.for && !el.forProcessed) {
    return genForScopedSlot(key, el, state)
  }
  const fn = `function(${String(el.slotScope)}){` +
    `return ${el.tag === 'template'
      ? el.if
        ? `(${el.if})?${genChildren(el, state) || 'undefined'}:undefined`
        : genChildren(el, state) || 'undefined'
      : genElement(el, state)
    }}`
  return `{key:${key},fn:${fn}}`
}

function genForScopedSlot (
  key: string,
  el: any,
  state: CodegenState
): string {
  const exp = el.for
  const alias = el.alias
  const iterator1 = el.iterator1 ? `,${el.iterator1}` : ''
  const iterator2 = el.iterator2 ? `,${el.iterator2}` : ''
  el.forProcessed = true // avoid recursion
  return `_l((${exp}),` +
    `function(${alias}${iterator1}${iterator2}){` +
      `return ${genScopedSlot(key, el, state)}` +
    '})'
}

// 生成 Children code
export function genChildren (
  el: ASTElement,
  state: CodegenState,
  checkSkip?: boolean,
  altGenElement?: Function,
  altGenNode?: Function
): string | void {
  // 将 el.children 保存到 children 上
  const children = el.children
  // 判断 children 是否存在
  if (children.length) {
    // 读取第一个元素,并且保存到 el 上
    const el: any = children[0]
    // 优化单个 v-for
    // 如果children的长度为 1，并且存在 el.for，并且 el.tag 不是 template 和 slot
    if (children.length === 1 &&
      el.for &&
      el.tag !== 'template' &&
      el.tag !== 'slot'
    ) {
      // 因为 el 可能时函数组件，并且返回的是数组而不是单个节点
      // 这种情况下，需要进行简单的 normalization
      // 设置 normalizationType 为 ‘,1’ 或 ‘’
      const normalizationType = state.maybeComponent(el) ? `,1` : ``
      // 返回 genElement生成的字符串加上 normalizationType
      return `${(altGenElement || genElement)(el, state)}${normalizationType}`
    }
    const normalizationType = checkSkip
      ? getNormalizationType(children, state.maybeComponent)
      : 0
    const gen = altGenNode || genNode
    return `[${children.map(c => gen(c, state)).join(',')}]${
      normalizationType ? `,${normalizationType}` : ''
    }`
  }
}

// determine the normalization needed for the children array.
// 0: no normalization needed
// 1: simple normalization needed (possible 1-level deep nested array)
// 2: full normalization needed
function getNormalizationType (
  children: Array<ASTNode>,
  maybeComponent: (el: ASTElement) => boolean
): number {
  let res = 0
  for (let i = 0; i < children.length; i++) {
    const el: ASTNode = children[i]
    if (el.type !== 1) {
      continue
    }
    if (needsNormalization(el) ||
        (el.ifConditions && el.ifConditions.some(c => needsNormalization(c.block)))) {
      res = 2
      break
    }
    if (maybeComponent(el) ||
        (el.ifConditions && el.ifConditions.some(c => maybeComponent(c.block)))) {
      res = 1
    }
  }
  return res
}

function needsNormalization (el: ASTElement): boolean {
  return el.for !== undefined || el.tag === 'template' || el.tag === 'slot'
}

function genNode (node: ASTNode, state: CodegenState): string {
  if (node.type === 1) {
    return genElement(node, state)
  } else if (node.type === 3 && node.isComment) {
    return genComment(node)
  } else {
    return genText(node)
  }
}

export function genText (text: ASTText | ASTExpression): string {
  return `_v(${text.type === 2
    ? text.expression // no need for () because already wrapped in _s()
    : transformSpecialNewlines(JSON.stringify(text.text))
  })`
}

export function genComment (comment: ASTText): string {
  return `_e(${JSON.stringify(comment.text)})`
}

function genSlot (el: ASTElement, state: CodegenState): string {
  const slotName = el.slotName || '"default"'
  const children = genChildren(el, state)
  let res = `_t(${slotName}${children ? `,${children}` : ''}`
  const attrs = el.attrs && `{${el.attrs.map(a => `${camelize(a.name)}:${a.value}`).join(',')}}`
  const bind = el.attrsMap['v-bind']
  if ((attrs || bind) && !children) {
    res += `,null`
  }
  if (attrs) {
    res += `,${attrs}`
  }
  if (bind) {
    res += `${attrs ? '' : ',null'},${bind}`
  }
  return res + ')'
}

// componentName is el.component, take it as argument to shun flow's pessimistic refinement
function genComponent (
  componentName: string,
  el: ASTElement,
  state: CodegenState
): string {
  const children = el.inlineTemplate ? null : genChildren(el, state, true)
  return `_c(${componentName},${genData(el, state)}${
    children ? `,${children}` : ''
  })`
}

// 
function genProps (props: Array<{ name: string, value: any }>): string {
  // 定义 res 为 空字符串
  let res = ''
  // 遍历 props
  for (let i = 0; i < props.length; i++) {
    // 将 props[i] 的引用保存到 prop 上
    const prop = props[i]
    // 判断当前所处的环境
    if (__WEEX__) {
      res += `"${prop.name}":${generateValue(prop.value)},`
    } else {
      // 如果处在浏览器环境中，首先调用 transformSpecialNewlines 将其返回值拼接成字符串，追加到 res 上
      // transformSpecialNewlines 的作用是将 \u2028、\u2029 加上 ‘\’
      res += `"${prop.name}":${transformSpecialNewlines(prop.value)},`
    }
  }
  return res.slice(0, -1)
}

function generateValue (value) {
  if (typeof value === 'string') {
    return transformSpecialNewlines(value)
  }
  return JSON.stringify(value)
}

// 替换掉 u2028、u2029 符号
function transformSpecialNewlines (text: string): string {
  // \u2028 为行分割符、\u2029为段落分割符
  return text
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
```