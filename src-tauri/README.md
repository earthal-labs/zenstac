# ZenSTAC Backend

The backend for ZenSTAC is built with **Rust** and **Tauri**, providing a high-performance STAC API server with embedded SQLite database and file management.

## Architecture

### Technology Stack
- **Rust** - Systems programming language
- **Tauri** - Cross-platform desktop framework
- **Axum** - Web framework for async Rust
- **SQLite** - Embedded database
- **Rusqlite** - SQLite bindings for Rust
- **Serde** - Serialization/deserialization
- **Tokio** - Async runtime

### Key Features
- **STAC 1.0.0 Compliant API** - Full implementation of the STAC specification
- **OGC API Features** - OGC API Features compliance
- **Embedded Database** - SQLite with automatic schema management
- **File Management** - Asset upload and serving system
- **Cross-Platform** - Windows, macOS, and Linux support
- **High Performance** - Async/await with Tokio runtime

## Directory Structure

```
src-tauri/
├── src/
│   ├── main.rs                 # Application entry point
│   ├── lib.rs                  # Library entry point
│   ├── config.rs               # Configuration management
│   ├── database/               # Database layer
│   │   ├── mod.rs              # Database module exports
│   │   ├── connection.rs       # Database connection management
│   │   ├── models.rs           # Database models
│   │   ├── repository.rs       # Data access layer
│   │   ├── schema.rs           # Database schema
│   │   ├── service.rs          # Business logic layer
│   │   └── conversion.rs       # STAC model conversion
│   ├── models/                 # STAC data models
│   │   ├── mod.rs              # Models module exports
│   │   ├── collection.rs       # STAC Collection model
│   │   ├── item.rs             # STAC Item model
│   │   ├── catalog.rs          # STAC Catalog model
│   │   ├── search.rs           # Search models
│   │   ├── spatial_extent.rs   # Spatial extent models
│   │   ├── temporal_extent.rs  # Temporal extent models
│   │   ├── asset.rs            # Asset models
│   │   ├── link.rs             # Link models
│   │   ├── provider.rs         # Provider models
│   │   ├── conformance.rs      # Conformance models
│   │   ├── properties.rs       # Properties models
│   │   └── range.rs            # Range models
│   └── server/                 # STAC API server
│       ├── mod.rs              # Server module exports
│       ├── server.rs           # Server setup and configuration
│       ├── handlers.rs         # API request handlers
│       ├── middleware.rs       # HTTP middleware
│       ├── helpers.rs          # Helper functions
│       ├── utils.rs            # Utility functions
│       └── openapi.rs          # OpenAPI specification
├── Cargo.toml                  # Rust dependencies
├── tauri.conf.json             # Tauri configuration
├── build.rs                    # Build script
└── capabilities/               # Tauri capabilities
    └── default.json            # Default capabilities
```

## Getting Started

### Prerequisites
- **Rust** (latest stable)
- **Cargo** - Rust package manager
- **Tauri CLI**: `cargo install tauri-cli`

### Development Setup

1. **Install Rust**:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Install Tauri CLI**:
   ```bash
   cargo install tauri-cli
   ```

3. **Run in development mode**:
   ```bash
   cargo tauri dev
   ```

4. **Build for production**:
   ```bash
   cargo tauri build
   ```

## Database Layer

### Database Models

The application uses SQLite with the following schema:

#### Collections Table
```sql
CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
);
```

#### Items Table
```sql
CREATE TABLE items (
    id TEXT NOT NULL,
    collection_id TEXT NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (collection_id, id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);
```

#### Application Settings Table
```sql
CREATE TABLE application_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Database Service

The `DatabaseService` provides high-level database operations:

```rust
use crate::database::DatabaseService;

// Initialize database service
let db_service = DatabaseService::new("path/to/database.db").await?;

// Get all collections
let collections = db_service.collections.get_all().await?;

// Create a collection
db_service.collections.create(&collection).await?;

// Get items in a collection
let items = db_service.items.get_by_collection("collection-id", None, None).await?;
```

### Repository Pattern

Data access is organized using the repository pattern:

```rust
// Collection repository
let collections = CollectionRepository::new(db_connection.clone());

// Item repository
let items = ItemRepository::new(db_connection);
```

## STAC API Server

### Server Architecture

The STAC API server is built with Axum and provides:

- **RESTful API** - STAC 1.0.0 compliant endpoints
- **Async handlers** - High-performance request handling
- **Middleware support** - CORS, logging, error handling
- **File uploads** - Multipart form data handling
- **Static file serving** - Asset file serving

### API Endpoints

#### Core STAC Endpoints

```rust
// Landing page
GET /v1/

// Collections
GET /v1/collections
GET /v1/collections/{collection_id}
POST /v1/collections
PUT /v1/collections/{collection_id}
DELETE /v1/collections/{collection_id}

// Items
GET /v1/collections/{collection_id}/items
GET /v1/collections/{collection_id}/items/{item_id}
POST /v1/collections/{collection_id}/items
PUT /v1/collections/{collection_id}/items/{item_id}
DELETE /v1/collections/{collection_id}/items/{item_id}

// Search
GET /v1/search
POST /v1/search

// Conformance
GET /v1/conformance
```

#### File Management Endpoints

```rust
// Upload assets
POST /v1/upload/{collection_id}/{item_id}/{asset_key}

