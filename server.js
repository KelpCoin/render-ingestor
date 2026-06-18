const express = require('express');
const app = express();

app.use(express.json());

let listings = [];

app.get('/api/listings', (req, res) => {
    res.json(listings);
});

app.post('/api/listings', (req, res) => {
    const item = req.body;
    listings.push(item);
    res.json({ ok: true, item });
});

app.post('/ingest', (req, res) => {
    console.log('INGEST RECEIVED', req.body);
    res.status(200).send('OK');
});

app.get('/', (req, res) => res.send('LIVE'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('RUNNING ON', PORT));