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

    let existingAdmin: any;

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
    const updateduser = await usersModel.findByIdAndUpdate(id, { ...payload }, { new: true });

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

const bidsThisMonths = await bidModel.findOne({
    createdAt: {
        $gte: startOfMonthDate,
        $lte: endOfMonthDate
    }
}).select("_id amount");

// console.log("bidsThisMonth", bidsThisMonth);


// Check if bidsThisMonth is not empty
let totalBidsAmountThisMonths = 0; // Default to 0 if no bids exist
if (bidsThisMonths && bidsThisMonths.length > 0) {
    // Sum up all the amounts in the bids
    totalBidsAmountThisMonths = bidsThisMonths.reduce((total, bid) => total + parseFloat(bid.amount || '0'), 0);
}




// Check if bidsThisMonth is not empty
let totalBidsAmountThisMonth = 0; // Default to 0 if no bids exist
if (bidsThisMonth && bidsThisMonth.length > 0) {
    // Sum up all the amounts in the bids
    totalBidsAmountThisMonth = bidsThisMonth.reduce((total, bid) => total + parseFloat(bid.amount || '0'), 0);
}

// console.log("totalBidsAmountThisMonth", totalBidsAmountThisMonth);

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
        .populate("statusId", "name")
        .sort({ createdAt: -1 }) // Sort by createdAt in descending order to get the most recent ones
        .limit(10); // Limit the result to 10 projects

        // console.log("totalresponses",totalresponses);

        // console.log("totalBidsAmountThisMonth",totalBidsAmountThisMonth);

    // Calculate response rate (number of bids / total responses) * 100
    const responserate = totalBidsAmountThisMonth > 0 ? (totalresponses / totalBidsAmountThisMonth) * 100 : 0;

    // console.log("responserate",responserate);

    // Calculate hiring rate (number of projects hired / total responses) * 100
    const hiringrate = totalresponses > 0 ? (projecthired / totalresponses) * 100 : 0;

    // Prepare response data
    const response = {
        success: true,
        message: "Dashboard stats fetched successfully",
        data: {
            // bidsThisMonths,
            // totalresponses,
            // projecthired,
            // totalEarnings,
            // responserate,
            // hiringrate,
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

    const updateddata = await bidModel.findByIdAndUpdate(id, { ...payload }, { new: true });

    return {
        success: true,
        message: "Data updated successfully",
        data: updateddata,
    };

};

export const dashboardOverviewstatservice = async (payload: any, res: Response) => {
    // Get the month and year from the request payload (defaults to current month/year if not provided)
    const { month, year } = payload; // Ensure the payload contains 'month' and 'year'
    // Validate month and year
    if (!month) return errorResponseHandler('Please provide month', httpStatusCode.BAD_REQUEST, res);

    if (!year) return errorResponseHandler('Please provide year', httpStatusCode.BAD_REQUEST, res);

    const currentDate = new Date();

    // If month or year is not provided, default to the current month and year
    const targetMonth = month ? month - 1 : currentDate.getMonth(); // JavaScript months are 0-based
    const targetYear = year ? year : currentDate.getFullYear();

    // Calculate the start and end date for the selected month and year
    const startOfMonthDate = new Date(targetYear, targetMonth, 1);
    const endOfMonthDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59); // End of the month

    // Get all bids for the selected month and year
    const bidsThisMonth = await bidModel.findOne({
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
    // Validate month and year
    if (!month) return errorResponseHandler('Please provide month', httpStatusCode.BAD_REQUEST, res);

    if (!year) return errorResponseHandler('Please provide year', httpStatusCode.BAD_REQUEST, res);

    const currentDate = new Date();
    const targetMonth = month ? month - 1 : currentDate.getMonth();
    const targetYear = year ? year : currentDate.getFullYear();

    const startOfMonthDate = new Date(targetYear, targetMonth, 1);
    const endOfMonthDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59); // End of the month

    const bidsThisMonth = await bidModel.find({
        createdAt: {
            $gte: startOfMonthDate,
            $lte: endOfMonthDate
        }
    }).select("_id amount");
    
    const bidsThisMonths = await bidModel.findOne({
        createdAt: {
            $gte: startOfMonthDate,
            $lte: endOfMonthDate
        }
    }).select("_id amount");
    
    // console.log("bidsThisMonth", bidsThisMonth);
    
    
    // Check if bidsThisMonth is not empty
    let totalBidsAmountThisMonths = 0; // Default to 0 if no bids exist
    if (bidsThisMonths && bidsThisMonths.length > 0) {
        // Sum up all the amounts in the bids
        totalBidsAmountThisMonths = bidsThisMonths.reduce((total, bid) => total + parseFloat(bid.amount || '0'), 0);
    }
    
    
    
    
    // Check if bidsThisMonth is not empty
    let totalBidsAmountThisMonth = 0; // Default to 0 if no bids exist
    if (bidsThisMonth && bidsThisMonth.length > 0) {
        // Sum up all the amounts in the bids
        totalBidsAmountThisMonth = bidsThisMonth.reduce((total, bid) => total + parseFloat(bid.amount || '0'), 0);
    }
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
            bidsThisMonths,
            responserate,
            hiringrate
        }
    };

    return response;
};


