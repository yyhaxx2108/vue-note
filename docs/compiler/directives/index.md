# index

```javascript
import on from './on'
import bind from './bind'
import { noop } from 'shared/util'

// 将 on、bind、cloak 暴露出去
export default {
  on,
  bind,
  cloak: noop
}
```