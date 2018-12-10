# perf

性能追踪，以下四个场景中用到
1. 组件初始化(component init)
2. 编译(compile)，将模板(template)编译成渲染函数
3. 渲染(render)，其实就是渲染函数的性能，或者说渲染函数执行且生成虚拟DOM(vnode)的性能
4. 打补丁(patch)，将虚拟DOM渲染为真实DOM的性能

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