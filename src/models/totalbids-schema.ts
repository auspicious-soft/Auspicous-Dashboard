import { Schema, model } from "mongoose";

const bidSchema = new Schema({
    amount: {
        type: String,
        required: true, 
    },
    date: {
        type: String,
        required: true, 
    }

}, { timestamps: true })

export const bidModel = model("bid", bidSchema)
