import mongoose , {isValidObjectId} from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID");
    }

    const pipeline = [
        //get all comments for this video
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        //join with users with commenter details
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
            $sort: {
                createdAt: -1
            }
        }
    ]

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    }

    const comments = await Comment.aggregatePaginate(Comment.aggregate(pipeline), options)

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments Fetched Successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Comment ID");
    }
    if(!content?.trim()) {
        throw new ApiError(400, "content is Required")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })

    return res
        .status(201)
        .json(new ApiResponse(201, comment, "Comment Added Successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params
    const { content } = req.body
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Comment ID");
    }
    if(!content?.trim()) {
        throw new ApiError(400, "content is Required")
    }

    const comment = await Comment.findById(commentId)
    if(!comment) {
        throw new ApiError(404, "Comment Not Found")
    }

    if(comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are Not Allowed to Update this Comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: { content }
        },
        {
            new : true
        }
    )
    return res
        .status(200)
        .json(new ApiResponse(200, updatedComment, "Comment Updated Successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Comment ID");
    }
    const comment = await Comment.findById(commentId)
    if(!comment) {
        throw new ApiError(404, "Comment Not Found")
    }
    if(comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are Not Allowed to Delete This Comment")
    }

    await Comment.findByIdAndDelete(commentId)

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment Deleted Successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}
