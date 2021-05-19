/*
 * A list of error codes used within plumbing code
 */
export class BaseErrorCodes {

    public static readonly serverError = 'server_error';

    public static readonly unauthorizedRequest = 'unauthorized';

    public static readonly claimsFailure = 'claims_failure';

    public static readonly introspectionFailure = 'introspection_failure';

    public static readonly tokenSigningKeysDownloadError = 'jwks_download_failure'

    public static readonly insufficientScope = 'insufficient_scope';

    public static readonly userinfoFailure = 'userinfo_failure';

    public static readonly userInfoTokenExpired = 'invalid_token';

    public static readonly exceptionSimulation = 'exception_simulation';
}
