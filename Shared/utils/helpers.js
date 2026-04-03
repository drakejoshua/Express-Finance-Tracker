// sliceAndJoinArrayIntoChunksUsingLimit is a utility function that takes an array and slices 
// it into chunks of 50 items based on the provided offset and limit until the array ends, 
// then concatenates those chunks back into a single array. This is used in the portfolio and 
// watchlist routes when fetching data for multiple coins from the Coingecko API, which has a
// limit of 50 items per request. The function ensures that all items in the input array are
// included in the output array, regardless of the input array's length or the provided offset and limit.
export function sliceAndJoinArrayIntoChunksUsingLimit( array, limit ) {
    let result = []

    if ( array.length == 0 ) {
        return result
    }

    if ( array.length < limit ) {
        result.push( array.map( ( item ) => encodeURIComponent(item) ).join(",") )
        return result
    }

    for ( let offset = 0; offset < array.length; offset += limit ) {
        result.push( 
            array.slice( offset, offset + limit )
                .map( ( item ) => encodeURIComponent(item) )
                .join(",") 
        )
    }

    return result
}

export function roundToTwoDecimalPlaces( number ) {
    if ( number < 1 ) return parseFloat( number.toFixed(6) )
    return parseFloat( number.toFixed(2) )
}