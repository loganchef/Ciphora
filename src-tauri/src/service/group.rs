use tauri::AppHandle;

use crate::{
    dao::storage,
    model::Group,
    util::constants::GROUPS_FILE,
};

pub async fn load_groups(app: &AppHandle) -> Result<Vec<Group>, String> {
    let content = storage::load_from_file(app, GROUPS_FILE).await?;

    if content.trim().is_empty() {
        return Ok(Vec::new());
    }

    serde_json::from_str::<Vec<Group>>(&content)
        .map_err(|e| format!("解析分组失败: {}", e))
}

pub async fn save_groups(app: &AppHandle, groups: &[Group]) -> Result<(), String> {
    let serialized = serde_json::to_string_pretty(groups)
        .map_err(|e| format!("序列化分组失败: {}", e))?;
    storage::save_to_file(app, GROUPS_FILE, &serialized).await
}

pub async fn get_groups(app: AppHandle) -> Result<Vec<Group>, String> {
    let mut groups = load_groups(&app).await?;
    groups.sort_by_key(|g| g.order);
    Ok(groups)
}

pub async fn add_group(app: AppHandle, name: String, color: String, icon: String) -> Result<Group, String> {
    let mut groups = load_groups(&app).await?;
    let order = groups.len() as i32;
    let group = Group::new(name, color, icon, order);
    groups.push(group.clone());
    save_groups(&app, &groups).await?;
    Ok(group)
}

pub async fn update_group(app: AppHandle, id: String, name: String, color: String, icon: String) -> Result<Group, String> {
    let mut groups = load_groups(&app).await?;
    let pos = groups.iter().position(|g| g.id == id)
        .ok_or_else(|| "分组不存在".to_string())?;

    groups[pos].name = name;
    groups[pos].color = color;
    groups[pos].icon = icon;
    groups[pos].updated_at = chrono::Utc::now().to_rfc3339();

    let updated = groups[pos].clone();
    save_groups(&app, &groups).await?;
    Ok(updated)
}

pub async fn delete_group(app: AppHandle, id: String) -> Result<(), String> {
    let mut groups = load_groups(&app).await?;
    groups.retain(|g| g.id != id);
    save_groups(&app, &groups).await
}

pub async fn reorder_groups(app: AppHandle, group_ids: Vec<String>) -> Result<(), String> {
    let mut groups = load_groups(&app).await?;
    for (i, gid) in group_ids.iter().enumerate() {
        if let Some(g) = groups.iter_mut().find(|g| &g.id == gid) {
            g.order = i as i32;
        }
    }
    groups.sort_by_key(|g| g.order);
    save_groups(&app, &groups).await
}
