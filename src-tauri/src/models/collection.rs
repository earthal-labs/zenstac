#![allow(non_snake_case)]
#![allow(dead_code)]
use crate::models::{
    asset::Asset, link::Link, provider::Provider, range::Range, spatial_extent::SpatialExtent,
    temporal_extent::TemporalExtent,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Represents a STAC Collection object.
///
/// A Collection is a set of Items that share common properties and metadata.
/// Collections can be hierarchical, with parent Collections containing child Collections.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Collection {
    /// Must be set to "Collection" to be a valid Collection.
    pub r#type: String,
    /// The STAC version the Collection implements.
    pub stac_version: String,
    /// A list of extension identifiers the Collection implements.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stac_extensions: Option<Vec<String>>,
    /// Identifier for the Collection that is unique across the provider.
    pub id: String,
    /// A short descriptive one-line title for the Collection.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    /// Detailed multi-line description to fully explain the Collection.
    /// CommonMark 0.29 syntax MAY be used for rich text representation.
    pub description: String,
    /// List of keywords describing the Collection.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keywords: Option<Vec<String>>,
    /// Collection's license(s), either a SPDX License identifier,
    /// "various" if multiple licenses apply or "proprietary" for all other cases.
    pub license: String,
    /// A list of providers, which may include all organizations capturing or
    /// processing the data or the hosting provider. Providers should be listed
    /// in chronological order with the most recent provider being the last element of the list.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub providers: Option<Vec<Provider>>,
    /// Spatial and temporal extents.
    pub extent: Extent,
    /// A map of property summaries, either a set of values, a range of values or a JSON Schema.
    /// STRONGLY RECOMMENDED.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summaries: Option<HashMap<String, SummaryValue>>,
    /// A list of references to other documents.
    pub links: Vec<Link>,
    /// Dictionary of asset objects that can be downloaded, each with a unique key.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assets: Option<HashMap<String, Asset>>,
    #[serde(rename = "conformsTo")]
    pub conforms_to: Vec<String>,
}

/// Represents the spatial and temporal extents of a Collection.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Extent {
    /// Spatial extent of the Collection.
    pub spatial: SpatialExtent,
    /// Temporal extent of the Collection.
    pub temporal: TemporalExtent,
}

/// Represents a summary value, which can be a set of values, a range, or a JSON Schema.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
pub enum SummaryValue {
    /// A set of values
    Values(Vec<serde_json::Value>),
    /// A range of values
    Range(Range),
    /// A JSON Schema object
    Schema(serde_json::Value),
}

impl Collection {
    /// Creates a new Collection with the required fields.
    pub fn new(
        id: String,
        description: String,
        license: String,
        extent: Extent,
        links: Vec<Link>,
    ) -> Self {
        Self {
            r#type: "Collection".to_string(),
            stac_version: "1.0.0".to_string(),
            stac_extensions: None,
            id,
            title: None,
            description,
            keywords: None,
            license,
            providers: None,
            extent,
            summaries: None,
            links,
            assets: None,
            conforms_to: Vec::new(),
        }
    }

    /// Sets the title of the collection.
    pub fn with_title(mut self, title: String) -> Self {
        self.title = Some(title);
        self
    }

    /// Sets the STAC extensions.
    pub fn with_extensions(mut self, extensions: Vec<String>) -> Self {
        self.stac_extensions = Some(extensions);
        self
    }

    /// Sets the keywords.
    pub fn with_keywords(mut self, keywords: Vec<String>) -> Self {
        self.keywords = Some(keywords);
        self
    }

    /// Sets the providers.
    pub fn with_providers(mut self, providers: Vec<Provider>) -> Self {
        self.providers = Some(providers);
        self
    }

    /// Adds a provider to the collection.
    pub fn add_provider(&mut self, provider: Provider) {
        if let Some(ref mut providers) = self.providers {
            providers.push(provider);
        } else {
            self.providers = Some(vec![provider]);
        }
    }

    /// Sets the summaries.
    pub fn with_summaries(mut self, summaries: HashMap<String, SummaryValue>) -> Self {
        self.summaries = Some(summaries);
        self
    }

