/*
 * Plumbing types that can be injected into application code
 */
export const BASETYPES = {
    BaseClaims: Symbol.for('BaseClaims'),
    ClaimsCache: Symbol.for('ClaimsCache'),
    ClaimsProvider: Symbol.for('ClaimsProvider'),
    CustomClaims: Symbol.for('CustomClaims'),
    HttpProxy: Symbol.for('HttpProxy'),
    JwksClient: Symbol.for('JwksClient'),
    LogEntry: Symbol.for('LogEntry'),
    LoggerFactory: Symbol.for('LoggerFactory'),
    LoggingConfiguration: Symbol.for('Configuration'),
    OAuthAuthenticator: Symbol.for('OAuthAuthenticator'),
    OAuthConfiguration: Symbol.for('OAuthConfiguration'),
    TokenValidator: Symbol.for('TokenValidator'),
    UnhandledExceptionHandler: Symbol.for('UnhandledExceptionHandler'),
    UserInfoClaims: Symbol.for('UserInfoClaims'),
};
