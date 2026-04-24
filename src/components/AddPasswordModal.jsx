import React, { useState, useEffect } from 'react';
import {
    XMarkIcon,
    EyeIcon,
    EyeSlashIcon,
    KeyIcon,
    SparklesIcon,
    GlobeAltIcon,
    UserIcon,
    DocumentTextIcon,
    ChatBubbleLeftRightIcon,
    TagIcon,
    QrCodeIcon,
    DocumentIcon,
    LockClosedIcon,
    ClockIcon,
    CodeBracketIcon
} from '@heroicons/react/24/outline';
import TOTPDisplay from './TOTPDisplay';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useGroups } from '../hooks/useGroups';
import jsQR from 'jsqr';
import { useTranslation } from 'react-i18next';

const AddPasswordModal = ({ onClose, onSave }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        type: 'password',
        website: '',
        url: '',
        urlSuffix: '',
        showUrl: true,
        username: '',
        password: '',
        secret: '',
        base64Data: '',
        stringData: '',
        jsonData: '',
        notes: '',
        description: '',
        groupId: null
    });
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(null);
    const [settings, setSettings] = useState(null);
    const { groups } = useGroups();
    const fileInputRef = React.useRef(null);

    // 加载设置
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const result = await window.api.getSettings();
                if (result.success) {
                    setSettings(result.settings);
                }
            } catch (error) {
                console.error('加载设置失败:', error);
            }
        };

        loadSettings();
    }, []);

    // 前端二维码解析函数
    const scanQRCodeFromBlob = async (blob) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // 使用 jsQR 库解析二维码
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                resolve(code ? code.data : null);
            };
            img.onerror = () => resolve(null);
            img.src = URL.createObjectURL(blob);
        });
    };

    // 从二维码内容中提取 MFA 信息
    const extractMFAInfoFromQRContent = (content) => {
        try {
            // 检查是否是 otpauth 格式
            if (content.startsWith('otpauth://')) {
                const url = new URL(content);
                const secret = url.searchParams.get('secret');
                const issuer = url.searchParams.get('issuer');

                // 解析路径部分获取服务名和用户名
                const pathParts = url.pathname.split(':');
                let serviceName = '';
                let username = '';

                if (pathParts.length >= 2) {
                    serviceName = decodeURIComponent(pathParts[0].substring(1)); // 去掉开头的 /
                    username = decodeURIComponent(pathParts[1]);
                } else if (pathParts.length === 1) {
                    serviceName = decodeURIComponent(pathParts[0].substring(1));
                }

                return {
                    secret: secret,
                    website: issuer || serviceName,
                    username: username,
                    description: `${issuer || serviceName}${username ? ` - ${username}` : ''}`
                };
            }

            // 检查是否是纯 Base32 格式
            const base32Pattern = /^[A-Z2-7]{26,32}$/;
            if (base32Pattern.test(content)) {
                return {
                    secret: content,
                    website: '',
                    username: '',
                    description: ''
                };
            }

            // 尝试从其他格式中提取
            const secretMatch = content.match(/secret=([A-Z2-7]{26,32})/i);
            if (secretMatch) {
                return {
                    secret: secretMatch[1].toUpperCase(),
                    website: '',
                    username: '',
                    description: ''
                };
            }

            return null;
        } catch (error) {
            console.error('提取信息失败:', error);
            return null;
        }
    };

    // 处理输入框粘贴事件
    const handlePasteInSecretInput = async (e) => {
        try {
            const clipboardItems = e.clipboardData.items;

            for (let i = 0; i < clipboardItems.length; i++) {
                const item = clipboardItems[i];

                if (item.type.startsWith('image/')) {
                    // 如果是图片，阻止默认粘贴行为，解析二维码
                    e.preventDefault();

                    const blob = item.getAsFile();
                    try {
                        // 在前端直接解析二维码
                        const result = await scanQRCodeFromBlob(blob);
                        if (result) {
                            const mfaInfo = extractMFAInfoFromQRContent(result);
                            if (mfaInfo && mfaInfo.secret) {
                                // 填充所有相关字段
                                if (mfaInfo.website) handleInputChange('website', mfaInfo.website);
                                if (mfaInfo.username) handleInputChange('username', mfaInfo.username);
                                if (mfaInfo.description) handleInputChange('notes', mfaInfo.description);
                                handleInputChange('secret', mfaInfo.secret);
                            } else {
                                alert(t('errors.invalidMfaKey'));
                            }
                        } else {
                            alert(t('errors.noQrCodeDetected'));
                        }
                    } catch (error) {
                        console.error('二维码解析失败:', error);
                        alert(t('errors.qrCodeParseFailed'));
                    }
                    return;
                }
            }

            // 如果没有图片，让默认的文本粘贴行为继续
        } catch (error) {
            console.error('粘贴处理失败:', error);
            // 如果出错，让默认行为继续
        }
    };

    // 处理文件选择
    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // 在前端直接解析二维码
            const result = await scanQRCodeFromBlob(file);
            if (result) {
                const mfaInfo = extractMFAInfoFromQRContent(result);
                if (mfaInfo && mfaInfo.secret) {
                    // 填充所有相关字段
                    if (mfaInfo.website) handleInputChange('website', mfaInfo.website);
                    if (mfaInfo.username) handleInputChange('username', mfaInfo.username);
                    if (mfaInfo.description) handleInputChange('notes', mfaInfo.description);
                    handleInputChange('secret', mfaInfo.secret);
                } else {
                    alert(t('errors.invalidMfaKey'));
                }
            } else {
                alert(t('errors.noQrCodeInFile'));
            }
        } catch (error) {
            console.error('文件解析失败:', error);
            alert(t('errors.fileParseFailed'));
        }

        // 清空文件输入，允许重复选择同一文件
        event.target.value = '';
    };



    // 处理二维码解析
    const handleQRCodeScan = async (type) => {
        try {
            if (type === 'image') {
                // 触发文件选择
                fileInputRef.current?.click();
            }
        } catch (error) {
            console.error('二维码解析失败:', error);
            alert(t('errors.qrCodeParseFailed'));
        }
    };

    // 根据类型获取占位符文字
    const getPlaceholder = (field) => {
        if (field === 'website') {
            return t(`placeholders.website.${formData.type}`);
        }
        if (field === 'username') {
            return t(`placeholders.username.${formData.type}`);
        }
        return t(`placeholders.${field}`) || "";
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // 根据类型准备数据
        const passwordData = {
            website: formData.website,
            url: formData.url,
            urlSuffix: formData.urlSuffix,
            showUrl: formData.showUrl,
            notes: formData.notes,
            type: formData.type
        };

        // 根据类型添加相应字段
        if (formData.type === 'password') {
            passwordData.username = formData.username;
            passwordData.password = formData.password;
            passwordData.description = formData.website;
        } else if (formData.type === 'mfa') {
            passwordData.secret = formData.secret;
            passwordData.description = formData.website;
        } else if (formData.type === 'base64') {
            passwordData.username = formData.username;
            passwordData.base64Data = formData.base64Data;
            passwordData.description = formData.website;
        } else if (formData.type === 'string') {
            passwordData.username = formData.username;
            passwordData.stringData = formData.stringData;
            passwordData.description = formData.website;
        } else if (formData.type === 'json') {
            passwordData.username = formData.username;
            passwordData.jsonData = formData.jsonData;
            passwordData.description = formData.website;
        }

        onSave(passwordData);
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // 如果是密码字段，检查强度
        if (field === 'password' && value) {
            checkPasswordStrength(value);
        }
    };

    const checkPasswordStrength = async (password) => {
        try {
            const result = await window.api.checkPasswordStrength(password);
            if (result.success) {
                setPasswordStrength(result);
            } else {
                setPasswordStrength(null);
            }
        } catch (error) {
            console.error('检查密码强度失败:', error);
            setPasswordStrength(null);
        }
    };

    const generatePassword = async () => {
        try {
            // 不传递任何选项，让后端使用用户设置
            const result = await window.api.generatePassword({});
            if (result.success) {
                handleInputChange('password', result.password);
            } else {
                console.error('生成密码失败:', result.message);
                // 如果后端失败，使用本地生成作为备用
                const fallbackPassword = generateFallbackPassword();
                handleInputChange('password', fallbackPassword);
            }
        } catch (error) {
            console.error('生成密码失败:', error);
            // 如果API调用失败，使用本地生成作为备用
            const fallbackPassword = generateFallbackPassword();
            handleInputChange('password', fallbackPassword);
        }
    };

    const generateFallbackPassword = () => {
        const length = 16;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    };

    const extractUrlParts = (url) => {
        try {
            const commonSuffixes = ['/login', '/signin', '/auth', '/account', '/user/login'];
            let baseUrl = url.trim();
            let suffix = '';

            for (const commonSuffix of commonSuffixes) {
                if (baseUrl.toLowerCase().endsWith(commonSuffix.toLowerCase())) {
                    suffix = baseUrl.slice(-commonSuffix.length);
                    baseUrl = baseUrl.slice(0, -commonSuffix.length);
                    break;
                }
            }

            if (!suffix) {
                const urlObj = new URL(baseUrl);
                if (urlObj.pathname && urlObj.pathname !== '/') {
                    suffix = urlObj.pathname + urlObj.search + urlObj.hash;
                    baseUrl = urlObj.origin;
                }
            }

            return { baseUrl, suffix };
        } catch (error) {
            return { baseUrl: url.trim(), suffix: '' };
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in safe-area-top safe-area-bottom">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br rounded-lg flex items-center justify-center">
                                <KeyIcon className="w-5 h-5 text-neutral-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">{t('vault.addNewRecord')}</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Data Type Selection */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <TagIcon className="w-4 h-4" />
                            {t('fields.dataType')}
                        </Label>
                        <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('fields.selectGroup')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="password">
                                    <div className="flex items-center gap-2">
                                        <LockClosedIcon className="w-4 h-4" />
                                        <span>{t('dataTypes.password')}</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="mfa">
                                    <div className="flex items-center gap-2">
                                        <ClockIcon className="w-4 h-4" />
                                        <span>{t('dataTypes.mfa')}</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="base64">
                                    <div className="flex items-center gap-2">
                                        <DocumentIcon className="w-4 h-4" />
                                        <span>{t('dataTypes.base64')}</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="string">
                                    <div className="flex items-center gap-2">
                                        <DocumentTextIcon className="w-4 h-4" />
                                        <span>{t('dataTypes.string')}</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="json">
                                    <div className="flex items-center gap-2">
                                        <CodeBracketIcon className="w-4 h-4" />
                                        <span>{t('dataTypes.json')}</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Website/App Name */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <GlobeAltIcon className="w-4 h-4" />
                            {t('fields.website')}
                        </Label>
                        <input
                            type="text"
                            value={formData.website}
                            onChange={(e) => handleInputChange('website', e.target.value)}
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200"
                            placeholder={getPlaceholder('website')}
                            required
                        />
                    </div>

                    {/* URL Field */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <GlobeAltIcon className="w-4 h-4" />
                            {t('fields.url')}
                        </Label>
                        <input
                            type="text"
                            value={formData.url}
                            onChange={(e) => {
                                handleInputChange('url', e.target.value);
                                if (e.target.value) {
                                    handleInputChange('showUrl', true);
                                }
                            }}
                            onPaste={(e) => {
                                const pastedText = e.clipboardData.getData('text');
                                if (pastedText) {
                                    e.preventDefault();
                                    const { baseUrl, suffix } = extractUrlParts(pastedText);
                                    handleInputChange('url', baseUrl);
                                    if (suffix) {
                                        handleInputChange('urlSuffix', suffix);
                                    }
                                    handleInputChange('showUrl', true);
                                }
                            }}
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200"
                            placeholder={t('placeholders.url')}
                        />
                    </div>

                    {/* URL Suffix */}
                    {formData.url && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <GlobeAltIcon className="w-4 h-4" />
                                {t('fields.urlSuffix')}
                            </Label>
                            <input
                                type="text"
                                value={formData.urlSuffix}
                                onChange={(e) => handleInputChange('urlSuffix', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200"
                                placeholder={t('placeholders.urlSuffix')}
                            />
                        </div>
                    )}

                    {/* Show URL Toggle */}
                    {formData.url && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="showUrl"
                                checked={formData.showUrl}
                                onChange={(e) => handleInputChange('showUrl', e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <Label htmlFor="showUrl" className="text-sm cursor-pointer">
                                {t('fields.showUrl')}
                            </Label>
                        </div>
                    )}

                    {/* Username/Identifier */}
                    {formData.type !== 'mfa' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4" />
                                {t('fields.username')}
                            </Label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => handleInputChange('username', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200"
                                placeholder={getPlaceholder('username')}
                                required
                            />
                        </div>
                    )}

                    {/* Password Field Group */}
                    {formData.type === 'password' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <KeyIcon className="w-4 h-4" />
                                {t('fields.password')}
                            </Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => handleInputChange('password', e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200"
                                        placeholder={getPlaceholder('password')}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                    >
                                        {showPassword ? (
                                            <EyeSlashIcon className="w-4 h-4" />
                                        ) : (
                                            <EyeIcon className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={generatePassword}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-neutral-700 text-sm font-medium text-white rounded-md hover:bg-green-700 transition-colors duration-200"
                                >
                                    <SparklesIcon className="w-4 h-4" />
                                    <span>{t('actions.generate')}</span>
                                </button>
                            </div>

                            {/* 密码强度显示 */}
                            {passwordStrength && formData.password && settings?.ui?.showPasswordStrength && (
                                <div className="mt-2 p-2 bg-gray-50 rounded-md">
                                    <div className="flex items-center justify-between mb-2 gap-2">
                                        <span className="text-sm font-medium text-gray-700 flex-shrink-0">{t('fields.passwordStrength')}</span>
                                        <span className={`text-sm font-medium flex-shrink-0 ${passwordStrength.strength === 'weak' ? 'text-red-600' :
                                            passwordStrength.strength === 'medium' ? 'text-yellow-600' :
                                                passwordStrength.strength === 'strong' ? 'text-green-600' :
                                                    'text-blue-600'
                                            }`}>
                                            {passwordStrength.strength === 'weak' ? t('common.strengths.weak') :
                                                passwordStrength.strength === 'medium' ? t('common.strengths.medium') :
                                                    passwordStrength.strength === 'strong' ? t('common.strengths.strong') :
                                                        t('common.strengths.veryStrong')}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.strength === 'weak' ? 'bg-red-500' :
                                                passwordStrength.strength === 'medium' ? 'bg-yellow-500' :
                                                    passwordStrength.strength === 'strong' ? 'bg-green-500' :
                                                        'bg-blue-500'
                                                }`}
                                            style={{
                                                width: `${(passwordStrength.score / 5) * 100}%`
                                            }}
                                        ></div>
                                    </div>
                                    {passwordStrength.feedback && passwordStrength.feedback.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-xs text-gray-600">
                                                {t('common.suggestion')}: {passwordStrength.feedback.join(', ')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MFA Field Group */}
                    {formData.type === 'mfa' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <KeyIcon className="w-4 h-4" />
                                {t('fields.secret')}
                            </Label>
                            <div className="space-y-3">
                                {/* MFA 输入框和选择图片按钮 */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.secret}
                                        onChange={(e) => handleInputChange('secret', e.target.value)}
                                        onPaste={handlePasteInSecretInput}
                                        className="flex h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200"
                                        placeholder={getPlaceholder('secret')}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleQRCodeScan('image')}
                                        className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-md text-sm font-medium transition-all duration-200 border border-green-200 whitespace-nowrap"
                                    >
                                        <DocumentIcon className="w-4 h-4" />
                                        {t('actions.uploadImage')}
                                    </button>
                                </div>

                                {/* 隐藏的文件输入 */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                {/* 提示信息 */}
                                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                                    <div className="flex items-center gap-1 mb-1">
                                        <QrCodeIcon className="w-3 h-3" />
                                        <span className="font-medium">{t('common.qrCodeAnalysis')}</span>
                                    </div>
                                    <p>• {t('common.pasteInstructions')}</p>
                                    <p>• {t('common.selectImageInstructions')}</p>
                                </div>
                            </div>

                            {formData.secret && (
                                <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                                    <TOTPDisplay
                                        secret={formData.secret}
                                        issuer={formData.website || 'Ciphora'}
                                        accountName={t('common.newAccount')}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Base64 Field Group */}
                    {formData.type === 'base64' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <DocumentTextIcon className="w-4 h-4" />
                                {t('fields.base64Data')}
                            </Label>
                            <textarea
                                value={formData.base64Data}
                                onChange={(e) => handleInputChange('base64Data', e.target.value)}
                                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200 resize-none"
                                rows={4}
                                placeholder={getPlaceholder('base64Data')}
                                required
                            />
                        </div>
                    )}

                    {/* String Field Group */}
                    {formData.type === 'string' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <DocumentTextIcon className="w-4 h-4" />
                                {t('fields.stringData')}
                            </Label>
                            <textarea
                                value={formData.stringData}
                                onChange={(e) => handleInputChange('stringData', e.target.value)}
                                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200 resize-none"
                                rows={4}
                                placeholder={getPlaceholder('stringData')}
                                required
                            />
                        </div>
                    )}

                    {/* JSON Field Group */}
                    {formData.type === 'json' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <DocumentTextIcon className="w-4 h-4" />
                                {t('fields.jsonData')}
                            </Label>
                            <textarea
                                value={formData.jsonData}
                                onChange={(e) => handleInputChange('jsonData', e.target.value)}
                                className="flex min-h-[120px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200 resize-none font-mono"
                                rows={6}
                                placeholder={getPlaceholder('jsonData')}
                                required
                            />
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                            {t('fields.notes')}
                        </Label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200 resize-none"
                            rows={3}
                            placeholder={getPlaceholder('notes')}
                        />
                    </div>

                    {/* Group Selection */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <TagIcon className="w-4 h-4" />
                            {t('fields.group')}
                        </Label>
                        <Select
                            value={formData.groupId || 'ungrouped'}
                            onValueChange={(value) => handleInputChange('groupId', value === 'ungrouped' ? null : value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('fields.selectGroup')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ungrouped">
                                    <span className="flex items-center gap-1.5">
                                        <div style={{
                                            width: 16, height: 16, display: 'inline-block', flexShrink: 0,
                                            backgroundColor: '#6B7280',
                                            maskImage: `url(/icons/System/folder-open-fill.svg)`,
                                            WebkitMaskImage: `url(/icons/System/folder-open-fill.svg)`,
                                            maskSize: '100% 100%',
                                            WebkitMaskSize: '100% 100%',
                                        }} />
                                        {t('common.ungrouped')}
                                    </span>
                                </SelectItem>
                                {groups.map(group => {
                                    const iconUrl = group.icon?.includes('/')
                                        ? `/icons/${group.icon.split('/')[0].replace(/ /g, '%20')}/${group.icon.split('/')[1]}.svg`
                                        : null;
                                    return (
                                        <SelectItem key={group.id} value={group.id}>
                                            <span className="flex items-center gap-1.5" style={{ color: group.color }}>
                                                {iconUrl
                                                    ? <div style={{
                                                        width: 16, height: 16, display: 'inline-block', flexShrink: 0,
                                                        backgroundColor: group.iconColor || group.color,
                                                        maskImage: `url(${iconUrl})`, WebkitMaskImage: `url(${iconUrl})`,
                                                        maskSize: '100% 100%', WebkitMaskSize: '100% 100%',
                                                    }} />
                                                    : group.icon}
                                                {group.name}
                                            </span>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 font-medium"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
                        >
                            {t('actions.saveRecord')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPasswordModal;