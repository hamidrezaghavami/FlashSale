// Your background processor; it listens to Kafka,
// pulls orders, and writes them to the database.
import { Kafka } from "kafkajs";
import pg from "pg";
const { Pool } = pg;

// Environment Setup
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sales_user:sales_password@postgres:5432/flashsale_db';

// Initialize PostgreSQL Pool
const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Initialize Kafka Client
const kafka = new Kafka({ 
    clientId: 'worker-service',
    brokers: [KAFKA_BROKER],
});

const consumer = kafka.consumer({ groupId: 'order-processing-group' });
  
// Create Database Table if it doesn't exist
async function initDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      product_id VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(createTableQuery);
    console.log('PostgreSQL "orders" table initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error.stack);
    throw error;
  }
}

// Start Consumer Loop
async function startWorker() {
    try {
        await initDatabase();
        await consumer.connect();
        console.log("Connected to Kafka Consumer successfully");

        // FIXED: Changed to plural 'orders' to match the API producer
        await consumer.subscribe({ topic: 'orders', fromBeginning: true });

        await consumer.run({
            // FIXED: Lowercase 'partition'
            eachMessage: async ({ topic, partition, message }) => { 
                try { 
                    const orderData = JSON.parse(message.value.toString());
                    const { userId, productId, quantity } = orderData; 

                    // Safe insert into PostgreSQL
                    const insertQuery = `
                    INSERT INTO orders (user_id, product_id, quantity)
                    VALUES ($1, $2, $3)
                    RETURNING id;
                    `;
                    const values = [userId, productId, quantity];

                    const res = await pool.query(insertQuery, values);
                    console.log(`Order processed safely! DB Row ID: ${res.rows[0].id} | User: ${userId}`);
                } catch (error) { 
                    // FIXED: Changed err.stack to error.stack
                    console.error('Error processing single order message:', error.stack);
                }
            },
        });
    } catch (error) {
        console.error('Fatal worker startup error:', error.stack);
        process.exit(1);
    }
}

startWorker();