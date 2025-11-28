# Changelog

All notable changes to SquareKeeper will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Winners Panel Shows Names**: Public Winners section now displays participant names instead of square numbers; admin Mark Winners still uses square numbers for input

### Fixed
- **Multi-Game Winner Colors**: Winner squares now display the correct game-based layer color (red for Game 1, blue for Game 2, yellow for Game 3) instead of cycling through all layer colors
- **Simplified Winner Labels**: Winner badges on squares now show just the period (Q1, HALF, FINAL, etc.) instead of the full label (e.g., "GB @ DET Q1")

## [1.3.0] - 2024-11-28

### Added
- **Multi-Game Boards**: Support for 3+ games per board with 8 prize periods each (Q1, HALF, Q3, FINAL + Opposites)
- **Generate Multi-Game Prizes Button**: Auto-creates all prizes (e.g., 24 for 3 games) with proper labels like "GB @ DET Q1"
- **Color-Coordinated Winner Sections**: Winners panel groups prizes by game with matching layer colors
- **Smart Game Detection**: WinnersPanel derives game grouping from actual prize data, preventing display issues

### Fixed
- **Duplicate Input Bug**: Final and Final Opposite winner input boxes were incorrectly connected; fixed with unique index-based keys

## [1.2.0] - 2024-11-15

### Added
- **Custom URL Slugs**: Contests can have custom slugs for public URLs (e.g., `/superbowl-2025`)
- **Header Color Customization**: Custom color picker for each layer's header numbers
- **Layer Labels in Corner**: Game/period labels displayed diagonally in the pink corner area
- **Print-Friendly Styles**: Optimized CSS for printing grids

### Changed
- Layer labels now consolidated for both axes (previously separate)
- Improved preset selector to sync layer labels with prize labels

## [1.1.0] - 2024-11-01

### Added
- **Folder Organization**: Group contests into folders for better organization
- **Clone Contest**: Duplicate contest settings to quickly create similar pools
- **CSV Export**: Export participant data with square numbers, names, and emails
- **Dashboard Filtering**: Filter by status, search by name/teams, and sort options
- **Copy Public Link**: One-click button to copy shareable contest URL

### Fixed
- Webhook notifications no longer fire when updating non-participant fields

## [1.0.0] - 2024-10-15

### Added
- **Contest Management**: Create, edit, and delete football squares contests
- **10x10 Grid System**: Classic 100-square grid with row/column team labels
- **Multi-Layer Headers**: Up to 6 independent 0-9 number layers for different payout periods
- **Shuffle Functionality**: Randomize header numbers individually or all at once
- **Square Claiming**: Participants can claim available squares on public boards
- **Random Assignment**: Option for participants to receive a random available square
- **Pre-Reserved Squares**: Admin can reserve squares before opening the contest
- **Winner Tracking**: Mark winning squares for each prize period
- **Replit Auth Integration**: Admin authentication via Google/GitHub/email
- **Webhook Notifications**: Optional n8n integration for email notifications on square claims
- **My Contests Page**: Participants can look up their squares by email address
- **Red Headers Toggle**: Show/hide axis numbers on public boards

### Security
- First user to log in becomes admin
- Protected admin routes with session-based authentication
- Secure cookie configuration for production
