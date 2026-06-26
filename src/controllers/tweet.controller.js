import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body
    if(!content?.trim()) {
        throw new ApiError(400, "Content is Required")
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    })

    return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet Created Successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params
    
    if(!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID")
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
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
        {
            $unwind: "$owner"
        },
        {
            $sort: { createdAt : -1 }
        }
    ])

    return res
        .status(201)
        .json(new ApiResponse(200, tweets, "User Tweets Fetched Successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body

    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID");
    }
    if(!content?.trim()) {
        throw new ApiError(400, "Content is Required");
    }

    const tweet = await Tweet.findById(tweetId);
    if(!tweet) {
        throw new ApiError(404, "Tweet Not Found")
    }
    if(tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are Not Allowed to Update this Tweet")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set : { content }
        },
        {
            new: true
        }
    )

    return res
        .status(201)
        .json(new ApiResponse(200, updatedTweet, "Tweet Updated Successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID")
    }

    const tweet = await Tweet.findById(tweetId)
    if(!tweet) {
        throw new ApiError(404, "Tweet Not Found");
    }

    if(tweet.owner.toString() != req.user._id.toString()) {
        throw new ApiError(403, "You are Not Allowed to Delete this Tweet")
    }

    await Tweet.findByIdAndDelete(tweetId)

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Tweet Deleted Successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
