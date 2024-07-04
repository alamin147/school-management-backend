const express = require('express');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_TOKEN)
const port = process.env.PORT || 5000;
const app = express();
app.use(cors());
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Server is working')
})


const { MongoClient, ServerApiVersion, Collection, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u1vzeim.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const users = client.db('school').collection('users');
        const classes = client.db('school').collection('classes');
        const carts = client.db('school').collection('carts');
        const payments = client.db('school').collection('payments');

        // add users
        app.post('/addUsers', async (req, res) => {
            const body = req.body;
            const query = { email: body.email }
            const existUser = await users.findOne(query)
            if (existUser) {
                return res.send({ mesage: 'existing user' })
            }
            const result = await users.insertOne(body);
            res.send(result);
        })

        // get all user
        app.get('/users', async (req, res) => {
            const result = await users.find({}).toArray();
            res.send(result);
        })

        // add a class
        app.post('/addClasses', async (req, res) => {
            const body = req.body;
            const result = await classes.insertOne(body);
            res.send(result);
        })

        // fetch all the class
        app.get('/classes', async (req, res) => {

            const result = await classes.find().toArray();
            res.send(result);
        })
        app.get('/classesApproved', async (req, res) => {
            const query = { status: "approved" };
            const result = await classes.find(query).toArray();
            res.send(result);
        })


        // fetch my class only for instructors
        app.get('/myClasses', async (req, res) => {
            let email = req.query.email

            // console.log("first", email);
            if (!email) {
                res.send([])
            }
            const query = { email: email };
            const result = await classes.find(query).toArray();
            // console.log("result",result)
            res.send(result)
        })


        // get single my class
        app.get('/myClass/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await classes.findOne(query);
            res.send(result)
        })


        //   update single class
        app.put('/updateMyclass', async (req, res) => {
            const id = req.query.id;
            const body = req.body;
            // console.log("id", id, body);
            const query = { _id: new ObjectId(id) }
            const update = {
                $set: {
                    className: body.className,
                    price: body.price,
                    seats: body.seats,
                }
            }

            const result = await classes.updateOne(query, update)
            // console.log("updated one", result)
            res.send(result)

        })


        // class approve by admin

        app.put('/approve', async (req, res) => {
            const id = req.query.id;
            // console.log("action",action, id);

            const update = {
                $set: {
                    status: 'approved'
                }
            }

            const query = { _id: new ObjectId(id) }
            const result = await classes.updateOne(query, update)
            res.send(result)
        })


        // class denied and send feedback by admin

        app.put('/deny', async (req, res) => {
            // console.log("hitting")
            const id = req.query.id;
            const body = req.body;
            // console.log("line 131",body)
            const update = {
                $set: {
                    status: 'denied',
                    feedback: body.feedback
                }
            }

            const query = { _id: new ObjectId(id) }
            const result = await classes.updateOne(query, update)
            res.send(result)
        })


        // make admin
        app.put('/makeAdmin', async (req, res) => {
            const id = req.query.id;

            const update = {
                $set: {
                    role: 'admin'
                }
            }

            const query = { _id: new ObjectId(id) }
            const result = await users.updateOne(query, update)
            res.send(result)
        })

        // make instructure
        app.put('/makeInstructor', async (req, res) => {
            const id = req.query.id;

            const update = {
                $set: {
                    role: 'instructor'
                }
            }

            const query = { _id: new ObjectId(id) }
            const result = await users.updateOne(query, update)
            res.send(result)
        })


        // cart/ bookmarked class

        app.post('/addToClass', async (req, res) => {

            const body = req.body;
            // console.log(body)
            const result = await carts.insertOne(body);
            res.send(result)
        })

        app.get('/carts', async (req, res) => {
            const result = await carts.find({}).toArray();
            res.send(result);
        })

        // app.get('/getBookmarkedClasses/:email', async (req, res) => {
        //     const email = req.params.email;
        //     // console.log(email)
        //     // if (!email) { res.send([]) }
        //     const result = await carts.find({ email: email }).toArray();
        //     // console.log(result)
        //     res.send(result);
        // })

        app.get('/getBookmarkedClasses', async (req, res) => {
            const email = req.query.email;
            const result = await carts.find({ userEmail: email }).toArray();
            res.send(result)
        })


        // delete from cart
        app.delete('/selectedClassDelete/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id)
            const query = { _id: new ObjectId(id) };
            const result = await carts.deleteOne(query);
            res.send(result);
        })


        // check if admin or teacher
        app.get('/checkUser', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await users.find(query).toArray();
            // console.log(result)
            res.send(result)
        })


        // payment
        app.post('/create-payment', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            // console.log(paymentIntent.client_secret)
            const ClientSecret = { clientSecret: paymentIntent.client_secret }
            res.send(ClientSecret)
        })


        // payment
        app.post('/payments', async (req, res) => {
            const id = req.query.id; // id for delete the item from cart
            // console.log(id)
            const payment = req.body;
            // console.log("payment id", payment.cart._id);
            const classId = payment.cart._id;
            const result = await payments.insertOne(payment);
            const deleteQuery = { _id: new ObjectId(id) };
            const deleted = await carts.deleteOne(deleteQuery)
            // main class seat minus
            const changeClassSeatQuery = { _id: new ObjectId(classId) };
            const seats = parseInt(payment.cart.seats) - 1;
            const totalEnroll = parseInt(payment.cart.totalEnroll) + 1;
            const update = {
                $set: {
                    seats: seats,
                    totalEnroll: totalEnroll
                }
            }
            const changeClassSeat = await classes.updateOne(changeClassSeatQuery, update)

            res.send(result);
        })



        // get a item from cart for payment in payment page from my selected page
        app.get('/carts/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id)
            const query = { _id: new ObjectId(id) };
            const result = await carts.findOne(query);
            // console.log(result);
            res.send(result)
            // 
        })



        // payment history by user email
        app.get('/paymentHistory', async (req, res) => {
            const email = req.query.email;
            const result = await payments.find({ email: email }).sort({ "date": -1 }).toArray();
            // console.log(result)
            res.send(result)
        })

        // enrolled class
        app.get('/enrolledClasses', async (req, res) => {
            const email = req.query.email;
            const result = await payments.find({ email: email }).toArray();
            // console.log(result)
            res.send(result)
        })


        // popular classes
        app.get('/popularClasses', async (req, res) => {

            const result = await classes.find().sort({ "totalEnroll": -1 }).toArray();
            // console.log(result);
            res.send(result);
        })

        // instructors only
        app.get('/instructors', async (req, res) => {
            const query = { role: 'instructor' };
            const result = await users.find(query).toArray();
            res.send(result);
        })


        // feedback to the class
        app.put('/feedback', async (req, res) => {
            const id = req.query.id;
            const body = req.body;
            // console.log("line 131",body)
            const update = {
                $set: {
                    feedback: body.feedback
                }
            }

            const query = { _id: new ObjectId(id) }
            const result = await classes.updateOne(query, update)
            res.send(result)
        })


        //////////////////////
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log("server is running at", port)
})