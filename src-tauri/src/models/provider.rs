#![allow(non_snake_case)]
#![allow(dead_code)]
use serde::{Deserialize, Serialize};

/// Represents a STAC Provider object.
///
/// A provider is any of the organizations that captures or processes the content
/// of the Collection and therefore influences the data offered by this Collection.
/// May also include information about the final storage provider hosting the data.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Provider {
    /// The name of the organization or the individual.
    pub name: String,
    /// Multi-line description to add further provider information such as processing
    /// details for processors and producers, hosting details for hosts or basic
    /// contact information. CommonMark 0.29 syntax MAY be used for rich text representation.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Roles of the provider. Any of licensor, producer, processor or host.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub roles: Option<Vec<ProviderRole>>,
    /// Homepage on which the provider describes the dataset and publishes contact information.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

/// Roles that a provider can have in the STAC ecosystem.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ProviderRole {
    /// The organization that is licensing the dataset under the license specified in the Collection's license field.
    Licensor,
    /// The producer of the data is the provider that initially captured and processed the source data, e.g. ESA for Sentinel-2 data.
    Producer,
    /// A processor is any provider who processed data to a derived product.
    Processor,
    /// The host is the actual provider offering the data on their storage. There should be no more than one host, specified as last element of the list.
    Host,
}

impl Provider {
    /// Creates a new Provider with the required name.
    pub fn new(name: String) -> Self {
        Self {
            name,
            description: None,
            roles: None,
            url: None,
        }
    }

    /// Sets the description of the provider.
    pub fn with_description(mut self, description: String) -> Self {
        self.description = Some(description);
        self
    }

    /// Sets the roles of the provider.
    pub fn with_roles(mut self, roles: Vec<ProviderRole>) -> Self {
        self.roles = Some(roles);
        self
    }

    /// Sets the URL of the provider.
    pub fn with_url(mut self, url: String) -> Self {
        self.url = Some(url);
        self
    }

    /// Adds a single role to the provider.
    pub fn add_role(&mut self, role: ProviderRole) {
        if let Some(ref mut roles) = self.roles {
            roles.push(role);
        } else {
            self.roles = Some(vec![role]);
        }
    }

    /// Checks if the provider has a specific role.
    pub fn has_role(&self, role: &ProviderRole) -> bool {
        self.roles
            .as_ref()
            .map_or(false, |roles| roles.contains(role))
    }

    /// Checks if the provider is a licensor.
    pub fn is_licensor(&self) -> bool {
        self.has_role(&ProviderRole::Licensor)
    }

    /// Checks if the provider is a producer.
    pub fn is_producer(&self) -> bool {
        self.has_role(&ProviderRole::Producer)
    }

    /// Checks if the provider is a processor.
    pub fn is_processor(&self) -> bool {
        self.has_role(&ProviderRole::Processor)
    }

    /// Checks if the provider is a host.
    pub fn is_host(&self) -> bool {
        self.has_role(&ProviderRole::Host)
    }

    /// Validates that the provider has at most one host role.
    ///
    /// According to the STAC specification, there should be no more than one host.
    pub fn is_valid(&self) -> bool {
        if let Some(ref roles) = self.roles {
            let host_count = roles
                .iter()
                .filter(|r| matches!(r, ProviderRole::Host))
                .count();
            host_count <= 1
        } else {
            true
        }
    }

    /// Creates a licensor provider with common defaults.
    pub fn licensor(name: String, license_url: Option<String>) -> Self {
        let mut provider = Self::new(name);
        provider.add_role(ProviderRole::Licensor);
        if let Some(url) = license_url {
            provider.url = Some(url);
        }
        provider
    }

    /// Creates a producer provider with common defaults.
    pub fn producer(name: String, description: Option<String>, url: Option<String>) -> Self {
        let mut provider = Self::new(name);
        provider.add_role(ProviderRole::Producer);
        if let Some(desc) = description {
            provider.description = Some(desc);
        }
        if let Some(url) = url {
            provider.url = Some(url);
        }
        provider
    }

    /// Creates a processor provider with common defaults.
    pub fn processor(name: String, description: Option<String>, url: Option<String>) -> Self {
        let mut provider = Self::new(name);
        provider.add_role(ProviderRole::Processor);
        if let Some(desc) = description {
            provider.description = Some(desc);
        }
        if let Some(url) = url {
            provider.url = Some(url);
        }
        provider
    }

    /// Creates a host provider with common defaults.
    ///
    /// Note: There should be no more than one host per collection.
    pub fn host(name: String, description: Option<String>, url: Option<String>) -> Self {
        let mut provider = Self::new(name);
        provider.add_role(ProviderRole::Host);
        if let Some(desc) = description {
            provider.description = Some(desc);
        }
        if let Some(url) = url {
            provider.url = Some(url);
        }
        provider
    }

    /// Creates a provider with multiple roles.
    pub fn multi_role(name: String, roles: Vec<ProviderRole>) -> Self {
        let mut provider = Self::new(name);
        provider.roles = Some(roles);
        provider
    }

    /// Gets the primary role of the provider (first role in the list).
    pub fn primary_role(&self) -> Option<&ProviderRole> {
        self.roles.as_ref()?.first()
    }

    /// Gets all roles as a slice.
    pub fn get_roles(&self) -> Option<&[ProviderRole]> {
        self.roles.as_ref().map(|r| r.as_slice())
    }
}
