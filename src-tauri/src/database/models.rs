use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbCollection {
    pub id: String,
    pub r#type: String,
    pub stac_version: String,
    pub stac_extensions: Option<Value>,
    pub title: Option<String>,
    pub description: String,
    pub keywords: Option<Value>,
    pub license: String,
    pub providers: Option<Value>,
    pub extent_spatial_bbox: Value,
    pub extent_temporal_interval: Value,
    pub summaries: Option<Value>,
    pub assets: Option<Value>,
    pub conforms_to: Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbItem {
    pub id: String,
    pub collection_id: String,
    pub r#type: String,
    pub stac_version: String,
    pub stac_extensions: Option<Value>,
    pub geometry: Option<Value>,
    pub bbox: Option<Value>,
    pub properties: Value,
    pub links: Option<Value>,
    pub assets: Option<Value>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbAsset {
    pub href: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub r#type: Option<String>,
    pub roles: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbLink {
    pub href: String,
    pub rel: String,
    pub r#type: Option<String>,
    pub title: Option<String>,
    pub method: Option<String>,
    pub headers: Option<Value>,
    pub body: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbProvider {
    pub name: String,
    pub description: Option<String>,
    pub roles: Option<Value>,
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbSummary {
    pub key: String,
    pub value: Value,
}
