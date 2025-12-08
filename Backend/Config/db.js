import mongoose from "mongoose";
const connectDb = async () => {
  try {
    // await mongoose.connect(process.env.MONGODB_URL);
    const conn = await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("db connected");
  } catch (error) {
    console.log(error);
  }
};
export default connectDb;


