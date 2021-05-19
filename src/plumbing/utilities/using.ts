import {Disposable} from '../utilities/disposable';

/*
 * A helper function similar to the .Net concept
 */
export async function using<T extends Disposable>(resource: T, func: () => any): Promise<any> {

    try {
        // Execute
        return await func();

    } finally {

        // Dispose the resource
        resource.dispose();
    }
}
