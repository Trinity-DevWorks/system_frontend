import { centralRequest } from "@/lib/axios";

const centralApiService = async (method, endpoint, data = null, config = {}) =>
  centralRequest(method, endpoint, data, config);

export const centralApi = {
  login: (credentials) => centralApiService("POST", "login", credentials),
  logout: () => centralApiService("POST", "logout"),
};



export default centralApiService;
