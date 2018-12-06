module.exports = {
  title: 'Vue源码读书笔记',
  description: 'Vue源码读书笔记',
  themeConfig: {
    sidebar: {
      "/core/instance/render-helpers/": [
        "", 
        "bind-object-listeners", 
        "bind-object-props", 
        "check-keycodes", 
        "render-list", 
        "render-slot", 
        "render-static", 
        "resolve-filter", 
        "resolve-slots"
      ],
      "/core/vdom/helpers/": [
        "", 
        "extract-props", 
        "get-first-component-child", 
        "is-async-placeholder", 
        "merge-hook", 
        "normalize-children", 
        "resolve-async-component", 
        "update-listeners"],
      "/core/vdom/modules/": [
        "", 
        "directives", 
        "ref"
      ],
      "/compiler/codegen/": [
        "",
        "events"
      ],
      "/compiler/directives/": [
        "", 
        "bind", 
        "model", 
        "on"
      ],
      "/compiler/parser/": [
        "", 
        "entity-decoder", 
        "filter-parser", 
        "html-parser", 
        "text-parser"
      ],
      "/core/components/": [
        "", 
        "keep-alive"
      ],
      "/core/global-api/": [
        "", 
        "assets", 
        "extend", 
        "mixin", 
        "use"
      ],
      "/core/instance/": [
        "", 
        "events", 
        "init", 
        "inject", 
        "lifecycle", 
        "proxy", 
        "render", 
        "state",
        {
          "title": "render-helpers",
          "children": [
            "render-helpers/bind-object-listeners", 
            "render-helpers/bind-object-props", 
            "render-helpers/check-keycodes", 
            "render-helpers/", 
            "render-helpers/render-list", 
            "render-helpers/render-slot", 
            "render-helpers/render-static", 
            "render-helpers/resolve-filter", 
            "render-helpers/resolve-slots"
          ]
        }
      ],
      "/core/observer/": [
        "", 
        "array", 
        "dep", 
        "scheduler", 
        "traverse", 
        "watcher"
      ],
      "/core/util/": [
        "", 
        "debug", 
        "env", 
        "error", 
        "lang", 
        "next-tick", 
        "options", 
        "perf", 
        "props"
      ],
      "/core/vdom/": [
        "create-component", 
        "create-element", 
        "create-functional-component",
        "patch", 
        "vnode",
        {
          "title": "helpers",
          "children": [
            "helpers/extract-props", 
            "helpers/get-first-component-child", 
            "helpers/", 
            "helpers/is-async-placeholder", 
            "helpers/merge-hook", 
            "helpers/normalize-children", 
            "helpers/resolve-async-component", 
            "helpers/update-listeners"
          ]
        }, 
        {
          "title": "modules",
          "children": [
            "modules/directives", 
            "modules/", 
            "modules/ref"
          ]
        }
      ],
      "/platforms/web/": [
        "entry-compiler", 
        "entry-runtime-with-compiler", 
        "entry-runtime", 
        "entry-server-basic-renderer", 
        "entry-server-renderer", 
        {
          "title": "compiler",
          "children": [
            "compiler/", 
            "compiler/options", 
            "compiler/util"
          ]
        }, 
        {
          "title": "runtime",
          "children": [
            "runtime/class-util", 
            "runtime/", 
            "runtime/node-ops", 
            "runtime/patch", 
            "runtime/transition-util"
          ]
        }, 
        {
          "title": "server",
          "children": [
            "server/compiler", 
            "server/util"
          ]
        }, 
        {
          "title": "util",
          "children": [
            "util/attrs", 
            "util/class", 
            "util/compat", 
            "util/element", 
            "util/", 
            "util/style"
          ]
        }
      ],
      "/platforms/weex/": [
        "entry-compiler", 
        "entry-framework", 
        "entry-runtime-factory", 
        {
          "title": "compiler",
          "children": [
            "compiler/"
          ]
        }, 
        {
          "title": "runtime",
          "children": [
            "runtime/", 
            "runtime/node-ops", 
            "runtime/patch", 
            "runtime/text-node"
          ]
        }, 
        {
          "title": "util",
          "children": [
            "util/element", 
            "util/", 
            "util/parser"
          ]
        }
      ],
      "/server/bundle-renderer/": [
        "create-bundle-renderer", 
        "create-bundle-runner", 
        "source-map-support"
      ],
      "/server/optimizing-compiler/": [
        "", 
        "codegen", 
        "modules", 
        "optimizer", 
        "runtime-helpers"
      ],
      "/server/template-renderer/": [
        "", 
        "create-async-file-mapper", 
        "parse-template", 
        "template-stream"
      ],
      "/server/webpack-plugin/": [
        "client", 
        "server", 
        "util"
      ],
      "/platforms/web/compiler/": [
        "", 
        "options", 
        "util",
        {
          "title": "directives",
          "children": [
            "directives/html", 
            "directives/", 
            "directives/model", 
            "directives/text"
          ]
        }, 
        {
          "title": "modules",
          "children": [
            "modules/class", 
            "modules/", 
            "modules/model", 
            "modules/style"
          ]
        }
      ],
      "/platforms/web/runtime/": [
        "", 
        "class-util", 
        "node-ops", 
        "patch", 
        "transition-util",
        {
          "title": "components",
          "children": [
            "components/", 
            "components/transition-group", 
            "components/transition"
          ]
        }, 
        {
          "title": "directives",
          "children": [
            "directives/", 
            "directives/model", 
            "directives/show"
          ]
        }, 
        {
          "title": "modules",
          "children": [
            "modules/attrs", 
            "modules/class", 
            "modules/dom-props", 
            "modules/events", 
            "modules/", 
            "modules/style", 
            "modules/transition"
          ]
        }
      ],
      "/platforms/web/server/": [
        "compiler", 
        "util",
        {
          "title": "directives",
          "children": [
            "directives/", 
            "directives/model", 
            "directives/show"
          ]
        }, 
        {
          "title": "modules",
          "children": [
            "modules/attrs", 
            "modules/class", 
            "modules/dom-props", 
            "modules/", 
            "modules/style"
          ]
        } 
      ],
      "/platforms/web/util/": [
        "", 
        "attrs", 
        "class", 
        "compat", 
        "element", 
        "style"
      ],
      "/platforms/weex/compiler/": [
        "", 
        {
          "title": "directives",
          "children": [
            "directives/", 
            "directives/model"
          ]
        }, 
        {
          "title": "modules",
          "children": [
            "modules/append", 
            "modules/class", 
            "modules/", 
            "modules/props", 
            "modules/style"
          ]
        }
      ],
      "/platforms/weex/runtime/": [
        "", 
        "node-ops", 
        "patch", 
        "text-node",
        {
          "title": "components",
          "children": [
            "components/", 
            "components/richtext", 
            "components/transition-group", 
            "components/transition"
          ]
        }, 
        {
          "title": "directives",
          "children": [
            "directives/"
          ]
        }, 
        {
          "title": "modules",
          "children": [
            "modules/attrs", 
            "modules/class", 
            "modules/events", 
            "modules/", 
            "modules/style", 
            "modules/transition"
          ]
        }, 
        {
          "title": "recycle-list",
          "children": [
            "recycle-list/render-component-template", 
            "recycle-list/virtual-component"
          ]
        }, 
      ],
      "/platforms/weex/util/": [
        "", 
        "element", 
        "parser"
      ],

      "/life/": [
        "chapter1",
        "chapter2"
      ],
      
      "/note/": [
        "chapter1"
      ]
    },
    nav: [
      // {
      //   "text": "Vue的一生",
      //   "link": "/life/"
      // },

      {
        "text": "笔记整理",
        "link": "/note/"
      },

      {
        "text": "SFC",
        "link": "/sfc/",
        "items": [
          {
            "text": "parser",
            "link": "/sfc/parser"
          }
        ]
      }, 

      {
        "text": "SHARED",
        "link": "/shared/",
        "items": [
          {
            "text": "constants",
            "link": "/shared/constants"
          }, 
          {
            "text": "util",
            "link": "/shared/util"
          }
        ]
      },

      {
        "text": "COMPILER",
        "link": "/compiler/",
        "items": [
          {
            "text": "create-compiler",
            "link": "/compiler/create-compiler"
          }, 
          {
            "text": "error-detector",
            "link": "/compiler/error-detector"
          }, 
          {
            "text": "helpers",
            "link": "/compiler/helpers"
          }, 
          {
            "text": "index",
            "link": "/compiler/index"
          }, 
          {
            "text": "optimizer",
            "link": "/compiler/optimizer"
          }, 
          {
            "text": "to-function",
            "link": "/compiler/to-function"
          },
          {
            "text": "CODEGEN",
            "link": "/compiler/codegen/",
            "items": [
              {
                "text": "events",
                "link": "/compiler/codegen/events"
              }, 
              {
                "text": "index",
                "link": "/compiler/codegen/index"
              }
            ]
          }, 
          {
            "text": "DIRECTIVES",
            "link": "/compiler/directives/",
            "items": [
              {
                "text": "bind",
                "link": "/compiler/directives/bind"
              }, 
              {
                "text": "index",
                "link": "/compiler/directives/index"
              }, 
              {
                "text": "model",
                "link": "/compiler/directives/model"
              }, 
              {
                "text": "on",
                "link": "/compiler/directives/on"
              }
            ]
          }, 
          {
            "text": "PARSER",
            "link": "/compiler/parser/",
            "items": [
              {
                "text": "entity-decoder",
                "link": "/compiler/parser/entity-decoder"
              }, 
              {
                "text": "filter-parser",
                "link": "/compiler/parser/filter-parser"
              }, 
              {
                "text": "html-parser",
                "link": "/compiler/parser/html-parser"
              }, 
              {
                "text": "index",
                "link": "/compiler/parser/index"
              }, 
              {
                "text": "text-parser",
                "link": "/compiler/parser/text-parser"
              }
            ]
          }
        ]
      },

      {
        "text": "PLATFORMS",
        "link": "/platforms/",
        "items": [
          {
            "text": "WEB",
            "link": "/platforms/web/",
            "items": [
              {
                "text": "entry-compiler",
                "link": "/platforms/web/entry-compiler"
              }, 
              {
                "text": "entry-runtime-with-compiler",
                "link": "/platforms/web/entry-runtime-with-compiler"
              }, 
              {
                "text": "entry-runtime",
                "link": "/platforms/web/entry-runtime"
              }, 
              {
                "text": "entry-server-basic-renderer",
                "link": "/platforms/web/entry-server-basic-renderer"
              }, 
              {
                "text": "entry-server-renderer",
                "link": "/platforms/web/entry-server-renderer"
              }, 
              {
                "text": "COMPILER",
                "link": "/platforms/web/compiler/"
              }, 
              {
                "text": "RUNTIME",
                "link": "/platforms/web/runtime/"
              }, 
              {
                "text": "SERVER",
                "link": "/platforms/web/server/"
              }, 
              {
                "text": "UTIL",
                "link": "/platforms/web/util/"
              }
            ]
          }, 
          {
            "text": "WEEX",
            "link": "/platforms/weex/",
            "items": [
              {
                "text": "entry-compiler",
                "link": "/platforms/weex/entry-compiler"
              }, 
              {
                "text": "entry-framework",
                "link": "/platforms/weex/entry-framework"
              }, 
              {
                "text": "entry-runtime-factory",
                "link": "/platforms/weex/entry-runtime-factory"
              }, 
              {
                "text": "COMPILER",
                "link": "/platforms/weex/compiler/"
              }, 
              {
                "text": "RUNTIME",
                "link": "/platforms/weex/runtime/"
              }, 
              {
                "text": "UTIL",
                "link": "/platforms/weex/util/"
              }
            ]
          }
        ]
      }, 

      {
        "text": "SERVER",
        "link": "/server/",
        "items": [
          {
            "text": "create-basic-renderer",
            "link": "/server/create-basic-renderer"
          }, 
          {
            "text": "create-renderer",
            "link": "/server/create-renderer"
          },
          {
            "text": "render-context",
            "link": "/server/render-context"
          }, 
          {
            "text": "render-stream",
            "link": "/server/render-stream"
          }, 
          {
            "text": "render",
            "link": "/server/render"
          },
          {
            "text": "util",
            "link": "/server/util"
          }, 
          {
            "text": "write",
            "link": "/server/write"
          },
          {
            "text": "BUNDLE-RENDERER",
            "link": "/server/bundle-renderer/",
            "items": [
              {
                "text": "create-bundle-renderer",
                "link": "/server/bundle-renderer/create-bundle-renderer"
              }, 
              {
                "text": "create-bundle-runner",
                "link": "/server/bundle-renderer/create-bundle-runner"
              }, 
              {
                "text": "source-map-support",
                "link": "/server/bundle-renderer/source-map-support"
              }
            ]
          }, 
          {
            "text": "OPTIMIZING-COMPILER",
            "link": "/server/optimizing-compiler/",
            "items": [
              {
                "text": "codegen",
                "link": "/server/optimizing-compiler/codegen"
              }, 
              {
                "text": "index",
                "link": "/server/optimizing-compiler/index"
              }, 
              {
                "text": "modules",
                "link": "/server/optimizing-compiler/modules"
              }, 
              {
                "text": "optimizer",
                "link": "/server/optimizing-compiler/optimizer"
              }, 
              {
                "text": "runtime-helpers",
                "link": "/server/optimizing-compiler/runtime-helpers"
              }
            ]
          }, 
          {
            "text": "TEMPLATE-RENDERER",
            "link": "/server/template-renderer/",
            "items": [
              {
                "text": "create-async-file-mapper",
                "link": "/server/template-renderer/create-async-file-mapper"
              }, 
              {
                "text": "index",
                "link": "/server/template-renderer/index"
              }, 
              {
                "text": "parse-template",
                "link": "/server/template-renderer/parse-template"
              }, 
              {
                "text": "template-stream",
                "link": "/server/template-renderer/template-stream"
              }
            ]
          }, 
          {
            "text": "WEBPACK-PLUGIN",
            "link": "/server/webpack-plugin/",
            "items": [
              {
                "text": "client",
                "link": "/server/webpack-plugin/client"
              }, 
              {
                "text": "server",
                "link": "/server/webpack-plugin/server"
              }, 
              {
                "text": "util",
                "link": "/server/webpack-plugin/util"
              }
            ]
          }, 
        ]
      },

      {
        "text": "CORE",
        "link": "/core/",
        "items": [
          {
            "text": "config",
            "link": "/core/config"
          },
          {
            "text": "index",
            "link": "/core/index"
          },
          {
            "text": "COMPONENTS",
            "link": "/core/components/",
            "items": [
              {
                "text": "index",
                "link": "/core/components/index"
              }, 
              {
                "text": "keep-alive",
                "link": "/core/components/keep-alive"
              }
            ]
          }, 
          {
            "text": "GLOBAL-API",
            "link": "/core/global-api/",
            "items": [
              {
                "text": "assets",
                "link": "/core/global-api/assets"
              }, 
              {
                "text": "extend",
                "link": "/core/global-api/extend"
              }, 
              {
                "text": "index",
                "link": "/core/global-api/index"
              }, 
              {
                "text": "mixin",
                "link": "/core/global-api/mixin"
              }, 
              {
                "text": "use",
                "link": "/core/global-api/use"
              }
            ]
          }, 
          {
            "text": "INSTANCE",
            "link": "/core/instance/",
            "items": [
              {
                "text": "events",
                "link": "/core/instance/events"
              }, 
              {
                "text": "index",
                "link": "/core/instance/index"
              }, 
              {
                "text": "init",
                "link": "/core/instance/init"
              }, 
              {
                "text": "inject",
                "link": "/core/instance/inject"
              }, 
              {
                "text": "lifecycle",
                "link": "/core/instance/lifecycle"
              }, 
              {
                "text": "proxy",
                "link": "/core/instance/proxy"
              }, 
              {
                "text": "render",
                "link": "/core/instance/render"
              }, 
              {
                "text": "state",
                "link": "/core/instance/state"
              },
              {
                "text": "RENDER-HELPERS",
                "link": "/core/instance/render-helpers/"
              }
            ]
          }, 
          {
            "text": "OBSERVER",
            "link": "/core/observer/",
            "items": [
              {
                "text": "array",
                "link": "/core/observer/array"
              }, 
              {
                "text": "dep",
                "link": "/core/observer/dep"
              }, 
              {
                "text": "index",
                "link": "/core/observer/index"
              }, 
              {
                "text": "scheduler",
                "link": "/core/observer/scheduler"
              }, 
              {
                "text": "traverse",
                "link": "/core/observer/traverse"
              }, 
              {
                "text": "watcher",
                "link": "/core/observer/watcher"
              }
            ]
          }, 
          {
            "text": "UTIL",
            "link": "/core/util/",
            "items": [
              {
                "text": "debug",
                "link": "/core/util/debug"
              }, 
              {
                "text": "env",
                "link": "/core/util/env"
              }, 
              {
                "text": "error",
                "link": "/core/util/error"
              }, 
              {
                "text": "index",
                "link": "/core/util/index"
              }, 
              {
                "text": "lang",
                "link": "/core/util/lang"
              }, 
              {
                "text": "next-tick",
                "link": "/core/util/next-tick"
              }, 
              {
                "text": "options",
                "link": "/core/util/options"
              }, 
              {
                "text": "perf",
                "link": "/core/util/perf"
              }, 
              {
                "text": "props",
                "link": "/core/util/props"
              }
            ]
          }, 
          {
            "text": "VDOM",
            "link": "/core/vdom/",
            "items": [
              {
                "text": "create-component",
                "link": "/core/vdom/create-component"
              }, 
              {
                "text": "create-element",
                "link": "/core/vdom/create-element"
              }, 
              {
                "text": "create-functional-component",
                "link": "/core/vdom/create-functional-component"
              }, 
              {
                "text": "patch",
                "link": "/core/vdom/patch"
              }, 
              {
                "text": "vnode",
                "link": "/core/vdom/vnode"
              },
              {
                "text": "HELPERS",
                "link": "/core/vdom/helpers/"
              }, 
              {
                "text": "MODULES",
                "link": "/core/vdom/modules/"
              }
            ]
          }
        ]
      } 
    ]
  }
}