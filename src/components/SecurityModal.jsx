import React, { useState } from 'react';
import { XMarkIcon, ShieldCheckIcon, KeyIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const SecurityModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview');

    if (!isOpen) return null;

    const tabs = [
        { id: 'overview', name: '安全概览', icon: ShieldCheckIcon },
        { id: 'encryption', name: '加密原理', icon: LockClosedIcon },
        { id: 'architecture', name: '架构设计', icon: KeyIcon }
    ];

    const renderOverview = () => (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                    安全特性
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-medium text-gray-900 mb-2">AES-256-GCM 加密</h4>
                        <p className="text-sm text-gray-600">使用带认证标签的 GCM 模式，防止篡改与伪造</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-medium text-gray-900 mb-2">Argon2id 密钥派生</h4>
                        <p className="text-sm text-gray-600">抗 GPU 暴力破解的 KDF，内置随机盐与资源限制</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-medium text-gray-900 mb-2">设备绑定</h4>
                        <p className="text-sm text-gray-600">每台设备生成唯一 ID 与设置文件，离线隔离</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-medium text-gray-900 mb-2">TOTP MFA</h4>
                        <p className="text-sm text-gray-600">内置 TOTP 生成与验证器，支持双因素安全登录</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">安全承诺</h3>
                <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>所有密码数据在本地加密存储，不会上传到任何服务器</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>使用强加密算法，即使数据泄露也无法被破解</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>开源代码，安全算法透明可验证</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>支持备份恢复，数据永不丢失</span>
                    </li>
                </ul>
            </div>
        </div>
    );

    const renderEncryption = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">加密流程</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                        <div>
                            <h4 className="font-medium text-gray-900">主密码输入</h4>
                            <p className="text-sm text-gray-600">用户输入主密码，系统进行验证</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                        <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                        <div>
                            <h4 className="font-medium text-gray-900">密钥派生</h4>
                            <p className="text-sm text-gray-600">Argon2id 结合随机盐与设备 ID 派生 256 位密钥</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
                        <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                        <div>
                            <h4 className="font-medium text-gray-900">数据加密</h4>
                            <p className="text-sm text-gray-600">用 AES-256-GCM + 随机 96bit Nonce 保护密码正文</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg">
                        <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                        <div>
                            <h4 className="font-medium text-gray-900">安全存储</h4>
                            <p className="text-sm text-gray-600">加密结果 + Nonce + 盐以 Base64 形式保存在本地</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">技术细节</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">AES-256-GCM</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• 密钥长度：256 位</li>
                            <li>• 模式：GCM（带认证标签）</li>
                            <li>• Nonce：随机 96 bit</li>
                            <li>• 输出：密文 + Tag + Nonce</li>
                        </ul>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Argon2id</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Memory：64 MB</li>
                            <li>• Iterations：3+</li>
                            <li>• 盐值：随机 128 bit + 设备 ID</li>
                            <li>• 输出：32 字节对称密钥</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderArchitecture = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">系统架构</h3>
                <div className="space-y-4">
                    {/* 前端层 */}
                    <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                        <h4 className="font-semibold text-blue-900 mb-2">前端层 (React + Electron)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div className="bg-white rounded p-2 text-center">登录界面</div>
                            <div className="bg-white rounded p-2 text-center">密码管理</div>
                            <div className="bg-white rounded p-2 text-center">设置页面</div>
                            <div className="bg-white rounded p-2 text-center">MFA验证</div>
                        </div>
                    </div>

                    {/* IPC通信层 */}
                    <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                        <h4 className="font-semibold text-green-900 mb-2">IPC通信层</h4>
                        <div className="text-sm text-green-800">
                            <p>• 安全的进程间通信</p>
                            <p>• API接口封装</p>
                            <p>• 权限控制</p>
                        </div>
                    </div>

                    {/* 后端服务层 */}
                    <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                        <h4 className="font-semibold text-purple-900 mb-2">后端服务层 (Node.js)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                            <div className="bg-white rounded p-2 text-center">认证服务</div>
                            <div className="bg-white rounded p-2 text-center">加密服务</div>
                            <div className="bg-white rounded p-2 text-center">存储服务</div>
                            <div className="bg-white rounded p-2 text-center">MFA服务</div>
                            <div className="bg-white rounded p-2 text-center">导入导出</div>
                            <div className="bg-white rounded p-2 text-center">密码生成</div>
                        </div>
                    </div>

                    {/* 数据存储层 */}
                    <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                        <h4 className="font-semibold text-orange-900 mb-2">数据存储层</h4>
                        <div className="text-sm text-orange-800">
                            <p>• 本地文件系统存储</p>
                            <p>• AES-256加密保护</p>
                            <p>• 设备绑定验证</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">安全设计原则</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-blue-600 text-xs font-bold">零</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900">零知识架构</h4>
                                <p className="text-sm text-gray-600">服务器无法获取用户密码数据</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-green-600 text-xs font-bold">端</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900">端到端加密</h4>
                                <p className="text-sm text-gray-600">数据在客户端加密，服务端无法解密</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-purple-600 text-xs font-bold">开</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900">开源透明</h4>
                                <p className="text-sm text-gray-600">代码开源，安全算法可验证</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-orange-600 text-xs font-bold">备</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900">备份恢复</h4>
                                <p className="text-sm text-gray-600">支持加密备份，数据永不丢失</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in safe-area-top safe-area-bottom">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                        安全加密原理
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <tab.icon className="w-4 h-4" />
                                    {tab.name}
                                </div>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'encryption' && renderEncryption()}
                    {activeTab === 'architecture' && renderArchitecture()}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SecurityModal;