module.exports = {
  title: 'Vue源码读书笔记',
  description: 'Vue源码读书笔记',
  themeConfig: {
    nav: [
      {
        text: 'Vue的一生',
        link: '/life/'
      },
      { 
        text: 'PLATFORMS', 
        link: '/platforms/',
        items: [
          {
            text: 'WEB',
            link: '/platforms/web/',
            items: [
              {
                text: 'COMPILER',
                link: '/platforms/web/compiler/'
              },
              {
                text: 'RUNTIME',
                link: '/platforms/web/runtime/'
              },
              {
                text: 'SERVER',
                link: '/platforms/web/server/'
              },
              {
                text: 'UTIL',
                link: '/platforms/web/util/'
              },
              {
                text: 'entry-compiler',
                link: '/platforms/web/entry-compiler'
              },
              {
                text: 'entry-runtime-with-compiler',
                link: '/platforms/web/entry-runtime-with-compiler'
              },
              {
                text: 'entry-runtime',
                link: '/platforms/web/entry-runtime'
              },
              {
                text: 'entry-server-basic-render',
                link: '/platforms/web/entry-server-basic-render'
              },
              {
                text: 'entry-server-render',
                link: '/platforms/web/entry-server-render'
              }
            ]
          },
             {
            text: 'WEEX',
            link: '/platforms/weex/',
            items: [
              {
                text: 'compiler',
                link: '/platforms/weex/compiler/',
              },
              {
                text: 'runtime',
                link: '/platforms/weex/runtime/'
              }
            ]
          },
        ],
      },
      { 
        text: 'CORE', 
        link: '/core/'
      },
      { text: 'COMPILER', link: '/compiler/' },
      { text: 'SHARED', 
        link: '/shared/',
        items: [
          {
            text: 'constants',
            link: '/shared/constants'
          },
          {
            text: 'util',
            link: '/shared/util'
          }

        ]
      },
      { 
        text: 'SERVER',  
        link: '/server/',
        items: [
          {
            text: 'BUNDLE-RENDERER',
            link: '/server/bundle-renderer/',
            items: [
              {
                text: 'create-bundle-renderer',
                link: '/server/bundle-renderer/create-bundle-renderer'
              },
              {
                text: 'create-bundle-runner',
                link: '/server/bundle-renderer/create-bundle-runner'
              },
              {
                text: 'source-map-support',
                link: '/server/bundle-renderer/source-map-support'
              },
            ]
          },
          {
            text: 'OPTIMIZING-COMPILER',
            link: '/server/optimizing-compiler/',
            items: [
              {
                text: 'codegen',
                link: '/server/optimizing-compiler/codegen'
              },
              {
                text: 'modules',
                link: '/server/optimizing-compiler/modules'
              },
              {
                text: 'optimizer',
                link: '/server/optimizing-compiler/optimizer'
              },
              {
                text: 'runtime-helpers',
                link: '/server/optimizing-compiler/runtime-helpers'
              },
            ]
          },
          {
            text: 'TEMPLATE-RENDERER',
            link: '/server/template-renderer/',
            items: [
              {
                text: 'create-async-file-mapper',
                link: '/server/template-renderer/create-async-file-mapper'
              },
              {
                text: 'parse-template',
                link: '/server/template-renderer/parse-template'
              },
              {
                text: 'template-stream',
                link: '/server/template-renderer/template-stream'
              },
            ]
          },
          {
            text: 'WEBPACK-PLUGIN',
            link: '/server/webpack-plugin/',
            items: [
              {
                text: 'client',
                link: '/server/webpack-plugin/client'
              },
              {
                text: 'server',
                link: '/server/webpack-plugin/server'
              },
              {
                text: 'util',
                link: '/server/webpack-plugin/util'
              },
            ]
          },
          {
            text: 'create-basic-renderer',
            link: '/server/create-basic-renderer'
          },
          {
            text: 'create-renderder',
            link: '/server/create-renderder'
          },
          {
            text: 'render-context',
            link: '/server/render-context'
          },
          {
            text: 'render-stream',
            link: '/server/render-stream'
          },
          {
            text: 'render',
            link: '/server/render'
          },
          {
            text: 'util',
            link: '/server/util'
          },
          {
            text: 'write',
            link: '/server/write'
          },
        ]
      },
      { text: 'SFC', 
        link: '/sfc/' ,
        items: [
          {
            text: 'parser',
            link: '/sfc/parser'
          }
        ]
      }
    ],
    sidebar: {
      '/platforms/web/compiler/': [
        '',
        'options',
        'util',
        {
          title: 'directives',
          children: [
            'directives/',
            'directives/html',
            'directives/model',
            'directives/text'
          ]
        },
        {
          title: 'modules',
          children: [
            'modules/',
            'modules/class',
            'modules/model',
            'modules/style'
          ]
        }
      ],
      '/platforms/weex/compiler/': [
        '',
        {
          title: 'directives',
          children: [
            'directives/',
            'directives/model'
          ]
        },
        {
          title: 'modules',
          children: [
            'modules/',
            // 'modules/recycle-list',
            'modules/append',
            'modules/class',
            'modules/props',
            'modules/style'
          ]
        }
      ],
    }
  }
}