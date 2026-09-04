import User from "../models/User.js";
import Message from "../models/Message.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId } from "../lib/socket.js";





export const getAllContacts = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const filteredUsers=await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.log("Error in getAllContacts:", error);
        res.status(500).json({ message: "Internal server error" }); 
    }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    // Mark all unread messages from this sender as read
    await Message.updateMany(
      { senderId: userToChatId, receiverId: myId, isRead: false },
      { $set: { isRead: true } }
    );

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 }); // Sort messages in ascending order by creation time

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessageById:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

 export const sendMessage = async(req, res) => {
    try {
        const { text,image}=req.body;
        const {id:receiverId}=req.params;
        const senderId=req.user.id;

        if (!text && !image) {
      return res.status(400).json({ message: "Text or image is required." });
    }
    if (senderId.toString()===receiverId.toString()) {
      return res.status(400).json({ message: "Cannot send messages to yourself." });
    }
    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }
     // PRIVACY SHIELD: Verify users are friends before sending messages
    const sender = await User.findById(senderId);
    const isFriend = sender?.friends?.some(
      (friendId) => friendId.toString() === receiverId.toString()
    );
    if (!isFriend) {
      return res.status(403).json({
        message: "You must be friends to send messages to this user.",
      });
    }
        
        let imageUrl;
        if(image){
            const uploadResponse=await cloudinary.uploader.upload(image);
            imageUrl=uploadResponse.secure_url;
        }
        const newMessage= new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl
        });

        await newMessage.save();

        const reciverSocketId = getReceiverSocketId(receiverId);
        if (reciverSocketId) {
            io.to(reciverSocketId).emit("newMessage", newMessage);
        }


        
        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in sendMessage:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getChatPartners = async(req, res) => {
    try {
        const loggedInUserId=req.user.id;
        const messages=await Message.find({
            $or:[
                {senderId:loggedInUserId},
                {receiverId:loggedInUserId}
            ]
        });

        const chatPartnerIds= [
            ...new Set(
                messages.map((msg) => 
                    msg.senderId.toString() === loggedInUserId.toString()
                 ? msg.receiverId.toString() 
                 : msg.senderId.toString()
                )
            ),
        ];

        const chatPartners=await User.find({_id:{$in:chatPartnerIds}}).select("-password");
        const partnersWithUnread = await Promise.all(
      chatPartners.map(async (partner) => {
        const unreadCount = await Message.countDocuments({
          senderId: partner._id,
          receiverId: loggedInUserId,
          isRead: false,
        });
        return {
          ...partner.toObject(),
          unreadCount,
        };
      })
    );
        res.status(200).json(chatPartners);
        
    } catch (error) {
        console.log("Error in getChatPartners:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

