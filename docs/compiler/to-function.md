# to-function
主要作用是将渲染函数字符串转化成渲染函数

```javascript
import { noop, extend } from 'shared/util'
import { warn as baseWarn, tip } from 'core/util/debug'

type CompiledFunctionResult = {
  render: Function;
  staticRenderFns: Array<Function>;
};

// 通过字符串，创建一个新的函数
function createFunction (code, errors) {
  try {
    // 创建一个新到函数
    return new Function(code)
  } catch (err) {
    // 如果有错误，将错误和原代码推入errors
    errors.push({ err, code })
    // 返回一个空函数
    return noop
  }
}

export function createCompileToFunctionFn (compile: Function): Function {
  const cache = Object.create(null)

  return function compileToFunctions (
    template: string,
    options?: CompilerOptions,
    vm?: Component
  ): CompiledFunctionResult {
    // 将 options 混合到新的对象并覆盖原来的值，options 没有传入时将是空对象
    options = extend({}, options)
    // 如果 options 中传入了 options.warn 则使用 options.warn，否则使用 baseWarn
    const warn = options.warn || baseWarn
    // 删除 options 中的 warn
    delete options.warn

    if (process.env.NODE_ENV !== 'production') {
      // 检测可能的CSP限制，如果存在 CSP 限制，要么放宽限制，要么使用预编译
      try {
        new Function('return 1')
      } catch (e) {
        if (e.toString().match(/unsafe-eval|CSP/)) {
          warn(
            'It seems you are using the standalone build of Vue.js in an ' +
            'environment with Content Security Policy that prohibits unsafe-eval. ' +
            'The template compiler cannot work in this environment. Consider ' +
            'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
            'templates into render functions.'
          )
        }
      }
    }

    // 检查是否拥有缓存
    const key = options.delimiters
      ? String(options.delimiters) + template
      : template
    // 如果有缓存，则读取缓存，防止重复编译
    if (cache[key]) {
      return cache[key]
    }

    // 编译，compile 是闭包引用的 createCompileToFunctionFn 的形参
    // compile 即是 src/compiler/create-compiler 中的 compile 函数， 该函数返回 compiled 对象
    const compiled = compile(template, options)

    // 检查是否有编译错误或tips
    if (process.env.NODE_ENV !== 'production') {
      // 如果存在编译错误，报警告
      if (compiled.errors && compiled.errors.length) {
        warn(
          `Error compiling template:\n\n${template}\n\n` +
          compiled.errors.map(e => `- ${e}`).join('\n') + '\n',
          vm
        )
      }
      // 如果有编译提示，则在控制台中，打出提示
      if (compiled.tips && compiled.tips.length) {
        compiled.tips.forEach(msg => tip(msg, vm))
      }
    }

    // 将字符串转译成方法，res 是结果对象
    const res = {}
    // 定义一个空数组，并且保存到 fnGenErrors 上
    const fnGenErrors = []
    // 通过字符串，创建一个新的函数，并且保存到 res.render 上面
    res.render = createFunction(compiled.render, fnGenErrors)
    // staticRenderFns 也保存了一组函数字符串，主要作用是渲染优化
    res.staticRenderFns = compiled.staticRenderFns.map(code => {
      // 遍历，并且将其结果保存到 res.staticRenderFns 上
      return createFunction(code, fnGenErrors)
    })

    // 检查函数生成错误。只有编译器本身存在错误时，才会发生这种情况。主要用于codegen开发
    if (process.env.NODE_ENV !== 'production') {
      if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
        warn(
          `Failed to generate render function:\n\n` +
          fnGenErrors.map(({ err, code }) => `${err.toString()} in\n\n${code}\n`).join('\n'),
          vm
        )
      }
    }

    // 存入缓存，并且返回结果
    return (cache[key] = res)
  }
}

```