# extend

```javascript
import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   */
  Vue.extend = function (extendOptions: Object): Function {
    // 如果没有传入 extendOptions，则将 extendOptions 设置为空对象
    extendOptions = extendOptions || {}
    // 将 Vue 赋值给 Super
    const Super = this
    // 定义 SuperId 为 Super.cid
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
      this._init(options)
    }
    // 让 Sub 的 prototype 继承自 Super.prototype
    Sub.prototype = Object.create(Super.prototype)
    // Sub.prototype.constructor 指向自身，完成继承
    Sub.prototype.constructor = Sub
    // 将 cid++ 赋值给 Sub.cid， 😭
    Sub.cid = cid++
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    if (Sub.options.props) {
      initProps(Sub)
    }
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    cachedCtors[SuperId] = Sub
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