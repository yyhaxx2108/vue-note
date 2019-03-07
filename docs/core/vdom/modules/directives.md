# directives
```javascript
import { emptyNode } from 'core/vdom/patch'
import { resolveAsset, handleError } from 'core/util/index'
import { mergeVNodeHook } from 'core/vdom/helpers/index'

export default {
  create: updateDirectives,
  update: updateDirectives,
  destroy: function unbindDirectives (vnode: VNodeWithData) {
    updateDirectives(vnode, emptyNode)
  }
}

// update 指令的钩子函数
function updateDirectives (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  // 如果 oldVnode.data.directives 或 vnode.data.directives 为真
  if (oldVnode.data.directives || vnode.data.directives) {
    // 调用 _update 函数，其中传入的参数为 oldVnode, vnode
    _update(oldVnode, vnode)
  }
}

// 定义 _update 钩子函数
function _update (oldVnode, vnode) {
  // 如果 oldVnode 是空节点, 说明是创建钩子
  const isCreate = oldVnode === emptyNode
  // 如果 isDestroy 是空节点, 说明是销毁钩子
  const isDestroy = vnode === emptyNode

  // 格式化旧的指令
  const oldDirs = normalizeDirectives(oldVnode.data.directives, oldVnode.context)
  // 格式化新的指令
  const newDirs = normalizeDirectives(vnode.data.directives, vnode.context)

  // 定义 dirsWithInsert 空数组
  const dirsWithInsert = []
  // 定义 dirsWithPostpatch 空数组
  const dirsWithPostpatch = []

  // 定义一些变量
  let key, oldDir, dir
  // 遍历 newDirs
  for (key in newDirs) {
    // 将旧指令保存到 oldDir
    oldDir = oldDirs[key]
    // 将新指令保存到 dir
    dir = newDirs[key]
    // 判断旧指令是否存在
    if (!oldDir) {
      // 对新的指令执行 bind 钩子函数
      callHook(dir, 'bind', vnode, oldVnode)
      // 如果定义了 dir.def.inserted
      if (dir.def && dir.def.inserted) {
        // 将 dir push 到 dirsWithInsert 中
        dirsWithInsert.push(dir)
      }
    } else {
      // 如果存在旧的指令，直接将其更新
      // 将 oldDir.value 赋值给 dir.oldValue
      dir.oldValue = oldDir.value
      // 调用 update 钩子方法
      callHook(dir, 'update', vnode, oldVnode)
      // 如果定义了 dir.def.componentUpdated
      if (dir.def && dir.def.componentUpdated) {
        // 将 dir push 到 dirsWithPostpatch 中
        dirsWithPostpatch.push(dir)
      }
    }
  }

  // 如果 dirsWithInsert 有元素
  if (dirsWithInsert.length) {
    // 定义 callInsert 方法
    const callInsert = () => {
      // 遍历 dirsWithInsert 数组
      for (let i = 0; i < dirsWithInsert.length; i++) {
        // 调用 inserted 钩子函数
        callHook(dirsWithInsert[i], 'inserted', vnode, oldVnode)
      }
    }
    // 如果 isCreate 为 true
    if (isCreate) {
      // 调用 mergeVNodeHook 方法
      mergeVNodeHook(vnode, 'insert', callInsert)
    } else {
      // 直接调用 callInsert 方法
      callInsert()
    }
  }

  if (dirsWithPostpatch.length) {
    mergeVNodeHook(vnode, 'postpatch', () => {
      for (let i = 0; i < dirsWithPostpatch.length; i++) {
        callHook(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode)
      }
    })
  }

  if (!isCreate) {
    for (key in oldDirs) {
      if (!newDirs[key]) {
        // no longer present, unbind
        callHook(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy)
      }
    }
  }
}

const emptyModifiers = Object.create(null)

// 格式化指令函数
function normalizeDirectives (
  dirs: ?Array<VNodeDirective>,
  vm: Component
): { [key: string]: VNodeDirective } {
  // 创建一个空对象
  const res = Object.create(null)
  // 如果不存在 dirs
  if (!dirs) {
    // 直接返回该空对象
    return res
  }
  // 定义 i, dir
  let i, dir
  // 对 dirs 进行遍历
  for (i = 0; i < dirs.length; i++) {
    // 将 dirs[i] 保存到 dir 上
    dir = dirs[i]
    // 如果没有定义 dir.modifiers
    if (!dir.modifiers) {
      // 将 emptyModifiers 保存到 dir.modifiers 上
      dir.modifiers = emptyModifiers
    }
    // 将 dir 保存到 res 对象中
    res[getRawDirName(dir)] = dir
    // 将 dir.def 保存为 $options 上面的 directives
    dir.def = resolveAsset(vm.$options, 'directives', dir.name, true)
  }
  // 返回 res
  return res
}

// 获取指令的名称
function getRawDirName (dir: VNodeDirective): string {
  // 如果存在 dir.rawName 直接将其返回，否则返回 ${dir.name}.${Object.keys(dir.modifiers || {}).join('.')}
  return dir.rawName || `${dir.name}.${Object.keys(dir.modifiers || {}).join('.')}`
}

// 对指令执行相应的钩子函数
function callHook (dir, hook, vnode, oldVnode, isDestroy) {
  // 获取到指令定义的 hook 钩子函数 
  const fn = dir.def && dir.def[hook]
  // 如果存在 fn
  if (fn) {
    try {
      // 尝试调用对应的钩子函数
      fn(vnode.elm, dir, vnode, oldVnode, isDestroy)
    } catch (e) {
      // 如果报错，对错误进行处理
      handleError(e, vnode.context, `directive ${dir.name} ${hook} hook`)
    }
  }
}
```