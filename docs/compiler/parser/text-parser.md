# text-parser

```javascript
import { cached } from 'shared/util'
import { parseFilters } from './filter-parser'

const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g
const regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g

// 根据自定义的字变量配置字变量表达式
const buildRegex = cached(delimiters => {
  const open = delimiters[0].replace(regexEscapeRE, '\\$&')
  const close = delimiters[1].replace(regexEscapeRE, '\\$&')
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
  // 正则解析 text
  while ((match = tagRE.exec(text))) {
    index = match.index
    // push text token
    if (index > lastIndex) {
      rawTokens.push(tokenValue = text.slice(lastIndex, index))
      tokens.push(JSON.stringify(tokenValue))
    }
    // tag token
    const exp = parseFilters(match[1].trim())
    tokens.push(`_s(${exp})`)
    rawTokens.push({ '@binding': exp })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    rawTokens.push(tokenValue = text.slice(lastIndex))
    tokens.push(JSON.stringify(tokenValue))
  }
  return {
    expression: tokens.join('+'),
    tokens: rawTokens
  }
}

```