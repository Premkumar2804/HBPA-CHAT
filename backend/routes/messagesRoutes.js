const express=require('express');

const router=express.Router();

const{
    getMessages,
    createMessages,
    deleteAllMessages

}=require('../controllers/messageControllers')

//get all Messages through router
router.get('/',getMessages);

//Post Messages
router.post('/', createMessages);

//Delete Messages
router.delete('/',deleteAllMessages);

module.exports=router;