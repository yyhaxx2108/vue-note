# model

```javascript

import {
  addRawAttr,
  getBindingAttr,
  getAndRemoveAttr
} from 'compiler/helpers'

import {
  processFor,
  processElement,
  addIfCondition,
  createASTElement
} from 'compiler/parser/index'

// 主要预处理 使用了 v-model 的 input 标签
function preTransformNode (el: ASTElement, options: CompilerOptions) {
  // 如果 el 是 input
  if (el.tag === 'input') {
    // 将 el.attrsMap 保存到 map 上
    const map = el.attrsMap
    // 如果没有 v-model 指令，直接返回
    if (!map['v-model']) {
      return
    }
    // 定义 typeBinding 变量
    let typeBinding
    // 获取 tag 上的 type 值
    if (map[':type'] || map['v-bind:type']) {
      typeBinding = getBindingAttr(el, 'type')
    }
    // 如果不存在 type 并且不存在 typeBinding 并且存在 v-bind
    if (!map.type && !typeBinding && map['v-bind']) {
      // 将 typeBinding 赋值成为 (${map['v-bind']}).type，v-bind=“{type: inputType}”
      typeBinding = `(${map['v-bind']}).type`
    }
    // 如果 typeBinding 存在, 扩展 input v-if、v-else、v-else-if
    if (typeBinding) {
      // 获取 v-if 指令，并且保存到 ifCondition 上，getAndRemoveAttr 传入第三个参数会将其从 attrsMap 中删除
      const ifCondition = getAndRemoveAttr(el, 'v-if', true)
      // 如果 ifCondition 存在，那么 ifConditionExtra 为 &&(${ifCondition})`，否则其为空
      const ifConditionExtra = ifCondition ? `&&(${ifCondition})` : ``
      // 获取是否有 else 指令
      const hasElse = getAndRemoveAttr(el, 'v-else', true) != null
      // 获取 v-else-if 的值保存到 elseIfCondition 上
      const elseIfCondition = getAndRemoveAttr(el, 'v-else-if', true)
      // 克隆一个元素，并且保存到 branch0 上，创建一个复选框
      const branch0 = cloneASTElement(el)
      // 解析克隆元素上到 for 循环
      processFor(branch0)
      // 将 type 添加到 attrsList 中
      addRawAttr(branch0, 'type', 'checkbox')
      // 处理 ref、slot、is 和 中序处理
      processElement(branch0, options)
      // 将 processed 设置 为 true，防止重复处理
      branch0.processed = true 
      // 添加 if 属性，值为 type === 'checkbox && ifCondition'
      branch0.if = `(${typeBinding})==='checkbox'` + ifConditionExtra
      // 在 branch0 上加上 {exp, block} 对象
      addIfCondition(branch0, {
        exp: branch0.if,
        block: branch0
      })
      // 处理 radio 标签，复制一个标签到 branch1 上
      const branch1 = cloneASTElement(el)
      // 将 v-for 属性删除掉，因为在之前的 processFor 中处理过 v-for
      getAndRemoveAttr(branch1, 'v-for', true)
      // 将 type 添加到 attrsList 中
      addRawAttr(branch1, 'type', 'radio')
      // 处理 ref、slot、is 和 中序处理 
      processElement(branch1, options)
      // 在 branch0 上加上 {exp, block} 对象
      addIfCondition(branch0, {
        exp: `(${typeBinding})==='radio'` + ifConditionExtra,
        block: branch1
      })
      // 处理其他标签
      const branch2 = cloneASTElement(el)
      // 将 v-for 属性删除掉，因为在之前的 processFor 中处理过 v-for
      getAndRemoveAttr(branch2, 'v-for', true)
      // 往 branch2 添加 ':type' 属性
      addRawAttr(branch2, ':type', typeBinding)
      // 处理 ref、slot、is 和 中序处理 
      processElement(branch2, options)
      // 在 branch0 上加上 {exp, block} 对象
      addIfCondition(branch0, {
        exp: ifCondition,
        block: branch2
      })
      // 如果存在 hasElse
      if (hasElse) {
        // 在 branch0 加上 else
        branch0.else = true
      } else if (elseIfCondition) {
        // 如果存在 elseIfCondition 在 branch0 上加上 elseif = elseIfCondition
        branch0.elseif = elseIfCondition
      }
      // 将 branch0 返回
      return branch0
    }
  }
}

// 克隆 el 元素
function cloneASTElement (el) {
  // 调用 createASTElement 创建一个新的元素并且返回，el.attrsList.slice() 可以创建一个新的数组
  return createASTElement(el.tag, el.attrsList.slice(), el.parent)
}

export default {
  preTransformNode
}
```