export const getAllusertechService = async (payload: any, res: Response) => {


    const { month, year } = payload; // Ensure the payload contains 'month' and 'year'
    // Validate month and year
    if (!month) return errorResponseHandler('Please provide month', httpStatusCode.BAD_REQUEST, res);

    if (!year) return errorResponseHandler('Please provide year', httpStatusCode.BAD_REQUEST, res);


    const currentDate = new Date();

    // If month or year is not provided, default to the current month and year
    const targetMonth = month ? month - 1 : currentDate.getMonth(); // JavaScript months are 0-based
    const targetYear = year ? year : currentDate.getFullYear();

    // Calculate the start and end date for the selected month and year
    const startOfMonthDate = new Date(targetYear, targetMonth, 1);
    const endOfMonthDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59); // End of the month

    // Fetch users with populated technology data
    const users = await usersModel.find().populate("technology", "name _id");

    // Fetch targets for the current month
    const targets = await targetModel.find({
        createdAt: {
            $gte: startOfMonthDate,
            $lte: endOfMonthDate
        }
    });

    // Initialize the response structure
    const groupedUsers: Record<string, any[]> = {};

    // Group users by technology names
    users.forEach(user => {
        user.technology.forEach((tech: any) => {
            const techName = tech.name;
            const techId = tech._id; // Get the technology ID

            // Filter user's targets for the current month
            const userTargets = targets.filter(
                target => target.userId.toString() === user._id.toString() &&
                    target.technologyId.toString() === techId.toString()
            );

            // Calculate targetAmount and retrieve the latest date for this user-technology combination
            const targetAmount = userTargets.reduce((sum, target) => sum + parseFloat(target.targetAmount || '0'), 0); // Handle null or undefined targetAmount
            const targetDate = userTargets.length > 0 ? userTargets[0].date : null; // Take the date of the first target (or null if no targets)

            if (!groupedUsers[techName]) {
                groupedUsers[techName] = [];
            }

            // Push user data with technology ID and target date
            groupedUsers[techName].push({
                userId: user._id,
                fullName: user.fullName,
                targetAmount: targetAmount || 0, // Ensure targetAmount is not null
                technologyId: techId, // Add technology ID here
                targetDate: targetDate // Add date of the target
            });
        });
    });

    const response = {
        success: true,
        message: "Users grouped by technologies with targets fetched successfully",
        groupedUsers
    };

    return response;
};




// export const getAllusertechService = async (payload: any) => {

//         const currentDate = new Date();
//         const targetMonth = currentDate.getMonth(); 
//         const targetYear = currentDate.getFullYear();

//         const startOfMonthDate = new Date(targetYear, targetMonth, 1);
//         const endOfMonthDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

//         // Fetch users with populated technology data
//         const users = await usersModel.find().populate("technology", "name");

//         // Fetch targets for the current month
//         const targets = await targetModel.find({
//             createdAt: {
//                 $gte: startOfMonthDate,
//                 $lte: endOfMonthDate
//             }
//         });

//         // Initialize the response structure
//         const groupedUsers: Record<string, any[]> = {};
//         const technologyTotals: Record<string, number> = {};
//         let grandTotal = 0;

//         // Group users by technology names and calculate targets
//         users.forEach(user => {
//             user.technology.forEach((tech: any) => {
//                 const techName = tech.name;

//                 // Filter user's targets for the current month
//                 const userTargets = targets.filter(
//                     target => target.userId.toString() === user._id.toString() &&
//                               target.technologyId.toString() === tech._id.toString()
//                 );

