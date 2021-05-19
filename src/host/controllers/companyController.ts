import {inject} from 'inversify';
import {BaseHttpController, controller, httpGet, requestParam} from 'inversify-express-utils';
import {SAMPLETYPES} from '../../logic/dependencies/sampleTypes';
import {Company} from '../../logic/entities/company';
import {CompanyTransactions} from '../../logic/entities/companyTransactions';
import {ErrorCodes} from '../../logic/errors/errorCodes';
import {CompanyService} from '../../logic/services/companyService';
import {BaseClaims} from '../../plumbing/claims/baseClaims';
import {BASETYPES} from '../../plumbing/dependencies/baseTypes';
import {ErrorFactory} from '../../plumbing/errors/errorFactory';

/*
 * Our API controller runs after claims handling has completed
 */
@controller('/companies')
export class CompanyController extends BaseHttpController {

    private readonly _service: CompanyService;
    private readonly _claims: BaseClaims;

    public constructor(
        @inject(SAMPLETYPES.CompanyService) service: CompanyService,
        @inject(BASETYPES.BaseClaims) claims: BaseClaims) {

        super();
        this._service = service;
        this._claims = claims;
    }

    /*
     * Return the list of companies
     */
    @httpGet('')
    public async getCompanyList(): Promise<Company[]> {

        // First check scopes
        this._claims.verifyScope('transactions_read');

        // Next return filtered data based on claims
        return this._service.getCompanyList();
    }

    /*
     * Return the transaction details for a company
     */
    @httpGet('/:id/transactions')
    public async getCompanyTransactions(@requestParam('id') id: string): Promise<CompanyTransactions> {

        // First check scopes
        this._claims.verifyScope('transactions_read');

        // Parse the id and throw a 400 error if it is invalid
        const companyId = parseInt(id, 10);
        if (isNaN(companyId) || companyId <= 0) {

            throw ErrorFactory.createClientError(
                400,
                ErrorCodes.invalidCompanyId,
                'The company id must be a positive numeric integer');
        }

        // Next authorize access based on claims
        return this._service.getCompanyTransactions(companyId);
    }
}
