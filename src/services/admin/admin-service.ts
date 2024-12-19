import { adminModel } from "../../models/admin/admin-schema";
import bcrypt from "bcryptjs";
import { Response } from "express";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import { queryBuilder } from "../../utils";
import { sendPasswordResetEmail } from "src/utils/mails/mail";
import { generatePasswordResetToken, getPasswordResetTokenByToken, generatePasswordResetTokenByPhone } from "src/utils/mails/token";
import { generatePasswordResetTokenByPhoneWithTwilio } from "../../utils/sms/sms"
import { passwordResetTokenModel } from "src/models/password-token-schema";
import { usersModel } from "src/models/user/user-schema";
import { platformModel } from "src/models/platform/platform-schema";
import { targetModel } from "src/models/target/target-schema";
import { technologyModel } from "src/models/technology/technology-schema";
import { leadModel } from "src/models/lead-schema";
import { statusModel } from "src/models/status-schema";
import { bidModel } from "src/models/totalbids-schema";

export const loginService = async (payload: any, res: Response) => {
    const { username, password } = payload;
    const countryCode = "+45"; 
    const toNumber = Number(username);
    const isEmail = isNaN(toNumber); 
    let user: any = null;

    if (isEmail) {

        user = await adminModel.findOne({ email: username }).select('+password');
        if (!user) {
            user = await usersModel.findOne({ email: username }).select('+password');
        }
    } else {

        const formattedPhoneNumber = `${countryCode}${username}`;
        user = await adminModel.findOne({ phoneNumber: formattedPhoneNumber }).select('+password');
        if (!user) {
            user = await usersModel.findOne({ phoneNumber: formattedPhoneNumber }).select('+password');
        }
    }

    if (!user) return errorResponseHandler('User not found', httpStatusCode.NOT_FOUND, res);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return errorResponseHandler('Invalid password', httpStatusCode.UNAUTHORIZED, res);
    }
    const userObject = user.toObject();
    delete userObject.password;

    return {
        success: true,
        message: "Login successful",
        data: {
            user: userObject,
        },
    };
};


export const forgotPasswordService = async (payload: any, res: Response) => {
    const { username } = payload;
    const countryCode = "+91";
    const toNumber = Number(username);
    const isEmail = isNaN(toNumber);
    let user: any = null;
    if (isEmail) {
   
        user = await adminModel.findOne({ email: username }).select('+password');
        if (!user) {
            user = await usersModel.findOne({ email: username }).select('+password');
        }
        if (!user) return errorResponseHandler('User not found', httpStatusCode.NOT_FOUND, res);
     
        const passwordResetToken = await generatePasswordResetToken(username);
        if (passwordResetToken) {
            await sendPasswordResetEmail(username, passwordResetToken.token);
            return { success: true, message: "Password reset email sent with OTP" };
        }
    } else {
        const formattedPhoneNumber = `${countryCode}${username}`;
        user = await adminModel.findOne({ phoneNumber: formattedPhoneNumber }).select('+password');
        if (!user) {
            user = await usersModel.findOne({ phoneNumber: formattedPhoneNumber }).select('+password');
        }
        if (!user) return errorResponseHandler('User not found', httpStatusCode.NOT_FOUND, res);
       
        const passwordResetTokenBySms = await generatePasswordResetTokenByPhone(formattedPhoneNumber);
        if (passwordResetTokenBySms) {
            await generatePasswordResetTokenByPhoneWithTwilio(formattedPhoneNumber, passwordResetTokenBySms.token);
            return { success: true, message: "Password reset SMS sent with OTP" };
        }
    }

    return errorResponseHandler('Failed to generate password reset token', httpStatusCode.INTERNAL_SERVER_ERROR, res);
};


export const newPassswordAfterOTPVerifiedService = async (payload: { password: string, otp: string }, res: Response) => {
    // console.log('payload: ', payload);
    const { password, otp } = payload

    const existingToken = await getPasswordResetTokenByToken(otp)
    if (!existingToken) return errorResponseHandler("Invalid OTP", httpStatusCode.BAD_REQUEST, res)

    const hasExpired = new Date(existingToken.expires) < new Date()
    if (hasExpired) return errorResponseHandler("OTP expired", httpStatusCode.BAD_REQUEST, res)

        let existingAdmin:any;

        if (existingToken.email) {
          existingAdmin = await adminModel.findOne({ email: existingToken.email });
        } 
        else if (existingToken.phoneNumber) {
          existingAdmin = await adminModel.findOne({ phoneNumber: existingToken.phoneNumber });
        }

    const hashedPassword = await bcrypt.hash(password, 10)
    const response = await adminModel.findByIdAndUpdate(existingAdmin._id, { password: hashedPassword }, { new: true });
    await passwordResetTokenModel.findByIdAndDelete(existingToken._id);

    return {
        success: true,
        message: "Password updated successfully",
        data: response
    }
}


