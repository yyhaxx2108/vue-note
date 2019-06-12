# use
```javascript
import { toArray } from '../util/index'

// 主要是定义 Vue.use 方法
export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    // 将用到的插件缓存到 installedPlugins 中
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    // 如果有缓存值
    if (installedPlugins.indexOf(plugin) > -1) {
      // 直接返回 this
      return this
    }

    // 将附加的参数保存到 args 中
    const args = toArray(arguments, 1)
    // 将 Vue 添加到 args 参数数组头部
    args.unshift(this)
    if (typeof plugin.install === 'function') {
      // 如果 plugin.install 是函数，那么在 plugin 上下文中以 args 为参数，调用 plugin.install
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      // 如果 plugin 是函数，那么在 null 上下文中以 args 为参数，调用 plugin
      plugin.apply(null, args)
    }
    // 将 plugin psuh 到 installedPlugins 数组中
    installedPlugins.push(plugin)
    // 返回 this
    return this
  }
}
```