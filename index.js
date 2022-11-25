const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ifta3d6.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoriesCollection = client.db('phoneResaleHouse').collection('brandsCategories');
        const allPhoneCollection = client.db('phoneResaleHouse').collection('allPhones');
        const bookingsCollection = client.db('phoneResaleHouse').collection('bookings');

        //categories
        app.get('/categories', async (req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id
            const query = { id: id };
            const result = await allPhoneCollection.find(query).toArray();
            res.send(result);
        });

        //bookings
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })
    }
    finally {

    }
}
run().catch(console.log);


app.get('/', (req, res) => {
    res.send('phone resale house server running')
});

app.listen(port, () => {
    console.log(`phone resale house ${port}`);
})