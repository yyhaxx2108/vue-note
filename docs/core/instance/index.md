# index

当非生产环境中直接调用构造函数时会发出警告

```javascript

  function Vue (options) {
    // 当非生产环境中直接调用构造函数时会发出警告，this instanceof Vue 判断 this 是否为Vue的实例
    if (process.env.NODE_ENV !== 'production' &&
      !(this instanceof Vue)
    ) {
      warn('Vue is a constructor and should be called with the `new` keyword')
    }
    this._init(options)
  }

  // 给 Vue.prototype挂上 _init方法
  initMixin(Vue)
  // 给 Vue.prototype定义了 $data、$props属性，挂上$set、$delete、$watch方法
  stateMixin(Vue)
  // 给 Vue.prototype挂上$on、$once、$off、$emit方法
  eventsMixin(Vue)
  // 给 Vue.prototype挂上 _update、$forceUpdate、$destroy方法
  lifecycleMixin(Vue)
  // 给 Vue.prototype挂上 $nextTick、_render、
  // _o、_n、_s、_l、_t、_q、_i、_m、_f、_k、_b、_v、_e、_u、_g方法
  renderMixin(Vue)

  export default Vue
```