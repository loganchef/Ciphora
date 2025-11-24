import React, { useState } from 'react';
import {
    EyeIcon,
    EyeSlashIcon,
    ClipboardDocumentIcon,
    PencilIcon,
    TrashIcon,
    RectangleStackIcon,
    UserIcon,
    KeyIcon,
    ClockIcon,
    DocumentTextIcon,
    GlobeAltIcon,
    QrCodeIcon,
    XMarkIcon,
    ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import TOTPDisplay from './TOTPDisplay';
import CopyButton from './CopyButton';
import DataDisplayModal from './DataDisplayModal';
import QRCode from 'qrcode';

// --- SVG Icons ---
const CheckCircleIcon = (props) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const LockIcon = (props) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <circle cx="12" cy="16" r="1"></circle>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
);

// --- Helper Components ---
const DashedLine = () => (
    <div
        className="w-full border-t-2 border-dashed border-gray-200"
        aria-hidden="true"
    />
);


const PasswordCard = ({ password, onEdit, onDelete, className = "", hideSensitiveButtons = false }) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showQRCode, setShowQRCode] = useState(false);
    const [dataDisplayModal, setDataDisplayModal] = useState({
        isOpen: false,
        title: '',
        data: '',
        type: 'text'
    });

    React.useEffect(() => {
        const mountTimer = setTimeout(() => setShowConfetti(true), 100);
        const unmountTimer = setTimeout(() => setShowConfetti(false), 3000);
        return () => {
            clearTimeout(mountTimer);
            clearTimeout(unmountTimer);
        };
    }, []);

    // 生成 TOTP 二维码
    const generateTOTPQRCode = async () => {
        try {
            // 使用前端生成二维码
            const qrDataURL = await generateQRCodeFrontend();
            if (qrDataURL) {
                // 显示二维码
                setShowQRCode(true);
                // 将二维码显示在容器中
                setTimeout(() => {
                    const container = document.getElementById(`qrcode-container-${password.id}`);
                    if (container) {
                        container.innerHTML = `<img src="${qrDataURL}" alt="TOTP QR Code" className="w-48 h-48" />`;
                    }
                }, 100);
            } else {
                alert('生成二维码失败，请重试');
            }
        } catch (error) {
            console.error('生成二维码失败:', error);
            alert('生成二维码失败，请重试');
        }
    };

    // 前端生成二维码（使用 qrcode 库）
    const generateQRCodeFrontend = async () => {
        try {
            // 构造 otpauth URL
            const issuer = password.website || 'Ciphora';
            const accountName = password.username || 'Account';
            const otpauthURL = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${password.secret}&issuer=${encodeURIComponent(issuer)}`;

            // 使用 qrcode 库生成二维码
            const qrDataURL = await QRCode.toDataURL(otpauthURL, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return qrDataURL;
        } catch (error) {
            console.error('前端生成二维码失败:', error);
            return null;
        }
    };

    const getTypeBadge = (type) => {
        const badges = {
            password: { text: '密码', color: 'bg-blue-100 text-blue-800 border-blue-200' },
            mfa: { text: 'MFA', color: 'bg-green-100 text-green-800 border-green-200' },
            base64: { text: 'Base64', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
            string: { text: '字符串', color: 'bg-red-100 text-red-800 border-red-200' },
            json: { text: 'JSON', color: 'bg-purple-100 text-purple-800 border-purple-200' }
        };
        return badges[type] || badges.string;
    };

    const getTypeIcon = (type) => {
        const icons = {
            password: <LockIcon className="w-5 h-5" />,
            mfa: <ClockIcon className="w-5 h-5" />,
            base64: <KeyIcon className="w-5 h-5" />,
            string: <UserIcon className="w-5 h-5" />,
            json: <DocumentTextIcon className="w-5 h-5" />
        };
        return icons[type] || icons.string;
    };

    const badge = getTypeBadge(password.type);
    const icon = getTypeIcon(password.type);

    const formatDate = (dateString) => {
        if (!dateString) return '未知';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    return (
        <div className={`relative w-full max-w-lg bg-white text-gray-900 rounded-2xl shadow-lg font-sans animate-in fade-in-0 zoom-in-95 duration-500 ${className}`}>
            {/* Card cut-out effect */}
            {/* <div className="absolute -left-4 top-1/2  w-8 h-8 rounded-full bg-[#F3F8FE]" />
            <div className="absolute -right-4 top-1/2  w-8 h-8 rounded-full bg-[#F3F8FE]" /> */}

            {/* Type watermark background */}
            <div className="absolute top-16 right-6 z-0">
                <div className={`text-2xl font-black opacity-10 ${badge.color.replace('bg-', 'text-').replace('text-', '').replace('border-', '')}`}>
                    {badge.text}
                </div>
            </div>

            {/* Header */}
            <div className="pt-4 pb-6 px-6 text-gray-800 rounded-t-2xl relative">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                            {icon}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg truncate">{password.website}</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onEdit(password)}
                            className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 border border-gray-200"
                            title="编辑"
                        >
                            <PencilIcon className="w-4 h-4" />
                        </button>
                        {!hideSensitiveButtons && (
                            <button
                                onClick={() => onDelete(password)}
                                className="flex items-center justify-center w-8 h-8 bg-red-50 hover:bg-red-100 rounded-lg transition-all duration-200 border border-red-200 text-red-700"
                                title="删除"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 space-y-4">
                <DashedLine />

                {/* URL section - only show if url exists and showUrl is true */}
                {password.url && password.showUrl && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <GlobeAltIcon className="w-4 h-4" />
                            <span>网址</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-50 px-4 py-3 rounded-xl text-sm border border-gray-200 truncate">
                                {password.url}
                            </div>
                            <button
                                onClick={async () => {
                                    const fullUrl = password.url + (password.urlSuffix || '');
                                    if (window.api && window.api.openUrl) {
                                        await window.api.openUrl(fullUrl);
                                    } else {
                                        window.open(fullUrl, '_blank');
                                    }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
                            >
                                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                打开
                            </button>
                        </div>
                    </div>
                )}

                {/* Username section - only show if username exists */}
                {password.username && password.username.trim() && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <UserIcon className="w-4 h-4" />
                            <span>用户名</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-50 px-4 py-3 rounded-xl font-mono text-sm border border-gray-200">
                                {password.username}
                            </div>
                            <CopyButton text={password.username} label="复制" />
                        </div>
                    </div>
                )}

                {/* Password section */}
                {password.type === 'password' && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <KeyIcon className="w-4 h-4" />
                            <span>密码</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-50 px-4 py-3 rounded-xl font-mono text-sm border border-gray-200 flex items-center justify-between">
                                <span className={isPasswordVisible ? '' : 'select-none'}>
                                    {isPasswordVisible ? password.password : '••••••••••••••••'}
                                </span>
                                <button
                                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {isPasswordVisible ? (
                                        <EyeSlashIcon className="w-4 h-4" />
                                    ) : (
                                        <EyeIcon className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            <CopyButton text={password.password} label="复制" />
                        </div>
                    </div>
                )}

                {/* String section */}
                {password.type === 'string' && password.stringData && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>字符串数据</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-50 px-4 py-3 rounded-xl font-mono text-sm border border-gray-200 max-h-32 overflow-y-auto">
                                <pre className="whitespace-pre-wrap break-words">{password.stringData}</pre>
                            </div>
                            <CopyButton text={password.stringData} label="复制" />
                        </div>
                    </div>
                )}

                {/* Base64 section */}
                {password.type === 'base64' && password.base64Data && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>Base64数据</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-50 px-4 py-3 rounded-xl font-mono text-sm border border-gray-200 max-h-32 overflow-y-auto">
                                <pre className="whitespace-pre-wrap break-all">{password.base64Data}</pre>
                            </div>
                            <CopyButton text={password.base64Data} label="复制原始" />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setDataDisplayModal({
                                        isOpen: true,
                                        title: 'Base64完整显示',
                                        data: password.base64Data,
                                        type: 'base64'
                                    });
                                }}
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                            >
                                弹窗显示
                            </button>
                        </div>
                    </div>
                )}

                {/* JSON section */}
                {password.type === 'json' && password.jsonData && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>JSON数据</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-50 px-4 py-3 rounded-xl font-mono text-sm border border-gray-200 max-h-32 overflow-y-auto">
                                <pre className="whitespace-pre-wrap break-words">{password.jsonData}</pre>
                            </div>
                            <CopyButton text={password.jsonData} label="复制" />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setDataDisplayModal({
                                        isOpen: true,
                                        title: 'JSON完整显示',
                                        data: password.jsonData,
                                        type: 'json'
                                    });
                                }}
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                            >
                                弹窗显示
                            </button>
                        </div>
                    </div>
                )}

                {/* MFA section */}
                {password.type === 'mfa' && password.secret && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <ClockIcon className="w-4 h-4" />
                                <span>动态验证码</span>
                            </div>
                            <button
                                onClick={generateTOTPQRCode}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors duration-200"
                                title="生成二维码"
                            >
                                <QrCodeIcon className="w-3 h-3" />
                                二维码
                            </button>
                        </div>
                        <TOTPDisplay
                            secret={password.secret}
                            issuer={password.website || 'Ciphora'}
                            accountName={password.username || 'Account'}
                        />

                        {/* 二维码显示 */}
                        {showQRCode && (
                            <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">TOTP 二维码</span>
                                    <button
                                        onClick={() => setShowQRCode(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex justify-center">
                                    <div id={`qrcode-container-${password.id}`} className="p-2 bg-white rounded border">
                                        {/* 二维码将在这里显示 */}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2 text-center">
                                    使用 Google Authenticator 等应用扫描此二维码
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Additional info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">创建时间</p>
                        <p className="font-medium">{formatDate(password.createdAt)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">最后更新</p>
                        <p className="font-medium">{formatDate(password.updatedAt)}</p>
                    </div>
                </div>

                <DashedLine />

                {/* Notes info */}
                {password.notes && (
                    <div className="bg-gray-50 p-4 rounded-xl flex items-center space-x-3">
                        <RectangleStackIcon className="w-5 h-5 text-gray-600" />
                        <div>
                            <p className="font-medium text-gray-900 text-sm">{password.notes}</p>
                        </div>
                    </div>
                )}
                {
                    !password.notes && password.website && (
                        <div className="bg-gray-50 p-4 rounded-xl flex items-center space-x-3">
                            <GlobeAltIcon className="w-5 h-5 text-gray-600" />
                            <div>
                                <p className="font-medium text-gray-900 text-sm">{password.website}</p>
                            </div>
                        </div>
                    )
                }
            </div>

            {/* 数据显示模态框 */}
            <DataDisplayModal
                isOpen={dataDisplayModal.isOpen}
                onClose={() => setDataDisplayModal(prev => ({ ...prev, isOpen: false }))}
                title={dataDisplayModal.title}
                data={dataDisplayModal.data}
                type={dataDisplayModal.type}
            />
        </div>
    );
};

export default PasswordCard; 