# patch

```javascript
import VNode, { cloneVNode } from './vnode'
import config from '../config'
import { SSR_ATTR } from 'shared/constants'
import { registerRef } from './modules/ref'
import { traverse } from '../observer/traverse'
import { activeInstance } from '../instance/lifecycle'
import { isTextInputType } from 'web/util/element'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  makeMap,
  isRegExp,
  isPrimitive
} from '../util/index'

export const emptyNode = new VNode('', {}, [])

const hooks = ['create', 'activate', 'update', 'remove', 'destroy']

// 是否忽略子节点元素
function childrenIgnored (vnode) {
  // 如果存在  vnode.data.domProps.innerHTML 或 vnode.data.domProps.textContent 返回真
  // 否则返回假
  return vnode && vnode.data && vnode.data.domProps && (
    vnode.data.domProps.innerHTML || vnode.data.domProps.textContent
  )
}

// 判断是否为相同节点
function sameVnode (a, b) {
  return (
    // 首先判读 a 和 b 是否有相同的 key
    // 如果是同步组件，判断tag是否相同、是否有相同的注释、判读是否都定义（或未定义）data、是否忽略子元素、判读是否拥有相同的input type
    // 如果是异步组件，判断 isAsyncPlaceholder 是否为真，a.asyncFactory === b.asyncFactory 是否相等，是否定义了 b.asyncFactory.error
    a.key === b.key && (
      (
        a.tag === b.tag &&
        a.isComment === b.isComment &&
        isDef(a.data) === isDef(b.data) &&
        !childrenIgnored(a) && !childrenIgnored(b) &&
        sameInputType(a, b)
      ) || (
        isTrue(a.isAsyncPlaceholder) &&
        a.asyncFactory === b.asyncFactory &&
        isUndef(b.asyncFactory.error)
      )
    )
  )
}

// 判读是否拥有相同的input type
function sameInputType (a, b) {
  // 如果 a.tag 不为 input 直接返回 true
  if (a.tag !== 'input') return true
  // 定义常量 i
  let i
  // 获取 typeA
  const typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type
  // 获取 typeB
  const typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type
  // 如果 typeA === typeB 返回真
  // 如果 isTextInputType(typeA) 并且 isTextInputType(typeB)，返回真
  return typeA === typeB || isTextInputType(typeA) && isTextInputType(typeB)
}

function createKeyToOldIdx (children, beginIdx, endIdx) {
  let i, key
  const map = {}
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key
    if (isDef(key)) map[key] = i
  }
  return map
}

// 创建 patch 函数的高阶函数，该函数会返回一个 patch 函数
export function createPatchFunction (backend) {
  let i, j
  const cbs = {}

  const { modules, nodeOps } = backend

  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = []
    for (j = 0; j < modules.length; ++j) {
      if (isDef(modules[j][hooks[i]])) {
        cbs[hooks[i]].push(modules[j][hooks[i]])
      }
    }
  }

  // 将真实 dom 转化成一个 VNode
  function emptyNodeAt (elm) {
    // 第一个参数为 elm.tagName 转化成小写的形式
    return new VNode(nodeOps.tagName(elm).toLowerCase(), {}, [], undefined, elm)
  }

  function createRmCb (childElm, listeners) {
    function remove () {
      if (--remove.listeners === 0) {
        removeNode(childElm)
      }
    }
    remove.listeners = listeners
    return remove
  }

  function removeNode (el) {
    const parent = nodeOps.parentNode(el)
    // element may have already been removed due to v-html / v-text
    if (isDef(parent)) {
      nodeOps.removeChild(parent, el)
    }
  }

  // 判读是否为未知组件
  function isUnknownElement (vnode, inVPre) {
    return (
      !inVPre &&
      !vnode.ns &&
      !(
        config.ignoredElements.length &&
        config.ignoredElements.some(ignore => {
          return isRegExp(ignore)
            ? ignore.test(vnode.tag)
            : ignore === vnode.tag
        })
      ) &&
      config.isUnknownElement(vnode.tag)
    )
  }

  // 定义 creatingElmInVPre，并且将其初始值设置为 0
  let creatingElmInVPre = 0

  // 将虚拟 dom 挂载到真实 dom 上
  function createElm (
    vnode,
    insertedVnodeQueue,
    parentElm,
    refElm,
    nested,
    ownerArray,
    index
  ) {
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // This vnode was used in a previous render!
      // now it's used as a new node, overwriting its elm would cause
      // potential patch errors down the road when it's used as an insertion
      // reference node. Instead, we clone the node on-demand before creating
      // associated DOM element for it.
      vnode = ownerArray[index] = cloneVNode(vnode)
    }

    // 将 nested 取反赋值给 vnode.isRootInsert，用于过渡进入检查
    vnode.isRootInsert = !nested
    // 尝试创建组件节点
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      // 如果成功，直接返回
      return
    }

    // 将 vnode.data 的引用保存到 data 上面
    const data = vnode.data
    // 将 vnode.children 的引用保存到 children 上面
    const children = vnode.children
    // 将 tag 赋值为 vnode.tag
    const tag = vnode.tag
    // 判断是否定义了 tag
    if (isDef(tag)) {
      // 如果定义了 tag
      if (process.env.NODE_ENV !== 'production') {
        // 如果存在 data.pre
        if (data && data.pre) {
          // creatingElmInVPre 自增 1
          creatingElmInVPre++
        }
        // 检查 tag 是否为未知组件
        if (isUnknownElement(vnode, creatingElmInVPre)) {
          // 如果是未知组件，报错，提示是否正确注册
          warn(
            'Unknown custom element: <' + tag + '> - did you ' +
            'register the component correctly? For recursive components, ' +
            'make sure to provide the "name" option.',
            vnode.context
          )
        }
      }

      // 如果存在 vnode.ns，调用 createElementNS 否则用 createElement来创建真实 dom，并且保存到 vnode.elm 
      vnode.elm = vnode.ns
        ? nodeOps.createElementNS(vnode.ns, tag)
        : nodeOps.createElement(tag, vnode) 
      // 给 css 样式设置作用域
      setScope(vnode)

      if (__WEEX__) {
        // in Weex, the default insertion order is parent-first.
        // List items can be optimized to use children-first insertion
        // with append="tree".
        const appendAsTree = isDef(data) && isTrue(data.appendAsTree)
        if (!appendAsTree) {
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
          }
          insert(parentElm, vnode.elm, refElm)
        }
        createChildren(vnode, children, insertedVnodeQueue)
        if (appendAsTree) {
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
          }
          insert(parentElm, vnode.elm, refElm)
        }
      } else {
        // 创建子节点，这里 children 是 vnode 的 children
        createChildren(vnode, children, insertedVnodeQueue)
        // 判读是否定义了 data 
        if (isDef(data)) {
          // 如果定义了 data，调用 invokeCreateHooks 钩子函数
          //
          invokeCreateHooks(vnode, insertedVnodeQueue)
        }
        // 调用 insert 方法，插入 vnode.elm
        insert(parentElm, vnode.elm, refElm)
      }

      if (process.env.NODE_ENV !== 'production' && data && data.pre) {
        creatingElmInVPre--
      }
    } else if (isTrue(vnode.isComment)) {
      // 如果 vnode 是注释节点，创建一个注释节点，并且保存到 vnode.elm 上
      vnode.elm = nodeOps.createComment(vnode.text)
      // 调用 insert 方法，插入 vnode.elm
      insert(parentElm, vnode.elm, refElm)
    } else {
      // 如果不是上面的清空，那么说明 vnode 是文本节点，直接创建文本节点
      vnode.elm = nodeOps.createTextNode(vnode.text)
      // 调用 insert 方法，插入 vnode.elm
      insert(parentElm, vnode.elm, refElm)
    }
  }
  
  // 创建组件
  function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    // 保存 vnode.data 到节点 i 上
    let i = vnode.data
    // 判断是否定义 vnode.data 如果未定义该函数返回 undefined，说明不是函数组件
    // 如果 vnode 是函数组件，那么在创建组件 VNode 的时候合并钩子函数中就包含 init 钩子函数
    if (isDef(i)) {
      const isReactivated = isDef(vnode.componentInstance) && i.keepAlive
      // 如果定义了 i.hook 并且在i.hook 中 存在了 i.init
      if (isDef(i = i.hook) && isDef(i = i.init)) {
        // 调用 init，vnode 为虚拟dom，init 会生成真实 dom 实例
        i(vnode, false )
      }
      // 在调用 init 钩子函数后，如果 vnode 是子组件，那么他需要被实例化，并且进行挂载。
      // 子组件也会将原来的组件替换掉，正式如此，我们只需要将节点返回就完成了
      if (isDef(vnode.componentInstance)) {
        // 如果存在 vnode.componentInstance，首先调用 initComponent 方法
        // 该方法会将 vnode.componentInstance.$el 赋值给 vnode.elm
        initComponent(vnode, insertedVnodeQueue)
        // 将 vnode.elm 插入 refElm 前
        insert(parentElm, vnode.elm, refElm)
        if (isTrue(isReactivated)) {
          reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm)
        }
        // 返回 true
        return true
      }
    }
  }

  // 初始化 Component
  function initComponent (vnode, insertedVnodeQueue) {
    // pendingInsert 可能在 invokeInsertHook 初始化
    if (isDef(vnode.data.pendingInsert)) {
      // apply 的第二个参数是数组，可以用来拍平数组
      // 将 vnode.data.pendingInsert 的元素拍平到 insertedVnodeQueue
      insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert)
      vnode.data.pendingInsert = null
    }
    // 将 vnode.componentInstance.$el 的值返回给 vnode.elm，该值是一个 Dom
    vnode.elm = vnode.componentInstance.$el
    if (isPatchable(vnode)) {
      invokeCreateHooks(vnode, insertedVnodeQueue)
      setScope(vnode)
    } else {
      // empty component root.
      // skip all element-related modules except for ref (#3455)
      registerRef(vnode)
      // 确保调用插入钩子函数
      insertedVnodeQueue.push(vnode)
    }
  }

  function reactivateComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    let i
    // hack for #4339: a reactivated component with inner transition
    // does not trigger because the inner node's created hooks are not called
    // again. It's not ideal to involve module-specific logic in here but
    // there doesn't seem to be a better way to do it.
    let innerNode = vnode
    while (innerNode.componentInstance) {
      innerNode = innerNode.componentInstance._vnode
      if (isDef(i = innerNode.data) && isDef(i = i.transition)) {
        for (i = 0; i < cbs.activate.length; ++i) {
          cbs.activate[i](emptyNode, innerNode)
        }
        insertedVnodeQueue.push(innerNode)
        break
      }
    }
    // unlike a newly created component,
    // a reactivated keep-alive component doesn't insert itself
    insert(parentElm, vnode.elm, refElm)
  }

  // 插入节点，parent 为父节点，elm 为当前会插入的节点，ref 为参考节点
  function insert (parent, elm, ref) {
    // 如果未定义了 parent，将不会进行插入操作
    if (isDef(parent)) {
      // 判断是否定义了 ref
      if (isDef(ref)) {
        // 如果定义了ref，并且 ref 的 parentNode 就是 parent
        if (nodeOps.parentNode(ref) === parent) {
          // 将 elm 插入 ref 之前
          nodeOps.insertBefore(parent, elm, ref)
        }
      } else {
        // 如果没有定义 ref，直接在 parent 中插入 elm
        nodeOps.appendChild(parent, elm)
      }
    }
  }

  // 创建子节点
  function createChildren (vnode, children, insertedVnodeQueue) {
    // 判读 children 是否为数组类型
    if (Array.isArray(children)) {
      // 如果 children 是数组
      if (process.env.NODE_ENV !== 'production') {
        // 检验 children 的 key 是否唯一
        checkDuplicateKeys(children)
      }
      // 遍历 children
      for (let i = 0; i < children.length; ++i) {
        // 调用 createElm 创建子节点
        // children[i] 为 vnode、insertedVnodeQueue 需要插入的 node、vnode.elm 真实dom、
        // null 为 参考节点、true 为 nested、ownerArray 为 children、index 为 i
        createElm(children[i], insertedVnodeQueue, vnode.elm, null, true, children, i)
      }
    } else if (isPrimitive(vnode.text)) {
      // 如果 children不为数组，且vnode.text为基础类型，调用 nodeOps.appendChild
      // 调用 nodeOps.createTextNode(String(vnode.text) 创建文本节点，然后在 append 到 vnode.elm
      nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)))
    }
  }

  // 判读 vnode 是否可以 patch
  function isPatchable (vnode) {
    // 如果存在 vnode.componentInstance，则往上寻找 _vnode, 直到找到没有 vnode.componentInstance 的 vnode 为止
    while (vnode.componentInstance) {
      vnode = vnode.componentInstance._vnode
    }
    // 如果是否定义过 vnode.tag
    return isDef(vnode.tag)
  }

  function invokeCreateHooks (vnode, insertedVnodeQueue) {
    for (let i = 0; i < cbs.create.length; ++i) {
      cbs.create[i](emptyNode, vnode)
    }
    i = vnode.data.hook // Reuse variable
    if (isDef(i)) {
      if (isDef(i.create)) i.create(emptyNode, vnode)
      if (isDef(i.insert)) insertedVnodeQueue.push(vnode)
    }
  }

  // set scope id attribute for scoped CSS.
  // this is implemented as a special case to avoid the overhead
  // of going through the normal attribute patching process.
  // 为作用域环境下的css 设置一个 id 作用域标签，这是为了避免常规属性修补过程的开销而进行的特殊实现
  function setScope (vnode) {
    let i
    if (isDef(i = vnode.fnScopeId)) {
      nodeOps.setStyleScope(vnode.elm, i)
    } else {
      let ancestor = vnode
      while (ancestor) {
        if (isDef(i = ancestor.context) && isDef(i = i.$options._scopeId)) {
          nodeOps.setStyleScope(vnode.elm, i)
        }
        ancestor = ancestor.parent
      }
    }
    // for slot content they should also get the scopeId from the host instance.
    if (isDef(i = activeInstance) &&
      i !== vnode.context &&
      i !== vnode.fnContext &&
      isDef(i = i.$options._scopeId)
    ) {
      nodeOps.setStyleScope(vnode.elm, i)
    }
  }

  function addVnodes (parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm, false, vnodes, startIdx)
    }
  }

  // 删除节点钩子函数
  function invokeDestroyHook (vnode) {
    let i, j
    const data = vnode.data
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode)
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode)
    }
    if (isDef(i = vnode.children)) {
      for (j = 0; j < vnode.children.length; ++j) {
        invokeDestroyHook(vnode.children[j])
      }
    }
  }

  // 删除需要被替换的节点
  function removeVnodes (parentElm, vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx]
      if (isDef(ch)) {
        if (isDef(ch.tag)) {
          removeAndInvokeRemoveHook(ch)
          invokeDestroyHook(ch)
        } else { // Text node
          removeNode(ch.elm)
        }
      }
    }
  }

  function removeAndInvokeRemoveHook (vnode, rm) {
    if (isDef(rm) || isDef(vnode.data)) {
      let i
      const listeners = cbs.remove.length + 1
      if (isDef(rm)) {
        // we have a recursively passed down rm callback
        // increase the listeners count
        rm.listeners += listeners
      } else {
        // directly removing
        rm = createRmCb(vnode.elm, listeners)
      }
      // recursively invoke hooks on child component root node
      if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
        removeAndInvokeRemoveHook(i, rm)
      }
      for (i = 0; i < cbs.remove.length; ++i) {
        cbs.remove[i](vnode, rm)
      }
      if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
        i(vnode, rm)
      } else {
        rm()
      }
    } else {
      removeNode(vnode.elm)
    }
  }

  // 更新子节点
  function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
    let oldStartIdx = 0
    let newStartIdx = 0
    let oldEndIdx = oldCh.length - 1
    let oldStartVnode = oldCh[0]
    let oldEndVnode = oldCh[oldEndIdx]
    let newEndIdx = newCh.length - 1
    let newStartVnode = newCh[0]
    let newEndVnode = newCh[newEndIdx]
    let oldKeyToIdx, idxInOld, vnodeToMove, refElm

    // removeOnly 是一个特殊标志，只用在 <transition-group>
    // 该标志是为了确保在 leaving transitions 期间，被删除的节点有正确的位置
    const canMove = !removeOnly

    if (process.env.NODE_ENV !== 'production') {
      // 在非生产环境中检查 newCh 是否拥有正确的 key
      checkDuplicateKeys(newCh)
    }

    // 开启循环，循环结束条件是 oldStartIdx > oldEndIdx 或 newStartIdx > newEndIdx
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        // Vnode 已经被移到了左边
        oldStartVnode = oldCh[++oldStartIdx] 
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx]
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        // 如果 oldStartVnode 和 newStartVnode 相同
        // 对两者进行 patchVnode
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        // 将 oldStartVnode 左移
        oldStartVnode = oldCh[++oldStartIdx]
        // 将 newStartVnode 左移
        newStartVnode = newCh[++newStartIdx]
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldEndVnode, newStartVnode)) {
        // Vnode 已到了左边
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx] 
      } else {
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
        idxInOld = isDef(newStartVnode.key)
          ? oldKeyToIdx[newStartVnode.key]
          : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx)
        if (isUndef(idxInOld)) { // New element
          createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
        } else {
          vnodeToMove = oldCh[idxInOld]
          if (sameVnode(vnodeToMove, newStartVnode)) {
            patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
            oldCh[idxInOld] = undefined
            canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
          } else {
            // same key but different element. treat as new element
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
          }
        }
        newStartVnode = newCh[++newStartIdx]
      }
    }
    // 判断 oldStartIdx 是否大于 oldEndIdx
    if (oldStartIdx > oldEndIdx) {
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
    }
  }

  // 校验 children 的 key 是否唯一
  function checkDuplicateKeys (children) {
    // 定义一个 空对象
    const seenKeys = {}
    // 遍历 children
    for (let i = 0; i < children.length; i++) {
      // 将 child 的引用保存到 vnode 上
      const vnode = children[i]
      // 缓存 vnode.key 到 key 上
      const key = vnode.key
      // 如果定义了 key 
      if (isDef(key)) {
        // 判断 seenKeys.key 是否为 true
        if (seenKeys[key]) {
          // 如果 seenKeys[key]为 true，说明 key 重复，报警告 
          warn(
            `Duplicate keys detected: '${key}'. This may cause an update error.`,
            vnode.context
          )
        } else {
          // 如果 seenKeys[key]不为 true，将 seenKeys[key] 设置为true
          seenKeys[key] = true
        }
      }
    }
  }

  function findIdxInOld (node, oldCh, start, end) {
    for (let i = start; i < end; i++) {
      const c = oldCh[i]
      if (isDef(c) && sameVnode(node, c)) return i
    }
  }

  // patch Vnode
  function patchVnode (
    oldVnode,
    vnode,
    insertedVnodeQueue,
    ownerArray,
    index,
    removeOnly
  ) {
    // 如果 oldVnode 和 vnode 相同，直接返回
    if (oldVnode === vnode) {
      return
    }

    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // clone reused vnode
      vnode = ownerArray[index] = cloneVNode(vnode)
    }

    // 将 vnode.elm 和 elm 保存为 oldVnode.elm
    const elm = vnode.elm = oldVnode.elm

    // 异步组件
    if (isTrue(oldVnode.isAsyncPlaceholder)) {
      if (isDef(vnode.asyncFactory.resolved)) {
        hydrate(oldVnode.elm, vnode, insertedVnodeQueue)
      } else {
        vnode.isAsyncPlaceholder = true
      }
      return
    }

    // reuse element for static trees.
    // note we only do this if the vnode is cloned -
    // if the new node is not cloned it means the render functions have been
    // reset by the hot-reload-api and we need to do a proper re-render.
    if (isTrue(vnode.isStatic) &&
      isTrue(oldVnode.isStatic) &&
      vnode.key === oldVnode.key &&
      (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
    ) {
      vnode.componentInstance = oldVnode.componentInstance
      return
    }

    // 定义 i
    let i
    // 将 vnode.data 保存到 data 上
    const data = vnode.data
    // 如果定义了 vnode.data.hook.prepatch
    if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
      // 调用 prepatch(oldVnode, vnode)，此函数主要调用 updateChildComponent 方法
      i(oldVnode, vnode)
    }

    // 将 oldVnode.children 保存到 oldCh 上
    const oldCh = oldVnode.children
    // 将 vnode.children 保存到 ch 上
    const ch = vnode.children
    // 如果定义了 data，并且 vnode 是可以 patch的
    if (isDef(data) && isPatchable(vnode)) {
      // 遍历 cbs.update，并且逐个进行回调，回调时传入参数为 oldVnode 和 vnode
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
      // 如果 data.hook 上存在 update 回调，调用 update 回调，传入参数为 oldVnode 和 vnode
      if (isDef(i = data.hook) && isDef(i = i.update)) i(oldVnode, vnode)
    }
    // 判断是否存在 vnode.text
    if (isUndef(vnode.text)) {
      // 如果不存在 vnode.text
      // 判断是否存在 oldCh 和 ch
      if (isDef(oldCh) && isDef(ch)) {
        // 如果存在 oldCh 和 ch，并且 oldCh !== ch，调用 updateChildren
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
      } else if (isDef(ch)) {
        // 如果不存在 oldCh
        if (process.env.NODE_ENV !== 'production') {
          // 检查 ch 命名是否合法
          checkDuplicateKeys(ch)
        }
        // 如果存在 oldVnode.text，将 elm 设置成空节点
        if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
        // 添加新的节点
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        // 没有 ch，那么直接将旧的节点删除掉
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        // 定义了 oldVnode.text，将 elm 设置为空
        nodeOps.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {
      // 如果存在 vnode.text，但是 oldVnode.text !== vnode.text，
      // 直接将 elm 的 text 改成 vnode.text
      nodeOps.setTextContent(elm, vnode.text)
    }
    if (isDef(data)) {
      // 执行 postpatch 钩子函数
      if (isDef(i = data.hook) && isDef(i = i.postpatch)) i(oldVnode, vnode)
    }
  }

  // 调用插入钩子函数，queue 为子组件 vnode 组成的数组
  function invokeInsertHook (vnode, queue, initial) {
    // 延迟往根组件中插入钩子函数，在元素真实插入值之后调用他
    if (isTrue(initial) && isDef(vnode.parent)) {
      vnode.parent.data.pendingInsert = queue
    } else {
      // 遍历 queue，进行 insert 钩子操作
      for (let i = 0; i < queue.length; ++i) {
        // 进行 insert 钩子操作，该钩子合并了 componentVNodeHooks 中的钩子函数
        queue[i].data.hook.insert(queue[i])
      }
    }
  }

  let hydrationBailed = false
  // list of modules that can skip create hook during hydration because they
  // are already rendered on the client or has no need for initialization
  // Note: style is excluded because it relies on initial clone for future
  // deep updates (#7063).
  const isRenderedModule = makeMap('attrs,class,staticClass,staticStyle,key')

  // Note: this is a browser-only function so we can assume elms are DOM nodes.
  function hydrate (elm, vnode, insertedVnodeQueue, inVPre) {
    let i
    const { tag, data, children } = vnode
    inVPre = inVPre || (data && data.pre)
    vnode.elm = elm

    if (isTrue(vnode.isComment) && isDef(vnode.asyncFactory)) {
      vnode.isAsyncPlaceholder = true
      return true
    }
    // assert node match
    if (process.env.NODE_ENV !== 'production') {
      if (!assertNodeMatch(elm, vnode, inVPre)) {
        return false
      }
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) i(vnode, true /* hydrating */)
      if (isDef(i = vnode.componentInstance)) {
        // child component. it should have hydrated its own tree.
        initComponent(vnode, insertedVnodeQueue)
        return true
      }
    }
    if (isDef(tag)) {
      if (isDef(children)) {
        // empty element, allow client to pick up and populate children
        if (!elm.hasChildNodes()) {
          createChildren(vnode, children, insertedVnodeQueue)
        } else {
          // v-html and domProps: innerHTML
          if (isDef(i = data) && isDef(i = i.domProps) && isDef(i = i.innerHTML)) {
            if (i !== elm.innerHTML) {
              /* istanbul ignore if */
              if (process.env.NODE_ENV !== 'production' &&
                typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true
                console.warn('Parent: ', elm)
                console.warn('server innerHTML: ', i)
                console.warn('client innerHTML: ', elm.innerHTML)
              }
              return false
            }
          } else {
            // iterate and compare children lists
            let childrenMatch = true
            let childNode = elm.firstChild
            for (let i = 0; i < children.length; i++) {
              if (!childNode || !hydrate(childNode, children[i], insertedVnodeQueue, inVPre)) {
                childrenMatch = false
                break
              }
              childNode = childNode.nextSibling
            }
            // if childNode is not null, it means the actual childNodes list is
            // longer than the virtual children list.
            if (!childrenMatch || childNode) {
              /* istanbul ignore if */
              if (process.env.NODE_ENV !== 'production' &&
                typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true
                console.warn('Parent: ', elm)
                console.warn('Mismatching childNodes vs. VNodes: ', elm.childNodes, children)
              }
              return false
            }
          }
        }
      }
      if (isDef(data)) {
        let fullInvoke = false
        for (const key in data) {
          if (!isRenderedModule(key)) {
            fullInvoke = true
            invokeCreateHooks(vnode, insertedVnodeQueue)
            break
          }
        }
        if (!fullInvoke && data['class']) {
          // ensure collecting deps for deep class bindings for future updates
          traverse(data['class'])
        }
      }
    } else if (elm.data !== vnode.text) {
      elm.data = vnode.text
    }
    return true
  }

  function assertNodeMatch (node, vnode, inVPre) {
    if (isDef(vnode.tag)) {
      return vnode.tag.indexOf('vue-component') === 0 || (
        !isUnknownElement(vnode, inVPre) &&
        vnode.tag.toLowerCase() === (node.tagName && node.tagName.toLowerCase())
      )
    } else {
      return node.nodeType === (vnode.isComment ? 8 : 3)
    }
  }

  // 返回 patch 函数
  return function patch (oldVnode, vnode, hydrating, removeOnly) {
    // 如果不存在 vnode
    if (isUndef(vnode)) {
      // 同时存在 oldVnode，调用 invokeDestroyHook 钩子函数，对节点进行删除
      if (isDef(oldVnode)) invokeDestroyHook(oldVnode)
      // 返回
      return
    }

    // 定义一个 isInitialPatch，并且将其初始值设置为false，该属性会在 invokeInsertHook 中传入
    let isInitialPatch = false
    // 定义一个 insertedVnodeQueue 空数组
    const insertedVnodeQueue = []

    // 如果未定义 oldVnode
    if (isUndef(oldVnode)) {
      // 空装载（可能是组件），创建新的根元素
      // 将 isInitialPatch 设置成 true
      isInitialPatch = true
      // 以 vnode 创建真实 dom
      createElm(vnode, insertedVnodeQueue)
    } else {
      // 将 isDef(oldVnode.nodeType) 的值赋值给 isRealElement
      // isRealElement 判断 oldVnode 是否为真实 dom，真实 dom 与 虚拟 dom 的区别就在于是否有 nodeType
      const isRealElement = isDef(oldVnode.nodeType)
      // 如果 oldVnode 是虚拟 dom，并且 oldVnode 与 vnode 结构相同
      if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // 在存在根节点的情况下进行 patch
        patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
      } else {
        // 如果是真实 dom
        if (isRealElement) {
          // 挂载一个真实的节点，并且判断是否是服务端渲染和我们是否剋一正确的渲染
          // 如果 nodeType 为 1，并且在服务端渲染条件下。
          if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
            // 删除 SSR_ATTR 标签
            oldVnode.removeAttribute(SSR_ATTR)
            // 将 hydrating 设置为 true
            hydrating = true
          }
          // 服务端渲染的逻辑
          if (isTrue(hydrating)) {
            if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
              invokeInsertHook(vnode, insertedVnodeQueue, true)
              return oldVnode
            } else if (process.env.NODE_ENV !== 'production') {
              warn(
                'The client-side rendered virtual DOM tree is not matching ' +
                'server-rendered content. This is likely caused by incorrect ' +
                'HTML markup, for example nesting block-level elements inside ' +
                '<p>, or missing <tbody>. Bailing hydration and performing ' +
                'full client-side render.'
              )
            }
          }
          // 如果不是服务端渲染，或者服务端渲染出错，创建一个空节点(虚拟 vnode )替换 oldVnode
          // oldVnode 上 elm 是传入的 oldVnode
          oldVnode = emptyNodeAt(oldVnode)
        }

        // 替换存在的节点
        // 将 oldVnode.elm 保存到 oldElm 上
        const oldElm = oldVnode.elm
        // 将 oldElm 父节点对象保存到 parentElm 上
        const parentElm = nodeOps.parentNode(oldElm)

        // 创建一个新的节点，将 VNode 挂载到真实的 dom 上
        createElm(
          // vnode 为传入的 vnode
          vnode,
          // insertedVnodeQueue 为需要插入的 node 队列
          insertedVnodeQueue,
          // 处理极为罕见的边缘清空，如果 oldElement 处于离开状态不要插入，
          // 这种情况只会发生在 transition、keep-alive、HOCs同时存在时(#4590)
          // 如果 oldElm._leaveCb 为 true，则传入 null，否则传入父亲节点
          oldElm._leaveCb ? null : parentElm,
          // 下一个节点
          nodeOps.nextSibling(oldElm)
        )

        // 递归更新父元素节点(占位符节点)
        if (isDef(vnode.parent)) {
          // 将 vnode.parent 保存到 ancestor 上
          let ancestor = vnode.parent
          // 判断 vnode 是否 patchable，可挂载
          const patchable = isPatchable(vnode)
          // 当存在 ancestor
          while (ancestor) {
            // 遍历 cbs.destroy 并且调用
            for (let i = 0; i < cbs.destroy.length; ++i) {
              cbs.destroy[i](ancestor)
            }
            // 将 vnode.elm 赋值给 ancestor.elm，更新 dom 的引用
            ancestor.elm = vnode.elm
            // 如果是可被挂载的
            if (patchable) {
              // 遍历 cbs.create
              for (let i = 0; i < cbs.create.length; ++i) {
                // 执行 cbs.create
                cbs.create[i](emptyNode, ancestor)
              }
              // #6513
              // invoke insert hooks that may have been merged by create hooks.
              // e.g. for directives that uses the "inserted" hook.
              const insert = ancestor.data.hook.insert
              if (insert.merged) {
                // start at index 1 to avoid re-invoking component mounted hook
                for (let i = 1; i < insert.fns.length; i++) {
                  insert.fns[i]()
                }
              }
            } else {
              registerRef(ancestor)
            }
            // 如果当前节点存在 parent，再次递归
            ancestor = ancestor.parent
          }
        }

        // 删除旧的节点
        // 如果定义了 parentElm 节点
        if (isDef(parentElm)) {
          // 调用 removeVnodes 删除旧的节点
          removeVnodes(parentElm, [oldVnode], 0, 0)
        } else if (isDef(oldVnode.tag)) {
          // 调用一些钩子函数
          invokeDestroyHook(oldVnode)
        }
      }
    }

    // 调用 invokeInsertHook 钩子函数, 该方法会执行 mounted 钩子
    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    // 将新生成的节点返回
    return vnode.elm
  }
}
```