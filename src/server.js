const express = require('express');
const path = require('path');
const app = express();

// Serve the React app
app.use(express.static('build'));

// Send all requests to the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start server
app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is running! 🚀');
});
