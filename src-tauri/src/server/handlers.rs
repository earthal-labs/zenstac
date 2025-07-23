use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, HeaderValue},
    response::{IntoResponse, Response},
    Json,
};

use crate::models::search::{OGCFeaturesQuery, SearchBody, SearchQuery};
use crate::models::{catalog::Catalog, link::Link};
use crate::server::helpers::{filter_items_by_bbox, filter_items_by_datetime, parse_sortby, sort_items};
use crate::server::middleware::add_cors_headers;
use crate::server::openapi::OpenApiSpec;
use crate::server::server::AppState;
use crate::server::utils::ServerConfig;
use chrono::Utc;

use serde_json::json;

/// Simple health check endpoint
pub async fn health_check() -> Response {
    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    headers = add_cors_headers(headers);
    (
        headers,
        r#"{"status":"ok","timestamp":"2024-01-01T00:00:00Z"}"#,
    )
        .into_response()
}

pub async fn hello_world(State(state): State<AppState>) -> Response {
    let server_config = ServerConfig::from_config(&state.config);
    let catalog = Catalog {
        r#type: "Catalog".to_string(),
        stac_version: state.config.catalog.stac_version.clone(),
        stac_extensions: Some(state.config.catalog.stac_extensions.clone()),
        id: state.config.catalog.id.clone(),
        title: Some(state.config.catalog.title.clone()),
        description: state.config.catalog.description.clone(),
        links: vec![
            Link {
                href: server_config.root_href(),
                rel: "self".to_string(),
                r#type: Some("application/json".to_string()),
                title: Some("This Catalog".to_string()),
                method: None,
                headers: None,
                body: None,
            },
            Link {
                href: server_config.root_href(),
                rel: "root".to_string(),
                r#type: Some("application/json".to_string()),
                title: Some("Root Catalog".to_string()),
                method: None,
                headers: None,
                body: None,
            },
            Link {
                href: server_config.collections_href(),
                rel: "child".to_string(),
                r#type: Some("application/json".to_string()),
                title: Some("Collections".to_string()),
                method: None,
                headers: None,
                body: None,
            },
            Link {
                href: server_config.conformance_href(),
                rel: "conformance".to_string(),
                r#type: Some("application/json".to_string()),
                title: Some("Conformance Classes".to_string()),
                method: None,
                headers: None,
                body: None,
            },
            Link {
                href: server_config.collections_href(),
                rel: "data".to_string(),
                r#type: Some("application/json".to_string()),
                title: Some("Collections".to_string()),
                method: None,
                headers: None,
                body: None,
            },
            Link {
                href: server_config.search_href(),
                rel: "search".to_string(),
                r#type: Some("application/geo+json".to_string()),
                title: Some("Item Search".to_string()),
                method: None,
                headers: None,
                body: None,
            },
            Link {
                href: server_config.api_href(),
                rel: "service-desc".to_string(),
                r#type: Some("application/vnd.oai.openapi+json;version=3.0".to_string()),
                title: Some("API Documentation".to_string()),
                method: None,
                headers: None,
                body: None,
            },
            Link {
                href: server_config.api_html_href(),
                rel: "service-doc".to_string(),
                r#type: Some("text/html".to_string()),
                title: Some("API Documentation".to_string()),
                method: None,
                headers: None,
                body: None,
            },
        ],
        conforms_to: state.config.catalog.conforms_to.clone(),
    };
    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    headers = add_cors_headers(headers);
    (headers, serde_json::to_string(&catalog).unwrap()).into_response()
}

pub async fn api_spec() -> Response {
    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("application/vnd.oai.openapi+json;version=3.0"),
    );
    headers = add_cors_headers(headers);

    let spec = OpenApiSpec::create_stac_core_spec();
    let json = serde_json::to_string(&spec).unwrap();

    (headers, json).into_response()
}

pub async fn api_html() -> Response {
    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("text/html; charset=utf-8"),
    );
    headers = add_cors_headers(headers);

    let html = crate::server::utils::read_static_html("api.html")
        .unwrap_or_else(|| "<h1>API Documentation Not Found</h1>".to_string());

    (headers, html).into_response()
}

pub async fn conformance(State(state): State<AppState>) -> Json<serde_json::Value> {
    let conformance_classes = serde_json::json!({
        "conformsTo": state.config.catalog.conforms_to.clone()
    });
    Json(conformance_classes)
}

pub async fn collections(State(state): State<AppState>) -> Response {
    let server_config = ServerConfig::from_config(&state.config);

    // Get collections from database
    let db_collections = match state.db_service.collections.get_all().await {
        Ok(collections) => collections,
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": "Failed to retrieve collections"
            });

            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };

    // Convert database collections to STAC collections
    let collections: Vec<_> = db_collections
        .iter()
        .map(|db_col| db_col.to_stac_collection(&server_config))
        .collect();

    let collections_response = serde_json::json!({
        "collections": collections
    });

    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    headers = add_cors_headers(headers);

    (
        headers,
        serde_json::to_string(&collections_response).unwrap(),
    )
        .into_response()
}

