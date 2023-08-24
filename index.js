const express = require("express");
const cors = require("cors");
const SSLCommerzPayment = require('sslcommerz-lts')
const { ObjectId } = require('mongodb');
require("dotenv").config();
const app = express();

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qesst1e.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const store_id = process.env.SSL_store_id;
const store_passwd = process.env.SSL_store_pass;
const is_live = false //true for live, false for sandbox


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        const coursesCollection = client.db("cmAcademy").collection("courses");
        const ordersCollection = client.db("cmAcademy").collection("orders");


        app.get('/courses', async (req, res) => {
            const result = await coursesCollection.find().toArray();
            res.send(result)
        })


        app.get("/course/:id", async (req, res) => {
            const courseId = req.params.id;
            const query = { _id: new ObjectId(courseId) };
            const result = await coursesCollection.findOne(query);
            res.send(result);

        });





 

        app.post('/order', async (req, res) => {

            // const course = await coursesCollection.findOne({ _id: new ObjectId(req.body.courseId) });
            const order = req.body;

            console.log(order);
            

            const tran_id = new ObjectId().toString();

            const data = {
                total_amount: order.price,
                currency: 'BDT',
                tran_id: tran_id, // use unique tran_id for each api call
                success_url: `https://payment-server-ssl-production.up.railway.app/payment/success/${tran_id}`,
                fail_url: `https://payment-server-ssl-production.up.railway.app/fail/${tran_id}`,
                cancel_url: 'http://localhost:3030/cancel',
                ipn_url: 'http://localhost:3030/ipn',
                shipping_method: 'Courier',
                product_name: 'Courses',
                product_category: 'Electronic',
                product_profile: 'general',
                cus_name: 'Customer Name',
                cus_email: 'customer@example.com',
                cus_add1: 'Dhaka',
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: order.mobile,
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
                order_date: order.date,
                duration: '12 weeks',
                instructor: 'Alex',


            };

           
            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
            sslcz.init(data).then(apiResponse => {
                // Redirect the user to payment gateway
                let GatewayPageURL = apiResponse.GatewayPageURL
                res.send({ url: GatewayPageURL })

                const finalOrder = {
                    paidStatus: false,
                    order,
                    transactionId: tran_id
                };
                const result = ordersCollection.insertOne(finalOrder)

                console.log('Redirecting to: ', GatewayPageURL)
            });



            app.post('/payment/success/:tranId', async (req, res) => {
               
                const result = await ordersCollection.updateOne({ transactionId: req.params.tranId }, {
                    $set: {
                        paidStatus: true,
                    },
                });

                if (result.modifiedCount > 0) {
                    res.redirect(`http://localhost:5173/payment/success/${req.params.tranId}`)
                }
            });

            app.post('/payment/fail/:tranId', async (req, res) => {
                const result = await ordersCollection.deleteOne({ transactionId: req.params.tranId });

                if(result.deletedCount){
                    res.redirect(`http://localhost:5173/payment/fail/${req.params.tranId}`)
                };
            })

        })


        
    app.get("/orders", async (req, res) => {
        const result = await ordersCollection.find().toArray();
        res.send(result);
      });
  





        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get("/", (req, res) => {
    res.send("CM academy is running");
});

app.listen(port, () => {
    console.log(`The CM academy is up on ${port}`);
});
