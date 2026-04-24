use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Group {
    pub id: String,
    pub name: String,
    pub color: String,
    pub icon: String,
    #[serde(rename = "iconColor", default)]
    pub icon_color: String,
    pub order: i32,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

impl Group {
    pub fn new(name: String, color: String, icon: String, icon_color: String, order: i32) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            color,
            icon,
            icon_color,
            order,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}
