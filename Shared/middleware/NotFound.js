import { reportNotFoundError } from "../utils/errors.js";

export function NotFound(req, res, next) {
  return reportNotFoundError(next);
}
