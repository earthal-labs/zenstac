#![allow(non_snake_case)]
#![allow(dead_code)]
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

/// Represents the temporal extents of a STAC Collection or Item.
///
/// The object describes the temporal extents using time intervals.
/// Each outer array element can be a separate temporal extent.
/// The first time interval always describes the overall temporal extent of the data.
/// All subsequent time intervals can be used to provide a more precise description
/// of the extent and identify clusters of data.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TemporalExtent {
    /// Potential temporal extents covered by the Collection.
    ///
    /// Each outer array element can be a separate temporal extent.
    /// The first time interval always describes the overall temporal extent of the data.
    /// All subsequent time intervals can be used to provide a more precise description
    /// of the extent and identify clusters of data.
    ///
    /// Each inner array consists of exactly two elements, either a timestamp or null.
    /// Timestamps consist of a date and time in UTC and MUST be formatted according to RFC 3339, section 5.6.
    /// The temporal reference system is the Gregorian calendar.
    ///
    /// Open date ranges are supported by setting the start and/or the end time to null.
    pub interval: Vec<Vec<Option<String>>>,
}

impl TemporalExtent {
    /// Creates a new TemporalExtent with the given intervals.
    pub fn new(interval: Vec<Vec<Option<String>>>) -> Self {
        Self { interval }
    }

    /// Creates a temporal extent with a single interval from start to end.
    ///
    /// # Arguments
    /// * `start` - Start timestamp in RFC 3339 format (can be None for open start)
    /// * `end` - End timestamp in RFC 3339 format (can be None for open end)
    pub fn single_interval(start: Option<String>, end: Option<String>) -> Self {
        Self {
            interval: vec![vec![start, end]],
        }
    }

    /// Creates a temporal extent with a single interval from DateTime objects.
    ///
    /// # Arguments
    /// * `start` - Start DateTime (can be None for open start)
    /// * `end` - End DateTime (can be None for open end)
    pub fn from_datetime_interval(
        start: Option<DateTime<Utc>>,
        end: Option<DateTime<Utc>>,
    ) -> Self {
        let start_str = start.map(|dt| dt.to_rfc3339());
        let end_str = end.map(|dt| dt.to_rfc3339());
        Self::single_interval(start_str, end_str)
    }

    /// Creates a temporal extent with a single interval from RFC 3339 strings.
    ///
    /// # Arguments
    /// * `start` - Start timestamp string (can be None for open start)
    /// * `end` - End timestamp string (can be None for open end)
    pub fn from_rfc3339_interval(start: Option<&str>, end: Option<&str>) -> Result<Self, String> {
        // Validate RFC 3339 format if provided
        if let Some(start_str) = start {
            DateTime::<Utc>::from_str(start_str)
                .map_err(|_| format!("Invalid RFC 3339 start timestamp: {}", start_str))?;
        }

        if let Some(end_str) = end {
            DateTime::<Utc>::from_str(end_str)
                .map_err(|_| format!("Invalid RFC 3339 end timestamp: {}", end_str))?;
        }

        Ok(Self::single_interval(
            start.map(|s| s.to_string()),
            end.map(|s| s.to_string()),
        ))
    }

    /// Creates a temporal extent covering a specific year.
    ///
    /// # Arguments
    /// * `year` - The year to cover
    pub fn year(year: i32) -> Self {
        let start = format!("{}-01-01T00:00:00Z", year);
        let end = format!("{}-12-31T23:59:59Z", year);
        Self::single_interval(Some(start), Some(end))
    }

    /// Creates a temporal extent covering a specific month.
    ///
    /// # Arguments
    /// * `year` - The year
    /// * `month` - The month (1-12)
    pub fn month(year: i32, month: u32) -> Result<Self, String> {
        if month < 1 || month > 12 {
            return Err("Month must be between 1 and 12".to_string());
        }

        let start = format!("{}-{:02}-01T00:00:00Z", year, month);

        // Calculate end of month
        let end_month = if month == 12 { 1 } else { month + 1 };
        let end_year = if month == 12 { year + 1 } else { year };
        let end = format!("{}-{:02}-01T00:00:00Z", end_year, end_month);

        Ok(Self::single_interval(Some(start), Some(end)))
    }

