const { ipcMain, dialog, shell } = require('electron');
const AppStateManager = require('./appState.cjs');
const AuthService = require('./auth.cjs');
const PasswordManagerService = require('./passwordManager.cjs');
const ImportExportService = require('./importExport.cjs');
const PasswordGeneratorService = require('./passwordGenerator.cjs');
const FileHandlerService = require('./fileHandler.cjs');
const EncryptionService = require('./encryption.cjs');
const MFAService = require('./mfa.cjs');
const DataStorageService = require('./storage.cjs');

class IPCHandler {
    constructor() {
        this.appState = new AppStateManager();
        this.authService = new AuthService();
        this.passwordManager = new PasswordManagerService();
        this.importExport = new ImportExportService();
        this.storage = new DataStorageService();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('IPC处理器开始初始化...');
            
            // 异步初始化应用状态
            await this.appState.initialize();
            
            // 初始化其他服务
            await this.authService.initialize();
            
            this.isInitialized = true;
            console.log('IPC处理器初始化完成');
        } catch (error) {
            console.error('IPC处理器初始化失败:', error);
            throw error;
        }
    }

    registerAll() {
        this.registerAuthHandlers();
        this.registerPasswordHandlers();
        this.registerImportExportHandlers();
        this.registerUtilityHandlers();
        this.registerSettingsHandlers();
        console.log('所有IPC处理器注册完成');
    }

    registerAuthHandlers() {
        // 认证相关
        ipcMain.handle('checkInitializationStatus', async () => {
            try {
                await this.ensureInitialized();
                const isInitialized = this.authService.isInitialized();
                return { success: true, isInitialized: isInitialized };
            } catch (error) {
                console.error('检查初始化状态失败:', error);
                return { success: false, isInitialized: false, error: error.message };
            }
        });

        ipcMain.handle('initialize', async (event, password) => {
            try {
                await this.ensureInitialized();
                const result = await this.authService.initialize(password, await this.appState.getDeviceId());
                if (result.success) {
                    this.appState.setCurrentKey(EncryptionService.getKeyFromPassword(password, await this.appState.getDeviceId()));
                }
                return result;
            } catch (error) {
                console.error('初始化失败:', error);
                return { success: false, message: '初始化失败: ' + error.message };
            }
        });

        ipcMain.handle('login', async (event, password, mfaToken) => {
            try {
                await this.ensureInitialized();
                const result = await this.authService.login(password, await this.appState.getDeviceId(), mfaToken);
                if (result.success) {
                    this.appState.setCurrentKey(result.key);
                }
                return result;
            } catch (error) {
                console.error('登录失败:', error);
                return { success: false, message: '登录失败: ' + error.message };
            }
        });

        ipcMain.handle('logout', async () => {
            try {
                await this.ensureInitialized();
                this.appState.clearAuth();
                return this.authService.logout();
            } catch (error) {
                console.error('退出失败:', error);
                return { success: false, message: '退出失败: ' + error.message };
            }
        });

        ipcMain.handle('change-master-password', async (event, oldPassword, newPassword) => {
            try {
                await this.ensureInitialized();
                const result = await this.authService.changeMasterPassword(
                    oldPassword, 
                    newPassword, 
                    await this.appState.getDeviceId(), 
                    this.appState.getCurrentKey()
                );
                if (result.success) {
                    this.appState.setCurrentKey(result.newKey);
                }
                return result;
            } catch (error) {
                console.error('修改主密码失败:', error);
                return { success: false, message: '修改主密码失败: ' + error.message };
            }
        });

        ipcMain.handle('setup-mfa', async () => {
            try {
                await this.ensureInitialized();
                return await this.authService.setupMFA(
                    await this.appState.getDeviceId(), 
                    this.appState.getCurrentKey()
                );
            } catch (error) {
                console.error('设置MFA失败:', error);
                return { success: false, message: '设置MFA失败: ' + error.message };
            }
        });

        ipcMain.handle('verify-mfa', async (event, token, secret) => {
            try {
                await this.ensureInitialized();
                return await this.authService.verifyMFA(token, secret);
            } catch (error) {
                console.error('验证MFA失败:', error);
                return { success: false, message: '验证MFA失败: ' + error.message };
            }
        });
    }

    registerPasswordHandlers() {
        // 密码管理相关
        ipcMain.handle('get-passwords', async () => {
            try {
                await this.ensureInitialized();
                return this.passwordManager.getPasswords(this.appState.getCurrentKey());
            } catch (error) {
                console.error('获取密码失败:', error);
                return { success: false, message: '获取密码失败: ' + error.message };
            }
        });

        ipcMain.handle('get-password', async (event, id) => {
            try {
                await this.ensureInitialized();
                return await this.passwordManager.getPassword(id, this.appState.getCurrentKey());
            } catch (error) {
                console.error('获取单个密码失败:', error);
                return { success: false, message: '获取密码失败: ' + error.message };
            }
        });

        ipcMain.handle('add-password', async (event, item) => {
            try {
                await this.ensureInitialized();
                return await this.passwordManager.addPassword(item, this.appState.getCurrentKey());
            } catch (error) {
                console.error('添加密码失败:', error);
                return { success: false, message: '添加密码失败: ' + error.message };
            }
        });

        ipcMain.handle('update-password', async (event, id, item) => {
            try {
                await this.ensureInitialized();
                return await this.passwordManager.updatePassword(id, item, this.appState.getCurrentKey());
            } catch (error) {
                console.error('更新密码失败:', error);
                return { success: false, message: '更新密码失败: ' + error.message };
            }
        });

        ipcMain.handle('delete-password', async (event, id) => {
            try {
                await this.ensureInitialized();
                return await this.passwordManager.deletePassword(id, this.appState.getCurrentKey());
            } catch (error) {
                console.error('删除密码失败:', error);
                return { success: false, message: '删除密码失败: ' + error.message };
            }
        });

        ipcMain.handle('clear-passwords', async () => {
            try {
                await this.ensureInitialized();
                return this.passwordManager.clearAllPasswords(this.appState.getCurrentKey());
            } catch (error) {
                console.error('清空密码失败:', error);
                return { success: false, message: '清空密码失败: ' + error.message };
            }
        });

        ipcMain.handle('search-passwords', async (event, searchTerm) => {
            try {
                await this.ensureInitialized();
                return await this.passwordManager.searchPasswords(searchTerm, this.appState.getCurrentKey());
            } catch (error) {
                console.error('搜索密码失败:', error);
                return { success: false, message: '搜索密码失败: ' + error.message };
            }
        });

        ipcMain.handle('get-statistics', async () => {
            try {
                await this.ensureInitialized();
                return this.passwordManager.getStatistics(this.appState.getCurrentKey());
            } catch (error) {
                console.error('获取统计信息失败:', error);
                return { success: false, message: '获取统计信息失败: ' + error.message };
            }
        });
    }

    registerImportExportHandlers() {
        // 导入导出相关
        ipcMain.handle('import-passwords', async (event, filePath, fileType) => {
            try {
                await this.ensureInitialized();
                return await this.importExport.importPasswords(
                    filePath, 
                    fileType, 
                    this.appState.getCurrentKey()
                );
            } catch (error) {
                console.error('导入密码失败:', error);
                return { success: false, message: '导入密码失败: ' + error.message };
            }
        });

        ipcMain.handle('process-import-with-resolution', async (event, importData, resolution) => {
            try {
                await this.ensureInitialized();
                return await this.importExport.processImportWithResolution(
                    importData,
                    resolution,
                    this.appState.getCurrentKey()
                );
            } catch (error) {
                console.error('处理导入失败:', error);
                return { success: false, message: '处理导入失败: ' + error.message };
            }
        });

        ipcMain.handle('export-passwords', async (event, filePath, fileType) => {
            try {
                await this.ensureInitialized();
                return await this.importExport.exportPasswords(
                    filePath, 
                    fileType, 
                    this.appState.getCurrentKey()
                );
            } catch (error) {
                console.error('导出密码失败:', error);
                return { success: false, message: '导出密码失败: ' + error.message };
            }
        });

        ipcMain.handle('create-backup', async (event, backupPassword) => {
            try {
                await this.ensureInitialized();
                return await this.importExport.createBackup(
                    backupPassword, 
                    this.appState.getCurrentKey()
                );
            } catch (error) {
                console.error('创建备份失败:', error);
                return { success: false, message: '创建备份失败: ' + error.message };
            }
        });

        ipcMain.handle('restore-backup', async (event, backupData, backupPassword) => {
            try {
                await this.ensureInitialized();
                return await this.importExport.restoreBackup(
                    backupData, 
                    backupPassword, 
                    this.appState.getCurrentKey()
                );
            } catch (error) {
                console.error('恢复备份失败:', error);
                return { success: false, message: '恢复备份失败: ' + error.message };
            }
        });

        ipcMain.handle('import-ciphora-backup', async (event, backupData, backupPassword) => {
            try {
                await this.ensureInitialized();
                return await this.importExport.restoreBackup(
                    backupData, 
                    backupPassword, 
                    this.appState.getCurrentKey()
                );
            } catch (error) {
                console.error('导入Ciphora备份失败:', error);
                return { success: false, message: '导入备份失败: ' + error.message };
            }
        });

        ipcMain.handle('get-export-formats', async () => {
            try {
                await this.ensureInitialized();
                return this.importExport.getExportFormats();
            } catch (error) {
                console.error('获取导出格式失败:', error);
                return { success: false, message: '获取导出格式失败: ' + error.message };
            }
        });

        ipcMain.handle('get-import-formats', async () => {
            try {
                await this.ensureInitialized();
                return this.importExport.getImportFormats();
            } catch (error) {
                console.error('获取导入格式失败:', error);
                return { success: false, message: '获取导入格式失败: ' + error.message };
            }
        });

        ipcMain.handle('generate-import-template', async (event, templateType) => {
            try {
                await this.ensureInitialized();
                return await this.importExport.generateImportTemplate(templateType);
            } catch (error) {
                console.error('生成导入模板失败:', error);
                return { success: false, message: '生成导入模板失败: ' + error.message };
            }
        });
    }

    registerUtilityHandlers() {
        // 工具相关
        ipcMain.handle('generate-password', async (event, options) => {
            try {
                await this.ensureInitialized();
                // 获取用户设置
                const settings = await this.appState.getSettings();
                const passwordGeneratorSettings = settings.passwordGenerator || {};
                
                console.log('用户密码生成器设置:', passwordGeneratorSettings);
                console.log('传入的选项:', options);
                
                // 合并用户设置和传入的选项
                const finalOptions = {
                    length: options.length || passwordGeneratorSettings.defaultLength || 16,
                    includeUppercase: options.includeUppercase !== undefined ? options.includeUppercase : passwordGeneratorSettings.includeUppercase !== false,
                    includeLowercase: options.includeLowercase !== undefined ? options.includeLowercase : passwordGeneratorSettings.includeLowercase !== false,
                    includeNumbers: options.includeNumbers !== undefined ? options.includeNumbers : passwordGeneratorSettings.includeNumbers !== false,
                    includeSymbols: options.includeSymbols !== undefined ? options.includeSymbols : passwordGeneratorSettings.includeSymbols !== false,
                    excludeSimilar: options.excludeSimilar !== undefined ? options.excludeSimilar : passwordGeneratorSettings.excludeSimilar || false,
                    customCharset: options.customCharset || passwordGeneratorSettings.customCharset || null
                };
                
                console.log('最终生成的选项:', finalOptions);
                
                const password = PasswordGeneratorService.generate(finalOptions);
                return { success: true, password: password };
            } catch (error) {
                console.error('生成密码失败:', error);
                return { success: false, message: error.message };
            }
        });

        ipcMain.handle('check-password-strength', async (event, password) => {
            try {
                await this.ensureInitialized();
                const strength = PasswordGeneratorService.checkStrength(password);
                return { success: true, ...strength };
            } catch (error) {
                console.error('检查密码强度失败:', error);
                return { success: false, message: error.message };
            }
        });

        ipcMain.handle('generate-passphrase', async (event, wordCount, separator) => {
            try {
                await this.ensureInitialized();
                const passphrase = PasswordGeneratorService.generatePassphrase(wordCount, separator);
                return { success: true, passphrase: passphrase };
            } catch (error) {
                console.error('生成密码短语失败:', error);
                return { success: false, message: error.message };
            }
        });

        // TOTP 生成
        ipcMain.handle('generateTOTP', async (event, secret) => {
            try {
                await this.ensureInitialized();
                const result = MFAService.generateTOTP(secret);
                return result;
            } catch (error) {
                console.error('TOTP 生成失败:', error);
                return { success: false, error: error.message };
            }
        });

        // 文件对话框
        ipcMain.handle('file-dialog', async (event, options) => {
            try {
                await this.ensureInitialized();
                return await dialog.showOpenDialog(options);
            } catch (error) {
                console.error('文件对话框失败:', error);
                return { success: false, message: '文件对话框失败: ' + error.message };
            }
        });

        // 文件操作
        ipcMain.handle('select-file', async (event, filters) => {
            try {
                await this.ensureInitialized();
                return await FileHandlerService.selectFile(filters);
            } catch (error) {
                console.error('选择文件失败:', error);
                return { success: false, message: '选择文件失败: ' + error.message };
            }
        });

        ipcMain.handle('save-file', async (event, filters) => {
            try {
                await this.ensureInitialized();
                return await FileHandlerService.saveFile(filters);
            } catch (error) {
                console.error('保存文件失败:', error);
                return { success: false, message: '保存文件失败: ' + error.message };
            }
        });

        ipcMain.handle('read-file', async (event, filePath) => {
            try {
                await this.ensureInitialized();
                return await FileHandlerService.readFile(filePath);
            } catch (error) {
                console.error('读取文件失败:', error);
                return { success: false, message: '读取文件失败: ' + error.message };
            }
        });

        ipcMain.handle('write-file', async (event, filePath, content) => {
            try {
                await this.ensureInitialized();
                return await FileHandlerService.writeFile(filePath, content);
            } catch (error) {
                console.error('写入文件失败:', error);
                return { success: false, message: '写入文件失败: ' + error.message };
            }
        });

        ipcMain.handle('open-url', async (event, url) => {
            try {
                await this.ensureInitialized();
                await shell.openExternal(url);
                return { success: true };
            } catch (error) {
                console.error('打开URL失败:', error);
                return { success: false, message: '打开URL失败: ' + error.message };
            }
        });
    }

    registerSettingsHandlers() {
        // 设置相关
        ipcMain.handle('get-settings', async () => {
            try {
                await this.ensureInitialized();
                const settings = await this.appState.getSettings();
                return { success: true, settings: settings };
            } catch (error) {
                console.error('获取设置失败:', error);
                return { success: false, message: '获取设置失败: ' + error.message };
            }
        });

        ipcMain.handle('update-setting', async (event, key, value) => {
            try {
                await this.ensureInitialized();
                await this.appState.updateSetting(key, value);
                return { success: true, message: '设置更新成功' };
            } catch (error) {
                console.error('更新设置失败:', error);
                return { success: false, message: '更新设置失败: ' + error.message };
            }
        });

        ipcMain.handle('reset-settings', async () => {
            try {
                await this.ensureInitialized();
                return await this.appState.resetSettings();
            } catch (error) {
                console.error('重置设置失败:', error);
                return { success: false, message: '重置设置失败: ' + error.message };
            }
        });

        ipcMain.handle('export-settings', async () => {
            try {
                await this.ensureInitialized();
                return await this.appState.exportSettings();
            } catch (error) {
                console.error('导出设置失败:', error);
                return { success: false, message: '导出设置失败: ' + error.message };
            }
        });

        ipcMain.handle('import-settings', async (event, settingsData) => {
            try {
                await this.ensureInitialized();
                return await this.appState.importSettings(settingsData);
            } catch (error) {
                console.error('导入设置失败:', error);
                return { success: false, message: '导入设置失败: ' + error.message };
            }
        });

        ipcMain.handle('get-app-info', async () => {
            try {
                await this.ensureInitialized();
                return { success: true, info: await this.appState.getAppInfo() };
            } catch (error) {
                console.error('获取应用信息失败:', error);
                return { success: false, message: '获取应用信息失败: ' + error.message };
            }
        });

        // 重置所有数据（用于忘记主密码的情况）
        ipcMain.handle('reset-all-data', async (event, confirmText) => {
            try {
                await this.ensureInitialized();
                // 验证确认文本
                if (confirmText !== 'RESET ALL DATA') {
                    return { success: false, message: '确认文本不匹配，操作已取消' };
                }

                // 清除所有密码数据
                this.storage.clearAllData();
                // 重置应用状态
                this.appState.clearAuth();
                // 重置设置
                await this.appState.resetSettings();
                return { success: true, message: '所有数据已重置，请重新设置主密码' };
            } catch (error) {
                console.error('重置数据失败:', error);
                return { success: false, message: '重置数据失败' };
            }
        });

        ipcMain.handle('get-system-info', async () => {
            try {
                await this.ensureInitialized();
                return { success: true, info: this.appState.getSystemInfo() };
            } catch (error) {
                console.error('获取系统信息失败:', error);
                return { success: false, message: '获取系统信息失败: ' + error.message };
            }
        });

        // 显示确认对话框
        ipcMain.handle('show-confirm-dialog', async (event, options) => {
            try {
                await this.ensureInitialized();
                const result = await dialog.showMessageBox(null, {
                    type: 'warning',
                    title: options.title || '确认操作',
                    message: options.message || '您确定要执行此操作吗？',
                    detail: options.detail || '',
                    buttons: options.buttons || ['确定', '取消'],
                    defaultId: 0,
                    cancelId: 1
                });
                return { success: true, response: result.response, checked: result.checkboxChecked };
            } catch (error) {
                console.error('显示对话框失败:', error);
                return { success: false, message: '显示对话框失败' };
            }
        });

        // 显示输入对话框
        ipcMain.handle('show-input-dialog', async (event, options) => {
            try {
                await this.ensureInitialized();
                const result = await dialog.showMessageBox(null, {
                    type: 'question',
                    title: options.title || '输入确认',
                    message: options.message || '请输入确认文本：',
                    detail: options.detail || '',
                    buttons: ['确定', '取消'],
                    defaultId: 0,
                    cancelId: 1
                });
                
                if (result.response === 0) {
                    // 用户点击了确定，需要获取输入
                    // 由于Electron的showMessageBox不支持输入框，我们返回一个特殊值
                    return { success: true, needsInput: true };
                } else {
                    return { success: true, cancelled: true };
                }
            } catch (error) {
                console.error('显示输入对话框失败:', error);
                return { success: false, message: '显示输入对话框失败' };
            }
        });
    }

    // 确保服务已初始化
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initialize();
        }
    }

    // 获取应用状态管理器
    getAppState() {
        return this.appState;
    }

    // 获取认证服务
    getAuthService() {
        return this.authService;
    }

    // 获取密码管理服务
    getPasswordManager() {
        return this.passwordManager;
    }

    // 获取导入导出服务
    getImportExport() {
        return this.importExport;
    }

    // 获取存储服务
    getStorage() {
        return this.storage;
    }
}

module.exports = IPCHandler; 