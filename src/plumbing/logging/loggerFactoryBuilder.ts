import {LoggerFactory} from './loggerFactory';
import {LoggerFactoryImpl} from './loggerFactoryImpl';

/*
 * A simple builder class to expose a segregated interface
 */
export class LoggerFactoryBuilder {

    public static create(): LoggerFactory {
        return new LoggerFactoryImpl();
    }
}
