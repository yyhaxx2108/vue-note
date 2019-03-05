# events

```javascript
// 匹配函数的正则表达式,箭头函数，或 function 开头到函数都匹配
const fnExpRE = /^([\w$_]+|\([^)]*?\))\s*=>|^function\s*\(/
// 匹配路径的正则，如 a.b、a['b']、a["b"]、a[0]、a[b]
const simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/

// 键盘事件到code
const keyCodes: { [key: string]: number | Array<number> } = {
  esc: 27,
  tab: 9,
  enter: 13,
  space: 32,
  up: 38,
  left: 37,
  right: 39,
  down: 40,
  'delete': [8, 46]
}

// KeyboardEvent.key aliases
const keyNames: { [key: string]: string | Array<string> } = {
  // #7880: IE11 and Edge use `Esc` for Escape key name.
  esc: ['Esc', 'Escape'],
  tab: 'Tab',
  enter: 'Enter',
  space: ' ',
  // #7806: IE11 uses key names without `Arrow` prefix for arrow keys.
  up: ['Up', 'ArrowUp'],
  left: ['Left', 'ArrowLeft'],
  right: ['Right', 'ArrowRight'],
  down: ['Down', 'ArrowDown'],
  'delete': ['Backspace', 'Delete']
}

// #4868: modifiers that prevent the execution of the listener
// need to explicitly return null so that we can determine whether to remove
// the listener for .once
const genGuard = condition => `if(${condition})return null;`

// 定义 modifierCode
const modifierCode: { [key: string]: string } = {
  // 阻止事件冒泡
  stop: '$event.stopPropagation();',
  // 阻止默认事件
  prevent: '$event.preventDefault();',
  self: genGuard(`$event.target !== $event.currentTarget`),
  ctrl: genGuard(`!$event.ctrlKey`),
  shift: genGuard(`!$event.shiftKey`),
  alt: genGuard(`!$event.altKey`),
  meta: genGuard(`!$event.metaKey`),
  left: genGuard(`'button' in $event && $event.button !== 0`),
  middle: genGuard(`'button' in $event && $event.button !== 1`),
  right: genGuard(`'button' in $event && $event.button !== 2`)
}

// 生成事件相关的代码，events为ast上面的事件对象，isNative 为是否为原生事件
export function genHandlers (
  events: ASTElementHandlers,
  isNative: boolean
): string {
  // 如果为原生事件，采用 nativeOn 标记，否则采用 on 进行标记
  let res = isNative ? 'nativeOn:{' : 'on:{'
  // 遍历 events 中的事件名称
  for (const name in events) {
    // 调用 genHandler 生成健值对字符串，将其结果追加到 res 上
    res += `"${name}":${genHandler(name, events[name])},`
  }
  // 对结尾的‘,’进行删除，并且加上 ‘}’
  return res.slice(0, -1) + '}'
}

// Generate handler code with binding params on Weex
function genWeexHandler (params: Array<any>, handlerCode: string) {
  let innerHandlerCode = handlerCode
  const exps = params.filter(exp => simplePathRE.test(exp) && exp !== '$event')
  const bindings = exps.map(exp => ({ '@binding': exp }))
  const args = exps.map((exp, i) => {
    const key = `$_${i + 1}`
    innerHandlerCode = innerHandlerCode.replace(exp, key)
    return key
  })
  args.push('$event')
  return '{\n' +
    `handler:function(${args.join(',')}){${innerHandlerCode}},\n` +
    `params:${JSON.stringify(bindings)}\n` +
    '}'
}

// 生成事件代码的逻辑
function genHandler (
  name: string,
  handler: ASTElementHandler | Array<ASTElementHandler>
): string {
  // 如果没有传入 handler，直接返回一个空函数
  if (!handler) {
    return 'function(){}'
  }

  // 如果 handler 是数组
  if (Array.isArray(handler)) {
    // 返回一个数组，该数组是对 handler 进行遍历，并且递归调用 genHandler 生成的结果加‘,’拼接而成
    return `[${handler.map(handler => genHandler(name, handler)).join(',')}]`
  }
  // 匹配路径，并且将其值保存到 isMethodPath 中
  const isMethodPath = simplePathRE.test(handler.value)
  // 匹配函数体，并且保存到 isFunctionExpression 中 
  const isFunctionExpression = fnExpRE.test(handler.value)

  // 判读是否存在函数修饰符
  if (!handler.modifiers) {
    // 如果不存在函数修饰符
    // 如果匹配到过 isMethodPath 或 isFunctionExpression，直接将 handler.value 返回 
    if (isMethodPath || isFunctionExpression) {
      return handler.value
    }
    if (__WEEX__ && handler.params) {
      return genWeexHandler(handler.params, handler.value)
    }
    // 如果没有匹配到过 isMethodPath 和 isFunctionExpression，将 handler.value 作为函数体包装成函数返回
    return `function($event){${handler.value}}`
  } else {
    // 如果存在 modifiers
    // 定义 code 为空字符
    let code = ''
    // 定义 genModifierCode 为空字符
    let genModifierCode = ''
    // 定义 keys 为空数组
    const keys = []
    // 遍历 handler.modifiers
    for (const key in handler.modifiers) {
      // 判断 key 是否在 modifierCode 中
      if (modifierCode[key]) {
        // 将 modifierCode[key] 的值追加到 genModifierCode 中
        genModifierCode += modifierCode[key]
        // 如果 keyCodes[key] 存在
        if (keyCodes[key]) {
          // 将 key push 到 keys
          keys.push(key)
        }
      } else if (key === 'exact') {
        const modifiers: ASTModifiers = (handler.modifiers: any)
        genModifierCode += genGuard(
          ['ctrl', 'shift', 'alt', 'meta']
            .filter(keyModifier => !modifiers[keyModifier])
            .map(keyModifier => `$event.${keyModifier}Key`)
            .join('||')
        )
      } else {
        keys.push(key)
      }
    }
    // 如果存在 key
    if (keys.length) {
      // 调用 genKeyFilter，并且将其返回值 追加到 code 上
      code += genKeyFilter(keys)
    }
    // Make sure modifiers like prevent and stop get executed after key filtering
    if (genModifierCode) {
      code += genModifierCode
    }
    const handlerCode = isMethodPath
      ? `return ${handler.value}($event)`
      : isFunctionExpression
        ? `return (${handler.value})($event)`
        : handler.value
    if (__WEEX__ && handler.params) {
      return genWeexHandler(handler.params, code + handlerCode)
    }
    return `function($event){${code}${handlerCode}}`
  }
}

function genKeyFilter (keys: Array<string>): string {
  return `if(!('button' in $event)&&${keys.map(genFilterCode).join('&&')})return null;`
}

function genFilterCode (key: string): string {
  const keyVal = parseInt(key, 10)
  if (keyVal) {
    return `$event.keyCode!==${keyVal}`
  }
  const keyCode = keyCodes[key]
  const keyName = keyNames[key]
  return (
    `_k($event.keyCode,` +
    `${JSON.stringify(key)},` +
    `${JSON.stringify(keyCode)},` +
    `$event.key,` +
    `${JSON.stringify(keyName)}` +
    `)`
  )
}

```