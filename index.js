const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const socketIo = require("socket.io");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.62t6y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Initialize Socket.IO for real-time communication
const server = require("http").createServer(app);
const io = socketIo(server);

// Initialize Database
async function run() {
  try {
    await client.connect(); // Ensure MongoDB connection
    console.log("Connected to MongoDB!");

    // MongoDB database and collections
    const db = client.db("tasktide");
    const userCollection = db.collection("users");
    const taskCollection = db.collection("tasks");

    // MongoDB Change Stream for tasks
    const taskChangeStream = taskCollection.watch();

    // Emit real-time updates to frontend when a task is added
    taskChangeStream.on("change", (change) => {
      if (change.operationType === "insert") {
        io.emit("taskAdded", change.fullDocument);
      }
    });

    // User Related API
    // Store new user in the database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ email: user.email });

      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      const result = await userCollection.insertOne(user);
      res.status(201).json(result);
    });

    // Fetch all users
    app.get("/users", async (req, res) => {
      try {
        const users = await userCollection.find().toArray();
        res.status(200).json(users);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Task Related API
    // Create a new task
    app.post("/tasks", async (req, res) => {
      const { title, description, category, email } = req.body;

      if (!title || title.length > 50) {
        return res.status(400).json({ message: "Invalid task title" });
      }

      const task = {
        title,
        description,
        category,
        email,
        timestamp: new Date(),
      };

      try {
        const result = await taskCollection.insertOne(task);
        res.status(201).json(result);
      } catch (error) {
        console.error("Error saving task:", error);
        res.status(500).json({ message: "Error saving task" });
      }
    });

    // Fetch tasks by user email
    app.get("/tasks/user/:email", async (req, res) => {
      const { email } = req.params;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      try {
        const tasks = await taskCollection.find({ email }).toArray();
        res.status(200).json({ tasks });
      } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ message: "Error fetching tasks" });
      }
    });

    // Update task category or details
    app.put("/tasks/:id", async (req, res) => {
      const { id } = req.params;
      const updatedTask = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      try {
        const result = await taskCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedTask }
        );

        if (result.matchedCount > 0) {
          res.json({ message: "Task updated successfully" });
        } else {
          res.status(404).json({ message: "Task not found" });
        }
      } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Error updating task" });
      }
    });

    // Delete task
    app.delete("/tasks/:id", async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      try {
        const result = await taskCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount > 0) {
          res.json({ message: "Task deleted successfully" });
        } else {
          res.status(404).json({ message: "Task not found" });
        }
      } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ message: "Error deleting task" });
      }
    });

    // Handle server close to properly disconnect from MongoDB
    process.on("SIGINT", async () => {
      await client.close();
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  } catch (error) {
    console.error("Error connecting to database:", error);
  }
}

run().catch(console.dir);

// Start Server
app.get("/", (req, res) => {
  res.send("Server is Running");
});

// Start the HTTP server with Socket.IO
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
