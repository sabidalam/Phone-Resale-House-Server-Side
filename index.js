const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET);

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ifta3d6.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const categoriesCollection = client.db('phoneResaleHouse').collection('brandsCategories');
        const allPhoneCollection = client.db('phoneResaleHouse').collection('allPhones');
        const bookingsCollection = client.db('phoneResaleHouse').collection('bookings');
        const usersCollection = client.db('phoneResaleHouse').collection('users');
        const paymentsCollection = client.db('phoneResaleHouse').collection('payments');
        const reportedItemsCollection = client.db('phoneResaleHouse').collection('reportedItems');


        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        //categories
        app.get('/categories', async (req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).limit(3).toArray();
            res.send(result);
        });

        app.get('/allCategories', async (req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/productCategory', async (req, res) => {
            const query = {}
            const result = await categoriesCollection.find(query).project({ name: 1 }).toArray();
            res.send(result);
        });

        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id
            const query = { id: id };
            const result = await allPhoneCollection.find(query).toArray();
            res.send(result);
        });

        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await allPhoneCollection.insertOne(product);
            res.send(result);
        });

        app.get('/products', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const product = await allPhoneCollection.find(query).toArray();
            res.send(product);
        });

        app.get('/products/advertised', async (req, res) => {
            const query = { advertise: true };
            const result = await allPhoneCollection.find(query).toArray();
            res.send(result);
        });

        app.put('/products/advertise/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertise: true
                }
            }
            const result = await allPhoneCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await allPhoneCollection.deleteOne(query);
            res.send(result);
        });

        //bookings
        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });

        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingsCollection.findOne(query);
            res.send(booking);
        });


        app.put('/bookings', async (req, res) => {
            const booking = req.body;
            const query = {
                productID: booking.productID,
                email: booking.email,
                productName: booking.productName
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = 'You have already booked this product';
                return res.send({ acknowledged: false, message });
            }
            const result = await bookingsCollection.insertOne(booking);
            const id = booking.productID;
            const find = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    booked: true

                }
            }
            const updatedResult = await allPhoneCollection.updateOne(find, updatedDoc, options);
            res.send((result, updatedResult));
        });

        // users
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '360d' });
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' });
        });

        app.get('/users/buyers', verifyJWT, verifyAdmin, async (req, res) => {
            const query = { accountType: 'User' };
            const buyer = await usersCollection.find(query).toArray();
            res.send(buyer);
        });

        app.get('/users/sellers', verifyJWT, verifyAdmin, async (req, res) => {
            const query = { accountType: 'Seller' };
            const seller = await usersCollection.find(query).toArray();
            res.send(seller);
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        });

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.accountType === 'Seller' });
        });

        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.accountType === 'User' });
        });

        app.get('/users/verified/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isVerified: user?.status === 'verified' });
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.put('/users/seller/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    status: 'verified'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });

        //payment
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });

        });

        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId;
            const query = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingsCollection.updateOne(query, updatedDoc);
            res.send(result);
        });

        app.get('/reportedItems', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const result = await reportedItemsCollection.find(query).toArray();
            res.send(result);
        });

        app.post('/reportedItems', async (req, res) => {
            const item = req.body;
            const result = await reportedItemsCollection.insertOne(item);
            res.send(result);
        });

        app.delete('/reportedItems/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await reportedItemsCollection.deleteOne(query);
            res.send(result);
        });


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
});