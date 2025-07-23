use crate::database::DatabaseConnection;
use rusqlite::Result;

pub async fn create_tables(db: &DatabaseConnection) -> Result<()> {
    let conn = db.get_connection().await;

    // Create collections table if it doesn't exist
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS collections (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL
        )
        "#,
        [],
    )?;

    // Create items table if it doesn't exist
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS items (
            id TEXT NOT NULL,
            collection_id TEXT NOT NULL,
            data TEXT NOT NULL,
            PRIMARY KEY (collection_id, id),
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
        )
        "#,
        [],
    )?;

    // Create index if it doesn't exist
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_items_collection_id ON items(collection_id)",
        [],
    )?;

    // Create application_settings table if it doesn't exist
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS application_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        "#,
        [],
    )?;

    Ok(())
}
