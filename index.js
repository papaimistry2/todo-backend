const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const app = express();
const port = 3000;
const cors = require("cors");
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const moment = require("moment");

mongoose
  .connect("mongodb+srv://papai:papai@cluster0.irzluxu.mongodb.net/")
  .then(() => {
    console.log("Connected To MongoDB");
  })
  .catch((error) => {
    console.log("Error", error);
  });

app.listen(port, "0.0.0.0", () => {
  console.log("Server Is Running On Port 3000.");
});

const User = require("./models/user");
const Todo = require("./models/todo");

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log("REGISTER HIT");
    console.log(req.body);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const newUser = new User({
      name,
      email,
      password,
    });

    await newUser.save();
    res.status(202).json({ message: "User registation successfull" });
  } catch (error) {
    console.log("Error registring the user", error);
    res.status(500).json({ message: "Registation Faild" });
  }
});

const secretKey = "mysecretkey123";

console.log(secretKey);

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid Email" });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ userId: user._id }, secretKey);

    return res.status(200).json({
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.log("Login failed", error);
    res.status(500).json({ message: "Login failed" });
  }
});
app.get("/protected", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).send();

    const decoded = jwt.verify(token, "mysecretkey123");

    const user = await User.findOne({ _id: decoded.userId });

    // 🔥 STRICT CHECK
    if (!user || user === null) {
      console.log("USER NOT FOUND");
      return res.status(401).send();
    }

    console.log("USER VALID");
    res.status(200).send();
  } catch (err) {
    console.log("ERROR:", err.message);
    res.status(401).send();
  }
});

// ✅ POST - add a todo
app.post("/todos", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, secretKey);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const { title, category } = req.body;

    const newTodo = new Todo({
      title, // ✅ fixed typo
      category,
      user: user._id, // ✅ link todo to user
      dueDate: moment().format("YYYY-MM-DD"),
    });

    await newTodo.save();

    user.todos.push(newTodo._id);
    await user.save();

    res.status(200).json({ message: "Todo added", todo: newTodo });
  } catch (err) {
    console.log("Todo error:", err.message);
    res.status(401).json({ message: "Unauthorized" });
  }
});

// ✅ GET - fetch only THIS user's todos
app.get("/todos", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, secretKey);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const todos = await Todo.find({ user: user._id }); // ✅ only this user's todos

    res.status(200).json({ todos });
  } catch (err) {
    console.log("Fetch todos error:", err.message);
    res.status(401).json({ message: "Unauthorized" });
  }
});

app.patch("/todos/:todoId/complete", async (req, res) => {
  try {
    const todoId = req.params.todoId;
    const updatedTodo = await Todo.findByIdAndUpdate(
      todoId,
      {
        status: "completed",
      },
      { new: true },
    );
    if(!updatedTodo){
      return res.status(404).json({error:"Todo not found"})
    }
    res.status(202).json({message:"Todo marked as completed",todo:updatedTodo})
  } catch (error) {
    res.status(500).json({ error: "Wrong" });
  }
});


// Fix in api/index.js
app.get("/todos/completed/:date", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, secretKey);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const date = req.params.date;

    const completedTodos = await Todo.find({
      user: user._id, // ✅ only this user's todos
      status: "completed",
      createdAt: {
        $gte: new Date(`${date}T00:00:00.000Z`),
        $lt: new Date(`${date}T23:59:59.999Z`),
      },
    });

    res.status(200).json({ completedTodos });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/todos/count/:date", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, secretKey);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const date = req.params.date;

    const totalCompletedTodos = await Todo.countDocuments({
      user: user._id,
      status: "completed",
      createdAt: {
        $gte: new Date(`${date}T00:00:00.000Z`),
        $lt: new Date(`${date}T23:59:59.999Z`),
      },
    });

    const totalPendingTodos = await Todo.countDocuments({
      user: user._id,
      status: "pending",
      createdAt: {
        $gte: new Date(`${date}T00:00:00.000Z`),
        $lt: new Date(`${date}T23:59:59.999Z`),
      },
    });

    res.status(200).json({ totalCompletedTodos, totalPendingTodos });
  } catch (error) {
    res.status(500).json({ error: "Network error" });
  }
});



app.get("/user/:userId", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    jwt.verify(token, secretKey);

    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (err) {
    res.status(401).json({ message: "Unauthorized" });
  }
});