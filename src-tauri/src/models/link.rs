use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Represents a hypermedia link object.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Link {
    /// The actual link in the format of an URL. Relative and absolute links are both allowed. Trailing slashes are significant.
    pub href: String,
    /// Relationship between the current document and the linked document.
    pub rel: String,
    /// Media type of the referenced entity.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    /// A human readable title to be used in rendered displays of the link.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    /// The HTTP method that shall be used for the request to the target resource, in uppercase. GET by default.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,
    /// The HTTP headers to be sent for the request to the target resource.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<HashMap<String, Vec<String>>>,
    /// The HTTP body to be sent to the target resource.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<serde_json::Value>,
}


