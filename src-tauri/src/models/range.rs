#![allow(non_snake_case)]
#![allow(dead_code)]
use serde::{Deserialize, Serialize};
use std::cmp::PartialOrd;

/// Represents a STAC Range object for summaries that would normally consist of a lot of continuous values.
///
/// By default, only ranges with a minimum and a maximum value can be specified.
/// Ranges can be specified for ordinal values only, which means they need to have a rank order.
/// Therefore, ranges can only be specified for numbers and some special types of strings.
/// Examples: grades (A to F), dates or times.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Range {
    /// Minimum value.
    pub minimum: RangeValue,
    /// Maximum value.
    pub maximum: RangeValue,
}

/// Represents a value in a range, which can be either a number or a string.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
pub enum RangeValue {
    /// Numeric value (f64 for maximum precision)
    Number(f64),
    /// String value (for ordinal strings like grades A-F, dates, times)
    String(String),
}

impl Range {
    /// Creates a new Range with the given minimum and maximum values.
    pub fn new(minimum: RangeValue, maximum: RangeValue) -> Self {
        Self { minimum, maximum }
    }

    /// Creates a numeric range.
    ///
    /// # Arguments
    /// * `min` - Minimum numeric value
    /// * `max` - Maximum numeric value
    pub fn numeric(min: f64, max: f64) -> Self {
        Self {
            minimum: RangeValue::Number(min),
            maximum: RangeValue::Number(max),
        }
    }

    /// Creates a string range.
    ///
    /// # Arguments
    /// * `min` - Minimum string value
    /// * `max` - Maximum string value
    pub fn string(min: String, max: String) -> Self {
        Self {
            minimum: RangeValue::String(min),
            maximum: RangeValue::String(max),
        }
    }

    /// Creates a range from string references.
    ///
    /// # Arguments
    /// * `min` - Minimum string value
    /// * `max` - Maximum string value
    pub fn string_ref(min: &str, max: &str) -> Self {
        Self {
            minimum: RangeValue::String(min.to_string()),
            maximum: RangeValue::String(max.to_string()),
        }
    }

    /// Creates a range for grades (A to F).
    pub fn grades() -> Self {
        Self::string_ref("A", "F")
    }

    /// Creates a range for letter grades (A+ to F-).
    pub fn letter_grades() -> Self {
        Self::string_ref("A+", "F-")
    }

    /// Creates a range for a specific time period.
    ///
    /// # Arguments
    /// * `start_time` - Start time in ISO format
    /// * `end_time` - End time in ISO format
    pub fn time_period(start_time: &str, end_time: &str) -> Self {
        Self::string_ref(start_time, end_time)
    }

    /// Creates a range for a specific date period.
    ///
    /// # Arguments
    /// * `start_date` - Start date in ISO format (YYYY-MM-DD)
    /// * `end_date` - End date in ISO format (YYYY-MM-DD)
    pub fn date_period(start_date: &str, end_date: &str) -> Self {
        Self::string_ref(start_date, end_date)
    }

    /// Creates a range for a specific year.
    ///
    /// # Arguments
    /// * `year` - The year
    pub fn year(year: i32) -> Self {
        let start = format!("{}-01-01", year);
        let end = format!("{}-12-31", year);
        Self::string(start, end)
    }

    /// Creates a range for a specific month.
    ///
    /// # Arguments
    /// * `year` - The year
    /// * `month` - The month (1-12)
    pub fn month(year: i32, month: u32) -> Result<Self, String> {
        if month < 1 || month > 12 {
            return Err("Month must be between 1 and 12".to_string());
        }

        let start = format!("{}-{:02}-01", year, month);

        // Calculate end of month
        let end_month = if month == 12 { 12 } else { month };
        let end_year = if month == 12 { year } else { year };
        let end_day = if month == 2 {
            // February - handle leap years
            if (end_year % 4 == 0 && end_year % 100 != 0) || (end_year % 400 == 0) {
                29
            } else {
                28
            }
        } else if [4, 6, 9, 11].contains(&month) {
            30
        } else {
            31
        };

        let end = format!("{}-{:02}-{:02}", end_year, end_month, end_day);
        Ok(Self::string(start, end))
    }

