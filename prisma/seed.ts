/**
 * Seed script for Financial Dashboard.
 * Creates deterministic demo data: 2 portfolios with holdings and transactions.
 *
 * Run: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clean existing data (order matters due to FK constraints)
  await prisma.transaction.deleteMany();
  await prisma.holding.deleteMany();
  await prisma.portfolio.deleteMany();

  // Portfolio 1: Growth-oriented tech portfolio
  const growth = await prisma.portfolio.create({
    data: {
      id: "seed-portfolio-growth",
      name: "Tech Growth",
      baseCurrency: "EUR",
      holdings: {
        create: [
          {
            id: "seed-holding-aapl",
            symbol: "AAPL",
            quantity: 50,
            avgCostBasis: 178.5,
          },
          {
            id: "seed-holding-msft",
            symbol: "MSFT",
            quantity: 30,
            avgCostBasis: 380.25,
          },
          {
            id: "seed-holding-nvda",
            symbol: "NVDA",
            quantity: 20,
            avgCostBasis: 450.0,
          },
        ],
      },
      transactions: {
        create: [
          {
            id: "seed-tx-1",
            symbol: "AAPL",
            type: "BUY",
            quantity: 50,
            price: 178.5,
            fees: 5.0,
            occurredAt: new Date("2025-06-15T10:00:00Z"),
          },
          {
            id: "seed-tx-2",
            symbol: "MSFT",
            type: "BUY",
            quantity: 30,
            price: 380.25,
            fees: 5.0,
            occurredAt: new Date("2025-07-01T14:30:00Z"),
          },
          {
            id: "seed-tx-3",
            symbol: "NVDA",
            type: "BUY",
            quantity: 20,
            price: 450.0,
            fees: 5.0,
            occurredAt: new Date("2025-08-10T09:00:00Z"),
          },
        ],
      },
    },
  });

  // Portfolio 2: Dividend-focused portfolio
  const dividend = await prisma.portfolio.create({
    data: {
      id: "seed-portfolio-dividend",
      name: "Dividend Income",
      baseCurrency: "EUR",
      holdings: {
        create: [
          {
            id: "seed-holding-ko",
            symbol: "KO",
            quantity: 100,
            avgCostBasis: 58.75,
          },
          {
            id: "seed-holding-jnj",
            symbol: "JNJ",
            quantity: 40,
            avgCostBasis: 155.3,
          },
        ],
      },
      transactions: {
        create: [
          {
            id: "seed-tx-4",
            symbol: "KO",
            type: "BUY",
            quantity: 100,
            price: 58.75,
            fees: 3.5,
            occurredAt: new Date("2025-05-20T11:00:00Z"),
          },
          {
            id: "seed-tx-5",
            symbol: "JNJ",
            type: "BUY",
            quantity: 40,
            price: 155.3,
            fees: 3.5,
            occurredAt: new Date("2025-06-01T13:00:00Z"),
          },
          {
            id: "seed-tx-6",
            symbol: "KO",
            type: "SELL",
            quantity: 20,
            price: 62.0,
            fees: 3.5,
            occurredAt: new Date("2025-09-15T10:30:00Z"),
          },
        ],
      },
    },
  });

  console.log(`Seeded ${growth.name} (${growth.id})`);
  console.log(`Seeded ${dividend.name} (${dividend.id})`);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
