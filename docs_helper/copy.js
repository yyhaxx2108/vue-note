const fs = require('fs')
const path = require('path')

/**
 * 判断文件是存在
 * @param {String} folderPath 文件路径
 */
function folderExist(folderPath){
  return new Promise((resolve, reject) => {
    fs.exists(folderPath, res => {
      if(res){
        resolve(true)
      }else{
        resolve(false)
      }
    })
  })
}

/**
 * 递归创建目录
 * @param {String} folderPath 
 */
async function createDir(folderPath){
  const parentPath = path.resolve(folderPath, '..')
  const isParentPathExist = await folderExist(parentPath)
  if(isParentPathExist){
    return new Promise((resolve, reject) => {
      fs.mkdir(folderPath, (err, res) => {
        if(err) {
          reject(err)
        }else{
          resolve(true)
        }
      })
    })
  }else{
    await createDir(parentPath)
    await createDir(folderPath)
  }
}

/**
 * 将文件夹中的文件转化为空md文件
 * @param {String} inputPath 文件导入目录
 * @param {String} outputPath 文件导出目录
 * @param {Array} outputPath 不需要处理的目录
 */
async function jsFileToMdFile(inputPath, outputPath, excludeDirs){
  // 转换为绝对路径
  if(inputPath.indexOf('/') !== 0){
    inputPath = path.join(__dirname, inputPath)
  }
  if(outputPath.indexOf('/') !== 0){
    outputPath = path.join(__dirname, outputPath)
  }
  // 判断路径是否存在，并且进行处理
  const inputPathExist = await folderExist(inputPath)
  const outputPathExist = await folderExist(outputPath)
  if(!inputPathExist){
    console.error('文件导入目录不存在')
    return
  }
  if(!outputPathExist){
    try {
      await createDir(outputPath)
    } catch (e) {
      console.log(e)
    }
  }

  // 读取inputPath里面的内容,并且进行筛选
  const inputPathFiles = fs.readdirSync(inputPath)
  const filterPathFiles = inputPathFiles.filter(el => !excludeDirs.includes(el))

  filterPathFiles.forEach(file => {
    const inputfile = path.join(inputPath, file)
    const isFile = fs.statSync(inputfile).isFile()
    const outP = path.join(outputPath, file)
    // 读取到的内容如果为文件夹则递归调用该函数,读取到的内容如果为文件则直接生成.md文件
    if(!isFile){
      if(!fs.existsSync(outP)) {
        fs.mkdirSync(outP)
      }
      jsFileToMdFile(inputfile, outP, [])
    }else{
      let content = '## ' + file.substr(0, file.length - 3)
      let fname = outP.substr(0, outP.length - 3) + '.md'
      fs.writeFileSync(fname, content)
    }
  })
}

const excludeDirs = ['node_modules', '.git', '.gitignore', 'docs', 'docs_helper', 'package.json', 'package-lock.json', '.DS_Store']

jsFileToMdFile('..', './test', excludeDirs)