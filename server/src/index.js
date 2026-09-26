const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Homestay Helper server running on port ${PORT}`);
});
