# perf

```javascript
  // 判断是否为浏览器环境
  const perf = inBrowser && window.performance
  // 如果 mark 等相关属性存在，则封装 measure 方法并且将mark、measure返回
  if (
    perf &&
    perf.mark &&
    perf.measure &&
    perf.clearMarks &&
    perf.clearMeasures
  ) {
    mark = tag => perf.mark(tag)
    // measure加上了清楚 Tag 的操作
    measure = (name, startTag, endTag) => {
      perf.measure(name, startTag, endTag)
      perf.clearMarks(startTag)
      perf.clearMarks(endTag)
      perf.clearMeasures(name)
    }
  }
```