// Serve assets
GET /v1/assets/{collection_id}/{item_id}/{asset_key}
```

### Request Handlers

Handlers are organized by functionality:

```rust
// Collection handlers
pub async fn collections(State(state): State<AppState>) -> Response
pub async fn collection(Path(collection_id): Path<String>, State(state): State<AppState>) -> Response
pub async fn create_collection(State(state): State<AppState>, Json(payload): Json<serde_json::Value>) -> Response

// Item handlers
pub async fn collection_items(Path(collection_id): Path<String>, Query(query): Query<OGCFeaturesQuery>, State(state): State<AppState>) -> Response
pub async fn item(Path((collection_id, item_id)): Path<(String, String)>, State(state): State<AppState>) -> Response
pub async fn create_item(Path(collection_id): Path<String>, State(state): State<AppState>, Json(payload): Json<serde_json::Value>) -> Response

// Search handlers
pub async fn search_get(Query(query): Query<SearchQuery>, State(state): State<AppState>) -> Response
pub async fn search_post(State(state): State<AppState>, Json(body): Json<SearchBody>) -> Response

// File handlers
pub async fn upload_asset(Path((collection_id, item_id, asset_key)): Path<(String, String, String)>, State(state): State<AppState>, mut multipart: axum::extract::Multipart) -> Response
pub async fn serve_asset(Path((collection_id, item_id, asset_key)): Path<(String, String, String)>, State(_state): State<AppState>) -> Response
```

## Data Models

### STAC Models

The application implements full STAC 1.0.0 models:

```rust
// STAC Collection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub r#type: String,
    pub stac_version: String,
    pub stac_extensions: Option<Vec<String>>,
    pub id: String,
    pub title: Option<String>,
    pub description: String,
    pub keywords: Option<Vec<String>>,
    pub license: String,
    pub providers: Option<Vec<Provider>>,
    pub extent: Extent,
    pub summaries: Option<serde_json::Value>,
    pub assets: Option<HashMap<String, Asset>>,
    pub links: Vec<Link>,
    pub conforms_to: Vec<String>,
}

// STAC Item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub r#type: String,
    pub stac_version: String,
    pub stac_extensions: Option<Vec<String>>,
    pub id: String,
    pub collection: Option<String>,
    pub geometry: Option<serde_json::Value>,
    pub bbox: Option<Vec<f64>>,
    pub properties: serde_json::Value,
    pub links: Vec<Link>,
    pub assets: Option<HashMap<String, Asset>>,
}
```

### Database Models

Database-specific models for storage:

```rust
// Database Collection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbCollection {
    pub id: String,
    pub r#type: String,
    pub stac_version: String,
    pub stac_extensions: Option<Vec<String>>,
    pub title: Option<String>,
    pub description: String,
    pub keywords: Option<serde_json::Value>,
    pub license: String,
    pub providers: Option<serde_json::Value>,
    pub extent_spatial_bbox: serde_json::Value,
    pub extent_temporal_interval: serde_json::Value,
    pub summaries: Option<serde_json::Value>,
    pub assets: Option<serde_json::Value>,
    pub conforms_to: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}
```

## Configuration

### Configuration Management

Configuration is handled through the `Config` struct:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub catalog: CatalogConfig,
    pub server: ServerConfig,
    pub database: DatabaseConfig,
}
```

### Platform-Specific Paths

The application uses platform-specific data directories:

```rust
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
}
```

## Development

### Error Handling

The application uses comprehensive error handling:

```rust
use anyhow::Result;

pub async fn handle_request() -> Result<Response, Box<dyn std::error::Error>> {
    // Handle request with proper error propagation
    Ok(response)
}
```

### Async/Await

All database and network operations are async:

```rust
pub async fn get_collections() -> Result<Vec<Collection>, Box<dyn std::error::Error>> {
    let collections = db_service.collections.get_all().await?;
    Ok(collections)
}
```

## Building

### Development Build
```bash
cargo build
```

### Release Build
```bash
cargo build --release
```

### Tauri Build
```bash
cargo tauri build
```

## Dependencies

### Key Dependencies

```toml
[dependencies]
# Web framework
axum = "0.7"
tokio = { version = "1.0", features = ["full"] }

# Database
rusqlite = { version = "0.29", features = ["bundled"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Tauri
tauri = { version = "1.5", features = ["api-all"] }

# Utilities
anyhow = "1.0"
tracing = "0.1"
chrono = { version = "0.4", features = ["serde"] }
```

## Contributing

We may open the project to external contributions in the future. When we do, this guide will be updated with:

- **Development setup instructions**
- **Code style guidelines**
- **Pull request process**
- **Issue reporting guidelines**
- **Testing requirements**

## Ideas and Feedback

While we're not accepting code contributions at the moment, we welcome:

- **Feature requests** - Share ideas for new functionality
- **Bug reports** - Help us identify and fix issues
- **Documentation improvements** - Suggest better explanations or examples
- **General feedback** - Let us know what you think of the project

### How to Share Feedback

1. **GitHub Issues** - Create an issue for bugs or feature requests
2. **GitHub Discussions** - Start a discussion for general feedback
3. **Email** - Reach out directly if you prefer

## What We're Working On

Our current development priorities include:

- **Core STAC API compliance**
- **Performance optimizations**
- **User interface improvements**
- **Documentation updates**
- **Testing coverage**
- **Offline basemap support**
- **Additional file import support**
- **Cloud support**

## License

This project is licensed under the MIT License for individuals and non-commercial use - see the [LICENSE](LICENSE) file for details.

---

**ZenSTAC** - Making geospatial data management simple and beautiful.