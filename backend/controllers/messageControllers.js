const { text } = require("express");

//mock database
let messages = [
    {
        id: 1,
        text: "Hello Welcome to the real chat App with HBPA",
        user: "Prem",
        timestamp: new Date().toISOString(),
    },
    {
        id: 2,
        text: "Hello Welcome to the real chat App with HBPA",
        user: "HBPA",
        timestamp: new Date().toISOString(),
    },
];


//Get the Messages
const getMessages = (req, res) => {
    try {
        res.json({
            success: true,
            count: messages.length,
            data: messages
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        })

    }
}

//Post the messages
const createMessages = (req, res) => {
    try {
        const { text, user } = req.body;

        //validation
        if (!text || !user) {
            return res.status(400).json({
                success: false,
                message: 'Please Provide the Message'
            })
        }
        //if Validation is given here
        const newMessage = {
            id: messages.length + 1,
            text,
            user,
            type: req.body.type || 'text',
            voice: req.body.voice || null,
            image: req.body.image || null,
            avatar: req.body.avatar || null,
            status: 'sent',
            timestamp: new Date().toISOString()
        };
        messages.push(newMessage);
        res.status(201).json({
            success: true,
            message: "Message Created",
            data: newMessage
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        })

    }
}
//Delete Messages
const deleteAllMessages = (req, res) => {
    try {
        messages = [];
        res.json({
            success: true,
            message: 'All Messages are Deleted'
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        })
    }
}
//Adding newmessages like dynamic
const addMessage = (messageData) => {
    const newMessage = {
        id: messages.length + 1,
        text: messageData.text,
        user: messageData.user,
        type: messageData.type || 'text',
        voice: messageData.voice || null,
        image: messageData.image || null,
        avatar: messageData.avatar || null,
        status: 'sent',
        timestamp: new Date().toISOString()
    }
    messages.push(newMessage);
    return newMessage;
}

const updateMessageStatus = (id, status) => {
    const message = messages.find(m => m.id === id);
    if (message) {
        message.status = status;
        return message;
    }
    return null;
}

module.exports = {
    getMessages,
    createMessages,
    deleteAllMessages,
    addMessage,
    updateMessageStatus
}