import mongoose from "mongoose"
import { reportDatabaseConnectionError } from "../../Shared/errors.js"

export const checkDBConnection = (req, res, next) => {
  const state = mongoose.connection.readyState

  // 1 = connected
  if (state === 1) {
    console.log("Database connection is healthy")
    return next()
  }

  // anything else = not ready
  return reportDatabaseConnectionError(next)
}