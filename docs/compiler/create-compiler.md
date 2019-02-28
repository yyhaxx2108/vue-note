# create-compiler

```javascript
import { extend } from 'shared/util'
import { detectErrors } from './error-detector'
import { createCompileToFunctionFn } from './to-function'

export function createCompilerCreator (baseCompile: Function): Function {
  return function createCompiler (baseOptions: CompilerOptions) {
    function compile (
      template: string,
      options?: CompilerOptions
    ): CompiledResult {
      // 以 baseOptions 为原型创建 finalOptions 对象，finalOptions是 baseCompile 的参数
      // baseOptions 是 createCompiler 形参，来自于 src/platforms/web/compiler/index.js
      const finalOptions = Object.create(baseOptions)
      // 将 errors 初始化成一个空数组
      const errors = []
      // 将 tips 初始化成一个空数组
      const tips = []
      // 给 finalOptions 定义一个 warn 方法
      finalOptions.warn = (msg, tip) => {
        (tip ? tips : errors).push(msg)
      }
      // 如果存在 options
      if (options) {
        // 如果存在 options.modules，合并 baseOptions.modules 和 options.modules 
        // 并且保存到 finalOptions.modules上
        if (options.modules) {
          finalOptions.modules =
            (baseOptions.modules || []).concat(options.modules)
        }
        // 如果存在options.directives，合并directives
        if (options.directives) {
          // 该合并策略是以 baseOptions.directives 为原型构建一个空对象
          // 将 options.directives 上的方法复制到该对象上
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          )
        }
        // 将 options 上其他选项复制到 finalOptions 上
        for (const key in options) {
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key]
          }
        }
      }

      // 调用 baseCompile 函数，传入的参数是 template 和 finalOptions
      // 将该函数返回值赋值给 compiled
      const compiled = baseCompile(template, finalOptions)

      // 在非生产环境中，通过抽象语法数检查模板中是否存在错误表达式，通过 detectErrors 实现
      // compiled.ast 模板编译后的抽象语法树
      if (process.env.NODE_ENV !== 'production') {
        errors.push.apply(errors, detectErrors(compiled.ast))
      }

      // 将 errors 保存到 compiled.errors
      compiled.errors = errors
      // 将 tips 保存到 compiled.tips
      compiled.tips = tips
      // 返回 compiled
      return compiled
    }

    // 返回一个对象
    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile)
    }
  }
}

```