#![allow(non_snake_case)]
#![allow(dead_code)]
use serde::{Deserialize, Serialize};

/// Represents a STAC Asset object.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Asset {
    /// URI to the asset object. Relative and absolute URI are both allowed.
    pub href: String,
    /// The displayed title for clients and users.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    /// A description of the Asset providing additional details, such as how it was processed or created. CommonMark 0.29 syntax MAY be used for rich text representation.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Media type of the asset. See the common media types in the best practice doc for commonly used asset types.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    /// The semantic roles of the asset, similar to the use of rel in links.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub roles: Option<Vec<AssetRole>>,
}

/// Common semantic roles for STAC assets.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AssetRole {
    /// An asset that represents a thumbnail of the Item, typically a true color image (for Items with assets in the visible wavelengths), lower-resolution (typically smaller 600x600 pixels), and typically a JPEG or PNG (suitable for display in a web browser).
    Thumbnail,
    /// An asset that represents a possibly larger view than the thumbnail of the Item, for example, a true color composite of multi-band data.
    Overview,
    /// The data itself. This is a suggestion for a common role for data files to be used in case data providers don't come up with their own names and semantics.
    Data,
    /// A metadata sidecar file describing the data in this Item, for example the Landsat-8 MTL file.
    Metadata,
    /// Custom role for assets that don't fit the standard roles
    #[serde(rename = "custom")]
    Custom(String),
}

impl Asset {
    /// Creates a new Asset with the required href.
    pub fn new(href: String) -> Self {
        Self {
            href,
            title: None,
            description: None,
            r#type: None,
            roles: None,
        }
    }

    /// Sets the title of the asset.
    pub fn with_title(mut self, title: String) -> Self {
        self.title = Some(title);
        self
    }

    /// Sets the description of the asset.
    pub fn with_description(mut self, description: String) -> Self {
        self.description = Some(description);
        self
    }

    /// Sets the media type of the asset.
    pub fn with_type(mut self, r#type: String) -> Self {
        self.r#type = Some(r#type);
        self
    }

    /// Sets the roles of the asset.
    pub fn with_roles(mut self, roles: Vec<AssetRole>) -> Self {
        self.roles = Some(roles);
        self
    }

    /// Adds a single role to the asset.
    pub fn add_role(&mut self, role: AssetRole) {
        if let Some(ref mut roles) = self.roles {
            roles.push(role);
        } else {
            self.roles = Some(vec![role]);
        }
    }

    /// Creates a thumbnail asset with common defaults.
    pub fn thumbnail(href: String) -> Self {
        Self {
            href,
            title: Some("Thumbnail".to_string()),
            description: Some("A thumbnail image of the item".to_string()),
            r#type: Some("image/jpeg".to_string()),
            roles: Some(vec![AssetRole::Thumbnail]),
        }
    }

    /// Creates a data asset with common defaults.
    pub fn data(href: String, media_type: String) -> Self {
        Self {
            href,
            title: Some("Data".to_string()),
            description: Some("The main data file for this item".to_string()),
            r#type: Some(media_type),
            roles: Some(vec![AssetRole::Data]),
        }
    }

    /// Creates an overview asset with common defaults.
    pub fn overview(href: String) -> Self {
        Self {
            href,
            title: Some("Overview".to_string()),
            description: Some("An overview image of the item".to_string()),
            r#type: Some("image/png".to_string()),
            roles: Some(vec![AssetRole::Overview]),
        }
    }

    /// Creates a metadata asset with common defaults.
    pub fn metadata(href: String, media_type: String) -> Self {
        Self {
            href,
            title: Some("Metadata".to_string()),
            description: Some("Metadata file describing the data in this item".to_string()),
            r#type: Some(media_type),
            roles: Some(vec![AssetRole::Metadata]),
        }
    }
}
