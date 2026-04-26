# 多语言支持使用指南

## 已完成的工作

1. ✅ 安装了 i18next 相关依赖
2. ✅ 创建了语言文件：
   - `src/locales/zh-CN.json` (简体中文)
   - `src/locales/en.json` (英文)
3. ✅ 创建了 i18n 配置文件 `src/i18n.js`
4. ✅ 在入口文件 `src/index.jsx` 中导入了 i18n
5. ✅ 创建了语言切换组件 `src/components/LanguageSwitcher.jsx`

## 如何在组件中使用翻译

### 1. 导入 useTranslation hook

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
      <p>{t('vault.noPasswords')}</p>
    </div>
  );
};
```

### 3. 带参数的翻译

```jsx
// 在翻译文件中: "deleteConfirm": "确定要删除 \"{{website}}\" 的记录吗？"
const message = t('vault.deleteConfirm', { website: 'example.com' });
```

### 4. 数组索引翻译

```jsx
// 数据类型
const typeLabel = t(`dataTypes.${formData.type}`);
// 结果: "密码" 或 "Password"
```

## 示例：更新 GroupTabs 组件

```jsx
import { useTranslation } from 'react-i18next';

const GroupTabs = ({ selectedGroupIds, onGroupFilterChange, groups, onManageGroups, passwords }) => {
  const { t } = useTranslation();

  const label = () => {
    if (isAll) return t('groups.allGroups');
    if (selectedGroupIds.length === 1) {
      const id = selectedGroupIds[0];
      if (id === 'ungrouped') return t('common.ungrouped');
      const g = groups.find(g => g.id === id);
      return g ? g.name : t('groups.selectCount', { count: 1 });
    }
    return t('groups.selectCount', { count: selectedGroupIds.length });
  };

  return (
    <div>
      <button title={t('groups.filterGroups')}>
        {label()}
      </button>
      <button title={t('groups.manageGroups')}>
        <PlusIcon />
      </button>
    </div>
  );
};
```

## 示例：更新 AddPasswordModal 组件

```jsx
import { useTranslation } from 'react-i18next';

const AddPasswordModal = ({ onClose, onSave }) => {
  const { t } = useTranslation();

  return (
    <div>
      <h3>{t('vault.addNewRecord')}</h3>

      <Label>{t('fields.dataType')}</Label>
      <Select>
        <SelectItem value="password">
          <LockClosedIcon />
          <span>{t('dataTypes.password')}</span>
        </SelectItem>
        <SelectItem value="mfa">
          <ClockIcon />
          <span>{t('dataTypes.mfa')}</span>
        </SelectItem>
      </Select>

      <input placeholder={t('placeholders.password')} />

      <button onClick={onClose}>{t('common.cancel')}</button>
      <button type="submit">{t('common.save')}</button>
    </div>
  );
};
```

## 添加语言切换器到应用

在 `Header.jsx` 或 `SettingsView.jsx` 中添加：

```jsx
import LanguageSwitcher from './LanguageSwitcher';

const Header = () => {
  return (
    <header>
      {/* 其他内容 */}
      <LanguageSwitcher />
    </header>
  );
};
```

## 添加新的翻译键

1. 在 `src/locales/zh-CN.json` 中添加中文翻译
2. 在 `src/locales/en.json` 中添加对应的英文翻译
3. 在组件中使用 `t('your.new.key')`

## 支持的语言

- 简体中文 (zh-CN) - 默认语言
- English (en)

## 添加新语言

1. 创建新的语言文件，如 `src/locales/ja.json`
2. 在 `src/i18n.js` 中导入并添加到 resources
3. 在 `LanguageSwitcher.jsx` 的 languages 数组中添加新语言

## 翻译键结构

```
common.*          - 通用文本（添加、删除、保存等）
dataTypes.*       - 数据类型名称
groups.*          - 分组相关
vault.*           - 密码库相关
fields.*          - 表单字段标签
placeholders.*    - 输入框占位符
actions.*         - 操作按钮
settings.*        - 设置相关
```

## 下一步

需要逐个更新以下组件以使用翻译：

- [ ] GroupTabs.jsx
- [ ] MainVault.jsx
- [ ] AddPasswordModal.jsx
- [ ] EditPasswordModal.jsx
- [ ] PasswordCard.jsx
- [ ] SearchBox.jsx
- [ ] Header.jsx
- [ ] SettingsView.jsx
- [ ] LoginView.jsx
- [ ] SetupView.jsx

每个组件只需：
1. 导入 `useTranslation`
2. 调用 `const { t } = useTranslation()`
3. 将硬编码的中文文本替换为 `t('key')`
