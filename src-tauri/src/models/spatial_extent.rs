#![allow(non_snake_case)]
#![allow(dead_code)]
use serde::{Deserialize, Serialize};

/// Represents the spatial extents of a STAC Collection or Item.
///
/// The object describes the spatial extents using bounding boxes.
/// Each outer array element can be a separate spatial extent describing
/// the bounding boxes using either 2D or 3D geometries.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SpatialExtent {
    /// Potential spatial extents covered by the Collection.
    ///
    /// Each outer array element can be a separate spatial extent describing
    /// the bounding boxes of the assets represented by this Collection using
    /// either 2D or 3D geometries.
    ///
    /// The first bounding box always describes the overall spatial extent of the data.
    /// All subsequent bounding boxes can be used to provide a more precise description
    /// of the extent and identify clusters of data.
    ///
    /// The length of the inner array must be 2*n where n is the number of dimensions.
    /// The array contains all axes of the southwesterly most extent followed by all
    /// axes of the northeasterly most extent specified in Longitude/Latitude or
    /// Longitude/Latitude/Elevation based on WGS 84.
    pub bbox: Vec<Vec<f64>>,
}

impl SpatialExtent {
    /// Creates a new SpatialExtent with the given bounding boxes.
    pub fn new(bbox: Vec<Vec<f64>>) -> Self {
        Self { bbox }
    }

    /// Creates a 2D spatial extent covering the whole Earth.
    pub fn whole_earth_2d() -> Self {
        Self {
            bbox: vec![vec![-180.0, -90.0, 180.0, 90.0]],
        }
    }

    /// Creates a 3D spatial extent covering the whole Earth with elevation range.
    pub fn whole_earth_3d(min_elevation: f64, max_elevation: f64) -> Self {
        Self {
            bbox: vec![vec![
                -180.0,
                -90.0,
                min_elevation,
                180.0,
                90.0,
                max_elevation,
            ]],
        }
    }

    /// Creates a 2D spatial extent from coordinates.
    ///
    /// # Arguments
    /// * `min_lon` - Minimum longitude (west)
    /// * `min_lat` - Minimum latitude (south)
    /// * `max_lon` - Maximum longitude (east)
    /// * `max_lat` - Maximum latitude (north)
    pub fn from_2d_coords(min_lon: f64, min_lat: f64, max_lon: f64, max_lat: f64) -> Self {
        Self {
            bbox: vec![vec![min_lon, min_lat, max_lon, max_lat]],
        }
    }

    /// Creates a 3D spatial extent from coordinates.
    ///
    /// # Arguments
    /// * `min_lon` - Minimum longitude (west)
    /// * `min_lat` - Minimum latitude (south)
    /// * `min_elevation` - Minimum elevation (depth/height in meters)
    /// * `max_lon` - Maximum longitude (east)
    /// * `max_lat` - Maximum latitude (north)
    /// * `max_elevation` - Maximum elevation (depth/height in meters)
    pub fn from_3d_coords(
        min_lon: f64,
        min_lat: f64,
        min_elevation: f64,
        max_lon: f64,
        max_lat: f64,
        max_elevation: f64,
    ) -> Self {
        Self {
            bbox: vec![vec![
                min_lon,
                min_lat,
                min_elevation,
                max_lon,
                max_lat,
                max_elevation,
            ]],
        }
    }

    /// Adds an additional bounding box to the spatial extent.
    ///
    /// This is useful for providing more precise descriptions of the extent
    /// and identifying clusters of data.
    pub fn add_bbox(&mut self, bbox: Vec<f64>) {
        self.bbox.push(bbox);
    }

    /// Gets the overall spatial extent (first bounding box).
    ///
    /// Returns None if no bounding boxes are defined.
    pub fn overall_extent(&self) -> Option<&Vec<f64>> {
        self.bbox.first()
    }

    /// Checks if the spatial extent is 2D (4 coordinates per bbox).
    pub fn is_2d(&self) -> bool {
        self.bbox.iter().all(|bbox| bbox.len() == 4)
    }

    /// Checks if the spatial extent is 3D (6 coordinates per bbox).
    pub fn is_3d(&self) -> bool {
        self.bbox.iter().all(|bbox| bbox.len() == 6)
    }

    /// Validates that all bounding boxes have consistent dimensions.
    ///
    /// Returns true if all bounding boxes are either 2D (4 coordinates) or 3D (6 coordinates).
    pub fn is_valid(&self) -> bool {
        if self.bbox.is_empty() {
            return false;
        }

        let first_dim = self.bbox[0].len();
        if first_dim != 4 && first_dim != 6 {
            return false;
        }

        self.bbox.iter().all(|bbox| bbox.len() == first_dim)
    }

    /// Gets the number of dimensions (2 for 2D, 3 for 3D).
    ///
    /// Returns None if the spatial extent is invalid or empty.
    pub fn dimensions(&self) -> Option<usize> {
        if self.bbox.is_empty() {
            return None;
        }

        match self.bbox[0].len() {
            4 => Some(2),
            6 => Some(3),
            _ => None,
        }
    }

    /// Creates a spatial extent from a single 2D bounding box.
    pub fn single_2d_bbox(bbox: Vec<f64>) -> Result<Self, String> {
        if bbox.len() != 4 {
            return Err("2D bounding box must have exactly 4 coordinates".to_string());
        }
        Ok(Self { bbox: vec![bbox] })
    }

    /// Creates a spatial extent from a single 3D bounding box.
    pub fn single_3d_bbox(bbox: Vec<f64>) -> Result<Self, String> {
        if bbox.len() != 6 {
            return Err("3D bounding box must have exactly 6 coordinates".to_string());
        }
        Ok(Self { bbox: vec![bbox] })
    }
}
