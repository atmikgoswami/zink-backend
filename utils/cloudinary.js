const { v2 } = require("cloudinary");
const fs = require("fs");
const ApiError = require("./ApiError");
cloudinary = v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      asset_folder: "mern",
    });
    // file has been uploaded successfully
    console.log("file is uploaded on cloudinary ", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;

    const result = await cloudinary.uploader.destroy(publicId);

    console.log("file deleted from cloudinary successfully");
    return result;
  } catch (error) {
    throw new ApiError(500, `Cloudinary delete error: ${error.message}`);
  }
};

module.exports = {
  uploadOnCloudinary,
  deleteFromCloudinary,
};
