mod commands;
mod dao;
mod model;
mod service;
mod util;

use commands::*;
use model::AppState;
use tauri::Manager;
use service::app_state as app_state_service;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init());

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_window_state::Builder::default().build());
    }

    builder
        .manage(AppState::default())
        .setup(|app| {
            let app_handle = app.handle();
            let state = app.state::<AppState>();
            if let Err(err) = tauri::async_runtime::block_on(async {
                app_state_service::initialize(&app_handle, state.inner()).await
            }) {
                eprintln!("初始化应用状态失败: {}", err);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 认证相关
            setup_master_password,
            verify_master_password,
            check_setup_status,
            logout,
            
            // 密码管理
            save_passwords,
            load_passwords,
            add_password,
            update_password,
            delete_password,
            clear_passwords,
            search_passwords,
            password_statistics,
            get_encrypted_vault,
            prepare_cimbar_payload,
            generate_password,

            // 设置
            get_settings,
            update_setting,
            reset_settings,
            
            // MFA 相关
            generate_mfa_secret,
            generate_totp,
            generate_next_totp,
            verify_mfa_token,
            
            // 导入导出
            analyze_import_data,
            process_import_with_resolution,
            create_backup,
            restore_backup,
            export_data,
            import_data,
            
            // 系统
            get_app_info,
            get_system_locale,

            // 分组管理
            get_groups,
            add_group,
            update_group,
            delete_group,
            reorder_groups,
            move_passwords_to_group,
            increment_usage_count,
            import_cimbar_payload,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
