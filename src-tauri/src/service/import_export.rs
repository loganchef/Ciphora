use std::collections::{HashMap, HashSet};

use chrono::Utc;
use tauri::{AppHandle, State};

use crate::{
    model::{
        AppState,
        BackupFile,
        BackupResponse,
        ImportAnalysis,
        ImportAnalysisResponse,
        ImportConflict,
        ImportProcessResult,
        ImportResolution,
        PasswordEntry,
        RestoreResponse,
    },
    service::password as password_service,
    util::crypto,
};

/// 用途: 分析导入数据; 输入: 待导入记录、主密码; 输出: 冲突与新增列表; 必要性: 提供导入预览。
pub async fn analyze_import_data(
    mut imported: Vec<PasswordEntry>,
    master_password: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ImportAnalysisResponse, String> {
    for entry in imported.iter_mut() {
        password_service::normalize_entry(entry);
    }

    let existing = password_service::load_passwords(master_password, app, state).await?;
    let mut existing_map: HashMap<String, PasswordEntry> = HashMap::new();
    for entry in &existing {
        existing_map.insert(entry_key(entry), entry.clone());
    }

    let mut conflicts = Vec::new();
    let mut new_items = Vec::new();

    for entry in imported {
        let key = entry_key(&entry);
        if let Some(existing_entry) = existing_map.get(&key) {
            conflicts.push(ImportConflict {
                key,
                imported: entry,
                existing: existing_entry.clone(),
            });
        } else {
            new_items.push(entry);
        }
    }

    Ok(ImportAnalysisResponse {
        success: true,
        requires_preview: !conflicts.is_empty(),
        analysis: ImportAnalysis {
            total: new_items.len() + conflicts.len(),
            new: new_items,
            conflicts,
            existing,
        },
    })
}

/// 用途: 根据用户选择处理导入; 输入: 数据、策略、主密码; 输出: 导入结果; 必要性: 真正写入密码库。
pub async fn process_import_with_resolution(
    mut import_data: Vec<PasswordEntry>,
    resolution: ImportResolution,
    master_password: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ImportProcessResult, String> {
    for entry in import_data.iter_mut() {
        password_service::normalize_entry(entry);
    }

    let existing =
        password_service::load_passwords(master_password.clone(), app.clone(), state.clone()).await?;

    let mut existing_map: HashMap<String, usize> = HashMap::new();
    for (idx, entry) in existing.iter().enumerate() {
        existing_map.insert(entry_key(entry), idx);
    }

    let mut final_passwords = match resolution.mode.as_str() {
        "replace" => import_data.clone(),
        _ => existing.clone(),
    };

    match resolution.mode.as_str() {
        "replace" => {}
        "add" => {
            let mut seen: HashSet<String> =
                final_passwords.iter().map(|e| entry_key(e)).collect();
            for entry in import_data {
                let key = entry_key(&entry);
                if !seen.contains(&key) {
                    final_passwords.push(entry);
                    seen.insert(key);
                }
            }
        }
        "update" => {
            let mut seen: HashSet<String> =
                final_passwords.iter().map(|e| entry_key(e)).collect();

            for entry in import_data {
                let key = entry_key(&entry);
                let entry_id = entry_id(&entry);
                if let Some(choice) = resolution.conflicts.get(&entry_id) {
                    if choice == "replace" {
                        if let Some(idx) = existing_map.get(&key) {
                            final_passwords[*idx] = entry.clone();
                        } else {
                            final_passwords.push(entry.clone());
                        }
                        existing_map.insert(key.clone(), final_passwords.len() - 1);
                    }
                    continue;
                }

                if let Some(idx) = existing_map.get(&key) {
                    if is_newer(&entry, &final_passwords[*idx]) {
                        final_passwords[*idx] = entry.clone();
                    }
                } else if !seen.contains(&key) {
                    final_passwords.push(entry);
                    seen.insert(key.clone());
                    existing_map.insert(key, final_passwords.len() - 1);
                }
            }
        }
        _ => {
            // 默认 add
            let mut seen: HashSet<String> =
                final_passwords.iter().map(|e| entry_key(e)).collect();
            for entry in import_data {
                let key = entry_key(&entry);
                if !seen.contains(&key) {
                    final_passwords.push(entry);
                    seen.insert(key);
                }
            }
        }
    }

    password_service::save_passwords(
        final_passwords.clone(),
        master_password,
        app,
        state,
    )
    .await?;

    Ok(ImportProcessResult {
        success: true,
        message: "导入完成".to_string(),
        imported_count: final_passwords.len(),
    })
}

/// 用途: 创建加密备份; 输入: 备份密码、主密码; 输出: 备份数据; 必要性: 允许用户安全备份。
pub async fn create_backup(
    backup_password: String,
    master_password: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<BackupResponse, String> {
    let passwords =
        password_service::load_passwords(master_password, app.clone(), state.clone()).await?;
    let serialized = serde_json::to_string(&passwords)
        .map_err(|e| format!("序列化失败: {}", e))?;

    let payload = crypto::encrypt_data(&serialized, &backup_password)?;

    Ok(BackupResponse {
        success: true,
        backup_data: BackupFile {
            version: "1.0".to_string(),
            timestamp: Some(Utc::now().to_rfc3339()),
            payload: Some(payload),
            encrypted: None,
            iv: None,
            salt: None,
        },
    })
}

/// 用途: 从备份恢复; 输入: 备份JSON、备份密码、主密码; 输出: 恢复结果; 必要性: 支持灾难恢复。
pub async fn restore_backup(
    backup_data: BackupFile,
    backup_password: String,
    master_password: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<RestoreResponse, String> {
    let decrypted_payload = if let Some(payload) = &backup_data.payload {
        crypto::decrypt_data(payload, &backup_password)
            .map_err(|_| "备份密码错误或文件已损坏".to_string())?
    } else if let (Some(encrypted), Some(iv)) = (&backup_data.encrypted, &backup_data.iv) {
        // legacy: concatenate iv + ciphertext and尝试解密（假设与 payload 相同格式）
        let legacy_blob = format!("{}{}", encrypted, iv);
        crypto::decrypt_data(&legacy_blob, &backup_password)
            .map_err(|_| "无法解析旧版备份文件".to_string())?
    } else {
        return Err("备份文件格式不受支持".to_string());
    };

    let mut passwords: Vec<PasswordEntry> = serde_json::from_str(&decrypted_payload)
        .map_err(|e| format!("解析备份失败: {}", e))?;

    for entry in passwords.iter_mut() {
        password_service::normalize_entry(entry);
    }

    let count = passwords.len();

    password_service::save_passwords(
        passwords,
        master_password,
        app,
        state,
    )
    .await?;

    Ok(RestoreResponse {
        success: true,
        message: format!("成功恢复 {} 条记录", count),
        restored_count: count,
    })
}

fn entry_key(entry: &PasswordEntry) -> String {
    let website = password_service::get_string_field(entry, "website")
        .unwrap_or_else(|| "unknown".into());
    let username = password_service::get_string_field(entry, "username")
        .unwrap_or_else(|| "anonymous".into());
    format!("{}|{}", website, username)
}

fn entry_id(entry: &PasswordEntry) -> String {
    password_service::get_string_field(entry, "id")
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string())
}

fn is_newer(imported: &PasswordEntry, existing: &PasswordEntry) -> bool {
    let imported_ts = password_service::get_string_field(imported, "updatedAt")
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    let existing_ts = password_service::get_string_field(existing, "updatedAt")
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    match (imported_ts, existing_ts) {
        (Some(i), Some(e)) => i > e,
        (Some(_), None) => true,
        _ => false,
    }
}

