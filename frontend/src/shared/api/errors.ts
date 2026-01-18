import axios from "axios";

export function isForbiddenError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 403;
}