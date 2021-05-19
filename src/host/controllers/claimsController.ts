import {inject} from 'inversify';
import {BaseHttpController, controller, httpGet, requestParam} from 'inversify-express-utils';
import {ClaimsProvider} from '../../plumbing/claims/claimsProvider';
import {BASETYPES} from '../../plumbing/dependencies/baseTypes';
import {SampleClaimsProvider} from '../claims/sampleClaimsProvider';

/*
 * A controller called during token issuing to ask the API for custom claim values
 * This requires a capability for the Authorization Server to reach out to the API
 */
@controller('/customclaims')
export class ClaimsController extends BaseHttpController {

    private readonly _claimsProvider: SampleClaimsProvider;

    public constructor(@inject(BASETYPES.ClaimsProvider) claimsProvider: ClaimsProvider) {
        super();
        this._claimsProvider = claimsProvider as SampleClaimsProvider;
    }

    /*
     * This is called during token issuance by the Authorization Server when using the StandardAuthorizer
     * The custom claims are then included in the access token
     */
    @httpGet('/:subject')
    public async getCustomClaims(@requestParam('subject') subject: string): Promise<any> {

        const customClaims = await this._claimsProvider.supplyCustomClaimsFromSubject(subject);

        return {
            user_id: customClaims.userId,
            user_role: customClaims.userRole,
            user_regions: customClaims.userRegions,
        };
    }
}