    /// Validates that the range is consistent (both values are of the same type).
    ///
    /// Returns true if the range is valid.
    pub fn is_valid(&self) -> bool {
        match (&self.minimum, &self.maximum) {
            (RangeValue::Number(_), RangeValue::Number(_)) => true,
            (RangeValue::String(_), RangeValue::String(_)) => true,
            _ => false,
        }
    }

    /// Checks if the range contains numeric values.
    pub fn is_numeric(&self) -> bool {
        matches!(
            (&self.minimum, &self.maximum),
            (RangeValue::Number(_), RangeValue::Number(_))
        )
    }

    /// Checks if the range contains string values.
    pub fn is_string(&self) -> bool {
        matches!(
            (&self.minimum, &self.maximum),
            (RangeValue::String(_), RangeValue::String(_))
        )
    }

    /// Gets the minimum value as a number if the range is numeric.
    pub fn min_number(&self) -> Option<f64> {
        if let RangeValue::Number(min) = self.minimum {
            Some(min)
        } else {
            None
        }
    }

    /// Gets the maximum value as a number if the range is numeric.
    pub fn max_number(&self) -> Option<f64> {
        if let RangeValue::Number(max) = self.maximum {
            Some(max)
        } else {
            None
        }
    }

    /// Gets the minimum value as a string if the range is string-based.
    pub fn min_string(&self) -> Option<&str> {
        if let RangeValue::String(ref min) = self.minimum {
            Some(min)
        } else {
            None
        }
    }

    /// Gets the maximum value as a string if the range is string-based.
    pub fn max_string(&self) -> Option<&str> {
        if let RangeValue::String(ref max) = self.maximum {
            Some(max)
        } else {
            None
        }
    }

    /// Calculates the span of a numeric range (max - min).
    ///
    /// Returns None if the range is not numeric.
    pub fn span(&self) -> Option<f64> {
        if let (Some(min), Some(max)) = (self.min_number(), self.max_number()) {
            Some(max - min)
        } else {
            None
        }
    }

    /// Calculates the midpoint of a numeric range.
    ///
    /// Returns None if the range is not numeric.
    pub fn midpoint(&self) -> Option<f64> {
        if let (Some(min), Some(max)) = (self.min_number(), self.max_number()) {
            Some((min + max) / 2.0)
        } else {
            None
        }
    }

    /// Checks if a value falls within this range.
    ///
    /// For numeric ranges, checks if the value is between min and max (inclusive).
    /// For string ranges, checks if the value is lexicographically between min and max (inclusive).
    pub fn contains<T: PartialOrd + ToString>(&self, value: T) -> bool {
        let value_str = value.to_string();
        match (&self.minimum, &self.maximum) {
            (RangeValue::Number(min), RangeValue::Number(max)) => {
                if let Ok(num_value) = value_str.parse::<f64>() {
                    num_value >= *min && num_value <= *max
                } else {
                    false
                }
            }
            (RangeValue::String(min), RangeValue::String(max)) => {
                value_str >= *min && value_str <= *max
            }
            _ => false,
        }
    }

    /// Creates a range with additional statistical values (for future extensions).
    ///
    /// This method can be extended to include mean, stddev, etc.
    pub fn with_statistics(minimum: RangeValue, maximum: RangeValue) -> Self {
        Self { minimum, maximum }
    }
}

impl RangeValue {
    /// Converts the value to a string representation.
    pub fn to_string(&self) -> String {
        match self {
            RangeValue::Number(n) => n.to_string(),
            RangeValue::String(s) => s.clone(),
        }
    }

    /// Attempts to convert the value to a number.
    pub fn as_number(&self) -> Option<f64> {
        match self {
            RangeValue::Number(n) => Some(*n),
            RangeValue::String(s) => s.parse::<f64>().ok(),
        }
    }

    /// Gets the value as a string.
    pub fn as_string(&self) -> String {
        match self {
            RangeValue::Number(n) => n.to_string(),
            RangeValue::String(s) => s.clone(),
        }
    }
}