//                 const targetAmount = userTargets.reduce((sum, target) => sum + parseFloat(target.targetamount), 0);

//                 // Initialize tech group if not exists
//                 if (!groupedUsers[techName]) {
//                     groupedUsers[techName] = [];
//                     technologyTotals[techName] = 0;
//                 }

//                 // Add user details and target amount
//                 groupedUsers[techName].push({
//                     _id: user._id,
//                     fullName: user.fullName,
//                     targetAmount
//                 });

//                 // Update tech and grand totals
//                 technologyTotals[techName] += targetAmount;
//                 grandTotal += targetAmount;
//             });
//         });

//         const response = {
//             success: true,
//             message: "Users grouped by technologies with targets fetched successfully",
//             data: {
//                 groupedUsers,
//                 technologyTotals,
//                 grandTotal
//             }
//         };

//         return response;


// };

export const createtargetService = async (payload: any, res: Response) => {
    const currentUserId = payload.currentUser;
    const currentDate = new Date();

    // Format the current date to 'YYYY-MM-DD'
    const formattedDate = currentDate.toISOString().split('T')[0];
    // Extract targets from the payload (skip the `currentUser` field)
    const targets = Object.values(payload).filter(item => item.userId);

    // Add the `date` to each target
    const targetsWithDate = targets.map(target => ({
        ...target,
        date: formattedDate
    }));

    // Insert all targets at once using insertMany
    await targetModel.insertMany(targetsWithDate);

    // Return a success response
    return {
        success: true,
        message: "Targets created successfully"
    };
};


export const updatetargetService = async (payload: any, res: Response) => {
    const currentUserId = payload.currentUser;
    const { targets } = payload;

    const bulkOps = targets.map(target => ({
        updateOne: {
            filter: {
                userId: target.userId,
                technologyId: target.technologyId,
                date: target.targetDate
            },
            update: {
                $set: { targetAmount: target.targetAmount }
            },
            upsert: false
        }
    }));

    const result = await targetModel.bulkWrite(bulkOps);

    return {
        success: true,
        message: "targets updated successfully"
    };
};


export const gettargetDashboardstatsService = async (payload: any, res: Response) => {
    const currentDate = new Date();
    const targetMonth = currentDate.getMonth();
    const targetYear = currentDate.getFullYear();
    const startOfMonthDate = new Date(targetYear, targetMonth, 1);
    const endOfMonthDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    // Step 1: Fetch all technologies
    const allTechnologies = await technologyModel.find(); // Assuming status 0 means active
    // console.log("tech",allTechnologies)

    const technologyNames = allTechnologies.reduce((acc, tech) => {
        acc[tech.name] = 0; // Initialize earnings to 0 for all technologies
        return acc;
    }, {});

    // console.log("technologyNames",technologyNames)

    // Step 2: Calculate total earnings per technology
    const totalEarningsPerTechnology = await leadModel.aggregate([
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
                        if: { $eq: ["$fixedprice", null] }, // If it's hourly, calculate based on hours and cost
                        then: { $multiply: ["$noofhours", "$costperhour"] },
                        else: "$fixedprice" // If it's fixed price, use that value
                    }
                }
            }
        },
        {
            $lookup: {
                from: "technologies",
                localField: "technology",
                foreignField: "_id",
                as: "technologyDetails"
            }
        },
        {
            $unwind: "$technologyDetails"
        },
        {
            $group: {
                _id: "$technology",
                totalEarnings: { $sum: "$totalProjectEarnings" },
                technologyName: { $first: "$technologyDetails.name" }
            }
        }
    ]);



    // Step 3: Merge earnings per technology with the full list of technologies (with 0 for missing ones)
    const earningsByTechnology = totalEarningsPerTechnology.reduce((acc, techEarnings) => {
        const techName = techEarnings.technologyName || 'Unknown Technology'; // Handle case if name is null
        acc[techName] = techEarnings.totalEarnings;
        return acc;
    }, {});

    // Step 4: Ensure all technologies are included, even if no earnings
    const mergedEarnings = { ...technologyNames, ...earningsByTechnology };



    const totalTargetPerTechnology = await targetModel.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: startOfMonthDate,
                    $lte: endOfMonthDate
                }
            }
        },
        {
            $lookup: {
                from: "technologies",
                localField: "technologyId",  // Match with the correct field name in your schema
                foreignField: "_id",
                as: "technologyDetails"
            }
        },
        {
            $unwind: "$technologyDetails"  // Unwind the result of the lookup to get individual technology data
        },
        {
            $group: {
                _id: "$technologyId",  // Group by technologyId
                totalTargetAmount: { $sum: { $toDouble: "$targetAmount" } },  // Summing the targetAmount after converting it to number
                technologyName: { $first: "$technologyDetails.name" }  // Get the technology name
            }
        }
    ]);

    // Step 3: Merge target amounts per technology with the full list of technologies (with 0 for missing ones)
    const TargetByTechnology = totalTargetPerTechnology.reduce((acc, techData) => {
        const techName = techData.technologyName || 'Unknown Technology';  // Handle case if name is null
        acc[techName] = techData.totalTargetAmount;
        return acc;
    }, {});

    // Merge the earnings with technology names
    const targetamount = { ...technologyNames, ...TargetByTechnology };


    // Calculate total earnings
    const totalEarnings = Object.values(mergedEarnings).reduce((sum, earnings) => sum + earnings, 0);

    // Step 5: Fetch total target amount
    const targets = await targetModel.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: startOfMonthDate,
                    $lte: endOfMonthDate
                }
            }
        },
        {
            $group: {
                _id: null,
                totalTargetAmount: { $sum: { $toDouble: "$targetAmount" } }
            }
        }
    ]);

    const totalTargetAmount = targets.length > 0 ? targets[0].totalTargetAmount : 0;

    // Step 6: Calculate monthly target percentage
    const monthlytargetstat = totalTargetAmount > 0 ? (totalEarnings / totalTargetAmount) * 100 : 0;



    // Fetch users with populated technology data
    const users = await usersModel.find().populate("technology", "name _id");

    // Fetch leads for the current month
    const leads = await leadModel.find({
        createdAt: {
            $gte: startOfMonthDate,
            $lte: endOfMonthDate
        }
    });

    // Initialize the response structure
    const groupedUsers = {};

    // Group users by technology names and calculate income
   // Group users by technology names and calculate daily earnings
