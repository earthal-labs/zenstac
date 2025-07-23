#![allow(non_snake_case)]
use serde::{Deserialize, Serialize};

/// Represents the conformance specifications that this STAC API implements.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Conformance {
    /// A list of URIs that identify the conformance classes that the STAC API implements.
    #[serde(rename = "conformsTo")]
    pub conforms_to: Vec<String>,
}

impl Conformance {
    /// Creates a new Conformance instance with the given conformance specifications.
    #[allow(dead_code)]
    pub fn new(conforms_to: Vec<String>) -> Self {
        Self { conforms_to }
    }

    /// Creates a default Conformance instance with the core STAC API specification.
    #[allow(dead_code)]
    pub fn default() -> Self {
        Self {
            conforms_to: vec!["https://api.stacspec.org/v1.0.0/core".to_string()],
        }
    }

    /// Adds a new conformance specification to the list.
    #[allow(dead_code)]
    pub fn add_conformance(&mut self, spec: String) {
        self.conforms_to.push(spec);
    }

    /// Adds multiple conformance specifications to the list.
    #[allow(dead_code)]
    pub fn add_conformances(&mut self, specs: Vec<String>) {
        self.conforms_to.extend(specs);
    }
}
