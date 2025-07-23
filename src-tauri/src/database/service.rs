use crate::database::{create_tables, CollectionRepository, DatabaseConnection, ItemRepository};
use rusqlite::Result;

/// Status information about the database
#[derive(Debug)]
pub struct DatabaseStatus {
    pub collections_count: usize,
    pub total_items_count: usize,
    pub is_empty: bool,
}

#[derive(Clone)]
pub struct DatabaseService {
    pub collections: CollectionRepository,
    pub items: ItemRepository,
}

impl DatabaseService {
    pub async fn new(db_path: &str) -> Result<Self, Box<dyn std::error::Error>> {


        let db_conn = DatabaseConnection::new(db_path).await?;

        // Create tables if they don't exist (preserves existing data)
        create_tables(&db_conn).await?;


        let collections = CollectionRepository::new(db_conn.clone());
        let items = ItemRepository::new(db_conn);

        Ok(Self { collections, items })
    }

    /// Check if the database is empty (no collections exist)
    pub async fn is_empty(&self) -> Result<bool, Box<dyn std::error::Error>> {
        let existing_collections = self.collections.get_all().await?;
        Ok(existing_collections.is_empty())
    }

    /// Check if this is the first installation by looking for a specific setting
    pub async fn is_first_installation(&self) -> Result<bool, Box<dyn std::error::Error>> {
        let conn = self.collections.get_connection().await;
        let mut stmt = conn.prepare("SELECT value FROM application_settings WHERE key = 'first_installation_complete'")?;
        let mut rows = stmt.query_map([], |row| {
            let value: String = row.get(0)?;
            Ok(value)
        })?;

        // If no setting exists, this is the first installation
        Ok(rows.next().is_none())
    }

    /// Mark the first installation as complete
    pub async fn mark_first_installation_complete(&self) -> Result<(), Box<dyn std::error::Error>> {
        let conn = self.collections.get_connection().await;
        conn.execute(
            "INSERT OR REPLACE INTO application_settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            ("first_installation_complete", "true"),
        )?;
        Ok(())
    }

    /// Get database status information
    pub async fn get_status(&self) -> Result<DatabaseStatus, Box<dyn std::error::Error>> {
        let collections = self.collections.get_all().await?;
        let mut total_items = 0;

        for collection in &collections {
            let items = self
                .items
                .get_by_collection(&collection.id, None, None)
                .await?;
            total_items += items.len();
        }

        Ok(DatabaseStatus {
            collections_count: collections.len(),
            total_items_count: total_items,
            is_empty: collections.is_empty(),
        })
    }

    pub async fn initialize_with_sample_data(&self) -> Result<(), Box<dyn std::error::Error>> {
        // Check if this is the first installation
        let is_first_install = self.is_first_installation().await?;
        if !is_first_install {
            // Not first installation, don't create sample data
            return Ok(());
        }

        // Check if we already have collections (shouldn't happen on first install, but safety check)
        let is_empty = self.is_empty().await?;
        if !is_empty {
            return Ok(());
        }

        // Create sample collection for populated cities
        let sample_collection = crate::database::DbCollection {
            id: "sample-cities".to_string(),
            r#type: "Collection".to_string(),
            stac_version: "1.0.0".to_string(),
            stac_extensions: None,
            title: Some("Sample Cities".to_string()),
            description: "An OGC API Features collection of the top 10 most populated cities in the world.".to_string(),
            keywords: Some(serde_json::json!(["cities", "population", "urban", "geography", "demographics"])),
            license: "CC-BY-4.0".to_string(),
            providers: Some(serde_json::json!([
                {
                    "name": "Earthal Labs",
                    "roles": ["producer"],
                    "url": "https://www.earthallabs.com/"
                }
            ])),
            extent_spatial_bbox: serde_json::json!({
                "bbox": [[-99.1332, -23.5505, 139.6917, 39.9042]]
            }),
            extent_temporal_interval: serde_json::json!({
                "interval": [["2020-01-01T00:00:00Z", "2024-12-31T23:59:59Z"]]
            }),
            summaries: Some(serde_json::json!({
                "datetime": {
                    "min": "2020-01-01T00:00:00Z",
                    "max": "2024-12-31T23:59:59Z"
                },
                "population": {
                    "minimum": 19220000,
                    "maximum": 37400068
                }
            })),
            assets: None,
            conforms_to: serde_json::json!([
                "https://api.stacspec.org/v1.0.0/core",
                "https://api.stacspec.org/v1.0.0/collections",
                "https://api.stacspec.org/v1.0.0/item-search",
                "https://api.stacspec.org/v1.0.0/ogcapi-features"
            ]),
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        };

        self.collections.create(&sample_collection).await?;

        // Create sample items for the top 10 most populated cities
        let cities_data = vec![
            ("tokyo", "Tokyo", "Japan", 37400068, 139.6917, 35.6895),
            ("delhi", "Delhi", "India", 31870000, 77.1025, 28.7041),
            ("shanghai", "Shanghai", "China", 28830000, 121.4737, 31.2304),
            ("dhaka", "Dhaka", "Bangladesh", 23070000, 90.4125, 23.8103),
            ("sao-paulo", "São Paulo", "Brazil", 22430000, -46.6333, -23.5505),
            ("mexico-city", "Mexico City", "Mexico", 22110000, -99.1332, 19.4326),
            ("cairo", "Cairo", "Egypt", 21500000, 31.2357, 30.0444),
            ("beijing", "Beijing", "China", 20460000, 116.4074, 39.9042),
            ("mumbai", "Mumbai", "India", 20410000, 72.8777, 19.076),
            ("osaka", "Osaka", "Japan", 19220000, 135.5022, 34.6937),
        ];

        for (id, name, country, population, lon, lat) in cities_data {
            let sample_item = crate::database::DbItem {
                id: id.to_string(),
                collection_id: "sample-cities".to_string(),
                r#type: "Feature".to_string(),
                stac_version: "1.0.0".to_string(),
                stac_extensions: None,
                geometry: Some(serde_json::json!({
                    "type": "Point",
                    "coordinates": [lon, lat]
                })),
                bbox: Some(serde_json::json!([lon - 0.1, lat - 0.1, lon + 0.1, lat + 0.1])),
                properties: serde_json::json!({
                    "datetime": "2020-01-01T00:00:00Z",
                    "name": name,
                    "country": country,
                    "population": population,
                    "city_type": "metropolitan_area",
                    "timezone": "UTC"
                }),
                links: None, // Will be generated by conversion
                assets: None,
                created_at: chrono::Utc::now().to_rfc3339(),
                updated_at: chrono::Utc::now().to_rfc3339(),
            };

            self.items.create(&sample_item).await?;
        }

        // Mark first installation as complete
        self.mark_first_installation_complete().await?;

        Ok(())
    }
}