users.forEach(user => {
    user.technology.forEach(tech => {
        const techName = tech.name;
        const techId = tech._id;

        // Filter user's leads for the current month
        const userLeads = leads.filter(
            lead => lead.userId.toString() === user._id.toString() &&
                lead.technology.toString() === techId.toString()
        );

        // Group earnings by day for each lead
        const dailyEarnings = userLeads.reduce((acc, lead) => {
            // Calculate earnings for the day
            let earning = 0;
            if (lead.contracttype === "Hourly") {
                earning = lead.noofhours * lead.costperhour || 0;
            } else if (lead.contracttype === "Fixed") {
                earning = lead.fixedprice || 0;
            }

            // Ensure lead.date is a valid Date object
            let leadDate = new Date(lead.createdAt);
            if (isNaN(leadDate.getTime())) {
                // If not a valid date, use a default fallback (e.g., current date)
                leadDate = new Date(); // Or handle it differently based on your requirements
            }

            // Get the date in YYYY-MM-DD format
            const leadDateString = leadDate.toISOString().split('T')[0];

            // If the lead date is not already in the accumulator, initialize it
            if (!acc[leadDateString]) {
                acc[leadDateString] = 0;
            }

            // Add earnings to the corresponding day
            acc[leadDateString] += earning;

            return acc;
        }, {});

        if (!groupedUsers[techName]) {
            groupedUsers[techName] = [];
        }

        // Push user data with daily earnings
        groupedUsers[techName].push({
            userId: user._id,
            fullName: user.fullName,
            dailyEarnings: dailyEarnings, // Now storing daily earnings
            technologyId: techId
        });
    });
});



    // Step 7: Prepare the response
    const response = {
        success: true,
        message: "Target Dashboard stats fetched successfully",
        data: {
            totalTargetAmount,
            totalEarnings,
            monthlytargetstat,
            technologyEarnings: mergedEarnings, // Ensure all technologies, even with no earnings, are included
            targetamount,
            groupedUsers
        }
    };

    return response;


};