export const getAllUsersService = async (payload: any) => {
    const page = parseInt(payload.page as string) || 1
    const limit = parseInt(payload.limit as string) || 0
    const offset = (page - 1) * limit
    const { query, sort } = queryBuilder(payload, ['fullName'])
    const totalDataCount = Object.keys(query).length < 1 ? await usersModel.countDocuments() : await usersModel.countDocuments(query)
    const results = await usersModel.find(query).sort(sort).skip(offset).limit(limit).select("-__v")
    if (results.length) return {
        page,
        limit,
        success: true,
        total: totalDataCount,
        data: results
    }
    else {
        return {
            data: [],
            page,
            limit,
            success: false,
            total: 0
        }
    }
}

export const getAUserService = async (id: string, res: Response) => {
//   const user = await usersModel.findById(id);
//   if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

//   const userProjects = await projectsModel.find({ userId: id }).select("-__v");

//   return {
//       success: true,
//       message: "User retrieved successfully",
//       data: {
//           user,
//           projects: userProjects.length > 0 ? userProjects : [],
//       }
//   };
}


export const updateAUserService = async (id: string, payload: any, res: Response) => {
    const user = await usersModel.findById(id);
    if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
    const countryCode = "+45";
    payload.phoneNumber = `${countryCode}${payload.phoneNumber}`;
    const updateduser = await usersModel.findByIdAndUpdate(id,{ ...payload },{ new: true});

    return {
        success: true,
        message: "User updated successfully",
        data: updateduser,
    };

};


export const deleteAUserService = async (id: string, res: Response) => {
    // const user = await usersModel.findById(id);
    // if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

    // // Delete user projects ----
    // const userProjects = await projectsModel.deleteMany({ userId: id })

    // // Delete user ----
    // await usersModel.findByIdAndDelete(id)

    // return {
    //     success: true,
    //     message: "User deleted successfully",
    //     data: {
    //         user,
    //         projects: userProjects
    //     }
    // }
}


// Dashboard

export const getDashboardStatsService = async (payload: any, res: Response) => {
    const currentDate = new Date();
    
    // Automatically get the current month and year
    const targetMonth = currentDate.getMonth(); // Current month (0-based index)
    const targetYear = currentDate.getFullYear(); // Current year

    // Calculate the start and end date for the current month and year
    const startOfMonthDate = new Date(targetYear, targetMonth, 1);
    const endOfMonthDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59); // End of the month

    // Get all bids for the current month and year
    const bidsThisMonth = await bidModel.find({
        createdAt: {
            $gte: startOfMonthDate,
            $lte: endOfMonthDate
        }
    }).select("_id amount");

    // Calculate the total amount of bids for the current month and year
    const totalBidsAmountThisMonth = parseFloat(bidsThisMonth[0].amount);

    // Count the total number of leads (responses) for the current month and year
    const totalresponses = await leadModel.countDocuments({
        createdAt: {
            $gte: startOfMonthDate,
            $lte: endOfMonthDate
        }
    });

    // Count the number of projects that have been hired for the current month and year
    const projecthired = await leadModel.countDocuments({
        statusId: "6763cd4d8584e9d88c92ab92",
        createdAt: {
            $gte: startOfMonthDate,
            $lte: endOfMonthDate
        }
    });

    // Calculate total earnings (either fixed price or hourly rate) for the current month and year
    const totalearning = await leadModel.aggregate([
        { 
            $match: {
                createdAt: {
                    $gte: startOfMonthDate,
                    $lte: endOfMonthDate
                }
            }
        },
        { 
            $addFields: {
                totalProjectEarnings: {
                    $cond: {
                        if: { $eq: ["$fixedprice", null] }, // If fixedprice is null (hourly project)
                        then: { $multiply: ["$noofhours", "$costperhour"] }, // Calculate earnings based on hourly rate
                        else: "$fixedprice" // Otherwise, use fixedprice
                    }
                }
            }
        },
        {
            $group: {
                _id: null,
                totalEarnings: { $sum: "$totalProjectEarnings" }
            }
        }
    ]);

    const totalEarnings = totalearning.length > 0 ? totalearning[0].totalEarnings : 0;

    // Get projects created in the last 7 days (optional, as per your initial code)
    const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 7));
    const recentProjectDetails = await leadModel.find({ 
        createdAt: { $gte: sevenDaysAgo } 
    })
    .populate("userId", "fullName email")
    .populate("platform", "name")
    .populate("technology", "name")
    .populate("createdby", "fullName email")
    .populate("statusId", "name");

    // Calculate response rate (number of bids / total responses) * 100
    const responserate = totalBidsAmountThisMonth > 0 ? (totalresponses / totalBidsAmountThisMonth) * 100 : 0;

    // Calculate hiring rate (number of projects hired / total responses) * 100
    const hiringrate = totalresponses > 0 ? (projecthired / totalresponses) * 100 : 0;

    // Prepare response data
    const response = {
        success: true,
        message: "Dashboard stats fetched successfully",
        data: {
            responserate,
            hiringrate,
            bidsThisMonth,
            totalresponses,
            projecthired,
            totalEarnings,
            recentProjectDetails
        }
    };

    return response;
};





