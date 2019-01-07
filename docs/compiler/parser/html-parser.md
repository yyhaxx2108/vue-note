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
        // 如果 html 是 以 < 开头，判断是否为注释
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
        // 判断是否为 cdata 节点
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
        // 匹配结束标签
        const endTagMatch = html.match(endTag)
        if (endTagMatch) {
          // 如果是结束标签，保存当前 index
          const curIndex = index
          // 前进 endTag 的长度
          advance(endTagMatch[0].length)
          // 解析结束标签，endTagMatch[1] 为标签名，curIndex 为开始位置，index 为结束位置
          parseEndTag(endTagMatch[1], curIndex, index)
          // 继续操作
          continue
        }

        // 如果不是上面的情况，那么是开始标签
        // 将解析好的开始标签对象保存到 startTagMatch 上
        const startTagMatch = parseStartTag()
        if (startTagMatch) {
          // 如果存在 startTagMatch，用 handleStartTag 处理 startTagMatch
          handleStartTag(startTagMatch)
          // 判断是否应该忽略第一个换行符号
          if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
            // 如果应该忽略，那么前进1
            advance(1)
          }
          continue
        }
      }

      let text, rest, next
      // 如果 textEnd >= 0)
      if (textEnd >= 0) {
        // 将 html 从 textEnd 截取并且保存到 rest 上面
        rest = html.slice(textEnd)
        // 如果 rest 不是结束标签、开始标签前面部分、不是注释节点、不是cdata节点
        while (
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest) &&
          !conditionalComment.test(rest)
        ) {
          // “<” 将被当作纯文本对待
          // 查找第一个“<”后面是否还有 “<”
          next = rest.indexOf('<', 1)
          // 如果没有，跳出 while 循环
          if (next < 0) break
          // 如果有将 textEnd 加 next
          textEnd += next
          // 更新 rest
          rest = html.slice(textEnd)
        }
        // 获取纯文本数据，并且保存到 text 上
        text = html.substring(0, textEnd)
        // 前进 textEnd
        advance(textEnd)
      }
      // 如果不存在 “<”，当作纯文本处理
      if (textEnd < 0) {
        text = html
        html = ''
      }

      // 如果存在字符串的回调方法和 text
      if (options.chars && text) {
        // 将 text 传入 chars 进行处理 
        options.chars(text)
      }
    } else {
      // 对纯文本标签内容进行处理，纯文本标签主要有 script、style、textarea
      // 定义 endTagLength 为 0
      let endTagLength = 0
      // 定义 stackedTag 为父级元素的小写形式
      const stackedTag = lastTag.toLowerCase()
      // 定义查找父元素纯文本内容即结束标签的正则表达式， 并且缓存到 reCache[stackedTag]上
      const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'))
      // 将 reStackedTag 替换为空并且将 html 保存到 rest 上面
      const rest = html.replace(reStackedTag, function (all, text, endTag) {
        // 获取endTagLength
        endTagLength = endTag.length
        if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
          text = text
            .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
        }
        // 如果 shouldIgnoreFirstNewline 那么将第一个换行符去掉
        if (shouldIgnoreFirstNewline(stackedTag, text)) {
          text = text.slice(1)
        }
        // 如果有 chars 回调方法，将 text 作为参数传入 options
        if (options.chars) {
          options.chars(text)
        }
        return ''
      })
      // 更新html值
      index += html.length - rest.length
      // 将 rest 赋值给 html
      html = rest
      // parseEndTag 函数解析纯文本标签的结束标签
      parseEndTag(stackedTag, index - endTagLength, index)
    }

    // 如果 html === last，说明经过上面处理后html没有变化，可以将html当作文本对待
    // 比如 <a
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
    // 保存 tagName
    const tagName = match.tagName
    // 保存 unarySlash
    const unarySlash = match.unarySlash
    // 如果 expectHTML 为 true
    if (expectHTML) {
      // 如果最新的标签是 p 标签，且当前正在解析的标签不是段落式内容
      if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
        // 调用 parseEndTag 并且传入 lastTag（p）
        // 这样做的目的是立即闭合 p 标签，让其与浏览器行为一致
        parseEndTag(lastTag)
      }
      // 当前正在解析的标签是一个可以省略结束标签的标签，并且与上一次解析到的开始标签相同
      if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
        // 立即关闭当前的tag
        parseEndTag(tagName)
      }
    }

    // 判断 tag 是否为但标签
    const unary = isUnaryTag(tagName) || !!unarySlash
    // attrs 上面属性的个数
    const l = match.attrs.length
    // 根据属性长度，新建属性数组
    const attrs = new Array(l)
    // 循环 l 次
    for (let i = 0; i < l; i++) {
      // 读取当前标签
      const args = match.attrs[i]
      // 将当前标签的值保存到 value
      const value = args[3] || args[4] || args[5] || ''
      // 保存 shouldDecodeNewlines 方法
      const shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
        ? options.shouldDecodeNewlinesForHref
        : options.shouldDecodeNewlines
      // attr[i] 保存有 name、value 的对象
      attrs[i] = {
        name: args[1],
        value: decodeAttr(value, shouldDecodeNewlines)
      }
    }
    // 如果不存在 ‘\’
    if (!unary) {
      // 将 tag 解析后的对象 push 到 stack
      stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs })
      // 将 tagName 保存到 lastTag
      lastTag = tagName
    }
    // 如果存在 start 钩子，调用该钩子函数
    if (options.start) {
      options.start(tagName, attrs, unary, match.start, match.end)
    }
  }

  // 解析结束标签，参数分别是标签名，开始位置，结束位置，这些参数都是可选的
  // 作用有检测是否缺少闭合标签，处理 stack 栈中剩余标签，解析</br></p>标签
  function parseEndTag (tagName, start, end) {
    // pos 用于判断 html 字符串是否缺少结束标签
    // lowerCasedTagName 变量用来存储 tagName 的小写版
    let pos, lowerCasedTagName
    // 如果 start 缺省，将 index 赋值到上面
    if (start == null) start = index
    if (end == null) end = index

    // 查找最近的 tag 开标签
    if (tagName) {
      // 将 tag 转为小写
      lowerCasedTagName = tagName.toLowerCase()
      // 寻找开始标签所在的位置，并且将其保存到 pos 上面
      for (pos = stack.length - 1; pos >= 0; pos--) {
        // 循环查找 tag 开标签
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          // 如果找到跳出循环
          break
        }
      }
    } else {
      //如果没有传递 tagName，将 pos 赋值为 0
      pos = 0
    }
    // 判断 pos 是否小于 0，如果 pos 小于 0，说明栈中没有对应的开始标签
    // 那么需要判断tag 是否单标签或p标签
    if (pos >= 0) {
      // 如果 pos >= 0 为stack 里面所有tag之前所有未闭合的标签抛出警告
      for (let i = stack.length - 1; i >= pos; i--) {
        if (process.env.NODE_ENV !== 'production' &&
          (i > pos || !tagName) &&
          options.warn
        ) {
          // 抛出警告，标签未闭合
          options.warn(
            `tag <${stack[i].tag}> has no matching end tag.`
          )
        }
        // 如果存在 end 钩子函数
        if (options.end) {
          // 调用 end，传入 当前标签，开始位置，和结束位置 
          options.end(stack[i].tag, start, end)
        }
      }

      // 将处理过的标签推出 stack 栈
      stack.length = pos
      // 如果 stack 里面还有元素，将最上面元素保存到 lastTag 上
      lastTag = pos && stack[pos - 1].tag
    } else if (lowerCasedTagName === 'br') {
      // 如果是 </br>, 将 br 当作开始标签处理
      if (options.start) {
        options.start(tagName, [], true, start, end)
      }
    } else if (lowerCasedTagName === 'p') {
      // 当遇到的是 </p> 标签时，则加上 <p> 
      if (options.start) {
        // 如果存在 start 钩子，则调用 start 钩子函数
        options.start(tagName, [], false, start, end)
      }
      if (options.end) {
        // 如果存在 end 钩子，则调用 end 钩子函数
        options.end(tagName, start, end)
      }
    }
  }
}

```