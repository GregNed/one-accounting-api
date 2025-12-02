import express, { json, Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import Decimal from 'decimal.js';  // use Decimal to avoid floating point errors
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

interface Transaction {
  type: 'credit' | 'debit';
  amount: number;
}

interface CalculateBalanceRequest {
  initialBalance: number;
  transactions: Transaction[];
}

interface CalculateBalanceResponse {
  finalBalance: number;
  status: 1 | 2;
}

interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}

const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

// Swagger/OpenAPI configuration
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Account Balance Calculation API',
      version: '1.0.0',
      description: 'A REST API for calculating account balances with precise decimal arithmetic',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./dist/server.js', './src/server.ts'], // Path to the API files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Parse JSON body
app.use(json());

// Validation schema for the request body
const calculateBalanceValidation: ValidationChain[] = [
  body('initialBalance')
    .isNumeric()
    .withMessage('initialBalance must be a number'),
  body('transactions')
    .isArray()
    .withMessage('transactions must be an array')
    .notEmpty()
    .withMessage('transactions array cannot be empty'),
  body('transactions.*.type')
    .isIn(['credit', 'debit'])
    .withMessage('Transaction type must be either "credit" or "debit"'),
  body('transactions.*.amount')
    .isNumeric()
    .withMessage('Transaction amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Transaction amount must be a non-negative number')
];

// Middleware for handling validation errors
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorResponse: ErrorResponse = {
      error: 'Validation failed',
      details: errors.array()
    };
    res.status(400).json(errorResponse);
    return;
  }
  next();
};

/**
 * @swagger
 * /calculate-balance:
 *   post:
 *     summary: Calculate final account balance
 *     description: Calculates the final account balance by processing all transactions in order. Uses precise decimal arithmetic to avoid floating-point errors.
 *     tags: [Balance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - initialBalance
 *               - transactions
 *             properties:
 *               initialBalance:
 *                 type: number
 *                 description: The initial account balance
 *                 example: 5000
 *               transactions:
 *                 type: array
 *                 description: Array of transactions to process
 *                 items:
 *                   type: object
 *                   required:
 *                     - type
 *                     - amount
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [credit, debit]
 *                       description: Transaction type - credit adds to balance, debit subtracts
 *                       example: credit
 *                     amount:
 *                       type: number
 *                       minimum: 0
 *                       description: Transaction amount (must be non-negative)
 *                       example: 200
 *     responses:
 *       200:
 *         description: Successful calculation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 finalBalance:
 *                   type: number
 *                   description: The calculated final balance
 *                   example: 4250
 *                 status:
 *                   type: integer
 *                   enum: [1, 2]
 *                   description: Account status - 1 for normal (balance >= 0), 2 for overdraft (balance < 0)
 *                   example: 1
 *             examples:
 *               normalAccount:
 *                 summary: Normal account
 *                 value:
 *                   finalBalance: 4250
 *                   status: 1
 *               overdraft:
 *                 summary: Overdraft account
 *                 value:
 *                   finalBalance: -200
 *                   status: 2
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Validation failed
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 *                 message:
 *                   type: string
 */
app.post('/calculate-balance', calculateBalanceValidation, handleValidationErrors, (req: Request, res: Response): void => {
  try {
    const { initialBalance, transactions } = req.body as CalculateBalanceRequest;
    let balance: Decimal = new Decimal(initialBalance);

    // Process each transaction in order
    for (const transaction of transactions) {
      const { type, amount } = transaction;
      const amountDecimal: Decimal = new Decimal(amount);

      // I wonder if +{amount}/-{amount} can be used instead of these types...?
      if (type === 'credit') {
        balance = balance.plus(amountDecimal);
      } else if (type === 'debit') {
        balance = balance.minus(amountDecimal);
      }
    }

    // Convert to float for response. Decimal itself converts to str.
    const finalBalance: number = balance.toNumber();

    // Determine status based on final balance
    const status: 1 | 2 = finalBalance >= 0 ? 1 : 2;

    // Return response
    const response: CalculateBalanceResponse = { finalBalance, status };
    res.json(response);

  } catch (error) {
    const errorMessage: string = error instanceof Error ? error.message : 'Unknown error';
    const errorResponse: ErrorResponse = {
      error: 'Internal server error',
      message: errorMessage
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API server
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get('/health', (req: Request, res: Response): void => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, (): void => {
  console.log(`Server is running on port ${PORT}`);
});

