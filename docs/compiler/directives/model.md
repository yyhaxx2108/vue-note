# model

```javascript
/* @flow */

/**
 * Cross-platform code generation for component v-model
 */
export function genComponentModel (
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
): ?boolean {
  const { number, trim } = modifiers || {}

  const baseValueExpression = '$$v'
  let valueExpression = baseValueExpression
  if (trim) {
    valueExpression =
      `(typeof ${baseValueExpression} === 'string'` +
      `? ${baseValueExpression}.trim()` +
      `: ${baseValueExpression})`
  }
  if (number) {
    valueExpression = `_n(${valueExpression})`
  }
  const assignment = genAssignmentCode(value, valueExpression)

  el.model = {
    value: `(${value})`,
    expression: `"${value}"`,
    callback: `function (${baseValueExpression}) {${assignment}}`
  }
}

// 返回一个赋值作用的代码字符串
export function genAssignmentCode (
  value: string,
  assignment: string
): string {
  const res = parseModel(value)
  if (res.key === null) {
    return `${value}=${assignment}`
  } else {
    return `$set(${res.exp}, ${res.key}, ${assignment})`
  }
}

/**
 * Parse a v-model expression into a base path and a final key segment.
 * Handles both dot-path and possible square brackets.
 *
 * Possible cases:
 *
 * - test
 * - test[key]
 * - test[test1[key]]
 * - test["a"][key]
 * - xxx.test[a[a].test1[key]]
 * - test.xxx.a["asa"][test1[key]]
 *
 */

let len, str, chr, index, expressionPos, expressionEndPos

type ModelParseResult = {
  exp: string,
  key: string | null
}

// 解析 v-model
export function parseModel (val: string): ModelParseResult {
  // 去掉 val 左右到空格
  val = val.trim()
  // 保存 val 到长度
  len = val.length
  // 如果不存在 ‘[’, 或最后面一个字符不是 ‘]’ 
  if (val.indexOf('[') < 0 || val.lastIndexOf(']') < len - 1) {
    // 从右到左读取 ‘.’ 的位置
    index = val.lastIndexOf('.')
    // 判断 val 字符串中是否存在 ‘.’
    if (index > -1) {
      // 如果存在，将最后一个 ‘.’ 前面的字符串当作 exp，最后一个‘.’ 后面的字符串加上双引号当作 key
      return {
        exp: val.slice(0, index),
        key: '"' + val.slice(index + 1) + '"'
      }
    } else {
      // 如果不存在，返回对象 {exp: val, exp: null}
      return {
        exp: val,
        key: null
      }
    }
  }
  // 如果字符串最后一个字符是‘]’,且存在‘[’,将 val 保存到 str 上
  str = val
  // 将 index、expressionPos、expressionEndPos 初始化成 0
  index = expressionPos = expressionEndPos = 0
  // 从左到右读取 val 的字符
  while (!eof()) {
    // 读取当前位置的下一个字符保存到 chr 上
    chr = next()
    if (isStringStart(chr)) {
      // 如果当前字符是‘'’或者‘“’，调用 parseString，找到下一个引号，更新index值
      parseString(chr)
    } else if (chr === 0x5B) {
      // 如果当前字符在非引号中，且为‘[’, 调用 parseBracket
      parseBracket(chr)
    }
  }

  // 返回有 exp 和 key 的对象
  return {
    exp: val.slice(0, expressionPos),
    key: val.slice(expressionPos + 1, expressionEndPos)
  }
}

// 读取当前位置的下一个字符
function next (): number {
  return str.charCodeAt(++index)
}

function eof (): boolean {
  return index >= len
}

// 判断当前字符是否为 ‘'’ 或者为 ‘”’
function isStringStart (chr: number): boolean {
  return chr === 0x22 || chr === 0x27
}

function parseBracket (chr: number): void {
  // 设置变量 inBracket 为 1
  let inBracket = 1
  // 将当前的 index 保存到 expressionPos 上
  expressionPos = index
  // 遍历 val 字符串
  while (!eof()) {
    // 将下一个字符串保存到 chr 上
    chr = next()
    // 如果遇到 ‘'’或 ‘"’
    if (isStringStart(chr)) {
      // 解析完 ‘'’或 ‘"’
      parseString(chr)
      // 然后继续循环
      continue
    }
    // 如果遇到’[‘, 将 inBracket++
    if (chr === 0x5B) inBracket++
    // 如果遇到’]‘, 将 inBracket--
    if (chr === 0x5D) inBracket--
    // 当 inBracket === 0时，将此时的 index 保存到 expressionEndPos，然后跳出循环
    if (inBracket === 0) {
      expressionEndPos = index
      break
    }
  }
}

// 解析字符串
function parseString (chr: number): void {
  // 将 chr 保存到 stringQuote 上
  const stringQuote = chr
  // 遍历 val 值，知道找到下一个 chr，此时 index已经更新
  while (!eof()) {
    // 更新 index
    chr = next()
    if (chr === stringQuote) {
      break
    }
  }
}

```