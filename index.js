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
    const reportCollection = db.collection("reportCollect");
    const sessionCollection = db.collection("session");
    // const subscriptionCollection = db.collection("subscription");

    // Verification Center----------------------------------------------------
    const verifyToken = async (req, res, next) => {
      const authHeader = req.headers.authorization;
      // console.log(authHeader);
      if (!authHeader) {
        return req.status(401).send({ message: "unauthorize access" });
      }
      const token = authHeader.split(" ")[1];
      if (!token) {
        return req.status(401).send({ message: "unauthorize access" });
      }

      const query = { token: token };

      const session = await sessionCollection.findOne(query);

      const userId = session.userId;
      const user = await userCollection.findOne({
        _id: userId,
      });

      req.user = user;

      // console.log(req.user === 'user');

      next();
    };

    const verifyUser = (req, res, next) => {
      if (req.user?.role !== "user") {
        return res.status(403).send({ message: "forbidden access" });
      }

      next();
    };
    const verifyAdmin = (req, res, next) => {
      if (req.user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // Get all lessons Post
    app.get("/api/lessons",verifyToken, async (req, res) => {
      const result = await lessonsCollection.find().toArray();
      res.send(result);
    });

    // app.get('/api/lesson')

    // get lesson Data by Id
    app.get("/api/lesson/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await lessonsCollection.findOne(query);
      res.send(result);
    });

    //my Lesson
    app.get("/api/lessons/:authorId", verifyToken, async (req, res) => {
      const { authorId } = req.params;
      const query = { "author.authorId": authorId };
      const result = await lessonsCollection.find(query).toArray();
      res.send(result);
    });

    // User Collection Get
    app.get("/api/users", verifyToken,verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Today lesson create
    app.get("/api/newLesson", verifyToken,verifyAdmin, async (req, res) => {
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

    app.get("/api/favorites/:userId",verifyToken, async (req, res) => {
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

    // report Get --------------------------------------------------

    app.get("/api/reports",verifyToken,verifyAdmin, async (req, res) => {
      const result = await reportCollection.find().toArray();
      res.send(result);
    });
    
    // lesson post
    app.post("/api/createLessons",verifyToken,verifyUser, async (req, res) => {
      const lessonData = req.body;
      const newLessonData = {
        ...lessonData,

        createAt: new Date(),
      };
      const result = await lessonsCollection.insertOne(newLessonData);
      res.send(result);
    });

    // Favorites Data Post
    app.post("/api/favorites/toggle",verifyToken, async (req, res) => {
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

    // User Report Post -------------------
    app.post("/api/report",verifyToken, async (req, res) => {
      const report = req.body;
      const newReport = {
        ...report,
        createAt: new Date(),
      };

      const result = await reportCollection.insertOne(newReport);
      res.send(result);
    });

    // ---------------------------------------myLesson Data Update-------------------------------------------

    app.patch("/api/lessonUpdate/:id", verifyToken, async (req, res) => {
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
    app.patch("/api/userRole", verifyToken, verifyAdmin, async (req, res) => {
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

    // user like update ------------------------------------
    app.patch("/api/likes", verifyToken, async (req, res) => {
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

    app.delete(
      "/api/favDelete/:id",
      verifyToken,
      verifyUser,
      async (req, res) => {
        const { id } = req.params;
        const query = { lessonId: new ObjectId(id) };
        const result = await favoritesCollection.deleteOne(query);
        res.send(result);
      },
    );
    app.delete(
      "/api/lessonDelete/:id",
      verifyToken,
      verifyUser,
      async (req, res) => {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const result = await lessonsCollection.deleteOne(query);
        res.send(result);
      },
    );
    app.delete(
      "/api/userDelete/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { id } = req.params;
        console.log(id);
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(query);
        res.send(result);
      },
    );

    // report Delete
    app.delete(
      "/api/reports/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };

        const reportData = await reportCollection.findOne({
          lessonId: id,
        });

        if (!reportData) {
          return res.status(404).send({
            message: "Report not found",
          });
        }
        const lessonDelete = await lessonsCollection.deleteOne({
          _id: new ObjectId(reportData.lessonId),
        });

        const reportDelete = await reportCollection.deleteOne({
          lessonId: id,
        });

        // const result = await lessonsCollection.deleteOne(query);
        res.send(lessonDelete, reportDelete);
      },
    );

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
