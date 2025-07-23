use crate::database::{DbCollection, DbItem};
use crate::models::{
    collection::SummaryValue, link::Link, range::Range, Asset, Collection, Item, Properties,
};
use crate::server::utils::ServerConfig;
use serde_json::Value;

impl DbCollection {
    pub fn to_stac_collection(&self, server_config: &ServerConfig) -> Collection {
        let mut links = Vec::new();
        links.push(Link {
            href: server_config.collection_href(&self.id),
            rel: "self".to_string(),
            r#type: Some("application/json".to_string()),
            title: Some("This Collection".to_string()),
            method: None,
            headers: None,
            body: None,
        });
        links.push(Link {
            href: server_config.collection_items_href(&self.id),
            rel: "items".to_string(),
            r#type: Some("application/geo+json".to_string()),
            title: Some("Items in this Collection".to_string()),
            method: None,
            headers: None,
            body: None,
        });
        links.push(Link {
            href: server_config.root_href(),
            rel: "root".to_string(),
            r#type: Some("application/json".to_string()),
            title: Some("Root Catalog".to_string()),
            method: None,
            headers: None,
            body: None,
        });
        links.push(Link {
            href: server_config.root_href(),
            rel: "parent".to_string(),
            r#type: Some("application/json".to_string()),
            title: Some("Parent Catalog".to_string()),
            method: None,
            headers: None,
            body: None,
        });

        let extent_spatial = serde_json::from_value(self.extent_spatial_bbox.clone())
            .unwrap_or_else(|_| crate::models::SpatialExtent::whole_earth_2d());

        let extent_temporal = serde_json::from_value(self.extent_temporal_interval.clone())
            .unwrap_or_else(|_| crate::models::TemporalExtent::single_interval(None, None));

        let summaries = if let Some(summaries_json) = &self.summaries {
            if let Ok(summaries_map) = serde_json::from_value::<
                std::collections::HashMap<String, Value>,
            >(summaries_json.clone())
            {
                let mut summaries = std::collections::HashMap::new();
                for (key, value) in summaries_map {
                    if let Some(range) = value
                        .get("minimum")
                        .and_then(|min| value.get("maximum").map(|max| (min, max)))
                    {
                        if let (Some(min), Some(max)) = (range.0.as_f64(), range.1.as_f64()) {
                            summaries.insert(key, SummaryValue::Range(Range::numeric(min, max)));
                        }
                    }
                }
                Some(summaries)
            } else {
                None
            }
        } else {
            None
        };

        let assets = if let Some(assets_json) = &self.assets {
            if let Ok(assets_map) = serde_json::from_value::<std::collections::HashMap<String, Value>>(
                assets_json.clone(),
            ) {
                let mut assets = std::collections::HashMap::new();
                for (key, asset_value) in assets_map {
                    if let Ok(asset) = serde_json::from_value::<Asset>(asset_value) {
                        assets.insert(key, asset);
                    }
                }
                Some(assets)
            } else {
                None
            }
        } else {
            None
        };

        let providers = if let Some(providers_json) = &self.providers {
            serde_json::from_value(providers_json.clone()).ok()
        } else {
            None
        };

        let conforms_to: Vec<String> = serde_json::from_value(self.conforms_to.clone())
            .unwrap_or_else(|_| vec!["https://api.stacspec.org/v1.0.0/core".to_string()]);

        let stac_extensions = if let Some(extensions_json) = &self.stac_extensions {
            serde_json::from_value::<Vec<String>>(extensions_json.clone()).ok()
        } else {
            None
        };

        Collection {
            r#type: self.r#type.clone(),
            stac_version: self.stac_version.clone(),
            stac_extensions,
            id: self.id.clone(),
            title: self.title.clone(),
            description: self.description.clone(),
            keywords: self
                .keywords
                .as_ref()
                .and_then(|k| serde_json::from_value(k.clone()).ok()),
            license: self.license.clone(),
            providers,
            extent: crate::models::collection::Extent {
                spatial: extent_spatial,
                temporal: extent_temporal,
            },
            summaries,
            links,
            assets,
            conforms_to,
        }
    }
}

impl DbItem {
    pub fn to_stac_item(&self, server_config: &ServerConfig) -> Item {
        let geometry = if let Some(geom_json) = &self.geometry {
            serde_json::from_value(geom_json.clone()).ok()
        } else {
            None
        };

        let bbox = if let Some(bbox_json) = &self.bbox {
            serde_json::from_value(bbox_json.clone()).ok()
        } else {
            None
        };

        let properties: Properties = serde_json::from_value(self.properties.clone())
            .unwrap_or_else(|_| Properties::new(None));

        let links = if let Some(links_json) = &self.links {
            let mut links: Vec<Link> =
                serde_json::from_value(links_json.clone()).unwrap_or_else(|_| Vec::new());

            // Add standard STAC links
            links.push(Link {
                href: server_config.root_href(),
                rel: "root".to_string(),
                r#type: Some("application/json".to_string()),
                title: Some("Root Catalog".to_string()),
                method: None,
                headers: None,
                body: None,
            });
            links.push(Link {
                href: server_config.item_href(&self.collection_id, &self.id),
                rel: "self".to_string(),
                r#type: Some("application/geo+json".to_string()),
                title: Some("This Item".to_string()),
                method: None,
                headers: None,
                body: None,
            });
            links.push(Link {
                href: server_config.collection_href(&self.collection_id),
                rel: "collection".to_string(),
                r#type: Some("application/json".to_string()),
                title: Some("Collection".to_string()),
                method: None,
                headers: None,
                body: None,
            });
            links.push(Link {
                href: server_config.collection_href(&self.collection_id),
                rel: "parent".to_string(),
                r#type: Some("application/json".to_string()),
                title: Some("Parent Collection".to_string()),
                method: None,
                headers: None,
                body: None,
            });

            links
        } else {
            vec![
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
                    href: server_config.item_href(&self.collection_id, &self.id),
                    rel: "self".to_string(),
                    r#type: Some("application/geo+json".to_string()),
                    title: Some("This Item".to_string()),
                    method: None,
                    headers: None,
                    body: None,
                },
                Link {
                    href: server_config.collection_href(&self.collection_id),
                    rel: "collection".to_string(),
                    r#type: Some("application/json".to_string()),
                    title: Some("Collection".to_string()),
                    method: None,
                    headers: None,
                    body: None,
                },
                Link {
                    href: server_config.collection_href(&self.collection_id),
                    rel: "parent".to_string(),
                    r#type: Some("application/json".to_string()),
                    title: Some("Parent Collection".to_string()),
                    method: None,
                    headers: None,
                    body: None,
                },
            ]
        };

        let assets = if let Some(assets_json) = &self.assets {
            serde_json::from_value(assets_json.clone())
                .unwrap_or_else(|_| std::collections::HashMap::new())
        } else {
            std::collections::HashMap::new()
        };

        let stac_extensions = if let Some(extensions_json) = &self.stac_extensions {
            serde_json::from_value::<Vec<String>>(extensions_json.clone()).ok()
        } else {
            None
        };

        Item {
            r#type: self.r#type.clone(),
            stac_version: self.stac_version.clone(),
            stac_extensions,
            id: self.id.clone(),
            geometry,
            bbox,
            properties,
            links,
            assets,
            collection: Some(self.collection_id.clone()),
        }
    }
}
