import http from 'k6/http';
import { check, sleep } from 'k6';

// Simulate 100 concurrent users blasting the system for 10 seconds
export const options = {
  vus: 100,
  duration: '10s',
};

export default function () {
  const url = 'http://localhost/';
  const payload = JSON.stringify({
    userId: `user_${__VU}_${__ITER}`,
    productId: 'ps5-digital',
    quantity: 1,
  });
  const params = { headers: { 'Content-Type': 'application/json' } };

  // Send the POST request to Nginx
  const res = http.post(url, payload, params);
  
  // Verify Nginx and Node instantly accept it (HTTP 202)
  check(res, { 'status is 202 Accepted': (r) => r.status === 202 });
  sleep(0.1); // 100ms pause between requests per user
}