export const targetstatservice = async (payload: any, res: Response) => {
    // Get the month and year from the request payload (defaults to current month/year if not provided)
    const { month, year } = payload; // Ensure the payload contains 'month' and 'year'

    // console.log("payload",payload);
    // Validate month and year
    if (!month) return errorResponseHandler('Please provide month', httpStatusCode.BAD_REQUEST, res);

    if (!year) return errorResponseHandler('Please provide year', httpStatusCode.BAD_REQUEST, res);


    const currentDate = new Date();

    // If month or year is not provided, default to the current month and year
    const targetMonth = month ? month - 1 : currentDate.getMonth(); // JavaScript months are 0-based
    const targetYear = year ? year : currentDate.getFullYear();

    // Calculate the start and end date for the selected month and year
    const startOfMonthDate = new Date(targetYear, targetMonth, 1);
    const endOfMonthDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59); // End of the month

    // Step 1: Fetch all technologies
    const allTechnologies = await technologyModel.find(); // Assuming status 0 means active
    // console.log("tech",allTechnologies)

    const technologyNames = allTechnologies.reduce((acc, tech) => {
        acc[tech.name] = 0; // Initialize earnings to 0 for all technologies
        return acc;
    }, {});

    // console.log("technologyNames",technologyNames)

    // Step 2: Calculate total earnings per technology
    const totalEarningsPerTechnology = await leadModel.aggregate([
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
                        if: { $eq: ["$fixedprice", null] }, // If it's hourly, calculate based on hours and cost
                        then: { $multiply: ["$noofhours", "$costperhour"] },
                        else: "$fixedprice" // If it's fixed price, use that value
                    }
                }
            }
        },
        {
            $lookup: {
                from: "technologies",
                localField: "technology",
                foreignField: "_id",
                as: "technologyDetails"
            }
        },
        {
            $unwind: "$technologyDetails"
        },
        {
            $group: {
                _id: "$technology",
                totalEarnings: { $sum: "$totalProjectEarnings" },
                technologyName: { $first: "$technologyDetails.name" }
            }
        }
    ]);



    // Step 3: Merge earnings per technology with the full list of technologies (with 0 for missing ones)
    const earningsByTechnology = totalEarningsPerTechnology.reduce((acc, techEarnings) => {
        const techName = techEarnings.technologyName || 'Unknown Technology'; // Handle case if name is null
        acc[techName] = techEarnings.totalEarnings;
        return acc;
    }, {});

    // Step 4: Ensure all technologies are included, even if no earnings
    const mergedEarnings = { ...technologyNames, ...earningsByTechnology };



    const totalTargetPerTechnology = await targetModel.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: startOfMonthDate,
                    $lte: endOfMonthDate
                }
            }
        },
        {
            $lookup: {
                from: "technologies",
                localField: "technologyId",  // Match with the correct field name in your schema
                foreignField: "_id",
                as: "technologyDetails"
            }
        },
        {
            $unwind: "$technologyDetails"  // Unwind the result of the lookup to get individual technology data
        },
        {
            $group: {
                _id: "$technologyId",  // Group by technologyId
                totalTargetAmount: { $sum: { $toDouble: "$targetAmount" } },  // Summing the targetAmount after converting it to number
                technologyName: { $first: "$technologyDetails.name" }  // Get the technology name
            }
        }
    ]);

    // Step 3: Merge target amounts per technology with the full list of technologies (with 0 for missing ones)
    const TargetByTechnology = totalTargetPerTechnology.reduce((acc, techData) => {
        const techName = techData.technologyName || 'Unknown Technology';  // Handle case if name is null
        acc[techName] = techData.totalTargetAmount;
        return acc;
    }, {});

    // Merge the earnings with technology names
    const targetamount = { ...technologyNames, ...TargetByTechnology };


    // Calculate total earnings
    const totalEarnings = Object.values(mergedEarnings).reduce((sum, earnings) => sum + earnings, 0);

    // Step 5: Fetch total target amount
    const targets = await targetModel.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: startOfMonthDate,
                    $lte: endOfMonthDate
                }
            }
        },
        {
            $group: {
                _id: null,
                totalTargetAmount: { $sum: { $toDouble: "$targetAmount" } }
            }
        }
    ]);

    const totalTargetAmount = targets.length > 0 ? targets[0].totalTargetAmount : 0;

    // Step 6: Calculate monthly target percentage
    const monthlytargetstat = totalTargetAmount > 0 ? (totalEarnings / totalTargetAmount) * 100 : 0;


    // Step 7: Prepare the response
    const response = {
        success: true,
        message: "Target stats fetched successfully",
        data: {
            totalTargetAmount,
            totalEarnings
        }
    };

    return response;
};


