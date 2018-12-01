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
      { text: 'SHARED', link: '/shared/' },
      { text: 'SERVER', link: '/server/' },
      { text: 'SFC', link: '/sfc/' }
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
      ]
    }
  }
}