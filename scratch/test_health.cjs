const http = require('http');

http.get('http://localhost:4000/api/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`HTTP ${res.statusCode}:`, data);
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('Health check error:', err.message);
  process.exit(1);
});
