# index

```javascript
import { baseOptions } from './options'
import { createCompiler } from 'compiler/index'

// 调用 createCompiler，其中传入到参数是baseOptions
// createCompiler 返回一个对象，对象里面有 compile，compileToFunctions等属性
const { compile, compileToFunctions } = createCompiler(baseOptions)

export { compile, compileToFunctions }
```