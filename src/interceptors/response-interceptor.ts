import { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";

export class ResponseInterceptor implements NestInterceptor{
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any>  {
        return next.handle().pipe(
            map((data)=>({
                status:'success',
                message:data?.message||'Request Successful',
                data:data?.data??data,
            }))
        )
    }
}