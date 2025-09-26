import React, { useState } from 'react';
import {
    ShieldCheckIcon,
    KeyIcon,
    TrashIcon,
    ExclamationTriangleIcon,
    QrCodeIcon,
    HeartIcon,
    CogIcon,
    ArrowLeftIcon,
    LockClosedIcon
} from '@heroicons/react/24/outline';
import ConfirmInputModal from './ConfirmInputModal';
import CustomDialog from './CustomDialog';

const SettingsView = ({ onBack, onLogout }) => {
    const [activeSection, setActiveSection] = useState('general');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        detail: '',
        type: 'warning',
        buttons: ['确定', '取消'],
        onConfirm: null
    });

    // 设置状态
    const [settings, setSettings] = useState({
        autoLock: {
            enabled: true,
            timeout: 1800000, // 30分钟 (30 * 60 * 1000)
            onMinimize: true,
            onBlur: false
        },
        passwordGenerator: {
            defaultLength: 16,
            includeUppercase: true,
            includeLowercase: true,
            includeNumbers: true,
            includeSymbols: true,
            excludeSimilar: true, // 默认排除相似字符
            customCharset: ''
        },
        ui: {
            hideSensitiveButtons: true, // 默认隐藏敏感按钮
            showPasswordStrength: true,
            compactMode: false,
            theme: 'system'
        },
        mfa: {
            enabled: false,
            secret: null,
            backupCodes: []
        },
        importExport: {
            autoBackup: true,
            backupInterval: 86400000,
            lastBackup: null
        }
    });
    const [isLoading, setIsLoading] = useState(false);

    // 加载设置
    React.useEffect(() => {
        loadSettings();
    }, []);

    // 监听设置变化，当隐藏敏感按钮时自动切换区域
    React.useEffect(() => {
        if (settings?.ui?.hideSensitiveButtons && activeSection === 'danger') {
            setActiveSection('general');
        }
    }, [settings?.ui?.hideSensitiveButtons, activeSection]);

    const loadSettings = async () => {
        try {
            setIsLoading(true);
            const result = await window.api.getSettings();
            if (result.success) {
                setSettings(result.settings);
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 重置密码相关状态
    const [resetPasswordData, setResetPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        mfaToken: ''
    });

    const handleSettingChange = async (key, value) => {
        try {
            // 更新本地状态
            setSettings(prev => ({ ...prev, [key]: value }));

            // 保存到后端
            const result = await window.api.updateSetting(key, value);
            if (result.success) {
                console.log('设置已保存:', key, value);
            } else {
                console.error('保存设置失败:', result.message);
                // 如果保存失败，恢复原值
                setSettings(prev => ({ ...prev, [key]: !value }));
            }
        } catch (error) {
            console.error('保存设置失败:', error);
            // 如果保存失败，恢复原值
            setSettings(prev => ({ ...prev, [key]: !value }));
        }
    };

    const handleNestedSettingChange = async (category, key, value) => {
        try {
            // 更新本地状态
            const newSettings = {
                ...settings,
                [category]: {
                    ...settings[category],
                    [key]: value
                }
            };

            setSettings(newSettings);

            // 保存到后端 - 传递完整的设置对象
            const result = await window.api.updateSetting(category, newSettings[category]);
            if (result.success) {
                console.log('设置已保存:', category, key, value);
            } else {
                console.error('保存设置失败:', result.message);
                // 如果保存失败，恢复原值
                setSettings(settings);
            }
        } catch (error) {
            console.error('保存设置失败:', error);
            // 如果保存失败，恢复原值
            setSettings(settings);
        }
    };

    const handleResetPassword = async () => {
        if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
            alert('新密码和确认密码不匹配');
            return;
        }

        if (resetPasswordData.newPassword.length < 1) {
            alert('新密码不能为空');
            return;
        }

        try {
            // 这里应该调用后端 API 重置密码
            const result = await window.api.changeMasterPassword(
                resetPasswordData.currentPassword,
                resetPasswordData.newPassword
            );

            if (result.success) {
                alert('主密码已成功重置');
                setResetPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                    mfaToken: ''
                });
            } else {
                alert('重置密码失败: ' + result.message);
            }
        } catch (error) {
            console.error('重置密码失败:', error);
            alert('重置密码过程中发生错误');
        }
    };

    const handleClearAllPasswords = async () => {
        setShowConfirmModal(true);
    };

    // 处理确认清除密码
    const handleConfirmClearPasswords = async (confirmation) => {
        if (confirmation !== 'DELETE ALL') {
            alert('确认文本不匹配，操作已取消');
            return;
        }

        try {
            const result = await window.api.clearPasswords();
            if (result.success) {
                alert('所有密码已清除');
                onLogout(); // 退出登录
            } else {
                alert('清除密码失败: ' + result.message);
            }
        } catch (error) {
            console.error('清除密码失败:', error);
            alert('清除密码过程中发生错误');
        }
    };

    // 处理重置所有数据
    const handleResetAllData = () => {
        setDialogConfig({
            isOpen: true,
            title: '危险操作警告',
            message: '此操作将永久删除所有密码数据和设置',
            detail: '此操作将：\n• 永久删除所有密码数据\n• 清除所有设置\n• 重置应用状态\n\n此操作无法撤销！\n\n如果您忘记了主密码，这是唯一的解决方案。',
            type: 'warning',
            buttons: ['继续', '取消'],
            onConfirm: (buttonIndex) => {
                if (buttonIndex === 0) {
                    // 用户点击了"继续"，显示第二次确认
                    setDialogConfig({
                        isOpen: true,
                        title: '最后确认',
                        message: '您确定要重置所有数据吗？',
                        detail: '这将清除所有密码和设置，无法恢复！\n\n点击"确定重置"继续，点击"取消"中止操作。',
                        type: 'error',
                        buttons: ['确定重置', '取消'],
                        onConfirm: async (buttonIndex) => {
                            if (buttonIndex === 0) {
                                // 执行重置
                                try {
                                    const result = await window.api.resetAllData('RESET ALL DATA');

                                    if (result.success) {
                                        // 显示成功对话框
                                        setDialogConfig({
                                            isOpen: true,
                                            title: '重置完成',
                                            message: '所有数据已重置！',
                                            detail: '应用将重新启动，请重新设置主密码。',
                                            type: 'success',
                                            buttons: ['确定'],
                                            onConfirm: () => {
                                                setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                                // 重新加载页面，让用户重新设置
                                                window.location.reload();
                                            }
                                        });
                                    } else {
                                        setDialogConfig({
                                            isOpen: true,
                                            title: '重置失败',
                                            message: '重置数据失败',
                                            detail: result.message,
                                            type: 'error',
                                            buttons: ['确定'],
                                            onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
                                        });
                                    }
                                } catch (error) {
                                    console.error('重置数据失败:', error);
                                    setDialogConfig({
                                        isOpen: true,
                                        title: '错误',
                                        message: '重置数据过程中发生错误',
                                        detail: error.message,
                                        type: 'error',
                                        buttons: ['确定'],
                                        onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
                                    });
                                }
                            } else {
                                setDialogConfig(prev => ({ ...prev, isOpen: false }));
                            }
                        }
                    });
                } else {
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };



    const renderGeneralSettings = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CogIcon className="w-5 h-5" />
                    基本设置
                </h3>

                <div className="space-y-4">
                    {/* 隐藏敏感按钮 */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                            <h4 className="font-medium text-gray-900">隐藏敏感按钮</h4>
                            <p className="text-sm text-gray-500">隐藏删除和清空等危险操作按钮</p>
                        </div>
                        <button
                            onClick={() => handleNestedSettingChange('ui', 'hideSensitiveButtons', !settings.ui.hideSensitiveButtons)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.ui.hideSensitiveButtons ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.ui.hideSensitiveButtons ? 'translate-x-6' : 'translate-x-0.5'}`}
                            />
                        </button>
                    </div>

                    {/* 显示密码强度 */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                            <h4 className="font-medium text-gray-900">显示密码强度</h4>
                            <p className="text-sm text-gray-500">在密码输入时显示强度指示器</p>
                        </div>
                        <button
                            onClick={() => handleNestedSettingChange('ui', 'showPasswordStrength', !settings.ui.showPasswordStrength)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.ui.showPasswordStrength ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.ui.showPasswordStrength ? 'translate-x-6' : 'translate-x-0.5'}`}
                            />
                        </button>
                    </div>

                    {/* 自动锁定 */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                            <h4 className="font-medium text-gray-900">自动锁定</h4>
                            <p className="text-sm text-gray-500">空闲一段时间后自动锁定应用</p>
                        </div>
                        <button
                            onClick={() => {
                                const newEnabled = !settings.autoLock.enabled;
                                handleNestedSettingChange('autoLock', 'enabled', newEnabled);
                                // 如果启用自动锁定且当前超时时间为0，重置为默认5分钟
                                if (newEnabled && settings.autoLock.timeout === 0) {
                                    handleNestedSettingChange('autoLock', 'timeout', 300000);
                                }
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.autoLock.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.autoLock.enabled ? 'translate-x-6' : 'translate-x-0.5'}`}
                            />
                        </button>
                    </div>

                    {/* 自动锁定超时 */}
                    {settings.autoLock.enabled && (
                        <div className="flex items-center justify-between py-3">
                            <div>
                                <h4 className="font-medium text-gray-900">锁定超时时间</h4>
                                <p className="text-sm text-gray-500">设置空闲多少分钟后自动锁定</p>
                            </div>
                            <select
                                value={Math.floor(settings.autoLock.timeout / 60000)} // 转换为分钟
                                onChange={(e) => {
                                    const timeoutMinutes = parseInt(e.target.value);
                                    if (timeoutMinutes === 0) {
                                        // 如果选择"永不"，禁用自动锁定
                                        handleNestedSettingChange('autoLock', 'enabled', false);
                                        handleNestedSettingChange('autoLock', 'timeout', 1800000); // 重置为默认30分钟
                                    } else {
                                        handleNestedSettingChange('autoLock', 'timeout', timeoutMinutes * 60000);
                                    }
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value={1}>1 分钟</option>
                                <option value={5}>5 分钟</option>
                                <option value={15}>15 分钟</option>
                                <option value={30}>30 分钟</option>
                                <option value={60}>1 小时</option>
                                <option value={0}>永不（禁用自动锁定）</option>
                            </select>
                        </div>
                    )}
                    {/* 默认生成密码长度 */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                            <h4 className="font-medium text-gray-900">默认生成密码长度</h4>
                            <p className="text-sm text-gray-500">设置默认生成密码的长度</p>
                        </div>
                        <div>
                            <input
                                type="number"
                                min="4"
                                max="128"
                                value={settings.passwordGenerator.defaultLength}
                                onChange={(e) => handleNestedSettingChange('passwordGenerator', 'defaultLength', parseInt(e.target.value))}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-20"
                            />
                        </div>
                    </div>
                    {/* 密码生成器选项 */}
                    <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">密码生成器选项</h4>

                        {/* 包含大写字母 */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">包含大写字母 (A-Z)</span>
                            <button
                                onClick={() => handleNestedSettingChange('passwordGenerator', 'includeUppercase', !settings.passwordGenerator.includeUppercase)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.passwordGenerator.includeUppercase ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                                <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings.passwordGenerator.includeUppercase ? 'translate-x-5' : 'translate-x-0.5'}`}
                                />
                            </button>
                        </div>

                        {/* 包含小写字母 */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">包含小写字母 (a-z)</span>
                            <button
                                onClick={() => handleNestedSettingChange('passwordGenerator', 'includeLowercase', !settings.passwordGenerator.includeLowercase)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.passwordGenerator.includeLowercase ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                                <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings.passwordGenerator.includeLowercase ? 'translate-x-5' : 'translate-x-0.5'}`}
                                />
                            </button>
                        </div>

                        {/* 包含数字 */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">包含数字 (0-9)</span>
                            <button
                                onClick={() => handleNestedSettingChange('passwordGenerator', 'includeNumbers', !settings.passwordGenerator.includeNumbers)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.passwordGenerator.includeNumbers ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                                <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings.passwordGenerator.includeNumbers ? 'translate-x-5' : 'translate-x-0.5'}`}
                                />
                            </button>
                        </div>

                        {/* 包含符号 */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">包含符号 (!@#$%^&*)</span>
                            <button
                                onClick={() => handleNestedSettingChange('passwordGenerator', 'includeSymbols', !settings.passwordGenerator.includeSymbols)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.passwordGenerator.includeSymbols ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                                <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings.passwordGenerator.includeSymbols ? 'translate-x-5' : 'translate-x-0.5'}`}
                                />
                            </button>
                        </div>

                        {/* 排除相似字符 */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">排除相似字符 (0O1lI)</span>
                            <button
                                onClick={() => handleNestedSettingChange('passwordGenerator', 'excludeSimilar', !settings.passwordGenerator.excludeSimilar)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.passwordGenerator.excludeSimilar ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                                <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings.passwordGenerator.excludeSimilar ? 'translate-x-5' : 'translate-x-0.5'}`}
                                />
                            </button>
                        </div>

                        {/* 自定义字符集 */}
                        <div className="space-y-2">
                            <span className="text-sm text-gray-600">自定义字符集</span>
                            <input
                                type="text"
                                placeholder="留空使用默认字符集"
                                value={settings.passwordGenerator.customCharset}
                                onChange={(e) => handleNestedSettingChange('passwordGenerator', 'customCharset', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder:text-gray-400 placeholder:opacity-100"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderPasswordSettings = () => (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <KeyIcon className="w-5 h-5" />
                重置主密码
            </h3>

            <div className="space-y-4 max-w-md">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
                    <input
                        type="password"
                        value={resetPasswordData.currentPassword}
                        onChange={(e) => setResetPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 placeholder:opacity-100"
                        placeholder="输入当前密码"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
                    <input
                        type="password"
                        value={resetPasswordData.newPassword}
                        onChange={(e) => setResetPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 placeholder:opacity-100"
                        placeholder="输入新密码"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
                    <input
                        type="password"
                        value={resetPasswordData.confirmPassword}
                        onChange={(e) => setResetPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 placeholder:opacity-100"
                        placeholder="再次输入新密码"
                    />
                </div>

                <button
                    onClick={handleResetPassword}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    重置密码
                </button>
            </div>
        </div>
    );

    const renderDonationSettings = () => (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <HeartIcon className="w-6 h-6 text-red-500" />
                项目详情 & 支持
            </h3>

            <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 text-center">
                    <h4 className="font-semibold text-gray-900 mb-3 text-xl">Ciphora 密码管理器</h4>
                    <p className="text-gray-600 mb-4">
                        一个安全、开源的密码管理器，支持多种数据类型和加密备份
                    </p>
                    <div className="text-sm text-gray-500">
                        <a
                            href="https://github.com/loganchef/Ciphora"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                            https://github.com/loganchef/Ciphora
                        </a> 版本: v1.2.80 | 开源协议: MIT
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <HeartIcon className="w-4 h-4 text-pink-500" />
                                <span className="text-sm font-medium text-gray-900">支持项目</span>
                            </div>
                            <div className="flex gap-2 text-xs">
                                <span className="bg-white px-2 py-1 rounded text-pink-600">🌸一朵花¥1</span>
                                <span className="bg-white px-2 py-1 rounded text-yellow-600">🍋柠檬水¥5</span>
                                <span className="bg-white px-2 py-1 rounded text-amber-600">🧋奶茶¥12</span>
                                <span className="bg-white px-2 py-1 rounded text-orange-600">🍽️午饭¥25</span>
                                <span className="bg-white px-2 py-1 rounded text-red-600">自定义¥?</span>
                            </div>
                        </div>
                        <div className="flex justify-center gap-16 mb-2">
                            <div className="w-32 h-40 bg-green-500 rounded border border-gray-200 flex items-center justify-center">
                                <img src="./res/wechatpay.png" alt="微信" className="w-full h-full object-contain" onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }} />
                                <div className="hidden w-full h-full items-center justify-center text-white text-sm font-bold">
                                    微信支付
                                </div>
                            </div>
                            <div className="w-32 h-40 bg-blue-500 rounded border border-gray-200 flex items-center justify-center">
                                <img src="./res/alipay.png" alt="支付宝" className="w-full h-full object-contain" onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }} />
                                <div className="hidden w-full h-full items-center justify-center text-white text-sm font-bold">
                                    支付宝
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 text-center">如果对您有帮助，欢迎支持开发</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderDangerZone = () => (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-center mb-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ExclamationTriangleIcon className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">危险操作</h3>
                <p className="text-gray-600">
                    以下操作具有破坏性，请谨慎操作
                </p>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <h4 className="font-medium text-red-900 mb-2">清除所有密码</h4>
                    <p className="text-sm text-red-700 mb-3">
                        此操作将永久删除所有密码数据，无法恢复！
                    </p>
                    <button
                        onClick={handleClearAllPasswords}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <TrashIcon className="w-4 h-4" />
                        清除所有密码
                    </button>
                </div>

                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                    <h4 className="font-medium text-orange-900 mb-2">重置应用</h4>
                    <p className="text-sm text-orange-700 mb-3">
                        清除所有设置并恢复到初始状态
                    </p>
                    <button
                        onClick={() => {
                            if (confirm('确定要重置应用吗？这将清除所有设置。')) {
                                localStorage.removeItem('ciphora_setup');
                                window.location.reload();
                            }
                        }}
                        className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                        重置应用
                    </button>
                </div>

                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                    <h4 className="font-medium text-purple-900 mb-2">重置所有数据</h4>
                    <p className="text-sm text-purple-700 mb-3">
                        <strong>忘记主密码时的解决方案</strong><br />
                        清除所有密码数据和设置，重新开始使用应用
                    </p>
                    <button
                        onClick={handleResetAllData}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        重置所有数据
                    </button>
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeSection) {
            case 'general':
                return renderGeneralSettings();
            case 'password':
                return renderPasswordSettings();
            case 'donation':
                return renderDonationSettings();
            case 'danger':
                // 如果隐藏敏感按钮，重定向到基本设置
                if (settings?.ui?.hideSensitiveButtons) {
                    return renderGeneralSettings();
                }
                return renderDangerZone();
            default:
                return renderGeneralSettings();
        }
    };

    return (
        <div className="h-screen mx-24 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8 overflow-hidden">
            <div className="max-w-6xl mx-auto h-full">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-full">
                    {/* 左侧设置菜单 */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-2 overflow-hidden">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">设置分类</h3>

                            <button
                                onClick={() => setActiveSection('general')}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-all duration-200 ${activeSection === 'general'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <CogIcon className="w-5 h-5" />
                                <span>基本设置</span>
                            </button>

                            <button
                                onClick={() => setActiveSection('password')}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-all duration-200 ${activeSection === 'password'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <KeyIcon className="w-5 h-5" />
                                <span>重置主密码</span>
                            </button>

                            <button
                                onClick={() => setActiveSection('donation')}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-all duration-200 ${activeSection === 'donation'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <HeartIcon className="w-5 h-5" />
                                <span>项目详情 & 支持</span>
                            </button>

                            {!settings?.ui?.hideSensitiveButtons && (
                                <button
                                    onClick={() => setActiveSection('danger')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-all duration-200 ${activeSection === 'danger'
                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                        : 'text-red-700 hover:bg-red-50'
                                        }`}
                                >
                                    <ExclamationTriangleIcon className="w-5 h-5" />
                                    <span>危险区域</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 右侧设置内容 */}
                    <div className="lg:col-span-3 overflow-y-auto h-full max-w-7xl pb-24">
                        {renderContent()}
                    </div>
                </div>
            </div>

            {/* 确认输入Modal */}
            <ConfirmInputModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmClearPasswords}
                title="⚠️ 危险操作警告"
                message="此操作将永久删除所有密码数据，无法恢复！如果您确定要继续，请在下方输入 'DELETE ALL' 来确认："
                placeholder="请输入 DELETE ALL"
                confirmText="确认删除"
                requiredText="DELETE ALL"
            />

            {/* 自定义对话框 */}
            <CustomDialog
                isOpen={dialogConfig.isOpen}
                onClose={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
                title={dialogConfig.title}
                message={dialogConfig.message}
                detail={dialogConfig.detail}
                type={dialogConfig.type}
                buttons={dialogConfig.buttons}
                onButtonClick={dialogConfig.onConfirm}
            />
        </div>
    );
};

export default SettingsView; 