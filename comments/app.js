const express = require("express")
const bodyParser = require("body-parser")
const { v4: uuid } = require("uuid")
const cors = require("cors")
const axios = require("axios")

const app = express()
app.use(bodyParser.json())
app.use(cors())

const commentsByPostId = {}

app.get("/posts/:id/comments", (req, res) => {
  res.send(commentsByPostId[req.params.id] || [])
})

app.post("/posts/:id/comments", async (req, res) => {
  const commentId = uuid()
  const { content } = req.body

  const comments = commentsByPostId[req.params.id] || []

  comments.push({ commentId, content, status: "pending" })
  commentsByPostId[req.params.id] = comments

  await axios.post("http://event-bus-srv:4005/events", {
    type: "CommentCreated",
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: "pending"
    }
  })
  res.status(201).send(commentsByPostId)
})

app.post("/events", async (req, res) => {
  console.log("Received Event", req.body.type)

  const { type, data } = req.body

  if (type === "CommentModerated") {
    const { id, content, postId, status } = data
    const comments = commentsByPostId[postId]

    const comment = comments.find(comment => comment.commentId === id)

    comment.status = status

    await axios.post("http://event-bus-srv:4005/events", {
      type: "CommentUpdated",
      data: {
        id,
        content,
        postId,
        status
      }
    })
  }

  res.send({})
})

app.listen(4001, () => {
  console.log("Comments Service running on PORT 4001")
})