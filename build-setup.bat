@echo off
REM zenSTAC Build Setup Script for Windows
REM This script helps set up the build environment for Windows

echo 🚀 Setting up zenSTAC build environment for Windows...

REM Check if Rust is installed
rustc --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Rust is not installed. Please install Rust first:
    echo    Visit: https://rustup.rs/
    pause
    exit /b 1
)

echo ✅ Rust is installed

REM Check if pnpm is installed
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pnpm is not installed. Installing pnpm...
    npm install -g pnpm
)

echo ✅ pnpm is installed

REM Install Rust targets for Windows and Linux
echo 📦 Installing Rust targets...
rustup target add x86_64-pc-windows-msvc
rustup target add x86_64-unknown-linux-gnu

echo ✅ Rust targets installed

REM Install project dependencies
echo 📦 Installing project dependencies...
pnpm install

echo ✅ Dependencies installed

echo.
echo 🪟 Windows detected. Please ensure you have:
echo    - Visual Studio Build Tools installed
echo    - Windows 10 SDK installed
echo    Visit: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
echo.
echo 🎉 Build environment setup complete!
echo.
echo 📋 Available build commands:
echo    pnpm build:desktop    - Build for current platform
echo    pnpm build:windows    - Build for Windows
echo    pnpm build:linux      - Build for Linux
echo    pnpm build:all        - Build for both platforms
echo.
echo 🚀 To start development:
echo    pnpm dev
echo.
echo 📦 To build the application:
echo    pnpm build:desktop
echo.
pause 