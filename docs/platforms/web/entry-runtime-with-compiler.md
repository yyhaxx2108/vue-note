# entry-runtime-with-compiler
```javascript

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

// 查找 id = id 的 dom 结构，idToTemplate是一个函数，cached 返回的是一个函数
// cached 缓存，避免重复求值，用以提高性能
const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

// 缓存$mount
const mount = Vue.prototype.$mount
// 重写编译相关的$mount
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 如果存在el，那么将 el 转化为 Element
  el = el && query(el)

  if (el === document.body || el === document.documentElement) {
    // 如果 el 是 document.body 或 html，那么报警告
    // el 是组件占位符，后面会被替换掉，html或body 不能被替换掉
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    // 将 vue 实例返回
    return this
  }

  // 用 options 保存 this.$options 的引用
  const options = this.$options
  // 如果不存在 options.render，将 el 或 template 转化为 render 函数
  // 如果存在 options.render，那么直接调用 mount
  if (!options.render) {
    // 用 template 保存 options.template 的引用
    let template = options.template
    if (template) {
      // 如果存在 template，判断 template 的类型
      if (typeof template === 'string') {
        // 如果 template 是字符串
        if (template.charAt(0) === '#') {
          // 如果 template 以 # 开头，查找以 template 的 dom，并保存
          template = idToTemplate(template)
          // 如果不存在 template，那么直接报警告
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        // 如果存在 template.nodeType，即为元素节点，将 template.innerHTML 赋值到 template
        template = template.innerHTML
      } else {
        // 如果不存在 template.nodeType，那么报警告
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        // 同时将该实例返回
        return this
      }
    } else if (el) {
      // 如果没有 template，那么将 getOuterHTML(el) 赋值 给 template
      template = getOuterHTML(el)
    }
    // 判断 template 存在，因为 template 可能为空字符串
    if (template) {
      // 如果配置了 performance，且存在mark，加上测试性能的开始标记
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }
      // 通过 compileToFunctions 函数获取 render，staticRenderFns
      // template 模版字符串, 
      // 第二个参数为一些配置选项 shouldDecodeNewlines: ie 怪异模式兼容、shouldDecodeNewlinesForHref chrome怪异模式兼容
      // delimiters 模版变量风格 comments 是否保留注释，this 为当前实例
      const { render, staticRenderFns } = compileToFunctions(template, {
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      // 将 render 保存到 options.render
      options.render = render
      // 将 staticRenderFns 保存到 options.staticRenderFns
      options.staticRenderFns = staticRenderFns

      // 如果配置了 performance，且存在mark，加上测试性能的结束标记
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  // 调用缓存好的 mount
  return mount.call(this, el, hydrating)
}

// 获取 elements 的 outerHTML，需要考虑 svg
function getOuterHTML (el: Element): string {
  // 在 IE9-11 中 SVG 标签元素是没有 innerHTML 和 outerHTML 这两个属性的
  if (el.outerHTML) {
    // 如果存在 el.outerHTML，直接返回 el.outerHTML
    return el.outerHTML
  } else {
    // 如果不存在 el.outerHTML，首先创建一个空div 并保存到 container
    const container = document.createElement('div')
    // 将 el 的副本 append 到 container
    container.appendChild(el.cloneNode(true))
    // 返回 container.innerHTML
    return container.innerHTML
  }
}

// 给Vue的构造函数挂载上compile方法
Vue.compile = compileToFunctions

export default Vue
```