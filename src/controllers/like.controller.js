import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID")
    }

    //check if user already Liked or not
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    })

    if(existingLike) {
        //already liked => remove like
        await Like.findByIdAndDelete(existingLike._id)

        return res
            .status(200)
            .json(new ApiResponse(200, {liked: false},"Video unliked successfully"))
    }

    //not liked => add like
    await Like.create({
        video: videoId,
        likedBy: req.user._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, {liked: true}, "Video liked successfully"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Comment ID")
    }

    //check if already liked
    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    })

    if(existingLike) {
        //already liked => remove like
        await Like.findByIdAndDelete(existingLike._id)
        return res
            .status(200)
            .json(new ApiResponse(200, { liked: false }, "Comment Unliked"))
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user._id
    })
    return res
        .status(201)
        .json(new ApiResponse(201, { liked: true }, "Comment Liked"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    
    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Wrong Tweet ID")
    }
    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id
    })

    if(existingLike) {
        await Like.findByIdAndDelete(existingLike._id)
        return res
            .status(200)
            .json(new ApiResponse(200, { liked: false}, "Tweet Unliked"))
    }

    await Like.create({ tweet: tweetId, likedBy: req.user._id })
    return res
        .status(201)
        .json(new ApiResponse(201, { liked: true }, "Tweet liked"))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        {
            // filter like docs belonging to the logged-in user
            // and only those that have a video field (not comment/tweet likes)
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: { $exists: true, $ne: null}
            }
        }, 
        {
            // join with videos collection to get full video details
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        // nested lookup: get owner details for each video
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
                    {
                        $unwind: "$owner"
                    },
                    { 
                        $project: { title: 1, thumbnail: 1, duration: 1, owner: 1, view: 1 } 
                    }
                ]
            }
        },
        { $unwind: "$video"},
        { $sort: { createdAt: -1 } },
        // promote video object to top level
        // turns { likedBy, video: { title, ... } } → { title, ... }
        { $replaceRoot: { newRoot: "$video" } }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}