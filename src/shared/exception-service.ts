import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { LogService } from './logger-service';
import { ERROR_MESSAGES } from "./constants";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter{
    private logger=new LogService();
    constructor(private context:string){}
    catch(exception: any, host: ArgumentsHost) {

        const ctx=host.switchToHttp();
        const response=ctx.getResponse<Response>();
        const request=ctx.getRequest<Request>();

        const status=exception instanceof HttpException? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        
        const responseMessage=exception instanceof HttpException? exception.getResponse() : 
        { error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
        const resp = (typeof responseMessage === 'string')
            ? { error: responseMessage }
            : (responseMessage as any);

        this.logger.log(this.context);
        this.logger.error(exception.message);
        this.logger.error(exception.stack);
        
        const errorResponse = {
            statusCode: resp?.error?.status ? resp.error.status : status,
            message: [resp?.error?.message ?? resp?.error ?? 'Internal Server Error'],
            timestamp: new Date(new Date() + 'Z'),
            path: request.url,
            additionalValidations: [],
            additionalValidationErrors: [],
            };
        if(exception.response && exception.response.message)
        {
            const exMsg = exception.response.message;
            errorResponse.message = Array.isArray(exMsg) ? (exMsg.length ? exMsg : ['Internal Server Error']) : [exMsg ?? 'Internal Server Error'];
            errorResponse.statusCode = exception.status ?? errorResponse.statusCode;
            errorResponse.additionalValidations = exception.message ? exception.message : exception.response.message;
        }

        if(exception.code=='EREQUEST'&& exception.name=='QueryFailedError'){
            errorResponse.message = ['Internal Server Error'];
            errorResponse.statusCode = 500;
            errorResponse.additionalValidations = exception.message;
        }
        response.status(status).json(errorResponse);
    }


}
