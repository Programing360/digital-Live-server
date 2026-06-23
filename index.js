const express = require("express");
const moment = require("moment");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;

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
    // await client.connect();

    const db = client.db("digital_life");
    const userCollection = db.collection("user");
    const lessonsCollection = db.collection("lessons");
    const favoritesCollection = db.collection("favorites");
    const reportCollection = db.collection("reportCollect");
    const sessionCollection = db.collection("session");
    const subscriptionCollection = db.collection("subscription");
    const commentCollection = db.collection("comments");

    // Verification Center----------------------------------------------------
    const verifyToken = async (req, res, next) => {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).send({ message: "unauthorize access" });
      }
      const token = authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).send({ message: "unauthorize access" });
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
    app.get("/api/lessons", async (req, res) => {
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
    app.get("/api/users", verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Today lesson create
    app.get("/api/newLesson", verifyToken, async (req, res) => {
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const todaysNewLessons = await lessonsCollection.countDocuments({
          createdAt: { $gte: startOfToday },
        });

        res.json({
          success: true,
          count: todaysNewLessons,
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Server error",
        });
      }
    });

    // get comment ------------------------------------------------
    // app.get("/api/comment/:userId", async (req, res) => {
    //   const { userId } = req.params;

    //   const query = { userId: userId };
    //   const result = await commentCollection.find(query).toArray();

    //   res.send(result);
    // });

    app.get("/api/comment/:userId", async (req, res) => {
      try {
        const { userId } = req.params;

        const query = { userId: userId };
        const comments = await commentCollection.find(query).toArray();

        const formattedComments = comments.map((c) => {
          return {
            ...c,
        
            formattedDate: c.createAt ? moment(c.createAt).format("hh:mm A - DD MMM YYYY") : "Just now"
          };
        });

        res.send(formattedComments);
      } catch (error) {
        res.status(500).send({ message: "Server error" });
      }
    });

    // Reported/Flagged Lessons
    app.get("/api/report", verifyToken, verifyAdmin, async (req, res) => {
      const result = await reportCollection.find().toArray();
      res.send(result);
    });

    // lesson and user Growth ---------------------------------------------
    app.get("/api/growth", verifyToken, verifyAdmin, async (req, res) => {
      const lessons = await lessonsCollection.find().toArray();

      const lessonGrowth = Array(12).fill(0);

      lessons.forEach((lesson) => {
        const month = new Date(lesson.createAt).getMonth();

        lessonGrowth[month]++;
      });

      // user Growth------------------------------------------------------
      const users = await userCollection.find().toArray();

      const userGrowth = Array(12).fill(0);

      users.forEach((user) => {
        const month = new Date(user.createdAt).getMonth();
        userGrowth[month]++;
      });

      const totalGrowth = {
        lesson: lessonGrowth,
        user: userGrowth,
      };

      res.send(totalGrowth);
    });

    // My Favorite Data

    app.get("/api/favorites/:userId", verifyToken, async (req, res) => {
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

    app.get("/api/reports", verifyToken, verifyAdmin, async (req, res) => {
      const result = await reportCollection.find().toArray();
      res.send(result);
    });

    // Featured lesson get ----------------------------------------------------
    app.get("/api/featured", async (req, res) => {
      const query = { isFeatured: true };
      const result = await lessonsCollection.find(query).toArray();
      res.send(result);
    });

    // --------------------------------------------Post Method--------------------------------------------------

    // lesson post
    app.post(
      "/api/createLessons",
      verifyToken,
      verifyUser,
      async (req, res) => {
        const lessonData = req.body;
        const newLessonData = {
          ...lessonData,

          createAt: new Date(),
        };
        const result = await lessonsCollection.insertOne(newLessonData);
        res.send(result);
      },
    );

    // Favorites Data Post
    app.post("/api/favorites/toggle", verifyToken, async (req, res) => {
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
    app.post("/api/report", verifyToken, async (req, res) => {
      const report = req.body;

      const newReport = {
        ...report,
        createAt: new Date(),
      };

      const result = await reportCollection.insertOne(newReport);

      const query = { _id: new ObjectId(report.lessonId) };

      const updateDoc = {
        $set: {
          flagged: true,
        },
      };

      const updateLesson = await lessonsCollection.updateOne(query, updateDoc);

      res.send(updateLesson);
    });

    // user Subscription Post------------------
    app.post("/api/subscription", verifyToken, async (req, res) => {
      const userData = req.body;
      const newUserData = {
        ...userData,
        createAt: new Date(),
      };

      const result = await subscriptionCollection.insertOne(newUserData);

      const query = { email: userData.email };
      const update = { $set: { isPlan: userData.plan } };

      const updateResult = await userCollection.updateOne(query, update);

      res.send(updateResult);
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

    // Comment Post of user----------------------------------------------
    app.post("/api/comment", async (req, res) => {
      const userInfo = req.body;
      const newInfo = {
        ...userInfo,
        createAt: new Date(),
      };
      console.log(newInfo);
      const result = await commentCollection.insertOne(newInfo);
      res.send(result);
    });

    // Inappropriate lesson verified---------------------------------------------------
    app.patch(
      "/api/inappropriateLessonVerified/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { id } = req.params;
        const lesson = await lessonsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (lesson.verified) {
          return res.status(404).send({
            success: true,
            message: "Lesson already verified",
          });
        }

        if (!lesson) {
          return res.status(404).send({
            success: false,
            message: "Lesson not found",
          });
        }

        if (!lesson.flagged) {
          return res.status(400).send({
            success: false,
            message: "Lesson is not verified",
          });
        }

        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            verified: true,
            flagged: false,
          },
        };

        const result = await lessonsCollection.updateOne(query, updateDoc);

        await reportCollection.deleteMany({
          lessonId: id,
        });

        res.send({
          success: true,
          deletedCount: result.modifiedCount,
          message: "Lesson verified successfully",
        });
      },
    );

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

    // Inappropriate lesson deleted---------------------------------------------------
    app.delete(
      "/api/inappropriateLessonDelete/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { id } = req.params;

        const lesson = await lessonsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!lesson) {
          return res.status(404).send({
            success: false,
            message: "Lesson not found",
          });
        }

        if (!lesson.flagged) {
          return res.status(400).send({
            success: false,
            message: "Lesson is not flagged",
          });
        }

        const result = await lessonsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        await reportCollection.deleteOne({
          lessonId: id,
        });

        res.send({
          success: true,
          deletedCount: result.deletedCount,
          message: "Lesson deleted successfully",
        });
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
    // await client.db("admin").command({ ping: 1 });
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
