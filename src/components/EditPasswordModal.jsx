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
    DocumentIcon
} from '@heroicons/react/24/outline';
import TOTPDisplay from './TOTPDisplay';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import jsQR from 'jsqr';

const EditPasswordModal = ({ password, onClose, onSave }) => {
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
        notes: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(null);
    const fileInputRef = React.useRef(null);

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

    useEffect(() => {
        if (password) {
            setFormData({
                type: password.type || 'password',
                website: password.website || '',
                url: password.url || '',
                urlSuffix: password.urlSuffix || '',
                showUrl: password.showUrl !== undefined ? password.showUrl : true,
                username: password.username || '',
                password: password.password || '',
                secret: password.secret || '',
                base64Data: password.base64Data || '',
                stringData: password.stringData || '',
                jsonData: password.jsonData || '',
                notes: password.notes || ''
            });
        }
    }, [password]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...password, ...formData });
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
                                alert('未检测到有效的 MFA 密钥，请确保二维码包含正确的密钥格式');
                            }
                        } else {
                            alert('未检测到有效的二维码，请确保图片中包含清晰的二维码');
                        }
                    } catch (error) {
                        console.error('二维码解析失败:', error);
                        alert('二维码解析失败，请重试或手动输入 MFA 密钥');
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
                    alert('未检测到有效的 MFA 密钥，请确保二维码包含正确的密钥格式');
                }
            } else {
                alert('未检测到有效的二维码，请选择包含二维码的图片');
            }
        } catch (error) {
            console.error('文件解析失败:', error);
            alert('文件解析失败，请重试');
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
            alert('二维码解析失败，请重试或手动输入 MFA 密钥');
        }
    };

    // 根据类型获取占位符文字
    const getPlaceholder = (field) => {
        const placeholders = {
            website: {
                password: "比如 qq.com / bilibili user",
                mfa: "比如 Google Authenticator / Microsoft Authenticator",
                base64: "比如 证书文件 / 密钥文件",
                string: "比如 API密钥 / 令牌",
                json: "比如 配置文件 / 数据文件"
            },
            username: {
                password: "输入用户名或邮箱",
                base64: "输入文件名称或标识",
                string: "输入数据标识或名称",
                json: "输入配置名称或标识"
            },
            password: "输入密码",
            secret: "输入Base32格式的MFA密钥",
            base64Data: "输入或粘贴Base64编码的数据",
            stringData: "输入要存储的字符串数据",
            jsonData: '输入JSON数据，例如: {"key": "value", "number": 123}',
            notes: "添加任何备注信息"
        };

        if (field === 'website' || field === 'username') {
            return placeholders[field][formData.type] || placeholders[field]['password'];
        }
        return placeholders[field] || "";
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

    if (!password) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br rounded-lg flex items-center justify-center">
                                <KeyIcon className="w-5 h-5 text-neutral-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">编辑记录</h3>
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
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <TagIcon className="w-4 h-4" />
                            数据类型
                        </Label>
                        <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="选择数据类型" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="password">🔐 密码</SelectItem>
                                <SelectItem value="mfa">⏰ MFA密钥</SelectItem>
                                <SelectItem value="base64">📄 Base64数据</SelectItem>
                                <SelectItem value="string">📝 字符串</SelectItem>
                                <SelectItem value="json">🔧 JSON数据</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <GlobeAltIcon className="w-4 h-4" />
                            网站/应用名称
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
                            网址 (可选)
                        </Label>
                        <input
                            type="text"
                            value={formData.url}
                            onChange={(e) => {
                                handleInputChange('url', e.target.value);
                                if (e.target.value && !formData.url) {
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
                                    if (!formData.url) {
                                        handleInputChange('showUrl', true);
                                    }
                                }
                            }}
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200"
                            placeholder="例如: https://www.example.com"
                        />
                    </div>

                    {/* URL Suffix */}
                    {formData.url && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <GlobeAltIcon className="w-4 h-4" />
                                登录后缀 (可选)
                            </Label>
                            <input
                                type="text"
                                value={formData.urlSuffix}
                                onChange={(e) => handleInputChange('urlSuffix', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200"
                                placeholder="例如: /login 或 /auth"
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
                                在卡片上显示网址
                            </Label>
                        </div>
                    )}

                    {formData.type !== 'mfa' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4" />
                                用户名/标识
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

                    {/* 编辑密码字段组 */}
                    {formData.type === 'password' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <KeyIcon className="w-4 h-4" />
                                密码
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
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-neutral-700 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
                                >
                                    <SparklesIcon className="w-4 h-4" />
                                    <span>生成</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* MFA Field Group */}
                    {formData.type === 'mfa' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <KeyIcon className="w-4 h-4" />
                                MFA密钥
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
                                        选择图片
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
                                        <span className="font-medium">二维码解析</span>
                                    </div>
                                    <p>• 直接粘贴：在输入框中粘贴文字或图片，图片会自动解析</p>
                                    <p>• 选择图片：从文件中选择包含二维码的图片</p>
                                </div>
                            </div>

                            {formData.secret && (
                                <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                                    <TOTPDisplay
                                        secret={formData.secret}
                                        issuer={formData.website || 'Ciphora'}
                                        accountName={formData.username || 'Account'}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* 编辑Base64字段组 */}
                    {formData.type === 'base64' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <DocumentTextIcon className="w-4 h-4" />
                                Base64数据
                            </Label>
                            <textarea
                                value={formData.base64Data}
                                onChange={(e) => handleInputChange('base64Data', e.target.value)}
                                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200"
                                placeholder={getPlaceholder('base64Data')}
                                rows={4}
                                required
                            />
                        </div>
                    )}

                    {/* 编辑字符串字段组 */}
                    {formData.type === 'string' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <DocumentTextIcon className="w-4 h-4" />
                                字符串数据
                            </Label>
                            <textarea
                                value={formData.stringData}
                                onChange={(e) => handleInputChange('stringData', e.target.value)}
                                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200"
                                placeholder={getPlaceholder('stringData')}
                                rows={4}
                                required
                            />
                        </div>
                    )}

                    {/* 编辑JSON字段组 */}
                    {formData.type === 'json' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <DocumentTextIcon className="w-4 h-4" />
                                JSON数据
                            </Label>
                            <textarea
                                value={formData.jsonData}
                                onChange={(e) => handleInputChange('jsonData', e.target.value)}
                                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200 font-mono"
                                placeholder={getPlaceholder('jsonData')}
                                rows={6}
                                required
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                            备注 (可选)
                        </Label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 transition-all duration-200"
                            placeholder={getPlaceholder('notes')}
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 font-medium"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
                        >
                            保存更改
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPasswordModal; 