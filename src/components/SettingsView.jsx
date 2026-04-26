import React, { useState, useEffect } from 'react';
import {
    ShieldCheckIcon,
    KeyIcon,
    TrashIcon,
    ExclamationTriangleIcon,
    QrCodeIcon,
    HeartIcon,
    CogIcon,
    LockClosedIcon,
    LanguageIcon
} from '@heroicons/react/24/outline';
import ConfirmInputModal from './ConfirmInputModal';
import CustomDialog from './CustomDialog';
import { useTranslation } from 'react-i18next';

const defaultSettings = {
    autoLock: {
        enabled: true,
        timeout: 1800000,
        onMinimize: true,
        onBlur: false
    },
    passwordGenerator: {
        defaultLength: 16,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeSimilar: true,
        customCharset: ''
    },
    ui: {
        hideSensitiveButtons: true,
        showPasswordStrength: true,
        compactMode: false,
        theme: 'system',
        cardOrder: 'usage',
        pagination: {
            enabled: false,
            pageSize: 20
        }
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
};

const SettingsView = ({ onLogout, settings: initialSettings, onSettingsUpdate }) => {
    const { t, i18n } = useTranslation();
    const [activeSection, setActiveSection] = useState('general');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        detail: '',
        type: 'warning',
        buttons: [t('common.confirm'), t('common.cancel')],
        onConfirm: null
    });

    // Update buttons when language changes
    useEffect(() => {
        setDialogConfig(prev => ({
            ...prev,
            buttons: prev.buttons.length === 2 ? [t('common.confirm'), t('common.cancel')] : prev.buttons
        }));
    }, [t]);

    // 设置状态
    const [settings, setSettings] = useState(initialSettings || defaultSettings);

    useEffect(() => {
        if (initialSettings) {
            setSettings(initialSettings);
        } else {
            loadSettings();
        }
    }, [initialSettings]);

    // 监听设置变化，当隐藏敏感按钮时自动切换区域
    useEffect(() => {
        if (settings?.ui?.hideSensitiveButtons && activeSection === 'danger') {
            setActiveSection('general');
        }
    }, [settings?.ui?.hideSensitiveButtons, activeSection]);

    const loadSettings = async () => {
        try {
            const result = await window.api.getSettings();
            if (result.success) {
                setSettings(result.settings);
                onSettingsUpdate?.(result.settings);
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    };

    // 重置密码相关状态
    const [resetPasswordData, setResetPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        mfaToken: ''
    });

    const persistSetting = async (key, value, previousState) => {
        try {
            const result = await window.api.updateSetting(key, value);
            if (result.success && result.settings) {
                setSettings(result.settings);
                onSettingsUpdate?.(result.settings);
            } else {
                console.error('保存设置失败:', result.message);
                setSettings(previousState);
            }
        } catch (error) {
            console.error('保存设置失败:', error);
            setSettings(previousState);
        }
    };

    const handleSettingChange = async (key, value) => {
        const previous = settings;
        const next = { ...settings, [key]: value };
        setSettings(next);
        await persistSetting(key, next[key], previous);
    };

    const handleNestedSettingChange = async (category, key, value) => {
        const previous = settings;
        const categoryState = settings?.[category] || defaultSettings[category];
        const next = {
            ...settings,
            [category]: {
                ...categoryState,
                [key]: value
            }
        };
        setSettings(next);
        await persistSetting(category, next[category], previous);
    };

    const handleResetSettings = async () => {
        if (confirm(t('settings.danger.resetSettings.confirm'))) {
            try {
                const result = await window.api.resetSettings();
                if (result.success) {
                    setSettings(result.settings);
                    onSettingsUpdate?.(result.settings);
                    alert(t('settings.danger.resetSettings.success'));
                }
            } catch (error) {
                console.error('重置设置失败:', error);
            }
        }
    };

    const handleResetPassword = async () => {
        if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
            alert(t('settings.password.mismatch'));
            return;
        }

        if (resetPasswordData.newPassword.length < 1) {
            alert(t('settings.password.empty'));
            return;
        }

        try {
            // 这里应该调用后端 API 重置密码
            const result = await window.api.changeMasterPassword(
                resetPasswordData.currentPassword,
                resetPasswordData.newPassword
            );

            if (result.success) {
                alert(t('settings.password.success'));
                setResetPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                    mfaToken: ''
                });
            } else {
                alert(t('settings.password.failed') + ': ' + result.message);
            }
        } catch (error) {
            console.error('重置密码失败:', error);
            alert(t('settings.password.error'));
        }
    };

    const handleClearAllPasswords = async () => {
        setShowConfirmModal(true);
    };

    // 处理确认清除密码
    const handleConfirmClearPasswords = async (confirmation) => {
        if (confirmation !== 'DELETE ALL') {
            alert(t('settings.danger.confirmModal.textMismatch'));
            return;
        }

        try {
            const result = await window.api.clearPasswords();
            if (result.success) {
                alert(t('settings.danger.clearPasswords.success'));
                onLogout(); // 退出登录
            } else {
                alert(t('settings.password.failed') + ': ' + result.message);
            }
        } catch (error) {
            console.error('清除密码失败:', error);
            alert(t('common.error'));
        }
    };

    // 处理重置所有数据
    const handleResetAllData = () => {
        setDialogConfig({
            isOpen: true,
            title: t('settings.danger.resetAllData.name'),
            message: t('settings.danger.resetAllData.description'),
            detail: t('settings.danger.resetAllData.hint'),
            type: 'warning',
            buttons: [t('common.continue'), t('common.cancel')],
            onConfirm: (buttonIndex) => {
                if (buttonIndex === 0) {
                    // 用户点击了"继续"，显示第二次确认
                    setDialogConfig({
                        isOpen: true,
                        title: t('login.resetConfirmTitle'),
                        message: t('login.resetConfirmMessage'),
                        detail: t('login.resetConfirmDetail'),
                        type: 'error',
                        buttons: [t('login.confirmReset'), t('common.cancel')],
                        onConfirm: async (buttonIndex) => {
                            if (buttonIndex === 0) {
                                // 执行重置
                                try {
                                    const result = await window.api.resetAllData('RESET ALL DATA');

                                    if (result.success) {
                                        // 显示成功对话框
                                        setDialogConfig({
                                            isOpen: true,
                                            title: t('login.resetSuccessTitle'),
                                            message: t('login.resetSuccessMessage'),
                                            detail: t('login.resetSuccessDetail'),
                                            type: 'success',
                                            buttons: [t('common.confirm')],
                                            onConfirm: () => {
                                                setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                                // 重新加载页面，让用户重新设置
                                                window.location.reload();
                                            }
                                        });
                                    } else {
                                        setDialogConfig({
                                            isOpen: true,
                                            title: t('login.resetFailedTitle'),
                                            message: t('login.resetFailedMessage'),
                                            detail: result.message,
                                            type: 'error',
                                            buttons: [t('common.confirm')],
                                            onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
                                        });
                                    }
                                } catch (error) {
                                    console.error('重置数据失败:', error);
                                    setDialogConfig({
                                        isOpen: true,
                                        title: t('common.error'),
                                        message: t('login.resetError'),
                                        detail: error.message,
                                        type: 'error',
                                        buttons: [t('common.confirm')],
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
                    {t('settings.sections.general')}
                </h3>

                <div className="space-y-4">
                    {/* 语言选择 */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                            <div className="flex items-center gap-2">
                                <LanguageIcon className="w-4 h-4 text-gray-500" />
                                <h4 className="font-medium text-gray-900">{t('settings.language')}</h4>
                            </div>
                            <p className="text-sm text-gray-500">{t('settings.languageDescription')}</p>
                        </div>
                        <select
                            value={i18n.language}
                            onChange={(e) => i18n.changeLanguage(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white cursor-pointer"
                        >
                            <option value="zh-CN">简体中文</option>
                            <option value="en">English</option>
                        </select>
                    </div>

                    {/* 隐藏敏感按钮 */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                            <h4 className="font-medium text-gray-900">{t('settings.general.hideSensitiveButtons.name')}</h4>
                            <p className="text-sm text-gray-500">{t('settings.general.hideSensitiveButtons.description')}</p>
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
                            <h4 className="font-medium text-gray-900">{t('settings.general.showPasswordStrength.name')}</h4>
                            <p className="text-sm text-gray-500">{t('settings.general.showPasswordStrength.description')}</p>
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
                            <h4 className="font-medium text-gray-900">{t('settings.general.autoLock.name')}</h4>
                            <p className="text-sm text-gray-500">{t('settings.general.autoLock.description')}</p>
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
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                            <div>
                                <h4 className="font-medium text-gray-900">{t('settings.general.autoLockTimeout.name')}</h4>
                                <p className="text-sm text-gray-500">{t('settings.general.autoLockTimeout.description')}</p>
                            </div>
                            <select
                                value={settings.autoLock.timeout === 0 ? 0 : Math.floor(settings.autoLock.timeout / 60000)} // 转换为分钟，0表示永不
                                onChange={(e) => {
                                    const timeoutMinutes = parseInt(e.target.value);
                                    if (timeoutMinutes === 0) {
                                        // 如果选择"永不"，保持自动锁定启用，但设置超时时间为0
                                        handleNestedSettingChange('autoLock', 'timeout', 0);
                                    } else {
                                        handleNestedSettingChange('autoLock', 'timeout', timeoutMinutes * 60000);
                                    }
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white cursor-pointer"
                            >
                                <option value={1}>{t('settings.general.autoLockTimeout.1min')}</option>
                                <option value={5}>{t('settings.general.autoLockTimeout.5min')}</option>
                                <option value={15}>15 {t('settings.general.autoLockTimeout.1min').replace('1', '').trim()}</option>
                                <option value={30}>30 {t('settings.general.autoLockTimeout.1min').replace('1', '').trim()}</option>
                                <option value={60}>{t('settings.general.autoLockTimeout.1hour')}</option>
                                <option value={0}>{t('settings.general.autoLockTimeout.never')}</option>
                            </select>
                        </div>
                    )}

                    {/* 卡片排序模式 */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                            <h4 className="font-medium text-gray-900">{t('settings.general.cardOrder.name')}</h4>
                            <p className="text-sm text-gray-500">{t('settings.general.cardOrder.description')}</p>
                        </div>
                        <select
                            value={settings.ui.cardOrder || 'usage'}
                            onChange={(e) => handleNestedSettingChange('ui', 'cardOrder', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white cursor-pointer"
                        >
                            <option value="usage">{t('settings.general.cardOrder.usage')}</option>
                            <option value="createdAt">{t('settings.general.cardOrder.createdAt')}</option>
                            <option value="updatedAt">{t('settings.general.cardOrder.updatedAt')}</option>
                            <option value="username">{t('settings.general.cardOrder.username')}</option>
                        </select>
                    </div>

                    {/* 启用分页 */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                            <h4 className="font-medium text-gray-900">{t('settings.general.pagination.enable.name')}</h4>
                            <p className="text-sm text-gray-500">{t('settings.general.pagination.enable.description')}</p>
                        </div>
                        <button
                            onClick={() => handleNestedSettingChange('ui', 'pagination', {
                                ...(settings.ui.pagination || { enabled: false, pageSize: 20 }),
                                enabled: !settings.ui.pagination?.enabled
                            })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.ui.pagination?.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.ui.pagination?.enabled ? 'translate-x-6' : 'translate-x-0.5'}`}
                            />
                        </button>
                    </div>

                    {/* 每页显示数量 */}
                    {settings.ui.pagination?.enabled && (
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                            <div>
                                <h4 className="font-medium text-gray-900">{t('settings.general.pagination.pageSize.name')}</h4>
                                <p className="text-sm text-gray-500">{t('settings.general.pagination.pageSize.description')}</p>
                            </div>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={settings.ui.pagination?.pageSize || 20}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val)) {
                                        handleNestedSettingChange('ui', 'pagination', {
                                            ...(settings.ui.pagination || { enabled: false, pageSize: 20 }),
                                            pageSize: val
                                        });
                                    }
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-20 text-sm"
                            />
                        </div>
                    )}

                    {/* 默认生成密码长度 */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                            <h4 className="font-medium text-gray-900">{t('settings.general.defaultLength.name')}</h4>
                            <p className="text-sm text-gray-500">{t('settings.general.defaultLength.description')}</p>
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
                        <h4 className="font-medium text-gray-900">{t('settings.general.generatorOptions.title')}</h4>

                        {/* 包含大写字母 */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{t('settings.general.generatorOptions.uppercase')}</span>
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
                            <span className="text-sm text-gray-600">{t('settings.general.generatorOptions.lowercase')}</span>
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
                            <span className="text-sm text-gray-600">{t('settings.general.generatorOptions.numbers')}</span>
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
                            <span className="text-sm text-gray-600">{t('settings.general.generatorOptions.symbols')}</span>
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
                            <span className="text-sm text-gray-600">{t('settings.general.generatorOptions.similar')}</span>
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
                            <span className="text-sm text-gray-600">{t('settings.general.generatorOptions.custom')}</span>
                            <input
                                type="text"
                                placeholder={t('settings.general.generatorOptions.customPlaceholder')}
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
                {t('settings.sections.password')}
            </h3>

            <div className="space-y-4 max-w-md">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.password.current')}</label>
                    <input
                        type="password"
                        value={resetPasswordData.currentPassword}
                        onChange={(e) => setResetPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 placeholder:opacity-100"
                        placeholder={t('settings.password.currentPlaceholder')}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.password.new')}</label>
                    <input
                        type="password"
                        value={resetPasswordData.newPassword}
                        onChange={(e) => setResetPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 placeholder:opacity-100"
                        placeholder={t('settings.password.newPlaceholder')}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.password.confirm')}</label>
                    <input
                        type="password"
                        value={resetPasswordData.confirmPassword}
                        onChange={(e) => setResetPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 placeholder:opacity-100"
                        placeholder={t('settings.password.confirmPlaceholder')}
                    />
                </div>

                <button
                    onClick={handleResetPassword}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {t('settings.password.resetButton')}
                </button>
            </div>
        </div>
    );

    const renderDangerZone = () => (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-center mb-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ExclamationTriangleIcon className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('settings.danger.title')}</h3>
                <p className="text-gray-600">
                    {t('settings.danger.description')}
                </p>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <h4 className="font-medium text-red-900 mb-2">{t('settings.danger.clearPasswords.name')}</h4>
                    <p className="text-sm text-red-700 mb-3">
                        {t('settings.danger.clearPasswords.description')}
                    </p>
                    <button
                        onClick={handleClearAllPasswords}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <TrashIcon className="w-4 h-4" />
                        {t('settings.danger.clearPasswords.name')}
                    </button>
                </div>

                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                    <h4 className="font-medium text-orange-900 mb-2">{t('settings.danger.resetApp.name')}</h4>
                    <p className="text-sm text-orange-700 mb-3">
                        {t('settings.danger.resetApp.description')}
                    </p>
                    <button
                        onClick={() => {
                            if (confirm(t('settings.danger.resetApp.confirm'))) {
                                localStorage.removeItem('ciphora_setup');
                                window.location.reload();
                            }
                        }}
                        className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                        {t('settings.danger.resetApp.name')}
                    </button>
                </div>

                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                    <h4 className="font-medium text-orange-900 mb-2">{t('settings.danger.resetSettings.name')}</h4>
                    <p className="text-sm text-orange-700 mb-3">
                        {t('settings.danger.resetSettings.description')}
                    </p>
                    <button
                        onClick={handleResetSettings}
                        className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <CogIcon className="w-4 h-4" />
                        {t('settings.danger.resetSettings.name')}
                    </button>
                </div>

                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                    <h4 className="font-medium text-purple-900 mb-2">{t('settings.danger.resetAllData.name')}</h4>
                    <p className="text-sm text-purple-700 mb-3">
                        <strong>{t('settings.danger.resetAllData.hint')}</strong><br />
                        {t('settings.danger.resetAllData.description')}
                    </p>
                    <button
                        onClick={handleResetAllData}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        {t('settings.danger.resetAllData.name')}
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
        <div className="h-screen mx-0 md:mx-24 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8 overflow-hidden safe-area-bottom">
            <div className="max-w-6xl mx-auto h-full">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8 h-full">
                    {/* 左侧设置菜单 */}
                    <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto max-h-[30vh] lg:max-h-full pb-4">
                        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-2 flex-grow overflow-hidden min-w-fit">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.categoryTitle')}</h3>

                            <button
                                onClick={() => setActiveSection('general')}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-all duration-200 ${activeSection === 'general'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <CogIcon className="w-5 h-5" />
                                <span>{t('settings.sections.general')}</span>
                            </button>

                            <button
                                onClick={() => setActiveSection('password')}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-all duration-200 ${activeSection === 'password'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <KeyIcon className="w-5 h-5" />
                                <span>{t('settings.sections.password')}</span>
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
                                    <span>{t('settings.sections.danger')}</span>
                                </button>
                            )}
                        </div>

                        {/* 项目链接与赞助 */}
                        <div className="bg-white rounded-2xl shadow-lg p-4 space-y-2">
                            <a
                                href="https://github.com/loganchef/Ciphora"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-3 px-4 py-2 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 font-medium text-xs"
                                title={t('settings.donation.projectAddress')}
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
                                <span>{t('settings.donation.projectAddress')}</span>
                            </a>
                            <a
                                href="https://github.com/sponsors/loganchef"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-3 px-4 py-2 bg-pink-50 text-pink-600 rounded-xl hover:bg-pink-100 transition-colors border border-pink-100 font-medium text-xs"
                                title={t('settings.donation.sponsor')}
                            >
                                <HeartIcon className="w-4 h-4" />
                                <span>{t('settings.donation.sponsor')}</span>
                            </a>
                            <div className="text-center pt-1 border-t border-gray-50 mt-2">
                                <p className="text-[10px] text-gray-400 font-medium">Ciphora v2.0.4 | MIT License</p>
                            </div>
                        </div>
                    </div>

                    {/* 右侧设置内容 */}
                    <div className="lg:col-span-3 overflow-y-auto h-full max-w-7xl pb-32">
                        {renderContent()}
                    </div>
                </div>
            </div>

            {/* 确认输入Modal */}
            <ConfirmInputModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmClearPasswords}
                title={t('settings.danger.confirmModal.title')}
                message={t('settings.danger.confirmModal.message')}
                placeholder={t('settings.danger.confirmModal.placeholder')}
                confirmText={t('settings.danger.confirmModal.confirmButton')}
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