import {Request} from 'express';
import inversify from 'inversify';

/*
 * Inversify Express injects an initial middleware which creates a child container per request
 */
export class ChildContainerHelper {

    /*
     * Resolve the per request container that Inversify Express creates, using the Express request object
     */
    public static resolve(request: Request): inversify.interfaces.Container {

        // This is a hack, that uses knowledge of Inversify Express internals
        // However, there is no good way to reference the child container from global middleware classes
        const httpContext = Reflect.getMetadata('inversify-express-utils:httpcontext', request);
        return httpContext.container;
    }
}
