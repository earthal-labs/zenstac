// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(non_snake_case)]

mod config;
mod database;
mod models;
mod server;

use config::Config;
use database::DatabaseService;
use std::fs;
use std::path::Path;
use rusqlite;
use std::sync::{Arc, Mutex};
use tokio::task::JoinHandle;

// Global state for server control
#[derive(Clone)]
struct ServerState {
    server_handle: Arc<Mutex<Option<JoinHandle<()>>>>,
    is_running: Arc<Mutex<bool>>,
    config: Arc<Mutex<Config>>,
    db_service: DatabaseService,
}

impl ServerState {
    fn new(config: Config, db_service: DatabaseService) -> Self {
        Self {
            server_handle: Arc::new(Mutex::new(None)),
            is_running: Arc::new(Mutex::new(false)),
            config: Arc::new(Mutex::new(config)),
            db_service,
        }
    }
}

#[tokio::main]
async fn main() {
    // Load configuration with server settings from database
    let config = Config::with_server_settings();



    // Create data directory if it doesn't exist
    let config = Config::default();
    if let Err(e) = std::fs::create_dir_all(&config.assets_dir()) {
        eprintln!("Failed to create data directory: {}", e);
        std::process::exit(1);
    }


    // Initialize database
    let db_service = match database::DatabaseService::new(&config.database.path).await {
        Ok(service) => {
        
            service
        }
        Err(e) => {
            eprintln!("Failed to initialize database: {}", e);
            std::process::exit(1);
        }
    };

    // Check database status
    match db_service.get_status().await {
        Ok(status) => {
            
        }
        Err(e) => {
            eprintln!("Failed to get database status: {}", e);
            std::process::exit(1);
        }
    }

    // Initialize with sample data if database is empty
    if let Err(e) = db_service.initialize_with_sample_data().await {
        eprintln!("Failed to initialize sample data: {}", e);
        std::process::exit(1);
    }

    // Create server state
    let server_state = ServerState::new(config.clone(), db_service.clone());
    let server_state_for_tauri = server_state.clone();

    // Start the STAC server initially
    let server_config = config.clone();
    let server_db_service = db_service.clone();
    let server_handle = tokio::spawn(async move {
        if let Err(e) = server::server::start_stac_server(
            &server_config.server.internal_address.clone(),
            server_config.server.port,
            server_db_service,
            server_config,
        )
        .await
        {
            eprintln!("Failed to start server: {}", e);
            std::process::exit(1);
        }
    });

    // Set the initial server state
    {
        let mut handle_guard = server_state.server_handle.lock().unwrap();
        *handle_guard = Some(server_handle);
        let mut running_guard = server_state.is_running.lock().unwrap();
        *running_guard = true;
    }

    // Give the server a moment to start
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Start the Tauri application

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(server_state_for_tauri)
        .invoke_handler(tauri::generate_handler![
            greet,
            get_database_file_size,
            get_assets_directory_size,
            get_user_pref,
            set_user_pref,
            cleanup_item_assets,
            cleanup_orphaned_collection_directories,
            copy_asset_file,
            get_server_config,
            update_server_config,
            stop_server,
            start_server,
            restart_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_database_file_size() -> Result<u64, String> {
    let config = Config::default();
    let db_path = &config.database.path;

    if !Path::new(db_path).exists() {
        return Err("Database file not found".to_string());
    }

    match fs::metadata(db_path) {
        Ok(metadata) => Ok(metadata.len()),
        Err(e) => Err(format!("Failed to get database file size: {}", e)),
    }
}

#[tauri::command]
fn get_assets_directory_size() -> Result<u64, String> {
    let config = Config::default();
    let assets_dir = config.assets_dir();
    let assets_path = Path::new(&assets_dir);

    if !assets_path.exists() {
        return Ok(0); // Return 0 if directory doesn't exist
    }

    fn calculate_directory_size(dir_path: &Path) -> Result<u64, std::io::Error> {
        let mut total_size = 0u64;
        
        if dir_path.is_dir() {
            for entry in fs::read_dir(dir_path)? {
                let entry = entry?;
                let path = entry.path();
                
                if path.is_file() {
                    // Add file size
                    total_size += fs::metadata(&path)?.len();
                } else if path.is_dir() {
                    // Recursively calculate directory size
                    total_size += calculate_directory_size(&path)?;
                }
            }
        }
        
        Ok(total_size)
    }

    match calculate_directory_size(assets_path) {
        Ok(size) => Ok(size),
        Err(e) => Err(format!("Failed to calculate assets directory size: {}", e)),
    }
}

#[tauri::command]
fn get_user_pref(key: String) -> Result<Option<String>, String> {
    let config = Config::default();
    let conn = match rusqlite::Connection::open(&config.database.path) {
        Ok(c) => c,
        Err(e) => return Err(format!("Failed to open DB: {}", e)),
    };
    let mut stmt = match conn.prepare("SELECT value FROM application_settings WHERE key = ?1") {
        Ok(s) => s,
        Err(e) => return Err(format!("Failed to prepare statement: {}", e)),
    };
    let mut rows = match stmt.query([key]) {
        Ok(r) => r,
        Err(e) => return Err(format!("Failed to query: {}", e)),
    };
    match rows.next() {
        Ok(Some(row)) => {
            let value: String = row.get(0).map_err(|e| e.to_string())?;
            Ok(Some(value))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn set_user_pref(key: String, value: String) -> Result<(), String> {
    let config = Config::default();
    let conn = match rusqlite::Connection::open(&config.database.path) {
        Ok(c) => c,
        Err(e) => return Err(format!("Failed to open DB: {}", e)),
    };
    conn.execute(
        "INSERT OR REPLACE INTO application_settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
        (&key, &value),
    ).map_err(|e| format!("Failed to insert: {}", e))?;
    Ok(())
}

/// Asynchronously cleans up all asset files for a given item
/// This runs in the background so the UI remains responsive
#[tauri::command]
async fn cleanup_item_assets(collection_id: String, item_id: String) -> Result<String, String> {
    // Clone the values for the async block
    let collection_id_clone = collection_id.clone();
    let item_id_clone = item_id.clone();

    // Spawn the cleanup task in the background
    tokio::spawn(async move {
        let config = Config::default();
        let assets_dir = format!("{}/{}/{}", config.assets_dir(), collection_id_clone, item_id_clone);
        let assets_path = Path::new(&assets_dir);

        if assets_path.exists() {


            // Remove all files in the assets directory
            if let Err(e) = fs::remove_dir_all(&assets_dir) {
                eprintln!(
                    "Cleanup: Failed to remove assets directory {}: {}",
                    assets_dir, e
                );
            } else {

            }

            // Try to remove the parent directory if it's empty
            let parent_dir = format!("{}/{}", config.assets_dir(), collection_id_clone);
            if let Ok(entries) = fs::read_dir(&parent_dir) {
                if entries.count() == 0 {
                    if let Err(e) = fs::remove_dir(&parent_dir) {
                        eprintln!(
                            "Cleanup: Failed to remove empty parent directory {}: {}",
                            parent_dir, e
                        );
                    } else {

                    }
                }
            }
        } else {

        }
    });

    Ok(format!(
        "Cleanup started for item {} in collection {}",
        item_id, collection_id
    ))
}

/// Manually clean up orphaned collection directories
#[tauri::command]
async fn cleanup_orphaned_collection_directories() -> Result<String, String> {
    tokio::spawn(async move {
        let config = Config::default();
        let assets_base_dir = config.assets_dir();
        let assets_path = Path::new(&assets_base_dir);

        if !assets_path.exists() {
        
            return;
        }

    

        if let Ok(entries) = fs::read_dir(&assets_base_dir) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    if path.is_dir() {
                        let _collection_id = path.file_name().unwrap_or_default().to_string_lossy();


                        // Check if this collection exists in the database
                        // For now, we'll just try to remove empty directories
                        if let Ok(sub_entries) = fs::read_dir(&path) {
                            let mut has_contents = false;
                            for _ in sub_entries {
                                has_contents = true;
                                break;
                            }

                            if !has_contents {

                                if let Err(e) = fs::remove_dir(&path) {
                                    eprintln!("Cleanup orphaned: Failed to remove empty directory {:?}: {}", path, e);
                                } else {
                        
                                }
                            } else {
                    
                            }
                        }
                    }
                }
            }
        }

    
    });

    Ok("Orphaned directory cleanup started in background".to_string())
}

#[tauri::command]
async fn copy_asset_file(
    src_path: String,
    collection_id: String,
    item_id: String,
    asset_key: String,
) -> Result<(), String> {
    // Get the filename for the asset title and route endpoint
    let filename = Path::new(&src_path).file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(&asset_key);

    // Copy the file using the filename as the destination
    let config = Config::default();
    let dest_dir = format!("{}/{}/{}", config.assets_dir(), collection_id, item_id);
    if let Err(e) = fs::create_dir_all(&dest_dir) {
        return Err(format!("Failed to create destination directory: {}", e));
    }
    let dest_path = Path::new(&dest_dir).join(filename);
    if let Err(e) = fs::copy(&src_path, &dest_path) {
        return Err(format!("Failed to copy file: {}", e));
    }

    // Update the item's asset metadata in the database
    let config = Config::default();
    let db_service = database::DatabaseService::new(&config.database.path).await
        .map_err(|e| format!("Failed to initialize database service: {}", e))?;
    
    // Get the current item
    let mut db_item = db_service.items.get_by_id(&collection_id, &item_id).await
        .map_err(|e| format!("Failed to get item: {}", e))?
        .ok_or_else(|| format!("Item '{}' not found in collection '{}'", item_id, collection_id))?;

    // Determine content type based on file extension
    let content_type = if let Some(ext) = Path::new(&src_path).extension() {
        match ext.to_str().unwrap_or("").to_lowercase().as_str() {
            "jpg" | "jpeg" => "image/jpeg",
            "png" => "image/png",
            "gif" => "image/gif",
            "webp" => "image/webp",
            "svg" => "image/svg+xml",
            "tif" | "tiff" => "image/tiff",
            "pdf" => "application/pdf",
            "json" => "application/json",
            "xml" => "application/xml",
            "txt" => "text/plain",
            "csv" => "text/csv",
            _ => "application/octet-stream",
        }
    } else {
        "application/octet-stream"
    };

    // Determine asset roles based on key and content type
    let roles = if asset_key == "thumbnail" {
        vec!["thumbnail"]
    } else if content_type.starts_with("image/") {
        vec!["overview"]
    } else if content_type.contains("geotiff") || content_type.contains("tiff") {
        vec!["data"]
    } else {
        vec!["data"]
    };

    // Build the asset URL using the filename as the endpoint
    // Use the external_url from config and append the asset path
    let config = Config::with_server_settings();
    let base_url = config.external_url();
    let asset_href = format!("{}/collections/{}/items/{}/{}", base_url.trim_end_matches('/'), collection_id, item_id, filename);

    // Update assets
    let mut assets = if let Some(assets_json) = &db_item.assets {
        serde_json::from_value::<std::collections::HashMap<String, serde_json::Value>>(assets_json.clone())
            .unwrap_or_default()
    } else {
        std::collections::HashMap::new()
    };

    // Add or update the asset with proper STAC structure
    let asset_data = serde_json::json!({
        "href": asset_href,
        "type": content_type,
        "title": filename,
        "description": format!("Uploaded asset: {}", filename),
        "roles": roles
    });
    
    assets.insert(asset_key.clone(), asset_data);
    db_item.assets = Some(serde_json::to_value(assets).unwrap());
    db_item.updated_at = chrono::Utc::now().to_rfc3339();

    // Save updated item
    db_service.items.update(&db_item).await
        .map_err(|e| format!("Failed to update item with new asset: {}", e))?;

    Ok(())
}

/// Get current server configuration
#[tauri::command]
fn get_server_config() -> Result<serde_json::Value, String> {
    // Load current configuration with database settings
    let config = Config::with_server_settings();
    
    // Return server configuration as JSON
    let server_config = serde_json::json!({
        "internal_address": config.server.internal_address,
        "external_address": config.server.external_address,
        "port": config.server.port,
        "external_url": config.external_url()
    });
    
    Ok(server_config)
}

#[tauri::command]
async fn start_server(state: tauri::State<'_, ServerState>) -> Result<String, String> {

    // Lock, copy, and drop before await
    let already_running = {
        let is_running = state.is_running.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
        *is_running
    };
    if already_running {
    
        return Ok("Server is already running".to_string());
    }
    let config = {
        let config = state.config.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
        config.clone()
    };
    let db_service = state.db_service.clone();

    let server_config = config.clone();
    let server_db_service = db_service.clone();
    let handle = tokio::spawn(async move {
        if let Err(e) = server::server::start_stac_server(
            &server_config.server.internal_address.clone(),
            server_config.server.port,
            server_db_service,
            server_config,
        )
        .await
        {
            eprintln!("[Server Control] Failed to start server: {}", e);
        }
    });
    // Re-lock to update state
    {
        let mut server_handle = state.server_handle.lock().unwrap();
        *server_handle = Some(handle);
        let mut is_running = state.is_running.lock().unwrap();
        *is_running = true;
    }
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    Ok(format!("Server started successfully on {}:{}", config.server.internal_address, config.server.port))
}

#[tauri::command]
async fn stop_server(state: tauri::State<'_, ServerState>) -> Result<String, String> {

    // Lock, copy, and drop before await
    let handle_opt = {
        let mut server_handle = state.server_handle.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
        let mut is_running = state.is_running.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
        let handle = server_handle.take();
        *is_running = false;
        handle
    };
    if let Some(handle) = handle_opt {
    
        handle.abort();
    
        Ok("Server stopped successfully".to_string())
    } else {
    
        Ok("Server was not running".to_string())
    }
}

#[tauri::command]
async fn restart_server(state: tauri::State<'_, ServerState>) -> Result<String, String> {

    let stop_result = stop_server(state.clone()).await;
    if let Err(e) = stop_result {
        return Err(format!("Failed to stop server: {}", e));
    }
    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
    let start_result = start_server(state).await;
    if let Err(e) = start_result {
        return Err(format!("Failed to start server: {}", e));
    }

    Ok("Server restarted successfully".to_string())
}

#[tauri::command]
async fn update_server_config(
    internal_address: String,
    external_address: String,
    port: u16,
    state: tauri::State<'_, ServerState>,
) -> Result<String, String> {

    if port < 1024 || port > 65535 {
        return Err("Port must be between 1024 and 65535".to_string());
    }
    if internal_address.is_empty() || external_address.is_empty() {
        return Err("Addresses cannot be empty".to_string());
    }
    let config = Config::default();
    let conn = match rusqlite::Connection::open(&config.database.path) {
        Ok(c) => c,
        Err(e) => return Err(format!("Failed to open DB: {}", e)),
    };
    conn.execute(
        "INSERT OR REPLACE INTO application_settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
        ("server_internal_address", &internal_address),
    ).map_err(|e| format!("Failed to save internal address: {}", e))?;
    conn.execute(
        "INSERT OR REPLACE INTO application_settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
        ("server_external_address", &external_address),
    ).map_err(|e| format!("Failed to save external address: {}", e))?;
    conn.execute(
        "INSERT OR REPLACE INTO application_settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
        ("server_port", &port.to_string()),
    ).map_err(|e| format!("Failed to save port: {}", e))?;

    // Update the config in memory
    {
        let mut config_guard = state.config.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
        config_guard.server.internal_address = internal_address.clone();
        config_guard.server.external_address = external_address.clone();
        config_guard.server.port = port;
    }
    // Now drop the lock before await

    let restart_result = restart_server(state).await;
    if let Err(e) = restart_result {
        return Err(format!("Failed to restart server: {}", e));
    }
    Ok(format!(
        "Server configuration updated and restarted successfully on {}:{}",
        internal_address, port
    ))
}
