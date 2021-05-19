import {SampleCustomClaims} from '../../logic/entities/sampleCustomClaims';
import {ClaimsPayload} from '../../plumbing/claims/claimsPayload';
import {ClaimsProvider} from '../../plumbing/claims/claimsProvider';
import {CustomClaims} from '../../plumbing/claims/customClaims';

/*
 * This class provides any API specific custom claims
 */
export class SampleClaimsProvider extends ClaimsProvider {

    /*
     * When using the StandardAuthorizer this is called at the time of token issuance by the ClaimsController
     * My Authorization Server setup currently sends the user's email as the subject claim
     */
    public async supplyCustomClaimsFromSubject(subject: any): Promise<SampleCustomClaims> {
        return await this._supplyCustomClaims(subject) as SampleCustomClaims;
    }

    /*
     * When using the ClaimsCachingAuthorizer this is called when the API first receives the access token
     */
    protected async supplyCustomClaims(tokenData: ClaimsPayload, userInfoData: ClaimsPayload): Promise<CustomClaims> {
        return await this._supplyCustomClaims(userInfoData.getClaim('email'));
    }

    /*
     * When using the StandardAuthorizer we read all custom claims directly from the token
     */
    protected readCustomClaims(token: ClaimsPayload): CustomClaims {

        const userId = token.getClaim('user_id');
        const role = token.getClaim('user_role');
        const userRegions = token.getClaim('user_regions');
        return new SampleCustomClaims(userId, role, userRegions);
    }

    /*
     * An override to load custom claims when they are read from the cache
     */
    protected deserializeCustomClaims(data: any): CustomClaims {
        return SampleCustomClaims.importData(data);
    }

    /*
     * Simulate some API logic for identifying the user from OAuth data, via either the subject or email claims
     * A real API would then do a database lookup to find the user's custom claims
     */
    private async _supplyCustomClaims(email: string): Promise<CustomClaims> {

        const isAdmin = email.toLowerCase().indexOf('admin') !== -1;
        if (isAdmin) {

            // For admin users we hard code this user id, assign a role of 'admin' and grant access to all regions
            // The CompanyService class will use these claims to return all transaction data
            return new SampleCustomClaims('20116', 'admin', []);

        } else {

            // For other users we hard code this user id, assign a role of 'user' and grant access to only one region
            // The CompanyService class will use these claims to return only transactions for the US region
            return new SampleCustomClaims('10345', 'user', ['USA']);
        }
    }
}
