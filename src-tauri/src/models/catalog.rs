#![allow(non_snake_case)]
use crate::models::link::Link;
use serde::{Deserialize, Serialize};

/// Represents a STAC Catalog object.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Catalog {
    /// Set to "Catalog" if this Catalog only implements the Catalog spec.
    pub r#type: String,
    /// The STAC version the Catalog implements.
    pub stac_version: String,
    /// A list of extension identifiers the Catalog implements.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stac_extensions: Option<Vec<String>>,
    /// Identifier for the Catalog.
    pub id: String,
    /// A short descriptive one-line title for the Catalog.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    /// Detailed multi-line description to fully explain the Catalog. CommonMark 0.29 syntax MAY be used for rich text representation.
    pub description: String,
    /// A list of references to other documents.
    pub links: Vec<Link>,
    /// The conformance specifications that this STAC API implements.
    #[serde(default = "default_conforms_to", rename = "conformsTo")]
    pub conforms_to: Vec<String>,
}

fn default_conforms_to() -> Vec<String> {
    vec!["https://api.stacspec.org/v1.0.0/core".to_string()]
}
