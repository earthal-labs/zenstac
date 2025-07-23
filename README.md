# ZenSTAC - Simple Geospatial Data Management

A modern, cross-platform application that transforms how organizations manage their geospatial data. Built with simplicity and performance in mind, ZenSTAC provides a beautiful, intuitive interface for cataloging, searching, and sharing spatial assets without the complexity of traditional enterprise solutions.
[![publish](https://github.com/earthal-labs/zenstac/actions/workflows/build.yml/badge.svg?event=status)](https://github.com/earthal-labs/zenstac/actions/workflows/build.yml)
## Why ZenSTAC?

Managing geospatial data has always been a complex challenge. Traditional solutions are either heavy Java-based systems that require expensive infrastructure and specialized IT knowledge, or they force you to use every geospatial tool in the ecosystem just to get started. ZenSTAC eliminates these barriers with a simple, accessible solution that works across different platforms.

### Out-of-the-Box Compliance
Full compliance with OGC STAC and OGC API Features standards right out of the box. Your data automatically works with existing STAC-compliant tools and services, eliminating the need for custom development or complex integration work.

### Cross-Platform Compatibility
Runs natively on Windows and Linux systems, with macOS support coming soon. The lightweight, single-executable design means ZenSTAC can be installed anywhere - from field laptops to server rooms - while maintaining consistent performance.

### Seamless Integration
Built-in RESTful API and sharing capabilities integrate with your existing geospatial workflows. Works seamlessly with STAC plugins for QGIS and ArcGIS Pro, allowing you to access your collections directly within your preferred GIS software.

## Quick Start

### Prerequisites
- **Node.js 18+** and **pnpm**
- **Rust toolchain** (latest stable)
- **Tauri CLI**: `cargo install tauri-cli`

### Installation

1. **Clone and install**:
   ```bash
   git clone https://github.com/your-org/zenstac.git
   cd zenstac
   pnpm install
   ```

2. **Run in development**:
   ```bash
   pnpm tauri dev
   ```

The application will start automatically. The STAC API will be available at `http://localhost:3000/v1`.

## Features

- **STAC 1.0.0 Compliant API** - Full implementation of the STAC specification
- **Modern Web Interface** - Built with SolidJS and Shoelace UI components
- **File Upload Support** - Upload and serve imagery/thumbnails for STAC items
- **SQLite Database** - Lightweight, embedded database with automatic schema management
- **Advanced Search** - Powerful search and filtering capabilities
- **Analytics Dashboard** - Track usage and activity metrics
- **Asset Management** - Complete file upload and serving system
- **OGC API Features** - Full OGC API Features compliance

## Building for Distribution

### Automated Setup (Recommended)

**Linux/macOS:**
```bash
chmod +x build-setup.sh
./build-setup.sh
```

**Windows:**
```cmd
build-setup.bat
```

### Manual Build

```bash
# Build for current platform
pnpm build:desktop

# Build for specific platform
pnpm build:windows
pnpm build:linux

# Build for both platforms
pnpm build:all
```

### Automated Releases

ZenSTAC uses GitHub Actions for automated builds and releases. The workflow is designed to only trigger on version changes, not on every commit to main.

#### Creating a New Release

1. **Bump the version** using the version script:
   ```bash
   # Linux/macOS
   ./scripts/version.sh [major|minor|patch]
   
   # Windows
   scripts\version.bat [major|minor|patch]
   ```

2. **Push the changes**:
   ```bash
   git push origin main
   git push origin zenstac-v1.0.1  # Replace with your new version
   ```

3. **GitHub Actions will automatically**:
   - Build the application for Windows and Linux
   - Create a GitHub release with installers
   - Tag the release with the version number

#### Version Bump Types

- **patch** (default): Bug fixes and minor updates (1.0.0 → 1.0.1)
- **minor**: New features, backward compatible (1.0.0 → 1.1.0)
- **major**: Breaking changes (1.0.0 → 2.0.0)

#### Manual Builds

For testing or manual builds, you can trigger the workflow manually from the GitHub Actions tab in your repository.

## API Documentation

### Core Endpoints
- `GET /v1/` - Landing page
- `GET /v1/collections` - List all collections
- `GET /v1/collections/{id}` - Get collection details
- `GET /v1/collections/{id}/items` - List items in collection
- `GET /v1/search` - Search items across collections
- `POST /v1/search` - Search items (POST method)

### File Management
- `POST /v1/upload/{collection_id}/{item_id}/{asset_key}` - Upload asset file
- `GET /v1/assets/{collection_id}/{item_id}/{asset_key}` - Serve asset file

## Data Storage

- **Database**: SQLite stored in platform-specific app data directories
- **Assets**: File assets stored in platform-specific directories
- **Automatic Setup**: Sample data created on first run

## Usage Guide

1. **Launch the application** - Sample data is automatically created on first run
2. **Explore the interface** - Browse the sample cities collection to understand the features
3. **Create collections** - Start building your STAC catalog with the intuitive interface
4. **Add items and assets** - Upload files and organize your geospatial data
5. **Search and discover** - Use the powerful search capabilities to find what you need

## Contributing

While we may not be accepting external code contributions at this time, we welcome:

- **Feature requests** - Share ideas for new functionality
- **Bug reports** - Help us identify and fix issues  
- **Documentation improvements** - Suggest better explanations
- **General feedback** - Let us know what you think

See our [Contributing Guide](CONTRIBUTING.md) for more details.

## What We're Working On

Our current development priorities include:

- **Core STAC API compliance**
- **Performance optimizations**
- **User interface improvements**
- **Documentation updates**
- **Testing coverage**
- **Offline basemap support**
- **Additional file import support**
- **Cloud support**

## License

This project is licensed under the MIT License for individuals and non-commercial use - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/earthal-labs/zenstac/issues)
- **Discussions**: [GitHub Discussions](https://github.com/earthal-labs/zenstac/discussions)

---

**ZenSTAC** - Making geospatial data management simple and beautiful.