    /// Creates a temporal extent covering a specific day.
    ///
    /// # Arguments
    /// * `year` - The year
    /// * `month` - The month (1-12)
    /// * `day` - The day (1-31)
    pub fn day(year: i32, month: u32, day: u32) -> Result<Self, String> {
        if month < 1 || month > 12 {
            return Err("Month must be between 1 and 12".to_string());
        }

        if day < 1 || day > 31 {
            return Err("Day must be between 1 and 31".to_string());
        }

        let start = format!("{}-{:02}-{:02}T00:00:00Z", year, month, day);
        let end = format!("{}-{:02}-{:02}T23:59:59Z", year, month, day);

        Ok(Self::single_interval(Some(start), Some(end)))
    }

    /// Creates an open-ended temporal extent from a start date.
    ///
    /// # Arguments
    /// * `start` - Start timestamp in RFC 3339 format
    pub fn from_start(start: String) -> Self {
        Self::single_interval(Some(start), None)
    }

    /// Creates an open-ended temporal extent until an end date.
    ///
    /// # Arguments
    /// * `end` - End timestamp in RFC 3339 format
    pub fn until_end(end: String) -> Self {
        Self::single_interval(None, Some(end))
    }

    /// Creates a completely open temporal extent (not recommended).
    pub fn open() -> Self {
        Self::single_interval(None, None)
    }

    /// Adds an additional temporal interval to the extent.
    ///
    /// This is useful for providing more precise descriptions of the extent
    /// and identifying clusters of data.
    pub fn add_interval(&mut self, start: Option<String>, end: Option<String>) {
        self.interval.push(vec![start, end]);
    }

    /// Gets the overall temporal extent (first interval).
    ///
    /// Returns None if no intervals are defined.
    pub fn overall_extent(&self) -> Option<&Vec<Option<String>>> {
        self.interval.first()
    }

    /// Validates that all intervals have exactly two elements.
    ///
    /// Returns true if all intervals are valid.
    pub fn is_valid(&self) -> bool {
        if self.interval.is_empty() {
            return false;
        }

        self.interval.iter().all(|interval| interval.len() == 2)
    }

    /// Validates that all timestamps are in RFC 3339 format.
    ///
    /// Returns true if all timestamps are valid RFC 3339 format.
    pub fn has_valid_timestamps(&self) -> bool {
        self.interval.iter().all(|interval| {
            interval.iter().all(|timestamp| {
                timestamp
                    .as_ref()
                    .map_or(true, |ts| DateTime::<Utc>::from_str(ts).is_ok())
            })
        })
    }

    /// Gets the earliest start time across all intervals.
    ///
    /// Returns None if no valid start times are found.
    pub fn earliest_start(&self) -> Option<DateTime<Utc>> {
        self.interval
            .iter()
            .filter_map(|interval| {
                interval
                    .get(0)?
                    .as_ref()
                    .and_then(|ts| DateTime::<Utc>::from_str(ts).ok())
            })
            .min()
    }

    /// Gets the latest end time across all intervals.
    ///
    /// Returns None if no valid end times are found.
    pub fn latest_end(&self) -> Option<DateTime<Utc>> {
        self.interval
            .iter()
            .filter_map(|interval| {
                interval
                    .get(1)?
                    .as_ref()
                    .and_then(|ts| DateTime::<Utc>::from_str(ts).ok())
            })
            .max()
    }

    /// Creates a temporal extent from a single interval with validation.
    pub fn single_interval_validated(
        start: Option<String>,
        end: Option<String>,
    ) -> Result<Self, String> {
        // Validate RFC 3339 format if provided
        if let Some(ref start_str) = start {
            DateTime::<Utc>::from_str(start_str)
                .map_err(|_| format!("Invalid RFC 3339 start timestamp: {}", start_str))?;
        }

        if let Some(ref end_str) = end {
            DateTime::<Utc>::from_str(end_str)
                .map_err(|_| format!("Invalid RFC 3339 end timestamp: {}", end_str))?;
        }

        Ok(Self::single_interval(start, end))
    }
}
