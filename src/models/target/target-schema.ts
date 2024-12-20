import { Schema, model } from "mongoose";

const targetSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true, ref: "users" },
    date: { type: String, required: false },
    technologyId: { type: Schema.Types.ObjectId, required: true, ref: "technologies" },
    targetAmount: { type: String, required: true }
}, { timestamps: true })

export const targetModel = model("targets", targetSchema)