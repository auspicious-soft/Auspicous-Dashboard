import { Schema, model } from "mongoose";

const leadSchema = new Schema({
    identifier: {type: String,unique: true},
    clientname: { type: String, required: true },
    clientemail: { type: String, required: true },
    clientphone: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "users" },
    date: { type: String, required: true },
    platform: { type: Schema.Types.ObjectId, required: true, ref: "platforms" },
    technology: { type: Schema.Types.ObjectId, required: true, ref: "technologies" },
    statusId: { type: Schema.Types.ObjectId, required: true, ref: "status" },
    notes: { type: String, required: true },
    contracttype: { type: String, required: true },
    noofhours: { type: Number, default: null },      // Changed to Number
    costperhour: { type: Number, default: null },   // Changed to Number
    fixedprice: { type: Number, default: null },    // Changed to Number    
    createdby: { type: Schema.Types.ObjectId, required: true, ref: "admin" },
}, { timestamps: true })

export const leadModel = model("leads", leadSchema)