pub async fn collection(
    Path(collection_id): Path<String>,
    State(state): State<AppState>,
) -> Response {
    let server_config = ServerConfig::from_config(&state.config);

    // Get collection from database
    let db_collection = match state.db_service.collections.get_by_id(&collection_id).await {
        Ok(Some(collection)) => collection,
        Ok(None) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "NotFound",
                "description": format!("Collection '{}' not found", collection_id)
            });

            return (
                axum::http::StatusCode::NOT_FOUND,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": "Failed to retrieve collection"
            });

            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };

    // Convert to STAC collection
    let stac_collection = db_collection.to_stac_collection(&server_config);

    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    headers = add_cors_headers(headers);

    (headers, serde_json::to_string(&stac_collection).unwrap()).into_response()
}

pub async fn collection_items(
    Path(collection_id): Path<String>,
    Query(query): Query<OGCFeaturesQuery>,
    State(state): State<AppState>,
) -> Response {
    let server_config = ServerConfig::from_config(&state.config);

    // Get collection from database to verify it exists
    let db_collection = match state.db_service.collections.get_by_id(&collection_id).await {
        Ok(Some(_)) => {}
        Ok(None) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "NotFound",
                "description": format!("Collection '{}' not found", collection_id)
            });

            return (
                axum::http::StatusCode::NOT_FOUND,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": "Failed to retrieve collection"
            });

            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };

    // Get items from database
    let limit = query.limit.map(|l| l as i64);
    let offset = query.offset.map(|o| o as i64);
    let db_items = match state
        .db_service
        .items
        .get_by_collection(&collection_id, limit, offset)
        .await
    {
        Ok(items) => items,
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": "Failed to retrieve items"
            });

            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };

    // Convert database items to STAC items
    let items: Vec<_> = db_items
        .iter()
        .map(|db_item| db_item.to_stac_item(&server_config))
        .collect();

    let items_response = serde_json::json!({
        "type": "FeatureCollection",
        "features": items,
        "links": [
            {
                "href": server_config.collection_items_href(&collection_id),
                "rel": "self",
                "type": "application/geo+json"
            },
            {
                "href": server_config.collection_href(&collection_id),
                "rel": "parent",
                "type": "application/json"
            }
        ]
    });

    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("application/geo+json; charset=utf-8"),
    );
    headers = add_cors_headers(headers);

    (headers, serde_json::to_string(&items_response).unwrap()).into_response()
}

pub async fn item(
    Path((collection_id, item_id)): Path<(String, String)>,
    State(state): State<AppState>,
) -> Response {
    let server_config = ServerConfig::from_config(&state.config);

    // Get item from database
    let db_item = match state
        .db_service
        .items
        .get_by_id(&collection_id, &item_id)
        .await
    {
        Ok(Some(item)) => item,
        Ok(None) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "NotFound",
                "description": format!("Item '{}' not found in collection '{}'", item_id, collection_id)
            });

            return (
                axum::http::StatusCode::NOT_FOUND,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": "Failed to retrieve item"
            });

            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };



    if let Some(assets_json) = &db_item.assets {
    
    } else {
    
    }

    // Convert to STAC item
    let stac_item = db_item.to_stac_item(&server_config);

    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("application/geo+json; charset=utf-8"),
    );
    headers = add_cors_headers(headers);

    (headers, serde_json::to_string(&stac_item).unwrap()).into_response()
}

pub async fn sortables() -> Response {
    let sortables_response = serde_json::json!({
        "sortables": [
            {
                "field": "datetime",
                "direction": ["asc", "desc"]
            },
            {
                "field": "id",
                "direction": ["asc", "desc"]
            }
        ]
    });

    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    headers = add_cors_headers(headers);

    (headers, serde_json::to_string(&sortables_response).unwrap()).into_response()
}

pub async fn collection_sortables(Path(_collection_id): Path<String>) -> Response {
    let sortables_response = serde_json::json!({
        "sortables": [
            {
                "field": "datetime",
                "direction": ["asc", "desc"]
            },
            {
                "field": "id",
                "direction": ["asc", "desc"]
            }
        ]
    });

    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    headers = add_cors_headers(headers);

    (headers, serde_json::to_string(&sortables_response).unwrap()).into_response()
}

pub async fn collections_sortables() -> Response {
    let sortables_response = serde_json::json!({
        "sortables": []
    });

    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    headers = add_cors_headers(headers);

    (headers, serde_json::to_string(&sortables_response).unwrap()).into_response()
}

pub async fn search_get(
    Query(query): Query<SearchQuery>,
    State(state): State<AppState>,
) -> Response {
    search_items(query, state).await
}

pub async fn search_post(State(state): State<AppState>, Json(body): Json<SearchBody>) -> Response {
    let query = SearchQuery {
        limit: body.limit,
        bbox: body
            .bbox
            .map(|bbox| format!("{},{},{},{}", bbox[0], bbox[1], bbox[2], bbox[3])),
        datetime: body.datetime,
        intersects: body
            .intersects
            .map(|geom| serde_json::to_string(&geom).unwrap_or_default()),
        ids: body.ids.map(|ids| ids.join(",")),
        collections: body.collections.map(|cols| cols.join(",")),
        sortby: body.sortby.map(|sortby| {
            sortby
                .iter()
                .map(|s| format!("{}:{}", s.field, s.direction))
                .collect::<Vec<_>>()
                .join(",")
        }),
    };
    search_items(query, state).await
}

