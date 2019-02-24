# assets
用来全局注册组件，指令和过滤器

```javascript

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

// 创建一些全局静态方法
export function initAssetRegisters (Vue: GlobalAPI) {
  // 遍历 ASSET_TYPES
  ASSET_TYPES.forEach(type => {
    // 在 Vue 上定义静态方法
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      // 如果没有传入方法或对象的定义
      if (!definition) {
        // 直接返回 options 种所定义的值
        return this.options[type + 's'][id]
      } else {
        // 如果在非生产环境中
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          // 对注册的组件名字进行校验
          validateComponentName(id)
        }
        // 如果是定义组件方法，并且传入的值是普通对象
        if (type === 'component' && isPlainObject(definition)) {
          // 如果传入的对象没有 name 就用，就用传入的第一个参数当 definition.name
          definition.name = definition.name || id
          // 将传入的参数对象扩展成组件构造函数
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        // 将 definition 保存到 options 中
        this.options[type + 's'][id] = definition
        // 将 definition 返回
        return definition
      }
    }
  })
}

```