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

        app.get('/categories', async (req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/category/:id', async (req, res) => {
            const id = req.params.id
            const query = { id: id };
            const result = await allPhoneCollection.find(query).toArray();
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