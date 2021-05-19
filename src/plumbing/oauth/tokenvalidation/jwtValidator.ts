import {inject, injectable} from 'inversify';
import {JwksClient, SigningKey} from 'jwks-rsa';
import {decode, verify, VerifyOptions} from 'jsonwebtoken';
import {ClaimsPayload} from '../../claims/claimsPayload';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {BASETYPES} from '../../dependencies/baseTypes';
import {ErrorFactory} from '../../errors/errorFactory';
import {ErrorUtils} from '../../errors/errorUtils';
import {TokenValidator} from './tokenValidator';

/*
 * An implementation that validates access tokens as JWTs
 */
@injectable()
export class JwtValidator implements TokenValidator {

    private readonly _configuration: OAuthConfiguration;
    private readonly _jwksClient: JwksClient;

    public constructor(
        @inject(BASETYPES.OAuthConfiguration) configuration: OAuthConfiguration,
        @inject(BASETYPES.JwksClient) jwksClient: JwksClient) {

        this._jwksClient = jwksClient;
        this._configuration = configuration;
    }

    /*
     * The entry point for in memory token validation
     */
    public async validateToken(accessToken: string): Promise<ClaimsPayload> {

        // First decoode the token without verifying it so that we get the key identifier from the JWT header
        const decoded = decode(accessToken, {complete: true}) as any;
        if (!decoded) {

            // Indicate an invalid token if we cannot decode it
            throw ErrorFactory.createClient401Error('Unable to decode received JWT');
        }

        // Do the work to download JWKS keys
        const keyIdentifier = decoded.header.kid;
        const tokenSigningPublicKey = await this._downloadJwksKeyForKeyIdentifier(keyIdentifier);

        // Verify the JWT and return its claims
        const data = await this._validateTokenInMemory(accessToken, tokenSigningPublicKey);
        return new ClaimsPayload(data);
    }

    /*
     * Download the public key with which our access token is signed
     * The JWKS Client will cache results and only call the Authorization Server when there is a new kid
     */
    private async _downloadJwksKeyForKeyIdentifier(tokenKeyIdentifier: string): Promise<string> {

        return new Promise<string>((resolve, reject) => {

            this._jwksClient.getSigningKey(tokenKeyIdentifier, (err: any, key: SigningKey) => {

                if (err) {
                    return reject(ErrorUtils.fromSigningKeyDownloadError(err, this._configuration.jwksEndpoint));
                }

                return resolve(key.getPublicKey());
            });
        });
    }

    /*
     * Call a third party library to do the token validation, and return token claims
     */
    private async _validateTokenInMemory(accessToken: string, tokenSigningPublicKey: string): Promise<any> {

        try {

            // Verify the token's signature, issuer, audience and time window
            const options: VerifyOptions = {
                issuer: this._configuration.issuer,
                audience: this._configuration.audience,
                algorithms: ['RS256'],
            };

            // On success return the claims JSON data
            return verify(accessToken, tokenSigningPublicKey, options);

        } catch (e) {

            // Log the cause behind 401 errors
            let details = 'JWT verification failed';
            if (e.message) {
                details += ` : ${e.message}`;
            }

            throw ErrorFactory.createClient401Error(details);
        }
    }
}