async fn search_items(query: SearchQuery, state: AppState) -> Response {
    let server_config = ServerConfig::from_config(&state.config);



    // Get all collections if none specified or if collections param is empty/whitespace
    let collection_ids = if let Some(collections) = &query.collections {
        let ids: Vec<_> = collections
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        if ids.is_empty() {
            // If the list is empty after filtering, treat as "all collections"
            match state.db_service.collections.get_all().await {
                Ok(collections) => {
                    let all_ids: Vec<_> = collections.iter().map(|c| c.id.clone()).collect();
                
                    all_ids
                }
                Err(e) => {
                    let mut headers = HeaderMap::new();
                    headers.insert(
                        "Content-Type",
                        HeaderValue::from_static("application/json; charset=utf-8"),
                    );
                    headers = add_cors_headers(headers);

                    let error_response = serde_json::json!({
                        "code": "InternalServerError",
                        "description": "Failed to retrieve collections"
                    });

                    return (
                        axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                        headers,
                        serde_json::to_string(&error_response).unwrap(),
                    )
                        .into_response();
                }
            }
        } else {

            ids
        }
    } else {
        match state.db_service.collections.get_all().await {
            Ok(collections) => {
                let ids: Vec<_> = collections.iter().map(|c| c.id.clone()).collect();

                ids
            }
            Err(e) => {
                let mut headers = HeaderMap::new();
                headers.insert(
                    "Content-Type",
                    HeaderValue::from_static("application/json; charset=utf-8"),
                );
                headers = add_cors_headers(headers);

                let error_response = serde_json::json!({
                    "code": "InternalServerError",
                    "description": "Failed to retrieve collections"
                });

                return (
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    headers,
                    serde_json::to_string(&error_response).unwrap(),
                )
                    .into_response();
            }
        }
    };

    // Get items from all specified collections
    // Don't apply limit here - we want all items to apply filters properly
    let mut all_items = Vec::new();
    for collection_id in &collection_ids {

        match state
            .db_service
            .items
            .get_by_collection(collection_id, None, Some(0))
            .await
        {
            Ok(items) => {

                let stac_items: Vec<_> = items
                    .iter()
                    .map(|db_item| db_item.to_stac_item(&server_config))
                    .collect();
                all_items.extend(stac_items);
            }
            Err(e) => {
                // Continue with other collections if one fails
                continue;
            }
        }
    }
    


    // Apply filters
    let filtered_items = if let Some(bbox_str) = &query.bbox {
        let filtered = filter_items_by_bbox(&all_items, bbox_str);
        filtered
    } else {

        all_items
    };

    let filtered_items = if let Some(datetime_str) = &query.datetime {
        let filtered = filter_items_by_datetime(&filtered_items, datetime_str);
        filtered
    } else {

        filtered_items
    };

    // Apply sorting
    let sorted_items = if let Some(sortby_str) = &query.sortby {
        match parse_sortby(sortby_str) {
            Ok(sortby) => sort_items(filtered_items, &sortby),
            Err(_) => filtered_items,
        }
    } else {
        filtered_items
    };

    // Apply limit to final results
    let final_items = if let Some(limit) = query.limit {
        let limit = limit as usize;
        if limit < sorted_items.len() {
            let limited = sorted_items[..limit].to_vec();
            limited
        } else {
            sorted_items
        }
    } else {

        sorted_items
    };
    


    let response = serde_json::json!({
        "type": "FeatureCollection",
        "features": final_items,
        "links": [
            {
                "href": server_config.search_href(),
                "rel": "self",
                "type": "application/geo+json"
            }
        ]
    });

    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("application/geo+json; charset=utf-8"),
    );
    headers = add_cors_headers(headers);

    (headers, serde_json::to_string(&response).unwrap()).into_response()
}

