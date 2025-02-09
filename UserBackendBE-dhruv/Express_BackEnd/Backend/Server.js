const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config()
const nodemailer = require('nodemailer');
const User = require('./User');


const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

mongoose.connect(process.env.MongoDBConnectionStr, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', (error) => {
  console.error('MongoDB Connection Error:', error);
});
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASS,
  },
});

function generateVerificationCode() {
  const min = 100000;
  const max = 999999;
  return Math.floor(Math.random() * (max - min + 1)) + min; 
}

app.post('/api/send-verification-email', async (req, res) => {
  var { id } = req.body;
  var { fp } = req.body;
  const verificationCode = generateVerificationCode();
  try {
    // Check if a user with the provided email already exists
    console.log("id: ",id)
    console.log("fp: ",fp)
    const existingUser = await User.findOne({ "email": id });
    console.log("existing user:", existingUser)
    
    if (existingUser != null && fp == "New") {
      return res.status(400).json({ message: `${id} already registered.`});
    }
    else if(existingUser == null){
      console.log("this is the new user")
      await transporter.sendMail({
        from: 'beachevents01@gmail.com',
        to: id,
        subject: 'Email Verification',
        text: `Your verification code is: ${verificationCode}`,
      });
      res.status(200).json({ message:  verificationCode});
      return null;
    }
    else if (existingUser.isVerified === true){
      await transporter.sendMail({
        from: 'beachevents01@gmail.com',
        to: id,
        subject: 'Email Verification',
        text: `Your verification code is: ${verificationCode}`,
      });
      res.status(200).json({ message:  verificationCode});
      return null;
    }
    if (existingUser) {
      return res.status(400).json({ message: `${id} already registered.`});
    }
    else{
      await transporter.sendMail({
        from: 'beachevents01@gmail.com',
        to: id,
        subject: 'Email Verification',
        text: `Your verification code is: ${verificationCode}`,
      });
  
      res.status(200).json({ message:  verificationCode});
    }
  } catch (error) {
    console.error('Sending verification email failed:', error);
    res.status(500).json({ message: 'Sending verification email failed.' });
  }

res.status(200).json({ message:  verificationCode});

});




app.post('/api/changePassword', async (req, res) => {
  const { id, password } = req.body;
  
  try {
    // Check if the email matches the required domain
    // console.log(id)
    // console.log(password)
    const user = await User.findOne({ "email": id });
    if (password) {
      user.password = password;
      user.isVerified = true;
      await user.save();
      res.status(200).json({ message: 'Password reset successful.' });
    } else {
      res.status(400).json({ message: 'Password reset unsuccesful' });
    }
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).send({ message: 'Password reset failed.' });
  }
});

app.post('/api/register', async (req, res) => {
  const { id, password} = req.body;
  console.log("Email: ", id)
  console.log("Password: ",  password)

  try {
    // Check if the email is already registered
    const user = await User.findOne({ 'email': id });
    console.log("This is the user in DB: ", user)
    if (user) {
      return res.status(400).json({ message: `${id} Already Existes` });
    }
    else {
      const user = new User({
        email: id,
        password: password,
        isVerified: true
      })
   
      User.collection.insertOne(user)
      res.status(200).json({ message: 'Registration successful.' });
    }
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).send({ message: 'Registration failed.' });
  }
});

// New API endpoint for user authentication
app.post('/api/authenticate', async (req, res) => {
  const { id } = req.body;
  console.log(id)
  try {
    const user = await User.findOne({ 'email': id });
    if (!user.email){
      return res.status(400).json({ message: 'Email not found Blah Blah.'});
    }
    

    if (!user) {
      return res.status(400).json({ message: 'Email not found.'});
    }

    if (!user.isVerified) {
      return res.status(400).json({ message: 'Email not verified. Please check your email for a verification code.' });
    }
    res.status(200).json({ pass: user.password });
  } catch (error) {
    console.log("Did not make User")
    console.error('Authentication failed:', error);
    res.status(500).json({ message: 'User not found!' });
  }
});

