import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    if(!name) {
        throw new ApiError(400, "Playlist name is required")
    }    
    if(!description) {
        throw new ApiError(400, "Playlist description is required")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user._id,
        videos: []
    })
    return res
        .status(201)
        .json(new ApiResponse(201, playlist, "Playlist Created Successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    if(!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $project: {
                            title: 1,
                            thumbnail: 1,
                            duration: 1
                        }
                    }
                ]
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ])
    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "User playlists fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID")
    }
    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
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
                    { $unwind: "$owner"},
                    { 
                        $project: {
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            view: 1
                        }

                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        }
    ])

    if(!playlist.length) {
        throw new ApiError(404, "Playlist Not Found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist[0], "Playlist Fetched Successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID")
    }
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID")
    }

    const playlist = Playlist.findById(playlistId)
    if(!playlist) {
        throw new ApiError(404, "Playlist Not Found")
    }

    if(playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are Not Allowed to Modify the Playlist")
    }

    // avoid duplicate video in playlist
    if(playlist.videos.includes(videoId)) {
        throw new ApiError(403, "Video already in Playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $push: { videos: videoId } },
        { new : true }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    
    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invlaid Playlist Id")
    }
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID")
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist) {
        throw new ApiError(404, "Playlist Not Found")
    }
    if(playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are Not Allowed to Modify the playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            new: true
        }
    )

    return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID")
    }
    
    const playlist = await Playlist.findById(playlistId)
    if(!playlist) {
        throw new ApiError(404, "Playlist Not Found")
    }

    if(playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are Not Allowed to Delete The Playlist")
    }

    await Playlist.findByIdAndDelete(playlistId)

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body

    if (!isValidObjectId(playlistId)) throw new ApiError(400, "Invalid playlist ID")
    if (!name?.trim()) throw new ApiError(400, "Name is required")
    if (!description?.trim()) throw new ApiError(400, "Description is required")

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) throw new ApiError(404, "Playlist not found")

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $set: { name, description } },
        { new: true }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