export const targetpercentstatservice = async (payload: any, res: Response) => {
    // Get the month and year from the request payload (defaults to current month/year if not provided)
    const { month, year } = payload; // Ensure the payload contains 'month' and 'year'

    // console.log("payload",payload);

    // Validate month and year
    if (!month) return errorResponseHandler('Please provide month', httpStatusCode.BAD_REQUEST, res);

    if (!year) return errorResponseHandler('Please provide year', httpStatusCode.BAD_REQUEST, res);


    const currentDate = new Date();

    // If month or year is not provided, default to the current month and year
    const targetMonth = month ? month - 1 : currentDate.getMonth(); // JavaScript months are 0-based
    const targetYear = year ? year : currentDate.getFullYear();

    // Calculate the start and end date for the selected month and year
    const startOfMonthDate = new Date(targetYear, targetMonth, 1);
    const endOfMonthDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59); // End of the month

    // Step 1: Fetch all technologies
    const allTechnologies = await technologyModel.find(); // Assuming status 0 means active
    // console.log("tech",allTechnologies)

    const technologyNames = allTechnologies.reduce((acc, tech) => {
        acc[tech.name] = 0; // Initialize earnings to 0 for all technologies
        return acc;
    }, {});

    // console.log("technologyNames",technologyNames)

    // Step 2: Calculate total earnings per technology
    const totalEarningsPerTechnology = await leadModel.aggregate([
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
                        if: { $eq: ["$fixedprice", null] }, // If it's hourly, calculate based on hours and cost
                        then: { $multiply: ["$noofhours", "$costperhour"] },
                        else: "$fixedprice" // If it's fixed price, use that value
                    }
                }
            }
        },
        {
            $lookup: {
                from: "technologies",
                localField: "technology",
                foreignField: "_id",
                as: "technologyDetails"
            }
        },
        {
            $unwind: "$technologyDetails"
        },
        {
            $group: {
                _id: "$technology",
                totalEarnings: { $sum: "$totalProjectEarnings" },
                technologyName: { $first: "$technologyDetails.name" }
            }
        }
    ]);



    // Step 3: Merge earnings per technology with the full list of technologies (with 0 for missing ones)
    const earningsByTechnology = totalEarningsPerTechnology.reduce((acc, techEarnings) => {
        const techName = techEarnings.technologyName || 'Unknown Technology'; // Handle case if name is null
        acc[techName] = techEarnings.totalEarnings;
        return acc;
    }, {});

    // Step 4: Ensure all technologies are included, even if no earnings
    const mergedEarnings = { ...technologyNames, ...earningsByTechnology };



    const totalTargetPerTechnology = await targetModel.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: startOfMonthDate,
                    $lte: endOfMonthDate
                }
            }
        },
        {
            $lookup: {
                from: "technologies",
                localField: "technologyId",  // Match with the correct field name in your schema
                foreignField: "_id",
                as: "technologyDetails"
            }
        },
        {
            $unwind: "$technologyDetails"  // Unwind the result of the lookup to get individual technology data
        },
        {
            $group: {
                _id: "$technologyId",  // Group by technologyId
                totalTargetAmount: { $sum: { $toDouble: "$targetAmount" } },  // Summing the targetAmount after converting it to number
                technologyName: { $first: "$technologyDetails.name" }  // Get the technology name
            }
        }
    ]);

    // Step 3: Merge target amounts per technology with the full list of technologies (with 0 for missing ones)
    const TargetByTechnology = totalTargetPerTechnology.reduce((acc, techData) => {
        const techName = techData.technologyName || 'Unknown Technology';  // Handle case if name is null
        acc[techName] = techData.totalTargetAmount;
        return acc;
    }, {});

    // Merge the earnings with technology names
    const targetamount = { ...technologyNames, ...TargetByTechnology };


    // Calculate total earnings
    const totalEarnings = Object.values(mergedEarnings).reduce((sum, earnings) => sum + earnings, 0);

    // Step 5: Fetch total target amount
    const targets = await targetModel.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: startOfMonthDate,
                    $lte: endOfMonthDate
                }
            }
        },
        {
            $group: {
                _id: null,
                totalTargetAmount: { $sum: { $toDouble: "$targetAmount" } }
            }
        }
    ]);

    const totalTargetAmount = targets.length > 0 ? targets[0].totalTargetAmount : 0;

    // Step 6: Calculate monthly target percentage
    const monthlytargetstat = totalTargetAmount > 0 ? (totalEarnings / totalTargetAmount) * 100 : 0;


    // Step 7: Prepare the response
    const response = {
        success: true,
        message: "Target Percentage stats fetched successfully",
        data: {
            monthlytargetstat
        }
    };

    return response;
};



