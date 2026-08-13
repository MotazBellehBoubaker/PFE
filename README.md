# Sentinel – SAP Security Posture Management

A cloud-native SAP Security Posture Management platform built with SAPUI5 / OpenUI5,
following SAP UXC standards and the official SAP BTP DevOps best practices.

## Features

- SoD (Segregation of Duties) violation detection
- Critical role and SAP_ALL detection
- Excessive privilege analysis
- Patch & compliance visibility
- Risk scoring per user and per scan
- AI Co-pilot 
- Executive briefing and smart triage generation
- Full CI/CD pipeline visibility (SAP CI/CD Service)
- Alert Notification log (SAP Alert Notification Service)

## Prerequisites

- Node.js >= 18
- npm >= 9

## Installation

```bash
npm install
```

## Run

```bash
npm start
```

App runs at: http://localhost:8080/index.html

## Build

```bash
npm run build
```

## Project Structure

```
sentinel/
├── webapp/
│   ├── index.html           # Entry point
│   ├── manifest.json        # App descriptor (routes, models)
│   ├── Component.js         # UIComponent
│   ├── view/                # XML Views (one per screen)
│   ├── controller/          # JS Controllers
│   ├── model/               # JSON models + mock data
│   ├── fragment/            # Reusable UI fragments
│   ├── service/             # SAP connector + Copilot service
│   ├── css/                 # Custom styles
│   └── i18n/                # Translations
├── package.json
└── ui5.yaml
```

## Architecture

This app connects to SAP S/4HANA via the SAP BTP Destination Service.
In development mode it uses mock JSON data from `webapp/model/mockdata/`.

## License

Apache-2.0
