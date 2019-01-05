# html-parser

进行词法分析

```javascript

import { makeMap, no } from 'shared/util'
import { isNonPhrasingTag } from 'web/compiler/util'

// 匹配属性的正则表达式
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
// 不包含前缀的 xml 标签名称
const ncname = '[a-zA-Z_][\\w\\-\\.]*'
// 前缀和标签组成的标签名
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
// 开始标签开始部分，表达式 /^<((?:[a-zA-Z_][\w\-\.]*\:)?[a-zA-Z_][\w\-\.]*)/
const startTagOpen = new RegExp(`^<${qnameCapture}`)
// 开始标签结束部分
const startTagClose = /^\s*(\/?)>/
// 结束标签，/^<\/((?:[a-zA-Z_][\w\-\.]*\:)?[a-zA-Z_][\w\-\.]*)[^>]*>/
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
// 匹配doctype
const doctype = /^<!DOCTYPE [^>]+>/i
// 用来匹配注释节点，没有捕获组，避免在页中内联时被当作HTML注释传递
const comment = /^<!\--/
// 捕获 cdata 节点
const conditionalComment = /^<!\[/

// 纯文本标签，特殊的节点，可以包含所有东西
export const isPlainTextElement = makeMap('script,style,textarea', true)
// 定义一个空对象
const reCache = {}

// 字符实体字典
const decodingMap = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t'
}
// 全局匹配字符实体
const encodedAttr = /&(?:lt|gt|quot|amp);/g
// 处理 chrome 和 ie 中的异常模式
const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#10|#9);/g

// 检测是否有 pre 和 textarea 标签
const isIgnoreNewlineTag = makeMap('pre,textarea', true)
// 是否应该忽略元素内容的第一个换行符
const shouldIgnoreFirstNewline = (tag, html) => tag && isIgnoreNewlineTag(tag) && html[0] === '\n'

// 解码 html 中的字符实体 
function decodeAttr (value, shouldDecodeNewlines) {
  const re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr
  return value.replace(re, match => decodingMap[match])
}

// 进行词法分析
export function parseHTML (html, options) {
  // 定义一个堆栈数组，储存非一元标签的开始标签，可以用来检测标签是否完整
  const stack = []
  // 用 expectHTML 保存 bool 值 options.expectHTML
  const expectHTML = options.expectHTML
  // 检测是否为一元标签的函数
  const isUnaryTag = options.isUnaryTag || no
  // 检测是否为可以省略闭合的标签的函数
  const canBeLeftOpenTag = options.canBeLeftOpenTag || no
  // 初始化 index 为 0，表示当前字节流的读取位置
  let index = 0
  // last 剩余的还没有 parse 的字符串，lastTag 是 stack 堆顶的元素
  let last, lastTag
  // while 循环，开始解析数组
  while (html) {
    // 将 html 先缓存到 last 上面
    last = html
    // 判断是否不存在 lastTag 或者lastTag 不是 script,style,textarea
    if (!lastTag || !isPlainTextElement(lastTag)) {
      // 如果不在纯文本标签里，获取 < 的初始位置
      let textEnd = html.indexOf('<')
      if (textEnd === 0) {
        // 如果 html 是 以 < 开头
        if (comment.test(html)) {
          // 如果 html 是注释节点
          // 获取注释节点 '-->' 的位置
          const commentEnd = html.indexOf('-->')
          if (commentEnd >= 0) {
            // 如果有 commentEnd
            if (options.shouldKeepComment) {
              // 如果配置了保存注释， 调用 comment 方法将注释保存
              options.comment(html.substring(4, commentEnd))
            }
            // 前进到注释之后
            advance(commentEnd + 3)
            // 继续解析
            continue
          }
        }

        if (conditionalComment.test(html)) {
          // 如果是 cdata 节点，获取 cdata 节点结尾
          const conditionalEnd = html.indexOf(']>')
          // 前进到 cdata 节点之后，继续
          if (conditionalEnd >= 0) {
            advance(conditionalEnd + 2)
            continue
          }
        }

        // 如果是 Doctype
        const doctypeMatch = html.match(doctype)
        if (doctypeMatch) {
          // 前进 Doctype 的长度，然后继续
          advance(doctypeMatch[0].length)
          continue
        }

        // 判断是否是结束标签
        const endTagMatch = html.match(endTag)
        if (endTagMatch) {
          // 如果是结束标签，更新 index
          const curIndex = index
          // 前进 endTag 的长度
          advance(endTagMatch[0].length)
          parseEndTag(endTagMatch[1], curIndex, index)
          continue
        }

        // 如果不是上面的情况，那么是开始标签
        // 将解析好的开始标签对象保存到 startTagMatch 上
        const startTagMatch = parseStartTag()
        if (startTagMatch) {
          handleStartTag(startTagMatch)
          if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
            advance(1)
          }
          continue
        }
      }

      let text, rest, next
      // 如果 html 不是 以 < 开头
      if (textEnd >= 0) {
        rest = html.slice(textEnd)
        while (
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest) &&
          !conditionalComment.test(rest)
        ) {
          // < in plain text, be forgiving and treat it as text
          next = rest.indexOf('<', 1)
          if (next < 0) break
          textEnd += next
          rest = html.slice(textEnd)
        }
        text = html.substring(0, textEnd)
        advance(textEnd)
      }
      // 如果不存在 <
      if (textEnd < 0) {
        text = html
        html = ''
      }

      if (options.chars && text) {
        options.chars(text)
      }
    } else {
      // 如果在纯文本标签里面，进行下面操作
      let endTagLength = 0
      const stackedTag = lastTag.toLowerCase()
      const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'))
      const rest = html.replace(reStackedTag, function (all, text, endTag) {
        endTagLength = endTag.length
        if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
          text = text
            .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
        }
        if (shouldIgnoreFirstNewline(stackedTag, text)) {
          text = text.slice(1)
        }
        if (options.chars) {
          options.chars(text)
        }
        return ''
      })
      index += html.length - rest.length
      html = rest
      parseEndTag(stackedTag, index - endTagLength, index)
    }

    // 如果 html === last，说明经过上面处理后html没有变化，可以将html当作文本对待
    if (html === last) {
      // 如果存在 options.chars，使用 options.chars 处理 html
      options.chars && options.chars(html)
      // 如果此时 stack 中没有元素，报警告
      if (process.env.NODE_ENV !== 'production' && !stack.length && options.warn) {
        options.warn(`Mal-formatted tag at end of template: "${html}"`)
      }
      break
    }
  }

  // 清理掉剩余的 tag
  parseEndTag()

  // 前进
  function advance (n) {
    // 更新index
    index += n
    // 更新html
    html = html.substring(n)
  }
  // 解析开始标签
  function parseStartTag () {
    // 匹配标签开始部分
    const start = html.match(startTagOpen)
    if (start) {
      // 如果存在 start
      // 在 match 上保存标签名到 tagName，初始化一个attrs空数组，保存当前索引到 start 上
      const match = {
        tagName: start[1],
        attrs: [],
        start: index
      }
      // 前进 start 的长度
      advance(start[0].length)
      let end, attr
      // 匹配 attribute
      while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        // 前进 attr 的长度
        advance(attr[0].length)
        // 往 attrs 推入 attr
        match.attrs.push(attr)
      }
      if (end) {
        // 如果匹配到开始标签的结尾
        // 将/保存到 match.unarySlash
        match.unarySlash = end[1]
        // 前进 end 长度
        advance(end[0].length)
        // 将当前索引 index 保存到 match.end上
        match.end = index
        // 返回 match
        return match
      }
    }
  }
  // 处理 parseStartTag 后的结果
  function handleStartTag (match) {
    const tagName = match.tagName
    const unarySlash = match.unarySlash

    if (expectHTML) {
      if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
        parseEndTag(lastTag)
      }
      if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
        parseEndTag(tagName)
      }
    }

    const unary = isUnaryTag(tagName) || !!unarySlash

    const l = match.attrs.length
    const attrs = new Array(l)
    for (let i = 0; i < l; i++) {
      const args = match.attrs[i]
      const value = args[3] || args[4] || args[5] || ''
      const shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
        ? options.shouldDecodeNewlinesForHref
        : options.shouldDecodeNewlines
      attrs[i] = {
        name: args[1],
        value: decodeAttr(value, shouldDecodeNewlines)
      }
    }

    if (!unary) {
      stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs })
      lastTag = tagName
    }

    if (options.start) {
      options.start(tagName, attrs, unary, match.start, match.end)
    }
  }

  // 解析结束标签
  function parseEndTag (tagName, start, end) {
    let pos, lowerCasedTagName
    if (start == null) start = index
    if (end == null) end = index

    // Find the closest opened tag of the same type
    if (tagName) {
      lowerCasedTagName = tagName.toLowerCase()
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break
        }
      }
    } else {
      // If no tag name is provided, clean shop
      pos = 0
    }

    if (pos >= 0) {
      // Close all the open elements, up the stack
      for (let i = stack.length - 1; i >= pos; i--) {
        if (process.env.NODE_ENV !== 'production' &&
          (i > pos || !tagName) &&
          options.warn
        ) {
          options.warn(
            `tag <${stack[i].tag}> has no matching end tag.`
          )
        }
        if (options.end) {
          options.end(stack[i].tag, start, end)
        }
      }

      // Remove the open elements from the stack
      stack.length = pos
      lastTag = pos && stack[pos - 1].tag
    } else if (lowerCasedTagName === 'br') {
      if (options.start) {
        options.start(tagName, [], true, start, end)
      }
    } else if (lowerCasedTagName === 'p') {
      if (options.start) {
        options.start(tagName, [], false, start, end)
      }
      if (options.end) {
        options.end(tagName, start, end)
      }
    }
  }
}

```