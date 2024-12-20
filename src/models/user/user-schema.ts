import { Schema, model } from "mongoose";

const usersSchema = new Schema({
    identifier: {
        type: String,
        // required: true,
        unique: true
    },
    role: {
        type: String,
        required: true,
        default: "user" 
    },
    fullName: {
        type: String,
        requried: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    phoneNumber: {
        type: String,
    },
    profilePic:  {
        type: String,
        default: null 
    },
    desigination:  {
        type: String,
        default: null 
    },
    technology: [{
        type: Schema.Types.ObjectId, 
        required: true, 
        ref: "technologies"
    }],
    address: { 
        type: String,
        default: null 
    },
}, { timestamps: true })


export const usersModel = model("users", usersSchema)
