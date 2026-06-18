const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://digital_life:deZfwRBUBu9yGuU6@cluster0.3036qk8.mongodb.net/?appName=Cluster0";
  

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("digital_life");
    const userCollection = db.collection("user");
    const lessonsCollection = db.collection("lessons");
    // const companyCollection = db.collection("company");
    // const applicationCollection = db.collection("applicationCollect");
    // const planCollection = db.collection("plan");
    // const subscriptionCollection = db.collection("subscription");

    // Get all lessons Post
    app.get("/api/lessons", async (req, res) => {
      const result = await lessonsCollection.find().toArray();
      res.send(result);
    });

    // get jobs Data by jobsId
    app.get("/api/lesson/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await lessonsCollection.findOne(query);
      res.send(result);
    });

    // // company jobs data
    // app.get("/api/jobs", async (req, res) => {
    //   const reqruiterId = req.query.reqruiterId;
    //   const result = await jobsCollection.find({ reqruiterId }).toArray();
    //   res.send(result);
    // });

    // // company Data Get
    // app.get("/api/company", async (req, res) => {
    //   const result = await companyCollection.find().toArray();
    //   res.send(result);
    // });

    // // job seeker apply data get
    // app.get("/api/applyData", async (req, res) => {
    //   const query = {};
    //   if (req.query.applicantId) {
    //     query.applicantId = req.query.applicantId;
    //   }
    //   if (req.query.jobId) {
    //     query.jobId = req.query.jobId;
    //   }

    //   const result = await applicationCollection.find(query).toArray();
    //   res.send(result);
    // });

    // // job seeker apply
    // app.post("/api/apply", async (req, res) => {
    //   const applyData = req.body;
    //   const newApplyData = {
    //     ...applyData,

    //     createAt: new Date(),
    //   };
    //   const result = await applicationCollection.insertOne(newApplyData);
    //   res.send(result);
    // });

    // // company Data Post
    // app.post("/api/company", async (req, res) => {
    //   const data = req.body;
    //   const result = await companyCollection.insertOne(data);
    //   res.send(result);
    // });

    // // company job Data post
    // app.post("/api/jobs", async (req, res) => {
    //   const data = req.body;

    //   const company = await companyCollection.findOne({
    //     recruiterId: data.recruiterId,
    //   });
    //   const newData = {
    //     ...data,
    //     CompanyName: company.name,
    //     image: company.image,
    //     createAt: new Date(),
    //   };

    //   const result = await jobsCollection.insertOne(newData);
    //   res.send(result);
    // });

    // // Company Data Update
    // app.patch("/api/companyUpdate/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const newData = req.body;

    //   const query = { reqruiterId: id };
    //   const updateInfo = {
    //     $set: newData,
    //   };

    //   const result = await companyCollection.updateOne(query, updateInfo);
    //   res.send(result);
    // });

    // app.get("/api/planName", async (req, res) => {
    //   const query = {};
    //   if (req.query.plan) {
    //     query.name = req.query.plan;
    //   }

    //   const result = await planCollection.findOne(query);
    //   res.send(result);
    // });

    // app.post("/api/subscriptions", async (req, res) => {
    //   const data = req.body;
    //   const newData = {
    //     ...data,
    //     createAt: new Date(),
    //   };
    //   const result = await subscriptionCollection.insertOne(newData);

    //   // update plan inside

    //   const filter = { email: data.email };

    //   const updateInfo = {
    //     $set: {
    //       plan: data.planId,
    //     },
    //   };

    //   const updateData = await userCollection.updateOne(filter, updateInfo);
    //   res.send(updateData);
    // });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Server is running successfully 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
