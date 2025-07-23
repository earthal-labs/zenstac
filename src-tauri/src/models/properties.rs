#![allow(non_snake_case)]
#![allow(dead_code)]
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Represents the Properties object for a STAC Item.
///
/// Additional metadata fields can be added to the GeoJSON Object Properties.
/// The only required field is datetime but it is recommended to add more fields.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Properties {
    /// The searchable date and time of the assets, which must be in UTC.
    /// It is formatted according to RFC 3339, section 5.6.
    /// null is allowed, but requires start_datetime and end_datetime from common metadata to be set.
    pub datetime: Option<String>,

    // STAC Common Metadata fields
    /// The start date and time of the assets, which must be in UTC.
    /// It is formatted according to RFC 3339, section 5.6.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start_datetime: Option<String>,
    /// The end date and time of the assets, which must be in UTC.
    /// It is formatted according to RFC 3339, section 5.6.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_datetime: Option<String>,
    /// The title of the Item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    /// The description of the Item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// The license of the Item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,
    /// The providers of the Item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub providers: Option<Vec<String>>,
    /// The platform of the Item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<String>,
    /// The instruments of the Item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instruments: Option<Vec<String>>,
    /// The constellation of the Item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub constellation: Option<String>,
    /// The mission of the Item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mission: Option<String>,
    /// The collection of the Item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection: Option<String>,
    /// The gsd (Ground Sample Distance) of the Item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gsd: Option<f64>,

    // Additional custom fields
    /// Additional metadata fields that don't fit into the standard fields.
    /// These are serialized as additional properties in the JSON.
    #[serde(flatten)]
    pub additional_fields: HashMap<String, serde_json::Value>,
}

impl Properties {
    /// Creates new Properties with the required datetime field.
    pub fn new(datetime: Option<String>) -> Self {
        Self {
            datetime,
            start_datetime: None,
            end_datetime: None,
            title: None,
            description: None,
            license: None,
            providers: None,
            platform: None,
            instruments: None,
            constellation: None,
            mission: None,
            collection: None,
            gsd: None,
            additional_fields: HashMap::new(),
        }
    }

    /// Creates Properties with a single datetime.
    pub fn with_datetime(datetime: DateTime<Utc>) -> Self {
        Self::new(Some(datetime.to_rfc3339()))
    }

    /// Creates Properties with a datetime range.
    pub fn with_datetime_range(start: DateTime<Utc>, end: DateTime<Utc>) -> Self {
        Self {
            datetime: None,
            start_datetime: Some(start.to_rfc3339()),
            end_datetime: Some(end.to_rfc3339()),
            title: None,
            description: None,
            license: None,
            providers: None,
            platform: None,
            instruments: None,
            constellation: None,
            mission: None,
            collection: None,
            gsd: None,
            additional_fields: HashMap::new(),
        }
    }

    /// Creates Properties with a datetime string.
    pub fn with_datetime_str(datetime: String) -> Self {
        Self::new(Some(datetime))
    }

    /// Sets the title.
    pub fn with_title(mut self, title: String) -> Self {
        self.title = Some(title);
        self
    }

    /// Sets the description.
    pub fn with_description(mut self, description: String) -> Self {
        self.description = Some(description);
        self
    }

    /// Sets the license.
    pub fn with_license(mut self, license: String) -> Self {
        self.license = Some(license);
        self
    }

    /// Sets the providers.
    pub fn with_providers(mut self, providers: Vec<String>) -> Self {
        self.providers = Some(providers);
        self
    }

    /// Sets the platform.
    pub fn with_platform(mut self, platform: String) -> Self {
        self.platform = Some(platform);
        self
    }

    /// Sets the instruments.
    pub fn with_instruments(mut self, instruments: Vec<String>) -> Self {
        self.instruments = Some(instruments);
        self
    }

    /// Sets the constellation.
    pub fn with_constellation(mut self, constellation: String) -> Self {
        self.constellation = Some(constellation);
        self
    }

    /// Sets the mission.
    pub fn with_mission(mut self, mission: String) -> Self {
        self.mission = Some(mission);
        self
    }

    /// Sets the collection.
    pub fn with_collection(mut self, collection: String) -> Self {
        self.collection = Some(collection);
        self
    }

    /// Sets the GSD (Ground Sample Distance).
    pub fn with_gsd(mut self, gsd: f64) -> Self {
        self.gsd = Some(gsd);
        self
    }

    /// Adds a custom field with a string value.
    pub fn add_string_field(&mut self, key: String, value: String) {
        self.additional_fields
            .insert(key, serde_json::Value::String(value));
    }

