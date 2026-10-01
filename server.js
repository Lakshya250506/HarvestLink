const express = require('express');
const path = require('path');
const app = express();

// Serve static frontend files (index.html, style.css, app.js)
app.use(express.static(path.join(__dirname)));

// Fallback route to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Dynamic port assignment for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`HarvestLink running on port ${PORT}`);
});