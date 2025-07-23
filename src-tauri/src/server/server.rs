use crate::config::Config;
use crate::database::DatabaseService;
use crate::server::handlers::{
    api_html, api_spec, collection, collection_items, collection_sortables, collections,
    collections_sortables, conformance, create_collection, create_item, delete_collection,
    delete_item, health_check, hello_world, item, put_collection, put_item, search_get,
    search_post, serve_asset, sortables, upload_asset,
};
use crate::server::middleware::{options_handler, trailing_slash_redirect};
use axum::{
    routing::{get, post},
    Router,
};
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};

// State that will be shared across all handlers
#[derive(Clone)]
pub struct AppState {
    pub db_service: DatabaseService,
    pub config: Config,
}

pub fn create_stac_router(db_service: DatabaseService, config: Config) -> Router {
    let state = AppState { db_service, config };

    // Get the API version path (e.g., "/v1")
    let api_path = &state.config.server.api_version;

    Router::new()
        .route(api_path, get(hello_world))
        .route(&format!("{}/health", api_path), get(health_check))
        .route(&format!("{}/api", api_path), get(api_spec))
        .route(&format!("{}/api.html", api_path), get(api_html))
        .route(&format!("{}/conformance", api_path), get(conformance))
        .route(
            &format!("{}/collections", api_path),
            get(collections)
                .post(create_collection)
                .options(options_handler),
        )
        .route(
            &format!("{}/collections/:collection_id", api_path),
            get(collection)
                .put(put_collection)
                .delete(delete_collection)
                .options(options_handler),
        )
        .route(
            &format!("{}/collections/:collection_id/items", api_path),
            get(collection_items)
                .post(create_item)
                .options(options_handler),
        )
        .route(
            &format!("{}/collections/:collection_id/items/:item_id", api_path),
            get(item)
                .put(put_item)
                .delete(delete_item)
                .options(options_handler),
        )
        .route(
            &format!("{}/collections/:collection_id/sortables", api_path),
            get(collection_sortables).options(options_handler),
        )
        .route(
            &format!("{}/collections/sortables", api_path),
            get(collections_sortables).options(options_handler),
        )
        .route(
            &format!("{}/sortables", api_path),
            get(sortables).options(options_handler),
        )
        .route(
            &format!("{}/search", api_path),
            get(search_get).post(search_post).options(options_handler),
        )
        // File upload and serving routes
        .route(
            &format!("{}/upload/:collection_id/:item_id/:asset_key", api_path),
            post(upload_asset).options(options_handler),
        )
        .route(
            &format!(
                "{}/collections/:collection_id/items/:item_id/:asset_key",
                api_path
            ),
            get(serve_asset).options(options_handler),
        )
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .layer(axum::middleware::from_fn_with_state(
            (),
            |req: axum::extract::Request, next: axum::middleware::Next| async move {
                let uri = req.uri().clone();
                let method = req.method().clone();

                // Check for trailing slash redirect
                match trailing_slash_redirect(uri, method).await {
                    Ok(_) => next.run(req).await,
                    Err(response) => response,
                }
            },
        ))
        .with_state(state)
}

pub async fn start_stac_server(
    host: &str,
    port: u16,
    db_service: DatabaseService,
    config: Config,
) -> Result<(), Box<dyn std::error::Error>> {
    let app = create_stac_router(db_service, config);
    let listener = TcpListener::bind(format!("{}:{}", host, port)).await?;


    axum::serve(listener, app).await?;
    Ok(())
}
