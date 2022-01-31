const express = require('express')
var cors = require('cors')
require('dotenv').config()
const { MongoClient } = require('mongodb');
var admin = require("firebase-admin");
const app = express()
const port =process.env.PORT || 9000
app.use(cors())
app.use(express.json())
var serviceAccount = require("./doctor-portal-726bb-firebase-adminsdk-oza6p-c8790f2766.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3nf9m.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
async function verifyToken(req,res,next){
  if(req.headers?.authorization?.startsWith('Bearer ')){
       const token=req.headers.authorization.split(' ')[1]
       console.log(token);
       try{
          const decodedUser=await admin.auth().verifyIdToken(token)
          req.decodedEmail=decodedUser.email
       }
       catch{
         
       }
  }
  next()
}
async function run() {
    try {
      await client.connect();
      const database = client.db("doctor-portal");
      const appointment = database.collection("appointment");
      const userCollection = database.collection("Users");
     app.post('/appointments',async(req,res)=>{
      const appointments=req.body
      const result = await appointment.insertOne(appointments)
      res.json(result)
  })
      app.get('/appointments',verifyToken,async(req,res)=>{
        const email=req.query.email
        const date=new Date(req.query.date).toLocaleDateString()
        const query={email:email,date:date}
        console.log(query);
          const cursor =  appointment.find(query);
          const service=await cursor.toArray()
        res.json(service)
      })
      
      // app.put('/users/:id',async(req,res)=>{
        
      // })
      
      // app.delete('/users/:id',async(req,res)=>{
        
      // })
      app.post('/users',async(req,res)=>{
        const users=req.body
        console.log(users);
        const result = await userCollection.insertOne(users)
        res.json(result)
    })
    app.put('/users',async(req,res)=>{
        const user=req.body
        const filter={email:user.email}
        const option= {upsert:true}
        const updateDoc = {
          $set:user
        };
        const result = await userCollection.updateOne(filter, updateDoc, option);
        res.json(result)
             })
    app.put('/users/admin',verifyToken,async(req,res)=>{
        const user=req.body
        const requester=req.decodedEmail
              if(requester){
                const requesterAccount=await userCollection.findOne({email:requester})
                if(requesterAccount?.role=="admin"){
                  const filter={email:user.email}
                  const updateDoc = {
                    $set:{role:'admin'}
                  };
                  const result = await userCollection.updateOne(filter, updateDoc);
                  res.json(result)
                }
                else{
                  res.status(403).json({message:'you do not have to access admin'})
                }
              }
        
      
             })
             app.get('/users/:email',async(req,res)=>{
              const email=req.params.email
              const query={email:email}
              const cursor = await userCollection.findOne(query);
              let isAdmin=false
              if(cursor?.role=="admin"){
                isAdmin=true
              }
              res.json({admin:isAdmin})
            })
    } finally {
    //   await client.close();
    }
  }
  run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello Doctors Portal')
})

app.listen(port, () => {
  console.log(`listening on port ${port}`)
})