#!/bin/bash

# ZenSTAC Version Management Script
# Usage: ./scripts/version.sh [major|minor|patch] [--dry-run]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "src-tauri/tauri.conf.json" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# Get current version from tauri.conf.json
CURRENT_VERSION=$(grep '"version"' src-tauri/tauri.conf.json | sed 's/.*"version": "\([^"]*\)".*/\1/')
print_info "Current version: $CURRENT_VERSION"

# Parse version components
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

# Determine version bump type
BUMP_TYPE=${1:-patch}
DRY_RUN=false

if [ "$2" = "--dry-run" ]; then
    DRY_RUN=true
    print_warning "DRY RUN MODE - No changes will be made"
fi

# Calculate new version
case $BUMP_TYPE in
    major)
        NEW_MAJOR=$((MAJOR + 1))
        NEW_MINOR=0
        NEW_PATCH=0
        NEW_VERSION="$NEW_MAJOR.$NEW_MINOR.$NEW_PATCH"
        ;;
    minor)
        NEW_MAJOR=$MAJOR
        NEW_MINOR=$((MINOR + 1))
        NEW_PATCH=0
        NEW_VERSION="$NEW_MAJOR.$NEW_MINOR.$NEW_PATCH"
        ;;
    patch)
        NEW_MAJOR=$MAJOR
        NEW_MINOR=$MINOR
        NEW_PATCH=$((PATCH + 1))
        NEW_VERSION="$NEW_MAJOR.$NEW_MINOR.$NEW_PATCH"
        ;;
    *)
        print_error "Invalid bump type. Use: major, minor, or patch"
        exit 1
        ;;
esac

print_info "Bumping $BUMP_TYPE version: $CURRENT_VERSION → $NEW_VERSION"

# Update version in tauri.conf.json
if [ "$DRY_RUN" = false ]; then
    # Use sed to update the version in tauri.conf.json
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS requires different sed syntax
        sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json
    else
        # Linux sed syntax
        sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json
    fi
    
    print_success "Updated version in src-tauri/tauri.conf.json"
    
    # Create git tag
    TAG_NAME="zenstac-v$NEW_VERSION"
    git add src-tauri/tauri.conf.json
    git commit -m "Bump version to $NEW_VERSION"
    git tag -a "$TAG_NAME" -m "Release version $NEW_VERSION"
    
    print_success "Created git tag: $TAG_NAME"
    print_info "To push the release, run:"
    echo "  git push origin main"
    echo "  git push origin $TAG_NAME"
    echo ""
    print_info "This will trigger the GitHub Actions workflow to build and release ZenSTAC v$NEW_VERSION"
else
    print_info "Would update version in src-tauri/tauri.conf.json"
    print_info "Would create git tag: zenstac-v$NEW_VERSION"
fi 