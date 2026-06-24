import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    const pipeline = [] // mongodb agg. pipeline array

    //filter by owner if user id is provided
    if(userId) {
        if(!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid User ID")
        }
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        })
    }

    //full text search on title if query is provided
    if(query) {
        pipeline.push({
            $match: {
                title: {$regex: query, $options: "i"}
            }
        })
    }

    //only published videos

    pipeline.push({
        $match: {
            isPublished: true
        }
    })

    //lookup owner details

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [{
                    $project: {
                        username: 1,
                        avatar: 1,
                        fullName: 1
                    }
                }]
            }
        }, 
        {$unwind: "$owner"} // flattens the array
    )

    //sort
    pipeline.push({
        $sort: {
            [sortBy]: sortType === "asc" ? 1 : -1 //1 for asc, -1 for desc
        }
    })

    //paginate using user plugin
    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    }

    const videos = await Video.aggregatePaginate(Video.aggregate(pipeline), options)

    return res
           .status(200)
           .json(new ApiResponse(200, videos, "Videos Fetched Successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    
    if(!title.trim() || !description.trim()) {
        throw new ApiError(400, "Title and Description are Needed");
    }

    //get local paths from multer
    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if(!videoFileLocalPath) throw new ApiError(400, "Video File is Required");
    if(!thumbnailLocalPath) throw new ApiError(400, "Thumbnail is Required")

    //upload both on cloudinary
    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!videoFile) throw new ApiError(500, "Failed to Upload Video")
    if(!thumbnail) throw new ApiError(500, "Failed to Upload Thumbnail");

    //create a video doc in db

    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        videoPublicId: videoFile.public_id,
        thumbnail: thumbnail.url,
        thumbnailPublicId: thumbnail.public_id,
        duration: videoFile.duration, // from cloudinary
        owner: req.user._id,
        isPublished: true
    })

    return res
    .status(201)
    .json(new ApiResponse(201, video, "Video Published Successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if(!isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video ID")
    
    //run aggregate pipeline
    const video = await Video.aggregate([
        //match vdo doc with given _id
       {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
       },
       //join with "users" to get owner details
       {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            fullName: 1
                        }
                    }
                ]
            }
       },
       //turn owner arr into single obj
       {
            $unwind: "$owner"
       },
       //add a computed field isOwner
       {
            $addFields: {
                // true if logged-in user is the owner of the video
                isOwner: { $eq: ["$owner._id", req.user._id] }
            }
       }
    ])

    //no video found
    if(!video.length) 
        throw new ApiError(404, "Video Not Found");
    //increament view cnt
    await Video.findByIdAndUpdate(
        videoId,
        {
            $inc: {
                view : 1 // cnt +=1 
            }
        }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video fetched successfully"))
    
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body

    if(!isValidObjectId(videoId)) 
        throw new ApiError(400, "Invalid Video ID")
    
    const video = await Video.findById(videoId);
    if(!video) 
        throw new ApiError(404, "Video Not Found")
    if(video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this video")
    }

    const thumbnailLocalPath = req.file?.path
    let thumbnailUrl = video.thumbnail //keeping the old one by default

    if(thumbnailLocalPath) {
        await deleteFromCloudinary(video.thumbnailPublicId, "image")
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        if(!thumbnail) 
            throw new ApiError(500, "Failed to Upload Thumbnail")
        thumbnailUrl = thumbnail.url
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: title || video.title,
                description: description || video.description,
                thumbnail: thumbnailUrl,
                thumbnailPublicId: thumbnailLocalPath ? thumbnail.public_id : video.thumbnailPublicId
            }
        }, 
        {
            new: true
        }
    )
    return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId))
        throw new ApiError(400, "Invalid Video ID")
    const video = await Video.findById(videoId);
    if(!video)
        throw new ApiError(404, "Video Not Found")
    if(video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not Allowed to Delete a Video")
    }
    await deleteFromCloudinary(video.videoPublicId, "video")
    await deleteFromCloudinary(video.thumbnailPublicId, "image")

    await Video.findByIdAndDelete(videoId)

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video Deleted Successfully"))

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid ID")
    }

    const video = await Video.findById(videoId)
    if(!video) {
        throw new ApiError(404, "Video Not Found")
    }

    if(video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are Not Allowed to do this Operation")
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        {
            new: true
        }
    )

    return res
    .status(200)
    .json(new ApiResponse(200, {isPublished: updatedVideo.isPublished}, 
        "Publish Status Toggled"
    ))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
