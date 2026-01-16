import axios from "axios";
import { env } from "../config/env";

export const http = axios.create({
  baseURL: env.API_BASE_URL,
  withCredentials: false, // JWT في الهيدر، مش كوكيز
  headers: {
    "Content-Type": "application/json",
  },
});