export const createbidService = async (payload: any, res: Response) => {
    const currentUserId = payload.currentUser

    const project = await new bidModel({
        ...payload,
    }).save();

    return {
        success: true,
        message: "Bid created successfully"
        
    }
};



export const updateABidService = async (id: string, payload: any, res: Response) => {
    const biddata = await bidModel.findById(id);
    if (!biddata) return errorResponseHandler("Data not found", httpStatusCode.NOT_FOUND, res);
 
    const updateddata = await bidModel.findByIdAndUpdate(id,{ ...payload },{ new: true});

    return {
        success: true,
        message: "Data updated successfully",
        data: updateddata,
    };

};

export const dashboardOverviewstatservice = async (payload: any, res: Response) => {
        // Get the month and year from the request payload (defaults to current month/year if not provided)
        const { month, year } = payload; // Ensure the payload contains 'month' and 'year'

        const currentDate = new Date();
        
        // If month or year is not provided, default to the current month and year
        const targetMonth = month ? month - 1 : currentDate.getMonth(); // JavaScript months are 0-based
        const targetYear = year ? year : currentDate.getFullYear();
    
        // Calculate the start and end date for the selected month and year
        const startOfMonthDate = new Date(targetYear, targetMonth, 1);
        const endOfMonthDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59); // End of the month
    
        // Get all bids for the selected month and year
        const bidsThisMonth = await bidModel.find({
            createdAt: {
                $gte: startOfMonthDate,
                $lte: endOfMonthDate
            }
        }).select("_id amount");
    

        // Count the total number of leads (responses) for the selected month and year
        const totalresponses = await leadModel.countDocuments({
            createdAt: {
                $gte: startOfMonthDate,
                $lte: endOfMonthDate
            }
        });
    
        // Count the number of projects that have been hired for the selected month and year
        const projecthired = await leadModel.countDocuments({
            statusId: "6763cd4d8584e9d88c92ab92",
            createdAt: {
                $gte: startOfMonthDate,
                $lte: endOfMonthDate
            }
        });
    
        // Calculate total earnings (either fixed price or hourly rate) for the selected month and year
        const totalearning = await leadModel.aggregate([
            { 
                $match: {
                    createdAt: {
                        $gte: startOfMonthDate,
                        $lte: endOfMonthDate
                    }
                }
            },
            { 
                $addFields: {
                    totalProjectEarnings: {
                        $cond: {
                            if: { $eq: ["$fixedprice", null] }, // If fixedprice is null (hourly project)
                            then: { $multiply: ["$noofhours", "$costperhour"] }, // Calculate earnings based on hourly rate
                            else: "$fixedprice" // Otherwise, use fixedprice
                        }
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: "$totalProjectEarnings" }
                }
            }
        ]);
    
        const totalEarnings = totalearning.length > 0 ? totalearning[0].totalEarnings : 0;
    
    
        // Prepare response data
        const response = {
            success: true,
            message: "Dashboard overview stats fetched successfully",
            data: {
                bidsThisMonth,
                totalresponses,
                projecthired,
                totalEarnings,
   
            }
        };
    
        return response;
};



export const dashboardchartstatservice = async (payload: any, res: Response) => {
    const { month, year } = payload;

    const currentDate = new Date();
    const targetMonth = month ? month - 1 : currentDate.getMonth(); 
    const targetYear = year ? year : currentDate.getFullYear();

    const startOfMonthDate = new Date(targetYear, targetMonth, 1);
    const endOfMonthDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59); // End of the month

    // Get all bids for the selected month and year
    const bidsThisMonth = await bidModel.find({
        createdAt: {
            $gte: startOfMonthDate,
            $lte: endOfMonthDate
        }
    }).select("_id amount");

    // Calculate totalBidsAmountThisMonth safely
    const totalBidsAmountThisMonth = bidsThisMonth.length > 0 ? parseFloat(bidsThisMonth[0].amount) : 0;

    // Count the total number of leads (responses) for the selected month and year
    const totalresponses = await leadModel.countDocuments({
        createdAt: {
            $gte: startOfMonthDate,
            $lte: endOfMonthDate
        }
    });

    // Count the number of projects that have been hired for the selected month and year
    const projecthired = await leadModel.countDocuments({
        statusId: "6763cd4d8584e9d88c92ab92",
        createdAt: {
            $gte: startOfMonthDate,
            $lte: endOfMonthDate
        }
    });

    // Calculate response rate (number of bids / total responses) * 100
    const responserate = totalBidsAmountThisMonth > 0 ? (totalresponses / totalBidsAmountThisMonth) * 100 : 0;

    // Calculate hiring rate (number of projects hired / total responses) * 100
    const hiringrate = totalresponses > 0 ? (projecthired / totalresponses) * 100 : 0;

    // Prepare response data
    const response = {
        success: true,
        message: "Dashboard chart stats fetched successfully",
        data: {
            responserate,
            hiringrate
        }
    };

    return response;
};
