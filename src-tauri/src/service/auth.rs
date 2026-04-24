use tauri::{AppHandle, State};

use crate::{
    dao::state as state_dao,
    model::{AppState, SetupResponse, SetupStatusResponse},
    service::app_state as app_state_service,
    util::crypto,
};

/// 用途: 生成主密码哈希并写入状态; 输入: 明文密码、AppHandle 和全局状态; 输出: 初始化成功与否; 必要性: 应用首次使用必须设置主密码。
pub async fn setup_master_password(
    password: String,
    app: &tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<SetupResponse, String> {
    let hash = crypto::hash_password(&password)
        .map_err(|e| format!("加密失败: {}", e))?;

    state_dao::save_master_hash(app, &hash).await?;
    *state.master_password_hash.lock().unwrap() = Some(hash.clone());
    *state.is_authenticated.lock().unwrap() = true;

    Ok(SetupResponse {
        success: true,
        message: "主密码设置成功".to_string(),
    })
}

/// 用途: 校验主密码; 输入: 明文密码与全局状态; 输出: 验证结果布尔值; 必要性: 登录流程必须依赖它保证安全。
pub async fn verify_master_password(
    password: String,
    app: &AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    app_state_service::ensure_loaded(app, state.inner()).await?;
    let stored_hash = state.master_password_hash.lock().unwrap();

    if let Some(hash) = stored_hash.as_ref() {
        let is_valid = crypto::verify_password(&password, hash)
            .map_err(|e| format!("验证失败: {}", e))?;

        if is_valid {
            *state.is_authenticated.lock().unwrap() = true;
        }

        Ok(is_valid)
    } else {
        Err("未设置主密码".to_string())
    }
}

/// 用途: 查询系统是否已经初始化; 输入: 全局状态; 输出: bool; 必要性: 前端决定展示登录还是初始化界面。
pub async fn check_setup_status(
    app: &AppHandle,
    state: State<'_, AppState>,
) -> Result<SetupStatusResponse, String> {
    app_state_service::ensure_loaded(app, state.inner()).await?;
    let has_password = state.master_password_hash.lock().unwrap().is_some();
    Ok(SetupStatusResponse {
        success: true,
        is_initialized: has_password,
    })
}

/// 用途: 注销当前用户; 输入: 全局状态; 输出: 操作结果; 必要性: 用户离开时需要清理认证状态。
pub fn logout(state: State<'_, AppState>) -> Result<(), String> {
    *state.is_authenticated.lock().unwrap() = false;
    Ok(())
}

