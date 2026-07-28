// Your web server code; it receives the 
// checkout request and immediately publishes it to the Kafka queue.
import express from 'express';
import { Kafka } from 'kafkajs';

const app = express();
app.use(express.json());

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:29092';
const PORT = process.env.PORT || 3000;

// initialized Kafka Client
const kafka = new Kafka({ 
    clientID: 'api-server',
    brokers: [`${KAFKA_BROKER}`],
});

// Create Producer Instance
const producer = kafka.producer();

app.post('/', async (req, res) => {
    try {
        const { userID, productId, quantity } = req.body;

        const orderData = { 
            userID, 
            productId,
            quantity,
            createdAt: new Date().toString(), // convert into string
        };

        // Push instantly to Kafka queue
        // 202 is for user knows we got no need to wait for DB
        return res.status(202).json({
            status: 'Order received!',
            order: orderData,
        });
    } catch (error) { 
        console.error('Error publishing order to Kafka:', error);
        return res.status(500).json({ error: 'Internal server error'});
    }
});

// Start Server after Kafka connects
const startServer = async () => { 
    try { 
        await producer.connect();
        console.log('Connected to Kafka Producer successfully');

        app.listen(PORT, () => {
            console.log(`Server is running on the port ${PORT}`);
        });
    } catch (error) { 
        console.log('Failed to start API producer:', error);
        process.exit(1);
    }
}

startServer();