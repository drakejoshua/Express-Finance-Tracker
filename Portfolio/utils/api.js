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
        const resp = await fetch(`${CoingeckoAPIBaseURL}/coins/markets?vs_currency=usd&names=${encodeURIComponent(query)}&symbols=${encodeURIComponent(query)}&x_cg_demo_api_key=${CoingeckoAPIKey}&per_page=10`)

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

// Search FMP's stocks
export async function searchFMPStocks(query) {
    try {
        // search FMP's API for assets matching the search query
        const preResp = await fetch(`${FMPAPIBaseURL}/search-symbol?apikey=${FMPAPIKey}&query=${encodeURIComponent(query)}&limit=10`);

        // check if response is ok, if not throw an error to be caught in the catch block
        if ( !preResp.ok ) {
            throw new Error(`FMP API error: ${preResp.status} ${preResp.statusText}`)
        }

        // parse success response data as JSON
        let preData = await preResp.json()

        const postResp = await Promise.all( preData.map( async function ( item ) {
            return fetch(`${FMPAPIBaseURL}/profile/?symbol=${item.symbol}&apikey=${FMPAPIKey}`)
        } ) )

        if ( !postResp ) {
            throw new Error(`FMP API error: ${postResp.status} ${postResp.statusText}`)
        }

        let data = await Promise.all( postResp.map( async function ( resp ) {
            if ( !resp.ok ) {
                throw new Error(`FMP API error: ${resp.status} ${resp.statusText}`)
            }

            const arrayData = await resp.json()

            return arrayData[0] 
        } ) )

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

// Search FMP's Companies
export async function searchFMPCompanies(query) {
    try {
        // search FMP's API for assets matching the search query
        const preResp = await fetch(`${FMPAPIBaseURL}/search-name?apikey=${FMPAPIKey}&query=${encodeURIComponent(query)}&limit=10`);

        // check if response is ok, if not throw an error to be caught in the catch block
        if ( !preResp.ok ) {
            throw new Error(`FMP API error: ${preResp.status} ${preResp.statusText}`)
        }

        // parse success response data as JSON
        let preData = await preResp.json()

        const postResp = await Promise.all( preData.map( async function ( item ) {
            return fetch(`${FMPAPIBaseURL}/profile/?symbol=${item.symbol}&apikey=${FMPAPIKey}`)
        } ) )

        if ( !postResp ) {
            throw new Error(`FMP API error: ${postResp.status} ${postResp.statusText}`)
        }

        let data = await Promise.all( postResp.map( async function ( resp ) {
            if ( !resp.ok ) {
                throw new Error(`FMP API error: ${resp.status} ${resp.statusText}`)
            }

            const arrayData = await resp.json()

            return arrayData[0] 
        } ) )

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


// Get asset details from FMP by symbol
export async function getFMPAssetDetails( symbol, chartLimit = 7 ) {
    // create date range for historical price endpoint to get 
    // the last 7 days of historical price data for the asset
    const fromDate = new Date( Date.now() - chartLimit * 24 * 60 * 60 * 1000 ).toISOString().split("T")[0]   // 7 days ago in ISO format (YYYY-MM-DD)
    const toDate = new Date().toISOString().split("T")[0]   // today in ISO format (YYYY-MM-DD)

    try {
        // fetch the profile endpoint and historical price endpoint for the asset in parallel 
        // using Promise.all to optimize performance since both endpoints are needed to get all 
        // the details for the asset
        const resp = await Promise.all( [
             // get asset details like name, exchange, industry, etc
            fetch(`${FMPAPIBaseURL}/profile/?symbol=${symbol}&apikey=${FMPAPIKey}`),

            // get historical price data for the asset for the last 7 days
            fetch(`${FMPAPIBaseURL}/historical-price-eod/light?symbol=${symbol}&apikey=${FMPAPIKey}&from=${fromDate}&to=${toDate}`)
        ] )

        // check if both responses are ok, if not throw an error to be caught in the catch block
        if ( resp ) {
            // since both requests are successful, check if 
            // each response in the array is valid before continuing to parse the data
            const postResp = await Promise.all( resp.map( async function ( response ) {
                // if any response is not ok, throw an error to be caught in the catch block
                if ( !response.ok ) {
                    console.log("error thrown from here 1")
                    throw new Error(`FMP API error: ${response.status} ${response.statusText}`)
                }

                // parse success response data as JSON and return it
                return await response.json()
            } ) )

            // combine the data from both endpoints into a single object to return to the frontend
            const data = {
                details: postResp[0][0],
                chart: postResp[1]
            }

            // since both requests are successful and the data is parsed, 
            // return the combined data as a success status with the data
            return { status: "success", data }
        } else {            
            throw new Error(`FMP API error: ${resp.status} ${resp.statusText}`)
        }

    } catch ( error ) {
        // console.log("Error fetching asset details from FMP API:", error.message)
        return { status: "error", error: error.message }
    }
}

// Get asset details from Coingecko by id
export async function getCoingeckoAssetDetails( id, chartLimit = 7 ) {
    try {
        // fetch the coin details endpoint and market chart endpoint for the asset in parallel 
        // using Promise.all to optimize performance since both endpoints are needed to get all 
        // the details for the asset
        const resp = await Promise.all([
            // get asset details like name, symbol, description, etc
            fetch(`${CoingeckoAPIBaseURL}/coins/${id}?x_cg_demo_api_key=${CoingeckoAPIKey}`),
            // get historical price data for the asset for the last 7 days
            fetch(`${CoingeckoAPIBaseURL}/coins/${id}/market_chart?vs_currency=usd&days=${chartLimit}&x_cg_demo_api_key=${CoingeckoAPIKey}`)
        ])

        // check if both responses are ok, if not throw an error to be caught in the catch block
        if ( resp ) {
            // since both requests are successful, check if 
            // each response in the array is valid before continuing to parse the data
            const postResp = await Promise.all( resp.map( async function ( response ) {
                // if any response is not ok, throw an error to be caught in the catch block
                if ( !response.ok ) {
                    throw new Error(`Coingecko API error: ${response.status} ${response.statusText}`)
                }

                // parse success response data as JSON and return it
                return await response.json()
            } ) )

            // combine the data from both endpoints into a single object to return to the frontend
            const data = {
                details: postResp[0],
                chart: postResp[1]
            }

            // since both requests are successful and the data is parsed, 
            // return the combined data as a success status with the data
            return { status: "success", data }
        } else {
            throw new Error(`Coingecko API error: ${resp.status} ${resp.statusText}`)
        }
    } catch ( error ) {
        return { status: "error", error: error.message }
    }
}