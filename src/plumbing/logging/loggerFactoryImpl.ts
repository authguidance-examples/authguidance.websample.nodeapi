import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import Transport from 'winston-transport';
import {LoggingConfiguration} from '../configuration/loggingConfiguration';
import {ErrorUtils} from '../errors/errorUtils';
import {LogEntryImpl} from './logEntryImpl';
import {LoggerFactory} from './loggerFactory';
import {PerformanceThreshold} from './performanceThreshold';

/*
 * Techniacl logger names
 */
const ROOT_DEVELOPMENT_LOGGER_NAME = 'root';
const PRODUCTION_LOGGER_NAME = 'production';

/*
 * The logger factory implementation to manage winston and creating log entries
 */
export class LoggerFactoryImpl implements LoggerFactory {

    private _apiName: string;
    private _defaultPerformanceThresholdMilliseconds: number;
    private _thresholdOverrides: PerformanceThreshold[];

    /*
     * We create the logger factory before reading configuration, since we need to log problems loading configuration
     */
    public constructor() {

        // Initialise logging fields
        this._apiName = '';
        this._defaultPerformanceThresholdMilliseconds = 1000;
        this._thresholdOverrides = [];

        // Initialise console colours
        winston.addColors({
            error: 'red',
            warn: 'yellow',
            info: 'white',
            debug: 'blue',
        });

        this._setupCallbacks();
    }

    /*
     * Configure at application startup from a dynamic object
     */
    public configure(configuration: LoggingConfiguration): void {

        // Initialise behaviour
        this._apiName = configuration.apiName;

        // Create the production logger
        const productionLogConfig = configuration.production;
        this._createProductionLogger(productionLogConfig.level, productionLogConfig.transports);
        this._loadPerformanceThresholds(productionLogConfig);

        // Create development loggers
        const developmentLogConfig = configuration.development;
        this._createDevelopmentLoggers(developmentLogConfig);
    }

    /*
     * Special handling for startup errors
     */
    public logStartupError(exception: any): void {

        // Create a default production logger if configuration is not loaded yet
        if (!winston.loggers.has(PRODUCTION_LOGGER_NAME)) {
            this._createProductionLogger('info', [{type: 'console'}]);
        }

        // Get the error into a loggable format
        const error = ErrorUtils.createServerError(exception);

        // Create a log entry and set error details
        const logEntry = new LogEntryImpl(this._apiName, this._getProductionLogger(), null);
        logEntry.setOperationName('startup');
        logEntry.setServerError(error);
        logEntry.write();
    }

    /*
     * Return the requested 'logger per class' or the default logger if not found
     */
    public getDevelopmentLogger(name: string): winston.Logger {

        if (winston.loggers.has(name)) {
            return winston.loggers.get(name);
        }

        return (winston as any);
    }

    /*
     * Create a log entry at the start of an API request
     * Also set performance threshold details, which can be customised for specific operations
     */
    public createLogEntry(): LogEntryImpl {

        return new LogEntryImpl(this._apiName, this._getProductionLogger(), this._getPerformanceThreshold);
    }

    /*
     * There is a single production logger which writes a structured and queryable log entry for each API request
     * It should be configured to be always on in all environments
     */
    private _createProductionLogger(level: string, transportsConfig: any[]): void {

        const transports = [];

        // Create a pretty print formatter for productivity
        const prettyPrintFormatter = winston.format.combine(
            winston.format.printf((logEntry: any) => {
                return JSON.stringify(logEntry.message, null, 2);
            }));

        // Create a bare JSON formatter with a log entry per line, for log shippers
        const bareJsonFormatter = winston.format.combine(
            winston.format.printf((logEntry: any) => {
                return JSON.stringify(logEntry.message);
            }));

        // Create the console transport, which is used for log shipping in Kubernetes
        const consoleTransportConfig = transportsConfig.find((a: any) => a.type === 'console');
        if (consoleTransportConfig) {
            const consoleTransport = new winston.transports.Console();
            if (consoleTransport) {
                consoleTransport.format =
                    consoleTransportConfig.prettyPrint ? prettyPrintFormatter : bareJsonFormatter;
                transports.push(consoleTransport);
            }
        }

        // Create the file transport, which is used for log shipping from a developer PC
        const fileTransportConfig = transportsConfig.find((a: any) => a.type === 'file');
        if (fileTransportConfig) {
            const fileTransport = this._createFileTransport(fileTransportConfig);
            if (fileTransport) {
                fileTransport.format = bareJsonFormatter;
                transports.push(fileTransport);
            }
        }

        // Create the logger and give it a name
        const loggerOptions = {
            level,
            transports,
        };
        winston.loggers.add(PRODUCTION_LOGGER_NAME, loggerOptions);
    }

