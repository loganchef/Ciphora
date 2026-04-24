import React, { useState } from 'react';
import Icon from './Icon';

const SecurityModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview');

    if (!isOpen) return null;

    const tabs = [
        { id: 'overview', name: '安全概览', icon: 'System/shield-check-fill' },
        { id: 'encryption', name: '加密原理', icon: 'System/lock-fill' },
        { id: 'architecture', name: '系统架构', icon: 'System/cpu-fill' },
    ];

    const renderOverview = () => (
        <div className="space-y-5">
            {/* Hero Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
                <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Icon path="System/shield-check-fill" className="w-6 h-6 brightness-0 invert" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">零信任本地加密</h3>
                            <p className="text-blue-200 text-sm">所有数据仅在本地处理，永不上传</p>
                        </div>
                    </div>
                    <p className="text-sm text-blue-100 leading-relaxed">
                        Ciphora 采用军事级加密算法，主密码永远不会以明文形式存储，即使应用源代码完全公开，攻击者也无法在不知道主密码的情况下解密你的数据。
                    </p>
                </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl p-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mb-3">
                        <Icon path="System/lock-fill" className="w-4 h-4 brightness-0 invert" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">AES-256-GCM</h4>
                    <p className="text-xs text-gray-600">带认证标签的加密模式，同时保证机密性与完整性</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-xl p-4">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mb-3">
                        <Icon path="System/shield-keyhole-fill" className="w-4 h-4 brightness-0 invert" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">Argon2id KDF</h4>
                    <p className="text-xs text-gray-600">抗 GPU 暴力破解，内存硬性密钥派生函数</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 rounded-xl p-4">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mb-3">
                        <Icon path="Device/cpu-fill" className="w-4 h-4 brightness-0 invert" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">设备绑定</h4>
                    <p className="text-xs text-gray-600">每台设备唯一 ID 参与密钥派生，防止跨设备暴力破解</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 rounded-xl p-4">
                    <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center mb-3">
                        <Icon path="System/shield-check-fill" className="w-4 h-4 brightness-0 invert" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">TOTP 双因素</h4>
                    <p className="text-xs text-gray-600">内置 TOTP 生成与验证，支持双因素安全登录</p>
                </div>
            </div>

            {/* Security Commitments */}
            <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">安全承诺</h3>
                <div className="space-y-2.5">
                    {[
                        { icon: 'System/lock-password-fill', text: '主密码从不以明文存储，仅在内存中短暂存在用于解密' },
                        { icon: 'System/wifi-off-fill', text: '完全离线运行，所有加密解密均在本地完成，不依赖网络' },
                        { icon: 'System/shield-keyhole-fill', text: '每条记录使用独立随机 Nonce，相同内容加密结果不同' },
                        { icon: 'Development/code-box-fill', text: '代码完全开源，加密算法透明可审计，拒绝安全通过混淆' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <Icon path={item.icon} className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-600">{item.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderEncryption = () => (
        <div className="space-y-5">
            {/* Encryption Flow */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">加密流程</h3>
                <div className="space-y-2">
                    {[
                        {
                            step: 1,
                            color: 'blue',
                            icon: 'System/login-box-fill',
                            title: '主密码输入',
                            desc: '用户输入主密码，系统获取设备唯一 ID',
                            detail: 'masterPassword + deviceId',
                        },
                        {
                            step: 2,
                            color: 'green',
                            icon: 'System/shield-keyhole-fill',
                            title: 'Argon2id 密钥派生',
                            desc: '结合随机盐值通过 Argon2id 派生 256 位对称密钥',
                            detail: 'Argon2id(password, salt+deviceId) → 32 bytes key',
                        },
                        {
                            step: 3,
                            color: 'purple',
                            icon: 'System/lock-fill',
                            title: 'AES-256-GCM 加密',
                            desc: '生成随机 96-bit Nonce，加密密码数据',
                            detail: 'AES-256-GCM(key, nonce, plaintext) → ciphertext + tag',
                        },
                        {
                            step: 4,
                            color: 'orange',
                            icon: 'Document/file-shield-2-fill',
                            title: 'Base64 持久化',
                            desc: '将密文、Nonce、盐一同编码后存储到本地文件',
                            detail: 'Base64(salt || nonce || tag || ciphertext) → vault.json',
                        },
                    ].map(({ step, color, icon, title, desc, detail }) => (
                        <div key={step} className={`flex gap-4 p-4 rounded-xl bg-${color}-50 border border-${color}-100`}>
                            <div className={`w-8 h-8 bg-${color}-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                                {step}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon path={icon} className="w-4 h-4" />
                                    <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
                                <code className={`text-xs text-${color}-700 bg-${color}-100/60 px-2 py-0.5 rounded mt-1.5 inline-block font-mono`}>
                                    {detail}
                                </code>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Technical Specs */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">算法参数</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="border border-gray-200 rounded-xl p-4 bg-white">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Icon path="System/lock-fill" className="w-3.5 h-3.5" />
                            </div>
                            <h4 className="font-semibold text-gray-900 text-sm">AES-256-GCM</h4>
                        </div>
                        <div className="space-y-1.5 text-xs text-gray-600">
                            <div className="flex justify-between">
                                <span className="text-gray-500">密钥长度</span>
                                <span className="font-medium text-gray-900">256 bit</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Nonce</span>
                                <span className="font-medium text-gray-900">随机 96 bit</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Tag 长度</span>
                                <span className="font-medium text-gray-900">128 bit</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">安全属性</span>
                                <span className="font-medium text-green-600">AEAD 认证加密</span>
                            </div>
                        </div>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-4 bg-white">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                                <Icon path="System/shield-keyhole-fill" className="w-3.5 h-3.5" />
                            </div>
                            <h4 className="font-semibold text-gray-900 text-sm">Argon2id</h4>
                        </div>
                        <div className="space-y-1.5 text-xs text-gray-600">
                            <div className="flex justify-between">
                                <span className="text-gray-500">内存用量</span>
                                <span className="font-medium text-gray-900">64 MB</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">迭代次数</span>
                                <span className="font-medium text-gray-900">≥ 3</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">盐值</span>
                                <span className="font-medium text-gray-900">随机 128 bit</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">输出</span>
                                <span className="font-medium text-green-600">32 字节对称密钥</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Attack Resistance */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-3">攻击防护</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                        { attack: '暴力破解', protection: 'Argon2id 高内存消耗', icon: 'System/shield-flash-fill' },
                        { attack: '字典攻击', protection: '随机盐 + 设备 ID 绑定', icon: 'System/shield-keyhole-fill' },
                        { attack: '数据篡改', protection: 'GCM 认证标签检测', icon: 'System/shield-check-fill' },
                        { attack: '彩虹表', protection: '每次派生唯一盐值', icon: 'System/shield-star-fill' },
                    ].map(({ attack, protection, icon }, i) => (
                        <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2.5">
                            <Icon path={icon} className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                            <div>
                                <div className="text-red-700 font-medium">{attack}</div>
                                <div className="text-gray-500">{protection}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderArchitecture = () => (
        <div className="space-y-5">
            {/* Stack Diagram */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">技术栈</h3>
                <div className="space-y-2">
                    {/* Frontend */}
                    <div className="border-2 border-blue-300 rounded-xl overflow-hidden">
                        <div className="bg-blue-600 px-4 py-2 flex items-center gap-2">
                            <Icon path="Development/code-box-fill" className="w-3.5 h-3.5 brightness-0 invert" />
                            <span className="text-white text-xs font-semibold tracking-wide uppercase">前端层 · React + Vite</span>
                        </div>
                        <div className="bg-blue-50 p-3">
                            <div className="grid grid-cols-4 gap-2">
                                {['登录认证', '密码管理', 'MFA 验证', '导入导出'].map(name => (
                                    <div key={name} className="bg-white rounded-lg px-2 py-2 text-center text-xs text-gray-700 shadow-sm border border-blue-100">
                                        {name}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                {['Tailwind CSS', 'Hero Icons', 'XLSX Parser'].map(name => (
                                    <div key={name} className="bg-blue-100/60 rounded px-2 py-1.5 text-center text-xs text-blue-700">
                                        {name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                        <div className="flex flex-col items-center gap-0.5">
                            <div className="w-0.5 h-3 bg-gray-300" />
                            <div className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">Tauri IPC Bridge</div>
                            <div className="w-0.5 h-3 bg-gray-300" />
                        </div>
                    </div>

                    {/* Backend */}
                    <div className="border-2 border-purple-300 rounded-xl overflow-hidden">
                        <div className="bg-purple-700 px-4 py-2 flex items-center gap-2">
                            <Icon path="Development/bug-fill" className="w-3.5 h-3.5 brightness-0 invert" />
                            <span className="text-white text-xs font-semibold tracking-wide uppercase">后端层 · Rust (Tauri)</span>
                        </div>
                        <div className="bg-purple-50 p-3">
                            <div className="grid grid-cols-3 gap-2">
                                {['认证服务', '加密引擎', '密码存储', 'MFA 服务', '分组管理', '备份恢复'].map(name => (
                                    <div key={name} className="bg-white rounded-lg px-2 py-2 text-center text-xs text-gray-700 shadow-sm border border-purple-100">
                                        {name}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                {['aes-gcm', 'argon2', 'totp'].map(name => (
                                    <div key={name} className="bg-purple-100/60 rounded px-2 py-1.5 text-center text-xs text-purple-700 font-mono">
                                        {name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                        <div className="flex flex-col items-center gap-0.5">
                            <div className="w-0.5 h-3 bg-gray-300" />
                            <div className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">文件系统 I/O</div>
                            <div className="w-0.5 h-3 bg-gray-300" />
                        </div>
                    </div>

                    {/* Storage */}
                    <div className="border-2 border-orange-300 rounded-xl overflow-hidden">
                        <div className="bg-orange-600 px-4 py-2 flex items-center gap-2">
                            <Icon path="Document/file-shield-2-fill" className="w-3.5 h-3.5 brightness-0 invert" />
                            <span className="text-white text-xs font-semibold tracking-wide uppercase">存储层 · 本地加密文件</span>
                        </div>
                        <div className="bg-orange-50 p-3">
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { name: 'vault.json', desc: '加密密码库' },
                                    { name: 'settings.json', desc: '应用配置' },
                                    { name: 'groups.json', desc: '分组数据' },
                                ].map(({ name, desc }) => (
                                    <div key={name} className="bg-white rounded-lg p-2 text-center shadow-sm border border-orange-100">
                                        <div className="text-xs font-mono text-orange-700">{name}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Design Principles */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">设计原则</h3>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        {
                            icon: 'System/home-wifi-fill',
                            title: '完全本地化',
                            desc: '不依赖任何网络服务，所有操作在设备上完成',
                            color: 'blue',
                        },
                        {
                            icon: 'Development/bug-fill',
                            title: 'Rust 内存安全',
                            desc: '后端使用 Rust 语言，编译期消除内存漏洞',
                            color: 'orange',
                        },
                        {
                            icon: 'System/shield-user-fill',
                            title: '最小权限',
                            desc: 'Tauri 严格限制前端对系统资源的访问权限',
                            color: 'purple',
                        },
                        {
                            icon: 'System/shield-flash-fill',
                            title: '纵深防御',
                            desc: '多层安全机制：加密 + 认证 + 设备绑定',
                            color: 'green',
                        },
                    ].map(({ icon, title, desc, color }) => (
                        <div key={title} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-3.5`}>
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mb-2">
                                <Icon path={icon} className={`w-5 h-5 text-${color}-600`} />
                            </div>
                            <h4 className={`text-sm font-semibold text-${color}-900 mb-1`}>{title}</h4>
                            <p className="text-xs text-gray-600">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in safe-area-top safe-area-bottom">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Icon path="System/shield-check-fill" className="w-4 h-4 brightness-0 invert" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">安全加密原理</h2>
                            <p className="text-xs text-gray-500">Ciphora 安全架构说明</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <Icon path="System/close-line" className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 flex-shrink-0">
                    <nav className="flex px-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 py-3 px-3 mr-2 border-b-2 text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <Icon path={tab.icon} className="w-4 h-4" />
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'encryption' && renderEncryption()}
                    {activeTab === 'architecture' && renderArchitecture()}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SecurityModal;
