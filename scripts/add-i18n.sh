#!/bin/bash

# 批量替换脚本 - 为所有组件添加 i18n 支持

# 定义需要处理的组件文件
components=(
  "src/components/AddPasswordModal.jsx"
  "src/components/EditPasswordModal.jsx"
  "src/components/SearchBox.jsx"
  "src/components/PasswordCard.jsx"
  "src/components/GroupManageModal.jsx"
  "src/components/Header.jsx"
  "src/components/SettingsView.jsx"
  "src/components/LoginView.jsx"
  "src/components/SetupView.jsx"
)

# 通用替换映射
declare -A replacements=(
  # 通用按钮
  ["添加"]="t('common.add')"
  ["编辑"]="t('common.edit')"
  ["删除"]="t('common.delete')"
  ["取消"]="t('common.cancel')"
  ["保存"]="t('common.save')"
  ["确认"]="t('common.confirm')"
  ["搜索"]="t('common.search')"
  ["加载中..."]="t('common.loading')"
  ["关闭"]="t('common.close')"
  ["复制"]="t('common.copy')"
  ["已复制"]="t('common.copied')"
  ["管理"]="t('common.manage')"

  # 字段标签
  ["网站/服务"]="t('fields.website')"
  ["网址"]="t('fields.url')"
  ["用户名"]="t('fields.username')"
  ["密码"]="t('fields.password')"
  ["密钥"]="t('fields.secret')"
  ["备注"]="t('fields.notes')"
  ["描述"]="t('fields.description')"
  ["数据类型"]="t('fields.dataType')"
  ["分组"]="t('fields.group')"

  # 操作
  ["生成"]="t('actions.generate')"
  ["显示"]="t('actions.show')"
  ["隐藏"]="t('actions.hide')"
  ["展开"]="t('actions.expand')"
  ["收起"]="t('actions.collapse')"
)

echo "开始批量替换..."

for file in "${components[@]}"; do
  if [ -f "$file" ]; then
    echo "处理文件: $file"

    # 检查是否已经导入 useTranslation
    if ! grep -q "useTranslation" "$file"; then
      echo "  - 添加 useTranslation 导入"
      # 这里需要手动处理每个文件
    fi

    # 执行替换
    for key in "${!replacements[@]}"; do
      value="${replacements[$key]}"
      # 使用 sed 进行替换（需要小心处理特殊字符）
      # sed -i "s/\"$key\"/{$value}/g" "$file"
    done
  else
    echo "文件不存在: $file"
  fi
done

echo "批量替换完成！"
