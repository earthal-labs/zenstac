use crate::models::{self, Item};

/// Calculates bounding box for different geometry types
#[allow(dead_code)]
pub fn calculate_bbox_for_geometry(geometry: &models::item::Geometry) -> Vec<f64> {
    match geometry {
        models::item::Geometry::Point { coordinates } => {
            if coordinates.len() >= 2 {
                vec![
                    coordinates[0],
                    coordinates[1],
                    coordinates[0],
                    coordinates[1],
                ]
            } else {
                vec![0.0, 0.0, 0.0, 0.0]
            }
        }
        models::item::Geometry::LineString { coordinates } => {
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
        models::item::Geometry::Polygon { coordinates } => {
            if coordinates.is_empty() || coordinates[0].is_empty() {
                return vec![0.0, 0.0, 0.0, 0.0];
            }

            let mut min_lon = coordinates[0][0][0];
            let mut max_lon = coordinates[0][0][0];
            let mut min_lat = coordinates[0][0][1];
            let mut max_lat = coordinates[0][0][1];

            for ring in coordinates {
                for coord in ring {
                    min_lon = min_lon.min(coord[0]);
                    max_lon = max_lon.max(coord[0]);
                    min_lat = min_lat.min(coord[1]);
                    max_lat = max_lat.max(coord[1]);
                }
            }

            vec![min_lon, min_lat, max_lon, max_lat]
        }
        models::item::Geometry::MultiPoint { coordinates } => {
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
        models::item::Geometry::MultiLineString { coordinates } => {
            if coordinates.is_empty() || coordinates[0].is_empty() {
                return vec![0.0, 0.0, 0.0, 0.0];
            }

            let mut min_lon = coordinates[0][0][0];
            let mut max_lon = coordinates[0][0][0];
            let mut min_lat = coordinates[0][0][1];
            let mut max_lat = coordinates[0][0][1];

            for line in coordinates {
                for coord in line {
                    min_lon = min_lon.min(coord[0]);
                    max_lon = max_lon.max(coord[0]);
                    min_lat = min_lat.min(coord[1]);
                    max_lat = max_lat.max(coord[1]);
                }
            }

            vec![min_lon, min_lat, max_lon, max_lat]
        }
        models::item::Geometry::MultiPolygon { coordinates } => {
            if coordinates.is_empty() || coordinates[0].is_empty() || coordinates[0][0].is_empty() {
                return vec![0.0, 0.0, 0.0, 0.0];
            }

            let mut min_lon = coordinates[0][0][0][0];
            let mut max_lon = coordinates[0][0][0][0];
            let mut min_lat = coordinates[0][0][0][1];
            let mut max_lat = coordinates[0][0][0][1];

            for polygon in coordinates {
                for ring in polygon {
                    for coord in ring {
                        min_lon = min_lon.min(coord[0]);
                        max_lon = max_lon.max(coord[0]);
                        min_lat = min_lat.min(coord[1]);
                        max_lat = max_lat.max(coord[1]);
                    }
                }
            }

            vec![min_lon, min_lat, max_lon, max_lat]
        }
        models::item::Geometry::GeometryCollection { geometries } => {
            if geometries.is_empty() {
                return vec![0.0, 0.0, 0.0, 0.0];
            }

            let mut min_lon = f64::MAX;
            let mut max_lon = f64::MIN;
            let mut min_lat = f64::MAX;
            let mut max_lat = f64::MIN;

            for geometry in geometries {
                let bbox = calculate_bbox_for_geometry(geometry);
                if bbox.len() >= 4 {
                    min_lon = min_lon.min(bbox[0]);
                    min_lat = min_lat.min(bbox[1]);
                    max_lon = max_lon.max(bbox[2]);
                    max_lat = max_lat.max(bbox[3]);
                }
            }

            if min_lon == f64::MAX {
                vec![0.0, 0.0, 0.0, 0.0]
            } else {
                vec![min_lon, min_lat, max_lon, max_lat]
            }
        }
    }
}



/// Parses sortby parameter string into field/direction pairs
pub fn parse_sortby(sortby_str: &str) -> Result<Vec<(String, String)>, String> {
    let mut sortby = Vec::new();

    for part in sortby_str.split(',') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }

        if part.contains(':') {
            let mut split = part.split(':');
            let field = split.next().unwrap_or("").trim().to_string();
            let direction = split.next().unwrap_or("asc").trim().to_string();

            if !field.is_empty() {
                sortby.push((field, direction));
            }
        } else {
            sortby.push((part.to_string(), "asc".to_string()));
        }
    }

    if sortby.is_empty() {
        Err("No valid sort fields found".to_string())
    } else {
        Ok(sortby)
    }
}