export const targetteamstatservice = async (payload: any, res: Response) => {
    // Get the month and year from the request payload (defaults to current month/year if not provided)
    const { month, year } = payload; // Ensure the payload contains 'month' and 'year'

    // Validate month and year
    if (!month) return errorResponseHandler('Please provide month', httpStatusCode.BAD_REQUEST, res);

    if (!year) return errorResponseHandler('Please provide year', httpStatusCode.BAD_REQUEST, res);


    // console.log("payload",payload);

    const currentDate = new Date();

    // If month or year is not provided, default to the current month and year
    const targetMonth = month ? month - 1 : currentDate.getMonth(); // JavaScript months are 0-based
    const targetYear = year ? year : currentDate.getFullYear();

    // Calculate the start and end date for the selected month and year
    const startOfMonthDate = new Date(targetYear, targetMonth, 1);
    const endOfMonthDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59); // End of the month

    // Step 1: Fetch all technologies
    const allTechnologies = await technologyModel.find(); // Assuming status 0 means active
    // console.log("tech",allTechnologies)

    const technologyNames = allTechnologies.reduce((acc, tech) => {
        acc[tech.name] = 0; // Initialize earnings to 0 for all technologies
        return acc;
    }, {});

    // console.log("technologyNames",technologyNames)

    // Step 2: Calculate total earnings per technology
    const totalEarningsPerTechnology = await leadModel.aggregate([
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
                        if: { $eq: ["$fixedprice", null] }, // If it's hourly, calculate based on hours and cost
                        then: { $multiply: ["$noofhours", "$costperhour"] },
                        else: "$fixedprice" // If it's fixed price, use that value
                    }
                }
            }
        },
        {
            $lookup: {
                from: "technologies",
                localField: "technology",
                foreignField: "_id",
                as: "technologyDetails"
            }
        },
        {
            $unwind: "$technologyDetails"
        },
        {
            $group: {
                _id: "$technology",
                totalEarnings: { $sum: "$totalProjectEarnings" },
                technologyName: { $first: "$technologyDetails.name" }
            }
        }
    ]);



    // Step 3: Merge earnings per technology with the full list of technologies (with 0 for missing ones)
    const earningsByTechnology = totalEarningsPerTechnology.reduce((acc, techEarnings) => {
        const techName = techEarnings.technologyName || 'Unknown Technology'; // Handle case if name is null
        acc[techName] = techEarnings.totalEarnings;
        return acc;
    }, {});

    // Step 4: Ensure all technologies are included, even if no earnings
    const mergedEarnings = { ...technologyNames, ...earningsByTechnology };



    const totalTargetPerTechnology = await targetModel.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: startOfMonthDate,
                    $lte: endOfMonthDate
                }
            }
        },
        {
            $lookup: {
                from: "technologies",
                localField: "technologyId",  // Match with the correct field name in your schema
                foreignField: "_id",
                as: "technologyDetails"
            }
        },
        {
            $unwind: "$technologyDetails"  // Unwind the result of the lookup to get individual technology data
        },
        {
            $group: {
                _id: "$technologyId",  // Group by technologyId
                totalTargetAmount: { $sum: { $toDouble: "$targetAmount" } },  // Summing the targetAmount after converting it to number
                technologyName: { $first: "$technologyDetails.name" }  // Get the technology name
            }
        }
    ]);

    // Step 3: Merge target amounts per technology with the full list of technologies (with 0 for missing ones)
    const TargetByTechnology = totalTargetPerTechnology.reduce((acc, techData) => {
        const techName = techData.technologyName || 'Unknown Technology';  // Handle case if name is null
        acc[techName] = techData.totalTargetAmount;
        return acc;
    }, {});

    // Merge the earnings with technology names
    const targetamount = { ...technologyNames, ...TargetByTechnology };


    // Calculate total earnings
    const totalEarnings = Object.values(mergedEarnings).reduce((sum, earnings) => sum + earnings, 0);

    // Step 5: Fetch total target amount
    const targets = await targetModel.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: startOfMonthDate,
                    $lte: endOfMonthDate
                }
            }
        },
        {
            $group: {
                _id: null,
                totalTargetAmount: { $sum: { $toDouble: "$targetAmount" } }
            }
        }
    ]);

    const totalTargetAmount = targets.length > 0 ? targets[0].totalTargetAmount : 0;

    // Step 6: Calculate monthly target percentage
    const monthlytargetstat = totalTargetAmount > 0 ? (totalEarnings / totalTargetAmount) * 100 : 0;


    // Step 7: Prepare the response
    const response = {
        success: true,
        message: "Target Percentage stats fetched successfully",
        data: {
            technologyEarnings: mergedEarnings, // Ensure all technologies, even with no earnings, are included
            targetamount,
        }
    };

    return response;
};



