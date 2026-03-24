// Coingecko API configuration
export const CoingeckoAPIKey = process.env.COINGECKO_API_KEY
export const CoingeckoAPIBaseURL = process.env.COINGECKO_API_BASE_URL

// Financial Modeling Prep API configuration
export const FMPAPIKey = process.env.FMP_API_KEY
export const FMPAPIBaseURL = process.env.FMP_API_BASE_URL

// Coingecko Specific API routes
export async function searchCoingecko(query) {
    try {
        // Search coingecko's /coins/markets endpoint for assets matching the search query in either the name or symbol fields
        const resp = await fetch(`${CoingeckoAPIBaseURL}/coins/markets?vs_currency=usd&names=${encodeURIComponent(query)}&symbols=${encodeURIComponent(query)}&x_cg_demo_api_key=${CoingeckoAPIKey}`)

        // check if response is ok, if not throw an error to be caught in the catch block
        if ( !resp.ok ) {
            throw new Error(`Coingecko API error: ${resp.status} ${resp.statusText}`)
        }

        // parse success response data as JSON
        let data = await resp.json()

        // add coingecko as provider field to each item in the data array so the frontend knows 
        // which API the search result came from
        data = data.map( function ( item ) {
            return { ...item, provider: "coingecko" }
        } )

        // return search results as success status with data
        return { status: "success", data }
    } catch ( error ) {
        console.log("Error searching Coingecko API:", error.message)
        return { status: "error", error: error.message }
    }
}

// FMP Specific API routes
export async function searchFMP(query) {
    try {
        // search FMP's API for assets matching the search query
        const resp = await fetch(`${FMPAPIBaseURL}/search-symbol?apikey=${FMPAPIKey}&query=${encodeURIComponent(query)}`);

        // check if response is ok, if not throw an error to be caught in the catch block
        if ( !resp.ok ) {
            throw new Error(`FMP API error: ${resp.status} ${resp.statusText}`)
        }

        // parse success response data as JSON
        let data = await resp.json()

        // transform response data removing any crypto since FMP is not used for crypto assets
        data = data.filter( function ( item ) {
            return item.exchange !== "CRYPTO" || item.exchangeFullName !== "CCC"
        })

        // add FMP as provider field to each item in the data array so the frontend knows 
        // which API the search result came from
        data = data.map( function ( item ) {
            return { ...item, provider: "FMP" }
        } )

        // return search results as success status with data
        return { status: "success", data }
    } catch ( error ) {
        console.log("Error searching FMP API:", error.message)
        return { status: "error", error: error.message }
    }
}