pub async fn delete_collection(
    Path(collection_id): Path<String>,
    State(state): State<AppState>,
) -> Response {
    // Check if collection exists first
    let _db_collection = match state.db_service.collections.get_by_id(&collection_id).await {
        Ok(Some(_)) => (), // Collection exists, proceed with deletion
        Ok(None) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "NotFound",
                "description": format!("Collection '{}' not found", collection_id)
            });

            return (
                axum::http::StatusCode::NOT_FOUND,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": "Failed to check collection existence"
            });

            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };

    // Store collection_id for cleanup after database deletion
    let collection_id_for_cleanup = collection_id.clone();

    // Delete the collection
    match state.db_service.collections.delete(&collection_id).await {
        Ok(_) => {
            // Now trigger async cleanup AFTER the database deletion is complete
            tokio::spawn(async move {
                // Wait a bit to ensure database operations are fully complete
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

                let collection_assets_dir = format!("{}/{}", state.config.assets_dir(), collection_id_for_cleanup);
                let collection_assets_path = std::path::Path::new(&collection_assets_dir);

                if collection_assets_path.exists() {
                

                


                    // Try to remove the directory with retries and delays
                    let mut attempts = 0;
                    const MAX_ATTEMPTS: u32 = 5;

                    while attempts < MAX_ATTEMPTS {
                        attempts += 1;


                        match std::fs::remove_dir_all(&collection_assets_dir) {
                            Ok(_) => {
                            

                                // Verify it's actually gone
                                if collection_assets_path.exists() {
                                
                                    if attempts < MAX_ATTEMPTS {

                                        tokio::time::sleep(tokio::time::Duration::from_millis(500))
                                            .await;
                                        continue;
                                    }
                                } else {

                                    break;
                                }
                            }
                            Err(e) => {
                                eprintln!("Delete collection handler: Attempt {} failed to remove collection assets directory {}: {}", attempts, collection_assets_dir, e);

                                if attempts < MAX_ATTEMPTS {

                                    tokio::time::sleep(tokio::time::Duration::from_millis(1000))
                                        .await;

                                    // Try alternative approach - remove contents first, then directory

                                    if let Ok(entries) = std::fs::read_dir(&collection_assets_dir) {
                                        for entry in entries {
                                            if let Ok(entry) = entry {
                                                let path = entry.path();
                                                if path.is_dir() {
                                                    if let Err(e) = std::fs::remove_dir_all(&path) {
                                                        eprintln!("Delete collection handler: Failed to remove subdirectory {:?}: {}", path, e);
                                                    } else {

                                                    }
                                                } else {
                                                    if let Err(e) = std::fs::remove_file(&path) {
                                                        eprintln!("Delete collection handler: Failed to remove file {:?}: {}", path, e);
                                                    } else {

                                                    }
                                                }
                                            }
                                        }

                                        // Wait a bit more before trying to remove the empty directory
                                        tokio::time::sleep(tokio::time::Duration::from_millis(500))
                                            .await;
                                    }
                                } else {
                                
                                }
                            }
                        }
                    }
                } else {

                }
            });

            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let success_response = serde_json::json!({
                "message": format!("Collection '{}' deleted successfully. Asset cleanup started in background.", collection_id)
            });

            (
                axum::http::StatusCode::OK,
                headers,
                serde_json::to_string(&success_response).unwrap(),
            )
                .into_response()
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": "Failed to delete collection"
            });

            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    }
}

pub async fn delete_item(
    Path((collection_id, item_id)): Path<(String, String)>,
    State(state): State<AppState>,
) -> Response {
    // Check if item exists first
    let db_item = match state
        .db_service
        .items
        .get_by_id(&collection_id, &item_id)
        .await
    {
        Ok(Some(_)) => (), // Item exists, proceed with deletion
        Ok(None) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "NotFound",
                "description": format!("Item '{}' not found in collection '{}'", item_id, collection_id)
            });

            return (
                axum::http::StatusCode::NOT_FOUND,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": "Failed to check item existence"
            });

            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };

    // Delete the item from database
    match state
        .db_service
        .items
        .delete(&collection_id, &item_id)
        .await
    {
        Ok(_) => {
            // Trigger async cleanup of asset files
            let collection_id_clone = collection_id.clone();
            let item_id_clone = item_id.clone();
            tokio::spawn(async move {
                let config = crate::config::Config::default();
                let assets_dir = format!("{}/{}/{}", config.assets_dir(), collection_id_clone, item_id_clone);
                let assets_path = std::path::Path::new(&assets_dir);

                if assets_path.exists() {


                    // Remove all files in the assets directory
                    if let Err(e) = std::fs::remove_dir_all(&assets_dir) {
                        eprintln!(
                            "Delete handler: Failed to remove assets directory {}: {}",
                            assets_dir, e
                        );
                    } else {

                    }

                    // Try to remove the parent directory if it's empty
                    let parent_dir = format!("{}/{}", config.assets_dir(), collection_id_clone);
                    if let Ok(entries) = std::fs::read_dir(&parent_dir) {
                        if entries.count() == 0 {
                            if let Err(e) = std::fs::remove_dir(&parent_dir) {
                                eprintln!("Delete handler: Failed to remove empty parent directory {}: {}", parent_dir, e);
                            } else {

                            }
                        }
                    }
                } else {

                }
            });

            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let success_response = serde_json::json!({
                "message": format!("Item '{}' deleted successfully from collection '{}'. Asset cleanup started in background.", item_id, collection_id)
            });

            (
                axum::http::StatusCode::OK,
                headers,
                serde_json::to_string(&success_response).unwrap(),
            )
                .into_response()
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": "Failed to delete item"
            });

            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    }
}

