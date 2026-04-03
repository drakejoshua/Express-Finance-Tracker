// Coingecko API configuration
export const CoingeckoAPIKey = process.env.COINGECKO_API_KEY
export const CoingeckoAPIBaseURL = process.env.COINGECKO_API_BASE_URL


// searchCoinsByQuery function to search for coins using the Coingecko API
export async function searchCoinsByQuery( query ) {
    try {
        // query coingecko search endpoint to return data for "query"
        const resp = await fetch(`${CoingeckoAPIBaseURL}/search?query=${encodeURIComponent( query )}&x_cg_demo_api_key=${CoingeckoAPIKey}`)

        // check if response is "200 ok"
        if ( !resp.ok ) {
            if ( resp.status === 429 ) {
                throw new Error(`Error querying "${ query }" from coingecko: Rate limit exceeded`)
            }

            throw new Error(`Error querying "${ query }" from coingecko: ${resp.status} ${resp.statusText}`)
        }

        // convert query response to consumable json
        const data = await resp.json()

        return {
            status: "success",
            data
        }
    } catch( error ) {
        console.log("coingecko fetch error: ", error.message)
        return {
            status: "error",
            error
        }
    }
}


// getCoinDetails function to get detailed information about a specific coin by its 
// symbol as coin_id using the Coingecko API
export async function getCoinDetails( symbol ) {
    try {
        const resp = await fetch(`${CoingeckoAPIBaseURL}/coins/${ encodeURIComponent(symbol) }?x_cg_demo_api_key=${CoingeckoAPIKey}&` + 
            `sparkline=true&developer_data=false&community_data=false&tickers=false&localization=false&include_categories_details=false`)

        if ( !resp.ok ) {
            if ( resp.status === 429 ) {
                throw new Error(`Error fetching "${ symbol }" details from coingecko: Rate limit exceeded`)
            }

            throw new Error(`Error fetching "${ symbol }" details from coingecko: ${resp.status} ${resp.statusText}`)
        }

        const data = await resp.json()

        return {
            status: "success",
            data
        }
    } catch( error ) {
        console.log("coingecko fetch error: ", error.message)
        return {
            status: "error",
            error
        }
    }
}


// getBatchCoinsDetails function to get detailed information about multiple coins by their 
// symbols as an array of coin_ids using the Coingecko API
export async function getBatchCoinsDetails( comma_seperated_symbols_list ) {
    try {
        const resp = await fetch(`${CoingeckoAPIBaseURL}/coins/markets?vs_currency=usd&`+
            `ids=${ comma_seperated_symbols_list }&price_change_percentage=24h&sparkline=true&`+
            `locale=en&x_cg_demo_api_key=${CoingeckoAPIKey}&precision=2`)

        if ( !resp.ok ) {
            if ( resp.status === 429 ) {
                throw new Error(`Error fetching batch coins details from coingecko: Rate limit exceeded`)
            }

            throw new Error(`Error fetching batch coins details from coingecko: ${resp.status} ${resp.statusText}`)
        }
        const data = await resp.json()

        return {
            status: "success",
            data
        }
    } catch( error ) {
        console.log("coingecko fetch error: ", error.message)
        return {
            status: "error",
            error
        }
    }
}


// getCoinMarketChart function to get historical market chart data for a specific coin by its
// symbol as coin_id and a specified time range (e.g. 7 days, 30 days) using the Coingecko API
export async function getCoinMarketChart( symbol, range ) {
    try {
        // query coingecko coins/{id}/market_chart endpoint to return historical price 
        // data for the coin that matches the symbol param and the specified range
        const resp = await fetch(`${CoingeckoAPIBaseURL}/coins/${ encodeURIComponent(symbol) }/` +
        `market_chart?x_cg_demo_api_key=${CoingeckoAPIKey}&vs_currency=usd&days=${encodeURIComponent(range)}` +
        `&interval=hourly`)
        
        // check if response is "200 ok", if not, check if it's a rate limit error (429) 
        // and throw an appropriate error message
        if ( !resp.ok ) {
            if ( resp.status === 429 ) {
                throw new Error(`Error fetching market chart for "${ symbol }" from coingecko: Rate limit exceeded`)
            }

            throw new Error(`Error fetching market chart for "${ symbol }" from coingecko: ${resp.status} ${resp.statusText}`)
        }

        // convert query response to consumable json
        const data = await resp.json()

        // return success status and the raw market chart data, which includes an 
        // array of price points with timestamps
        return {
            status: "success",
            data
        }
    } catch( error ) {
        console.log("coingecko fetch error: ", error.message)
        return {
            status: "error",
            error
        }
    }
}