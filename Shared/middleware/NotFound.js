import { reportNotFoundError } from "../errors.js";

export function NotFound( req, res, next ) {
    return reportNotFoundError( next )
}