    /// Adds a custom field with a numeric value.
    pub fn add_number_field(&mut self, key: String, value: f64) {
        self.additional_fields.insert(
            key,
            serde_json::Value::Number(serde_json::Number::from_f64(value).unwrap()),
        );
    }

    /// Adds a custom field with a boolean value.
    pub fn add_bool_field(&mut self, key: String, value: bool) {
        self.additional_fields
            .insert(key, serde_json::Value::Bool(value));
    }

    /// Adds a custom field with an array value.
    pub fn add_array_field(&mut self, key: String, value: Vec<serde_json::Value>) {
        self.additional_fields
            .insert(key, serde_json::Value::Array(value));
    }

    /// Adds a custom field with any JSON value.
    pub fn add_field(&mut self, key: String, value: serde_json::Value) {
        self.additional_fields.insert(key, value);
    }

    /// Gets a custom field as a string.
    pub fn get_string_field(&self, key: &str) -> Option<&str> {
        self.additional_fields.get(key)?.as_str()
    }

    /// Gets a custom field as a number.
    pub fn get_number_field(&self, key: &str) -> Option<f64> {
        self.additional_fields.get(key)?.as_f64()
    }

    /// Gets a custom field as a boolean.
    pub fn get_bool_field(&self, key: &str) -> Option<bool> {
        self.additional_fields.get(key)?.as_bool()
    }

    /// Gets a custom field as an array.
    pub fn get_array_field(&self, key: &str) -> Option<&Vec<serde_json::Value>> {
        self.additional_fields.get(key)?.as_array()
    }

    /// Gets a custom field as any JSON value.
    pub fn get_field(&self, key: &str) -> Option<&serde_json::Value> {
        self.additional_fields.get(key)
    }

    /// Validates that the Properties object is valid.
    ///
    /// If datetime is null, start_datetime and end_datetime must be set.
    pub fn is_valid(&self) -> bool {
        if self.datetime.is_none() {
            // If datetime is null, both start_datetime and end_datetime must be set
            self.start_datetime.is_some() && self.end_datetime.is_some()
        } else {
            // If datetime is set, it should be valid RFC 3339
            if let Some(ref dt) = self.datetime {
                DateTime::parse_from_rfc3339(dt).is_ok()
            } else {
                true
            }
        }
    }

    /// Validates that all datetime fields are in RFC 3339 format.
    pub fn has_valid_datetimes(&self) -> bool {
        let mut valid = true;

        if let Some(ref dt) = self.datetime {
            valid = valid && DateTime::parse_from_rfc3339(dt).is_ok();
        }

        if let Some(ref start_dt) = self.start_datetime {
            valid = valid && DateTime::parse_from_rfc3339(start_dt).is_ok();
        }

        if let Some(ref end_dt) = self.end_datetime {
            valid = valid && DateTime::parse_from_rfc3339(end_dt).is_ok();
        }

        valid
    }

    /// Gets the datetime as a DateTime<Utc> if available.
    pub fn datetime_as_utc(&self) -> Option<DateTime<Utc>> {
        self.datetime.as_ref().and_then(|dt| {
            DateTime::parse_from_rfc3339(dt)
                .ok()
                .map(|dt| dt.with_timezone(&Utc))
        })
    }

    /// Gets the start datetime as a DateTime<Utc> if available.
    pub fn start_datetime_as_utc(&self) -> Option<DateTime<Utc>> {
        self.start_datetime.as_ref().and_then(|dt| {
            DateTime::parse_from_rfc3339(dt)
                .ok()
                .map(|dt| dt.with_timezone(&Utc))
        })
    }

    /// Gets the end datetime as a DateTime<Utc> if available.
    pub fn end_datetime_as_utc(&self) -> Option<DateTime<Utc>> {
        self.end_datetime.as_ref().and_then(|dt| {
            DateTime::parse_from_rfc3339(dt)
                .ok()
                .map(|dt| dt.with_timezone(&Utc))
        })
    }

    /// Creates Properties for a satellite image with common metadata.
    pub fn satellite_image(
        datetime: DateTime<Utc>,
        platform: String,
        instruments: Vec<String>,
        gsd: f64,
    ) -> Self {
        Self::with_datetime(datetime)
            .with_platform(platform)
            .with_instruments(instruments)
            .with_gsd(gsd)
    }

    /// Creates Properties for a time series with datetime range.
    pub fn time_series(
        start: DateTime<Utc>,
        end: DateTime<Utc>,
        title: String,
        description: String,
    ) -> Self {
        Self::with_datetime_range(start, end)
            .with_title(title)
            .with_description(description)
    }
}
