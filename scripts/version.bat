@echo off
setlocal enabledelayedexpansion

REM ZenSTAC Version Management Script for Windows
REM Usage: scripts\version.bat [major|minor|patch] [--dry-run]

set "BUMP_TYPE=%1"
set "DRY_RUN=%2"

if "%BUMP_TYPE%"=="" set "BUMP_TYPE=patch"

REM Check if we're in the right directory
if not exist "src-tauri\tauri.conf.json" (
    echo [ERROR] This script must be run from the project root directory
    exit /b 1
)

REM Get current version from tauri.conf.json
for /f "tokens=2 delims=:," %%i in ('findstr "version" src-tauri\tauri.conf.json') do (
    set "CURRENT_VERSION=%%i"
    set "CURRENT_VERSION=!CURRENT_VERSION:"=!"
    set "CURRENT_VERSION=!CURRENT_VERSION: =!"
)

echo [INFO] Current version: !CURRENT_VERSION!

REM Parse version components
for /f "tokens=1,2,3 delims=." %%a in ("!CURRENT_VERSION!") do (
    set "MAJOR=%%a"
    set "MINOR=%%b"
    set "PATCH=%%c"
)

REM Calculate new version
if "%BUMP_TYPE%"=="major" (
    set /a "NEW_MAJOR=!MAJOR!+1"
    set "NEW_MINOR=0"
    set "NEW_PATCH=0"
) else if "%BUMP_TYPE%"=="minor" (
    set "NEW_MAJOR=!MAJOR!"
    set /a "NEW_MINOR=!MINOR!+1"
    set "NEW_PATCH=0"
) else if "%BUMP_TYPE%"=="patch" (
    set "NEW_MAJOR=!MAJOR!"
    set "NEW_MINOR=!MINOR!"
    set /a "NEW_PATCH=!PATCH!+1"
) else (
    echo [ERROR] Invalid bump type. Use: major, minor, or patch
    exit /b 1
)

set "NEW_VERSION=!NEW_MAJOR!.!NEW_MINOR!.!NEW_PATCH!"
echo [INFO] Bumping %BUMP_TYPE% version: !CURRENT_VERSION! → !NEW_VERSION!

if "%DRY_RUN%"=="--dry-run" (
    echo [WARNING] DRY RUN MODE - No changes will be made
    echo [INFO] Would update version in src-tauri\tauri.conf.json
    echo [INFO] Would create git tag: zenstac-v!NEW_VERSION!
    exit /b 0
)

REM Update version in tauri.conf.json using PowerShell
powershell -Command "(Get-Content 'src-tauri\tauri.conf.json') -replace '\"version\": \"!CURRENT_VERSION!\"', '\"version\": \"!NEW_VERSION!\"' | Set-Content 'src-tauri\tauri.conf.json'"

echo [SUCCESS] Updated version in src-tauri\tauri.conf.json

REM Create git tag
set "TAG_NAME=zenstac-v!NEW_VERSION!"
git add src-tauri\tauri.conf.json
git commit -m "Bump version to !NEW_VERSION!"
git tag -a "!TAG_NAME!" -m "Release version !NEW_VERSION!"

echo [SUCCESS] Created git tag: !TAG_NAME!
echo [INFO] To push the release, run:
echo   git push origin main
echo   git push origin !TAG_NAME!
echo.
echo [INFO] This will trigger the GitHub Actions workflow to build and release ZenSTAC v!NEW_VERSION! 