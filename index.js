const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB connection
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.62t6y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Function to establish a new connection when needed
async function connectDB() {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
      console.log("Connected to MongoDB!");
    }
    return client.db("tasktide");
  } catch (error) {
    console.error("Database connection failed:", error);
  }
}

// User Related API
app.post("/users", async (req, res) => {
  try {
    const db = await connectDB();
    const userCollection = db.collection("users");

    const user = req.body;
    const existingUser = await userCollection.findOne({ email: user.email });
    if (existingUser) {
      return res.send({ message: "User already exists", insertedId: null });
    }
    const result = await userCollection.insertOne(user);
    res.send(result);
  } catch (error) {
    console.error("Error in /users:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Fetch all users
app.get("/users", async (req, res) => {
  try {
    const db = await connectDB();
    const users = await db.collection("users").find().toArray();
    res.json(users);
  } catch (error) {
    console.error("Error in /users:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Task Related API
app.post("/tasks", async (req, res) => {
  try {
    const db = await connectDB();
    const taskCollection = db.collection("tasks");

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

    const result = await taskCollection.insertOne(task);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error in /tasks:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Fetch tasks by user email
app.get("/tasks/user/:email", async (req, res) => {
  try {
    const db = await connectDB();
    const taskCollection = db.collection("tasks");

    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const tasks = await taskCollection.find({ email }).toArray();
    res.status(200).json({ tasks });
  } catch (error) {
    console.error("Error in /tasks/user/:email:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Update task
app.put("/tasks/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const taskCollection = db.collection("tasks");

    const { id } = req.params;
    const updatedTask = req.body;

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
    console.error("Error in /tasks/:id:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Delete task
app.delete("/tasks/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const taskCollection = db.collection("tasks");

    const { id } = req.params;

    const result = await taskCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount > 0) {
      res.json({ message: "Task deleted successfully" });
    } else {
      res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    console.error("Error in /tasks/:id:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

// Start Server
app.get("/", (req, res) => {
  res.send("Server is Running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
