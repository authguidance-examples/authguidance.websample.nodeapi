import Authenticator from '../plumbing/authenticator';
import HttpClient from '../plumbing/httpClient';
import * as $ from 'jquery';

/*
 * Logic related to the list view
 */
export default class ListView {
    
    /*
     * Fields
     */
    private _authenticator: Authenticator;
    private _apiBaseUrl: string;
    
    /*
     * Class setup
     */
    public constructor(authenticator: Authenticator, apiBaseUrl: string) {
        this._authenticator = authenticator;
        this._apiBaseUrl = apiBaseUrl;
        this._setupCallbacks();
    }
    
    /*
     * Run the view
     */
    public async execute(): Promise<void> {
        
        // Set UI content while loading
        $('.listcontainer').removeClass('hide');

        // Get data and render it
        let data = await HttpClient.callApi(`${this._apiBaseUrl}/icos`, 'GET', null, this._authenticator);
        this._renderData(data);
    }

    /*
     * Hide UI elements when the view unloads
     */
    public unload(): void {
        $('.listcontainer').addClass('hide');
    }
    
    /*
     * Render data
     */
    private _renderData(data: any): void {

        $('.panel-group').text('');

        data.icos.forEach((ico:any) => {

            // Format fields for display
            let formattedMarketCapUsd = Number(ico.market_cap_usd).toLocaleString();
            let formattedPriceUsd = ico.price_usd.toFixed(6);
            let formattedPriceBtc = ico.price_btc.toFixed(6);
            let formattedPriceEth = ico.price_eth.toFixed(6);
            
            // Render the ICO details
            let icoDiv = $(`<div class='panel panel-default'>
                              <div class='panel-body'>
                                <div class='row'>
                                  <div class='col-xs-1'>
                                    <img src='images/${ico.token_name}.svg' />
                                  </div>  
                                  <div class='col-xs-5'>
                                    <a data-id=${ico.contract_address}>${ico.token_name}</a><br/>
                                    ${ico.description}
                                  </div>  
                                  <div class='col-xs-2 amount'>
                                    ${formattedPriceUsd} USD<br/>
                                    ${formattedPriceBtc} BTC<br/>
                                    ${formattedPriceEth} ETH
                                  </div>  
                                  <div class='col-xs-2'>${ico.percent_change}%</div>  
                                  <div class='col-xs-2'>${formattedMarketCapUsd} USD</div>
                                </div>
                              </div>
                            </div>`);

            // Update the DOM
            $('.panel-group').append(icoDiv);
        });

        // A click handler will change the view to look at transaction details
        $('a').on('click', this._selectIcoTransactions);
    }
    
    /*
     * When a thumbnail is clicked we will request transactions data and then update the view
     */
    _selectIcoTransactions(e:any): void {
        
        let contract_address = $(e.target).attr('data-id');
        location.hash = `#contract_address=${contract_address}`;
        e.preventDefault();
    }
    
    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks(): void {
        this._renderData = this._renderData.bind(this);
        this._selectIcoTransactions = this._selectIcoTransactions.bind(this);
   }
}