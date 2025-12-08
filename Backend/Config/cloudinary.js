// import { v2 as cloudinary } from "cloudinary";
// import fs from "fs";
// const uploadOnCloudinary = async (filePath) => {
//   cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_NAME,
//     api_secret: process.env.CLOUDINARY_API_SECRET,
//   });
//   try {
//     const uploadResult = await cloudinary.uploader.upload(filePath);
//     fs.unlinkSync(filePath);
//     return uploadResult.secure_url;
//   } catch (error) {
//     fs.unlinkSync(filePath);
//     return res.status(500).json({ message: "cloudinary error" });
//   }
// };
// export default uploadOnCloudinary;





import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const uploadOnCloudinary = async (filePath) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_NAME,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    const uploadResult = await cloudinary.uploader.upload(filePath);

    // Remove file from local storage after successful upload
    fs.unlinkSync(filePath);

    // Return the secure URL of the uploaded image
    return uploadResult.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    // Try to delete the local file if it exists
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      // ignore if file already removed / doesn't exist
    }

    // Let the caller (controller) handle the error
    throw new Error("Cloudinary upload failed");
  }
};

export default uploadOnCloudinary;