export const targetrevenuestatservice = async (payload: any, res: Response) => {


    // Get the month and year from the request payload (defaults to current month/year if not provided)
    const { month, year } = payload; // Ensure the payload contains 'month' and 'year'

    // Validate month and year
    if (!month) return errorResponseHandler('Please provide month', httpStatusCode.BAD_REQUEST, res);

    if (!year) return errorResponseHandler('Please provide year', httpStatusCode.BAD_REQUEST, res);

    // console.log("payload",payload);

    const currentDate = new Date();

    // If month or year is not provided, default to the current month and year
    const targetMonth = month ? month - 1 : currentDate.getMonth(); // JavaScript months are 0-based
    const targetYear = year ? year : currentDate.getFullYear();

    // Calculate the start and end date for the selected month and year
    const startOfMonthDate = new Date(targetYear, targetMonth, 1);
    const endOfMonthDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59); // End of the month


    // Fetch users with populated technology data
    const users = await usersModel.find().populate("technology", "name _id");

    const technologies = await technologyModel.find({}, "name _id");
    const leads = await leadModel.find({
        createdAt: {
            $gte: startOfMonthDate,
            $lte: endOfMonthDate,
        },
    });
    
    // Initialize the response structure: teams by technology
    const teams = {};
    
    // Create teams based on technologies
    for (const tech of technologies) {
        const techId = tech._id.toString();
        const techName = tech.name;
    
        // Initialize team for this technology
        if (!teams[techName]) {
            teams[techName] = {
                members: [],
            };
        }
    
        // Filter leads for this technology
        const leadsForTechnology = leads.filter(
            (lead) => lead.technology.toString() === techId
        );
    
        // Group leads by user ID and calculate their earnings
        const userEarningsMap = leadsForTechnology.reduce((acc, lead) => {
            const userId = lead.userId.toString();
    
            // Initialize user's earnings if not already present
            if (!acc[userId]) {
                acc[userId] = {
                    userId,
                    dailyEarnings: {},
                    totalEarnings: 0,
                };
            }
    
            // Calculate earnings for the lead
            let earning = 0;
            if (lead.contracttype === "Hourly") {
                earning = (lead.noofhours || 0) * (lead.costperhour || 0);
            } else if (lead.contracttype === "Fixed") {
                earning = lead.fixedprice || 0;
            }
    
            // Parse the lead creation date into YYYY-MM-DD format
            const leadDate = new Date(lead.createdAt);
            const leadDateString = isNaN(leadDate.getTime())
                ? new Date().toISOString().split("T")[0]
                : leadDate.toISOString().split("T")[0];
    
            // Add earnings to the corresponding day
            if (!acc[userId].dailyEarnings[leadDateString]) {
                acc[userId].dailyEarnings[leadDateString] = 0;
            }
            acc[userId].dailyEarnings[leadDateString] += earning;
    
            // Update the total earnings
            acc[userId].totalEarnings += earning;
    
            return acc;
        }, {});
    
        // Fetch user names for all user IDs in this technology group
        const userIds = Object.keys(userEarningsMap);
        const users = await usersModel.find(
            { _id: { $in: userIds } },
            "fullName _id"
        );
    
        // Map user names to the user earnings data
        users.forEach((user) => {
            if (userEarningsMap[user._id.toString()]) {
                userEarningsMap[user._id.toString()].fullName = user.fullName;
            }
        });
    
        // Add all users with their earnings and names to the team
        teams[techName].members = Object.values(userEarningsMap);
    }
    
 
    

    // Step 7: Prepare the response
    const response = {
        success: true,
        message: "Target Revenue stats fetched successfully",
        data: {
            groupedUsers:teams
        }
    };

    return response;


};