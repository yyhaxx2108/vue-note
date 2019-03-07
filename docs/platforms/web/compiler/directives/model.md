# model

```javascript
import config from 'core/config'
import { addHandler, addProp, getBindingAttr } from 'compiler/helpers'
import { genComponentModel, genAssignmentCode } from 'compiler/directives/model'

let warn

// in some cases, the event used has to be determined at runtime
// so we used some reserved tokens during compile.
export const RANGE_TOKEN = '__r'
export const CHECKBOX_RADIO_TOKEN = '__c'

// v-model 指令的方法
export default function model (
  el: ASTElement,
  dir: ASTDirective,
  _warn: Function
): ?boolean {
  // 缓存警告函数
  warn = _warn
  // 缓存指令的值
  const value = dir.value
  // 缓存修饰器到 modifiers
  const modifiers = dir.modifiers
  // 缓存 el.tag 到 tag
  const tag = el.tag
  // 缓存 el.attrsMap.type 到 type
  const type = el.attrsMap.type

  if (process.env.NODE_ENV !== 'production') {
    // input 中 type 为 file，将报警告, 因为 file 为只读的
    if (tag === 'input' && type === 'file') {
      warn(
        `<${el.tag} v-model="${value}" type="file">:\n` +
        `File inputs are read only. Use a v-on:change listener instead.`
      )
    }
  }

  // 判读 el 的类型
  if (el.component) {
    // 如果 el 是组件, 调用 genComponentModel
    genComponentModel(el, value, modifiers)
    // 返回值是 false，因为组件的 v-model 不需要额外的存在在运行时中
    return false
  } else if (tag === 'select') {
    genSelect(el, value, modifiers)
  } else if (tag === 'input' && type === 'checkbox') {
    genCheckboxModel(el, value, modifiers)
  } else if (tag === 'input' && type === 'radio') {
    genRadioModel(el, value, modifiers)
  } else if (tag === 'input' || tag === 'textarea') {
    // 如果调用的节点为文本框,那么调用 genDefaultModel
    genDefaultModel(el, value, modifiers)
  } else if (!config.isReservedTag(tag)) {
    // 如果 el 不是保留的标签，那么当中组件处理, 调用 genComponentModel
    genComponentModel(el, value, modifiers)
    // 返回值是 false，因为组件的 v-model 不需要额外的存在在运行时中
    return false
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `<${el.tag} v-model="${value}">: ` +
      `v-model is not supported on this element type. ` +
      'If you are working with contenteditable, it\'s recommended to ' +
      'wrap a library dedicated for that purpose inside a custom component.'
    )
  }

  // 返回 true，确保运行时返回组件元数据
  return true
}

function genCheckboxModel (
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
) {
  const number = modifiers && modifiers.number
  const valueBinding = getBindingAttr(el, 'value') || 'null'
  const trueValueBinding = getBindingAttr(el, 'true-value') || 'true'
  const falseValueBinding = getBindingAttr(el, 'false-value') || 'false'
  addProp(el, 'checked',
    `Array.isArray(${value})` +
    `?_i(${value},${valueBinding})>-1` + (
      trueValueBinding === 'true'
        ? `:(${value})`
        : `:_q(${value},${trueValueBinding})`
    )
  )
  addHandler(el, 'change',
    `var $$a=${value},` +
        '$$el=$event.target,' +
        `$$c=$$el.checked?(${trueValueBinding}):(${falseValueBinding});` +
    'if(Array.isArray($$a)){' +
      `var $$v=${number ? '_n(' + valueBinding + ')' : valueBinding},` +
          '$$i=_i($$a,$$v);' +
      `if($$el.checked){$$i<0&&(${genAssignmentCode(value, '$$a.concat([$$v])')})}` +
      `else{$$i>-1&&(${genAssignmentCode(value, '$$a.slice(0,$$i).concat($$a.slice($$i+1))')})}` +
    `}else{${genAssignmentCode(value, '$$c')}}`,
    null, true
  )
}

function genRadioModel (
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
) {
  const number = modifiers && modifiers.number
  let valueBinding = getBindingAttr(el, 'value') || 'null'
  valueBinding = number ? `_n(${valueBinding})` : valueBinding
  addProp(el, 'checked', `_q(${value},${valueBinding})`)
  addHandler(el, 'change', genAssignmentCode(value, valueBinding), null, true)
}

function genSelect (
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
) {
  const number = modifiers && modifiers.number
  const selectedVal = `Array.prototype.filter` +
    `.call($event.target.options,function(o){return o.selected})` +
    `.map(function(o){var val = "_value" in o ? o._value : o.value;` +
    `return ${number ? '_n(val)' : 'val'}})`

  const assignment = '$event.target.multiple ? $$selectedVal : $$selectedVal[0]'
  let code = `var $$selectedVal = ${selectedVal};`
  code = `${code} ${genAssignmentCode(value, assignment)}`
  addHandler(el, 'change', code, null, true)
}

// 文本框 v-model 逻辑
function genDefaultModel (
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
): ?boolean {
  // 将 el.attrsMap.type 进行保存
  const type = el.attrsMap.type

  // 如果绑定了 value 将会和 v-model 冲突, 希望绑定 type
  if (process.env.NODE_ENV !== 'production') {
    // 缓存绑定的value值
    const value = el.attrsMap['v-bind:value'] || el.attrsMap[':value']
    // 缓存绑定的typeBinding值
    const typeBinding = el.attrsMap['v-bind:type'] || el.attrsMap[':type']
    // 如果只绑定了 value，未绑定 typeBinding
    if (value && !typeBinding) {
      // 缓存banding字符串
      const binding = el.attrsMap['v-bind:value'] ? 'v-bind:value' : ':value'
      // 报警告
      warn(
        `${binding}="${value}" conflicts with v-model on the same element ` +
        'because the latter already expands to a value binding internally'
      )
    }
  }

  // 保存 modifiers 中的修饰符
  const { lazy, number, trim } = modifiers || {}
  // 在 !lazy && type !== 'range' 的环境下将 needCompositionGuard 设置为 true
  const needCompositionGuard = !lazy && type !== 'range'
  // 在 lazy 为真时，将 event 设置为 change，
  // 在 lazy 为假时，如果 type 为 range，则将 event 设置为 __r，否则就设置为 input
  const event = lazy
    ? 'change'
    : type === 'range'
      ? RANGE_TOKEN
      : 'input'

  // 将值的表达式设置为 '$event.target.value'
  let valueExpression = '$event.target.value'
  // 如果传入了 trim 修饰符
  if (trim) {
    // 将 valueExpression 设置为 `$event.target.value.trim()`
    valueExpression = `$event.target.value.trim()`
  }
  // 如果传入了 number
  if (number) {
    // 将 valueExpression 设置为 `_n(${valueExpression})`
    valueExpression = `_n(${valueExpression})`
  }
  // 生成 code
  let code = genAssignmentCode(value, valueExpression)
  if (needCompositionGuard) {
    code = `if($event.target.composing)return;${code}`
  }
  // 给 el 添加 value 值属性，值为 `(${value})`
  addProp(el, 'value', `(${value})`)
  // 给 el 添加一个事件，事件的回调函数久违code  
  addHandler(el, event, code, null, true)
  if (trim || number) {
    addHandler(el, 'blur', '$forceUpdate()')
  }
}
```