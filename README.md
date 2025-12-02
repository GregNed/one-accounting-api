# Account Balance Calculation API

A TypeScript-based REST API built with Express.js that calculates final account balances based on an initial balance and a series of transactions.

## Implementation choices
I have worked with Express before, so I chose it as a quick and familiar option although I am aware that there are now Nuxt.js and other more modern alternatives. I'm using TypeScript as a good practice for catching type-related code errors before runtime, although for this tiny example it's an overkill. 

I've also added a CI/CD that builds JS from TS, dockerizes the output, pushes it to Dockerhub and deploy on AWS ECS Fargate (Serverless). That is the setup I use at work for the main backend. Strictly speaking, going serverless here does not make sense since it is a proto of the main backend, which will be used close 100% of the time. But serverless is so much easier to set up and manage, and the cost differences are not that big anymore, so it is very tempting. The CD currently fails because all dockerhub and aws resources do not actually exist, but the prototype is working.

# AI usage
I used Cursor (Composer 1) to save time writing boilerplate code, but I did thoroughly review its every suggestion. I also guided it to add Decimal handling, request body type validation, TypeScript, and Swagger. Key prompts:
- Create a Web API endpoint that calculates the final account balance based on an initial balance and a series of transactions. Use node.js express. The implementation details are ...
- use ES modules
- can you use some api schema for validating request input types?
- given that we're calculating money here, should i beware of floating point round errors?
- create tests
- add Swagger

## Features

- ✅ Calculate account balances with credit and debit transactions
- ✅ Detect overdraft status (negative balance)
- ✅ Precise decimal arithmetic using `decimal.js` to avoid floating-point errors
- ✅ Request validation using `express-validator`
- ✅ Full TypeScript support with type safety
- ✅ Schema-based validation for request payloads
- ✅ OpenAPI/Swagger documentation with interactive UI

## Prerequisites

- Node.js (v18+)
- npm or yarn

## Installation
```bash
npm install && npm run build
```

## Usage

### Start the server

```bash
npm start
```

The server will start on port 3000 (or the port specified in the `PORT` environment variable).

### Development mode

For development with auto-recompilation of TS on file changes:

```bash
npm run dev
```

## API Documentation

Interactive API documentation is available via Swagger UI:

**Swagger UI:** http://localhost:3000/api-docs

The OpenAPI specification is automatically generated from JSDoc comments in the code.

## API Endpoints

### POST `/calculate-balance`

Calculates the final account balance by processing all transactions in order.

**Request Body:**
```json
{
  "initialBalance": 5000,
  "transactions": [
    { "type": "credit", "amount": 200 },
    { "type": "debit",  "amount": 150 },
    { "type": "debit",  "amount": 800 }
  ]
}
```

**Response (Normal Account - balance >= 0):**
```json
{
  "finalBalance": 4250,
  "status": 1
}
```

**Response (Overdraft - balance < 0):**
```json
{
  "finalBalance": -200,
  "status": 2
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/calculate-balance \
  -H "Content-Type: application/json" \
  -d '{
    "initialBalance": 5000,
    "transactions": [
      { "type": "credit", "amount": 200 },
      { "type": "debit", "amount": 150 },
      { "type": "debit", "amount": 800 }
    ]
  }'
```

### GET `/health`

Health check endpoint to verify the server is running.

**Response:**
```json
{
  "status": "ok"
}
```

## Project Structure

```
one_api/
├── src/
│   └── server.ts          # Main server file
├── dist/                  # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json          # TypeScript configuration
└── README.md
```
