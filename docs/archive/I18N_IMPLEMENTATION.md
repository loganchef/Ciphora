# 多语言支持实施总结

## ✅ 已完成的工作

### 1. 基础设施
- ✅ 安装了 i18next、react-i18next、i18next-browser-languagedetector
- ✅ 创建了语言文件：
  - `src/locales/zh-CN.json` (简体中文)
  - `src/locales/en.json` (英文)
- ✅ 创建了 i18n 配置 `src/i18n.js`
- ✅ 在 `src/index.jsx` 中导入 i18n
- ✅ 创建了语言切换组件 `src/components/LanguageSwitcher.jsx`

### 2. 已更新的组件
- ✅ **GroupTabs.jsx** - 完全翻译
- ✅ **MainVault.jsx** - 完全翻译
- ✅ **AddPasswordModal.jsx** - 部分翻译（标题、数据类型）
- ✅ **EditPasswordModal.jsx** - 已导入 useTranslation

## 🔄 待完成的组件

以下组件需要添加翻译支持：

### 高优先级（用户常用）
- [ ] AddPasswordModal.jsx - 完成剩余字段
- [ ] EditPasswordModal.jsx - 添加所有翻译
- [ ] PasswordCard.jsx - 卡片显示文本
- [ ] SearchBox.jsx - 搜索占位符
- [ ] GroupManageModal.jsx - 分组管理界面

### 中优先级
- [ ] Header.jsx - 顶部导航
- [ ] SettingsView.jsx - 设置页面
- [ ] LoginView.jsx - 登录界面
- [ ] SetupView.jsx - 初始设置

### 低优先级
- [ ] Dashboard.jsx
- [ ] PasswordInputModal.jsx
- [ ] ImportPreviewModal.jsx
- [ ] CimbarTransfer.jsx
- [ ] MobileBottomNav.jsx

## 📝 快速添加翻译的步骤

对于任何组件，按以下步骤操作：

### 1. 导入 useTranslation
```jsx
import { useTranslation } from 'react-i18next';
```

### 2. 在组件中使用
```jsx
const MyComponent = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('vault.title')}</h1>
      <button>{t('common.add')}</button>
    </div>
  );
};
```

### 3. 常用翻译键速查

#### 通用按钮
```jsx
{t('common.add')}        // 添加
{t('common.edit')}       // 编辑
{t('common.delete')}     // 删除
{t('common.cancel')}     // 取消
{t('common.save')}       // 保存
{t('common.loading')}    // 加载中...
{t('common.close')}      // 关闭
{t('common.copy')}       // 复制
{t('common.copied')}     // 已复制
```

#### 字段标签
```jsx
{t('fields.website')}    // 网站/服务
{t('fields.username')}   // 用户名
{t('fields.password')}   // 密码
{t('fields.notes')}      // 备注
{t('fields.dataType')}   // 数据类型
{t('fields.group')}      // 分组
```

#### 数据类型
```jsx
{t('dataTypes.password')}  // 密码
{t('dataTypes.mfa')}       // MFA密钥
{t('dataTypes.base64')}    // Base64数据
{t('dataTypes.string')}    // 字符串
{t('dataTypes.json')}      // JSON数据
```

#### 占位符（带参数）
```jsx
{t(`placeholders.website.${formData.type}`)}
{t(`placeholders.username.${formData.type}`)}
```

#### 带变量的翻译
```jsx
{t('vault.deleteConfirm', { website: password.website })}
{t('groups.selectCount', { count: selectedGroupIds.length })}
```

## 🌐 添加语言切换器

在 Header 或 Settings 组件中添加：

```jsx
import LanguageSwitcher from './LanguageSwitcher';

// 在 JSX 中
<LanguageSwitcher />
```

## 🔧 添加新的翻译键

1. 在 `src/locales/zh-CN.json` 添加中文
2. 在 `src/locales/en.json` 添加英文
3. 在组件中使用 `t('your.key')`

## 📋 翻译键结构

```
common.*          - 通用文本
dataTypes.*       - 数据类型
groups.*          - 分组相关
vault.*           - 密码库
fields.*          - 表单字段
placeholders.*    - 占位符
actions.*         - 操作按钮
settings.*        - 设置
```

## 🚀 下一步建议

1. **立即可用**：应用已支持中英文切换，核心功能已翻译
2. **逐步完善**：按优先级逐个更新剩余组件
3. **测试验证**：切换语言测试所有已翻译的界面
4. **扩展语言**：需要时可添加更多语言（日语、韩语等）

## 💡 使用示例

### 示例 1：简单文本替换
```jsx
// 之前
<button>添加</button>

// 之后
<button>{t('common.add')}</button>
```

### 示例 2：带参数
```jsx
// 之前
<p>确定要删除 "{password.website}" 的记录吗？</p>

// 之后
<p>{t('vault.deleteConfirm', { website: password.website })}</p>
```

### 示例 3：动态键
```jsx
// 之前
const typeLabel = formData.type === 'password' ? '密码' : 'MFA密钥';

// 之后
const typeLabel = t(`dataTypes.${formData.type}`);
```

## 📞 需要帮助？

如果需要继续完成剩余组件的翻译，请告诉我具体要更新哪个组件，我会立即处理。
