# Flash Sale Order Buffer

A high-throughput, resilient order ingestion system designed to handle massive traffic spikes (like a flash sale) without crashing the database. It uses **Nginx** as a load balancer, **Docker** for orchestration, and **Kafka** as a shock-absorbing message queue.

## System Architecture

```
[User Traffic] 
      │
      ▼
┌───────────┐
│   Nginx   │ (Load Balancer)
└─────┬─────┘
      ├──────────────────────┐
      ▼                      ▼
┌───────────┐          ┌───────────┐
│ Node API  │ (Instance 1) │ Node API  │ (Instance 2)
└─────┬─────┘          └─────┬─────┘
      │                      │ (Instantly pushes orders to queue)
      ▼                      ▼
┌──────────────────────────────────┐
│          Kafka Cluster           │ (Conveyor Belt Buffer)
└─────────────────┬────────────────┘
                  │ (Pulled at a safe, steady pace)
                  ▼
         ┌─────────────────┐
         │   Worker App    │ (Processes orders & saves to DB)
         └─────────────────┘
```

## The Core Point: Why We Build This

In a traditional setup, sending 10,000 simultaneous requests directly to an API that writes to a database will result in connection timeouts, memory leaks, or a complete database crash. 

This project solves that by splitting the process into two decoupled parts:
1. **The Producers (Fast):** The Node.js APIs quickly receive the orders from Nginx and immediately hand them off to **Kafka**. The user gets an instant `"Order received!"` response (under 20ms).
2. **The Consumer (Steady):** A background worker pulls orders out of **Kafka** at a controlled speed (e.g., 50 orders/sec) and safely writes them to PostgreSQL. 

If traffic spikes, **Kafka acts as a shock absorber (buffer)**, holding the messages safely until the database is ready to process them.

---

## How to Run & Verify ("The Aha! Moment")

### 1. Spin up the infrastructure
```bash
docker-compose up -d
```

### 2. Test the Shock Absorber
To prove this architecture actually works, run this diagnostic test:

1. **Stop the Worker App** (simulating database maintenance or high load):
   ```bash
   docker-compose stop worker
   ```
2. **Spam the system with requests** (simulating a sudden flash sale):
   ```bash
   # Send 100 fast order requests to the Nginx load balancer
   for i in {1..100}; do curl -X POST http://localhost/order; done
   ```
   *Observation:* Every single request returns `202 Accepted` immediately because the Node APIs successfully offloaded them to Kafka.

3. **Check the Database:**
   *Querying the PostgreSQL container will return 0 rows.* The database is perfectly safe and untouched.

4. **Start the Worker:**
   ```bash
   docker-compose start worker
   ```
   *Observation:* Watch the worker console logs. It will immediately begin draining the queue, processing and saving all 100 pending orders safely into the database without losing a single one.