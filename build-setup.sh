#!/bin/bash

# zenSTAC Build Setup Script
# This script helps set up the build environment for Windows and Linux

echo "🚀 Setting up zenSTAC build environment..."

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust first:"
    echo "   Visit: https://rustup.rs/"
    exit 1
fi

echo "✅ Rust is installed: $(rustc --version)"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

echo "✅ pnpm is installed: $(pnpm --version)"

# Install Rust targets for Windows and Linux
echo "📦 Installing Rust targets..."
rustup target add x86_64-pc-windows-msvc
rustup target add x86_64-unknown-linux-gnu

echo "✅ Rust targets installed"

# Install project dependencies
echo "📦 Installing project dependencies..."
pnpm install

echo "✅ Dependencies installed"

# Platform-specific setup
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Linux detected. Installing system dependencies..."
    
    # Detect package manager
    if command -v apt &> /dev/null; then
        echo "📦 Using apt package manager..."
        sudo apt update
        sudo apt install -y build-essential libgtk-3-dev librsvg2-dev
        
        # Install WebKit2GTK - different package names for different Ubuntu versions
        if apt-cache search libwebkit2gtk-4.1-dev > /dev/null 2>&1; then
            echo "📦 Installing libwebkit2gtk-4.1-dev..."
            sudo apt install -y libwebkit2gtk-4.1-dev
        elif apt-cache search libwebkit2gtk-4.0-dev > /dev/null 2>&1; then
            echo "📦 Installing libwebkit2gtk-4.0-dev..."
            sudo apt install -y libwebkit2gtk-4.0-dev
        else
            echo "📦 Installing libwebkit2gtk-6.0-dev..."
            sudo apt install -y libwebkit2gtk-6.0-dev
        fi
        
        # Install appindicator - different package names for different Ubuntu versions
        if apt-cache search libayatana-appindicator3-dev > /dev/null 2>&1; then
            echo "📦 Installing libayatana-appindicator3-dev..."
            sudo apt install -y libayatana-appindicator3-dev
        elif apt-cache search libappindicator3-dev > /dev/null 2>&1; then
            echo "📦 Installing libappindicator3-dev..."
            sudo apt install -y libappindicator3-dev
        else
            echo "📦 Installing appindicator (fallback)..."
            sudo apt install -y libayatana-appindicator3-dev || sudo apt install -y libappindicator3-dev
        fi
    elif command -v dnf &> /dev/null; then
        echo "📦 Using dnf package manager..."
        sudo dnf install -y gtk3-devel webkit2gtk3-devel libappindicator-gtk3-devel librsvg2-devel
    elif command -v pacman &> /dev/null; then
        echo "📦 Using pacman package manager..."
        sudo pacman -S --needed base-devel webkit2gtk gtk3 libappindicator-gtk3 librsvg
    else
        echo "⚠️  Unknown package manager. Please install the following packages manually:"
        echo "   - build-essential"
        echo "   - libwebkit2gtk-4.0-dev"
        echo "   - libgtk-3-dev"
        echo "   - libayatana-appindicator3-dev"
        echo "   - librsvg2-dev"
    fi
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    echo "🪟 Windows detected. Please ensure you have:"
    echo "   - Visual Studio Build Tools installed"
    echo "   - Windows 10 SDK installed"
    echo "   Visit: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022"
else
    echo "⚠️  Unknown OS. Please ensure you have the necessary build tools installed."
fi

echo ""
echo "🎉 Build environment setup complete!"
echo ""
echo "📋 Available build commands:"
echo "   pnpm build:desktop    - Build for current platform"
echo "   pnpm build:windows    - Build for Windows"
echo "   pnpm build:linux      - Build for Linux"
echo "   pnpm build:all        - Build for both platforms"
echo ""
echo "🚀 To start development:"
echo "   pnpm dev"
echo ""
echo "📦 To build the application:"
echo "   pnpm build:desktop" 