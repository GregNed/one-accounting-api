import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './server.js';

describe('Health Endpoint', () => {
  it('should return 200 and status ok', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('Calculate Balance Endpoint', () => {
  describe('Successful calculations', () => {
    it('should calculate balance with credit transactions', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 1000,
          transactions: [
            { type: 'credit', amount: 500 },
            { type: 'credit', amount: 200 }
          ]
        })
        .expect(200);

      expect(response.body).toHaveProperty('finalBalance', 1700);
      expect(response.body).toHaveProperty('status', 1);
    });

    it('should calculate balance with debit transactions', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 1000,
          transactions: [
            { type: 'debit', amount: 300 },
            { type: 'debit', amount: 200 }
          ]
        })
        .expect(200);

      expect(response.body).toHaveProperty('finalBalance', 500);
      expect(response.body).toHaveProperty('status', 1);
    });

    it('should calculate balance with mixed transactions', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 1000,
          transactions: [
            { type: 'credit', amount: 500 },
            { type: 'debit', amount: 300 },
            { type: 'credit', amount: 200 },
            { type: 'debit', amount: 150 }
          ]
        })
        .expect(200);

      expect(response.body).toHaveProperty('finalBalance', 1250);
      expect(response.body).toHaveProperty('status', 1);
    });

    it('should handle decimal amounts correctly', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 1000.50,
          transactions: [
            { type: 'credit', amount: 99.99 },
            { type: 'debit', amount: 50.25 }
          ]
        })
        .expect(200);

      expect(response.body.finalBalance).toBeCloseTo(1050.24, 2);
      expect(response.body).toHaveProperty('status', 1);
    });

    it('should return status 2 (overdraft) when balance is negative', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 1000,
          transactions: [
            { type: 'debit', amount: 1500 }
          ]
        })
        .expect(200);

      expect(response.body).toHaveProperty('finalBalance', -500);
      expect(response.body).toHaveProperty('status', 2);
    });

    it('should return status 1 (normal) when balance is zero', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 1000,
          transactions: [
            { type: 'debit', amount: 1000 }
          ]
        })
        .expect(200);

      expect(response.body).toHaveProperty('finalBalance', 0);
      expect(response.body).toHaveProperty('status', 1);
    });

    it('should process transactions in order', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 1000,
          transactions: [
            { type: 'debit', amount: 800 },
            { type: 'credit', amount: 500 },
            { type: 'debit', amount: 200 }
          ]
        })
        .expect(200);

      // 1000 - 800 = 200, 200 + 500 = 700, 700 - 200 = 500
      expect(response.body).toHaveProperty('finalBalance', 500);
      expect(response.body).toHaveProperty('status', 1);
    });
  });

  describe('Validation errors', () => {
    it('should return 400 if initialBalance is missing', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          transactions: [
            { type: 'credit', amount: 100 }
          ]
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 if initialBalance is not a number', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 'not-a-number',
          transactions: [
            { type: 'credit', amount: 100 }
          ]
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 if transactions is missing', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 1000
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 if transactions is not an array', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 1000,
          transactions: 'not-an-array'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 if transactions array is empty', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 1000,
          transactions: []
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 if transaction type is invalid', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 1000,
          transactions: [
            { type: 'invalid', amount: 100 }
          ]
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 if transaction amount is missing', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 1000,
          transactions: [
            { type: 'credit' }
          ]
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 if transaction amount is negative', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 1000,
          transactions: [
            { type: 'credit', amount: -100 }
          ]
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 if transaction amount is not a number', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 1000,
          transactions: [
            { type: 'credit', amount: 'not-a-number' }
          ]
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('Edge cases', () => {
    it('should handle very large numbers', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 1000000,
          transactions: [
            { type: 'credit', amount: 500000 },
            { type: 'debit', amount: 200000 }
          ]
        })
        .expect(200);

      expect(response.body).toHaveProperty('finalBalance', 1300000);
      expect(response.body).toHaveProperty('status', 1);
    });

    it('should handle zero initial balance', async () => {
      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 0,
          transactions: [
            { type: 'credit', amount: 100 }
          ]
        })
        .expect(200);

      expect(response.body).toHaveProperty('finalBalance', 100);
      expect(response.body).toHaveProperty('status', 1);
    });

    it('should handle many transactions', async () => {
      const transactions = Array.from({ length: 100 }, (_, i) => ({
        type: i % 2 === 0 ? 'credit' : 'debit',
        amount: 10
      }));

      const response = await request(app)
        .post('/calculate-balance')
        .send({
          initialBalance: 0,
          transactions
        })
        .expect(200);

      // 50 credits of 10 = 500, 50 debits of 10 = -500, net = 0
      expect(response.body).toHaveProperty('finalBalance', 0);
      expect(response.body).toHaveProperty('status', 1);
    });
  });
});