pub async fn put_item(
    Path((collection_id, item_id)): Path<(String, String)>,
    State(state): State<AppState>,
    Json(item_data): Json<serde_json::Value>,
) -> Response {
    let server_config = ServerConfig::from_config(&state.config);

    // Check if collection exists first
    let _db_collection = match state.db_service.collections.get_by_id(&collection_id).await {
        Ok(Some(_)) => (), // Collection exists, proceed with update
        Ok(None) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "NotFound",
                "description": format!("Collection '{}' not found", collection_id)
            });

            return (
                axum::http::StatusCode::NOT_FOUND,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": "Failed to check collection existence"
            });

            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };

    // Check if item exists first
    let existing_item = match state
        .db_service
        .items
        .get_by_id(&collection_id, &item_id)
        .await
    {
        Ok(Some(_)) => (), // Item exists, proceed with update
        Ok(None) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "NotFound",
                "description": format!("Item '{}' not found in collection '{}'", item_id, collection_id)
            });

            return (
                axum::http::StatusCode::NOT_FOUND,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": "Failed to check item existence"
            });

            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };

    // Parse the item data and create a DbItem
    let db_item = match serde_json::from_value::<crate::models::item::Item>(item_data.clone()) {
        Ok(stac_item) => {
            // Validate that the item ID and collection match the path parameters
            if stac_item.id != item_id {
                let mut headers = HeaderMap::new();
                headers.insert(
                    "Content-Type",
                    HeaderValue::from_static("application/json; charset=utf-8"),
                );
                headers = add_cors_headers(headers);

                let error_response = serde_json::json!({
                    "code": "BadRequest",
                    "description": "Item ID in request body does not match path parameter"
                });

                return (
                    axum::http::StatusCode::BAD_REQUEST,
                    headers,
                    serde_json::to_string(&error_response).unwrap(),
                )
                    .into_response();
            }

            if stac_item.collection != Some(collection_id.clone()) {
                let mut headers = HeaderMap::new();
                headers.insert(
                    "Content-Type",
                    HeaderValue::from_static("application/json; charset=utf-8"),
                );
                headers = add_cors_headers(headers);

                let error_response = serde_json::json!({
                    "code": "BadRequest",
                    "description": "Collection ID in request body does not match path parameter"
                });

                return (
                    axum::http::StatusCode::BAD_REQUEST,
                    headers,
                    serde_json::to_string(&error_response).unwrap(),
                )
                    .into_response();
            }

            // Compute bbox from geometry if possible
            let bbox = stac_item.geometry.as_ref().and_then(|geom| {
                let geom_val = serde_json::to_value(geom).ok()?;
                match geom_val.get("type").and_then(|t| t.as_str()) {
                    Some("Point") => {
                        if let Some(coords) = geom_val.get("coordinates") {
                            if let Some(arr) = coords.as_array() {
                                if arr.len() == 2 {
                                    let x = arr[0].as_f64().unwrap_or(0.0);
                                    let y = arr[1].as_f64().unwrap_or(0.0);
                                    return Some(serde_json::json!([x, y, x, y]));
                                }
                            }
                        }
                        None
                    }
                    Some("Polygon") => {
                        if let Some(coords) = geom_val.get("coordinates") {
                            if let Some(rings) = coords.as_array() {
                                let mut xs = vec![];
                                let mut ys = vec![];
                                for ring in rings {
                                    if let Some(points) = ring.as_array() {
                                        for point in points {
                                            if let Some(pt) = point.as_array() {
                                                if pt.len() == 2 {
                                                    xs.push(pt[0].as_f64().unwrap_or(0.0));
                                                    ys.push(pt[1].as_f64().unwrap_or(0.0));
                                                }
                                            }
                                        }
                                    }
                                }
                                if !xs.is_empty() && !ys.is_empty() {
                                    let min_x = xs.iter().cloned().fold(f64::INFINITY, f64::min);
                                    let max_x =
                                        xs.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
                                    let min_y = ys.iter().cloned().fold(f64::INFINITY, f64::min);
                                    let max_y =
                                        ys.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
                                    return Some(serde_json::json!([min_x, min_y, max_x, max_y]));
                                }
                            }
                        }
                        None
                    }
                    _ => None,
                }
            });

            // Convert STAC item to DbItem
            let db_item = crate::database::models::DbItem {
                id: item_id.clone(),
                collection_id: collection_id.clone(),
                r#type: stac_item.r#type,
                stac_version: stac_item.stac_version,
                stac_extensions: stac_item
                    .stac_extensions
                    .map(|exts| serde_json::to_value(exts).unwrap_or_default()),
                geometry: stac_item
                    .geometry
                    .map(|geom| serde_json::to_value(geom).unwrap_or_default()),
                bbox,
                properties: serde_json::to_value(stac_item.properties).unwrap_or_default(),
                links: Some(serde_json::to_value(stac_item.links).unwrap_or_default()),
                assets: Some(serde_json::to_value(stac_item.assets).unwrap_or_default()),
                created_at: chrono::Utc::now().to_rfc3339(),
                updated_at: chrono::Utc::now().to_rfc3339(),
            };

            db_item
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "BadRequest",
                "description": "Invalid item data format"
            });

            return (
                axum::http::StatusCode::BAD_REQUEST,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };

    // Update the item in the database
    match state.db_service.items.update(&db_item).await {
        Ok(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/geo+json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            // Return the updated item
            (
                axum::http::StatusCode::OK,
                headers,
                serde_json::to_string(&item_data).unwrap(),
            )
                .into_response()
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": "Failed to update item"
            });

            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    }
}

