require("dotenv").config();
const config = require("./config.json");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const User = require("./models/user.model");
const TravelStory = require("./models/travelStory.model");

const upload = require("./multer");
const fs = require("fs");
const path = require("path");
const {authenticateToken} = require("./utilities");
const { error } = require("console");

mongoose.connect(config.connectionString);

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// Test API
app.get("/hello", async (req, res) => {
  return res.status(200).json({ message: "hello" });
});

// Create Account
app.post("/create-account", async (req, res) => {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res
        .status(400)
        .json({ error: true, message: "All feilds are required" });
    }

    const isUser = await User.findOne({ email });
    if (isUser) {
      return res
        .status(400)
        .json({ error: true, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    await user.save();

    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "72h" }
    );

    return res.status(201).json({
      error: false,
      user: { fullName: user.fullName, email: user.email },
      accessToken,
      message: "Registration Sucessfull",
    });
});

// log in
app.post("/login", async(req, res)=>{
  const {email, password} = req.body;
  if(!email || !password){
    return res
      .status(400)
      .json({message: "Email and Password are require"});
  }
  const user = await User.findOne({email});
  if(!user){
    return res
      .status(400)
      .json({message: "User not found"});
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if(!isPasswordValid){
    return res
      .status(200)
      .json({message: "Invalid Credentials"})
  }

  const accessToken = jwt.sign(
    {userId: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "72h" }
  )
  return res
    .status(200)
    .json({
      error: false,
      message: "Login Successful",
      user: { fullName: user.fullName, email: user.email },
      accessToken
    })
});

// Get User
app.get("/get-user", authenticateToken, async(req, res)=> {
  const { userId } = req.user;
  const isUser = await User.findOne({ _id: userId });
  if( !isUser ){
    return res.sendStatus(401);
  }

  return res
    .json({
      user: isUser,
      message: " "
    });
});


// Route to handle image upload
app.post("/image-upload", upload.single("image"), async(req, res)=>{
  try{
    if(!req.file){
      return res.status(400).json({ erroe: true, message: "no image uploaded" });
    }
    const imageUrl = `http://localhost:8000/uploads/${req.file.filename}`;
    res.status(201).json({ imageUrl });
  } catch(error){
    res.status(500).json({ erroe: true, message: error.message });
  }
});

// Delete an image from the uploads folder
app.delete("/delete-image", async(req, res)=>{
  const { imageUrl } = req.query;
  if(!imageUrl){
    return res.status(400).json({ erroe: true, message: "image url parameter is required" });
  }
  try {
    // Extract the file name from the image url
    const filename =path.basename(imageUrl);
    
    // Define the file path
    const filePath = path.join(__dirname, 'uploads', filename);
    
    // Check if the file exists
    if(fs.existsSync(filePath)){
      // Delete the file from the uploads folder
      fs.unlinkSync(filePath);
      res.status(200).json({ message: "image deleted"});
    } else{
      res.status(200).json({ error: true, message: "image not found" });
    } 
  } catch (error){
    res.status(500).json({ error: true, message: error.message });
  }
});

// Serve static files from the uploads ans assets directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

// Add Your Story
app.post("/add-story", authenticateToken, async (req, res)=> {
  const {title, story, visitedLocation, imageUrl, visitedDate } = req.body;
  const { userId } = req.user;

  // validate the rquired fields
  if ( !title || !story || !visitedLocation || !imageUrl || !visitedDate ){
    return res
      .status(400)
      .json({
        error: true,
        message: "All fields are required"
      })
  }

  // const visitedDate from milisecound to Date object
  const parsedVisitedDate = new Date(parseInt(visitedDate));

  try {
    const travelStory = new TravelStory({
      title,
      story,
      visitedLocation,
      userId,
      imageUrl,
      visitedDate: parsedVisitedDate,
    });
    await travelStory.save();
    res.status(201).json({erroe: false, story: travelStory,  message: "Story Added Sucessfully..."});
  } catch (erroe){
    res.status(400).json({error: true, message: erroe.message});
  }


});

// Get All travel stories
app.get("/get-all-stories", authenticateToken, async(req, res)=> {
  const {userId} = req.user;
  try {
    const travelStories = await TravelStory.find({ userId: userId }).sort({
      isFavourite: -1,
    });  
    res.status(200).json({ stories: travelStories });
  } catch (error){
    res.status(500).json({ erroe: true, message: error.message });
  }
});


// edit the travel
app.put("/edit-story/:id", authenticateToken, async(req, res)=>{
  const {id} = req.params;
  const {title, story, visitedLocation, imageUrl, visitedDate } = req.body;
  const { userId } = req.user;


  // validate the rquired fields
  if ( !title || !story || !visitedLocation || !imageUrl || !visitedDate ){
     return res
       .status(400)
       .json({
         error: true,
         message: "All fields are required"
        });
    }
  
    // const visitedDate from milisecound to Date object
    const parsedVisitedDate = new Date(parseInt(visitedDate));

    try{
      // find the travel id and ensure it belongs to the authendicated user
      const travelStory = await TravelStory.findOne({ _id: id, userId: userId });

      if(!travelStory){
        return res.status(404).json({ message: "traveller story not found"});
      }
      const placeholderImgUrl = `http://localhost:8000/assets/img1.png`;

      travelStory.title = title;
      travelStory.story = story;
      travelStory.visitedLocation = visitedLocation;
      travelStory.imageUrl = imageUrl || placeholderImgUrl;

      await travelStory.save();
      res.status(200).json({ story: travelStory, message: "Update sucessfull" });
    } catch (error){
      res.status(500).json({ error: true, message: error.message });
    }
})

// Delete the travel
app.delete("/delete-story/:id", authenticateToken, async(req, res)=>{
  const {id} = req.params;
  const {userId} = req.user;

  try{ 
    // find the travel id and ensure it belongs to the authendicated user
    const travelStory = await TravelStory.findOne({ _id: id, userId: userId });
    if(!travelStory){
      return res.status(404).json({ message: "traveller story not found"});
    }
    // Delete the story from the DB
    await travelStory.deleteOne({ _id: id, userId: userId });

    // Extract the file name from the imageUrl
    const imageUrl = travelStory.imageUrl;
    const filename =path.basename(imageUrl);

    // Define the file path
    const filePath = path.join(__dirname, 'uploads', filename);

    // Delete the image from the uploads folder
    fs.unlink(filePath, (err) => {
      if(err){
        console.log("faild to delete image:", err);
      }
    });

    res.status(200).json({ error: false, message: "Story deleted sucessfully."});
  } catch (error){
    res.status(500).json({ error: true, message: error.message });
  }
});


// updaye is favourite

app.put("/update-isFavourite/:id", authenticateToken, async(req, res)=>{
  const {id} = req.params;
  const {isFavourite} = req.body;
  const {userId} = req.user;

  try{
    const travelStory = await TravelStory.findOne( {_id: id, userId: userId });

    if(!travelStory){
      return res.status(404).json({ error: true, message: "Travel story not found!" });
    }
    travelStory.isFavourite = isFavourite;

    await travelStory.save();
    res.status(200).json({story: travelStory, message: "Update sucessfully" });


  }catch (error){
    res.status(500).json({ error: true, message: error.message });
  }
})

// search travel stories
app.get("/search", authenticateToken, async(req, res)=>{
  const { query } = req.query;
  const { userId } = req.user;

  if(!query){
    return res.status(404).json({ error: true, message: "query is required!" });
  }
  try{
    const searchResults = await TravelStory.find({
      userId: userId,
      $or: [
        { title: {$regex: query, $options: "i"} },
        { story: {$regex: query, $options: "i"} },
        { visitedLocation: { $regex: query, $options: "i"} }
      ],
    }).sort({ isFavourite: -1 });
    res.status(200).json({stories: searchResults})
  } catch(error){
    res.status(500).json({ message: error.message });
  }
});

// Filter travel stories by date range
app.get("/travel-stories/filter", authenticateToken, async(req, res)=>{

  const { startDate, endDate } = req.query;
  const { userId } = req.user;

  try{
    const filterStories = await TravelStory.find({
      userId: userId,
      visitedDate: { $gte: startDate, $lte: endDate },
    }).sort({ isFavourite: -1 });
    res.status(200).json({ stories: filterStories })
  } catch(error){
    res.status(500).json({ message: error.message });
  }

})

// Get all users - test
app.get("/get-all-users", async(req, res)=> {
  const getAllUsers = await User.find();
  res.json({getAllUsers});
});

// Define the port
const PORT = 8000; // You can change this to any available port
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
