const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
  title: {          // ✅ fixed typo (was "tittle")
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending",
  },
  category: {
    type: String,
    required: true,
  },
  dueDate: {
    type: String,
    required: true,
  },
  user: {           // ✅ added user reference
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Todo = mongoose.model("Todo", todoSchema);
module.exports = Todo;