pub async fn put_collection(
    Path(collection_id): Path<String>,
    State(state): State<AppState>,
    Json(collection_data): Json<serde_json::Value>,
) -> Response {
    let server_config = ServerConfig::from_config(&state.config);

    // Check if collection exists first
    let _db_collection = match state.db_service.collections.get_by_id(&collection_id).await {
        Ok(Some(_)) => (), // Collection exists, proceed with update
        Ok(None) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "NotFound",
                "description": format!("Collection '{}' not found", collection_id)
            });

            return (
                axum::http::StatusCode::NOT_FOUND,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": "Failed to check collection existence"
            });

            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };

    // Parse the collection data and create a DbCollection
    let db_collection = match serde_json::from_value::<crate::models::collection::Collection>(
        collection_data.clone(),
    ) {
        Ok(stac_collection) => {
            // Validate that the collection ID matches the path parameter
            if stac_collection.id != collection_id {
                let mut headers = HeaderMap::new();
                headers.insert(
                    "Content-Type",
                    HeaderValue::from_static("application/json; charset=utf-8"),
                );
                headers = add_cors_headers(headers);

                let error_response = serde_json::json!({
                    "code": "BadRequest",
                    "description": "Collection ID in request body does not match path parameter"
                });

                return (
                    axum::http::StatusCode::BAD_REQUEST,
                    headers,
                    serde_json::to_string(&error_response).unwrap(),
                )
                    .into_response();
            }

            // Convert STAC collection to DbCollection
            let db_collection = crate::database::models::DbCollection {
                id: collection_id.clone(),
                r#type: stac_collection.r#type,
                stac_version: stac_collection.stac_version,
                stac_extensions: stac_collection
                    .stac_extensions
                    .map(|exts| serde_json::to_value(exts).unwrap_or_default()),
                title: stac_collection.title,
                description: stac_collection.description,
                keywords: stac_collection
                    .keywords
                    .map(|keywords| serde_json::to_value(keywords).unwrap_or_default()),
                license: stac_collection.license,
                providers: stac_collection
                    .providers
                    .map(|providers| serde_json::to_value(providers).unwrap_or_default()),
                extent_spatial_bbox: serde_json::to_value(&stac_collection.extent.spatial)
                    .unwrap_or_default(),
                extent_temporal_interval: serde_json::to_value(&stac_collection.extent.temporal)
                    .unwrap_or_default(),
                summaries: stac_collection
                    .summaries
                    .map(|summaries| serde_json::to_value(summaries).unwrap_or_default()),
                assets: stac_collection
                    .assets
                    .map(|assets| serde_json::to_value(assets).unwrap_or_default()),
                conforms_to: serde_json::to_value(stac_collection.conforms_to).unwrap_or_default(),
                created_at: chrono::Utc::now().to_rfc3339(),
                updated_at: chrono::Utc::now().to_rfc3339(),
            };

            db_collection
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "BadRequest",
                "description": "Invalid collection data format"
            });

            return (
                axum::http::StatusCode::BAD_REQUEST,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };

    // Update the collection in the database
    match state.db_service.collections.update(&db_collection).await {
        Ok(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            // Return the updated collection
            (
                axum::http::StatusCode::OK,
                headers,
                serde_json::to_string(&collection_data).unwrap(),
            )
                .into_response()
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": "Failed to update collection"
            });

            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    }
}