    /*
     * Return the production logger, which logs every request as a JSON object
     */
    private _getProductionLogger(): winston.Logger {
        return winston.loggers.get(PRODUCTION_LOGGER_NAME);
    }

    /*
     * Development loggers run only on a developer PC and should be used sparingly
     * The output is not useful in production since it has insufficient context and is not queryable
     */
    private _createDevelopmentLoggers(developmentLogConfig: any): void {

        // Create the root logger
        this._createDevelopmentLogger(ROOT_DEVELOPMENT_LOGGER_NAME, developmentLogConfig.level);

        // Add extra loggers per class if configured
        if (developmentLogConfig.overrideLevels) {
            for (const name in developmentLogConfig.overrideLevels) {
                if (name) {

                    const level = developmentLogConfig.overrideLevels[name];
                    this._createDevelopmentLogger(name, level);
                }
            }
        }
    }

    /*
     * Create a single development logger
     * Development loggers intentionally only support a console logger
     */
    private _createDevelopmentLogger(name: string, level: string): void {

        const transports = [];
        transports.push(new winston.transports.Console());

        // Create the logger
        const options = {
            transports,
            format: this._createDevelopmentFormatter(name),
            level,
        };

        winston.loggers.add(name, options);
    }

    /*
     * A utility method to create the file transport consistently
     */
    private _createFileTransport(transportConfig: any): Transport {

        const options = {
            filename: `${transportConfig.filePrefix}-%DATE%.log`,
            dirname: `${transportConfig.dirname}`,
            datePattern: 'YYYY-MM-DD',
            maxSize: transportConfig.maxSize,
            maxFiles: transportConfig.maxFiles,
        };

        return new DailyRotateFile(options);
    }

    /*
     * Create the formatter for development text output in a parameterised manner
     */
    private _createDevelopmentFormatter(loggerName: string): any {

        return winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf((info: any) => `${info.level}: ${info.timestamp} : ${loggerName} : ${info.message}`),
        );
    }

    /*
     * Extract performance details from the log configuration, for use later when creating log entries
     */
    private _loadPerformanceThresholds(productionLogConfig: any) {

        // Read the default performance threshold and update the default
        const thresholds = productionLogConfig.performanceThresholdsMilliseconds;
        this._defaultPerformanceThresholdMilliseconds = thresholds.default;

        // Support operation specific overrides, which will be set against the log entry on creation
        if (thresholds.operationOverrides) {
            for (const name in thresholds.operationOverrides) {
                if (name) {
                    const milliseconds = thresholds.operationOverrides[name];
                    const performanceThreshold = {
                        name,
                        milliseconds,
                    };

                    this._thresholdOverrides.push(performanceThreshold);
                }
            }
        }
    }

    /*
     * Given an operation name, return its performance threshold
     */
    private _getPerformanceThreshold(name: string): number {

        const found = this._thresholdOverrides.find((o) => o.name.toLowerCase() === name.toLowerCase());
        if (found) {
            return found.milliseconds;
        }

        return this._defaultPerformanceThresholdMilliseconds;
    }

    /*
     * Plumbing to ensure the this parameter is available
     */
    private _setupCallbacks(): void {
        this._getPerformanceThreshold = this._getPerformanceThreshold.bind(this);
    }
}
