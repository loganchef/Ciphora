const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API到渲染进程
contextBridge.exposeInMainWorld('api', {
    // ==================== 认证相关 ====================
    checkInitializationStatus: () => ipcRenderer.invoke('checkInitializationStatus'),
    initialize: (password) => ipcRenderer.invoke('initialize', password),
    login: (password, mfaToken) => ipcRenderer.invoke('login', password, mfaToken),
    logout: () => ipcRenderer.invoke('logout'),
    changeMasterPassword: (oldPassword, newPassword) => 
        ipcRenderer.invoke('change-master-password', oldPassword, newPassword),
    setupMFA: () => ipcRenderer.invoke('setup-mfa'),
    verifyMFA: (token, secret) => ipcRenderer.invoke('verify-mfa', token, secret),

    // ==================== 密码管理相关 ====================
    getPasswords: () => ipcRenderer.invoke('get-passwords'),
    getPassword: (id) => ipcRenderer.invoke('get-password', id),
    addPassword: (item) => ipcRenderer.invoke('add-password', item),
    updatePassword: (id, item) => ipcRenderer.invoke('update-password', id, item),
    deletePassword: (id) => ipcRenderer.invoke('delete-password', id),
    clearPasswords: () => ipcRenderer.invoke('clear-passwords'),
    searchPasswords: (searchTerm) => ipcRenderer.invoke('search-passwords', searchTerm),
    getStatistics: () => ipcRenderer.invoke('get-statistics'),

    // ==================== 导入导出相关 ====================
    importPasswords: (filePath, fileType) => 
        ipcRenderer.invoke('import-passwords', filePath, fileType),
    processImportWithResolution: (importData, resolution) => 
        ipcRenderer.invoke('process-import-with-resolution', importData, resolution),
    exportPasswords: (filePath, fileType) => 
        ipcRenderer.invoke('export-passwords', filePath, fileType),
    createBackup: (backupPassword) => 
        ipcRenderer.invoke('create-backup', backupPassword),

    restoreBackup: (backupData, backupPassword) => 
        ipcRenderer.invoke('restore-backup', backupData, backupPassword),
    importCiphoraBackup: (backupData, backupPassword) => 
        ipcRenderer.invoke('import-ciphora-backup', backupData, backupPassword),
    getExportFormats: () => ipcRenderer.invoke('get-export-formats'),
    getImportFormats: () => ipcRenderer.invoke('get-import-formats'),
    generateImportTemplate: (templateType) => ipcRenderer.invoke('generate-import-template', templateType),

    // ==================== 工具功能 ====================
    generatePassword: (options) => ipcRenderer.invoke('generate-password', options),
    checkPasswordStrength: (password) => ipcRenderer.invoke('check-password-strength', password),
    generatePassphrase: (wordCount, separator) => 
        ipcRenderer.invoke('generate-passphrase', wordCount, separator),
    generateTOTP: (secret) => ipcRenderer.invoke('generateTOTP', secret),

    // ==================== 文件操作 ====================
    selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
    saveFile: (filters) => ipcRenderer.invoke('save-file', filters),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
    openUrl: (url) => ipcRenderer.invoke('open-url', url),

    // ==================== 设置相关 ====================
    getSettings: () => ipcRenderer.invoke('get-settings'),
    updateSetting: (key, value) => ipcRenderer.invoke('update-setting', key, value),
    resetSettings: () => ipcRenderer.invoke('reset-settings'),
    exportSettings: () => ipcRenderer.invoke('export-settings'),
    importSettings: (settingsData) => ipcRenderer.invoke('import-settings', settingsData),
    resetAllData: (confirmText) => ipcRenderer.invoke('reset-all-data', confirmText),
    showConfirmDialog: (options) => ipcRenderer.invoke('show-confirm-dialog', options),
    showInputDialog: (options) => ipcRenderer.invoke('show-input-dialog', options),
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

    // ==================== 事件监听器 ====================
    on: (channel, callback) => {
        // 白名单通道
        const validChannels = [
            'password-updated',
            'settings-changed',
            'auth-status-changed',
            'backup-completed',
            'import-completed',
            'export-completed'
        ];
        
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },

    off: (channel, callback) => {
        const validChannels = [
            'password-updated',
            'settings-changed',
            'auth-status-changed',
            'backup-completed',
            'import-completed',
            'export-completed'
        ];
        
        if (validChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, callback);
        }
    },

    // ==================== 移除所有监听器 ====================
    removeAllListeners: (channel) => {
        const validChannels = [
            'password-updated',
            'settings-changed',
            'auth-status-changed',
            'backup-completed',
            'import-completed',
            'export-completed'
        ];
        
        if (validChannels.includes(channel)) {
            ipcRenderer.removeAllListeners(channel);
        }
    }
});

// 暴露一些工具函数
contextBridge.exposeInMainWorld('utils', {
    // 深拷贝对象
    deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
    
    // 生成UUID
    generateUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    // 格式化日期
    formatDate: (date) => {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },
    
    // 防抖函数
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // 节流函数
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
});

// 暴露环境信息
contextBridge.exposeInMainWorld('env', {
    isDevelopment: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    platform: process.platform,
    arch: process.arch,
    version: process.version
});

console.log('Preload script loaded successfully');