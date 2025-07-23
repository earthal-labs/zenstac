use serde::{Deserialize, Serialize};
use rusqlite;
use std::path::PathBuf;

/// Configuration for the STAC server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Catalog metadata
    pub catalog: CatalogConfig,
    /// Server configuration
    pub server: ServerConfig,
    /// Database configuration
    pub database: DatabaseConfig,
}

/// Catalog metadata configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogConfig {
    /// Unique identifier for the catalog
    pub id: String,
    /// Human-readable title for the catalog
    pub title: String,
    /// Detailed description of the catalog
    pub description: String,
    /// Version of the STAC specification being used
    pub stac_version: String,
    /// License information
    pub license: String,
    /// List of STAC extensions that this catalog supports
    pub stac_extensions: Vec<String>,
    /// List of conformance classes (conformsTo)
    pub conforms_to: Vec<String>,
}

/// Server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    /// Internal server address (for local development)
    pub internal_address: String,
    /// External server address (for production)
    pub external_address: String,
    /// Port number
    pub port: u16,
    /// API version path (e.g., "/v1")
    pub api_version: String,
}

/// Database configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    /// Database file path
    pub path: String,
}

impl Default for Config {
    fn default() -> Self {
        // Get the app data directory for storing user data
        let app_data_dir = get_app_data_dir();
        
        let db_path = app_data_dir.join("zenstac.db").to_string_lossy().to_string();
        
        Self {
            catalog: CatalogConfig {
                id: "zenstac-catalog".to_string(),
                title: "ZenSTAC Catalog".to_string(),
                description: "ZenSTAC is a lightweight, STAC-compliant server for seamless geospatial data management. Powered by Earthal Labs."
                    .to_string(),
                stac_version: "1.0.0".to_string(),
                license: "CC-BY-4.0".to_string(),
                stac_extensions: vec![
                    "https://stac-extensions.github.io/eo/v1.0.0/schema.json".to_string()
                ],
                conforms_to: vec![
                    "https://api.stacspec.org/v1.0.0/core".to_string(),
                    "https://api.stacspec.org/v1.0.0/collections".to_string(),
                    "https://api.stacspec.org/v1.0.0/item-search".to_string(),
                    "https://api.stacspec.org/v1.0.0/ogcapi-features".to_string(),
                    "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core".to_string(),
                    "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/oas30".to_string(),
                    "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson".to_string(),
                ],
            },
            server: ServerConfig {
                internal_address: "127.0.0.1".to_string(),
                external_address: "127.0.0.1".to_string(),
                port: 3000,
                api_version: "/v1".to_string(),
            },
            database: DatabaseConfig {
                path: db_path,
            },
        }
    }
}

/// Get the app data directory for storing user data
fn get_app_data_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let app_data = std::env::var("APPDATA").unwrap_or_else(|_| "data".to_string());
        PathBuf::from(app_data).join("zenstac")
    }
    
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "data".to_string());
        PathBuf::from(home).join("Library/Application Support/zenstac")
    }
    
    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "data".to_string());
        PathBuf::from(home).join(".local/share/zenstac")
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        PathBuf::from("data")
    }
}

impl Config {
    /// Create a new Config with server settings loaded from database
    pub fn with_server_settings() -> Self {
        let mut config = Self::default();
        
        // Try to load server settings from database
        if let Ok(conn) = rusqlite::Connection::open(&config.database.path) {
            // Load internal address
            if let Ok(mut stmt) = conn.prepare("SELECT value FROM application_settings WHERE key = 'server_internal_address'") {
                if let Ok(mut rows) = stmt.query([]) {
                    if let Ok(Some(row)) = rows.next() {
                        if let Ok(value) = row.get::<_, String>(0) {
                            config.server.internal_address = value;
                        }
                    }
                }
            }
            
            // Load external address
            if let Ok(mut stmt) = conn.prepare("SELECT value FROM application_settings WHERE key = 'server_external_address'") {
                if let Ok(mut rows) = stmt.query([]) {
                    if let Ok(Some(row)) = rows.next() {
                        if let Ok(value) = row.get::<_, String>(0) {
                            config.server.external_address = value;
                        }
                    }
                }
            }
            
            // Load port
            if let Ok(mut stmt) = conn.prepare("SELECT value FROM application_settings WHERE key = 'server_port'") {
                if let Ok(mut rows) = stmt.query([]) {
                    if let Ok(Some(row)) = rows.next() {
                        if let Ok(value) = row.get::<_, String>(0) {
                            if let Ok(port) = value.parse::<u16>() {
                                config.server.port = port;
                            }
                        }
                    }
                }
            }
        }
        
        config
    }

    /// Get the full internal server URL
    pub fn internal_url(&self) -> String {
        format!(
            "http://{}:{}",
            self.server.internal_address, self.server.port
        )
    }

    /// Get the full external server URL
    pub fn external_url(&self) -> String {
        // Check if external_address already contains a protocol
        if self.server.external_address.starts_with("http://") || self.server.external_address.starts_with("https://") {
            // If it's already a full URL, just append the API version path
            format!("{}{}", self.server.external_address, self.server.api_version)
        } else {
            // Otherwise, construct the full URL with http:// and port
            format!(
                "http://{}:{}{}",
                self.server.external_address, self.server.port, self.server.api_version
            )
        }
    }

    /// Get the base URL for API endpoints (uses external URL in production)
    pub fn base_url(&self) -> String {
        // In a real application, you might want to detect if this is production
        // For now, we'll use the external URL as the base
        self.external_url()
    }

    /// Get the full API version path (e.g., "/v1")
    pub fn api_version_path(&self) -> &str {
        &self.server.api_version
    }

    /// Get the assets directory path
    pub fn assets_dir(&self) -> String {
        let app_data_dir = get_app_data_dir();
        app_data_dir.join("assets").to_string_lossy().to_string()
    }

    /// Load configuration from a file (optional - for future use)
    pub fn from_file(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let config: Config = serde_json::from_str(&content)?;
        Ok(config)
    }

    /// Save configuration to a file (optional - for future use)
    pub fn save_to_file(&self, path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }
}
