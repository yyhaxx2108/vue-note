const fs = require('fs')
const path = require('path')

const dirs = path.join(__dirname, '..')
let rootPath = path.join(__dirname, '../docs')
const extendsArr = ['node_modules', '.git', '.gitignore', 'docs', 'package.json', 'package-lock.json']

//文件遍历方法
function fileDisplay(filePath, rootPath){
  //根据文件路径读取文件，返回文件列表
  fs.readdir(filePath, (err,files) => {
    if(err){
      console.warn(err)
    }else{
      //遍历读取到的文件列表
      files.forEach(filename => {
        if(extendsArr.indexOf(filename) === -1){
          //获取当前文件的绝对路径
          let filedir = path.join(filePath, filename);
          //根据文件路径获取文件信息，返回一个fs.Stats对象
          fs.stat(filedir, (eror, stats) => {
            if(eror){
              console.warn('获取文件stats失败');
            }else{
              const isFile = stats.isFile();//是文件
              const isDir = stats.isDirectory();//是文件夹
              if(isFile){
                // rootPath = path.join(rootPath, '..')
                // console.log(filedir);
  　　　　　　　　// 读取文件内容
                let content = '## ' + filename.substr(0, filename.length - 3);
                let fname = filename.substr(0, filename.length - 3) + '.md'
                console.log(content, fname, path.join(rootPath, fname));
                fs.writeFile(path.join(rootPath, fname), content, function(err) {
                });
              }
              if(isDir){
                // rootPath = path.join(rootPath, filename)
                fs.mkdir(path.join(rootPath, filename))
                fileDisplay(filedir, path.join(rootPath, filename));//递归，如果是文件夹，就继续遍历该文件夹下面的文件
                // rootPath = path.join(rootPath, '..')
              }
            }
          })
        }
      });
    }
  });
}

fileDisplay(dirs, rootPath);

