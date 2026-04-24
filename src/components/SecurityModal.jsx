import React, { useState } from 'react';
import Icon from './Icon';
import { useTranslation } from 'react-i18next';

const SecurityModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('overview');

    if (!isOpen) return null;

    const tabs = [
        { id: 'overview', name: t('modals.security.tabs.overview'), icon: 'System/shield-check-fill' },
        { id: 'encryption', name: t('modals.security.tabs.encryption'), icon: 'System/lock-fill' },
        { id: 'architecture', name: t('modals.security.tabs.architecture'), icon: 'Device/cpu-fill' },
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
                            <h3 className="text-lg font-bold">{t('modals.security.overview.title')}</h3>
                            <p className="text-blue-200 text-sm">{t('modals.security.overview.subtitle')}</p>
                        </div>
                    </div>
                    <p className="text-sm text-blue-100 leading-relaxed">
                        {t('modals.security.overview.desc')}
                    </p>
                </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl p-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mb-3">
                        <Icon path="System/lock-fill" className="w-4 h-4 brightness-0 invert" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">{t('modals.security.features.aes.name')}</h4>
                    <p className="text-xs text-gray-600">{t('modals.security.features.aes.desc')}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-xl p-4">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mb-3">
                        <Icon path="System/shield-keyhole-fill" className="w-4 h-4 brightness-0 invert" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">{t('modals.security.features.argon2.name')}</h4>
                    <p className="text-xs text-gray-600">{t('modals.security.features.argon2.desc')}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 rounded-xl p-4">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mb-3">
                        <Icon path="Device/cpu-fill" className="w-4 h-4 brightness-0 invert" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">{t('modals.security.features.deviceBinding.name')}</h4>
                    <p className="text-xs text-gray-600">{t('modals.security.features.deviceBinding.desc')}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 rounded-xl p-4">
                    <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center mb-3">
                        <Icon path="System/shield-check-fill" className="w-4 h-4 brightness-0 invert" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">{t('modals.security.features.totp.name')}</h4>
                    <p className="text-xs text-gray-600">{t('modals.security.features.totp.desc')}</p>
                </div>
            </div>

            {/* Security Commitments */}
            <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">{t('modals.security.commitments.title')}</h3>
                <div className="space-y-2.5">
                    {[
                        { icon: 'System/lock-password-fill', text: t('modals.security.commitments.item1') },
                        { icon: 'System/wifi-off-fill', text: t('modals.security.commitments.item2') },
                        { icon: 'System/shield-keyhole-fill', text: t('modals.security.commitments.item3') },
                        { icon: 'Development/code-box-fill', text: t('modals.security.commitments.item4') },
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
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">{t('modals.security.encryption.title')}</h3>
                <div className="space-y-2">
                    {[
                        {
                            step: 1,
                            color: 'blue',
                            icon: 'System/login-box-fill',
                            title: t('modals.security.encryption.step1.title'),
                            desc: t('modals.security.encryption.step1.desc'),
                            detail: 'masterPassword + deviceId',
                        },
                        {
                            step: 2,
                            color: 'green',
                            icon: 'System/shield-keyhole-fill',
                            title: t('modals.security.encryption.step2.title'),
                            desc: t('modals.security.encryption.step2.desc'),
                            detail: 'Argon2id(password, salt+deviceId) → 32 bytes key',
                        },
                        {
                            step: 3,
                            color: 'purple',
                            icon: 'System/lock-fill',
                            title: t('modals.security.encryption.step3.title'),
                            desc: t('modals.security.encryption.step3.desc'),
                            detail: 'AES-256-GCM(key, nonce, plaintext) → ciphertext + tag',
                        },
                        {
                            step: 4,
                            color: 'orange',
                            icon: 'Document/file-shield-2-fill',
                            title: t('modals.security.encryption.step4.title'),
                            desc: t('modals.security.encryption.step4.desc'),
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
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">{t('modals.security.encryption.specs.title')}</h3>
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
                                <span className="text-gray-500">{t('modals.security.encryption.specs.keyLength')}</span>
                                <span className="font-medium text-gray-900">256 bit</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Nonce</span>
                                <span className="font-medium text-gray-900">随机 96 bit</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">{t('modals.security.encryption.specs.tagLength')}</span>
                                <span className="font-medium text-gray-900">128 bit</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">{t('modals.security.encryption.specs.securityProps')}</span>
                                <span className="font-medium text-green-600">{t('modals.security.encryption.specs.aead')}</span>
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
                                <span className="text-gray-500">{t('modals.security.encryption.specs.memoryUsage')}</span>
                                <span className="font-medium text-gray-900">64 MB</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">{t('modals.security.encryption.specs.iterations')}</span>
                                <span className="font-medium text-gray-900">≥ 3</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">{t('modals.security.encryption.specs.salt')}</span>
                                <span className="font-medium text-gray-900">随机 128 bit</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">{t('modals.security.encryption.specs.output')}</span>
                                <span className="font-medium text-green-600">{t('modals.security.encryption.specs.keyOutput')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Attack Resistance */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-3">{t('modals.security.attacks.title')}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                        { attack: t('modals.security.attacks.bruteforce'), protection: t('modals.security.attacks.bruteforceProt'), icon: 'System/shield-flash-fill' },
                        { attack: t('modals.security.attacks.dictionary'), protection: t('modals.security.attacks.dictionaryProt'), icon: 'System/shield-keyhole-fill' },
                        { attack: t('modals.security.attacks.tamper'), protection: t('modals.security.attacks.tamperProt'), icon: 'System/shield-check-fill' },
                        { attack: t('modals.security.attacks.rainbow'), protection: t('modals.security.attacks.rainbowProt'), icon: 'System/shield-star-fill' },
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
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">{t('modals.security.architecture.title')}</h3>
                <div className="space-y-2">
                    {/* Frontend */}
                    <div className="border-2 border-blue-300 rounded-xl overflow-hidden">
                        <div className="bg-blue-600 px-4 py-2 flex items-center gap-2">
                            <Icon path="Development/code-box-fill" className="w-3.5 h-3.5 brightness-0 invert" />
                            <span className="text-white text-xs font-semibold tracking-wide uppercase">{t('modals.security.architecture.frontend')}</span>
                        </div>
                        <div className="bg-blue-50 p-3">
                            <div className="grid grid-cols-4 gap-2">
                                {[t('modals.security.architecture.auth'), t('modals.security.architecture.pwdMgr'), t('modals.security.architecture.mfa'), t('modals.security.architecture.importExport')].map(name => (
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
                            <span className="text-white text-xs font-semibold tracking-wide uppercase">{t('modals.security.architecture.backend')}</span>
                        </div>
                        <div className="bg-purple-50 p-3">
                            <div className="grid grid-cols-3 gap-2">
                                {[t('modals.security.architecture.authService'), t('modals.security.architecture.cryptoEngine'), t('modals.security.architecture.pwdStorage'), t('modals.security.architecture.mfaService'), t('modals.security.architecture.groupMgr'), t('modals.security.architecture.backupRestore')].map(name => (
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
                            <span className="text-white text-xs font-semibold tracking-wide uppercase">{t('modals.security.architecture.storage')}</span>
                        </div>
                        <div className="bg-orange-50 p-3">
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { name: 'vault.json', desc: t('modals.security.architecture.vaultFile') },
                                    { name: 'settings.json', desc: t('modals.security.architecture.settingsFile') },
                                    { name: 'groups.json', desc: t('modals.security.architecture.groupsFile') },
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
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">{t('modals.security.principles.title')}</h3>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        {
                            icon: 'System/home-wifi-fill',
                            title: t('modals.security.principles.local.title'),
                            desc: t('modals.security.principles.local.desc'),
                            color: 'blue',
                        },
                        {
                            icon: 'Development/bug-fill',
                            title: t('modals.security.principles.rust.title'),
                            desc: t('modals.security.principles.rust.desc'),
                            color: 'orange',
                        },
                        {
                            icon: 'System/shield-user-fill',
                            title: t('modals.security.principles.leastPriv.title'),
                            desc: t('modals.security.principles.leastPriv.desc'),
                            color: 'purple',
                        },
                        {
                            icon: 'System/shield-flash-fill',
                            title: t('modals.security.principles.defense.title'),
                            desc: t('modals.security.principles.defense.desc'),
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
                            <h2 className="text-base font-semibold text-gray-900">{t('modals.security.title')}</h2>
                            <p className="text-xs text-gray-500">{t('modals.security.subtitle')}</p>
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
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SecurityModal;