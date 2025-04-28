const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 获取包含legacyBehavior的文件列表
exec('git grep -l "legacyBehavior" -- "*.tsx" "*.jsx" "*.js" "*.ts"', (error, stdout, stderr) => {
  if (error) {
    console.error(`查找文件时出错: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`查找文件时出错: ${stderr}`);
    return;
  }
  
  const files = stdout.trim().split('\n');
  
  if (files.length === 0) {
    console.log('没有找到包含legacyBehavior的文件');
    return;
  }
  
  console.log(`找到 ${files.length} 个文件包含legacyBehavior属性`);
  
  // 处理每个文件
  files.forEach(filePath => {
    if (!filePath) return;
    
    console.log(`处理文件: ${filePath}`);
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // 移除legacyBehavior
      const updatedContent = content.replace(/\s+legacyBehavior>/g, '>');
      
      if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`成功更新文件: ${filePath}`);
      } else {
        console.log(`文件没有变化: ${filePath}`);
      }
    } catch (err) {
      console.error(`处理文件 ${filePath} 时出错: ${err.message}`);
    }
  });
}); 