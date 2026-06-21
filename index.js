const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://digital_life:deZfwRBUBu9yGuU6@cluster0.3036qk8.mongodb.net/?appName=Cluster0";

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
    const favoritesCollection = db.collection("favorites");
    // const applicationCollection = db.collection("applicationCollect");
    // const planCollection = db.collection("plan");
    // const subscriptionCollection = db.collection("subscription");

    // Get all lessons Post
    app.get("/api/lessons", async (req, res) => {
      const result = await lessonsCollection.find().toArray();
      res.send(result);
    });

    // app.get('/api/lesson')

    // get lesson Data by Id
    app.get("/api/lesson/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await lessonsCollection.findOne(query);
      res.send(result);
    });

    //my Lesson
    app.get("/api/lessons/:authorId", async (req, res) => {
      const { authorId } = req.params;
      const query = { "author.authorId": authorId };
      const result = await lessonsCollection.find(query).toArray();
      res.send(result);
    });

    // User Collection Get
    app.get("/api/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Today lesson create
    app.get("/api/newLesson", async (req, res) => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todaysNewLessons = await lessonsCollection.countDocuments({
        createdAt: {
          $gte: startOfToday,
        },
      });

      res.send(todaysNewLessons);
    });

    // My Favorite Data

    app.get("/api/favorites/:userId", async (req, res) => {
      const { userId } = req.params;

      const result = await favoritesCollection
        .aggregate([
          {
            $match: {
              userId: userId,
            },
          },

          // join lessons collection
          {
            $lookup: {
              from: "lessons",
              localField: "lessonId",
              foreignField: "_id",
              as: "lesson",
            },
          },

          {
            $unwind: "$lesson",
          },

          // optional: clean output
          {
            $project: {
              userId: 1,
              saveAt: 1,
              lesson: 1,
            },
          },
        ])
        .toArray();

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

    // job seeker apply
    app.post("/api/createLessons", async (req, res) => {
      const lessonData = req.body;
      const newLessonData = {
        ...lessonData,

        createAt: new Date(),
      };
      const result = await lessonsCollection.insertOne(newLessonData);
      res.send(result);
    });

    // Favorites Data Post
    // app.post("/api/favorites", async (req, res) => {
    //   const { userId, lessonId } = req.body;

    //   const exist = await favoritesCollection.findOne({
    //     userId,
    //     lessonId: new ObjectId(lessonId),
    //   });

    //   if (exist) {
    //     return res.status(409).send({
    //       message: "Already added to favorites",
    //     });
    //   }

    //   const newFavorites = {
    //     userId,
    //     lessonId: new ObjectId(lessonId),
    //     saveAt: new Date(),
    //   };

    //   const result = await favoritesCollection.insertOne(newFavorites);
    //   res.send(result);
    // });
    app.post("/api/favorites/toggle", async (req, res) => {
      const { userId, lessonId, userName } = req.body;

      const query = {
        userId,
        lessonId: new ObjectId(lessonId),
      };

      const exist = await favoritesCollection.findOne(query);

      // REMOVE
      if (exist) {
        await favoritesCollection.deleteOne(query);

        await lessonsCollection.updateOne(
          { _id: new ObjectId(lessonId) },
          {
            $pull: { favorites: userId },
            $inc: { favoritesCount: -1 },
          },
        );

        return res.send({
          favorites: false,
          message: "Removed from favorites",
        });
      }

      // ADD
      await favoritesCollection.insertOne({
        userName,
        userId,
        lessonId: new ObjectId(lessonId),
        saveAt: new Date(),
      });

      await lessonsCollection.updateOne(
        { _id: new ObjectId(lessonId) },
        {
          $addToSet: { favorites: userId },
          $inc: { favoritesCount: 1 },
        },
      );

      return res.send({
        favorites: true,
        message: "Added to favorites",
      });
    });

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

    // ---------------------------------------myLesson Data Update-------------------------------------------

    app.patch("/api/lessonUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const newLessonData = req.body;
      const query = { _id: new ObjectId(id) };
      const updateInfo = {
        $set: newLessonData,
      };

      const result = await lessonsCollection.updateOne(query, updateInfo);
      res.send(result);
    });

    // user role Update-----------------------
    app.patch("/api/userRole", async (req, res) => {
      const { role, userId } = req.body;
      const query = { _id: new ObjectId(userId) };

      if (!role || !userId) {
        return res.status(400).send({ message: "Invalid data" });
      }

      const updateRole = {
        $set: { role },
      };

      const result = await userCollection.updateOne(query, updateRole);
      res.send(result);
 
    });

    app.patch("/api/likes", async (req, res) => {
      const { userId, lessonId } = req.body;

      const query = {
        _id: new ObjectId(lessonId),
      };

      const lesson = await lessonsCollection.findOne(query);

      if (!lesson) {
        return res.status(404).send({
          message: "Lesson not found",
        });
      }

      // Unlike
      if (lesson?.likes?.includes(userId)) {
        await lessonsCollection.updateOne(query, {
          $pull: {
            likes: userId,
          },
          $inc: {
            likesCount: -1,
          },
        });

        return res.send({
          liked: false,
          message: "Like removed",
        });
      }

      // Like
      await lessonsCollection.updateOne(query, {
        $addToSet: {
          likes: userId,
        },
        $inc: {
          likesCount: 1,
        },
      });

      return res.send({
        liked: true,
        message: "Lesson liked",
      });
    });

    // --------------------------------------------Delete Section------------------------------------------------

    app.delete("/api/favDelete/:id", async (req, res) => {
      const { id } = req.params;
      const query = { lessonId: new ObjectId(id) };
      const result = await favoritesCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/api/lessonDelete/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await lessonsCollection.deleteOne(query);
      res.send(result);
    });

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
