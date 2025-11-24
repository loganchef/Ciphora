import React, { useState } from 'react';
import TOTPDisplay from './TOTPDisplay';

const PasswordItem = ({ password, onEdit }) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const getTypeBadge = (type) => {
        const badges = {
            password: { text: '密码', color: 'bg-blue-100 text-blue-800' },
            mfa: { text: 'MFA', color: 'bg-green-100 text-green-800' },
            base64: { text: 'Base64', color: 'bg-yellow-100 text-yellow-800' },
            string: { text: '字符串', color: 'bg-red-100 text-red-800' },
            json: { text: 'JSON', color: 'bg-purple-100 text-purple-800' }
        };
        return badges[type] || badges.string;
    };

    const getTypeIcon = (type) => {
        const icons = {
            password: (
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <circle cx="12" cy="16" r="1"></circle>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
            ),
            mfa: (
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6"></path>
                    <path d="M19.78 4.22l-4.24 4.24"></path>
                    <path d="M4.22 19.78l4.24-4.24"></path>
                </svg>
            ),
            base64: (
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
            ),
            string: (
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                </svg>
            ),
            json: (
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20V10"></path>
                    <path d="M12 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path>
                    <path d="M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path>
                </svg>
            )
        };
        return icons[type] || icons.string;
    };

    const badge = getTypeBadge(password.type);
    const icon = getTypeIcon(password.type);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // 这里可以添加一个toast通知
    };

    return (
        <div className="card hover:shadow-xl transition-all duration-300 group">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {icon}
                        <span className="font-semibold truncate">{password.website}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color} bg-white/20 backdrop-blur-sm`}>
                            {badge.text}
                        </span>
                    </div>
                    <button
                        onClick={() => onEdit(password)}
                        className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
                    >
                        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <div className="p-6">
                <div className="space-y-4">
                    {/* URL section - only show if url exists and showUrl is true */}
                    {password.url && password.showUrl && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">网址</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-50 px-3 py-2 rounded-xl text-sm truncate">
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
                                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                    打开
                                </button>
                            </div>
                        </div>
                    )}

                    {password.type !== 'mfa' && password.username && password.username.trim() && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">用户名</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-50 px-3 py-2 rounded-xl font-mono text-sm">
                                    {password.username}
                                </div>
                                <button
                                    onClick={() => copyToClipboard(password.username)}
                                    className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl text-sm font-medium transition-colors"
                                >
                                    复制
                                </button>
                            </div>
                        </div>
                    )}

                    {password.type === 'password' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">密码</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-50 px-3 py-2 rounded-xl font-mono text-sm">
                                    {isPasswordVisible ? password.password : '••••••••••••••••'}
                                </div>
                                <button
                                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                                >
                                    {isPasswordVisible ? '隐藏' : '显示'}
                                </button>
                                <button
                                    onClick={() => copyToClipboard(password.password)}
                                    className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl text-sm font-medium transition-colors"
                                >
                                    复制
                                </button>
                            </div>
                        </div>
                    )}

                    {password.type === 'mfa' && (
                        <TOTPDisplay
                            secret={password.secret}
                            issuer={password.website || 'Ciphora'}
                            accountName={password.username || 'Account'}
                        />
                    )}

                    {password.notes && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">备注</label>
                            <div className="bg-gray-50 px-3 py-2 rounded-xl text-sm text-gray-700">
                                {password.notes}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PasswordItem; 