    /// Adds a summary to the collection.
    pub fn add_summary(&mut self, key: String, value: SummaryValue) {
        if let Some(ref mut summaries) = self.summaries {
            summaries.insert(key, value);
        } else {
            let mut summaries = HashMap::new();
            summaries.insert(key, value);
            self.summaries = Some(summaries);
        }
    }

    /// Sets the assets.
    pub fn with_assets(mut self, assets: HashMap<String, Asset>) -> Self {
        self.assets = Some(assets);
        self
    }

    /// Adds an asset to the collection.
    pub fn add_asset(&mut self, key: String, asset: Asset) {
        if let Some(ref mut assets) = self.assets {
            assets.insert(key, asset);
        } else {
            let mut assets = HashMap::new();
            assets.insert(key, asset);
            self.assets = Some(assets);
        }
    }

    /// Adds a link to the collection.
    pub fn add_link(&mut self, link: Link) {
        self.links.push(link);
    }

    /// Creates a basic collection with minimal required fields.
    pub fn basic(
        id: String,
        title: String,
        description: String,
        license: String,
        spatial_extent: SpatialExtent,
        temporal_extent: TemporalExtent,
    ) -> Self {
        let extent = Extent {
            spatial: spatial_extent,
            temporal: temporal_extent,
        };

        let links = vec![Link {
            href: format!("/collections/{}", id),
            rel: "self".to_string(),
            r#type: Some("application/json".to_string()),
            title: Some(format!("{} Collection", title)),
            method: None,
            headers: None,
            body: None,
        }];

        Self::new(id, description, license, extent, links).with_title(title)
    }

    /// Validates that the collection has all required fields.
    pub fn is_valid(&self) -> bool {
        self.r#type == "Collection"
            && !self.stac_version.is_empty()
            && !self.id.is_empty()
            && !self.description.is_empty()
            && !self.license.is_empty()
            && !self.links.is_empty()
    }

    /// Gets a link by its relationship type.
    pub fn get_link_by_rel(&self, rel: &str) -> Option<&Link> {
        self.links.iter().find(|link| link.rel == rel)
    }

    /// Gets all links by their relationship type.
    pub fn get_links_by_rel(&self, rel: &str) -> Vec<&Link> {
        self.links.iter().filter(|link| link.rel == rel).collect()
    }

    /// Gets an asset by its key.
    pub fn get_asset(&self, key: &str) -> Option<&Asset> {
        self.assets.as_ref()?.get(key)
    }

    /// Gets a summary by its key.
    pub fn get_summary(&self, key: &str) -> Option<&SummaryValue> {
        self.summaries.as_ref()?.get(key)
    }

    /// Gets the spatial extent of the collection.
    pub fn spatial_extent(&self) -> &SpatialExtent {
        &self.extent.spatial
    }

    /// Gets the temporal extent of the collection.
    pub fn temporal_extent(&self) -> &TemporalExtent {
        &self.extent.temporal
    }

    /// Creates a collection with common STAC API links.
    pub fn with_stac_api_links(mut self, base_url: &str, collection_id: &str) -> Self {
        // Add standard STAC API links
        self.add_link(Link {
            href: format!("{}/collections/{}", base_url, collection_id),
            rel: "self".to_string(),
            r#type: Some("application/json".to_string()),
            title: Some("This Collection".to_string()),
            method: None,
            headers: None,
            body: None,
        });

        self.add_link(Link {
            href: format!("{}/collections/{}/items", base_url, collection_id),
            rel: "items".to_string(),
            r#type: Some("application/geo+json".to_string()),
            title: Some("Items in this Collection".to_string()),
            method: None,
            headers: None,
            body: None,
        });

        self.add_link(Link {
            href: format!("{}/", base_url),
            rel: "root".to_string(),
            r#type: Some("application/json".to_string()),
            title: Some("Root Catalog".to_string()),
            method: None,
            headers: None,
            body: None,
        });

        self
    }
}

impl Extent {
    /// Creates a new Extent with spatial and temporal extents.
    pub fn new(spatial: SpatialExtent, temporal: TemporalExtent) -> Self {
        Self { spatial, temporal }
    }
}
