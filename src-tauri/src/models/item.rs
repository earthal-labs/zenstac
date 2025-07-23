#![allow(non_snake_case)]
#![allow(dead_code)]
use crate::models::{asset::Asset, link::Link, properties::Properties};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Represents a STAC Item object.
///
/// A STAC Item is a GeoJSON Feature with additional fields that makes it a STAC Item.
/// It represents a single spatiotemporal asset as a GeoJSON Feature.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Item {
    /// Type of the GeoJSON Object. MUST be set to "Feature".
    pub r#type: String,
    /// The STAC version the Item implements.
    pub stac_version: String,
    /// A list of extensions the Item implements.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stac_extensions: Option<Vec<String>>,
    /// Provider identifier. The ID should be unique within the Collection that contains the Item.
    pub id: String,
    /// Defines the full footprint of the asset represented by this item, formatted according to RFC 7946, section 3.1.
    /// The footprint should be the default GeoJSON geometry, though additional geometries can be included.
    /// Coordinates are specified in Longitude/Latitude or Longitude/Latitude/Elevation based on WGS 84.
    pub geometry: Option<Geometry>,
    /// Bounding Box of the asset represented by this Item, formatted according to RFC 7946, section 5.
    /// REQUIRED if geometry is not null.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bbox: Option<Vec<f64>>,
    /// A dictionary of additional metadata for the Item.
    pub properties: Properties,
    /// List of link objects to resources and related URLs. A link with the rel set to self is strongly recommended.
    pub links: Vec<Link>,
    /// Dictionary of asset objects that can be downloaded, each with a unique key.
    pub assets: HashMap<String, Asset>,
    /// The id of the STAC Collection this Item references to.
    /// This field is required if such a relation type is present and is not allowed otherwise.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection: Option<String>,
}

/// Represents a GeoJSON Geometry object according to RFC 7946.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type")]
pub enum Geometry {
    /// Point geometry
    #[serde(rename = "Point")]
    Point { coordinates: Vec<f64> },
    /// LineString geometry
    #[serde(rename = "LineString")]
    LineString { coordinates: Vec<Vec<f64>> },
    /// Polygon geometry
    #[serde(rename = "Polygon")]
    Polygon { coordinates: Vec<Vec<Vec<f64>>> },
    /// MultiPoint geometry
    #[serde(rename = "MultiPoint")]
    MultiPoint { coordinates: Vec<Vec<f64>> },
    /// MultiLineString geometry
    #[serde(rename = "MultiLineString")]
    MultiLineString { coordinates: Vec<Vec<Vec<f64>>> },
    /// MultiPolygon geometry
    #[serde(rename = "MultiPolygon")]
    MultiPolygon {
        coordinates: Vec<Vec<Vec<Vec<f64>>>>,
    },
    /// GeometryCollection
    #[serde(rename = "GeometryCollection")]
    GeometryCollection { geometries: Vec<Geometry> },
}

impl Item {
    /// Creates a new Item with the required fields.
    pub fn new(
        id: String,
        properties: Properties,
        links: Vec<Link>,
        assets: HashMap<String, Asset>,
    ) -> Self {
        Self {
            r#type: "Feature".to_string(),
            stac_version: "1.0.0".to_string(),
            stac_extensions: None,
            id,
            geometry: None,
            bbox: None,
            properties,
            links,
            assets,
            collection: None,
        }
    }

    /// Sets the geometry of the item.
    pub fn with_geometry(mut self, geometry: Geometry) -> Self {
        self.geometry = Some(geometry);
        self
    }

    /// Sets the bounding box of the item.
    pub fn with_bbox(mut self, bbox: Vec<f64>) -> Self {
        self.bbox = Some(bbox);
        self
    }

    /// Sets the STAC extensions.
    pub fn with_extensions(mut self, extensions: Vec<String>) -> Self {
        self.stac_extensions = Some(extensions);
        self
    }

    /// Sets the collection ID.
    pub fn with_collection(mut self, collection: String) -> Self {
        self.collection = Some(collection);
        self
    }

    /// Adds a link to the item.
    pub fn add_link(&mut self, link: Link) {
        self.links.push(link);
    }

    /// Adds an asset to the item.
    pub fn add_asset(&mut self, key: String, asset: Asset) {
        self.assets.insert(key, asset);
    }

    /// Creates a basic item with minimal required fields.
    pub fn basic(id: String, properties: Properties, assets: HashMap<String, Asset>) -> Self {
        let links = vec![Link {
            href: format!("/items/{}", id),
            rel: "self".to_string(),
            r#type: Some("application/geo+json".to_string()),
            title: Some(format!("Item {}", id)),
            method: None,
            headers: None,
            body: None,
        }];

        Self::new(id, properties, links, assets)
    }

    /// Creates an item with a point geometry.
    pub fn point(
        id: String,
        properties: Properties,
        longitude: f64,
        latitude: f64,
        assets: HashMap<String, Asset>,
    ) -> Self {
        let geometry = Geometry::Point {
            coordinates: vec![longitude, latitude],
        };

        let bbox = vec![longitude, latitude, longitude, latitude];

        Self::basic(id, properties, assets)
            .with_geometry(geometry)
            .with_bbox(bbox)
    }

    /// Creates an item with a polygon geometry.
    pub fn polygon(
        id: String,
        properties: Properties,
        coordinates: Vec<Vec<Vec<f64>>>,
        assets: HashMap<String, Asset>,
    ) -> Self {
        let geometry = Geometry::Polygon {
            coordinates: coordinates.clone(),
        };

        // Calculate bounding box from polygon coordinates
        let bbox = Self::calculate_bbox_from_polygon(&coordinates[0]);

        Self::basic(id, properties, assets)
            .with_geometry(geometry)
            .with_bbox(bbox)
    }

