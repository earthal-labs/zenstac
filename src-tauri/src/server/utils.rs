#![allow(non_snake_case)]
use crate::config::Config;

/// Utility functions for the zenstac application
pub struct ServerConfig {
    pub base_url: String,
}

impl ServerConfig {


    /// Creates a default ServerConfig for localhost:3000
    pub fn default() -> Self {
        Self {
            base_url: "http://127.0.0.1:3000".to_string(),
        }
    }

    /// Creates a ServerConfig from the application configuration
    pub fn from_config(config: &Config) -> Self {
        Self {
            base_url: config.base_url(),
        }
    }

    /// Generates a full URL by combining the base URL with the given path
    pub fn href(&self, path: &str) -> String {
        if path.starts_with("http://") || path.starts_with("https://") {
            // If it's already a full URL, return it as is
            path.to_string()
        } else {
            // Otherwise, combine with base URL
            let clean_path = if path.starts_with('/') {
                &path[1..]
            } else {
                path
            };
            format!("{}/{}", self.base_url.trim_end_matches('/'), clean_path)
        }
    }

    /// Generates a full URL for the root path
    pub fn root_href(&self) -> String {
        self.base_url.clone()
    }

    /// Generates a full URL for the conformance endpoint
    pub fn conformance_href(&self) -> String {
        self.href("conformance")
    }

    /// Generates a full URL for the collections endpoint
    pub fn collections_href(&self) -> String {
        self.href("collections")
    }

    /// Generates a full URL for a specific collection
    pub fn collection_href(&self, collection_id: &str) -> String {
        self.href(&format!("collections/{}", collection_id))
    }

    /// Generates a full URL for items in a collection
    pub fn collection_items_href(&self, collection_id: &str) -> String {
        self.href(&format!("collections/{}/items", collection_id))
    }

    /// Generates a full URL for a specific item
    pub fn item_href(&self, collection_id: &str, item_id: &str) -> String {
        self.href(&format!("collections/{}/items/{}", collection_id, item_id))
    }

    /// Generates a full URL for an asset following STAC convention
    /// Assets are served through the item's route structure
    pub fn asset_href(&self, collection_id: &str, item_id: &str, asset_key: &str) -> String {
        self.href(&format!(
            "collections/{}/items/{}/{}",
            collection_id, item_id, asset_key
        ))
    }

    /// Generates a full URL for the API documentation
    pub fn api_href(&self) -> String {
        self.href("api")
    }

    /// Generates a full URL for the API documentation HTML
    pub fn api_html_href(&self) -> String {
        self.href("api.html")
    }

    /// Generates a full URL for the search endpoint
    pub fn search_href(&self) -> String {
        self.href("search")
    }


}

use std::fs;

pub fn read_static_html(path: &str) -> Option<String> {
    fs::read_to_string(path).ok()
}
