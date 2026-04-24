import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import {
  readTextFile,
  writeTextFile,
  readFile as readBinaryFile,
  writeFile as writeBinaryFile
} from '@tauri-apps/plugin-fs';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import * as XLSX from 'xlsx/dist/xlsx.full.min.js';

const getMasterPassword = () => {
  if (typeof window === 'undefined') {
    throw new Error('未登录');
  }
  const masterPassword = window.__masterPassword || '';
  if (!masterPassword) {
    throw new Error('未登录');
  }
  return masterPassword;
};

// 完整的 Tauri API 封装，兼容 Electron API
export const tauriAPI = {
  // ==================== 认证相关 ====================
  async checkInitializationStatus() {
    try {
      return await invoke('check_setup_status');
    } catch (error) {
      console.error('检查初始化状态失败:', error);
      return {
        success: false,
        isInitialized: false,
        message: error?.message || '无法获取初始化状态'
      };
    }
  },

  async initialize(password) {
    try {
      return await invoke('setup_master_password', { password });
    } catch (error) {
      console.error('初始化失败:', error);
      return {
        success: false,
        message: error?.toString() || '初始化过程中发生错误'
      };
    }
  },

  async login(password, mfaToken) {
    const result = await invoke('verify_master_password', { password });
    if (!result) {
      return { success: false, message: '密码错误' };
    }

    // 如果提供了 MFA token，验证它
    if (mfaToken) {
      try {
        const settings = await this.getSettings();
        if (settings.success && settings.settings.mfa?.enabled && settings.settings.mfa?.secret) {
          const mfaResult = await invoke('verify_mfa_token', {
            secret: settings.settings.mfa.secret,
            token: mfaToken
          });
          if (!mfaResult) {
            return { success: false, message: 'MFA 验证失败' };
          }
        }
      } catch (error) {
        console.error('MFA 验证错误:', error);
        return { success: false, message: 'MFA 验证失败' };
      }
    }

    return { success: true };
  },

  async logout() {
    return await invoke('logout');
  },

  async changeMasterPassword(oldPassword, newPassword) {
    // TODO: 实现修改主密码
    return { success: false, message: '功能开发中' };
  },

  async setupMFA() {
    return await invoke('generate_mfa_secret');
  },

  async verifyMFA(token, secret) {
    return await invoke('verify_mfa_token', { secret, token });
  },

  // ==================== 密码管理相关 ====================
  async getPasswords() {
    try {
      const masterPassword = getMasterPassword();
      return await invoke('load_passwords', { masterPassword });
    } catch (error) {
      if (error.message !== '未登录') {
        console.error('获取密码失败:', error);
      }
      return [];
    }
  },

  async getPassword(id) {
    const passwords = await this.getPasswords();
    return passwords.find(p => p.id === id) || null;
  },

  async addPassword(item) {
    try {
      const masterPassword = getMasterPassword();
      const password = await invoke('add_password', { password: item, masterPassword });
      return { success: true, password };
    } catch (error) {
      console.error('添加密码失败:', error);
      return { success: false, message: error.message || '添加失败' };
    }
  },

  async updatePassword(id, item) {
    try {
      const masterPassword = getMasterPassword();
      const password = await invoke('update_password', { id, password: item, masterPassword });
      return { success: true, password };
    } catch (error) {
      console.error('更新密码失败:', error);
      return { success: false, message: error.message || '更新失败' };
    }
  },

  async deletePassword(id) {
    try {
      const masterPassword = getMasterPassword();
      await invoke('delete_password', { id, masterPassword });
      return { success: true };
    } catch (error) {
      console.error('删除密码失败:', error);
      return { success: false, message: error.message || '删除失败' };
    }
  },

  async clearPasswords() {
    try {
      const masterPassword = getMasterPassword();
      await invoke('clear_passwords', { masterPassword });
      return { success: true };
    } catch (error) {
      console.error('清空密码失败:', error);
      return { success: false, message: error.message || '清空失败' };
    }
  },

  async searchPasswords(searchTerm) {
    try {
      const masterPassword = getMasterPassword();
      return await invoke('search_passwords', { keyword: searchTerm || '', masterPassword });
    } catch (error) {
      console.error('搜索密码失败:', error);
      return [];
    }
  },

  async getStatistics() {
    try {
      const masterPassword = getMasterPassword();
      return await invoke('password_statistics', { masterPassword });
    } catch (error) {
      console.error('获取统计信息失败:', error);
      return { totalEntries: 0, byType: {}, byWebsite: {}, recentActivity: [] };
    }
  },

  async getEncryptedVault() {
    try {
      return await invoke('get_encrypted_vault');
    } catch (error) {
      console.error('获取加密密码库失败:', error);
      return { success: false, message: error.message || '无法获取加密数据' };
    }
  },

  async prepareCimbarPayload(options = {}) {
    try {
      const masterPassword = getMasterPassword();
      const { selectedIds = [], sharePassword = '' } = options;
      return await invoke('prepare_cimbar_payload', {
        masterPassword,
        selectedIds,
        sharePassword
      });
    } catch (error) {
      console.error('准备 Cimbar 数据失败:', error);
      return { success: false, message: error.message || '生成二维码数据失败' };
    }
  },

  // ==================== 导入导出相关 ====================
  async importPasswords(filePath, fileType) {
    try {
      const masterPassword = getMasterPassword();
      let data;

      if (fileType === 'excel') {
        const binary = await readBinaryFile({ path: filePath });
        const workbook = XLSX.read(binary, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      } else if (fileType === 'text') {
        const content = await readTextFile(filePath);
        const workbook = XLSX.read(content, { type: 'string' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      } else {
        const content = await readTextFile(filePath);
        data = JSON.parse(content);
      }

      return await invoke('analyze_import_data', { passwords: data, masterPassword });
    } catch (error) {
      console.error('导入失败:', error);
      return { success: false, message: error.message };
    }
  },

  async processImportWithResolution(importData, resolution) {
    try {
      const masterPassword = getMasterPassword();
      return await invoke('process_import_with_resolution', {
        passwords: importData,
        resolution,
        masterPassword
      });
    } catch (error) {
      console.error('导入失败:', error);
      return { success: false, message: error.message || '导入失败' };
    }
  },

  async exportPasswords(filePath, fileType) {
    try {
      const passwords = await this.getPasswords();
      if (fileType === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(passwords);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Passwords');
        const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        await writeBinaryFile({ path: filePath, contents: new Uint8Array(buffer) });
      } else if (fileType === 'text') {
        const worksheet = XLSX.utils.json_to_sheet(passwords);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        await writeTextFile(filePath, '\uFEFF' + csv);
      } else {
        await writeTextFile(filePath, JSON.stringify(passwords, null, 2));
      }
      return { success: true, message: `成功导出 ${passwords.length} 条记录` };
    } catch (error) {
      console.error('导出失败:', error);
      return { success: false, message: error.message };
    }
  },

  async createBackup(backupPassword) {
    try {
      const masterPassword = getMasterPassword();
      return await invoke('create_backup', { backupPassword, masterPassword });
    } catch (error) {
      console.error('创建备份失败:', error);
      return { success: false, message: error.message };
    }
  },

  async restoreBackup(backupData, backupPassword) {
    try {
      const masterPassword = getMasterPassword();
      return await invoke('restore_backup', { backupData, backupPassword, masterPassword });
    } catch (error) {
      console.error('恢复备份失败:', error);
      return { success: false, message: error.message };
    }
  },

  async importCiphoraBackup(backupData, backupPassword) {
    return await this.restoreBackup(backupData, backupPassword);
  },

  async getExportFormats() {
    return ['json', 'csv', 'excel'];
  },

  async getImportFormats() {
    return ['json', 'csv', 'excel', 'ciphora'];
  },

  async generateImportTemplate(templateType) {
    try {
      const templateData = createTemplateData();
      if (templateType === 'excel') {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        XLSX.utils.book_append_sheet(workbook, worksheet, '模板');
        const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        return {
          success: true,
          data: buffer,
          filename: 'Ciphora导入模板.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };
      }

      if (templateType === 'csv') {
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        return {
          success: true,
          data: '\uFEFF' + csv,
          filename: 'Ciphora导入模板.csv',
          mimeType: 'text/csv;charset=utf-8'
        };
      }

      return { success: false, message: '不支持的模板类型' };
    } catch (error) {
      console.error('生成模板失败:', error);
      return { success: false, message: error.message || '生成模板失败' };
    }
  },

  // ==================== 工具功能 ====================
  async generatePassword(options = {}) {
    return await invoke('generate_password', {
      length: options.length || 16,
      includeUppercase: options.includeUppercase !== false,
      includeNumbers: options.includeNumbers !== false,
      includeSymbols: options.includeSymbols !== false,
    });
  },

  async checkPasswordStrength(password) {
    // 简单的密码强度检查
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    const levels = ['很弱', '弱', '中等', '强', '很强'];
    return {
      strength: strength,
      level: levels[Math.min(strength, levels.length - 1)],
      score: strength * 20
    };
  },

  async generatePassphrase(wordCount, separator) {
    // TODO: 实现密码短语生成
    return { success: false, message: '功能开发中' };
  },

  async generateTOTP(secret) {
    try {
      const result = await invoke('generate_totp', { secret });
      return { success: true, totp: result.totp };
    } catch (error) {
      console.error('生成 TOTP 失败:', error);
      return { success: false, message: error.message || '生成失败' };
    }
  },
  async generateNextTOTP(secret) {
    try {
      const result = await invoke('generate_next_totp', { secret });
      return { success: true, totp: result.totp };
    } catch (error) {
      console.error('生成下一组 TOTP 失败:', error);
      return { success: false, message: error.message || '生成失败' };
    }
  },

  // ==================== 文件操作 ====================
  async selectFile(filters) {
    try {
      const extensions = filters?.[0]?.extensions || [];
      const selected = await open({
        multiple: false,
        filters: filters ? [{
          name: filters[0].name || '文件',
          extensions: extensions.map(ext => ext.replace('.', ''))
        }] : []
      });
      
      if (!selected) {
        return { success: false, message: '未选择文件' };
      }
      
      return {
        success: true,
        filePath: typeof selected === 'string' ? selected : selected.path
      };
    } catch (error) {
      console.error('选择文件失败:', error);
      return { success: false, message: error.message };
    }
  },

  async saveFile(filters) {
    try {
      const extensions = filters?.[0]?.extensions || [];
      const selected = await save({
        filters: filters ? [{
          name: filters[0].name || '文件',
          extensions: extensions.map(ext => ext.replace('.', ''))
        }] : []
      });
      
      if (!selected) {
        return { success: false, message: '未选择保存位置' };
      }
      
      return {
        success: true,
        filePath: typeof selected === 'string' ? selected : selected.path
      };
    } catch (error) {
      console.error('保存文件失败:', error);
      return { success: false, message: error.message };
    }
  },

  async readFile(filePath) {
    try {
      return await readTextFile(filePath);
    } catch (error) {
      console.error('读取文件失败:', error);
      return null;
    }
  },

  async writeFile(filePath, content) {
    try {
      await writeTextFile(filePath, content);
      return true;
    } catch (error) {
      console.error('写入文件失败:', error);
      return false;
    }
  },

  async openUrl(url) {
    try {
      await openUrl(url);
      return { success: true };
    } catch (error) {
      console.error('打开 URL 失败:', error);
      return { success: false, message: error.message };
    }
  },

  // ==================== 设置相关 ====================
  async getSettings() {
    try {
      return await invoke('get_settings');
    } catch (error) {
      console.error('加载设置失败:', error);
      return { success: false, message: error.message || '加载设置失败' };
    }
  },

  async updateSetting(key, value) {
    try {
      return await invoke('update_setting', { key, value });
    } catch (error) {
      console.error('保存设置失败:', error);
      return { success: false, message: error.message || '保存设置失败' };
    }
  },

  async resetSettings() {
    try {
      return await invoke('reset_settings');
    } catch (error) {
      console.error('重置设置失败:', error);
      return { success: false, message: error.message || '重置设置失败' };
    }
  },

  async exportSettings() {
    // TODO: 导出设置
    return { success: false, message: '功能开发中' };
  },

  async importSettings(settingsData) {
    // TODO: 导入设置
    return { success: false, message: '功能开发中' };
  },

  async resetAllData(confirmText) {
    if (confirmText !== 'RESET ALL DATA') {
      return { success: false, message: '确认文本不匹配' };
    }
    try {
      const masterPassword = getMasterPassword();
      await invoke('clear_passwords', { masterPassword });
      return { success: true, message: '数据已清空' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  async showConfirmDialog(options) {
    // TODO: 使用 Tauri dialog 插件
    return window.confirm(options.message || '确认操作？');
  },

  async showInputDialog(options) {
    // TODO: 使用 Tauri dialog 插件
    return window.prompt(options.message || '请输入:', options.defaultValue || '');
  },

  async getAppInfo() {
    return await invoke('get_app_info');
  },

  async getSystemInfo() {
    // TODO: 获取系统信息
    return {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language
    };
  },

  // ==================== 事件监听器（Tauri 不支持，使用自定义事件） ====================
  on(channel, callback) {
    window.addEventListener(`tauri-${channel}`, (event) => {
      callback(...(event.detail || []));
    });
  },

  off(channel, callback) {
    window.removeEventListener(`tauri-${channel}`, callback);
  },

  removeAllListeners(channel) {
    // 无法完全移除，但可以标记
    console.warn('Tauri 不支持完全移除事件监听器');
  },

  // ==================== 工具函数 ====================
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

// 兼容旧的 Electron API
export const electronAPI = tauriAPI;

// 设置到 window 对象，兼容现有代码
if (typeof window !== 'undefined') {
  window.api = tauriAPI;
  window.electronAPI = tauriAPI;
}

const createTemplateData = () => ([
  {
    website: 'example.com',
    username: 'user@example.com',
    password: 'your_password_here',
    notes: '示例备注',
    type: 'password',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    website: 'github.com',
    username: 'your_username',
    password: 'your_github_password',
    notes: 'GitHub账户',
    type: 'password',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    website: 'Google Authenticator',
    username: 'your_email@example.com',
    secret: 'JBSWY3DPEHPK3PXP',
    notes: 'MFA验证码',
    type: 'mfa',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]);
