use crate::database::{DatabaseConnection, DbCollection, DbItem};
use rusqlite::Result;

#[derive(Clone)]
pub struct CollectionRepository {
    db: DatabaseConnection,
}

#[derive(Clone)]
pub struct ItemRepository {
    db: DatabaseConnection,
}

impl CollectionRepository {
    /// Creates a new collection repository
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// Gets the database connection
    pub async fn get_connection(&self) -> tokio::sync::MutexGuard<rusqlite::Connection> {
        self.db.get_connection().await
    }

    /// Gets all collections
    pub async fn get_all(&self) -> Result<Vec<DbCollection>> {
        let conn = self.db.get_connection().await;
        let mut stmt = conn.prepare("SELECT id, data FROM collections")?;
        let rows = stmt.query_map([], |row| {
            let _id: String = row.get(0)?;
            let data: String = row.get(1)?;
            let collection: DbCollection = serde_json::from_str(&data)
                .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
            Ok(collection)
        })?;

        let mut collections = Vec::new();
        for row in rows {
            collections.push(row?);
        }
        Ok(collections)
    }

    /// Gets a collection by ID
    pub async fn get_by_id(&self, id: &str) -> Result<Option<DbCollection>> {
        let conn = self.db.get_connection().await;
        let mut stmt = conn.prepare("SELECT data FROM collections WHERE id = ?")?;
        let mut rows = stmt.query_map([id], |row| {
            let data: String = row.get(0)?;
            let collection: DbCollection = serde_json::from_str(&data)
                .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
            Ok(collection)
        })?;

        if let Some(row) = rows.next() {
            Ok(Some(row?))
        } else {
            Ok(None)
        }
    }

    /// Creates a new collection
    pub async fn create(&self, collection: &DbCollection) -> Result<()> {
        let conn = self.db.get_connection().await;
        let data = serde_json::to_string(collection)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
        conn.execute(
            "INSERT INTO collections (id, data) VALUES (?, ?)",
            [&collection.id, &data],
        )?;
        Ok(())
    }

    /// Updates an existing collection
    #[allow(dead_code)]
    pub async fn update(&self, collection: &DbCollection) -> Result<()> {
        let conn = self.db.get_connection().await;
        let data = serde_json::to_string(collection)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
        conn.execute(
            "UPDATE collections SET data = ? WHERE id = ?",
            [&data, &collection.id],
        )?;
        Ok(())
    }

    /// Deletes a collection by ID
    #[allow(dead_code)]
    pub async fn delete(&self, id: &str) -> Result<()> {
        let conn = self.db.get_connection().await;
        conn.execute("DELETE FROM collections WHERE id = ?", [id])?;
        Ok(())
    }
}

impl ItemRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn get_by_collection(
        &self,
        collection_id: &str,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<DbItem>> {
        let conn = self.db.get_connection().await;
        let limit = limit.unwrap_or(10);
        let offset = offset.unwrap_or(0);

        let mut stmt = conn.prepare(
            "SELECT id, collection_id, data FROM items WHERE collection_id = ? ORDER BY id LIMIT ? OFFSET ?"
        )?;
        let rows = stmt.query_map(
            [collection_id, &limit.to_string(), &offset.to_string()],
            |row| {
                let id: String = row.get(0)?;
                let collection_id: String = row.get(1)?;
                let data: String = row.get(2)?;
                let mut item: DbItem = serde_json::from_str(&data)
                    .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
                // Ensure the id and collection_id match what's in the database
                item.id = id;
                item.collection_id = collection_id;
                Ok(item)
            },
        )?;

        let mut items = Vec::new();
        for row in rows {
            items.push(row?);
        }
        Ok(items)
    }

    pub async fn get_by_id(&self, collection_id: &str, item_id: &str) -> Result<Option<DbItem>> {
        let conn = self.db.get_connection().await;
        let mut stmt = conn.prepare(
            "SELECT id, collection_id, data FROM items WHERE collection_id = ? AND id = ?",
        )?;
        let mut rows = stmt.query_map([collection_id, item_id], |row| {
            let id: String = row.get(0)?;
            let collection_id: String = row.get(1)?;
            let data: String = row.get(2)?;
            let mut item: DbItem = serde_json::from_str(&data)
                .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
            // Ensure the id and collection_id match what's in the database
            item.id = id;
            item.collection_id = collection_id;
            Ok(item)
        })?;

        if let Some(row) = rows.next() {
            Ok(Some(row?))
        } else {
            Ok(None)
        }
    }



    /// Creates a new item
    pub async fn create(&self, item: &DbItem) -> Result<()> {
        let conn = self.db.get_connection().await;
        let data = serde_json::to_string(item)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
        conn.execute(
            "INSERT INTO items (id, collection_id, data) VALUES (?, ?, ?)",
            [&item.id, &item.collection_id, &data],
        )?;
        Ok(())
    }

    /// Updates an existing item
    #[allow(dead_code)]
    pub async fn update(&self, item: &DbItem) -> Result<()> {
        let conn = self.db.get_connection().await;
        let data = serde_json::to_string(item)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
        conn.execute(
            "UPDATE items SET data = ? WHERE collection_id = ? AND id = ?",
            [&data, &item.collection_id, &item.id],
        )?;
        Ok(())
    }

    /// Deletes an item by collection ID and item ID
    #[allow(dead_code)]
    pub async fn delete(&self, collection_id: &str, item_id: &str) -> Result<()> {
        let conn = self.db.get_connection().await;
        conn.execute(
            "DELETE FROM items WHERE collection_id = ? AND id = ?",
            [collection_id, item_id],
        )?;
        Ok(())
    }


}
