# optimizer

```javascript
import { makeMap, isBuiltInTag, cached, no } from 'shared/util'

let isStaticKey
let isPlatformReservedTag

const genStaticKeysCached = cached(genStaticKeys)

// optimize 的目标是遍历生成的模板ast树并检测纯静态的子树，即不需要更改的DOM部分。
// 如果我们解析好这些子树，我们可以：
// 1.将它们提升为常量，这样我们就不再需要在每次重新渲染时为它们创建新的节点；
// 2.可以完全跳过他们在 patch 中
// root 为根组件，为可选项，options 为编译配置
export function optimize (root: ?ASTElement, options: CompilerOptions) {
  // 如果不存在 root 直接返回
  if (!root) return
  // 缓存 genStaticKeys 方法调用的值，该值回返回一个匿名函数，该匿名函数闭包保存着 map
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
  // isReservedTag 检查是否为原生的html标签或svg标签
  isPlatformReservedTag = options.isReservedTag || no
  // 标记所有非静态节点，将 root 当作参数传入
  markStatic(root)
  // 标记静态根节点
  markStaticRoots(root, false)
}

// 将 keys 拼接到 type,tag,attrsList,attrsMap,plain,parent,children,attrs形成字符串
function genStaticKeys (keys: string): Function {
  // 然后返回 makeMap 函数调用后的值
  return makeMap(
    'type,tag,attrsList,attrsMap,plain,parent,children,attrs' +
    (keys ? ',' + keys : '')
  )
}

// 标记所有非静态节点
function markStatic (node: ASTNode) {
  // 判断 node 是否为静态节点，将其结果保存到 node.static 上
  node.static = isStatic(node)
  // 如果 node.type 为 1
  if (node.type === 1) {
    // 不要将组件插槽内容设为静态：1、components 无法改变插槽节点 2、静态插槽内容无法进行热重新加载
    if (
      !isPlatformReservedTag(node.tag) &&
      node.tag !== 'slot' &&
      node.attrsMap['inline-template'] == null
    ) {
      // 如果 node.tag 为 true，且不存在 inline-template， 直接返回
      return
    }
    // 遍历子节点
    for (let i = 0, l = node.children.length; i < l; i++) {
      // 将 node.children[i] 保存到 child 上
      const child = node.children[i]
      // 递归调用 markStatic 方法
      markStatic(child)
      // 如果子元素中有非静态元素，则将当前元素也设置为非静态元素
      if (!child.static) {
        node.static = false
      }
    }
    // 如果存在 node.ifConditions
    if (node.ifConditions) {
      // 遍历 node.ifConditions
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        // 用 block 保存 node.ifConditions[i].block 的引用
        const block = node.ifConditions[i].block
        // 调用 markStatic 方法
        markStatic(block)
        // 如果 block 中存在非静态元素，则将当前元素设置为非静态元素
        if (!block.static) {
          node.static = false
        }
      }
    }
  }
}

// 标记根节点是否为静态节点
function markStaticRoots (node: ASTNode, isInFor: boolean) {
  // 如果当前节点 type 为 1
  if (node.type === 1) {
    // 如果 node 为静态节点，或者 node 为一次性节点
    if (node.static || node.once) {
      // 将 node.staticInFor 设置为 isInFor
      node.staticInFor = isInFor
    }
    // 有资格成为静态节点的节点，他应该有不是纯文本的节点。否则将其设置为静态节点的花费大于好处，
    // 最好是让其重新渲染
    if (node.static && node.children.length && !(
      node.children.length === 1 &&
      node.children[0].type === 3
    )) {
      // 如果: 1.当前节点为静态节点、2.存在子节点、3.只有一个子节点时，该节点不是纯文本
      // 将 node.staticRoot 设置为 true
      node.staticRoot = true
      // 返回
      return
    } else {
      // 否值将 node.staticRoot 设置为 false
      node.staticRoot = false
    }
    // 如果存在子节点
    if (node.children) {
      // 遍历自节点
      for (let i = 0, l = node.children.length; i < l; i++) {
        // 递归调用 markStaticRoots，传入的第二个参数为 isInFor 或者 !!node.for
        markStaticRoots(node.children[i], isInFor || !!node.for)
      }
    }
    // 如果存在 ifConditions
    if (node.ifConditions) {
      // 循环 ifConditions
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        // 递归调用 markStaticRoots，传入的第二个参数为 isInFor
        markStaticRoots(node.ifConditions[i].block, isInFor)
      }
    }
  }
}

// 判断根节点是否为静态节点
function isStatic (node: ASTNode): boolean {
  // 如果 node.type 为 2，说明该 node 是个表达式，返回 false，表示不是
  if (node.type === 2) { 
    return false
  }
  // 如果 node.type 为 3，说明该节点为文本，返回 true，表示是
  if (node.type === 3) {
    return true
  }
  // 是静态节点的情况
  // 1.node.pre 为 true
  // 2.hasBindings 和 if 和 for 为 false，并且不是 slot、component标签, 并且是 html、svg 保留标签，
  // 即不是自定义标签，并且不直接在 TemplateFor 中, 并且 node 对象的键值都在 
  // ["type", "tag", "attrsList", "attrsMap", "parent", "children", "plain", "attrs", "staticClass"]中
  return !!(node.pre || (
    !node.hasBindings && // no dynamic bindings
    !node.if && !node.for && // not v-if or v-for or v-else
    !isBuiltInTag(node.tag) && // not a built-in
    isPlatformReservedTag(node.tag) && // not a component
    !isDirectChildOfTemplateFor(node) &&
    Object.keys(node).every(isStaticKey)
  ))
}
// 判断该标签是否直接在 TemplateFor 中
function isDirectChildOfTemplateFor (node: ASTElement): boolean {
  // 如果 node 不存在 parent，直接返回false
  while (node.parent) {
    // 缓存 node.parent
    node = node.parent
    // 如果父级点不是 template 直接返回false
    if (node.tag !== 'template') {
      return false
    }
    // 如果父级节点是 template，且存在 for，那么返回 true
    if (node.for) {
      return true
    }
  }
  return false
}

```