/// Handler to create a new collection (POST /collections)
pub async fn create_collection(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Response {
    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    headers = add_cors_headers(headers);

    // Extract required fields
    let id = match payload.get("id").and_then(|v| v.as_str()) {
        Some(s) => s.to_string(),
        None => {
            let error_response = json!({
                "code": "BadRequest",
                "description": "Missing required field: id"
            });
            return (
                axum::http::StatusCode::BAD_REQUEST,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };
    let title = payload
        .get("title")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let description = match payload.get("description").and_then(|v| v.as_str()) {
        Some(s) => s.to_string(),
        None => {
            let error_response = json!({
                "code": "BadRequest",
                "description": "Missing required field: description"
            });
            return (
                axum::http::StatusCode::BAD_REQUEST,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };
    let license = match payload.get("license").and_then(|v| v.as_str()) {
        Some(s) => s.to_string(),
        None => {
            let error_response = json!({
                "code": "BadRequest",
                "description": "Missing required field: license"
            });
            return (
                axum::http::StatusCode::BAD_REQUEST,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };

    // Fill in defaults for other fields
    let now = Utc::now().to_rfc3339();
    let db_collection = crate::database::models::DbCollection {
        id: id.clone(),
        r#type: "Collection".to_string(),
        stac_version: "1.0.0".to_string(),
        stac_extensions: None,
        title: title.clone(),
        description: description.clone(),
        keywords: None,
        license: license.clone(),
        providers: None,
        extent_spatial_bbox: json!({ "bbox": [[-180.0, -90.0, 180.0, 90.0]] }),
        extent_temporal_interval: json!({ "interval": [[null, null]] }),
        summaries: None,
        assets: None,
        conforms_to: json!([
            "https://api.stacspec.org/v1.0.0/core",
            "https://api.stacspec.org/v1.0.0/collections",
            "https://api.stacspec.org/v1.0.0/item-search",
            "https://api.stacspec.org/v1.0.0/ogcapi-features"
        ]),
        created_at: now.clone(),
        updated_at: now,
    };

    // Insert into database
    match state.db_service.collections.create(&db_collection).await {
        Ok(_) => (
            axum::http::StatusCode::CREATED,
            headers,
            serde_json::to_string(&db_collection).unwrap(),
        )
            .into_response(),
        Err(e) => {
            let error_response = json!({
                "code": "InternalServerError",
                "description": format!("Failed to create collection: {}", e)
            });
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response()
        }
    }
}

/// Handler to create a new item (POST /collections/:collection_id/items)
pub async fn create_item(
    Path(collection_id): Path<String>,
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Response {
    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    headers = add_cors_headers(headers);

    // Extract required fields
    let id = match payload.get("id").and_then(|v| v.as_str()) {
        Some(s) => s.to_string(),
        None => {
            let error_response = serde_json::json!({
                "code": "BadRequest",
                "description": "Missing required field: id"
            });
            return (
                axum::http::StatusCode::BAD_REQUEST,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };
    let geometry = match payload.get("geometry") {
        Some(g) => g.clone(),
        None => {
            let error_response = serde_json::json!({
                "code": "BadRequest",
                "description": "Missing required field: geometry"
            });
            return (
                axum::http::StatusCode::BAD_REQUEST,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };
    let properties = match payload.get("properties") {
        Some(p) => p.clone(),
        None => {
            let error_response = serde_json::json!({
                "code": "BadRequest",
                "description": "Missing required field: properties"
            });
            return (
                axum::http::StatusCode::BAD_REQUEST,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };
    let assets = match payload.get("assets") {
        Some(a) => a.clone(),
        None => {
            let error_response = serde_json::json!({
                "code": "BadRequest",
                "description": "Missing required field: assets"
            });
            return (
                axum::http::StatusCode::BAD_REQUEST,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };

    // Compute bbox from geometry if possible
    let bbox = match geometry.get("type").and_then(|t| t.as_str()) {
        Some("Point") => {
            if let Some(coords) = geometry.get("coordinates") {
                if let Some(arr) = coords.as_array() {
                    if arr.len() == 2 {
                        let x = arr[0].as_f64().unwrap_or(0.0);
                        let y = arr[1].as_f64().unwrap_or(0.0);
                        Some(serde_json::json!([x, y, x, y]))
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            }
        }
        Some("Polygon") => {
            if let Some(coords) = geometry.get("coordinates") {
                if let Some(rings) = coords.as_array() {
                    let mut xs = vec![];
                    let mut ys = vec![];
                    for ring in rings {
                        if let Some(points) = ring.as_array() {
                            for point in points {
                                if let Some(pt) = point.as_array() {
                                    if pt.len() == 2 {
                                        xs.push(pt[0].as_f64().unwrap_or(0.0));
                                        ys.push(pt[1].as_f64().unwrap_or(0.0));
                                    }
                                }
                            }
                        }
                    }
                    if !xs.is_empty() && !ys.is_empty() {
                        let min_x = xs.iter().cloned().fold(f64::INFINITY, f64::min);
                        let max_x = xs.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
                        let min_y = ys.iter().cloned().fold(f64::INFINITY, f64::min);
                        let max_y = ys.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
                        Some(serde_json::json!([min_x, min_y, max_x, max_y]))
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            }
        }
        _ => None,
    };

    let now = chrono::Utc::now().to_rfc3339();
    let db_item = crate::database::models::DbItem {
        id: id.clone(),
        collection_id: collection_id.clone(),
        r#type: "Feature".to_string(),
        stac_version: "1.0.0".to_string(),
        stac_extensions: None,
        geometry: Some(geometry),
        bbox,
        properties,
        links: None,
        assets: Some(assets),
        created_at: now.clone(),
        updated_at: now,
    };

    // Insert into database
    match state.db_service.items.create(&db_item).await {
        Ok(_) => (
            axum::http::StatusCode::CREATED,
            headers,
            serde_json::to_string(&db_item).unwrap(),
        )
            .into_response(),
        Err(e) => {
            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": format!("Failed to create item: {}", e)
            });
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response()
        }
    }
}

/// Handler to upload an asset file for a specific item
pub async fn upload_asset(
    Path((collection_id, item_id, asset_key)): Path<(String, String, String)>,
    State(state): State<AppState>,
    mut multipart: axum::extract::Multipart,
) -> Response {

    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    headers = add_cors_headers(headers);

    // Verify the item exists
    let db_item = match state
        .db_service
        .items
        .get_by_id(&collection_id, &item_id)
        .await
    {
        Ok(Some(_)) => {}
        Ok(None) => {
            let error_response = serde_json::json!({
                "code": "NotFound",
                "description": format!("Item '{}' not found in collection '{}'", item_id, collection_id)
            });
            return (
                axum::http::StatusCode::NOT_FOUND,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
        Err(_) => {
            let error_response = serde_json::json!({
                "code": "InternalServerError",
                "description": "Failed to verify item exists"
            });
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response();
        }
    };

    // Create assets directory if it doesn't exist
            let assets_dir = format!("{}/{}/{}", state.config.assets_dir(), collection_id, item_id);

    if let Err(e) = std::fs::create_dir_all(&assets_dir) {
    
        let error_response = serde_json::json!({
            "code": "InternalServerError",
            "description": format!("Failed to create assets directory: {}", e)
        });
        return (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            headers,
            serde_json::to_string(&error_response).unwrap(),
        )
            .into_response();
    }


    // Process the multipart form data
    while let Some(field) = multipart.next_field().await.unwrap() {
        let name = field.name().unwrap_or_default().to_string();

        if name == "file" {
            let filename = field.file_name().unwrap_or_default().to_string();
            let content_type = field
                .content_type()
                .unwrap_or("application/octet-stream")
                .to_string();

            // Read the file data
            let data = match field.bytes().await {
                Ok(data) => data,
                Err(_) => {
                    let error_response = serde_json::json!({
                        "code": "BadRequest",
                        "description": "Failed to read uploaded file data"
                    });
                    return (
                        axum::http::StatusCode::BAD_REQUEST,
                        headers,
                        serde_json::to_string(&error_response).unwrap(),
                    )
                        .into_response();
                }
            };

            // Save the file
            let file_path = format!("{}/{}", assets_dir, asset_key);
            if let Err(e) = std::fs::write(&file_path, &data) {
                let error_response = serde_json::json!({
                    "code": "InternalServerError",
                    "description": format!("Failed to save uploaded file: {}", e)
                });
                return (
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    headers,
                    serde_json::to_string(&error_response).unwrap(),
                )
                    .into_response();
            }

            // Update the item's assets in the database
            let server_config = ServerConfig::from_config(&state.config);
            let asset_href = server_config.asset_href(&collection_id, &item_id, &asset_key);

            // Get current item
            let mut db_item = match state
                .db_service
                .items
                .get_by_id(&collection_id, &item_id)
                .await
            {
                Ok(Some(item)) => item,
                Ok(None) => {
                    let error_response = serde_json::json!({
                        "code": "NotFound",
                        "description": "Item not found after upload"
                    });
                    return (
                        axum::http::StatusCode::NOT_FOUND,
                        headers,
                        serde_json::to_string(&error_response).unwrap(),
                    )
                        .into_response();
                }
                Err(_) => {
                    let error_response = serde_json::json!({
                        "code": "InternalServerError",
                        "description": "Failed to retrieve item for asset update"
                    });
                    return (
                        axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                        headers,
                        serde_json::to_string(&error_response).unwrap(),
                    )
                        .into_response();
                }
            };

            // Update assets
            let mut assets = if let Some(assets_json) = &db_item.assets {
                serde_json::from_value::<std::collections::HashMap<String, serde_json::Value>>(
                    assets_json.clone(),
                )
                .unwrap_or_default()
            } else {
                std::collections::HashMap::new()
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

            // Add or update the asset with proper STAC structure
            let asset_data = serde_json::json!({
                "href": asset_href,
                "type": content_type,
                "title": filename,
                "description": format!("Uploaded asset: {}", filename),
                "roles": roles
            });

            assets.insert(asset_key.clone(), asset_data.clone());

        

        


            db_item.assets = Some(serde_json::to_value(assets).unwrap());
            db_item.updated_at = chrono::Utc::now().to_rfc3339();

            // Save updated item
            if let Err(_) = state.db_service.items.update(&db_item).await {
                let error_response = serde_json::json!({
                    "code": "InternalServerError",
                    "description": "Failed to update item with new asset"
                });
                return (
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    headers,
                    serde_json::to_string(&error_response).unwrap(),
                )
                    .into_response();
            }

            let success_response = serde_json::json!({
                "success": true,
                "message": "Asset uploaded successfully",
                "asset": {
                    "href": asset_href,
                    "type": content_type,
                    "title": filename,
                    "key": asset_key
                }
            });

            return (
                axum::http::StatusCode::CREATED,
                headers,
                serde_json::to_string(&success_response).unwrap(),
            )
                .into_response();
        }
    }

    let error_response = serde_json::json!({
        "code": "BadRequest",
        "description": "No file found in upload request"
    });
    (
        axum::http::StatusCode::BAD_REQUEST,
        headers,
        serde_json::to_string(&error_response).unwrap(),
    )
        .into_response()
}

/// Handler to serve asset files
pub async fn serve_asset(
    Path((collection_id, item_id, asset_key)): Path<(String, String, String)>,
    State(_state): State<AppState>,
) -> Response {
            let config = crate::config::Config::default();
        let file_path = format!("{}/{}/{}/{}", config.assets_dir(), collection_id, item_id, asset_key);

    match std::fs::read(&file_path) {
        Ok(data) => {
            // Determine content type based on file extension
            let content_type = if let Some(ext) = std::path::Path::new(&asset_key).extension() {
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

            let mut headers = HeaderMap::new();
            headers.insert("Content-Type", HeaderValue::from_str(content_type).unwrap());
            headers.insert(
                "Content-Length",
                HeaderValue::from_str(&data.len().to_string()).unwrap(),
            );
            headers.insert(
                "Cache-Control",
                HeaderValue::from_static("public, max-age=31536000"),
            ); // Cache for 1 year
            headers = add_cors_headers(headers);

            (headers, data).into_response()
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            headers = add_cors_headers(headers);

            let error_response = serde_json::json!({
                "code": "NotFound",
                "description": format!("Asset '{}' not found for item '{}' in collection '{}'", asset_key, item_id, collection_id)
            });

            (
                axum::http::StatusCode::NOT_FOUND,
                headers,
                serde_json::to_string(&error_response).unwrap(),
            )
                .into_response()
        }
    }
}
