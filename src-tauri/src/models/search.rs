use serde::{Deserialize, Serialize};

/// Query parameters for STAC Item Search endpoint
#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    /// Maximum number of results to return
    pub limit: Option<i32>,
    /// Bounding box filter in format "min_lon,min_lat,max_lon,max_lat"
    pub bbox: Option<String>,
    /// Date/time filter in ISO 8601 format
    #[allow(dead_code)]
    pub datetime: Option<String>,
    /// GeoJSON geometry for intersection filter
    #[allow(dead_code)]
    pub intersects: Option<String>,
    /// Comma-separated list of item IDs to filter by
    #[allow(dead_code)]
    pub ids: Option<String>,
    /// Comma-separated list of collection IDs to filter by
    pub collections: Option<String>,
    /// Sort parameters in format "field:direction,field:direction"
    pub sortby: Option<String>,
}

/// Query parameters for OGC API - Features endpoints
#[derive(Debug, Deserialize)]
pub struct OGCFeaturesQuery {
    /// Maximum number of results to return
    pub limit: Option<i32>,
    /// Bounding box filter in format "min_lon,min_lat,max_lon,max_lat"
    pub bbox: Option<String>,
    /// Date/time filter in ISO 8601 format
    #[allow(dead_code)]
    pub datetime: Option<String>,
    /// Number of results to skip for pagination
    pub offset: Option<i32>,
    /// Sort parameters in format "field:direction,field:direction"
    pub sortby: Option<String>,
}

/// Request body for POST /search endpoint
#[derive(Debug, Deserialize, Serialize)]
pub struct SearchBody {
    /// Maximum number of results to return
    pub limit: Option<i32>,
    /// Bounding box filter as array [min_lon, min_lat, max_lon, max_lat]
    pub bbox: Option<Vec<f64>>,
    /// Date/time filter in ISO 8601 format
    pub datetime: Option<String>,
    /// GeoJSON geometry for intersection filter
    pub intersects: Option<serde_json::Value>,
    /// Array of item IDs to filter by
    pub ids: Option<Vec<String>>,
    /// Array of collection IDs to filter by
    pub collections: Option<Vec<String>>,
    /// Array of sort fields and directions
    pub sortby: Option<Vec<SortByField>>,
}

/// Sort field specification for search results
#[derive(Debug, Deserialize, Serialize)]
pub struct SortByField {
    /// Field name to sort by
    pub field: String,
    /// Sort direction: "asc" or "desc"
    pub direction: String,
}
