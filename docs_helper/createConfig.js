const fs = require('fs')
const path = require('path')

function extractCatalog(inputPath){
  let nav = []
  let sidebar = {}
  const files = fs.readdirSync(inputPath)
  for(let i = 0; i < files.length; i++){
    const inputfile = path.join(inputPath, files[i])
    const isFile = fs.statSync(inputfile).isFile()
    if(!isFile){
      let fisrtObj = {}
      fisrtObj.text = files[i].toUpperCase()
      fisrtObj.link = `/${files[i]}/`
      fisrtObj.items = []
      const files1 = fs.readdirSync(inputfile)
      // 处理第二层目录
      for(let ii = 0; ii < files1.length; ii++){
        const inputfile1 = path.join(inputfile, files1[ii])
        const isFile1 = fs.statSync(inputfile1).isFile()
        let secondObj = {}
        if(isFile1){
          secondObj.text = files1[ii].substr(0, files1[ii].length - 3)
          secondObj.link = `/${files[i]}/${files1[ii].substr(0, files1[ii].length - 3)}`
        }else{
          secondObj.text = files1[ii].toUpperCase()
          secondObj.link = `/${files[i]}/${files1[ii]}/`
          secondObj.items = []
          // 处理第三层
          const files2 = fs.readdirSync(inputfile1)
          for(let iii = 0; iii < files2.length; iii++){
            const inputfile2 = path.join(inputfile1, files2[iii])
            const isFile2 = fs.statSync(inputfile2).isFile()
            let thirdObj = {}
            if(isFile2){
              thirdObj.text = files2[iii].substr(0, files2[iii].length - 3)
              thirdObj.link = `/${files[i]}/${files1[ii]}/${files2[iii].substr(0, files2[iii].length - 3)}`
            }else{
              thirdObj.text = files2[iii].toUpperCase()
              thirdObj.link = `/${files[i]}/${files1[ii]}/${files2[iii]}/`
              // 处理第四层
              const files3 = fs.readdirSync(inputfile2)
              sidebar[thirdObj.link] = []
              for(let iiii = 0; iiii < files3.length; iiii++){
                const inputfile3 = path.join(inputfile2, files3[iiii])
                const isFile3 = fs.statSync(inputfile3).isFile()
                if(isFile3){
                  if(files3[iiii] === 'index.md'){
                    sidebar[thirdObj.link].push('')
                  }else{
                    sidebar[thirdObj.link].push(files3[iiii].substr(0, files3[iiii].length - 3))
                  }
                }else{
                  let forthObj = {}
                  forthObj.title = files3[iiii]
                  forthObj.children = []
                  // 处理第五层
                  const files4 = fs.readdirSync(inputfile3)
                  for(let i5 = 0; i5 < files4.length; i5++){
                    const inputfile4 = path.join(inputfile3, files4[i5])
                    const isFile4 = fs.statSync(inputfile4).isFile()
                    if(isFile4){
                      if(files4[i5] === 'index.md'){
                        forthObj.children.push(`${files3[iiii]}/`)
                      }else{
                        forthObj.children.push(`${files3[iiii]}/${files4[i5].substr(0, files4[i5].length - 3)}`)
                      }
                    }
                  }
                  sidebar[thirdObj.link].push(forthObj)
                }
              }
            }
            secondObj.items.push(thirdObj)
          }
        }
        fisrtObj.items.push(secondObj)
      }
      nav.push(fisrtObj)
    }
  }
  console.log(JSON.stringify(nav))
  console.log(JSON.stringify(sidebar))
}

extractCatalog('./test')