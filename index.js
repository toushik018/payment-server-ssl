const express = require("express");
const cors = require("cors");
const SSLCommerzPayment = require('sslcommerz-lts')
const { ObjectId } = require('mongodb');
const nodemailer = require("nodemailer");
require("dotenv").config();
const app = express();
const PDFDocument = require('pdfkit');
const fs = require('fs');

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


// send grid emails


const paymentConfirmEmail = (order) => {
    const studentEmail = order.order.studentEmail;
    const date = order.order.date;
    const orderId = order.transactionId;
    const studentName = order.order.studentName;

    const instructorName = order.course.instructor;
    const instructorEmail = order.course.instructorEmail;
    const courseTitle = order.course.title;
    const totalPrice = order.course.coursePrice;


    const pdfDoc = new PDFDocument();

    // Pipe the PDF content to a writable stream
    const pdfStream = fs.createWriteStream('invoice.pdf');
    pdfDoc.pipe(pdfStream);

    // Function to add a heading with styles
    function addHeading(text, fontSize, color, align, margin) {
        pdfDoc.font('Helvetica-Bold')
            .fontSize(fontSize)
            .fillColor(color)
            .text(text, { align: align, continued: false })
            .moveDown(margin);
    }

    // Function to add a paragraph with styles
    function addParagraph(text, fontSize, color, align, margin) {
        pdfDoc.font('Helvetica')
            .fontSize(fontSize)
            .fillColor(color)
            .text(text, { align: align, continued: false })
            .moveDown(margin);
    }

    // Header
    pdfDoc.rect(0, 0, 610, 130)
        .fill('#e1e1e1');

    pdfDoc.image('./logo.png', 60, 30, { width: 80, height: 80 });
    addHeading('Invoice from CM Academy', 24, '#0EADF0', 'center', 2);



    // Order Details
    pdfDoc.rect(20, 130, 560, 300)
        .fill('#ffffff');

    addHeading(`Course: ${courseTitle}`, 18, '#5b5b5b', 'left', 1);

    addParagraph(`Order ID: ${orderId}`, 14, '#5b5b5b', 'left', 0.5);
    addParagraph(`Student Name: ${studentName}`, 14, '#5b5b5b', 'left', 0.5);
    addParagraph(`Student Email: ${studentEmail}`, 14, '#5b5b5b', 'left', 0.5);
    addParagraph(`Date: ${date}`, 14, '#5b5b5b', 'left', 0.5);
    addParagraph(`Total Price: ${totalPrice} BDT`, 14, '#5b5b5b', 'left', 0.5);


    pdfDoc.rect(20, 320, 560, 100)
        .fill('#f7f7f7');

    addHeading('Instructor Details', 16, '#5b5b5b', 'left', 0.5);

    addParagraph(`Instructor Email: ${instructorEmail}`, 14, '#5b5b5b', 'left', 0.5);
    addParagraph(`Instructor Name: ${instructorName}`, 14, '#5b5b5b', 'left', 0.5);

    // End the PDF document
    pdfDoc.end();

    // Send email with PDF attachment
    const transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
        }
    });

    // const adminEmail = "code.mates.team@gmail.com";
    // const recipients = [instructorEmail, studentEmail, adminEmail ]; 

    transporter.sendMail({
        from: 'tayebhossain018@gmail.com',
        to: studentEmail,
        // to: recipients.join(', '),
        subject: 'Your Invoice from CM Academy',
        text: 'Thank you for enrolling in the course.',
        attachments: [
            {
                filename: 'invoice.pdf',
                content: fs.createReadStream('invoice.pdf')
            }
        ]
    }, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

    // Remove the temporary PDF file
    pdfStream.on('finish', () => {
        fs.unlink('invoice.pdf', (err) => {
            if (err) {
                console.error('Error deleting temporary PDF file:', err);
            }
        });
    });
};





const { MongoClient, ServerApiVersion } = require('mongodb');
const { title } = require("process");

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

            const course = await coursesCollection.findOne({ _id: new ObjectId(req.body.courseId) });
            const order = req.body;

            const tran_id = new ObjectId().toString();

            const data = {
                total_amount: course?.coursePrice,
                currency: 'BDT',
                tran_id: tran_id, // use unique tran_id for each api call
                success_url: `http://localhost:5000/payment/success/${tran_id}`,
                fail_url: `http://localhost:5000/payment/fail/${tran_id}`,
                cancel_url: 'http://localhost:3030/cancel',
                ipn_url: 'http://localhost:3030/ipn',
                shipping_method: 'Courier',
                product_name: course?.title,
                product_category: 'Electronic',
                product_profile: 'general',
                cus_name: 'Customer Name',
                cus_email: course?.instructorEmail,
                cus_add1: 'Dhaka',
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: order?.mobile,
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
                instructor: course?.instructor,
                student_email: order?.studentEmail,
                student_name: order?.studentName,
            };




            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
            sslcz.init(data).then(apiResponse => {
                // Redirect the user to payment gateway
                let GatewayPageURL = apiResponse.GatewayPageURL
                res.send({ url: GatewayPageURL })

                const finalOrder = {
                    course,
                    paidStatus: false,
                    order,
                    transactionId: tran_id
                };
                const result = ordersCollection.insertOne(finalOrder)

                console.log('Redirecting to: ', GatewayPageURL)
            });



            // app.post('/payment/success/:tranId', async (req, res) => {
            //     const { tranId } = req.params;

            //     const order = await ordersCollection.findOne({ transactionId: tranId });

            //     if (order) {
            //         // Call the paymentConfirmEmail function with the studentEmail parameter
            //         paymentConfirmEmail(order);

            //         const result = await ordersCollection.updateOne(
            //             { transactionId: tranId },
            //             {
            //                 $set: {
            //                     paidStatus: true,
            //                 },
            //             }
            //         );

            //         if (result.modifiedCount > 0) {
            //             res.redirect(`http://localhost:5173/payment/success/${tranId}`);
            //         }
            //     } else {
            //         res.redirect(`http://localhost:5173/payment/fail/${tranId}`);
            //     }
            // });




            app.post('/payment/success/:tranId', async (req, res) => {

                const { tranId } = req.params;
    
                const order = await ordersCollection.findOne({ transactionId: tranId });
    
                paymentConfirmEmail(order);
    
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
    
                if (result.deletedCount) {
                    res.redirect(`http://localhost:5173/payment/fail/${req.params.tranId}`)
                };
                // if (result.deletedCount) {
                //     res.redirect(`http://localhost:5173/payment/fail/${req.params.tranId}`)
                // };
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
