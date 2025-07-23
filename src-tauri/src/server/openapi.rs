use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct OpenApiSpec {
    pub openapi: String,
    pub info: Info,
    pub tags: Vec<Tag>,
    pub paths: HashMap<String, PathItem>,
    pub components: Components,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Info {
    pub title: String,
    pub version: String,
    pub description: String,
    pub contact: Contact,
    pub license: License,
    #[serde(rename = "x-conformance-classes")]
    pub x_conformance_classes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Contact {
    pub name: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct License {
    pub name: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Tag {
    pub name: String,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PathItem {
    pub get: Option<Operation>,
    pub post: Option<Operation>,
    pub put: Option<Operation>,
    pub delete: Option<Operation>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Operation {
    pub tags: Vec<String>,
    pub summary: String,
    pub description: String,
    pub operation_id: String,
    pub parameters: Option<Vec<Parameter>>,
    pub request_body: Option<RequestBody>,
    pub responses: HashMap<String, Response>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Parameter {
    pub name: String,
    #[serde(rename = "in")]
    pub location: String,
    pub required: bool,
    pub schema: ParameterSchema,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ParameterSchema {
    #[serde(rename = "type")]
    pub param_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RequestBody {
    pub required: bool,
    pub content: Content,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Response {
    pub description: String,
    pub content: Option<Content>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Content {
    #[serde(rename = "application/json")]
    pub application_json: Option<JsonContent>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JsonContent {
    pub schema: Schema,
    pub example: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Schema {
    #[serde(rename = "$ref")]
    pub ref_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Components {
    pub schemas: HashMap<String, SchemaDefinition>,
    pub responses: HashMap<String, Response>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SchemaDefinition {
    pub all_of: Vec<Schema>,
}

impl OpenApiSpec {
    pub fn create_stac_core_spec() -> Self {
        let mut paths = HashMap::new();
        
        // Core endpoints
        paths.insert("/".to_string(), PathItem {
            get: Some(Operation {
                tags: vec!["Core".to_string()],
                summary: "Landing Page".to_string(),
                description: "Returns the root STAC Catalog that is the entry point for users to browse with STAC Browser or for search engines to crawl.".to_string(),
                operation_id: "getLandingPage".to_string(),
                parameters: None,
                request_body: None,
                responses: create_standard_responses("landingPage"),
            }),
            post: None,
            put: None,
            delete: None,
        });

        paths.insert("/health".to_string(), PathItem {
            get: Some(Operation {
                tags: vec!["Core".to_string()],
                summary: "Health Check".to_string(),
                description: "Returns the health status of the STAC API server.".to_string(),
                operation_id: "getHealth".to_string(),
                parameters: None,
                request_body: None,
                responses: create_standard_responses("health"),
            }),
            post: None,
            put: None,
            delete: None,
        });

        paths.insert("/conformance".to_string(), PathItem {
            get: Some(Operation {
                tags: vec!["Core".to_string()],
                summary: "Conformance Classes".to_string(),
                description: "Returns the conformance classes that the server conforms to.".to_string(),
                operation_id: "getConformance".to_string(),
                parameters: None,
                request_body: None,
                responses: create_standard_responses("conformance"),
            }),
            post: None,
            put: None,
            delete: None,
        });

        // Collections endpoints
        paths.insert("/collections".to_string(), PathItem {
            get: Some(Operation {
                tags: vec!["Collections".to_string()],
                summary: "List Collections".to_string(),
                description: "Returns a list of all collections in the STAC catalog.".to_string(),
                operation_id: "getCollections".to_string(),
                parameters: None,
                request_body: None,
                responses: create_standard_responses("collections"),
            }),
            post: Some(Operation {
                tags: vec!["Collections".to_string()],
                summary: "Create Collection".to_string(),
                description: "Creates a new collection in the STAC catalog.".to_string(),
                operation_id: "createCollection".to_string(),
                parameters: None,
                request_body: Some(RequestBody {
                    required: true,
                    content: Content {
                        application_json: Some(JsonContent {
                            schema: Schema {
                                ref_path: "#/components/schemas/collection".to_string(),
                            },
                            example: serde_json::json!({
                                "type": "Collection",
                                "stac_version": "1.0.0",
                                "id": "example-collection",
                                "title": "Example Collection",
                                "description": "An example STAC collection"
                            }),
                        }),
                    },
                }),
                responses: create_standard_responses("collection"),
            }),
            put: None,
            delete: None,
        });

        paths.insert("/collections/{collection_id}".to_string(), PathItem {
            get: Some(Operation {
                tags: vec!["Collections".to_string()],
                summary: "Get Collection".to_string(),
                description: "Returns a specific collection by ID.".to_string(),
                operation_id: "getCollection".to_string(),
                parameters: Some(vec![
                    Parameter {
                        name: "collection_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The collection identifier".to_string(),
                    }
                ]),
                request_body: None,
                responses: create_standard_responses("collection"),
            }),
            post: None,
            put: Some(Operation {
                tags: vec!["Collections".to_string()],
                summary: "Update Collection".to_string(),
                description: "Updates an existing collection in the STAC catalog.".to_string(),
                operation_id: "updateCollection".to_string(),
                parameters: Some(vec![
                    Parameter {
                        name: "collection_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The collection identifier".to_string(),
                    }
                ]),
                request_body: Some(RequestBody {
                    required: true,
                    content: Content {
                        application_json: Some(JsonContent {
                            schema: Schema {
                                ref_path: "#/components/schemas/collection".to_string(),
                            },
                            example: serde_json::json!({
                                "type": "Collection",
                                "stac_version": "1.0.0",
                                "id": "example-collection",
                                "title": "Updated Example Collection",
                                "description": "An updated example STAC collection"
                            }),
                        }),
                    },
                }),
                responses: create_standard_responses("collection"),
            }),
            delete: Some(Operation {
                tags: vec!["Collections".to_string()],
                summary: "Delete Collection".to_string(),
                description: "Deletes a collection from the STAC catalog.".to_string(),
                operation_id: "deleteCollection".to_string(),
                parameters: Some(vec![
                    Parameter {
                        name: "collection_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The collection identifier".to_string(),
                    }
                ]),
                request_body: None,
                responses: create_standard_responses("deleted"),
            }),
        });

        // Items endpoints
        paths.insert("/collections/{collection_id}/items".to_string(), PathItem {
            get: Some(Operation {
                tags: vec!["Items".to_string()],
                summary: "List Items".to_string(),
                description: "Returns a list of items in a specific collection.".to_string(),
                operation_id: "getItems".to_string(),
                parameters: Some(vec![
                    Parameter {
                        name: "collection_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The collection identifier".to_string(),
                    },
                    Parameter {
                        name: "limit".to_string(),
                        location: "query".to_string(),
                        required: false,
                        schema: ParameterSchema {
                            param_type: "integer".to_string(),
                        },
                        description: "The maximum number of results to return".to_string(),
                    },
                    Parameter {
                        name: "offset".to_string(),
                        location: "query".to_string(),
                        required: false,
                        schema: ParameterSchema {
                            param_type: "integer".to_string(),
                        },
                        description: "The number of results to skip".to_string(),
                    }
                ]),
                request_body: None,
                responses: create_standard_responses("itemCollection"),
            }),
            post: Some(Operation {
                tags: vec!["Items".to_string()],
                summary: "Create Item".to_string(),
                description: "Creates a new item in a specific collection.".to_string(),
                operation_id: "createItem".to_string(),
                parameters: Some(vec![
                    Parameter {
                        name: "collection_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The collection identifier".to_string(),
                    }
                ]),
                request_body: Some(RequestBody {
                    required: true,
                    content: Content {
                        application_json: Some(JsonContent {
                            schema: Schema {
                                ref_path: "#/components/schemas/item".to_string(),
                            },
                            example: serde_json::json!({
                                "type": "Feature",
                                "stac_version": "1.0.0",
                                "id": "example-item",
                                "collection": "example-collection",
                                "geometry": {
                                    "type": "Point",
                                    "coordinates": [0, 0]
                                },
                                "properties": {
                                    "datetime": "2023-01-01T00:00:00Z"
                                }
                            }),
                        }),
                    },
                }),
                responses: create_standard_responses("item"),
            }),
            put: None,
            delete: None,
        });

        paths.insert("/collections/{collection_id}/items/{item_id}".to_string(), PathItem {
            get: Some(Operation {
                tags: vec!["Items".to_string()],
                summary: "Get Item".to_string(),
                description: "Returns a specific item by ID from a collection.".to_string(),
                operation_id: "getItem".to_string(),
                parameters: Some(vec![
                    Parameter {
                        name: "collection_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The collection identifier".to_string(),
                    },
                    Parameter {
                        name: "item_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The item identifier".to_string(),
                    }
                ]),
                request_body: None,
                responses: create_standard_responses("item"),
            }),
            post: None,
            put: Some(Operation {
                tags: vec!["Items".to_string()],
                summary: "Update Item".to_string(),
                description: "Updates an existing item in a collection.".to_string(),
                operation_id: "updateItem".to_string(),
                parameters: Some(vec![
                    Parameter {
                        name: "collection_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The collection identifier".to_string(),
                    },
                    Parameter {
                        name: "item_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The item identifier".to_string(),
                    }
                ]),
                request_body: Some(RequestBody {
                    required: true,
                    content: Content {
                        application_json: Some(JsonContent {
                            schema: Schema {
                                ref_path: "#/components/schemas/item".to_string(),
                            },
                            example: serde_json::json!({
                                "type": "Feature",
                                "stac_version": "1.0.0",
                                "id": "example-item",
                                "collection": "example-collection",
                                "geometry": {
                                    "type": "Point",
                                    "coordinates": [0, 0]
                                },
                                "properties": {
                                    "datetime": "2023-01-01T00:00:00Z"
                                }
                            }),
                        }),
                    },
                }),
                responses: create_standard_responses("item"),
            }),
            delete: Some(Operation {
                tags: vec!["Items".to_string()],
                summary: "Delete Item".to_string(),
                description: "Deletes an item from a collection.".to_string(),
                operation_id: "deleteItem".to_string(),
                parameters: Some(vec![
                    Parameter {
                        name: "collection_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The collection identifier".to_string(),
                    },
                    Parameter {
                        name: "item_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The item identifier".to_string(),
                    }
                ]),
                request_body: None,
                responses: create_standard_responses("deleted"),
            }),
        });

        // Search endpoints
        paths.insert("/search".to_string(), PathItem {
            get: Some(Operation {
                tags: vec!["Search".to_string()],
                summary: "Search Items (GET)".to_string(),
                description: "Searches for items across all collections using query parameters.".to_string(),
                operation_id: "searchItemsGet".to_string(),
                parameters: Some(vec![
                    Parameter {
                        name: "collections".to_string(),
                        location: "query".to_string(),
                        required: false,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "Comma-separated list of collection IDs to search".to_string(),
                    },
                    Parameter {
                        name: "bbox".to_string(),
                        location: "query".to_string(),
                        required: false,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "Bounding box in format: west,south,east,north".to_string(),
                    },
                    Parameter {
                        name: "datetime".to_string(),
                        location: "query".to_string(),
                        required: false,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "Date/time range in RFC 3339 format".to_string(),
                    },
                    Parameter {
                        name: "limit".to_string(),
                        location: "query".to_string(),
                        required: false,
                        schema: ParameterSchema {
                            param_type: "integer".to_string(),
                        },
                        description: "The maximum number of results to return".to_string(),
                    }
                ]),
                request_body: None,
                responses: create_standard_responses("itemCollection"),
            }),
            post: Some(Operation {
                tags: vec!["Search".to_string()],
                summary: "Search Items (POST)".to_string(),
                description: "Searches for items across all collections using a JSON body.".to_string(),
                operation_id: "searchItemsPost".to_string(),
                parameters: None,
                request_body: Some(RequestBody {
                    required: true,
                    content: Content {
                        application_json: Some(JsonContent {
                            schema: Schema {
                                ref_path: "#/components/schemas/searchBody".to_string(),
                            },
                            example: serde_json::json!({
                                "collections": ["example-collection"],
                                "bbox": [0, 0, 1, 1],
                                "datetime": "2023-01-01T00:00:00Z/2023-12-31T23:59:59Z",
                                "limit": 10
                            }),
                        }),
                    },
                }),
                responses: create_standard_responses("itemCollection"),
            }),
            put: None,
            delete: None,
        });

        // Sortables endpoints
        paths.insert("/sortables".to_string(), PathItem {
            get: Some(Operation {
                tags: vec!["Sortables".to_string()],
                summary: "Get Sortables".to_string(),
                description: "Returns the sortable fields available across all collections.".to_string(),
                operation_id: "getSortables".to_string(),
                parameters: None,
                request_body: None,
                responses: create_standard_responses("sortables"),
            }),
            post: None,
            put: None,
            delete: None,
        });

        paths.insert("/collections/sortables".to_string(), PathItem {
            get: Some(Operation {
                tags: vec!["Sortables".to_string()],
                summary: "Get Collections Sortables".to_string(),
                description: "Returns the sortable fields available for collections.".to_string(),
                operation_id: "getCollectionsSortables".to_string(),
                parameters: None,
                request_body: None,
                responses: create_standard_responses("sortables"),
            }),
            post: None,
            put: None,
            delete: None,
        });

        paths.insert("/collections/{collection_id}/sortables".to_string(), PathItem {
            get: Some(Operation {
                tags: vec!["Sortables".to_string()],
                summary: "Get Collection Sortables".to_string(),
                description: "Returns the sortable fields available for a specific collection.".to_string(),
                operation_id: "getCollectionSortables".to_string(),
                parameters: Some(vec![
                    Parameter {
                        name: "collection_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The collection identifier".to_string(),
                    }
                ]),
                request_body: None,
                responses: create_standard_responses("sortables"),
            }),
            post: None,
            put: None,
            delete: None,
        });

        // Assets endpoints
        paths.insert("/upload/{collection_id}/{item_id}/{asset_key}".to_string(), PathItem {
            get: None,
            post: Some(Operation {
                tags: vec!["Assets".to_string()],
                summary: "Upload Asset".to_string(),
                description: "Uploads an asset file for a specific item.".to_string(),
                operation_id: "uploadAsset".to_string(),
                parameters: Some(vec![
                    Parameter {
                        name: "collection_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The collection identifier".to_string(),
                    },
                    Parameter {
                        name: "item_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The item identifier".to_string(),
                    },
                    Parameter {
                        name: "asset_key".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The asset key/name".to_string(),
                    }
                ]),
                request_body: Some(RequestBody {
                    required: true,
                    content: Content {
                        application_json: Some(JsonContent {
                            schema: Schema {
                                ref_path: "#/components/schemas/asset".to_string(),
                            },
                            example: serde_json::json!({
                                "file": "base64_encoded_file_data",
                                "type": "image/tiff",
                                "title": "Example Asset"
                            }),
                        }),
                    },
                }),
                responses: create_standard_responses("asset"),
            }),
            put: None,
            delete: None,
        });

        paths.insert("/collections/{collection_id}/items/{item_id}/{asset_key}".to_string(), PathItem {
            get: Some(Operation {
                tags: vec!["Assets".to_string()],
                summary: "Get Asset".to_string(),
                description: "Retrieves an asset file for a specific item.".to_string(),
                operation_id: "getAsset".to_string(),
                parameters: Some(vec![
                    Parameter {
                        name: "collection_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The collection identifier".to_string(),
                    },
                    Parameter {
                        name: "item_id".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The item identifier".to_string(),
                    },
                    Parameter {
                        name: "asset_key".to_string(),
                        location: "path".to_string(),
                        required: true,
                        schema: ParameterSchema {
                            param_type: "string".to_string(),
                        },
                        description: "The asset key/name".to_string(),
                    }
                ]),
                request_body: None,
                responses: create_standard_responses("asset"),
            }),
            post: None,
            put: None,
            delete: None,
        });

        let mut schemas = HashMap::new();
        schemas.insert(
            "landingPage".to_string(),
            SchemaDefinition {
                all_of: vec![
                    Schema {
                        ref_path: "commons.yaml#/components/schemas/catalog".to_string(),
                    },
                    Schema {
                        ref_path: "commons.yaml#/components/schemas/conformanceClasses".to_string(),
                    },
                ],
            },
        );

        let mut responses = HashMap::new();
        responses.insert("LandingPage".to_string(), Response {
            description: "The landing page provides links to the API definition.".to_string(),
            content: Some(Content {
                application_json: Some(JsonContent {
                    schema: Schema {
                        ref_path: "#/components/schemas/landingPage".to_string(),
                    },
                    example: serde_json::json!({
                        "type": "Catalog",
                        "stac_version": "1.0.0",
                        "id": "zenstac-catalog",
                        "title": "ZenStac Catalog",
                        "description": "A basic STAC catalog for the ZenSTAC application.",
                        "conformsTo": ["https://api.stacspec.org/v1.0.0/core"],
                        "links": [
                            {
                                "href": "http://127.0.0.1:3000/",
                                "rel": "self",
                                "type": "application/json",
                                "title": "this document"
                            },
                            {
                                "href": "http://127.0.0.1:3000/api",
                                "rel": "service-desc",
                                "type": "application/vnd.oai.openapi+json;version=3.0",
                                "title": "the API definition"
                            },
                            {
                                "href": "http://127.0.0.1:3000/api.html",
                                "rel": "service-doc",
                                "type": "text/html",
                                "title": "the API documentation"
                            },
                            {
                                "href": "http://127.0.0.1:3000/search",
                                "rel": "search",
                                "type": "application/geo+json",
                                "title": "Item Search"
                            }
                        ]
                    }),
                }),
            }),
        });

        OpenApiSpec {
            openapi: "3.0.3".to_string(),
            info: Info {
                title: "ZenSTAC API".to_string(),
                version: "v1.0.0".to_string(),
                description: "A comprehensive STAC API implementation for ZenSTAC with full CRUD operations for collections, items, assets, and search capabilities.".to_string(),
                contact: Contact {
                    name: "Earthal Labs".to_string(),
                    url: "https://www.earthallabs.com/".to_string(),
                },
                license: License {
                    name: "Apache License 2.0".to_string(),
                    url: "http://www.apache.org/licenses/LICENSE-2.0".to_string(),
                },
                x_conformance_classes: vec![
                    "https://api.stacspec.org/v1.0.0/core".to_string(),
                    "https://api.stacspec.org/v1.0.0/collections".to_string(),
                    "https://api.stacspec.org/v1.0.0/item-search".to_string(),
                ],
            },
            tags: vec![
                Tag {
                    name: "Core".to_string(),
                    description: "Essential characteristics of a STAC API".to_string(),
                },
                Tag {
                    name: "Collections".to_string(),
                    description: "Operations for managing STAC collections".to_string(),
                },
                Tag {
                    name: "Items".to_string(),
                    description: "Operations for managing STAC items within collections".to_string(),
                },
                Tag {
                    name: "Search".to_string(),
                    description: "Search operations across collections and items".to_string(),
                },
                Tag {
                    name: "Sortables".to_string(),
                    description: "Sortable fields and ordering capabilities".to_string(),
                },
                Tag {
                    name: "Assets".to_string(),
                    description: "Asset management operations for items".to_string(),
                },
            ],
            paths,
            components: Components {
                schemas,
                responses,
            },
        }
    }
}

fn create_standard_responses(schema_name: &str) -> HashMap<String, Response> {
    let mut responses = HashMap::new();
    responses.insert("200".to_string(), Response {
        description: "Successful operation".to_string(),
        content: Some(Content {
            application_json: Some(JsonContent {
                schema: Schema {
                    ref_path: format!("#/components/schemas/{}", schema_name),
                },
                example: serde_json::json!({}),
            }),
        }),
    });
    responses.insert("400".to_string(), Response {
        description: "Bad request".to_string(),
        content: None,
    });
    responses.insert("404".to_string(), Response {
        description: "Not found".to_string(),
        content: None,
    });
    responses.insert("500".to_string(), Response {
        description: "Internal server error".to_string(),
        content: None,
    });
    responses
}
