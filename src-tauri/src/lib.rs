// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use rusqlite;
use std::fs;
use std::path::Path;

pub mod config;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_database_file_size() -> Result<u64, String> {
    let config = crate::config::Config::default();
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
fn get_user_pref(key: String) -> Result<Option<String>, String> {
    let config = crate::config::Config::default();
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
    let config = crate::config::Config::default();
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
        let config = crate::config::Config::default();
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
/// This can help debug and fix issues with directory cleanup
#[tauri::command]
async fn cleanup_orphaned_collection_directories() -> Result<String, String> {
    tokio::spawn(async move {
        let config = crate::config::Config::default();
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_database_file_size,
            get_user_pref,
            set_user_pref,
            cleanup_item_assets,
            cleanup_orphaned_collection_directories
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
