// import mongoose from "mongoose";
// const connectDb = async () => {
//   try {
//     // await mongoose.connect(process.env.MONGODB_URL);
//     const conn = await mongoose.connect(process.env.MONGODB_URL, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     console.log("db connected");
//   } catch (error) {
//     console.log(error);
//   }
// };
// export default connectDb;






// Config/db.js
import mongoose from "mongoose";

const connectDb = async () => {
  try {
<<<<<<< HEAD
=======
    // Simple, modern connection (no deprecated options)
>>>>>>> a7f86a05e6269c81aa63a65dc186069c50e8f632
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("db connected");
  } catch (err) {
    console.error("DB connection failed:", err);
    // Optional: stop the process so Render marks the deploy as failed
    // process.exit(1);
  }
};

export default connectDb;



