# index

```javascript
import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// 创建一个编译器的函数, 此函数默认用于 web 平台
// 此函数是调用 createCompilerCreator 的返回值
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 生成抽象语法树
  const ast = parse(template.trim(), options)
  if (options.optimize !== false) {
    optimize(ast, options)
  }
  // 将抽象语法树转化成平台代码
  const code = generate(ast, options)
  // 返回包含，ast、code.render、code.staticRenderFns 的对象
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
```