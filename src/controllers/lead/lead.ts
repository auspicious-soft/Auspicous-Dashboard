import { Request, Response } from "express"
import { adminUserLoginSchema } from "../../validation/admin-user";
import { formatZodErrors } from "../../validation/format-zod-errors";
import {
    getleadService, createleadService , getAllleadService, getALeadService,updateALeadService, getStatusService
} from "../../services/lead/lead-service";
import { errorParser } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import { z } from "zod";
import mongoose from "mongoose";




export const getleaddata = async (req: Request, res: Response) => {
    try {
        const response = await getleadService(req, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}


export const createlead = async (req: Request, res: Response) => {
    try {
        const response = await createleadService({currentUser : (req as any).currentUser, ...req.body}, res)
        return res.status(httpStatusCode.CREATED).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}


export const getAllleads = async (req: Request, res: Response) => {
    try {
        // console.log(req.query);
        const response = await getAllleadService(req.query)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}


export const getAlead = async (req: Request, res: Response) => {
    try {
        const response = await getALeadService(req.params.id, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}


export const updateAlead = async (req: Request, res: Response) => {
    try {
        const response = await updateALeadService(req.params.id, req.body, res);
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

export const getAllstatus = async (req: Request, res: Response) => {
    try {
        const response = await getStatusService(req, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}



