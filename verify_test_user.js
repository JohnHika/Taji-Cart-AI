const mongoose = require('mongoose');
require('dotenv').config({path:'server/.env'});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const result = await mongoose.connection.db.collection('users').updateOne(
    {email:'testuser@gmail.com'},
    {$set: {verify_email: true}}
  );
  console.log('Updated:', result.modifiedCount);
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
