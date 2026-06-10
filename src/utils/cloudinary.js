import {v2 as cloudinary} from "cloudinary"
import fs from "fs"




cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});

const uploadonCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        //file has been uploaded successfully
        console.log("File is Uploaded on cloudinary", response.url)
        return response;
    } catch (error) {
        //remove the locally saved temporary file as the upload op got failed
        fs.unlinkSync(localFilePath);
        return null;
    }
}


export {uploadonCloudinary}