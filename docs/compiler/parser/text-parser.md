# text-parser

```javascript
import { cached } from 'shared/util'
import { parseFilters } from './filter-parser'

// 匹配 {{}} 字符字变量
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g
const regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g

// 根据自定义的字变量配置字变量表达式
const buildRegex = cached(delimiters => {
  // 在开始标签中的将特殊符号前面加上‘\’, 如：‘${’ 会替换为 ‘\$\{’
  const open = delimiters[0].replace(regexEscapeRE, '\\$&')
  // 在结束标签中的将特殊符号前面加上‘\’，如：‘}’ 会替换为 ‘\’
  const close = delimiters[1].replace(regexEscapeRE, '\\$&')
  // 返回替换标签后到正则表达式, /\$\{((?:.|\n)+?)\}/g
  return new RegExp(open + '((?:.|\\n)+?)' + close, 'g')
})

type TextParseResult = {
  expression: string,
  tokens: Array<string | { '@binding': string }>
}

// 解析子面表达式
export function parseText (
  text: string,
  delimiters?: [string, string]
): TextParseResult | void {
  // 匹配字符变量，
  const tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE
  // 如果不能匹配字面量，直接返回
  if (!tagRE.test(text)) {
    return
  }
  // 定义一个 tokens
  const tokens = []
  // 定义一个 rawTokens
  const rawTokens = []
  // 将 lastIndex 和 tagRE.lastIndex 设置为 0
  let lastIndex = tagRE.lastIndex = 0
  // 定义 match, index, tokenValue
  let match, index, tokenValue
  // 正则解析 text，并且把匹配到的值放到 match 上面
  while ((match = tagRE.exec(text))) {
    // 将 match.index 保存到 index 上
    index = match.index
    // 解析下一个 token 
    if (index > lastIndex) {
      // 如果 index > lastIndex，将 tokenValue 原始值保存到 rawTokens 中
      rawTokens.push(tokenValue = text.slice(lastIndex, index))
      // 将 tokenValue JSON.stringify 的值保存到 tokens 中
      tokens.push(JSON.stringify(tokenValue))
    }
    // 解析过滤器
    const exp = parseFilters(match[1].trim())
    // 将表达时 push 到 tokens 中
    tokens.push(`_s(${exp})`)
    // 将过滤器解析后的表达式 push 到 rawTokens 中
    rawTokens.push({ '@binding': exp })
    // 更新 lastIndex 的值
    lastIndex = index + match[0].length
  }
  // 如果 lastIndex 小于 text.length
  if (lastIndex < text.length) {
    // 将 {{}} 后面的字符串 push 到 rawTokens 中
    rawTokens.push(tokenValue = text.slice(lastIndex))
    // 将 {{}} 后面的字符串 JSON.stringify 之后，push 到 tokens 中
    tokens.push(JSON.stringify(tokenValue))
  }
  // 将 {expression, tokens} 返回
  return {
    expression: tokens.join('+'),
    tokens: rawTokens
  }
}

```