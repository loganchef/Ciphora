use std::collections::{HashMap, HashSet};

use chrono::{DateTime, TimeZone, Utc};
use serde_json::{json, Map, Value};
use tauri::State;

use crate::{
    dao::storage,
    model::{AppState, PasswordEntry},
    util::{constants::PASSWORD_FILE, crypto},
};

/// 用途: 将密码列表加密并写入磁盘; 输入: 密码数组、主密码、AppHandle 与状态; 输出: 结果; 必要性: 保存密码时必须通过服务集中处理。
pub async fn save_passwords(
    passwords: Vec<PasswordEntry>,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    ensure_authenticated(&state)?;

    let json_data = serde_json::to_string(&passwords)
        .map_err(|e| format!("serialization_failed: {}", e))?;

    let encrypted = crypto::encrypt_data(&json_data, &master_password)
        .map_err(|e| format!("encryption_failed: {}", e))?;

    storage::save_to_file(&app, PASSWORD_FILE, &encrypted).await?;

    Ok(())
}

/// 用途: 从磁盘读取并解密密码列表; 输入: 主密码、AppHandle、状态; 输出: 密码集合; 必要性: 前端获取密码数据必须确保安全校验。
pub async fn load_passwords(
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<PasswordEntry>, String> {
    ensure_authenticated(&state)?;

    let encrypted = storage::load_from_file(&app, PASSWORD_FILE).await?;

    if encrypted.trim().is_empty() {
        return Ok(Vec::new());
    }

    let decrypted = crypto::decrypt_data(&encrypted, &master_password)
        .map_err(|e| format!("decryption_failed: {}", e))?;

    if decrypted.trim().is_empty() {
        return Ok(Vec::new());
    }

    let parsed: Value = serde_json::from_str(&decrypted)
        .map_err(|e| format!("deserialization_failed: {}", e))?;

    let mut passwords = match parsed {
        Value::Array(arr) => arr,
        Value::Object(mut obj) => obj
            .remove("passwords")
            .and_then(|v| v.as_array().cloned())
            .unwrap_or_default(),
        _ => Vec::new(),
    };

    let mut updated = false;
    for entry in passwords.iter_mut() {
        updated |= normalize_entry(entry);
    }

    if updated {
        save_passwords(
            passwords.clone(),
            master_password.clone(),
            app.clone(),
            state.clone(),
        )
        .await?;
    }

    Ok(passwords)
}

/// 用途: 添加密码记录; 输入: 新记录、主密码; 输出: 新记录; 必要性: 提供后端级别的 CRUD。
pub async fn add_password(
    mut password: PasswordEntry,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<PasswordEntry, String> {
    ensure_authenticated(&state)?;

    let mut list = load_passwords(master_password.clone(), app.clone(), state.clone()).await?;
    initialize_entry(&mut password);
    list.push(password.clone());

    save_passwords(list, master_password, app, state).await?;

    Ok(password)
}

/// 用途: 更新指定密码; 输入: ID、最新数据、主密码; 输出: 更新后的记录; 必要性: 支持编辑流程。
pub async fn update_password(
    id: String,
    mut password: PasswordEntry,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<PasswordEntry, String> {
    ensure_authenticated(&state)?;

    let mut list = load_passwords(master_password.clone(), app.clone(), state.clone()).await?;
    let Some(index) = find_entry_index(&list, &id) else {
        return Err("entry_not_found".to_string());
    };

    let existing = list.get(index).cloned().unwrap_or_default();
    let mut merged = merge_entries(existing, &mut password, &id);
    touch_updated_at(&mut merged);
    let updated_value = Value::Object(merged.clone());
    list[index] = updated_value.clone();

    save_passwords(list, master_password, app, state).await?;

    Ok(updated_value)
}

/// 用途: 删除密码; 输入: ID、主密码; 输出: (); 必要性: 支持删除操作。
pub async fn delete_password(
    id: String,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    ensure_authenticated(&state)?;

    let mut list = load_passwords(master_password.clone(), app.clone(), state.clone()).await?;
    let Some(index) = find_entry_index(&list, &id) else {
        return Err("entry_not_found".to_string());
    };

    list.remove(index);

    save_passwords(list, master_password, app, state).await
}

/// 用途: 清空所有密码; 输入: 主密码; 输出: (); 必要性: 提供一键清空。
pub async fn clear_passwords(
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    ensure_authenticated(&state)?;
    save_passwords(Vec::new(), master_password, app, state).await
}

/// 用途: 搜索密码; 输入: 关键字、主密码; 输出: 匹配列表; 必要性: 提供后端搜索能力。
pub async fn search_passwords(
    keyword: String,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<PasswordEntry>, String> {
    ensure_authenticated(&state)?;

    let list = load_passwords(master_password, app, state).await?;
    if keyword.trim().is_empty() {
        return Ok(list);
    }

    let lower = keyword.to_lowercase();
    Ok(list
        .into_iter()
        .filter(|entry| matches_keyword(entry, &lower))
        .collect())
}

/// 用途: 获取密码统计信息; 输入: 主密码; 输出: 统计 JSON; 必要性: 仪表盘数据来源。
pub async fn get_statistics(
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    ensure_authenticated(&state)?;

    let list = load_passwords(master_password, app, state).await?;
    let mut by_type: HashMap<String, usize> = HashMap::new();
    let mut by_website: HashMap<String, usize> = HashMap::new();
    let mut recent_activity = Vec::new();

    for entry in &list {
        if let Some(kind) = get_string_field(entry, "type")
            .or_else(|| get_string_field(entry, "dataType"))
        {
            *by_type.entry(kind).or_insert(0) += 1;
        }

        if let Some(site) = get_string_field(entry, "website")
            .or_else(|| get_string_field(entry, "url"))
        {
            *by_website.entry(site).or_insert(0) += 1;
        }

        if let Some(updated) = get_string_field(entry, "updatedAt") {
            recent_activity.push(json!({
                "id": get_string_field(entry, "id"),
                "website": get_string_field(entry, "website"),
                "action": "updated",
                "timestamp": updated
            }));
        }
    }

    recent_activity.sort_by(|a, b| {
        parse_timestamp(b.get("timestamp"))
            .cmp(&parse_timestamp(a.get("timestamp")))
    });
    recent_activity.truncate(10);

    Ok(json!({
        "totalEntries": list.len(),
        "byType": by_type,
        "byWebsite": by_website,
        "recentActivity": recent_activity
    }))
}

/// 用途: 生成 Cimbar 传输所需的加密载荷; 输入: 主密码、可选分享密码、可选 ID 集; 输出: JSON 包含密文及元数据; 必要性: 让前端无需触碰明文即可生成二维码。
pub async fn prepare_cimbar_payload(
    master_password: String,
    share_password: Option<String>,
    selected_ids: Option<Vec<String>>,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    ensure_authenticated(&state)?;

    let all_passwords = load_passwords(master_password.clone(), app, state).await?;
    if all_passwords.is_empty() {
        return Err("no_passwords_available_to_share".to_string());
    }

    let filtered = if let Some(ids) = selected_ids {
        if ids.is_empty() {
            return Err("no_entries_selected".to_string());
        }

        let id_set: HashSet<String> = ids.into_iter().collect();
        all_passwords
            .into_iter()
            .filter(|entry| {
                entry
                    .as_object()
                    .and_then(|obj| obj.get("id"))
                    .and_then(Value::as_str)
                    .map(|id| id_set.contains(id))
                    .unwrap_or(false)
            })
            .collect()
    } else {
        all_passwords
    };

    if filtered.is_empty() {
        return Err("no_entries_selected".to_string());
    }

    let payload = json!({
        "version": "1.0",
        "generatedAt": now_iso(),
        "count": filtered.len(),
        "entries": filtered,
    });

    let serialized = serde_json::to_string(&payload)
        .map_err(|e| format!("serialization_failed: {}", e))?;

    let compressed = zstd::encode_all(serialized.as_bytes(), 19)
        .map_err(|e| format!("compression_failed: {}", e))?;

    let trimmed_share = share_password.as_ref().map(|s| s.trim().to_string()).unwrap_or_default();
    let share_enabled = !trimmed_share.is_empty();

    let data = if share_enabled {
        use base64::{engine::general_purpose, Engine as _};
        let encrypted_bytes = crypto::encrypt_bytes(&compressed, &trimmed_share)
            .map_err(|e| format!("encryption_failed: {}", e))?;
        general_purpose::STANDARD.encode(&encrypted_bytes)
    } else {
        use base64::{engine::general_purpose, Engine as _};
        general_purpose::STANDARD.encode(&compressed)
    };

    Ok(json!({
        "success": true,
        "encrypted": data,
        "meta": {
            "count": filtered.len(),
            "sharePasswordSet": share_enabled,
        }
    }))
}

/// 用途: 返回当前加密后的密码库内容; 输入: AppHandle 与状态; 输出: JSON { success, fileName, payload }; 必要性: 二维码传输数据来源。
pub async fn get_encrypted_vault(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    ensure_authenticated(&state)?;
    let encrypted = storage::load_from_file(&app, PASSWORD_FILE).await?;
    if encrypted.trim().is_empty() {
        return Err("no_vault_data_available".to_string());
    }

    Ok(json!({
        "success": true,
        "fileName": PASSWORD_FILE,
        "payload": encrypted
    }))
}

/// 用途: 将指定密码批量移动到某分组; 输入: ID 列表、分组 ID（null=取消分组）、主密码; 输出: (); 必要性: 支持批量操作。
pub async fn move_passwords_to_group(
    password_ids: Vec<String>,
    group_id: Option<String>,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    ensure_authenticated(&state)?;

    let mut list = load_passwords(master_password.clone(), app.clone(), state.clone()).await?;

    for entry in list.iter_mut() {
        if let Some(obj) = entry.as_object_mut() {
            if let Some(id) = obj.get("id").and_then(Value::as_str) {
                if password_ids.contains(&id.to_string()) {
                    match &group_id {
                        Some(gid) => { obj.insert("groupId".to_string(), Value::String(gid.clone())); }
                        None => { obj.insert("groupId".to_string(), Value::Null); }
                    }
                }
            }
        }
    }

    save_passwords(list, master_password, app, state).await
}

pub async fn increment_usage_count(
    id: String,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    ensure_authenticated(&state)?;

    let mut list = load_passwords(master_password.clone(), app.clone(), state.clone()).await?;
    let Some(index) = find_entry_index(&list, &id) else {
        return Err("entry_not_found".to_string());
    };

    if let Some(obj) = list[index].as_object_mut() {
        let count = obj.get("usageCount")
            .and_then(Value::as_u64)
            .unwrap_or(0);
        obj.insert("usageCount".to_string(), Value::Number((count + 1).into()));
    }

    save_passwords(list, master_password, app, state).await
}

pub fn ensure_authenticated(state: &State<'_, AppState>) -> Result<(), String> {
    let is_auth = *state.is_authenticated.lock().unwrap();
    if !is_auth {
        return Err("not_authenticated".to_string());
    }
    Ok(())
}

pub fn normalize_entry(entry: &mut PasswordEntry) -> bool {
    if !entry.is_object() {
        *entry = Value::Object(Map::new());
    }

    let Some(obj) = entry.as_object_mut() else {
        return false;
    };

    let mut changed = false;

    if !obj.contains_key("id") {
        obj.insert("id".to_string(), Value::String(uuid::Uuid::new_v4().to_string()));
        changed = true;
    }

    changed |= sync_type_fields(obj);

    let now = now_iso();
    if !obj.contains_key("createdAt") {
        obj.insert("createdAt".to_string(), Value::String(now.clone()));
        changed = true;
    }
    if !obj.contains_key("updatedAt") {
        obj.insert("updatedAt".to_string(), Value::String(now));
        changed = true;
    }

    changed
}

pub fn initialize_entry(entry: &mut PasswordEntry) {
    if !entry.is_object() {
        *entry = Value::Object(Map::new());
    }
    let Some(obj) = entry.as_object_mut() else {
        return;
    };

    obj.insert("id".into(), Value::String(uuid::Uuid::new_v4().to_string()));
    sync_type_fields(obj);
    let now = now_iso();
    obj.insert("createdAt".into(), Value::String(now.clone()));
    obj.insert("updatedAt".into(), Value::String(now));
}

pub fn merge_entries(
    existing: PasswordEntry,
    updated: &mut PasswordEntry,
    id: &str,
) -> Map<String, Value> {
    let mut base = existing
        .as_object()
        .cloned()
        .unwrap_or_else(Map::new);

    if !updated.is_object() {
        *updated = Value::Object(Map::new());
    }

    if let Some(obj) = updated.as_object() {
        for (k, v) in obj {
            base.insert(k.clone(), v.clone());
        }
    }

    base.insert("id".into(), Value::String(id.to_string()));
    sync_type_fields(&mut base);
    if !base.contains_key("createdAt") {
        base.insert("createdAt".into(), Value::String(now_iso()));
    }

    base
}

pub fn touch_updated_at(map: &mut Map<String, Value>) {
    map.insert("updatedAt".into(), Value::String(now_iso()));
}

pub fn find_entry_index(list: &[PasswordEntry], id: &str) -> Option<usize> {
    list.iter().position(|entry| {
        entry
            .as_object()
            .and_then(|obj| obj.get("id"))
            .and_then(Value::as_str)
            .map(|value| value == id)
            .unwrap_or(false)
    })
}

fn matches_keyword(entry: &PasswordEntry, keyword: &str) -> bool {
    if keyword.is_empty() {
        return true;
    }

    const FIELDS: [&str; 6] = ["website", "username", "notes", "description", "title", "url"];

    for field in FIELDS {
        if let Some(value) = get_string_field(entry, field) {
            if value.to_lowercase().contains(keyword) {
                return true;
            }
        }
    }

    false
}

pub fn get_string_field(entry: &PasswordEntry, key: &str) -> Option<String> {
    entry
        .as_object()
        .and_then(|obj| obj.get(key))
        .and_then(Value::as_str)
        .map(|s| s.to_string())
}

pub fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

fn parse_timestamp(value: Option<&Value>) -> DateTime<Utc> {
    value
        .and_then(Value::as_str)
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|| Utc.timestamp_opt(0, 0).unwrap())
}

fn sync_type_fields(obj: &mut Map<String, Value>) -> bool {
    let mut changed = false;

    let mut primary = obj
        .get("type")
        .and_then(Value::as_str)
        .map(|s| s.to_string());
    let mut data_type = obj
        .get("dataType")
        .and_then(Value::as_str)
        .map(|s| s.to_string());

    if primary.is_none() && data_type.is_none() {
        primary = Some("password".to_string());
        data_type = primary.clone();
    } else if primary.is_none() {
        primary = data_type.clone();
    } else if data_type.is_none() {
        data_type = primary.clone();
    }

    if let Some(value) = primary {
        if obj
            .get("type")
            .and_then(Value::as_str)
            .map(|s| s != value)
            .unwrap_or(true)
        {
            obj.insert("type".to_string(), Value::String(value.clone()));
            changed = true;
        }
    }

    if let Some(value) = data_type {
        if obj
            .get("dataType")
            .and_then(Value::as_str)
            .map(|s| s != value)
            .unwrap_or(true)
        {
            obj.insert("dataType".to_string(), Value::String(value));
            changed = true;
        }
    }

    changed
}
