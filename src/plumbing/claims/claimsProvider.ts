import {injectable} from 'inversify';
import {ApiClaims} from './apiClaims';
import {BaseClaims} from './baseClaims';
import {ClaimsPayload} from './claimsPayload';
import {CustomClaims} from './customClaims';
import {UserInfoClaims} from './userInfoClaims';

/*
 * The claims provider class is responsible for providing the final claims object
 */
@injectable()
export class ClaimsProvider {

    /*
     * The StandardAuthorizer calls this method, when all claims are included in the access token
     * These claims will have been collected earlier during token issuance by calling the ClaimsController
     */
    public readClaims(tokenData: ClaimsPayload): ApiClaims {

        return new ApiClaims(
            this._readBaseClaims(tokenData),
            this._readUserInfoClaims(tokenData),
            this.readCustomClaims(tokenData));
    }

    /*
     * The ClaimsCachingAuthorizer calls this, to ask the API to supply its claims when the token is first received
     */
    public async supplyClaims(tokenData: ClaimsPayload, userInfoData: ClaimsPayload): Promise<ApiClaims> {

        const customClaims = await this.supplyCustomClaims(tokenData, userInfoData);

        return new ApiClaims(
            this._readBaseClaims(tokenData),
            this._readUserInfoClaims(userInfoData),
            customClaims);
    }

    /*
     * Serialize claims when requested
     */
    public serializeToCache(claims: ApiClaims): string {

        const data = {
            token: claims.token.exportData(),
            userInfo: claims.userInfo.exportData(),
            custom: claims.custom.exportData(),
        };

        return JSON.stringify(data);
    }

    /*
     * Read the claims parts
     */
    public deserializeFromCache(claimsText: string): ApiClaims {

        const data = JSON.parse(claimsText);

        return new ApiClaims(
            BaseClaims.importData(data.token),
            UserInfoClaims.importData(data.userInfo),
            this.deserializeCustomClaims(data.custom),
        );
    }

    /*
     * This default implementation can be overridden by derived classes
     */
    /* eslint-disable @typescript-eslint/no-unused-vars */
    protected readCustomClaims(tokenData: ClaimsPayload): CustomClaims {
        return new CustomClaims();
    }

    /*
     * This default implementation can be overridden by derived classes
     */
    /* eslint-disable @typescript-eslint/no-unused-vars */
    protected async supplyCustomClaims(tokenData: ClaimsPayload, userInfoData: ClaimsPayload): Promise<CustomClaims> {
        return new CustomClaims();
    }

    /*
     * This can be overridden by derived classes
     */
    protected deserializeCustomClaims(data: any): CustomClaims {
        return CustomClaims.importData(data);
    }

    /*
     * Read base claims from the supplied token data
     */
    private _readBaseClaims(data: ClaimsPayload): BaseClaims {

        const subject = data.getClaim('sub');
        const scopes = data.getClaim('scope').split(' ');
        const expiry = parseInt(data.getClaim('exp'), 10);
        return new BaseClaims(subject, scopes, expiry);
    }

    /*
     * Read user info claims from the supplied data, which could originate from a token or user info payload
     */
    private _readUserInfoClaims(data: ClaimsPayload): UserInfoClaims {

        const givenName = data.getClaim('given_name');
        const familyName = data.getClaim('family_name');
        const email = data.getClaim('email');
        return new UserInfoClaims(givenName, familyName, email);
    }
}