app.post('/api/pinevent', async (req, res) =>{
  const {id , event} = req.body
  console.log(event)
  try{
    const user = await User.findOne({ 'email': id })
    if (user){
      console.log("This is an array ", user.Pinned)
      const arr = user.Pinned
      const eventString = JSON.stringify(event)
      console.log("1: debug")
      console.log('MongoDB Arr Before:', user.Pinned)
      const foundEvent = arr.find((element) => {
        const a = JSON.stringify(element) 
        console.log("ELEMENT: ", a)
        console.log("event: ", eventString)
        if(a == eventString){
          console.log("2: debug")
          console.log('MongoDB Arr After:', user.Pinned)
          return true
        }
      })
      if(foundEvent){
        return res.status(200).json({ message: 'Already Pinned' })
      }
      else{
        arr.push(event)
        await User.updateOne({'email': id}, {'Pinned': arr})
        console.log('MongoDB Arr  After: ', user.Pinned)
        return res.status(200).json({ message: 'Event Pinned Successfully' }) 
      }
    }
    else{
        return res.status(404).json({message:"User Not Found"})
    }
  }
  catch(err){
      return res.status(500).json({message: "Error Pinning the Event !"})
    }
    
});

app.post('/api/subscribe', async (req, res) =>{
  const {id , org} = req.body
  console.log(id)
  console.log(org)
  try{
    const user = await User.findOne({ 'email': id })
    if (user){
      console.log("This is an array ", user.Subscribed)
      const arr = user.Subscribed
      console.log("1: debug")
      console.log('MongoDB Arr Before:', user.Subscribed)
      const foundEvent = arr.find((element) => {
        console.log("ELEMENT: ",element)
        console.log("event: ", eventString)
        if(element == org){
          console.log("2: debug")
          console.log('MongoDB Arr After:', user.Subscribed)
          return true
        }
      })
      if(foundEvent){
        return res.status(200).json({ message: 'Already Subscribed' })
      }
      else{
        arr.push(org)
        await User.updateOne({'email': id}, {'Subscribed': arr})
        console.log('MongoDB Arr  After: ', user.Subscribed)
        return res.status(200).json({ message: 'Organization subscribed' }) 
      }
    }
    else{
        return res.status(404).json({message:"User Not Found"})
    }
  }
  catch(err){
      return res.status(500).json({message: "Error subscribing to the organization!"})
    }
    
});

app.delete('/api/unpin', async (req,res)=>{
  const {id , event} = req.body
  console.log(id)
  try{
    const user = await User.findOne({'email': id});
    console.log("Inside Unpin :", user)
    if(user){
      const arr = user.Pinned
      console.log("before Unpin :", arr)
      const eventString = JSON.stringify(event)
      const foundEvent = arr.find((element) => {
          const a = JSON.stringify(element) 
          console.log("ELEMENT: ", a)
          // console.log("event: ", eventString)
          if(a == eventString){
            console.log("Found String")
            return true
          }
      })
      if(foundEvent){
        const index = arr.findIndex(element => element.id == event.id)
        arr.splice(index, 1)
        await User.updateOne({'email': id}, {'Pinned': arr})
        console.log("After Unpin: ",arr)
        return res.status(200).json({ message: 'Unpinned the event!' })
      }

    }
    else{
      console.log("User Not Found")
      return res.status(404).json({message:"User Not Found"})
    }
  }catch(err){
    console.log("Error")
    return res.status(500).json({message: "Error Un-pinning the Event!"})
  }

})


app.delete('/api/unsubscribe', async (req,res)=>{
  const {id , org} = req.body
  console.log(id)
  try{
    const user = await User.findOne({'email': id});
    console.log("Inside unsubscribe :", user)
    if(user){
      const arr = user.Subscribed
      console.log("before Unpin :", arr)
      // const eventString = JSON.stringify
      const foundEvent = arr.find((element) => {
          // const a = JSON.stringify(element) 
          // console.log("ELEMENT: ", a)
          // console.log("event: ", eventString)
          if(element == org){
            console.log("Found String")
            return true
          }
      })
      if(foundEvent){
        const index = arr.findIndex(element => element == org )
        arr.splice(index, 1)
        await User.updateOne({'email': id}, {'Subscribed': arr})
        console.log("After Unpin: ",arr)
        return res.status(200).json({ message: `Unsubscribed!` })
      }
    }
    else{
      console.log("User Not Found")
      return res.status(404).json({message:"User Not Found"})
    }
  }catch(err){
    console.log("Error")
    return res.status(500).json({message: "Error Unsubscribing the Org!"})
  }
})






// <<<<<<< HEAD


// FOR HOME
// app.listen(port, '192.168.254.11', () => {
//   console.log(`Server is running on http://192.168.254.11:${port}`);
// });

// FOR SCHOOL




app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});







