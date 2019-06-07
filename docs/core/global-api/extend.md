# extend

```javascript
import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend (Vue: GlobalAPI) {
  // 每一个实例的构造器，包括 Vue，都有一个唯一的 cid，这让我们创建一个用户原型继承的子 constructors，并且缓存起来
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   */
  Vue.extend = function (extendOptions: Object): Function {
    // 如果没有传入 extendOptions，则将 extendOptions 设置为空对象
    extendOptions = extendOptions || {}
    // 将 Vue 赋值给 Super, this 指的是 Vue
    const Super = this
    // 定义 SuperId 为 Super.cid，即Vue.cid
    const SuperId = Super.cid
    // 将 extendOptions._Ctor 或者 {} 保存到 cachedCtors 上
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    // 如果 cachedCtors[SuperId]，说明已经缓存过了 construtor
    if (cachedCtors[SuperId]) {
      // 直接返回缓存过的 construtor
      return cachedCtors[SuperId]
    }

    // 缓存 name，name可以来自于 extendOptions.name 或 Super.options.name
    const name = extendOptions.name || Super.options.name
    // 在非生产环境中
    if (process.env.NODE_ENV !== 'production' && name) {
      // 对 name 进行校验
      validateComponentName(name)
    }

    // 定义一个 Sub 方法，该方法会调用 this._init(options)
    const Sub = function VueComponent (options) {
      // 调用 init 方法， init 就是 vue.prototype.init
      this._init(options)
    }
    // 让 Sub 的 prototype 继承自 Super.prototype
    Sub.prototype = Object.create(Super.prototype)
    // Sub.prototype.constructor 指向自身，完成继承
    Sub.prototype.constructor  = Sub
    // 将 cid++ 赋值给 Sub.cid
    Sub.cid = cid++
    // 对 options 进行合并
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    // 将 super 指向 Vue
    Sub['super'] = Super
    
    // 对于 props 和 computed 属性，我们在扩展时，在 prototype 上通过 proxy getters 进行定义
    // 这样可以避免在每次实例化组件时都调用 Object.defineProperty 的get 方法
    if (Sub.options.props) {
      initProps(Sub)
    }
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // 运行子组件调用扩展方法
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // 创建一些静态资源注册，这样在子构造函数中也会有这些资源
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // 启用递归自查找
    if (name) {
      Sub.options.components[name] = Sub
    }

    // 保存父级 options，在后面的实例化过程中，我们可以检查super的选项是否已更新
    Sub.superOptions = Super.options
    // 保留自身传入 options
    Sub.extendOptions = extendOptions
    // 用继承的方式保留自身构造函数的 options
    Sub.sealedOptions = extend({}, Sub.options)

    // 换成 Sub
    cachedCtors[SuperId] = Sub
    // 将 Sub 返回
    return Sub
  }
}

function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}

```