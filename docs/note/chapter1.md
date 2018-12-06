# 第一章 init

如果直接调用Vue，将会发出警告，测试代码，如下：
```javascript
describe('Initialization', () => {
  it('without new', () => {
    try { Vue() } catch (e) {}
    expect('Vue is a constructor and should be called with the `new` keyword').toHaveBeenWarned()
  })

  it('with new', () => {
    expect(new Vue() instanceof Vue).toBe(true)
  })
})
```

涉及到的代码，[～/vue/src/core/instance/index.js](../../core/instance/#index)

```javascript
// 当非生产环境中直接调用构造函数时会发出警告
if (process.env.NODE_ENV !== 'production' &&
  !(this instanceof Vue)
) {
  warn('Vue is a constructor and should be called with the `new` keyword')
}
```