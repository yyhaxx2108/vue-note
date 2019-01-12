# filter-parser

```javascript
const validDivisionCharRE = /[\w).+\-_$\]]/

// 解析动态属性表达式过滤器
export function parseFilters (exp: string): string {
  let inSingle = false
  let inDouble = false
  let inTemplateString = false
  let inRegex = false
  let curly = 0
  let square = 0
  let paren = 0
  let lastFilterIndex = 0
  let c, prev, i, expression, filters

  // 遍历 exp 字符串
  for (i = 0; i < exp.length; i++) {
    // 将 c 缓存到 prev，prev 表示前一个字符
    prev = c
    // 将 exp.charCodeAt(i) 保存到 c 上面
    c = exp.charCodeAt(i)
    if (inSingle) {
      // 如果在‘'’ 里面，并且当前符号是 ‘'’，且前一个符号不是 ‘\’, 则将 inSingle=false 结束单引号包裹
      if (c === 0x27 && prev !== 0x5C) inSingle = false
    } else if (inDouble) {
      // 如果在‘"’ 里面，并且当前符号是 ‘"’，且前一个符号不是 ‘\’, 则将 inDouble=false 结束双引号包裹
      if (c === 0x22 && prev !== 0x5C) inDouble = false
    } else if (inTemplateString) {
      // 如果在‘`’ 里面，并且当前符号是 ‘`’，且前一个符号不是 ‘\’, 则将 inTemplateString=false 结束模版字符串包裹
      if (c === 0x60 && prev !== 0x5C) inTemplateString = false
    } else if (inRegex) {
      // 如果在‘/’ 里面，并且当前符号是 ‘/’，且前一个符号不是 ‘\’, 则将 inRegex=false 结束正则字符串包裹
      if (c === 0x2f && prev !== 0x5C) inRegex = false
    } else if (
      c === 0x7C && // pipe
      exp.charCodeAt(i + 1) !== 0x7C &&
      exp.charCodeAt(i - 1) !== 0x7C &&
      !curly && !square && !paren
    ) {
      // 如果当前是管道符号‘|’，并且上一个符号和下一个符号都不是‘|’，并且没有在 ‘{’、‘[’、‘(’中
      if (expression === undefined) {
        // 如果不存在 expression，lastFilterIndex 将 exp 分割成为表达式以及过滤器表达式
        lastFilterIndex = i + 1
        // 将表达是赋值给 expression
        expression = exp.slice(0, i).trim()
      } else {
        // 如果存在 expression，调用 pushFilter，将 filter push到过滤器数组中
        pushFilter()
      }
    } else {
      switch (c) {
        // 如果当前标签是 ‘"’，开启 ‘"’
        case 0x22: inDouble = true; break         // "
        // 如果当前标签是 ‘'’，开启 ‘'’
        case 0x27: inSingle = true; break         // 
        // 如果当前标签是 ‘`’，开启 ‘`’
        case 0x60: inTemplateString = true; break // `
        // 如果当前标签是 ‘(’，将 paren 加1
        case 0x28: paren++; break                 // (
        // 如果当前标签是 ‘)’，将 paren 减1
        case 0x29: paren--; break                 // )
        // 如果当前标签是 ‘[’，将 square 加1
        case 0x5B: square++; break                // [
        // 如果当前标签是 ‘]’，将 square 减1
        case 0x5D: square--; break                // ]
         // 如果当前标签是 ‘{’，将 curly 加1
        case 0x7B: curly++; break                 // {
        // 如果当前标签是 ‘}’，将 square 减1
        case 0x7D: curly--; break                 // }
      }
      // 如果 c 为 ‘/’，则为正则表示式，进行判断
      if (c === 0x2f) { 
        // j 为上一个字符索引
        let j = i - 1
        let p
        // 从 j 位置开始往前遍历
        for (; j >= 0; j--) {
          // 如果找到非空字符串，将其保存到 p 上面
          p = exp.charAt(j)
          // 跳出循环
          if (p !== ' ') break
        }
        // 如果没有找到 p，或者 p 不是字母、‘)’、‘.’、‘+’、‘-’、‘_’、‘$’、‘]’ 之一，则认定为后面处于正则环境下
        if (!p || !validDivisionCharRE.test(p)) {
          inRegex = true
        }
      }
    }
  }
  // 解析剩余的字符串，判断 expression 是否存在
  if (expression === undefined) {
    // 如果 expression === undefined，说明不存在过滤器，将 exp.slice(0, i) 当作 expression
    expression = exp.slice(0, i).trim()
  } else if (lastFilterIndex !== 0) {
    // 如果 expression 存在，调用 pushFilter
    pushFilter()
  }

  // push filter 到 filters 中
  function pushFilter () {
    // 将 filter push到 filters 中
    (filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim())
    // lastFilterIndex 加 1
    lastFilterIndex = i + 1
  }
  // 如果存在过滤器
  if (filters) {
    // 遍历过滤器
    for (i = 0; i < filters.length; i++) {
      // 将过滤器组装成 _f 方法到表达式
      expression = wrapFilter(expression, filters[i])
    }
  }
  // 返回该表达式
  return expression
}

// 组装 _f 函数，exp 为当前表达式，filter 为过滤器名字
function wrapFilter (exp: string, filter: string): string {
  // 检查过滤器名字中是否有 ‘(’
  const i = filter.indexOf('(')
  // _f 是处理 filter 的函数
  if (i < 0) {
    // 如果不存在‘(’, 返回 `_f("${filter}")(${exp})`
    return `_f("${filter}")(${exp})`
  } else {
    // 如果存在‘(’
    // ‘(’ 前面是函数名
    const name = filter.slice(0, i)
    // ‘(’ 后面是函数参数
    const args = filter.slice(i + 1)
    return `_f("${name}")(${exp}${args !== ')' ? ',' + args : args}`
  }
}
```