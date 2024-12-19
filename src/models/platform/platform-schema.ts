import { Schema, model } from "mongoose";

const platformSchema = new Schema({
  identifier: {
    type: String,
    // required: true,
    unique: true
},
name: {
    type: String,
    requried: true
},
status: {
    type: String,
    default: 0
},

}, { timestamps: true })

export const platformModel = model("platforms", platformSchema)