/// Sorts items based on sortby parameters
pub fn sort_items(mut items: Vec<Item>, sortby: &[(String, String)]) -> Vec<Item> {
    for (field, direction) in sortby.iter().rev() {
        items.sort_by(|a, b| {
            let comparison = match field.as_str() {
                "datetime" => {
                    let a_datetime = a.properties.datetime.as_deref().unwrap_or("");
                    let b_datetime = b.properties.datetime.as_deref().unwrap_or("");
                    a_datetime.cmp(b_datetime)
                }
                "id" => a.id.cmp(&b.id),
                _ => std::cmp::Ordering::Equal,
            };

            if direction == "desc" {
                comparison.reverse()
            } else {
                comparison
            }
        });
    }

    items
}

/// Filters items by bounding box
pub fn filter_items_by_bbox(items: &[Item], bbox_str: &str) -> Vec<Item> {
    let bbox_parts: Vec<f64> = bbox_str
        .split(',')
        .filter_map(|s| s.trim().parse::<f64>().ok())
        .collect();

    if bbox_parts.len() != 4 {
        return items.to_vec();
    }

    let [min_lon, min_lat, max_lon, max_lat] =
        [bbox_parts[0], bbox_parts[1], bbox_parts[2], bbox_parts[3]];

    items
        .iter()
        .filter(|item| {
            if let Some(bbox) = &item.bbox {
                if bbox.len() >= 4 {
                    let item_min_lon = bbox[0];
                    let item_min_lat = bbox[1];
                    let item_max_lon = bbox[2];
                    let item_max_lat = bbox[3];

                    // Check if the item's bbox intersects with the query bbox
                    return item_min_lon <= max_lon
                        && item_max_lon >= min_lon
                        && item_min_lat <= max_lat
                        && item_max_lat >= min_lat;
                }
            }
            false
        })
        .cloned()
        .collect()
}

/// Filters items by datetime range according to STAC specification
/// datetime format: "start/end", "start/..", "../end", or "start"
pub fn filter_items_by_datetime(items: &[Item], datetime_str: &str) -> Vec<Item> {
    use chrono::{DateTime, Utc};
    
    // Parse datetime range
    let parts: Vec<&str> = datetime_str.split('/').collect();
    if parts.is_empty() {
        return items.to_vec();
    }
    
    let start_datetime = if parts[0] == ".." {
        None
    } else {
        DateTime::parse_from_rfc3339(parts[0]).ok().map(|dt| dt.with_timezone(&Utc))
    };
    
    let end_datetime = if parts.len() > 1 && parts[1] == ".." {
        None
    } else if parts.len() > 1 {
        DateTime::parse_from_rfc3339(parts[1]).ok().map(|dt| dt.with_timezone(&Utc))
    } else {
        // Single datetime - exact match
        start_datetime.clone()
    };
    
    items
        .iter()
        .filter(|item| {
            if let Some(item_datetime_str) = &item.properties.datetime {
                if let Ok(item_datetime) = DateTime::parse_from_rfc3339(item_datetime_str) {
                    let item_dt = item_datetime.with_timezone(&Utc);
                    
                    match (start_datetime.as_ref(), end_datetime.as_ref()) {
                        (Some(start), Some(end)) => {
                            // Range: start <= item <= end
                            item_dt >= *start && item_dt <= *end
                        }
                        (Some(start), None) => {
                            // Start only: item >= start
                            item_dt >= *start
                        }
                        (None, Some(end)) => {
                            // End only: item <= end
                            item_dt <= *end
                        }
                        (None, None) => {
                            // No datetime filter
                            true
                        }
                    }
                } else {
                    // Invalid datetime format in item
                    false
                }
            } else {
                // Item has no datetime - only include if no datetime filter is applied
                start_datetime.is_none() && end_datetime.is_none()
            }
        })
        .cloned()
        .collect()
}
