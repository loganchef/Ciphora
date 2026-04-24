// 批量添加 i18n 翻译的 Node.js 脚本
const fs = require('fs');
const path = require('path');

// 需要处理的组件列表
const components = [
  'src/components/PasswordCard.jsx',
  'src/components/GroupManageModal.jsx',
  'src/components/Header.jsx',
  'src/components/SettingsView.jsx',
  'src/components/LoginView.jsx',
  'src/components/SetupView.jsx',
  'src/components/PasswordInputModal.jsx',
  'src/components/ImportPreviewModal.jsx',
  'src/components/CopyButton.jsx',
  'src/components/TOTPDisplay.jsx',
];

// 翻译映射表
const translations = {
  // 通用
  '添加': "t('common.add')",
  '编辑': "t('common.edit')",
  '删除': "t('common.delete')",
  '取消': "t('common.cancel')",
  '保存': "t('common.save')",
  '确认': "t('common.confirm')",
  '搜索': "t('common.search')",
  '加载中...': "t('common.loading')",
  '关闭': "t('common.close')",
  '复制': "t('common.copy')",
  '已复制': "t('common.copied')",
  '管理': "t('common.manage')",
  '全部': "t('common.all')",
  '未分组': "t('common.ungrouped')",

  // 字段
  '网站/服务': "t('fields.website')",
  '网址': "t('fields.url')",
  '用户名': "t('fields.username')",
  '密码': "t('fields.password')",
  '密钥': "t('fields.secret')",
  '备注': "t('fields.notes')",
  '描述': "t('fields.description')",
  '数据类型': "t('fields.dataType')",
  '分组': "t('fields.group')",

  // 操作
  '生成': "t('actions.generate')",
  '显示': "t('actions.show')",
  '隐藏': "t('actions.hide')",
  '展开': "t('actions.expand')",
  '收起': "t('actions.collapse')",
  '扫描二维码': "t('actions.scanQR')",
  '上传图片': "t('actions.uploadImage')",
};

function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`文件不存在: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 检查是否已经导入 useTranslation
  if (!content.includes('useTranslation')) {
    console.log(`处理文件: ${filePath}`);

    // 在 import 部分添加 useTranslation
    const importMatch = content.match(/import.*from ['"]react['"]/);
    if (importMatch) {
      const importIndex = content.indexOf(importMatch[0]) + importMatch[0].length;
      content = content.slice(0, importIndex) +
                "\nimport { useTranslation } from 'react-i18next';" +
                content.slice(importIndex);
      modified = true;
      console.log(`  ✓ 添加了 useTranslation 导入`);
    }
  }

  // 替换文本
  let replaceCount = 0;
  for (const [chinese, translation] of Object.entries(translations)) {
    // 匹配引号中的中文文本
    const patterns = [
      new RegExp(`"${chinese}"`, 'g'),
      new RegExp(`'${chinese}'`, 'g'),
      new RegExp(`>{chinese}<`, 'g'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, (match) => {
          if (match.startsWith('"')) return `{${translation}}`;
          if (match.startsWith("'")) return `{${translation}}`;
          if (match.startsWith('>')) return `>{${translation}}<`;
          return match;
        });
        replaceCount++;
        modified = true;
      }
    }
  }

  if (replaceCount > 0) {
    console.log(`  ✓ 替换了 ${replaceCount} 处文本`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ 文件已更新\n`);
  } else {
    console.log(`  - 无需修改\n`);
  }
}

console.log('开始批量处理组件...\n');

components.forEach(processFile);

console.log('批量处理完成！');
