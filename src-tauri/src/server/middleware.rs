use axum::{
    http::{HeaderMap, HeaderValue, Method, StatusCode, Uri},
    response::{IntoResponse, Response},
};

/// Helper function to add CORS headers for better client compatibility
pub fn add_cors_headers(mut headers: HeaderMap) -> HeaderMap {
    headers.insert("Access-Control-Allow-Origin", HeaderValue::from_static("*"));
    headers.insert(
        "Access-Control-Allow-Methods",
        HeaderValue::from_static("GET, POST, OPTIONS"),
    );
    headers.insert(
        "Access-Control-Allow-Headers",
        HeaderValue::from_static("Content-Type, Authorization"),
    );
    headers.insert(
        "Cache-Control",
        HeaderValue::from_static("no-cache, no-store, must-revalidate"),
    );
    headers.insert("Pragma", HeaderValue::from_static("no-cache"));
    headers.insert("Expires", HeaderValue::from_static("0"));
    headers.insert("Connection", HeaderValue::from_static("close"));
    headers
}

/// Handler for OPTIONS requests (CORS preflight)
pub async fn options_handler() -> Response {
    let mut headers = HeaderMap::new();
    headers = add_cors_headers(headers);
    headers.insert("Content-Length", HeaderValue::from_static("0"));
    (headers, "").into_response()
}

/// Middleware to handle trailing slash redirects
pub async fn trailing_slash_redirect(uri: Uri, method: Method) -> Result<Response, Response> {
    let path = uri.path();

    // Only redirect GET requests (not POST, OPTIONS, etc.)
    if method != Method::GET {
        return Ok(Response::new(axum::body::Body::empty()));
    }

    // Check if the path ends with a trailing slash and is not just "/"
    if path.ends_with('/') && path != "/" {
        // Remove the trailing slash
        let new_path = path.trim_end_matches('/');

        // Build the redirect URL with query parameters preserved
        let redirect_url = if let Some(query) = uri.query() {
            format!("{}?{}", new_path, query)
        } else {
            new_path.to_string()
        };

        // Return a 301 (permanent) redirect
        let mut headers = HeaderMap::new();
        headers.insert("Location", HeaderValue::from_str(&redirect_url).unwrap());
        headers = add_cors_headers(headers);

        return Err((StatusCode::MOVED_PERMANENTLY, headers).into_response());
    }

    Ok(Response::new(axum::body::Body::empty()))
}
