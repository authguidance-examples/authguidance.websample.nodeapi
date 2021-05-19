import {inject} from 'inversify';
import {BaseHttpController, controller, httpGet} from 'inversify-express-utils';
import {BaseClaims} from '../../plumbing/claims/baseClaims';
import {UserInfoClaims} from '../../plumbing/claims/userInfoClaims';
import {BASETYPES} from '../../plumbing/dependencies/baseTypes';

/*
 * A controller class to return user info
 */
@controller('/userinfo')
export class UserInfoController extends BaseHttpController {

    private readonly _baseClaims: BaseClaims;
    private readonly _userInfoClaims: UserInfoClaims;

    public constructor(
        @inject(BASETYPES.BaseClaims) baseClaims: BaseClaims,
        @inject(BASETYPES.UserInfoClaims) userInfoClaims: UserInfoClaims) {
        super();

        this._baseClaims = baseClaims;
        this._userInfoClaims = userInfoClaims;
    }

    /*
     * Return user info needed by the UI
     */
    @httpGet('')
    public getUserInfo(): any {

        // First check scopes
        this._baseClaims.verifyScope('profile');

        // Return OAuth profile data for display in the UI
        return {
            givenName: this._userInfoClaims.givenName,
            familyName: this._userInfoClaims.familyName,
        };
    }
}
