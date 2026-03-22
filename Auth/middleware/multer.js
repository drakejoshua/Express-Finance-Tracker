import multer from 'multer'
import { InvalidFileTypeError } from '../../Shared/utils/errors.js'

const fileFilter = (req, file, cb) => {
    // accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true)
    } else {
        cb(InvalidFileTypeError, false)
    }
}

const storage = multer.memoryStorage()

const upload = multer({ 
    storage, 
    fileFilter,
    limits: {
        fileSize: 3 * 1024 * 1024   // limit file size to 3MB
    } 
})

export default upload