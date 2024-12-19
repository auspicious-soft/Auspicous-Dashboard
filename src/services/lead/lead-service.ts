import { adminModel } from "../../models/admin/admin-schema";
import bcrypt from "bcryptjs";
import { Response } from "express";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import { queryBuilder } from "../../utils";
import mongoose from "mongoose";
import { passwordResetTokenModel } from "src/models/password-token-schema";
import { usersModel } from "src/models/user/user-schema";
import { platformModel } from "src/models/platform/platform-schema";
import { targetModel } from "src/models/target/target-schema";
import { technologyModel } from "src/models/technology/technology-schema";
import { leadModel } from "src/models/lead-schema";
import { statusModel } from "src/models/status-schema";
import { customAlphabet } from "nanoid";


// Lead
export const getleadService = async (payload: any, res: Response) => {
   
    const users = await usersModel.find({});
    const status = await statusModel.find({});
    const technology = await technologyModel.find({});
    const platform = await platformModel.find({});


    const response = {
        success: true,
        message: "Lead services fetched successfully",
        data: {
          users,
          status,
          technology,
          platform,
        }
    }

    return response
}


export const createleadService = async (payload: any, res: Response) => {
    const currentUserId = payload.currentUser
    payload.createdby = currentUserId;
    const identifier = customAlphabet('0123456789', 3);
    payload.identifier = identifier();

    const project = await new leadModel({
        ...payload,
    }).save();

    return {
        success: true,
        message: "Lead created successfully"
        
    }
};



export const getAllleadService = async (payload: any) => {
    const page = parseInt(payload.page as string) || 1;
    const limit = parseInt(payload.limit as string) || 0;
    const offset = (page - 1) * limit;

    let { query, sort } = queryBuilder(payload, ['4']); 

    // Count total data
    const totalDataCount = Object.keys(query).length < 1
        ? await leadModel.countDocuments()
        : await leadModel.countDocuments(query);

    // Find leads with population
    const results = await leadModel
        .find(query)
        .sort(sort)
        .skip(offset)
        .limit(limit)
        .select("-__v")
        .populate("userId", "fullName email")          // Populating userId
        .populate("platform", "name")             // Populating platform
        .populate("technology", "name")           // Populating technology
        .populate("createdby", "fullName email")     // Populating createdby
        .populate("statusId", "name")  // Correct reference to statusId

    return {
        page,
        limit,
        success: results.length > 0,
        total: totalDataCount,
        data: results.length > 0 ? results : [],
    };
};



export const getALeadService = async (id: string, res: Response) => {
    const lead = await leadModel
    .findById(id)
    .populate("userId", "fullName email")          // Populating userId
    .populate("platform", "name")             // Populating platform
    .populate("technology", "name")           // Populating technology
    .populate("createdby", "fullName email")     // Populating createdby
    .populate("statusId", "name")  // Correct reference to statusId
    .exec();
    if (!lead) return errorResponseHandler("lead not found", httpStatusCode.NOT_FOUND, res);
  
    return {
        success: true,
        message: "lead retrieved successfully",
        data: {
            lead
        }
    };
  }






