import { Schema, model } from "mongoose";

const targetSchema = new Schema({
    identifier: {type: String,unique: true},
    userId: { type: Schema.Types.ObjectId, required: true, ref: "users" },
    date: { type: String, required: true },
    technologyId: { type: Schema.Types.ObjectId, required: true, ref: "technologies" },
    targetamount: { type: String, required: true },
    status: { type: String, required: false },
    createdby: { type: Schema.Types.ObjectId, required: true, ref: "users" },
}, { timestamps: true })

export const targetModel = model("targets", targetSchema)