    /// Creates an item with a bounding box geometry.
    pub fn bbox_item(
        id: String,
        properties: Properties,
        bbox: Vec<f64>,
        assets: HashMap<String, Asset>,
    ) -> Self {
        // Create a polygon from the bounding box
        let coordinates = vec![vec![
            vec![bbox[0], bbox[1]], // min_lon, min_lat
            vec![bbox[2], bbox[1]], // max_lon, min_lat
            vec![bbox[2], bbox[3]], // max_lon, max_lat
            vec![bbox[0], bbox[3]], // min_lon, max_lat
            vec![bbox[0], bbox[1]], // close the polygon
        ]];

        let geometry = Geometry::Polygon { coordinates };

        Self::basic(id, properties, assets)
            .with_geometry(geometry)
            .with_bbox(bbox)
    }

    /// Validates that the item has all required fields.
    pub fn is_valid(&self) -> bool {
        self.r#type == "Feature"
            && !self.stac_version.is_empty()
            && !self.id.is_empty()
            && self.properties.is_valid()
            && !self.links.is_empty()
            && !self.assets.is_empty()
            && self.has_valid_bbox()
    }

    /// Validates that the bounding box is present when geometry is present.
    pub fn has_valid_bbox(&self) -> bool {
        if self.geometry.is_some() {
            self.bbox.is_some()
        } else {
            true // bbox is not required when geometry is null
        }
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
        self.assets.get(key)
    }

    /// Gets the thumbnail asset if it exists.
    pub fn get_thumbnail(&self) -> Option<&Asset> {
        self.assets.values().find(|asset| {
            asset.roles.as_ref().map_or(false, |roles| {
                roles
                    .iter()
                    .any(|role| matches!(role, crate::models::asset::AssetRole::Thumbnail))
            })
        })
    }

    /// Gets the data asset if it exists.
    pub fn get_data_asset(&self) -> Option<&Asset> {
        self.assets.values().find(|asset| {
            asset.roles.as_ref().map_or(false, |roles| {
                roles
                    .iter()
                    .any(|role| matches!(role, crate::models::asset::AssetRole::Data))
            })
        })
    }

    /// Creates an item with common STAC API links.
    pub fn with_stac_api_links(mut self, base_url: &str, collection_id: &str) -> Self {
        // Add standard STAC API links
        self.add_link(Link {
            href: format!(
                "{}/collections/{}/items/{}",
                base_url, collection_id, self.id
            ),
            rel: "self".to_string(),
            r#type: Some("application/geo+json".to_string()),
            title: Some("This Item".to_string()),
            method: None,
            headers: None,
            body: None,
        });

        self.add_link(Link {
            href: format!("{}/collections/{}", base_url, collection_id),
            rel: "collection".to_string(),
            r#type: Some("application/json".to_string()),
            title: Some("Parent Collection".to_string()),
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

    /// Calculates bounding box from polygon coordinates.
    fn calculate_bbox_from_polygon(coordinates: &[Vec<f64>]) -> Vec<f64> {
        if coordinates.is_empty() {
            return vec![0.0, 0.0, 0.0, 0.0];
        }

        let mut min_lon = coordinates[0][0];
        let mut max_lon = coordinates[0][0];
        let mut min_lat = coordinates[0][1];
        let mut max_lat = coordinates[0][1];

        for coord in coordinates {
            min_lon = min_lon.min(coord[0]);
            max_lon = max_lon.max(coord[0]);
            min_lat = min_lat.min(coord[1]);
            max_lat = max_lat.max(coord[1]);
        }

        vec![min_lon, min_lat, max_lon, max_lat]
    }
}

impl Geometry {
    /// Creates a Point geometry.
    pub fn point(longitude: f64, latitude: f64) -> Self {
        Self::Point {
            coordinates: vec![longitude, latitude],
        }
    }

    /// Creates a Point geometry with elevation.
    pub fn point_3d(longitude: f64, latitude: f64, elevation: f64) -> Self {
        Self::Point {
            coordinates: vec![longitude, latitude, elevation],
        }
    }

    /// Creates a LineString geometry.
    pub fn line_string(coordinates: Vec<Vec<f64>>) -> Self {
        Self::LineString { coordinates }
    }

    /// Creates a Polygon geometry.
    pub fn polygon(coordinates: Vec<Vec<Vec<f64>>>) -> Self {
        Self::Polygon { coordinates }
    }

    /// Creates a Polygon geometry from a simple bounding box.
    pub fn polygon_from_bbox(min_lon: f64, min_lat: f64, max_lon: f64, max_lat: f64) -> Self {
        let coordinates = vec![vec![
            vec![min_lon, min_lat],
            vec![max_lon, min_lat],
            vec![max_lon, max_lat],
            vec![min_lon, max_lat],
            vec![min_lon, min_lat], // close the polygon
        ]];

        Self::Polygon { coordinates }
    }

    /// Creates a MultiPoint geometry.
    pub fn multi_point(coordinates: Vec<Vec<f64>>) -> Self {
        Self::MultiPoint { coordinates }
    }

    /// Creates a MultiLineString geometry.
    pub fn multi_line_string(coordinates: Vec<Vec<Vec<f64>>>) -> Self {
        Self::MultiLineString { coordinates }
    }

    /// Creates a MultiPolygon geometry.
    pub fn multi_polygon(coordinates: Vec<Vec<Vec<Vec<f64>>>>) -> Self {
        Self::MultiPolygon { coordinates }
    }

    /// Creates a GeometryCollection.
    pub fn geometry_collection(geometries: Vec<Geometry>) -> Self {
        Self::GeometryCollection { geometries }
    }
}
