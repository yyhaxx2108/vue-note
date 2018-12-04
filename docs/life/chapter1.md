# 第一章 始

```javascript
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}
```
大家好，我叫Vue，我出生在[～/vue/src/core/instance/index.js](../../core/instance/#index)文件 如你所见，我是一名构造函数，我与一般函数不同，在非生产环境中，我被直接调用时我会发出警告，如下：
```javascript
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
```
因此，我的正确使用方法是 new Vue(options),我接收参数options，并且对options进行_init(options)。

等一下！_init是什么鬼？他来自于什么地方？

为了搞清楚上面的问题，在后面的内容中，我会以自身能力的来源为线详诉我的一生。

