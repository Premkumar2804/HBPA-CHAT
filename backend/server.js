const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const { addMessage, updateMessageStatus } = require('./controllers/messageControllers');
const { Socket } = require('net');

//dotenv    in our server,js
dotenv.config();


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
const PORT = process.env.PORT || 5000;


//Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

//rout in the server file
app.use("/api/messages", require("./routes/messagesRoutes"));

//Route 
app.get("/", (req, res) => {
    res.send({
        message: "Chat API Server",
        version: '2.0.0',
        endpoints: {
            getMessages: "GET /api/messages",
            createMessage: "POST /api/messages",
            deleteMessages: "DELETE /api/messages",
            testClient: "GET /index.html",
        },
    });
});

//socket connection in backend here
io.on('connection', (socket) => {
    console.log("user socket id is:", socket.id);

    // Send welcome message to connected user
    socket.emit("message", {
        user: "System",
        text: "Hello Welcome to the chat App with HBPA",
        timestamp: new Date().toISOString(),
    })

    // Notify others that new user joined
    socket.broadcast.emit("message", {
        user: "System",
        text: "A new user has joined in the chat",
        timestamp: new Date().toISOString(),
    });
    //  typing event bk
    socket.on("typing", (data) => {
        socket.broadcast.emit("userTyping", data);
    });
    //send and receive funn
    socket.on("sendMessage", (data) => {
        const newMessage = addMessage(data);

        io.emit('receiveMessage', newMessage);
    });

    socket.on("markAsSeen", (messageId) => {
        const updatedMessage = updateMessageStatus(messageId, 'seen');
        if (updatedMessage) {
            io.emit('messageStatusUpdate', { id: messageId, status: 'seen' });
        }
    });

    /// disconnect function
    socket.on('disconnect', () => {
        console.log("User Disconnected", socket.id);
        io.emit('message', {
            user: "System",
            text: "User Left From the Chat",
            timestamp: new Date().toISOString(),
        })
    })



});

// 404 Not Found Middleware
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Route Not Found'
    })
})


app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something Went Wrong, Please try again',
        error: err.message
    })
})

server.listen(PORT, () => {
    console.log(`Server is running at port No: ${PORT} `)
})