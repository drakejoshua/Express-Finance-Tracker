import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export function cloudinaryUpload( fileBuffer ) {
    return new Promise( ( resolve, reject ) => {
        cloudinary.uploader.upload_stream( { resource_type: "image" }, ( error, result ) => {
            if ( error ) {
                reject( error )
            } else {
                resolve( result )
            }
        }).end( fileBuffer )
    })
}

export function cloudinaryDelete( publicId ) {
    return new Promise( ( resolve, reject ) => {
        cloudinary.uploader.destroy( publicId, { resource_type: "image" }, ( error, result ) => {
            if ( error ) {
                reject( error )
            } else {
                resolve( result )
            }
        })
    })
}