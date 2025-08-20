# Devices API

## Overview
Devices API is a backend service designed to manage transactions, terminals, and related services within the LKLPay platform. It enables applications to interact with terminals and execute various payment-related operations securely.

## Features
- Manage and interact with payment terminals
- Process transactions including sales, refunds, and cancellations
- Retrieve and update catalog information
- Handle SIM card data for connectivity
- Secure authentication using Bearer token authentication
- Kafka-based event-driven architecture for handling deposits

## Requirements
- Node.js (latest LTS version recommended)
- Yarn package manager
- PostgreSQL database
- Kafka for event streaming
- HTTPS configuration with SSL certificates

## Installation
Clone the repository:
```sh
git clone https://github.com/your-repo/devices-api.git
cd devices-api
```

Install dependencies:
```sh
yarn install
```

Set up environment variables by copying the `.env.example` file:
```sh
cp .env.example .env
```

Configure the necessary values in `.env` such as database credentials and Kafka settings.

## Running the Application
### Development Mode
```sh
yarn dev
```

### Production Mode
```sh
yarn build
yarn start
```


### Catalog
- `GET /api/catalog` - Retrieve catalog data

### SIM Cards
- `GET /api/simcard` - Retrieve SIM card details

## Event-driven Services
This API uses Kafka to handle deposit events efficiently. The Kafka consumer listens to deposit-related messages and processes them accordingly.

## Logging
This service uses **Winston** for structured logging. Logs are stored and can be monitored for debugging and analytics.

## Deployment
This API can be deployed using Docker and Kubernetes. Ensure you have the appropriate configurations for database and Kafka clusters.

## Security
- HTTPS is enforced using SSL certificates.
- Authentication is handled via Bearer tokens.
- CORS policies are configured for secure API access.


# Documentación
## Instalar swagger/cli global
```
npm install -g swagger-cli
```

## 1. Validar estructura (lint)
```
npx @redocly/cli lint docs/main.yml
```

## 2. Generar el archivo YAML
```
swagger-cli bundle docs/main.yml -o docs/openapi.yml -t yaml
```

## 3. Levantar servidor de documentación (Redoc)
```
npx @redocly/cli preview-docs docs/openapi.yml
```

## Opcional
create documentation html:
**Requirements installed** `npm install -g redoc-cli`

```
npx @redocly/cli build-docs docs/openapi.yml -o documentation.html
```
Validate documentation
```
swagger-cli validate docs/main.yml
```
