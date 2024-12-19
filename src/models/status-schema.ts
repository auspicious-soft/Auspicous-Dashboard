import { Schema, model } from "mongoose";

const statusSchema = new Schema({
    name: {
        type: String,
        required: true, 
    },

}, { timestamps: true })

export const statusModel = model("status", statusSchema)
