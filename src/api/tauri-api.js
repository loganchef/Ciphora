import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import {
  readTextFile,
  writeTextFile,
  readFile as readBinaryFile,
  writeFile as writeBinaryFile
} from '@tauri-apps/plugin-fs';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import * as XLSX from 'xlsx/dist/xlsx.full.min.js';

// 检测是否在 Tauri 环境中
const isTauri = typeof window !== 'undefined' && window.__TAURI_INTERNALS__;

// 安全的 invoke 调用
const invoke = async (command, args = {}) => {
  if (!isTauri) {
    console.warn(`[Browser Mode] Mocking Tauri command: ${command}`, args);
    // 模拟一些基础返回，防止页面崩溃
    if (command === 'check_setup_status') return { isInitialized: true, success: true };
    if (command === 'generate_password') {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
      return Array.from({length: args.length || 16}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }
    if (command === 'get_settings') return { success: true, settings: {} };
    if (command === 'get_groups') return [];
    if (command === 'load_passwords') return [];
    return null;
  }
  return await tauriInvoke(command, args);
};

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
  // 暴露原始 invoke 接口，供组件直接调用后端命令
  invoke,

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
        const binary = await readBinaryFile(filePath);
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

      // 清理空字符串字段，避免后端保留无意义的空值
      // 同时确保关键字段是字符串类型（XLSX 会将纯数字字符串解析为数字）
      data = data.map(entry => {
        const cleaned = {};
        for (const [key, value] of Object.entries(entry)) {
          if (value !== '' && value !== null && value !== undefined) {
            // 将关键字段强制转换为字符串，避免 XLSX 自动类型转换导致的问题
            if (['website', 'username', 'url', 'notes', 'description'].includes(key)) {
              cleaned[key] = String(value);
            } else {
              cleaned[key] = value;
            }
          }
        }
        return cleaned;
      });

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

      // 标准化字段顺序
      const orderedPasswords = passwords.map(p => ({
        id: p.id || '',
        type: p.type || 'password',
        website: p.website || '',
        username: p.username || '',
        password: p.password || '',
        secret: p.secret || '',
        notes: p.notes || '',
        description: p.description || '',
        groupId: p.groupId || null,
        createdAt: p.createdAt || '',
        updatedAt: p.updatedAt || '',
        ...p // 保留其他自定义字段
      }));

      if (fileType === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(orderedPasswords);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Passwords');
        const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        await writeBinaryFile(filePath, new Uint8Array(buffer));
      } else if (fileType === 'text') {
        const worksheet = XLSX.utils.json_to_sheet(orderedPasswords);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        await writeTextFile(filePath, '\uFEFF' + csv);
      } else {
        await writeTextFile(filePath, JSON.stringify(orderedPasswords, null, 2));
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

  async importCimbarPayload(data, sharePasswordSet, sharePassword) {
    try {
      const masterPassword = getMasterPassword();
      return await invoke('import_cimbar_payload', {
        data,
        sharePasswordSet,
        sharePassword: sharePassword || '',
        masterPassword,
      });
    } catch (error) {
      console.error('importCimbarPayload failed:', error);
      return { success: false, message: error.message };
    }
  },

  async getExportFormats() {
    return ['json', 'csv', 'excel'];
  },

  async getImportFormats() {
    return ['json', 'csv', 'excel', 'ciphora'];
  },

  async generateImportTemplate(templateType, options = {}) {
    try {
      const { sheetName = 'Template', templateDefaultName = 'Ciphora_Template', labels = {} } = options;
      const templateData = createTemplateData(labels);
      if (templateType === 'excel') {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        return {
          success: true,
          data: buffer,
          filename: `${templateDefaultName}.xlsx`,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };
      }

      if (templateType === 'csv') {
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        return {
          success: true,
          data: '\uFEFF' + csv,
          filename: `${templateDefaultName}.csv`,
          mimeType: 'text/csv;charset=utf-8'
        };
      }

      return { success: false, message: 'Unsupported template type' };
    } catch (error) {
      console.error('Failed to generate template:', error);
      return { success: false, message: error.message || 'Failed to generate template' };
    }
  },

  // ==================== 空间管理相关 ====================
  async listSpaces() {
    try {
      return await invoke('list_spaces');
    } catch (error) {
      console.error('获取历史空间失败:', error);
      return [];
    }
  },

  async getCurrentSpace() {
    try {
      return await invoke('get_current_space');
    } catch (error) {
      console.error('获取当前空间失败:', error);
      return 'default';
    }
  },

  async restoreSpace(archiveName) {
    try {
      await invoke('restore_space', { archiveName });
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return { success: true };
    } catch (error) {
      console.error('还原历史空间失败:', error);
      return { success: false, message: error.message };
    }
  },

  async deleteSpace(archiveName) {
    try {
      await invoke('delete_space', { archiveName });
      return { success: true };
    } catch (error) {
      console.error('删除历史空间失败:', error);
      return { success: false, message: error.message };
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

  async saveFile(filters, defaultPath) {
    try {
      const extensions = filters?.[0]?.extensions || [];
      const selected = await save({
        defaultPath,
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

  async writeBinaryFile(filePath, contents) {
    try {
      await writeBinaryFile(filePath, contents);
      return { success: true };
    } catch (error) {
      console.error('写入二进制文件失败:', error);
      throw error;
    }
  },

  async writeTextFile(filePath, contents) {
    try {
      await writeTextFile(filePath, contents);
      return { success: true };
    } catch (error) {
      console.error('写入文本文件失败:', error);
      throw error;
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

  // ==================== 分组管理 ====================
  async getGroups() {
    try {
      return await invoke('get_groups');
    } catch (error) {
      console.error('获取分组失败:', error);
      return [];
    }
  },

  async addGroup(name, color, icon, iconColor) {
    try {
      return await invoke('add_group', { name, color, icon, iconColor });
    } catch (error) {
      console.error('添加分组失败:', error);
      throw error;
    }
  },

  async updateGroup(id, name, color, icon, iconColor) {
    try {
      return await invoke('update_group', { id, name, color, icon, iconColor });
    } catch (error) {
      console.error('更新分组失败:', error);
      throw error;
    }
  },

  async deleteGroup(id) {
    try {
      await invoke('delete_group', { id });
      return { success: true };
    } catch (error) {
      console.error('删除分组失败:', error);
      throw error;
    }
  },

  async reorderGroups(groupIds) {
    try {
      await invoke('reorder_groups', { groupIds });
      return { success: true };
    } catch (error) {
      console.error('重排分组失败:', error);
      throw error;
    }
  },

  async movePasswordsToGroup(passwordIds, groupId) {
    try {
      const masterPassword = getMasterPassword();
      await invoke('move_passwords_to_group', { passwordIds, groupId, masterPassword });
      return { success: true };
    } catch (error) {
      console.error('移动密码失败:', error);
      throw error;
    }
  },

  async incrementUsageCount(id) {
    try {
      const masterPassword = getMasterPassword();
      await invoke('increment_usage_count', { id, masterPassword });
      return { success: true };
    } catch (error) {
      console.error('增加使用计数失败:', error);
      return { success: false, message: error.message };
    }
  },

  async resetAllData(confirmText) {
    if (confirmText !== 'RESET ALL DATA') {
      return { success: false, message: '确认文本不匹配' };
    }
    try {
      // 调用后端的全量重置命令，彻底删除主密码哈希
      await invoke('full_reset');
      
      if (typeof window !== 'undefined') {
        window.__masterPassword = '';
        localStorage.clear();
        // 强制刷新应用，App.jsx 重新初始化时会发现未设置主密码，从而进入 SetupView
        window.location.reload();
      }
      
      return { success: true, message: '应用已重置' };
    } catch (error) {
      console.error('重置失败:', error);
      return { success: false, message: error.message || '重置失败' };
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

  async getSystemLocale() {
    try {
      return await invoke('get_system_locale');
    } catch (error) {
      console.error('获取系统语言失败:', error);
      return navigator.language || 'en-US';
    }
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

const createTemplateData = (labels = {}) => ([
  {
    id: 'example-id-1',
    website: 'example.com',
    username: 'user@example.com',
    password: 'your_password_here',
    notes: labels.exampleNotes1 || 'Example Note',
    description: labels.exampleDesc1 || 'Example Description',
    type: 'password',
    groupId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'example-id-2',
    website: 'github.com',
    username: 'your_username',
    password: 'your_github_password',
    notes: labels.exampleNotes2 || 'GitHub Account',
    description: labels.exampleDesc2 || 'GitHub Account Password',
    type: 'password',
    groupId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'example-id-3',
    website: 'Google Authenticator',
    username: 'your_email@example.com',
    password: '',
    secret: 'JBSWY3DPEHPK3PXP',
    notes: labels.exampleNotes3 || 'MFA Code',
    description: labels.exampleDesc3 || 'Two-Factor Authentication',
    type: 'mfa',
    groupId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]);
